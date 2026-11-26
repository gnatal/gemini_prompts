import { describe, expect, it } from 'vitest'
import { buildPrompt } from '../lib/buildPrompt'
import { isValidHex } from '../lib/color'
import { lint } from '../lib/lint'
import { cleanAsset, cleanCharacter, cleanStyle } from '../test/fixtures'
import { validateForm } from '../schemas'
import { applyGenre, GENRES, hasGenreFields } from './genres'
import { defaultStyle } from './defaults'
import { FIELD_HELP } from './fieldHelp'

describe('genre presets', () => {
  it('have unique ids and labels', () => {
    expect(new Set(GENRES.map((g) => g.id)).size).toBe(GENRES.length)
    expect(new Set(GENRES.map((g) => g.label)).size).toBe(GENRES.length)
  })

  it.each(GENRES.map((g) => [g.label, g] as const))('%s produces a clean, copyable prompt', (_label, genre) => {
    expect(genre.palette.length).toBeGreaterThanOrEqual(3)
    expect(genre.palette.length).toBeLessThanOrEqual(6)
    for (const color of genre.palette) expect(isValidHex(color.hex)).toBe(true)

    const values = { style: applyGenre(cleanStyle(), genre), character: cleanCharacter(), asset: cleanAsset() }
    // No metaphors, franchise names, palette size or green chroma key clashes.
    expect(lint(values)).toEqual([])
    expect(validateForm(values)).toEqual([])
    expect(buildPrompt(values.style, values.character, values.asset)).toContain(`Setting: ${genre.setting}`)
  })

  it('keeps the art style and an existing name, and names an unnamed style', () => {
    const genre = GENRES[0]
    const style = { ...cleanStyle(), artStyle: 'low-poly-3d' as const }
    expect(applyGenre(style, genre)).toMatchObject({ artStyle: 'low-poly-3d', name: 'Main game style' })
    expect(applyGenre(defaultStyle(), genre).name).toBe(genre.label)
  })

  it('copies the palette instead of sharing it', () => {
    const style = applyGenre(defaultStyle(), GENRES[0])
    style.palette[0].name = 'changed'
    expect(GENRES[0].palette[0].name).not.toBe('changed')
  })

  it('only asks before overwriting when the style has content', () => {
    expect(hasGenreFields(defaultStyle())).toBe(false)
    expect(hasGenreFields(cleanStyle())).toBe(true)
  })
})

describe('field help', () => {
  it('has no franchise names or metaphors in its examples', () => {
    for (const help of Object.values(FIELD_HELP)) {
      expect(help.text.trim()).not.toBe('')
      const values = {
        style: { ...cleanStyle(), setting: (help.examples ?? []).join('; ') },
        character: cleanCharacter(),
        asset: cleanAsset(),
      }
      expect(lint(values).filter((w) => w.field === 'style.setting')).toEqual([])
    }
  })
})
