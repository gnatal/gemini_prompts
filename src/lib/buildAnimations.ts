import {
  gridAspectRatio,
  gridCell,
  gridFor,
  gridFraming,
  isValidFrameCount,
  stripFraming,
} from '../config/assetPresets'
import { VIEW_LABELS } from '../config/labels'
import type { AnimationSpec, AssetRequest, CharacterData, FrameLayout, StyleData, View } from '../types'
import { buildPrompt } from './buildPrompt'

const LOOP_LINE = 'yes, the last frame leads smoothly back into the first'
const NO_LOOP_LINE = 'no, plays once from the first frame to the last'
const ROW_LAYOUT_LINE = 'frames read left to right, evenly spaced, no borders or dividing lines between frames'
const GRID_LAYOUT_LINE =
  'every cell the same size, so the sheet can be cut into equal cells; no borders, grid lines or frame numbers'
const CLEAN_LINE =
  'no motion blur, smears, speed lines, ghosting or afterimages; every frame is one sharp, complete pose'
const CONSISTENCY_LINE =
  'identical character design, size, colors and lighting in every frame; only the pose changes'

const NEAR_FAR_RE = /\b(near|far)\b/i
/** Identical boots and sleeves give the model nothing to tell the legs apart by, so it copies one stride. */
const FAR_SHADING = 'the far arm and far leg are drawn noticeably darker, in shadow, so near and far limbs are easy to tell apart'
const PROPS_SUFFIX = 'in every frame; nothing appears, disappears or changes hands'

/** Which side of the character faces the camera, for views where that is fixed. */
const NEAR_SIDE: Partial<Record<View, string>> = {
  'side-right': "the character's right side",
  'side-left': "the character's left side",
}

/**
 * Without it, poses with no direction in them ("standing", "leans back") come out in
 * the model's default front view, so the character spins toward the camera mid-animation.
 */
export function viewLockLine(view: View, scope: 'sheet' | 'frame' = 'sheet'): string {
  const turn = isSideView(view) ? '; the character never turns toward the camera' : ''
  const where = scope === 'sheet' ? ', in every frame, including the first and the last' : ', exactly as in the other frames'
  return `View lock: ${VIEW_LABELS[view].toLowerCase()}${where}${turn}`
}

/** Keeps weapons and tools from popping in and out or switching hands between frames. */
export function propsLine(heldItems: string | undefined): string | null {
  const items = heldItems?.trim().replace(/[.;,]+$/, '')
  return items ? `Props: ${items}, ${PROPS_SUFFIX}` : null
}

/** The key poses, trimmed, or [] when their count doesn't match the frame count. */
export function usableKeyPoses(spec: AnimationSpec): string[] {
  const poses = spec.keyPoses.map((p) => p.trim()).filter(Boolean)
  return poses.length === spec.frames ? poses : []
}

/** The asset settings from the form, turned into a sprite strip or grid sheet for this animation. */
export function animationAsset(asset: AssetRequest, spec: AnimationSpec, layout: FrameLayout = 'row'): AssetRequest {
  const frames = spec.frames ?? 0
  const grid = layout === 'grid' && isValidFrameCount(frames)
  return {
    ...asset,
    type: 'sprite-strip',
    includeCharacter: true,
    action: spec.motion.trim() || spec.name.trim(),
    frameCount: spec.frames,
    frameLayout: layout,
    framing: grid ? gridFraming(frames) : stripFraming(frames),
    aspectRatio: 'custom',
    customAspectRatio: grid ? gridAspectRatio(gridFor(frames)) : `${frames}:1`,
  }
}

export function limbsLine(spec: AnimationSpec, view: View): string | null {
  const text = [spec.motion, ...spec.keyPoses].join(' ')
  if (!NEAR_FAR_RE.test(text)) return null
  const side = NEAR_SIDE[view]
  return (
    'Limbs: "near" means the arm or leg closer to the camera, "far" the one farther away' +
    (side ? `; near is ${side}` : '') +
    `; ${FAR_SHADING}`
  )
}

export interface AnimationBlockOptions {
  /** The held items from the form. Repeated as a per-frame lock when set. */
  heldItems?: string
}

export function buildAnimationBlock(
  spec: AnimationSpec,
  layout: FrameLayout = 'row',
  view: View = 'side-right',
  options: AnimationBlockOptions = {},
): string {
  const poses = usableKeyPoses(spec)
  const grid = layout === 'grid' && poses.length ? gridFor(poses.length) : null
  const frameLabel = (i: number) => {
    if (!grid) return `Frame ${i + 1}`
    const { row, column } = gridCell(i, grid)
    return `Frame ${i + 1} (row ${row}, column ${column})`
  }
  const lines = [
    '[ANIMATION]',
    spec.name.trim() && `Animation: ${spec.name.trim()}`,
    `Loop: ${spec.loop ? LOOP_LINE : NO_LOOP_LINE}`,
    `Layout: ${layout === 'grid' ? GRID_LAYOUT_LINE : ROW_LAYOUT_LINE}`,
    viewLockLine(view),
    limbsLine(spec, view),
    propsLine(options.heldItems),
    ...poses.map((pose, i) => `${frameLabel(i)}: ${pose}`),
    `Clean frames: ${CLEAN_LINE}`,
    `Consistency: ${CONSISTENCY_LINE}`,
  ]
  return lines.filter(Boolean).join('\n')
}

/**
 * One sprite sheet prompt for one animation. The Style and Character blocks are
 * the same as in every other prompt, so the character stays identical across the set.
 */
export function buildAnimationPrompt(
  style: StyleData,
  character: CharacterData | null,
  asset: AssetRequest,
  spec: AnimationSpec,
  layout: FrameLayout = 'row',
): string {
  return [
    buildPrompt(style, character, animationAsset(asset, spec, layout)),
    buildAnimationBlock(spec, layout, asset.view, { heldItems: asset.heldItems }),
  ].join('\n\n')
}

export interface AnimationPrompt {
  spec: AnimationSpec
  prompt: string
}

/** Prompts for every enabled animation with a valid frame count, in list order. */
export function buildAnimationSet(
  style: StyleData,
  character: CharacterData | null,
  asset: AssetRequest,
  specs: AnimationSpec[],
  layout: FrameLayout = 'row',
): AnimationPrompt[] {
  return specs
    .filter((spec) => spec.enabled && isValidFrameCount(spec.frames))
    .map((spec) => ({ spec, prompt: buildAnimationPrompt(style, character, asset, spec, layout) }))
}

/** Side views keep near and far limbs readable. In other views the model loses track of which leg leads. */
export function isSideView(view: View): boolean {
  return view === 'side-right' || view === 'side-left'
}

export interface AnimationIssue {
  field: string
  label: string
  message: string
}

/** Problems with the animation list itself. These block copying. */
export function validateAnimations(specs: AnimationSpec[]): AnimationIssue[] {
  const enabled = specs.filter((s) => s.enabled)
  if (!enabled.length) {
    return [{ field: 'animations', label: 'Animations', message: 'Turn on at least one animation.' }]
  }
  return enabled.flatMap((spec) => {
    const label = spec.name.trim() || 'Untitled animation'
    const issues: AnimationIssue[] = []
    if (!isValidFrameCount(spec.frames)) {
      issues.push({ field: `animations.${spec.id}`, label, message: 'Frame count must be a whole number from 2 to 12.' })
    }
    if (!spec.name.trim() && !spec.motion.trim()) {
      issues.push({ field: `animations.${spec.id}`, label, message: 'Give the animation a name or a motion.' })
    }
    return issues
  })
}
