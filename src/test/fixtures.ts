import { defaultAsset } from '../config/defaults'
import type { AssetRequest, CharacterData, FormValues, StyleData } from '../types'

export function cleanStyle(): StyleData {
  return {
    name: 'Main game style',
    artStyle: 'pixel-art',
    customStyle: '',
    pixelResolution: '64x64',
    palette: [
      { name: 'Royal blue', hex: '#1E4FD8', usage: 'helmet, boots' },
      { name: 'Sky blue', hex: '#7EC8F2', usage: 'bodysuit' },
      { name: 'Brass', hex: '#C9A13B', usage: 'buckle, spurs' },
    ],
    linesAndShading: 'thick dark outlines, 2-tone cel shading, no gradients',
  }
}

export function cleanCharacter(): CharacterData {
  return {
    name: 'Rex Ranger',
    proportions: '4 heads tall, small torso, oversized boots',
    head: 'round blue helmet with a short vertical fin, large round eyes',
    torso: 'sky blue bodysuit with a brass belt buckle',
    armsAndHands: 'dark blue fingerless gloves',
    legsAndFeet: 'oversized royal blue boots with brass spurs',
    signatureDetails: ['red scarf trailing behind', 'brass star on the belt buckle', 'fin on the helmet'],
    hasReferenceImage: false,
  }
}

export function cleanAsset(overrides: Partial<AssetRequest> = {}): AssetRequest {
  return {
    ...defaultAsset(),
    action: 'running',
    heldItems: 'revolver in the right hand',
    ...overrides,
  }
}

export function cleanValues(): FormValues {
  return { style: cleanStyle(), character: cleanCharacter(), asset: cleanAsset() }
}
