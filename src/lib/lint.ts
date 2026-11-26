import { usesChromaKey } from '../config/assetPresets'
import { CHROMA_GREEN, CHROMA_MAGENTA } from '../config/defaults'
import { IP_BLOCKLIST } from '../config/ipBlocklist'
import type { FormValues, LintWarning } from '../types'
import { hexDistance, isValidHex, nameHexMismatch, normalizeHex } from './color'

export const METAPHOR_MESSAGE = 'Describe the shape in plain geometry instead. Comparisons get exaggerated.'
export const IP_MESSAGE =
  'Names an existing character or franchise. The model will drift toward it, and the asset may not be yours to ship.'
export const HANDS_MESSAGE = "Say which hand, from the character's perspective."
export const CHROMA_CLASH_DISTANCE = 100
export const TEXT_CONFLICT_MESSAGE =
  'This asks for written text, but Exclude says "no text", so the model gets both. Models also misspell text, and it is unreadable at sprite size. Drop it here and add it after generating, or remove "no text" and give the exact characters.'
export const SPRITE_LIGHTING_MESSAGE =
  'Mood lighting gets baked into the sprite, so it looks wrong in every other scene. Keep sprites even and neutral, and put the mood in the background art.'
export const LIGHTING_CONFLICT_MESSAGE =
  'Lighting and Lines and shading pull in opposite directions (warm vs cold). The model blends them or picks one at random. Keep one.'
export const PROPORTIONS_MESSAGE =
  'Give the height in heads, like "3 heads tall" for a chunky build or "7 heads tall" for a realistic one. Without a number the model picks the build itself.'

const METAPHOR_RE = /\b(?:like an?|looks like|as if|resembles|similar to)\b|\b[a-z]+-shaped\b/i

const QUOTED_RE = /["“][^"”]+["”]/
const TEXT_WORDS_RE = /\b(?:kanji|lettering|letters|words?|phrase|inscription|inscribed|written|writing|slogan|caption|text)\b/i
const NO_TEXT_RE = /\btext\b/i

const WARM_RE = /\b(?:warm|sunny|sunlit|sunlight|sunset|sunrise|golden hour|daylight|midday|noon)\b/i
const COLD_RE = /\b(?:cold|moonlight|moonlit|night|nighttime|icy|frosty)\b/i
const MOOD_LIGHT_RE =
  /\b(?:moonlight|moonlit|sunset|sunrise|golden hour|dramatic|rim[- ]?light|backlit|backlight|spotlight|candlelight|torchlight|firelight|neon|night)\b/i

const PROPORTIONS_RE =
  /\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine)(?:\s+and\s+a\s+half)?\s*-?\s*heads?\s*(?:tall|high)\b/i

/** Gear that gets drawn twice when it is both held and part of the outfit. */
const GEAR: [name: string, re: RegExp][] = [
  ['gun', /\b(?:guns?|pistols?|revolvers?|muskets?|rifles?|shotguns?|blasters?|firearms?|flintlocks?)\b/i],
  ['blade', /\b(?:knife|knives|daggers?|swords?|cutlass(?:es)?|katanas?|sabers?|sabres?|blades?|machetes?)\b/i],
]
const CLAUSE_SPLIT_RE = /[,;.]|\band\b/i

type Temperature = 'warm' | 'cold' | 'both' | null

function temperature(text: string | undefined): Temperature {
  const warm = WARM_RE.test(text ?? '')
  const cold = COLD_RE.test(text ?? '')
  return warm && cold ? 'both' : warm ? 'warm' : cold ? 'cold' : null
}

/** True when the text asks for something written: a quoted phrase, or words like "kanji" or "lettering". */
export function asksForText(text: string): boolean {
  return QUOTED_RE.test(text) || TEXT_WORDS_RE.test(text)
}

/** The gear families in `text` that are not marked as empty (an empty holster is fine). */
function gearIn(text: string): Set<string> {
  const found = new Set<string>()
  for (const clause of text.split(CLAUSE_SPLIT_RE)) {
    if (/\bempty\b/i.test(clause)) continue
    for (const [name, re] of GEAR) if (re.test(clause)) found.add(name)
  }
  return found
}

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
    ['style.setting', style.setting],
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

  // 8. Palette name says one color, hex says another
  style.palette.forEach((c, i) => {
    const actual = nameHexMismatch(c.name, c.hex)
    if (actual) {
      warnings.push({
        rule: 'palette-name-mismatch',
        field: `style.palette.${i}.name`,
        message: `“${c.name.trim()}” is named one color, but ${normalizeHex(c.hex)} is ${actual}. The model gets both and mixes them up. Fix the name or the hex.`,
      })
    }
  })

  // 9. Asks for text while excluding text
  if (asset.exclusions.some((e) => NO_TEXT_RE.test(e))) {
    const describing = texts.filter(([field]) => field.startsWith('character.') || field === 'asset.heldItems' || field === 'asset.subject')
    for (const [field, value] of describing) {
      if (value?.trim() && field !== 'character.name' && asksForText(value)) {
        warnings.push({ rule: 'text-conflict', field, message: TEXT_CONFLICT_MESSAGE })
      }
    }
  }

  // 10. Mood lighting on a sprite, 11. warm vs cold lighting
  const moodySprite = usesChromaKey(asset.type) && MOOD_LIGHT_RE.test(asset.lighting)
  if (moodySprite) {
    warnings.push({ rule: 'sprite-lighting', field: 'asset.lighting', message: SPRITE_LIGHTING_MESSAGE })
  }
  const shadingTemp = temperature(style.linesAndShading)
  const lightingTemp = temperature(asset.lighting)
  const opposite =
    (shadingTemp === 'warm' && lightingTemp === 'cold') || (shadingTemp === 'cold' && lightingTemp === 'warm')
  if (opposite && !moodySprite) {
    warnings.push({ rule: 'lighting-conflict', field: 'asset.lighting', message: LIGHTING_CONFLICT_MESSAGE })
  }

  // 12. The same kind of gear held and worn, which gets drawn twice
  if (withCharacter && asset.heldItems?.trim()) {
    const held = gearIn(asset.heldItems)
    const outfit: [string, string][] = [
      ['character.head', character.head],
      ['character.torso', character.torso],
      ['character.armsAndHands', character.armsAndHands],
      ['character.legsAndFeet', character.legsAndFeet],
      ...character.signatureDetails.map((d, i): [string, string] => [`character.signatureDetails.${i}`, d]),
    ]
    for (const [field, value] of outfit) {
      for (const gear of gearIn(value)) {
        if (!held.has(gear)) continue
        warnings.push({
          rule: 'duplicate-gear',
          field,
          message: `Held items already has a ${gear}, and this field describes one too, so the model may draw two. If it's worn gear, call it an empty holster or scabbard; otherwise describe it in one place only.`,
        })
      }
    }
  }

  // 13. Proportions without a height in heads
  if (withCharacter && character.proportions.trim() && !PROPORTIONS_RE.test(character.proportions)) {
    warnings.push({ rule: 'proportions-heads', field: 'character.proportions', message: PROPORTIONS_MESSAGE })
  }

  return warnings
}
