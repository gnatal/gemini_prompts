import { defaultAsset, MAX_PALETTE_COLORS } from '../config/defaults'
import { ART_STYLE_LABELS, ASPECT_RATIOS, ASSET_TYPE_LABELS, VIEW_LABELS } from '../config/labels'
import type { ArtStyle, AssetRequest, AssetType, FormValues, PaletteColor, View } from '../types'

type Key =
  | 'artStyle'
  | 'setting'
  | 'palette'
  | 'linesAndShading'
  | 'name'
  | 'proportions'
  | 'head'
  | 'torso'
  | 'armsAndHands'
  | 'legsAndFeet'
  | 'signatureDetails'
  | 'type'
  | 'frames'
  | 'subject'
  | 'action'
  | 'heldItems'
  | 'view'
  | 'framing'
  | 'background'
  | 'lighting'
  | 'aspectRatio'
  | 'exclude'

/** The labels buildPrompt writes, lowercased. They are unique across blocks. */
const LABELS: Record<string, Key> = {
  'art style': 'artStyle',
  setting: 'setting',
  palette: 'palette',
  'lines and shading': 'linesAndShading',
  name: 'name',
  proportions: 'proportions',
  head: 'head',
  torso: 'torso',
  'arms and hands': 'armsAndHands',
  'legs and feet': 'legsAndFeet',
  'signature details': 'signatureDetails',
  type: 'type',
  frames: 'frames',
  subject: 'subject',
  action: 'action',
  'held items': 'heldItems',
  view: 'view',
  framing: 'framing',
  background: 'background',
  lighting: 'lighting',
  'aspect ratio': 'aspectRatio',
  exclude: 'exclude',
}

const STYLE_KEYS: Key[] = ['artStyle', 'setting', 'palette', 'linesAndShading']
const CHARACTER_KEYS: Key[] = [
  'name',
  'proportions',
  'head',
  'torso',
  'armsAndHands',
  'legsAndFeet',
  'signatureDetails',
]
const ASSET_KEYS: Key[] = [
  'type',
  'frames',
  'subject',
  'action',
  'heldItems',
  'view',
  'framing',
  'background',
  'lighting',
  'aspectRatio',
  'exclude',
]

/** Lines buildPrompt adds on its own. They have no form field, so they are read and dropped. */
const GENERATED_LABELS = new Set(['sides'])

/** The blocks whose fields fill the form. Any other [BLOCK] is skipped. */
const FORM_BLOCKS = new Set(['STYLE', 'CHARACTER', 'ASSET'])
const LABEL_RE = /^([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/
const BLOCK_RE = /^\[([A-Za-z ]+)\]$/
const REFERENCE_RE = /^use the attached reference image\b/i
const SEPARATOR_RE = /^\s*-{3,}\s*$/m
const HEX_RE = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/i

export interface ParseResult {
  /** The new form values: the current ones, with every block found in the text replaced. */
  values: FormValues
  /** Which blocks were filled. */
  filled: ('Style' | 'Character' | 'Asset')[]
  /** Things that were not loaded, as short readable notes. */
  notes: string[]
}

const findKey = <T extends string>(labels: Record<T, string>, text: string): T | undefined => {
  const wanted = text.trim().toLowerCase()
  return (Object.keys(labels) as T[]).find((k) => labels[k].toLowerCase() === wanted)
}

const splitList = (text: string | undefined, separator: string) =>
  (text ?? '')
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean)

const truncate = (s: string, max = 60) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

/** Reads "Name #HEX (usage)" entries separated by semicolons. */
export function parsePalette(text: string): PaletteColor[] {
  return splitList(text, ';').map((entry) => {
    const usageMatch = /\(([^)]*)\)\s*$/.exec(entry)
    const usage = usageMatch ? usageMatch[1].trim() : ''
    const rest = usageMatch ? entry.slice(0, usageMatch.index) : entry
    const hexMatch = HEX_RE.exec(rest)
    const hex = hexMatch ? hexMatch[0].toUpperCase() : ''
    const name = (hexMatch ? rest.slice(0, hexMatch.index) + rest.slice(hexMatch.index + hexMatch[0].length) : rest)
      .replace(/\s+/g, ' ')
      .trim()
    return { name, hex, usage }
  })
}

function parseArtStyle(text: string): Pick<FormValues['style'], 'artStyle' | 'customStyle' | 'pixelResolution'> {
  const pixel = /^pixel art(?:\s*,\s*(.+?)\s+sprite resolution)?\s*$/i.exec(text.trim())
  if (pixel) return { artStyle: 'pixel-art', customStyle: '', pixelResolution: pixel[1]?.trim() ?? '' }
  const known = findKey(ART_STYLE_LABELS, text)
  if (known && known !== 'custom') return { artStyle: known as ArtStyle, customStyle: '', pixelResolution: '' }
  return { artStyle: 'custom', customStyle: text.trim(), pixelResolution: '' }
}

function parseType(text: string): { type: AssetType; grid: boolean } | null {
  if (/^sprite sheet$/i.test(text.trim())) return { type: 'sprite-strip', grid: true }
  const type = findKey(ASSET_TYPE_LABELS, text)
  return type ? { type, grid: false } : null
}

/**
 * Reads a prompt in the format buildPrompt writes (or a hand-edited one) back
 * into form values. Lenient: fields are matched by label, a value can run onto
 * the following lines, and a block that is missing from the text keeps its
 * current values.
 */
