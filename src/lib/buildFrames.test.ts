import { describe, expect, it } from 'vitest'
import { defaultAnimations } from '../config/animations'
import { cleanAsset, cleanCharacter, cleanStyle } from '../test/fixtures'
import type { AnimationSpec } from '../types'
import { buildPrompt } from './buildPrompt'
import {
  buildFramePrompts,
  buildFrameSet,
  FRAME_FRAMING,
  mirrorSources,
  swapNearFar,
  validateFrameMode,
} from './buildFrames'
import { parsePrompt } from './parsePrompt'
import { defaultFormValues } from '../config/defaults'

const preset = (id: string) => defaultAnimations().find((a) => a.id === id)!
const frames = (id: string, character = cleanCharacter()) =>
  buildFramePrompts(cleanStyle(), character, cleanAsset({ heldItems: 'a pistol in the right hand' }), preset(id))

describe('swapNearFar', () => {
  it('swaps every near and far, keeping capitals', () => {
    expect(swapNearFar('Near heel down, far leg behind; near arm back')).toBe('Far heel down, near leg behind; far arm back')
  })
})

describe('mirrorSources', () => {
  it('maps the second half of the walk and run cycles onto the first half', () => {
    for (const id of ['walk', 'run']) expect(mirrorSources(preset(id).keyPoses)).toEqual([null, null, null, null, 0, 1, 2, 3])
  })

  it('finds nothing in animations without near and far', () => {
    expect(mirrorSources(preset('dash').keyPoses).every((s) => s === null)).toBe(true)
    expect(mirrorSources(preset('idle').keyPoses).every((s) => s === null)).toBe(true)
  })

  it('needs an even number of frames', () => {
    expect(mirrorSources(['near up', 'far up', 'near down'])).toEqual([null, null, null])
  })
})

describe('buildFramePrompts', () => {
  it('makes one single-sprite prompt per pose', () => {
    const run = frames('run')
    expect(run).toHaveLength(8)
    for (const [i, f] of run.entries()) {
      expect(f.prompt).toContain('Type: Sprite\n')
      expect(f.prompt).not.toContain('Frames:')
      expect(f.prompt).toContain('Aspect ratio: 1:1')
      expect(f.prompt).toContain(`Action: ${preset('run').keyPoses[i]}\n`)
      expect(f.prompt).toContain(`Animation: Run, frame ${i + 1} of 8, part of a looping cycle`)
      expect(f.prompt).toContain('Single pose: exactly one character in one pose, not a sprite sheet')
    }
  })

  it('uses the same fixed framing in every frame', () => {
    for (const f of frames('dash')) expect(f.prompt).toContain(`Framing: ${FRAME_FRAMING}\n`)
  })

  it('tells the second half to copy the matching first-half frame with the other leg leading', () => {
    const run = frames('run')
    expect(run.map((f) => f.basedOn)).toEqual([null, null, null, null, 0, 1, 2, 3])
    expect(run[4].prompt).toContain('Based on: frame 1. Attach your approved frame 1 as a second reference image')
    expect(run[0].prompt).not.toContain('Based on:')
  })

  it('keeps the view, limbs and props locks', () => {
    const [first] = frames('walk')
    expect(first.prompt).toContain('View lock: side view, facing right, exactly as in the other frames; the character never turns toward the camera')
    expect(first.prompt).toContain('Limbs: "near" means')
    expect(first.prompt).toContain('Props: a pistol in the right hand, in every frame')
  })

  it('drops the sheet-only clause about cycle halves from the motion', () => {
    const [first] = frames('run')
    expect(first.prompt).toContain('Motion: running fast, torso leaning forward, arms pumping hard opposite to the legs\n')
    expect(first.prompt).not.toMatch(/second half/)
  })

  it('points at the reference image when the character has one', () => {
    const [first] = frames('idle', { ...cleanCharacter(), hasReferenceImage: true })
    expect(first.prompt.startsWith('Use the attached reference image')).toBe(true)
    expect(first.prompt).toContain('same scale and position as the reference image')
    expect(first.prompt).toContain('Consistency: identical character design, size, colors and lighting to the reference image')
  })

  it('keeps the Style and Character blocks identical to the single prompt', () => {
    const shared = (p: string) => p.slice(0, p.indexOf('[ASSET]'))
    const single = shared(buildPrompt(cleanStyle(), cleanCharacter(), cleanAsset()))
    for (const f of frames('jump')) expect(shared(f.prompt)).toBe(single)
  })

  it('can be read back by Fill from prompt, skipping the [FRAME] block', () => {
    const [first] = frames('run')
    const { values, notes } = parsePrompt(first.prompt, defaultFormValues())
    expect(values.asset.action).toBe(preset('run').keyPoses[0])
    expect(notes).toEqual([expect.stringContaining('[FRAME]')])
  })

  it('is empty when the poses do not match the frame count', () => {
    expect(buildFramePrompts(cleanStyle(), cleanCharacter(), cleanAsset(), { ...preset('run'), frames: 6 })).toEqual([])
  })
})

describe('buildFrameSet and validateFrameMode', () => {
  const custom: AnimationSpec = { id: 'x', name: 'Wall slide', enabled: true, frames: 4, loop: true, motion: '', keyPoses: [] }

  it('builds every enabled animation that has its poses', () => {
    const specs = [...defaultAnimations(), custom]
    const set = buildFrameSet(cleanStyle(), cleanCharacter(), cleanAsset(), specs)
    expect(set.map((a) => a.spec.id)).toEqual(specs.filter((a) => a.enabled && a.id !== 'x').map((a) => a.id))
    expect(set.find((a) => a.spec.id === 'walk')?.frames).toHaveLength(8)
  })

  it('blocks animations that have no pose per frame', () => {
    expect(validateFrameMode(defaultAnimations())).toEqual([])
    expect(validateFrameMode([custom])).toEqual([
      { field: 'animations.x', label: 'Wall slide', message: expect.stringContaining('write 4 frame poses') },
    ])
    expect(validateFrameMode([{ ...custom, enabled: false }])).toEqual([])
  })
})
