import type { ArtStyle, AspectRatio, AssetType, View } from '../types'

export const ART_STYLE_LABELS: Record<ArtStyle, string> = {
  'pixel-art': 'Pixel art',
  'cel-shaded-2d': '2D cel-shaded',
  'hand-painted-2d': '2D hand-painted',
  'low-poly-3d': 'Low-poly 3D',
  custom: 'Custom',
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  sprite: 'Sprite',
  'sprite-strip': 'Sprite strip',
  portrait: 'Portrait',
  'item-icon': 'Item icon',
  background: 'Background',
  tile: 'Tile',
}

export const VIEW_LABELS: Record<View, string> = {
  'side-right': 'Side view, facing right',
  'side-left': 'Side view, facing left',
  'three-quarter-front': 'Three-quarter front view',
  front: 'Front view',
  'top-down': 'Top-down view',
  isometric: 'Isometric view',
}

export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  '1:1': '1:1',
  '4:3': '4:3',
  '16:9': '16:9',
  '9:16': '9:16',
  custom: 'Custom',
}

export const ART_STYLES = Object.keys(ART_STYLE_LABELS) as ArtStyle[]
export const ASSET_TYPES = Object.keys(ASSET_TYPE_LABELS) as AssetType[]
export const VIEWS = Object.keys(VIEW_LABELS) as View[]
export const ASPECT_RATIOS = Object.keys(ASPECT_RATIO_LABELS) as AspectRatio[]
