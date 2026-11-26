import { type Rgb, rgbDistance } from './color'

/**
 * Pure image helpers for the Glue tab: cut each frame out of its chroma key background,
 * line the frames up on one ground line and one vertical anchor, and pack them into a
 * sheet. Images are plain RGBA buffers (the same layout as canvas ImageData), so all of
 * this runs and tests without a browser.
 */

export interface RawImage {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel, row by row. */
  data: Uint8ClampedArray
}

/** A rectangle with exclusive right and bottom edges. */
export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export function createImage(width: number, height: number): RawImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) }
}

const at = (img: RawImage, x: number, y: number) => (y * img.width + x) * 4

/** Linear-interpolated quantile, q from 0 to 1. */
const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

const median = (values: number[]) => quantile(values, 0.5)

/** The background color, taken as the per-channel median of the outermost 2 pixels on every edge. */
export function detectKeyColor(img: RawImage): Rgb {
  const r: number[] = []
  const g: number[] = []
  const b: number[] = []
  const take = (x: number, y: number) => {
    const i = at(img, x, y)
    r.push(img.data[i])
    g.push(img.data[i + 1])
    b.push(img.data[i + 2])
  }
  const band = Math.min(2, img.width, img.height)
  for (let d = 0; d < band; d++) {
    for (let x = 0; x < img.width; x++) {
      take(x, d)
      take(x, img.height - 1 - d)
    }
    for (let y = band; y < img.height - band; y++) {
      take(d, y)
      take(img.width - 1 - d, y)
    }
  }
  return { r: median(r), g: median(g), b: median(b) }
}

export interface KeyOptions {
  /** RGB distance from the key color below which a pixel is fully removed. */
  tolerance: number
  /** Width of the fade from transparent to opaque beyond the tolerance. */
  softness: number
}

export const DEFAULT_KEY_OPTIONS: KeyOptions = { tolerance: 90, softness: 40 }

const isGreenKey = (key: Rgb) => key.g > key.r + 40 && key.g > key.b + 40

/**
 * A copy of the image with the key color made transparent. Edge pixels next to the
 * removed background lose their green spill, so the outline doesn't keep a green halo.
 */
export function removeBackground(img: RawImage, key: Rgb, options: KeyOptions = DEFAULT_KEY_OPTIONS): RawImage {
  const out: RawImage = { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) }
  const { tolerance, softness } = options
  const d = out.data
  for (let i = 0; i < d.length; i += 4) {
    const dist = rgbDistance({ r: d[i], g: d[i + 1], b: d[i + 2] }, key)
    const alpha = dist <= tolerance ? 0 : dist >= tolerance + softness ? 255 : Math.round((255 * (dist - tolerance)) / softness)
    d[i + 3] = Math.min(d[i + 3], alpha)
  }
  if (isGreenKey(key)) {
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        const i = at(out, x, y)
        if (d[i + 3] === 0) continue
        const touchesBackground =
          (x > 0 && d[i - 4 + 3] < 255) ||
          (x < out.width - 1 && d[i + 4 + 3] < 255) ||
          (y > 0 && d[i - out.width * 4 + 3] < 255) ||
          (y < out.height - 1 && d[i + out.width * 4 + 3] < 255) ||
          d[i + 3] < 255
        if (touchesBackground) d[i + 1] = Math.min(d[i + 1], Math.max(d[i], d[i + 2]))
      }
    }
  }
  return out
}

/**
 * The box around the visible content. Rows and columns with fewer than `minPixels`
 * solid pixels don't count, so a few stray pixels don't stretch the box.
 */
export function contentBox(img: RawImage, minPixels = 3, alphaMin = 128): Box | null {
  const rows = new Array<number>(img.height).fill(0)
  const cols = new Array<number>(img.width).fill(0)
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[at(img, x, y) + 3] >= alphaMin) {
        rows[y]++
        cols[x]++
      }
    }
  }
  const first = (counts: number[]) => counts.findIndex((c) => c >= minPixels)
  const last = (counts: number[]) => counts.length - 1 - [...counts].reverse().findIndex((c) => c >= minPixels)
  const top = first(rows)
  const left = first(cols)
  if (top < 0 || left < 0) return null
  return { left, top, right: last(cols) + 1, bottom: last(rows) + 1 }
}

