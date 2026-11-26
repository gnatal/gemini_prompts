import { ART_STYLE_LABELS, ASSET_TYPE_LABELS, VIEW_LABELS } from '../config/labels'
import { usesChromaKey } from '../config/assetPresets'
import type { AssetRequest, CharacterData, PaletteColor, StyleData } from '../types'
import { normalizeHex } from './color'

export const REFERENCE_IMAGE_LINE =
  'Use the attached reference image as the exact design of the character. Keep every detail identical.'

type Line = [label: string, value: string | undefined]

const clean = (s: string | undefined) => (s ?? '').trim()

const nonEmpty = (items: readonly string[]) => items.map((s) => s.trim()).filter(Boolean)

function renderBlock(header: string, lines: Line[]): string | null {
  const body = lines
    .map(([label, value]) => [label, clean(value)] as const)
    .filter(([, value]) => value !== '')
    .map(([label, value]) => `${label}: ${value}`)
  return body.length ? [header, ...body].join('\n') : null
}

function formatArtStyle(style: StyleData): string {
  if (style.artStyle === 'custom') return clean(style.customStyle)
  const label = ART_STYLE_LABELS[style.artStyle]
  const resolution = clean(style.pixelResolution)
  return style.artStyle === 'pixel-art' && resolution ? `${label}, ${resolution} sprite resolution` : label
}

function formatColor(color: PaletteColor): string {
  const parts = [clean(color.name), normalizeHex(color.hex)].filter(Boolean).join(' ')
  const usage = clean(color.usage)
  return usage ? `${parts} (${usage})` : parts
}

export function buildStyleBlock(style: StyleData): string | null {
  return renderBlock('[STYLE]', [
    ['Art style', formatArtStyle(style)],
    ['Palette', style.palette.filter((c) => clean(c.hex) || clean(c.name)).map(formatColor).join('; ')],
    ['Lines and shading', style.linesAndShading],
  ])
}

export function buildCharacterBlock(character: CharacterData): string | null {
  return renderBlock('[CHARACTER]', [
    ['Name', character.name],
    ['Proportions', character.proportions],
    ['Head', character.head],
    ['Torso', character.torso],
    ['Arms and hands', character.armsAndHands],
    ['Legs and feet', character.legsAndFeet],
    ['Signature details', nonEmpty(character.signatureDetails).join('; ')],
  ])
}

export function formatAspectRatio(asset: AssetRequest): string {
  return asset.aspectRatio === 'custom' ? clean(asset.customAspectRatio) : asset.aspectRatio
}

export function buildAssetBlock(asset: AssetRequest): string | null {
  const isStrip = asset.type === 'sprite-strip'
  return renderBlock('[ASSET]', [
    ['Type', ASSET_TYPE_LABELS[asset.type]],
    ['Frames', isStrip && asset.frameCount ? `${asset.frameCount}, in one horizontal row` : undefined],
    ['Subject', asset.includeCharacter ? undefined : asset.subject],
    ['Action', asset.action],
    ['Held items', asset.includeCharacter ? asset.heldItems : undefined],
    ['View', VIEW_LABELS[asset.view]],
    ['Framing', asset.framing],
    [
      'Background',
      usesChromaKey(asset.type) && clean(asset.backgroundColor)
        ? `solid flat ${normalizeHex(asset.backgroundColor)}, no shadows or texture`
        : undefined,
    ],
    ['Lighting', asset.lighting],
    ['Aspect ratio', formatAspectRatio(asset)],
    ['Exclude', nonEmpty(asset.exclusions).join(', ')],
  ])
}

/**
 * Builds the plain-text prompt. Fixed field order, empty fields omitted.
 * Pass `character: null` (or set `asset.includeCharacter` to false) to leave the character out.
 */
export function buildPrompt(style: StyleData, character: CharacterData | null, asset: AssetRequest): string {
  const withCharacter = asset.includeCharacter && character !== null
  const parts = [
    withCharacter && character.hasReferenceImage ? REFERENCE_IMAGE_LINE : null,
    buildStyleBlock(style),
    withCharacter ? buildCharacterBlock(character) : null,
    buildAssetBlock(asset),
  ]
  return parts.filter((p): p is string => p !== null).join('\n\n')
}
