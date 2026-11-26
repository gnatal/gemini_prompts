export interface Rgb {
  r: number
  g: number
  b: number
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Accepts "#RRGGBB", "RRGGBB", "#RGB" or "RGB". */
export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim())
}

export function parseHex(value: string): Rgb | null {
  const match = HEX_RE.exec(value.trim())
  if (!match) return null
  let digits = match[1]
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join('')
  const n = parseInt(digits, 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

/** Normalizes a valid hex color to "#RRGGBB" (uppercase). Returns the trimmed input if invalid. */
export function normalizeHex(value: string): string {
  const rgb = parseHex(value)
  if (!rgb) return value.trim()
  return '#' + [rgb.r, rgb.g, rgb.b].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** Euclidean distance in RGB space (0 to ~441). */
export function rgbDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

/** Distance between two hex colors, or null if either is invalid. */
export function hexDistance(a: string, b: string): number | null {
  const ra = parseHex(a)
  const rb = parseHex(b)
  return ra && rb ? rgbDistance(ra, rb) : null
}

export interface Hsl {
  /** Hue in degrees, 0 to 360. */
  h: number
  /** Saturation, 0 to 1. */
  s: number
  /** Lightness, 0 to 1. */
  l: number
}

export function hexToHsl(value: string): Hsl | null {
  const rgb = parseHex(value)
  if (!rgb) return null
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s, l }
}

type HueRange = [from: number, to: number]

/** Color words people put in palette names, and the hues they mean. Neutral words (gray, cream, black) are left out. */
const HUE_WORDS: [words: RegExp, ranges: HueRange[]][] = [
  [/\b(?:red|crimson|scarlet|ruby|blood)\b/i, [[340, 360], [0, 20]]],
  [/\b(?:orange|rust|copper|amber)\b/i, [[10, 50]]],
  [/\b(?:yellow|gold|golden|mustard|lemon)\b/i, [[35, 70]]],
  [/\b(?:green|lime|olive|emerald|jade|moss)\b/i, [[60, 170]]],
  [/\b(?:teal|cyan|turquoise|aqua)\b/i, [[155, 205]]],
  [/\b(?:blue|navy|azure|cobalt|sapphire|sky)\b/i, [[190, 255]]],
  [/\bindigo\b/i, [[215, 285]]],
  [/\b(?:purple|violet|lavender|plum|lilac)\b/i, [[250, 310]]],
  [/\b(?:pink|magenta|rose|fuchsia|sakura)\b/i, [[290, 360], [0, 15]]],
  [/\bbrown\b/i, [[0, 50]]],
]

const inRange = (h: number, [from, to]: HueRange) => h >= from && h <= to

/** A plain name for a hue, for messages. */
export function hueName({ h, l }: Hsl): string {
  if (h < 15 || h >= 345) return 'red'
  if (h < 40) return l < 0.35 ? 'brown' : 'orange'
  if (h < 70) return 'yellow'
  if (h < 160) return 'green'
  if (h < 195) return 'teal'
  if (h < 255) return 'blue'
  if (h < 290) return 'purple'
  return 'pink'
}

/**
 * When a palette name says one color and its hex is another, returns the color the
 * hex actually is. Null when they agree, the name has no color word, or the hex is
 * too gray for its hue to mean anything.
 */
export function nameHexMismatch(name: string, hex: string): string | null {
  const hsl = hexToHsl(hex)
  if (!hsl || hsl.s < 0.15) return null
  const ranges = HUE_WORDS.filter(([re]) => re.test(name)).flatMap(([, r]) => r)
  if (!ranges.length || ranges.some((r) => inRange(hsl.h, r))) return null
  return hueName(hsl)
}