export function parsePrompt(text: string, current: FormValues): ParseResult {
  const notes: string[] = []
  let source = text.replace(/\r\n?/g, '\n')
  if (SEPARATOR_RE.test(source)) {
    source = source.split(SEPARATOR_RE)[0]
    notes.push('The text holds several prompts. Only the first one was used.')
  }

  const raw: Partial<Record<Key, string>> = {}
  let referenceImage = false
  let skipping = false
  let currentKey: Key | null = null
  const unknown: string[] = []
  const skippedBlocks: string[] = []

  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    const block = BLOCK_RE.exec(trimmed)
    if (block) {
      const name = block[1].trim().toUpperCase()
      skipping = !FORM_BLOCKS.has(name)
      if (skipping) skippedBlocks.push(`[${name}]`)
      currentKey = null
      continue
    }
    if (skipping) continue
    if (!trimmed) {
      currentKey = null
      continue
    }
    if (REFERENCE_RE.test(trimmed)) {
      referenceImage = true
      continue
    }
    const label = LABEL_RE.exec(trimmed)
    if (label && GENERATED_LABELS.has(label[1].toLowerCase())) {
      currentKey = null
      continue
    }
    const key = label ? LABELS[label[1].toLowerCase()] : undefined
    if (label && key) {
      raw[key] = label[2].trim()
      currentKey = key
    } else if (currentKey) {
      // A value that runs onto the next line.
      raw[currentKey] = `${raw[currentKey]} ${trimmed}`.trim()
    } else {
      unknown.push(trimmed)
    }
  }

  const has = (keys: Key[]) => keys.some((k) => raw[k] !== undefined)
  const styleFound = has(STYLE_KEYS)
  const characterFound = has(CHARACTER_KEYS)
  const assetFound = has(ASSET_KEYS)
  const filled: ParseResult['filled'] = []
  const values: FormValues = structuredClone(current)

  if (styleFound) {
    filled.push('Style')
    let palette = raw.palette !== undefined ? parsePalette(raw.palette) : []
    if (palette.length > MAX_PALETTE_COLORS) {
      notes.push(`The palette has ${palette.length} colors. Only the first ${MAX_PALETTE_COLORS} were kept.`)
      palette = palette.slice(0, MAX_PALETTE_COLORS)
    }
    values.style = {
      ...values.style, // keeps the style name, which isn't part of the prompt
      ...(raw.artStyle !== undefined ? parseArtStyle(raw.artStyle) : {}),
      setting: raw.setting ?? '',
      palette,
      linesAndShading: raw.linesAndShading ?? '',
    }
  }

  if (characterFound) {
    filled.push('Character')
    values.character = {
      name: raw.name ?? '',
      proportions: raw.proportions ?? '',
      head: raw.head ?? '',
      torso: raw.torso ?? '',
      armsAndHands: raw.armsAndHands ?? '',
      legsAndFeet: raw.legsAndFeet ?? '',
      signatureDetails: splitList(raw.signatureDetails, ';'),
      hasReferenceImage: referenceImage,
    }
  } else if (referenceImage) {
    values.character.hasReferenceImage = true
  }

  if (assetFound) {
    filled.push('Asset')
    const asset: AssetRequest = {
      ...defaultAsset(),
      type: current.asset.type,
      action: '',
      subject: '',
      heldItems: '',
      framing: '',
      lighting: '',
      exclusions: [],
      customAspectRatio: '',
    }

    if (raw.type !== undefined) {
      const parsed = parseType(raw.type)
      if (parsed) {
        asset.type = parsed.type
        if (parsed.type === 'sprite-strip') asset.frameLayout = parsed.grid ? 'grid' : 'row'
      } else {
        notes.push(`Unknown asset type “${truncate(raw.type)}”. The current type was kept.`)
      }
    }
    if (raw.frames !== undefined) {
      const count = /^\s*(\d+)/.exec(raw.frames)
      if (count) asset.frameCount = Number(count[1])
      if (/\bgrid\b/i.test(raw.frames)) asset.frameLayout = 'grid'
      else if (/\brow\b/i.test(raw.frames)) asset.frameLayout = 'row'
    }

    // A full prompt without a [CHARACTER] block means the character was left out.
    asset.includeCharacter = characterFound ? true : styleFound ? false : current.asset.includeCharacter

    asset.subject = raw.subject ?? ''
    asset.action = raw.action ?? ''
    asset.heldItems = raw.heldItems ?? ''
    asset.framing = raw.framing ?? ''
    asset.lighting = raw.lighting ?? ''
    asset.exclusions = splitList(raw.exclude, ',')

    if (raw.view !== undefined) {
      const view = findKey(VIEW_LABELS, raw.view)
      if (view) asset.view = view as View
      else notes.push(`Unknown view “${truncate(raw.view)}”. The default view was used.`)
    }
    if (raw.background !== undefined) {
      const hex = HEX_RE.exec(raw.background)
      if (hex) asset.backgroundColor = hex[0].toUpperCase()
    }
    if (raw.aspectRatio !== undefined) {
      const ratio = raw.aspectRatio.replace(/\s+/g, '')
      const known = ASPECT_RATIOS.find((r) => r !== 'custom' && r === ratio)
      asset.aspectRatio = known ?? 'custom'
      asset.customAspectRatio = known ? '' : raw.aspectRatio.trim()
    }
    values.asset = asset
  }

  if (skippedBlocks.length) {
    notes.push(`${skippedBlocks.join(', ')} isn't part of the form, so it was skipped. Use the Animations tab for animations.`)
  }
  if (unknown.length) {
    const shown = unknown.slice(0, 3).map((l) => `“${truncate(l, 40)}”`)
    const more = unknown.length > 3 ? ` and ${unknown.length - 3} more` : ''
    notes.push(`Not recognized: ${shown.join(', ')}${more}.`)
  }

  return { values, filled, notes }
}
