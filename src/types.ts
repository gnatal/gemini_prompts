export type ArtStyle = 'pixel-art' | 'cel-shaded-2d' | 'hand-painted-2d' | 'low-poly-3d' | 'custom'

export interface PaletteColor {
  name: string // "Royal blue"
  hex: string // "#1E4FD8"
  usage: string // "helmet, boots"
}

export interface StyleProfile {
  id: string
  name: string // preset name, e.g. "Main game style"
  artStyle: ArtStyle
  customStyle?: string // used only when artStyle is 'custom'
  pixelResolution?: string // e.g. "64x64", only for pixel-art
  palette: PaletteColor[] // 3 to 6 entries recommended
  linesAndShading: string // "thick dark outlines, 2-tone cel shading, no gradients"
}

export interface CharacterProfile {
  id: string
  name: string
  proportions: string // "4 heads tall, small torso, oversized boots"
  head: string
  torso: string
  armsAndHands: string
  legsAndFeet: string
  signatureDetails: string[] // the 2 or 3 features that make him unmistakable
  hasReferenceImage: boolean // user will attach an approved reference sheet
}

export type AssetType = 'sprite' | 'sprite-strip' | 'portrait' | 'item-icon' | 'background' | 'tile'
export type View = 'side-right' | 'side-left' | 'three-quarter-front' | 'front' | 'top-down' | 'isometric'
export type AspectRatio = '1:1' | '4:3' | '16:9' | '9:16' | 'custom'

export interface AssetRequest {
  type: AssetType
  includeCharacter: boolean // default false for background, tile, item-icon
  subject?: string // what to draw when there's no character (item, scene, tile)
  action: string // one clear action
  heldItems?: string // which hand holds what, from the character's perspective
  view: View
  frameCount?: number // sprite-strip only, 2 to 12
  framing: string
  backgroundColor: string // hex, default "#00FF00"
  lighting: string // default "even and neutral, from upper left"
  aspectRatio: AspectRatio
  customAspectRatio?: string
  exclusions: string[] // default: no text, no logos, no watermark, no extra characters
}

/** A style profile's editable content, without its storage id. */
export type StyleData = Omit<StyleProfile, 'id'>

/** A character profile's editable content, without its storage id. */
export type CharacterData = Omit<CharacterProfile, 'id'>

/** Everything the form edits at once. */
export interface FormValues {
  style: StyleData
  character: CharacterData
  asset: AssetRequest
}

export interface LintWarning {
  rule:
    | 'metaphor'
    | 'existing-ip'
    | 'signature-details'
    | 'palette-size'
    | 'chroma-clash'
    | 'missing-no-text'
    | 'ambiguous-hands'
  /** Form field path, e.g. "character.head" or "style.palette.2.usage". */
  field: string
  message: string
}