export interface FrameMetrics {
  box: Box
  /** Height of the source image, for thresholds. */
  imageHeight: number
  /** The line under the lowest solid pixel. */
  feetY: number
  /** Mean x of the solid pixels in the top 15% of the content: the head or hat. */
  headX: number
  centerX: number
}

export function measure(img: RawImage, box: Box, alphaMin = 128): FrameMetrics {
  const band = Math.max(4, Math.round((box.bottom - box.top) * 0.15))
  let sum = 0
  let count = 0
  for (let y = box.top; y < Math.min(box.bottom, box.top + band); y++) {
    for (let x = box.left; x < box.right; x++) {
      if (img.data[at(img, x, y) + 3] >= alphaMin) {
        sum += x + 0.5
        count++
      }
    }
  }
  const centerX = (box.left + box.right) / 2
  return { box, imageHeight: img.height, feetY: box.bottom, headX: count ? sum / count : centerX, centerX }
}

export type AnchorX = 'head' | 'center'

export interface LayoutOptions {
  /** What lines up vertically across frames: the head (walks, runs) or the content's center (lying poses). */
  anchor: AnchorX
  /** Put every grounded frame's feet on one baseline. Off keeps each frame's own vertical position. */
  snapToGround: boolean
  /** Feet this far above the ground (as a share of the image height) count as airborne and keep their lift. */
  airborneThreshold: number
  /** Empty space around the content in every cell. */
  padding: number
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  anchor: 'head',
  snapToGround: true,
  airborneThreshold: 0.03,
  padding: 8,
}

export interface Nudge {
  dx: number
  dy: number
  /** Force the frame airborne (true) or onto the ground (false). Undefined: detect it. */
  airborne?: boolean
}

export interface Placement {
  box: Box
  /** Where the box's top-left corner goes inside the cell. */
  x: number
  y: number
  airborne: boolean
}

export interface Layout {
  cellWidth: number
  cellHeight: number
  /** The ground line inside the cell. */
  baseline: number
  placements: Placement[]
}

/**
 * Where each frame goes inside a shared cell. Grounded frames get their feet on one
 * baseline; airborne frames (jump, run flight) keep their height above the ground.
 * The anchor (head or center) sits on the cell's vertical center line.
 *
 * The ground is the 75th percentile of the feet, not the median: in a run, half the
 * frames can be in the air, and the median would land between the two groups.
 */
export function planLayout(
  frames: FrameMetrics[],
  options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS,
  nudges: Nudge[] = [],
): Layout {
  if (!frames.length) return { cellWidth: 0, cellHeight: 0, baseline: 0, placements: [] }
  const ground = quantile(
    frames.map((f) => f.feetY),
    0.75,
  )
  const rel = frames.map((f, i) => {
    const { dx = 0, dy = 0, airborne: forced } = nudges[i] ?? {}
    const detected = ground - f.feetY > options.airborneThreshold * f.imageHeight
    const airborne = options.snapToGround && (forced ?? detected)
    const refY = options.snapToGround && !airborne ? f.feetY : ground
    const anchorX = options.anchor === 'head' ? f.headX : f.centerX
    return {
      airborne,
      left: f.box.left - anchorX + dx,
      right: f.box.right - anchorX + dx,
      top: f.box.top - refY + dy,
      bottom: f.box.bottom - refY + dy,
    }
  })
  const half = Math.max(...rel.map((r) => Math.max(-r.left, r.right)))
  const cellWidth = Math.ceil(2 * (half + options.padding))
  const minTop = Math.min(...rel.map((r) => r.top))
  const maxBottom = Math.max(...rel.map((r) => r.bottom))
  const cellHeight = Math.ceil(maxBottom - minTop + 2 * options.padding)
  const baseline = Math.round(options.padding - minTop)
  const center = cellWidth / 2
  return {
    cellWidth,
    cellHeight,
    baseline,
    placements: frames.map((f, i) => ({
      box: f.box,
      x: Math.round(center + rel[i].left),
      y: Math.round(baseline + rel[i].top),
      airborne: rel[i].airborne,
    })),
  }
}

