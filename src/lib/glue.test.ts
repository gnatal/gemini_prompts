import { describe, expect, it } from 'vitest'
import type { Rgb } from './color'
import {
  type Box,
  composeSheet,
  contentBox,
  createImage,
  DEFAULT_LAYOUT_OPTIONS,
  detectKeyColor,
  measure,
  naturalCompare,
  planLayout,
  type RawImage,
  removeBackground,
  resize,
  sliceSheet,
} from './glue'

const GREEN: Rgb = { r: 18, g: 200, b: 30 }
const RED: Rgb = { r: 200, g: 30, b: 30 }
const DARK: Rgb = { r: 40, g: 30, b: 30 }

function filled(width: number, height: number, color: Rgb): RawImage {
  const img = createImage(width, height)
  for (let i = 0; i < img.data.length; i += 4) img.data.set([color.r, color.g, color.b, 255], i)
  return img
}

function rect(img: RawImage, box: Box, color: Rgb, alpha = 255) {
  for (let y = box.top; y < box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) img.data.set([color.r, color.g, color.b, alpha], (y * img.width + x) * 4)
  }
}

const pixel = (img: RawImage, x: number, y: number) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)]

/** A 100×100 green frame with a "character": a head block on top of a body block, feet at `feet`. */
function character(offsetX: number, feet: number): RawImage {
  const img = filled(100, 100, GREEN)
  rect(img, { left: 40 + offsetX, top: feet - 50, right: 56 + offsetX, bottom: feet - 38 }, RED) // head
  rect(img, { left: 36 + offsetX, top: feet - 38, right: 64 + offsetX, bottom: feet }, DARK) // body and legs
  return img
}

const cut = (img: RawImage) => removeBackground(img, detectKeyColor(img))

describe('background removal', () => {
  it('detects the key color from the edges', () => {
    expect(detectKeyColor(character(0, 90))).toEqual(GREEN)
  })

  it('makes the key color transparent and keeps the character solid', () => {
    const out = cut(character(0, 90))
    expect(pixel(out, 5, 5)[3]).toBe(0)
    expect(pixel(out, 48, 45)).toEqual([200, 30, 30, 255])
  })

  it('removes green spill from edge pixels only', () => {
    const img = filled(10, 10, GREEN)
    rect(img, { left: 3, top: 3, right: 7, bottom: 7 }, { r: 120, g: 200, b: 130 }) // greenish, but far enough from the key to stay
    const out = cut(img)
    expect(pixel(out, 3, 3)).toEqual([120, 130, 130, 255]) // edge: despilled
    expect(pixel(out, 4, 4)).toEqual([120, 200, 130, 255]) // inside: untouched
  })
})

describe('contentBox and measure', () => {
  it('finds the content and ignores a stray pixel', () => {
    const img = cut(character(0, 90))
    rect(img, { left: 2, top: 2, right: 3, bottom: 3 }, RED)
    expect(contentBox(img)).toEqual({ left: 36, top: 40, right: 64, bottom: 90 })
  })

  it('returns null for an empty frame', () => {
    expect(contentBox(cut(filled(20, 20, GREEN)))).toBeNull()
  })

  it('finds the feet and the head', () => {
    const img = cut(character(10, 80))
    const m = measure(img, contentBox(img)!)
    expect(m.feetY).toBe(80)
    expect(m.headX).toBe(58) // head spans 50 to 66
    expect(m.centerX).toBe(60)
  })
})

