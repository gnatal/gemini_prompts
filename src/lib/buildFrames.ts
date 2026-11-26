import { isValidFrameCount } from '../config/assetPresets'
import type { AnimationSpec, AssetRequest, CharacterData, StyleData } from '../types'
import { type AnimationIssue, limbsLine, propsLine, usableKeyPoses, viewLockLine } from './buildAnimations'
import { buildPrompt } from './buildPrompt'

/**
 * "One prompt per frame" mode. Image models are good at one pose and bad at keeping
 * motion straight across a grid (the second row comes out as a copy of the first), so
 * each key pose becomes its own single-sprite prompt. The frames are glued back
 * together afterwards in the Glue tab.
 */

/** Fixed placement, so separate generations line up with little correction. */
export const FRAME_FRAMING =
  'full body, centered horizontally, nothing cropped; the character fills about 80% of the image height when standing; ground line 10% above the bottom edge, airborne poses float above it'
const FRAME_FRAMING_REFERENCE = '; same scale and position as the reference image'

const SINGLE_POSE_LINE =
  'exactly one character in one pose, not a sprite sheet: no other frames, no motion blur, smears, speed lines or afterimages'
const CONSISTENCY_REFERENCE = 'identical character design, size, colors and lighting to the reference image; only the pose changes'
const CONSISTENCY_TEXT = 'the same character design, size, colors and lighting as every other frame; only the pose changes'

const NEAR_FAR_RE = /\b(?:near|far)\b/i
const LEADS_BACK_RE = /,\s*leading back into frame 1\s*$/i

export function swapNearFar(text: string): string {
  return text.replace(/\b(near|far)\b/gi, (word) => {
    const swapped = word.toLowerCase() === 'near' ? 'far' : 'near'
    return word[0] === word[0].toUpperCase() ? swapped[0].toUpperCase() + swapped.slice(1) : swapped
  })
}

/**
 * For each frame, the 0-based index of the earlier frame it mirrors (same pose with near
 * and far swapped), or null. Only the second half of an even cycle can mirror the first.
 * Drawing "frame 1 with the opposite leg leading", with frame 1 attached, is the most
 * reliable way to get the legs to alternate.
 */
export function mirrorSources(poses: readonly string[]): (number | null)[] {
  const n = poses.length
  const half = n / 2
  const clean = (p: string) => p.trim().replace(LEADS_BACK_RE, '')
  return poses.map((pose, i) => {
    if (n % 2 !== 0 || i < half) return null
    const source = poses[i - half]
    if (!NEAR_FAR_RE.test(source)) return null
    return clean(pose) === swapNearFar(clean(source)) ? i - half : null
  })
}

/** The motion without clauses about cycle halves, which only make sense for a whole sheet. */
function frameMotion(motion: string): string {
  return motion
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !/\bhalf\b/i.test(part))
    .join('; ')
}

export function frameAsset(asset: AssetRequest, pose: string, hasReference: boolean): AssetRequest {
  return {
    ...asset,
    type: 'sprite',
    includeCharacter: true,
    action: pose,
    frameCount: undefined,
    frameLayout: undefined,
    framing: FRAME_FRAMING + (hasReference ? FRAME_FRAMING_REFERENCE : ''),
    aspectRatio: '1:1',
    customAspectRatio: '',
  }
}

function basedOnLine(source: number): string {
  const n = source + 1
  return (
    `Based on: frame ${n}. Attach your approved frame ${n} as a second reference image and draw that exact pose ` +
    'with the opposite leg and arm leading: wherever the near leg and arm were, the far ones are now, and the other way around'
  )
}

export interface FramePrompt {
  /** 0-based frame index. */
  index: number
  pose: string
  /** 0-based index of the frame to attach as a second reference, or null. */
  basedOn: number | null
  prompt: string
}

/** One single-sprite prompt per key pose. Empty when the poses don't match the frame count. */
export function buildFramePrompts(
  style: StyleData,
  character: CharacterData | null,
  asset: AssetRequest,
  spec: AnimationSpec,
): FramePrompt[] {
  const poses = usableKeyPoses(spec)
  const sources = mirrorSources(poses)
  const hasReference = Boolean(character?.hasReferenceImage)
  const name = spec.name.trim() || 'Animation'
  const motion = frameMotion(spec.motion)
  const kind = spec.loop ? 'part of a looping cycle' : 'plays once'

  return poses.map((pose, index) => {
    const basedOn = sources[index]
    const block = [
      '[FRAME]',
      `Animation: ${name}, frame ${index + 1} of ${poses.length}, ${kind}`,
      motion && `Motion: ${motion}`,
      basedOn !== null && basedOnLine(basedOn),
      viewLockLine(asset.view, 'frame'),
      limbsLine(spec, asset.view),
      propsLine(asset.heldItems),
      `Single pose: ${SINGLE_POSE_LINE}`,
      `Consistency: ${hasReference ? CONSISTENCY_REFERENCE : CONSISTENCY_TEXT}`,
    ]
      .filter(Boolean)
      .join('\n')
    const prompt = [buildPrompt(style, character, frameAsset(asset, pose, hasReference)), block].join('\n\n')
    return { index, pose, basedOn, prompt }
  })
}

export interface AnimationFrames {
  spec: AnimationSpec
  frames: FramePrompt[]
}

/** Frame prompts for every enabled animation that has a valid frame count and one pose per frame. */
export function buildFrameSet(
  style: StyleData,
  character: CharacterData | null,
  asset: AssetRequest,
  specs: AnimationSpec[],
): AnimationFrames[] {
  return specs
    .filter((spec) => spec.enabled && isValidFrameCount(spec.frames) && usableKeyPoses(spec).length)
    .map((spec) => ({ spec, frames: buildFramePrompts(style, character, asset, spec) }))
}

/** Per-frame mode needs a pose for every frame. These block copying. */
export function validateFrameMode(specs: AnimationSpec[]): AnimationIssue[] {
  return specs
    .filter((spec) => spec.enabled && isValidFrameCount(spec.frames) && !usableKeyPoses(spec).length)
    .map((spec) => ({
      field: `animations.${spec.id}`,
      label: spec.name.trim() || 'Untitled animation',
      message: `One prompt per frame needs one pose per frame: write ${spec.frames} frame poses, one per line.`,
    }))
}
