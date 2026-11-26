import { describe, expect, it } from 'vitest'
import { cleanAsset, cleanCharacter, cleanStyle } from '../test/fixtures'
import { buildBatch, joinBatch, parseActions } from './buildBatch'
import { buildPrompt } from './buildPrompt'

/** Everything before [ASSET]: reference line, Style and Character blocks. */
const sharedPart = (prompt: string) => prompt.slice(0, prompt.indexOf('[ASSET]'))

describe('buildBatch', () => {
  const actions = ['idle', 'run', 'jump', 'shoot', 'hurt']

  it('produces one prompt per action', () => {
    const prompts = buildBatch(cleanStyle(), cleanCharacter(), cleanAsset(), actions)
    expect(prompts).toHaveLength(5)
    prompts.forEach((p, i) => expect(p).toContain(`Action: ${actions[i]}\n`))
  })

  it('keeps Style and Character blocks byte-identical across all prompts', () => {
    const character = { ...cleanCharacter(), hasReferenceImage: true }
    const prompts = buildBatch(cleanStyle(), character, cleanAsset(), actions)
    const first = sharedPart(prompts[0])
    expect(first).toContain('[STYLE]')
    expect(first).toContain('[CHARACTER]')
    for (const p of prompts) expect(sharedPart(p)).toBe(first)
    // ...and identical to the single-prompt output
    expect(first).toBe(sharedPart(buildPrompt(cleanStyle(), character, cleanAsset())))
  })

  it('skips blank actions', () => {
    expect(buildBatch(cleanStyle(), cleanCharacter(), cleanAsset(), ['idle', '  ', ''])).toHaveLength(1)
  })

  it('parses one action per line and joins prompts with a --- line', () => {
    expect(parseActions('idle\n\n  run  \r\njump\n')).toEqual(['idle', 'run', 'jump'])
    expect(joinBatch(['a', 'b'])).toBe('a\n\n---\n\nb')
  })
})
