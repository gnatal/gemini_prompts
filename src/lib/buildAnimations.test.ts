import { describe, expect, it } from 'vitest'
import { ANIMATION_PRESETS, defaultAnimations } from '../config/animations'
import { gridFor, isValidFrameCount } from '../config/assetPresets'
import { cleanAsset, cleanCharacter, cleanStyle } from '../test/fixtures'
import type { AnimationSpec } from '../types'
import { buildAnimationPrompt, buildAnimationSet, validateAnimations } from './buildAnimations'
import { buildPrompt } from './buildPrompt'

const sharedPart = (prompt: string) => prompt.slice(0, prompt.indexOf('[ASSET]'))
const preset = (id: string) => defaultAnimations().find((a) => a.id === id)!

describe('animation presets', () => {
  it('uses the requested frame counts', () => {
    const frames = Object.fromEntries(ANIMATION_PRESETS.map((a) => [a.id, a.frames]))
    expect(frames).toMatchObject({ idle: 4, walk: 8, dash: 12, run: 8, jump: 6 })
  })

  it('has a valid frame count and one pose per frame for every preset', () => {
    for (const a of ANIMATION_PRESETS) {
      expect(isValidFrameCount(a.frames), a.id).toBe(true)
      expect(a.keyPoses, a.id).toHaveLength(a.frames!)
    }
  })

  it('has unique ids', () => {
    expect(new Set(ANIMATION_PRESETS.map((a) => a.id)).size).toBe(ANIMATION_PRESETS.length)
  })
})

describe('buildAnimationPrompt', () => {
  it('turns the asset into an N-frame sprite strip with an N:1 aspect ratio', () => {
    const prompt = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), preset('dash'))
    expect(prompt).toContain('Type: Sprite strip\nFrames: 12, in one horizontal row\n')
    expect(prompt).toContain('Framing: 12 frames in one row, equal spacing, same scale and baseline in every frame')
    expect(prompt).toContain('Aspect ratio: 12:1')
    expect(prompt).toContain(`Action: ${preset('dash').motion}\n`)
  })

  it('keeps the held items, view and exclusions from the form', () => {
    const asset = cleanAsset({ view: 'side-left', heldItems: 'sword in the left hand' })
    const prompt = buildAnimationPrompt(cleanStyle(), cleanCharacter(), asset, preset('walk'))
    expect(prompt).toContain('Held items: sword in the left hand')
    expect(prompt).toContain('View: Side view, facing left')
    expect(prompt).toContain('Exclude: no text, no logos, no watermark, no extra characters')
  })

  it('adds an [ANIMATION] block with one line per frame', () => {
    const walk = preset('walk')
    const prompt = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), walk)
    const block = prompt.slice(prompt.indexOf('[ANIMATION]'))
    expect(block).toMatch(/^\[ANIMATION\]\nAnimation: Walk\nLoop: yes/)
    for (let i = 0; i < 8; i++) expect(block).toContain(`Frame ${i + 1}: ${walk.keyPoses[i]}\n`)
    expect(block).not.toContain('Frame 9:')
    expect(block).toMatch(/Consistency: .+$/)
  })

  it('says when an animation plays once', () => {
    const prompt = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), preset('jump'))
    expect(prompt).toContain('Loop: no, plays once')
  })

  it('leaves the frame poses out when their count no longer matches the frame count', () => {
    const prompt = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), { ...preset('walk'), frames: 6 })
    expect(prompt).toContain('Frames: 6, in one horizontal row')
    expect(prompt).not.toContain('Frame 1:')
  })

  it('includes the character even when the form asset is a background', () => {
    const asset = cleanAsset({ type: 'background', includeCharacter: false })
    const prompt = buildAnimationPrompt(cleanStyle(), cleanCharacter(), asset, preset('idle'))
    expect(prompt).toContain('[CHARACTER]')
    expect(prompt).toContain('Background: solid flat #00FF00')
  })
})

