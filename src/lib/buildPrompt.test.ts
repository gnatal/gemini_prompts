import { describe, expect, it } from 'vitest'
import { applyAssetPreset } from '../config/assetPresets'
import { cleanAsset, cleanCharacter, cleanStyle } from '../test/fixtures'
import { buildPrompt, REFERENCE_IMAGE_LINE } from './buildPrompt'

describe('buildPrompt', () => {
  it('builds the full prompt in a stable field order', () => {
    expect(buildPrompt(cleanStyle(), cleanCharacter(), cleanAsset())).toMatchSnapshot()
  })

  it('matches the documented example format', () => {
    const prompt = buildPrompt(cleanStyle(), cleanCharacter(), cleanAsset())
    expect(prompt).toContain('Art style: Pixel art, 64x64 sprite resolution')
    expect(prompt).toContain(
      'Palette: Royal blue #1E4FD8 (helmet, boots); Sky blue #7EC8F2 (bodysuit); Brass #C9A13B (buckle, spurs)',
    )
    expect(prompt).toContain('View: Side view, facing right')
    expect(prompt).toContain('Background: solid flat #00FF00, no shadows or texture')
    expect(prompt).toContain('Exclude: no text, no logos, no watermark, no extra characters')
  })

  it('omits empty fields', () => {
    const character = { ...cleanCharacter(), head: '', torso: '   ', signatureDetails: ['', ' '] }
    const style = { ...cleanStyle(), linesAndShading: '' }
    const prompt = buildPrompt(style, character, cleanAsset({ heldItems: '', lighting: '', exclusions: [] }))
    for (const label of ['Head:', 'Torso:', 'Signature details:', 'Lines and shading:', 'Held items:', 'Lighting:', 'Exclude:']) {
      expect(prompt).not.toContain(label)
    }
    expect(prompt).toContain('Arms and hands: dark blue fingerless gloves')
  })

  it('omits the character block when includeCharacter is false', () => {
    const asset = applyAssetPreset(cleanAsset({ subject: 'a brass revolver', action: '' }), 'item-icon')
    const prompt = buildPrompt(cleanStyle(), { ...cleanCharacter(), hasReferenceImage: true }, asset)
    expect(prompt).not.toContain('[CHARACTER]')
    expect(prompt).not.toContain('Rex Ranger')
    expect(prompt).not.toContain(REFERENCE_IMAGE_LINE)
    expect(prompt).not.toContain('Held items')
    expect(prompt).toContain('Subject: a brass revolver')
  })

  it('omits the character block when no character is given', () => {
    expect(buildPrompt(cleanStyle(), null, cleanAsset())).not.toContain('[CHARACTER]')
  })

  it('starts with the reference image line when the character has one', () => {
    const prompt = buildPrompt(cleanStyle(), { ...cleanCharacter(), hasReferenceImage: true }, cleanAsset())
    expect(prompt.startsWith(`${REFERENCE_IMAGE_LINE}\n\n[STYLE]`)).toBe(true)
  })

  it('formats sprite strip frames and aspect ratio', () => {
    const asset = applyAssetPreset(cleanAsset({ frameCount: 8 }), 'sprite-strip')
    const prompt = buildPrompt(cleanStyle(), cleanCharacter(), asset)
    expect(prompt).toContain('Type: Sprite strip\nFrames: 8, in one horizontal row\nAction: running')
    expect(prompt).toContain('Framing: 8 frames in one row, equal spacing, same scale and baseline in every frame')
    expect(prompt).toContain('Aspect ratio: 8:1')
  })

  it('does not add a Frames line for other types', () => {
    expect(buildPrompt(cleanStyle(), cleanCharacter(), cleanAsset({ frameCount: 4 }))).not.toContain('Frames:')
  })

  it('uses the custom aspect ratio and custom art style', () => {
    const style = { ...cleanStyle(), artStyle: 'custom' as const, customStyle: 'flat vector art' }
    const prompt = buildPrompt(style, cleanCharacter(), cleanAsset({ aspectRatio: 'custom', customAspectRatio: '3:2' }))
    expect(prompt).toContain('Art style: flat vector art\n')
    expect(prompt).toContain('Aspect ratio: 3:2')
  })

  it('leaves the background line out for scenes and tiles', () => {
    const asset = applyAssetPreset(cleanAsset({ subject: 'desert canyon at dusk' }), 'background')
    const prompt = buildPrompt(cleanStyle(), cleanCharacter(), asset)
    expect(prompt).not.toContain('Background:')
    expect(prompt).toContain('Aspect ratio: 16:9')
  })

  it('normalizes hex colors', () => {
    const style = { ...cleanStyle(), palette: [{ name: 'Red', hex: 'f00', usage: '' }] }
    expect(buildPrompt(style, null, cleanAsset())).toContain('Palette: Red #FF0000\n')
  })
})
