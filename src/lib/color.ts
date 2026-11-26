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