describe('grid layout', () => {
  it('lays the frames out in a near-square grid of square cells', () => {
    expect([2, 4, 6, 8, 12].map((n) => gridFor(n))).toEqual([
      { columns: 2, rows: 1 },
      { columns: 2, rows: 2 },
      { columns: 3, rows: 2 },
      { columns: 4, rows: 2 },
      { columns: 4, rows: 3 },
    ])
    for (let n = 2; n <= 12; n++) {
      const { columns, rows } = gridFor(n)
      expect(columns * rows, `${n} frames`).toBeGreaterThanOrEqual(n)
      expect(columns * (rows - 1), `${n} frames, no empty row`).toBeLessThan(n)
    }
  })

  it('builds a grid sheet prompt with cell positions on every frame', () => {
    const prompt = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), preset('run'), 'grid')
    expect(prompt).toContain('Type: Sprite sheet\nFrames: 8, in a grid of 4 columns and 2 rows, read left to right, top to bottom\n')
    expect(prompt).toContain('Framing: 4 columns by 2 rows of equal square cells')
    expect(prompt).toContain('Aspect ratio: 2:1')
    expect(prompt).toContain('Frame 1 (row 1, column 1): ')
    expect(prompt).toContain('Frame 5 (row 2, column 1): ')
    expect(prompt).toContain('Frame 8 (row 2, column 4): ')
    expect(prompt).toContain('Layout: every cell the same size')
  })

  it('mentions the empty cells when the frames do not fill the grid', () => {
    const prompt = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), { ...preset('jump'), frames: 7 }, 'grid')
    expect(prompt).toContain('4 columns by 2 rows')
    expect(prompt).toContain('the last cell left empty')
  })
})

describe('walk and run cycles', () => {
  for (const id of ['walk', 'run']) {
    it(`${id}: names legs near and far, and swaps them halfway`, () => {
      const spec = preset(id)
      expect(spec.keyPoses.join(' ')).not.toMatch(/\b(left|right)\b/)
      const half = spec.keyPoses.length / 2
      for (let i = 0; i < half; i++) {
        const swapped = spec.keyPoses[i]
          .replace(/\bnear\b/g, '\0')
          .replace(/\bfar\b/g, 'near')
          .replaceAll('\0', 'far')
        expect(spec.keyPoses[i + half].replace(', leading back into frame 1', '')).toBe(swapped)
      }
    })
  }

  it('run: both flight frames lift both feet off the ground', () => {
    const run = preset('run')
    expect(run.keyPoses[3]).toMatch(/both feet clearly off the ground/)
    expect(run.keyPoses[7]).toMatch(/both feet clearly off the ground/)
  })

  it('gives every run and walk frame an arm position', () => {
    for (const pose of [...preset('run').keyPoses, ...preset('walk').keyPoses]) expect(pose).toMatch(/arm/)
  })

  it('explains near and far, and which side is near in a side view', () => {
    const right = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), preset('run'))
    expect(right).toContain(`Limbs: "near" means the arm or leg closer to the camera, "far" the one farther away; near is the character's right side`)
    const left = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset({ view: 'side-left' }), preset('run'))
    expect(left).toContain("near is the character's left side")
    const front = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset({ view: 'front' }), preset('run'))
    expect(front).toMatch(/Limbs: .+farther away\n/)
    expect(buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), preset('idle'))).not.toContain('Limbs:')
  })

  it('asks for clean frames without motion blur', () => {
    expect(buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), preset('dash'))).toContain(
      'Clean frames: no motion blur',
    )
  })
})

describe('buildAnimationSet', () => {
  it('builds only the enabled animations with a valid frame count', () => {
    const specs = defaultAnimations().map((a) =>
      a.id === 'run' ? { ...a, frames: 20 } : a.id === 'walk' ? { ...a, enabled: false } : a,
    )
    const set = buildAnimationSet(cleanStyle(), cleanCharacter(), cleanAsset(), specs)
    const ids = set.map((s) => s.spec.id)
    expect(ids).not.toContain('run')
    expect(ids).not.toContain('walk')
    expect(ids).toEqual(specs.filter((a) => a.enabled && a.id !== 'run').map((a) => a.id))
  })

  it('keeps Style and Character blocks byte-identical to the single prompt', () => {
    const character = { ...cleanCharacter(), hasReferenceImage: true }
    const set = buildAnimationSet(cleanStyle(), character, cleanAsset(), defaultAnimations())
    const single = sharedPart(buildPrompt(cleanStyle(), character, cleanAsset()))
    expect(single).toContain('Use the attached reference image')
    for (const { prompt } of set) expect(sharedPart(prompt)).toBe(single)
  })
})

describe('validateAnimations', () => {
  it('is quiet for the presets', () => {
    expect(validateAnimations(defaultAnimations())).toEqual([])
  })

  it('needs at least one animation turned on', () => {
    const off = defaultAnimations().map((a) => ({ ...a, enabled: false }))
    expect(validateAnimations(off)).toEqual([expect.objectContaining({ field: 'animations' })])
  })

  it('flags an out-of-range frame count on an enabled animation only', () => {
    const custom: AnimationSpec = { id: 'x', name: 'Wall slide', enabled: true, frames: 13, loop: false, motion: '', keyPoses: [] }
    expect(validateAnimations([custom])).toEqual([
      { field: 'animations.x', label: 'Wall slide', message: expect.stringContaining('2 to 12') },
    ])
    expect(validateAnimations([custom, { ...custom, id: 'y', enabled: false, frames: undefined }])).toHaveLength(1)
  })
})
