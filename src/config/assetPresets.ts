import type { AspectRatio, AssetRequest, AssetType, View } from '../types'

export const DEFAULT_FRAME_COUNT = 6

export interface AssetPreset {
  includeCharacter: boolean
  view: View
  aspectRatio: AspectRatio
  framing: string
  /** Whether the asset sits on a flat chroma key background (false: the scene fills the frame). */
  usesChromaKey: boolean
}

const stripFraming = (frames: number) =>
  `${frames} frames in one row, equal spacing, same scale and baseline in every frame`

export const ASSET_PRESETS: Record<AssetType, AssetPreset> = {
  sprite: {
    includeCharacter: true,
    view: 'side-right',
    aspectRatio: '1:1',
    framing: 'full body, centered, nothing cropped, small margin on all sides',
    usesChromaKey: true,
  },
  'sprite-strip': {
    includeCharacter: true,
    view: 'side-right',
    aspectRatio: 'custom', // N:1, derived from frameCount
    framing: stripFraming(DEFAULT_FRAME_COUNT),
    usesChromaKey: true,
  },
  portrait: {
    includeCharacter: true,
    view: 'three-quarter-front',
    aspectRatio: '1:1',
    framing: 'head and shoulders, centered',
    usesChromaKey: true,
  },
  'item-icon': {
    includeCharacter: false,
    view: 'three-quarter-front',
    aspectRatio: '1:1',
    framing: 'single object, centered, small margin',
    usesChromaKey: true,
  },
  background: {
    includeCharacter: false,
    view: 'side-right',
    aspectRatio: '16:9',
    framing: 'full scene, edge to edge',
    usesChromaKey: false,
  },
  tile: {
    includeCharacter: false,
    view: 'top-down',
    aspectRatio: '1:1',
    framing: 'seamless and tileable on all four edges',
    usesChromaKey: false,
  },
}

export function usesChromaKey(type: AssetType): boolean {
  return ASSET_PRESETS[type].usesChromaKey
}

/**
 * Applies the defaults for `type` to `asset`. Fields the presets don't cover
 * (action, subject, held items, lighting, exclusions...) are kept untouched.
 */
export function applyAssetPreset(asset: AssetRequest, type: AssetType): AssetRequest {
  const preset = ASSET_PRESETS[type]
  const next: AssetRequest = {
    ...asset,
    type,
    includeCharacter: preset.includeCharacter,
    view: preset.view,
    aspectRatio: preset.aspectRatio,
    framing: preset.framing,
  }
  if (type === 'sprite-strip') {
    const frames = isValidFrameCount(asset.frameCount) ? asset.frameCount : DEFAULT_FRAME_COUNT
    next.frameCount = frames
    next.framing = stripFraming(frames)
    next.customAspectRatio = `${frames}:1`
  }
  return next
}

const AUTO_FRAMING_RE = /^\d+ frames in one row, equal spacing, same scale and baseline in every frame$/
const AUTO_RATIO_RE = /^\d+:1$/

/**
 * Updates a sprite strip's frame count, and keeps the framing text and the
 * N:1 aspect ratio in sync, unless the user has customized them.
 */
export function syncFrameCount(asset: AssetRequest, frameCount: number | undefined): AssetRequest {
  const next: AssetRequest = { ...asset, frameCount }
  if (asset.type !== 'sprite-strip' || !isValidFrameCount(frameCount)) return next
  if (!asset.framing.trim() || AUTO_FRAMING_RE.test(asset.framing.trim())) {
    next.framing = stripFraming(frameCount)
  }
  const ratio = asset.customAspectRatio?.trim() ?? ''
  if (asset.aspectRatio === 'custom' && (!ratio || AUTO_RATIO_RE.test(ratio))) {
    next.customAspectRatio = `${frameCount}:1`
  }
  return next
}

export function isValidFrameCount(n: number | undefined): n is number {
  return n !== undefined && Number.isInteger(n) && n >= 2 && n <= 12
}
