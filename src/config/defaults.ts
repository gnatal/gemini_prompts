import type { AssetRequest, CharacterData, FormValues, StyleData } from '../types'
import { ASSET_PRESETS } from './assetPresets'

export const CHROMA_GREEN = '#00FF00'
export const CHROMA_MAGENTA = '#FF00FF'
export const DEFAULT_LIGHTING = 'even and neutral, from upper left'
export const DEFAULT_EXCLUSIONS = ['no text', 'no logos', 'no watermark', 'no extra characters']
export const MAX_PALETTE_COLORS = 6

export function defaultStyle(): StyleData {
  return {
    name: '',
    artStyle: 'pixel-art',
    customStyle: '',
    pixelResolution: '64x64',
    palette: [{ name: '', hex: '#1E4FD8', usage: '' }],
    linesAndShading: '',
  }
}

export function defaultCharacter(): CharacterData {
  return {
    name: '',
    proportions: '',
    head: '',
    torso: '',
    armsAndHands: '',
    legsAndFeet: '',
    signatureDetails: [],
    hasReferenceImage: false,
  }
}

export function defaultAsset(): AssetRequest {
  const preset = ASSET_PRESETS.sprite
  return {
    type: 'sprite',
    includeCharacter: preset.includeCharacter,
    subject: '',
    action: '',
    heldItems: '',
    view: preset.view,
    frameCount: undefined,
    framing: preset.framing,
    backgroundColor: CHROMA_GREEN,
    lighting: DEFAULT_LIGHTING,
    aspectRatio: preset.aspectRatio,
    customAspectRatio: '',
    exclusions: [...DEFAULT_EXCLUSIONS],
  }
}

export function defaultFormValues(): FormValues {
  return { style: defaultStyle(), character: defaultCharacter(), asset: defaultAsset() }
}