describe('planLayout', () => {
  const metrics = (img: RawImage) => measure(img, contentBox(img)!)

  it('puts every grounded frame on one baseline and lines the heads up', () => {
    const frames = [cut(character(0, 90)), cut(character(15, 84)), cut(character(-10, 92))].map(metrics)
    const layout = planLayout(frames, { ...DEFAULT_LAYOUT_OPTIONS, airborneThreshold: 0.1 })
    for (const [i, p] of layout.placements.entries()) {
      const f = frames[i]
      expect(p.y + (f.box.bottom - f.box.top)).toBe(layout.baseline) // feet on the baseline
      expect(p.x + (f.headX - f.box.left)).toBe(layout.cellWidth / 2) // head on the center line
      expect(p.airborne).toBe(false)
    }
  })

  it('keeps the lift of an airborne frame', () => {
    const frames = [cut(character(0, 90)), cut(character(0, 90)), cut(character(0, 60))].map(metrics)
    const layout = planLayout(frames)
    const [ground, , jump] = layout.placements
    expect(jump.airborne).toBe(true)
    expect(ground.y - jump.y).toBe(30)
  })

  it('finds the ground under the grounded frames even when half the frames are in the air', () => {
    const frames = [90, 89, 70, 68, 90, 88, 66, 69].map((feet) => metrics(cut(character(0, feet))))
    const layout = planLayout(frames)
    expect(layout.placements.map((p) => p.airborne)).toEqual([false, false, true, true, false, false, true, true])
  })

  it('lets a frame be forced onto the ground or into the air', () => {
    const frames = [cut(character(0, 90)), cut(character(0, 90)), cut(character(0, 60))].map(metrics)
    const forced = planLayout(frames, DEFAULT_LAYOUT_OPTIONS, [{ dx: 0, dy: 0, airborne: true }, { dx: 0, dy: 0 }, { dx: 0, dy: 0, airborne: false }])
    expect(forced.placements.map((p) => p.airborne)).toEqual([true, false, false])
  })

  it('treats every frame as grounded-in-place when snapping is off', () => {
    const frames = [cut(character(0, 90)), cut(character(0, 60))].map(metrics)
    const layout = planLayout(frames, { ...DEFAULT_LAYOUT_OPTIONS, snapToGround: false })
    expect(layout.placements.map((p) => p.airborne)).toEqual([false, false])
    expect(layout.placements[0].y - layout.placements[1].y).toBe(30)
  })

  it('applies nudges', () => {
    const frames = [cut(character(0, 90)), cut(character(0, 90))].map(metrics)
    const layout = planLayout(frames, DEFAULT_LAYOUT_OPTIONS, [{ dx: 0, dy: 0 }, { dx: 5, dy: -3 }])
    expect(layout.placements[1].x - layout.placements[0].x).toBe(5)
    expect(layout.placements[1].y - layout.placements[0].y).toBe(-3)
  })

  it('handles no frames', () => {
    expect(planLayout([])).toMatchObject({ cellWidth: 0, placements: [] })
  })
})

describe('composeSheet', () => {
  it('packs frames into a grid of equal cells with the feet on the baseline', () => {
    const cutouts = [cut(character(0, 90)), cut(character(20, 70)), cut(character(-5, 95))]
    const layout = planLayout(cutouts.map((c) => measure(c, contentBox(c)!)), { ...DEFAULT_LAYOUT_OPTIONS, airborneThreshold: 1 })
    const sheet = composeSheet(cutouts, layout, 2)
    expect(sheet.width).toBe(layout.cellWidth * 2)
    expect(sheet.height).toBe(layout.cellHeight * 2)
    // The bottom row of body pixels sits just above the baseline in each used cell.
    const cx = Math.floor(layout.cellWidth / 2)
    expect(pixel(sheet, cx, layout.baseline - 1)[3]).toBe(255)
    expect(pixel(sheet, layout.cellWidth + cx, layout.baseline - 1)[3]).toBe(255)
    expect(pixel(sheet, cx, layout.cellHeight + layout.baseline - 1)[3]).toBe(255)
    expect(pixel(sheet, cx, layout.baseline)[3]).toBe(0)
    // The empty fourth cell stays transparent.
    expect(pixel(sheet, layout.cellWidth + cx, layout.cellHeight + layout.baseline - 1)[3]).toBe(0)
  })
})

describe('sliceSheet', () => {
  it('cuts equal cells and trims the grid lines', () => {
    const colors = [RED, DARK, GREEN, { r: 1, g: 2, b: 3 }]
    const sheet = createImage(40, 20)
    colors.forEach((c, i) => rect(sheet, { left: (i % 2) * 20, top: Math.floor(i / 2) * 10, right: (i % 2) * 20 + 20, bottom: Math.floor(i / 2) * 10 + 10 }, c))
    const cells = sliceSheet(sheet, 2, 2, 2)
    expect(cells).toHaveLength(4)
    expect(cells[0]).toMatchObject({ width: 16, height: 6 })
    cells.forEach((cell, i) => expect(pixel(cell, 0, 0).slice(0, 3)).toEqual([colors[i].r, colors[i].g, colors[i].b]))
  })
})

describe('naturalCompare', () => {
  it('sorts numbered files in frame order', () => {
    expect(['frame10.png', 'frame2.png', 'Frame1.png'].sort(naturalCompare)).toEqual(['Frame1.png', 'frame2.png', 'frame10.png'])
  })
})

describe('resize', () => {
  it('scales the size and keeps flat colors', () => {
    const img = filled(10, 8, RED)
    const half = resize(img, 0.5)
    expect(half).toMatchObject({ width: 5, height: 4 })
    expect(pixel(half, 2, 2)).toEqual([200, 30, 30, 255])
    expect(resize(img, 1)).toBe(img)
  })
})
