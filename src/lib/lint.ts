import { usesChromaKey } from '../config/assetPresets'
import { CHROMA_GREEN, CHROMA_MAGENTA } from '../config/defaults'
import { IP_BLOCKLIST } from '../config/ipBlocklist'
import type { FormValues, LintWarning } from '../types'
import { hexDistance, isValidHex, normalizeHex } from './color'

export const METAPHOR_MESSAGE = 'Describe the shape in plain geometry instead. Comparisons get exaggerated.'
export const IP_MESSAGE =
  'Names an existing character or franchise. The model will drift toward it, and the asset may not be yours to ship.'
export const HANDS_MESSAGE = "Say which hand, from the character's perspective."
export const CHROMA_CLASH_DISTANCE = 100

const METAPHOR_RE = /\b(?:like an?|looks like|as if|resembles|similar to)\b|\b[a-z]+-shaped\b/i

const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Finds the first blocklisted name in `text`, matched on whole words, ignoring case and accents. */
export function findBlockedName(text: string, blocklist: readonly string[] = IP_BLOCKLIST): string | null {
  const haystack = stripAccents(text)
  for (const name of blocklist) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(stripAccents(name))}(?![\\p{L}\\p{N}])`, 'iu')
    if (re.test(haystack)) return name
  }
  return null
}

export function hasMetaphor(text: string): boolean {
  return METAPHOR_RE.test(text)
}

export interface LintOptions {
  blocklist?: readonly string[]
}

/**
 * Prompt-writing warnings. They never block copying.
 * Character fields are only checked when the character is part of the asset.
 */
export function lint(values: FormValues, options: LintOptions = {}): LintWarning[] {
  const { style, character, asset } = values
  const blocklist = options.blocklist ?? IP_BLOCKLIST
  const warnings: LintWarning[] = []
  const withCharacter = asset.includeCharacter

  // Free-text fields that end up in the prompt, keyed by form path.
  const texts: [field: string, value: string | undefined][] = [
    ['style.customStyle', style.artStyle === 'custom' ? style.customStyle : undefined],
    ['style.linesAndShading', style.linesAndShading],
    ...style.palette.flatMap((c, i): [string, string][] => [
      [`style.palette.${i}.name`, c.name],
      [`style.palette.${i}.usage`, c.usage],
    ]),
  ]
  if (withCharacter) {
    texts.push(
      ['character.name', character.name],
      ['character.proportions', character.proportions],
      ['character.head', character.head],
      ['character.torso', character.torso],
      ['character.armsAndHands', character.armsAndHands],
      ['character.legsAndFeet', character.legsAndFeet],
      ...character.signatureDetails.map((d, i): [string, string] => [`character.signatureDetails.${i}`, d]),
      ['asset.heldItems', asset.heldItems],
    )
  } else {
    texts.push(['asset.subject', asset.subject])
  }
  texts.push(['asset.action', asset.action], ['asset.framing', asset.framing])

  // 1. Metaphors, 2. Existing IP
  for (const [field, value] of texts) {
    if (!value?.trim()) continue
    if (hasMetaphor(value)) warnings.push({ rule: 'metaphor', field, message: METAPHOR_MESSAGE })
    const blocked = findBlockedName(value, blocklist)
    if (blocked) warnings.push({ rule: 'existing-ip', field, message: `${IP_MESSAGE} (“${blocked}”)` })
  }

  // 3. Signature details
  if (withCharacter && character.signatureDetails.filter((d) => d.trim()).length < 2) {
    warnings.push({
      rule: 'signature-details',
      field: 'character.signatureDetails',
      message: 'Add 2 or 3 signature details. They are what keeps the character recognizable across assets.',
    })
  }

  // 4. Palette size
  const colorCount = style.palette.length
  if (colorCount < 3 || colorCount > 6) {
    warnings.push({
      rule: 'palette-size',
      field: 'style.palette',
      message: `Use 3 to 6 palette colors (currently ${colorCount}). Fewer gives the model too much freedom, more gets ignored.`,
    })
  }

  // 5. Chroma key clash
  if (usesChromaKey(asset.type) && isValidHex(asset.backgroundColor)) {
    const clash = style.palette.find((c) => {
      const d = hexDistance(c.hex, asset.backgroundColor)
      return d !== null && d <= CHROMA_CLASH_DISTANCE
    })
    if (clash) {
      const nearMagenta = (hexDistance(asset.backgroundColor, CHROMA_MAGENTA) ?? Infinity) <= CHROMA_CLASH_DISTANCE
      const alternative = nearMagenta ? `green ${CHROMA_GREEN}` : `magenta ${CHROMA_MAGENTA}`
      const label = clash.name.trim() ? `“${clash.name.trim()}” ` : ''
      warnings.push({
        rule: 'chroma-clash',
        field: 'asset.backgroundColor',
        message: `Background is close to palette color ${label}${normalizeHex(clash.hex)}, so background removal will eat into the asset. Try ${alternative} instead.`,
      })
    }
  }

  // 6. Missing "no text"
  if (!asset.exclusions.some((e) => /text/i.test(e))) {
    warnings.push({
      rule: 'missing-no-text',
      field: 'asset.exclusions',
      message: 'Add "no text". Image models like to add captions and labels.',
    })
  }

  // 7. Ambiguous hands
  if (withCharacter && asset.heldItems?.trim() && !/\b(?:left|right)\b/i.test(asset.heldItems)) {
    warnings.push({ rule: 'ambiguous-hands', field: 'asset.heldItems', message: HANDS_MESSAGE })
  }

  return warnings
}
