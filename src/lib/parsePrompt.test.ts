import { describe, expect, it } from 'vitest'
import { applyAssetPreset, syncFrameLayout } from '../config/assetPresets'
import { defaultFormValues } from '../config/defaults'
import { cleanAsset, cleanCharacter, cleanStyle, cleanValues } from '../test/fixtures'
import type { FormValues } from '../types'
import { buildAnimationPrompt } from './buildAnimations'
import { joinBatch } from './buildBatch'
import { buildPrompt } from './buildPrompt'
import { parsePalette, parsePrompt } from './parsePrompt'
import { defaultAnimations } from '../config/animations'

const build = (v: FormValues) => buildPrompt(v.style, v.character, v.asset)

/** Builds a prompt, reads it into an empty form, and builds again. */
function roundTrip(values: FormValues) {
  const text = build(values)
  const result = parsePrompt(text, defaultFormValues())
  return { text, result, rebuilt: build(result.values) }
}

const PIRATE = `[STYLE]
Art style: 2D cel-shaded
Setting: Golden Age of piracy in the Caribbean: wooden galleons, tropical islands, treasure chests, tricorn hats, cutlasses
Palette: Ocean teal #1F6F78 (sea, sashes); Sail canvas #E6D8B5 (sails, shirts); Ship wood #7A4E2D (hulls, barrels, boots); Treasure gold #E1B53A (coins, buttons, earrings); Coat red #A3262A (coats, bandanas)
Lines and shading: bold dark outlines, 2-tone shading, warm sunny highlights

[CHARACTER]
Name: Dread pirate Robert
Proportions: 1 head, 2 arms, 2 legs and a torso all average
Head: a pirate head, an eye patch and a black beard
Torso: a blouse with a leather jacked with a sheath for a sword on the left side of the waist line, and a gun in the right side.
Arms and hands: in the right hand a golden right in the index finger and a silver ring in the pink finder. 
in the left hand a copper ring in the thumb, the arms should just have the blouse continuation
Legs and feet: Brown leather boots, a leather pants.
Signature details: a perl collar; 2 wrist bands one on each arm with the follow words: "luck" and "treasure"; a red waistband

[ASSET]
Type: Sprite strip
Frames: 8, in one horizontal row
Action: running fast, torso leaning forward, arms pumping
Held items: a pistol in the right hand and a knife in the left hand
View: Front view
Framing: 8 frames in one row, equal spacing, same scale and baseline in every frame
Background: solid flat #00FF00, no shadows or texture
Lighting: cold moonlight from above, soft shadows
Aspect ratio: 8:1
Exclude: no text, no logos, no watermark, no extra characters

[ANIMATION]
Animation: Run
Loop: yes, the last frame leads smoothly back into the first
Frame 1: contact: right foot lands under the body, left leg trailing behind
Consistency: identical character design, size, colors and lighting in every frame; only the pose changes`