/** Draws `src` over `dst` with alpha blending, clipped to `clip` in `dst` coordinates. */
function blit(dst: RawImage, src: RawImage, box: Box, x: number, y: number, clip: Box) {
  for (let sy = box.top; sy < box.bottom; sy++) {
    const ty = y + sy - box.top
    if (ty < clip.top || ty >= clip.bottom) continue
    for (let sx = box.left; sx < box.right; sx++) {
      const tx = x + sx - box.left
      if (tx < clip.left || tx >= clip.right) continue
      const si = at(src, sx, sy)
      const a = src.data[si + 3] / 255
      if (!a) continue
      const di = at(dst, tx, ty)
      const da = dst.data[di + 3] / 255
      const outA = a + da * (1 - a)
      for (let c = 0; c < 3; c++) {
        dst.data[di + c] = Math.round((src.data[si + c] * a + dst.data[di + c] * da * (1 - a)) / outA)
      }
      dst.data[di + 3] = Math.round(outA * 255)
    }
  }
}

/** Packs the cut-out frames into a transparent sheet, left to right and top to bottom. */
export function composeSheet(cutouts: RawImage[], layout: Layout, columns: number): RawImage {
  const cols = Math.max(1, Math.min(columns, cutouts.length || 1))
  const rows = Math.max(1, Math.ceil(cutouts.length / cols))
  const sheet = createImage(layout.cellWidth * cols, layout.cellHeight * rows)
  cutouts.forEach((cutout, i) => {
    const p = layout.placements[i]
    if (!p) return
    const ox = (i % cols) * layout.cellWidth
    const oy = Math.floor(i / cols) * layout.cellHeight
    const clip = { left: ox, top: oy, right: ox + layout.cellWidth, bottom: oy + layout.cellHeight }
    blit(sheet, cutout, p.box, ox + p.x, oy + p.y, clip)
  })
  return sheet
}

/** Cuts a sheet into equal cells, trimming `inset` pixels from every cell edge (to drop grid lines). */
export function sliceSheet(img: RawImage, columns: number, rows: number, inset = 3): RawImage[] {
  const cells: RawImage[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const left = Math.round((c * img.width) / columns) + inset
      const right = Math.round(((c + 1) * img.width) / columns) - inset
      const top = Math.round((r * img.height) / rows) + inset
      const bottom = Math.round(((r + 1) * img.height) / rows) - inset
      const cell = createImage(Math.max(0, right - left), Math.max(0, bottom - top))
      for (let y = 0; y < cell.height; y++) {
        const from = at(img, left, top + y)
        cell.data.set(img.data.subarray(from, from + cell.width * 4), y * cell.width * 4)
      }
      cells.push(cell)
    }
  }
  return cells
}

/** Sorts "frame2" before "frame10". */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/** Bilinear resize by a factor (1 keeps the image as is). */
export function resize(img: RawImage, factor: number): RawImage {
  if (factor === 1) return img
  const width = Math.max(1, Math.round(img.width * factor))
  const height = Math.max(1, Math.round(img.height * factor))
  const out = createImage(width, height)
  const xRatio = img.width / width
  const yRatio = img.height / height
  for (let y = 0; y < height; y++) {
    const sy = Math.min(img.height - 1, Math.max(0, (y + 0.5) * yRatio - 0.5))
    const y0 = Math.floor(sy)
    const y1 = Math.min(img.height - 1, y0 + 1)
    const fy = sy - y0
    for (let x = 0; x < width; x++) {
      const sx = Math.min(img.width - 1, Math.max(0, (x + 0.5) * xRatio - 0.5))
      const x0 = Math.floor(sx)
      const x1 = Math.min(img.width - 1, x0 + 1)
      const fx = sx - x0
      const o = at(out, x, y)
      for (let c = 0; c < 4; c++) {
        const top = img.data[at(img, x0, y0) + c] * (1 - fx) + img.data[at(img, x1, y0) + c] * fx
        const bottom = img.data[at(img, x0, y1) + c] * (1 - fx) + img.data[at(img, x1, y1) + c] * fx
        out.data[o + c] = Math.round(top * (1 - fy) + bottom * fy)
      }
    }
  }
  return out
}
