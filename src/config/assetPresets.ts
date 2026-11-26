import type { AspectRatio, AssetRequest, AssetType, FrameLayout, View } from '../types'

export const DEFAULT_FRAME_COUNT = 6

export interface AssetPreset {
  includeCharacter: boolean
  view: View
  aspectRatio: AspectRatio
  framing: string
  /** Whether the asset sits on a flat chroma key background (false: the scene fills the frame). */
  usesChromaKey: boolean
}

export const stripFraming = (frames: number) =>
  `${frames} frames in one row, equal spacing, same scale and baseline in every frame`

/** Columns and rows for a grid sprite sheet, by frame count. Picked to keep the sheet close to square. */
const GRIDS: Record<number, [columns: number, rows: number]> = {
  2: [2, 1],
  3: [3, 1],
  4: [2, 2],
  5: [3, 2],
  6: [3, 2],
  7: [4, 2],
  8: [4, 2],
  9: [3, 3],
  10: [5, 2],
  11: [4, 3],
  12: [4, 3],
}

export interface Grid {
  columns: number
  rows: number
}

export function gridFor(frames: number): Grid {
  const [columns, rows] = GRIDS[frames] ?? [frames, 1]
  return { columns, rows }
}

/** Row and column (both 1-based) of a 0-based frame index in the grid. */
export function gridCell(index: number, grid: Grid): { row: number; column: number } {
  return { row: Math.floor(index / grid.columns) + 1, column: (index % grid.columns) + 1 }
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** W:H of a grid of square cells, reduced, e.g. 4 x 2 -> "2:1". */
export function gridAspectRatio(grid: Grid): string {
  const d = gcd(grid.columns, grid.rows)
  return `${grid.columns / d}:${grid.rows / d}`
}

export function gridFraming(frames: number): string {
  const grid = gridFor(frames)
  const empty = grid.columns * grid.rows - frames
  const base =
    `${grid.columns} columns by ${grid.rows} rows of equal square cells, one frame per cell, ` +
    'character centered in each cell at the same scale, feet on the same ground line in every cell'
  return empty ? `${base}, the last ${empty === 1 ? 'cell' : `${empty} cells`} left empty` : base
}

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
    const layout = asset.frameLayout ?? 'row'
    next.frameCount = frames
    next.framing = layoutFraming(frames, layout)
    next.customAspectRatio = layoutRatio(frames, layout)
  }
  return next
}

/** The framing text the app writes for a sprite strip or grid sheet. */
export function layoutFraming(frames: number, layout: FrameLayout = 'row'): string {
  return layout === 'grid' ? gridFraming(frames) : stripFraming(frames)
}

/** The W:H ratio the app writes for a sprite strip (N:1) or grid sheet (columns:rows). */
export function layoutRatio(frames: number, layout: FrameLayout = 'row'): string {
  return layout === 'grid' ? gridAspectRatio(gridFor(frames)) : `${frames}:1`
}

const FRAME_COUNTS = Array.from({ length: 11 }, (_, i) => i + 2)
const AUTO_ROW_FRAMING_RE = /^\d+ frames in one row, equal spacing, same scale and baseline in every frame$/
const AUTO_ROW_RATIO_RE = /^\d+:1$/

/** Whether `framing` is empty or text the app wrote for `layout`, so it is safe to replace. */
function isAutoFraming(framing: string, layout: FrameLayout): boolean {
  const f = framing.trim()
  if (!f) return true
  return layout === 'grid' ? FRAME_COUNTS.some((n) => f === gridFraming(n)) : AUTO_ROW_FRAMING_RE.test(f)
}

/** Whether the custom ratio is empty or one the app wrote for `layout`. */
function isAutoRatio(asset: AssetRequest, layout: FrameLayout): boolean {
  if (asset.aspectRatio !== 'custom') return false
  const r = asset.customAspectRatio?.trim() ?? ''
  if (!r) return true
  return layout === 'grid'
    ? FRAME_COUNTS.some((n) => r === gridAspectRatio(gridFor(n)))
    : AUTO_ROW_RATIO_RE.test(r)
}

/** Rewrites framing and ratio for the new count or layout, unless the user has customized them. */
function syncStrip(asset: AssetRequest, frameCount: number | undefined, layout: FrameLayout): AssetRequest {
  const previous = asset.frameLayout ?? 'row'
  const next: AssetRequest = { ...asset, frameCount, frameLayout: layout }
  if (asset.type !== 'sprite-strip' || !isValidFrameCount(frameCount)) return next
  if (isAutoFraming(asset.framing, previous)) next.framing = layoutFraming(frameCount, layout)
  if (isAutoRatio(asset, previous)) next.customAspectRatio = layoutRatio(frameCount, layout)
  return next
}

/**
 * Updates a sprite strip's frame count, and keeps the framing text and the
 * aspect ratio in sync, unless the user has customized them.
 */
export function syncFrameCount(asset: AssetRequest, frameCount: number | undefined): AssetRequest {
  return syncStrip(asset, frameCount, asset.frameLayout ?? 'row')
}

/** Switches a sprite strip between one row and a grid, keeping framing and ratio in sync. */
export function syncFrameLayout(asset: AssetRequest, layout: FrameLayout): AssetRequest {
  return syncStrip(asset, asset.frameCount, layout)
}

export function isValidFrameCount(n: number | undefined): n is number {
  return n !== undefined && Number.isInteger(n) && n >= 2 && n <= 12
}