describe('parsePrompt', () => {
  it('round-trips a full prompt to the exact same text', () => {
    const values = cleanValues()
    values.style.setting = 'near-future megacity at night: neon signs, rain'
    values.character.hasReferenceImage = true
    const { text, result, rebuilt } = roundTrip(values)
    expect(result.filled).toEqual(['Style', 'Character', 'Asset'])
    expect(result.notes).toEqual([])
    expect(rebuilt).toBe(text)
    expect(result.values.character).toEqual(values.character)
  })

  it('round-trips sprite strips, grid sheets, custom ratios and custom art styles', () => {
    const strip = { ...cleanValues(), asset: applyAssetPreset(cleanAsset({ frameCount: 8 }), 'sprite-strip') }
    expect(roundTrip(strip).rebuilt).toBe(roundTrip(strip).text)

    const grid = { ...strip, asset: syncFrameLayout(strip.asset, 'grid') }
    const g = roundTrip(grid)
    expect(g.text).toContain('Type: Sprite sheet')
    expect(g.result.values.asset).toMatchObject({ type: 'sprite-strip', frameCount: 8, frameLayout: 'grid', customAspectRatio: '2:1' })
    expect(g.rebuilt).toBe(g.text)

    const custom = { ...cleanValues(), style: { ...cleanStyle(), artStyle: 'custom' as const, customStyle: 'watercolor storybook' } }
    expect(roundTrip(custom).result.values.style).toMatchObject({ artStyle: 'custom', customStyle: 'watercolor storybook' })
    expect(roundTrip(custom).rebuilt).toBe(roundTrip(custom).text)
  })

  it('round-trips a prompt without the character, and turns the character off', () => {
    const values = { ...cleanValues(), asset: { ...applyAssetPreset(cleanAsset(), 'background'), subject: 'desert canyon at dusk' } }
    const { text, result, rebuilt } = roundTrip(values)
    expect(result.filled).toEqual(['Style', 'Asset'])
    expect(result.values.asset).toMatchObject({ type: 'background', includeCharacter: false, subject: 'desert canyon at dusk' })
    expect(rebuilt).toBe(text)
  })

  it('reads the pirate prompt, joining a value that runs onto the next line', () => {
    const { values, filled, notes } = parsePrompt(PIRATE, defaultFormValues())
    expect(filled).toEqual(['Style', 'Character', 'Asset'])
    expect(values.style.artStyle).toBe('cel-shaded-2d')
    expect(values.style.setting).toMatch(/^Golden Age of piracy in the Caribbean: wooden galleons/)
    expect(values.style.palette).toHaveLength(5)
    expect(values.style.palette[3]).toEqual({ name: 'Treasure gold', hex: '#E1B53A', usage: 'coins, buttons, earrings' })
    expect(values.character.name).toBe('Dread pirate Robert')
    expect(values.character.armsAndHands).toBe(
      'in the right hand a golden right in the index finger and a silver ring in the pink finder. in the left hand a copper ring in the thumb, the arms should just have the blouse continuation',
    )
    expect(values.character.signatureDetails).toEqual([
      'a perl collar',
      '2 wrist bands one on each arm with the follow words: "luck" and "treasure"',
      'a red waistband',
    ])
    expect(values.asset).toMatchObject({
      type: 'sprite-strip',
      frameCount: 8,
      frameLayout: 'row',
      view: 'front',
      backgroundColor: '#00FF00',
      lighting: 'cold moonlight from above, soft shadows',
      aspectRatio: 'custom',
      customAspectRatio: '8:1',
      exclusions: ['no text', 'no logos', 'no watermark', 'no extra characters'],
    })
    expect(notes).toEqual([expect.stringContaining('[ANIMATION]')])
  })

  it('fills only the blocks in the text and keeps the rest', () => {
    const current = cleanValues()
    const { values, filled } = parsePrompt('[ASSET]\nAction: waving\nView: Front view', current)
    expect(filled).toEqual(['Asset'])
    expect(values.style).toEqual(current.style)
    expect(values.character).toEqual(current.character)
    expect(values.asset).toMatchObject({ action: 'waving', view: 'front', includeCharacter: true })
  })

  it('keeps the style name, which is not part of the prompt', () => {
    const current = { ...cleanValues(), style: { ...cleanStyle(), name: 'My style' } }
    expect(parsePrompt('Art style: Low-poly 3D', current).values.style.name).toBe('My style')
  })

  it('works without block headers and is case-insensitive about labels', () => {
    const { values, filled } = parsePrompt('name: Mira\nPROPORTIONS: 3 heads tall\naction: casting a spell', defaultFormValues())
    expect(filled).toEqual(['Character', 'Asset'])
    expect(values.character).toMatchObject({ name: 'Mira', proportions: '3 heads tall' })
    expect(values.asset.action).toBe('casting a spell')
  })

  it('uses the first prompt of a batch and says so', () => {
    const v = cleanValues()
    const text = joinBatch([build(v), build({ ...v, asset: { ...v.asset, action: 'jumping' } })])
    const { values, notes } = parsePrompt(text, defaultFormValues())
    expect(values.asset.action).toBe('running')
    expect(notes[0]).toMatch(/first one/)
  })

  it('reads an animation prompt and skips its [ANIMATION] block', () => {
    const run = defaultAnimations().find((a) => a.id === 'run')!
    const text = buildAnimationPrompt(cleanStyle(), cleanCharacter(), cleanAsset(), run, 'grid')
    const { values, notes } = parsePrompt(text, defaultFormValues())
    expect(values.asset).toMatchObject({ frameCount: 8, frameLayout: 'grid', action: run.motion })
    expect(notes).toEqual([expect.stringContaining('[ANIMATION]')])
  })

  it('reports lines it does not recognize and unknown values', () => {
    const { notes, values } = parsePrompt('Here is my prompt\nAction: idle\nView: from below', defaultFormValues())
    expect(values.asset.action).toBe('idle')
    expect(notes).toEqual([expect.stringContaining('Unknown view'), expect.stringContaining('“Here is my prompt”')])
  })

  it('finds nothing in unrelated text', () => {
    expect(parsePrompt('just some notes', defaultFormValues()).filled).toEqual([])
  })
})

describe('parsePalette', () => {
  it('reads names, hex values and usage, each optional', () => {
    expect(parsePalette('Royal blue #1e4fd8 (helmet, boots); #FFF; Rust red')).toEqual([
      { name: 'Royal blue', hex: '#1E4FD8', usage: 'helmet, boots' },
      { name: '', hex: '#FFF', usage: '' },
      { name: 'Rust red', hex: '', usage: '' },
    ])
  })
})
