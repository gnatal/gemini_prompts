import { describe, expect, it } from 'vitest'
import { applyAssetPreset } from '../config/assetPresets'
import { cleanValues } from '../test/fixtures'
import type { FormValues, LintWarning } from '../types'
import { findBlockedName, hasMetaphor, lint } from './lint'

const rules = (warnings: LintWarning[]) => warnings.map((w) => w.rule)
const withValues = (edit: (v: FormValues) => void) => {
  const v = cleanValues()
  edit(v)
  return lint(v)
}

describe('lint', () => {
  it('is quiet on a clean input', () => {
    expect(lint(cleanValues())).toEqual([])
  })

  describe('1. metaphors', () => {
    it.each([
      'a helmet like a fishbowl',
      'looks like a robot',
      'stands as if frozen',
      'resembles a knight',
      'similar to armor',
      'a diamond-shaped visor',
    ])('flags "%s"', (text) => {
      const warnings = withValues((v) => (v.character.head = text))
      expect(warnings).toContainEqual(expect.objectContaining({ rule: 'metaphor', field: 'character.head' }))
    })

    it('does not flag plain geometry or unrelated words', () => {
      expect(hasMetaphor('round helmet, 3 triangular spikes, he likes cats, likely tall')).toBe(false)
    })

    it('points at the exact palette and tag fields', () => {
      const warnings = withValues((v) => {
        v.style.palette[1].usage = 'bodysuit that looks like silk'
        v.character.signatureDetails[2] = 'star-shaped buckle'
      })
      expect(warnings.map((w) => w.field)).toEqual(['style.palette.1.usage', 'character.signatureDetails.2'])
    })
  })

  describe('2. existing IP', () => {
    it('flags blocklisted names, ignoring case and accents', () => {
      const warnings = withValues((v) => (v.character.proportions = 'proportions of mega man'))
      expect(warnings).toContainEqual(expect.objectContaining({ rule: 'existing-ip', field: 'character.proportions' }))
      expect(findBlockedName('a Pokémon trainer')).toBe('Pokemon')
    })

    it('only matches whole words', () => {
      expect(findBlockedName('a sonically loud sonic-boom')).toBe('Sonic') // "sonic-boom" contains the word
      expect(findBlockedName('marionette strings')).toBeNull()
    })

    it('uses a custom blocklist', () => {
      const v = cleanValues()
      v.asset.action = 'dancing the Zorblax shuffle'
      expect(rules(lint(v, { blocklist: ['Zorblax'] }))).toEqual(['existing-ip'])
    })
  })

  describe('3. signature details', () => {
    it('warns with fewer than 2', () => {
      const warnings = withValues((v) => (v.character.signatureDetails = ['red scarf']))
      expect(warnings).toEqual([expect.objectContaining({ rule: 'signature-details', field: 'character.signatureDetails' })])
    })

    it('is quiet when the character is not included', () => {
      const warnings = withValues((v) => {
        v.character.signatureDetails = []
        v.asset = applyAssetPreset({ ...v.asset, subject: 'a brass revolver' }, 'item-icon')
      })
      expect(warnings).toEqual([])
    })
  })

  describe('4. palette size', () => {
    it('warns with fewer than 3 colors', () => {
      const warnings = withValues((v) => v.style.palette.splice(2))
      expect(warnings).toEqual([expect.objectContaining({ rule: 'palette-size', field: 'style.palette' })])
    })

    it('warns with more than 6 colors', () => {
      const warnings = withValues((v) => {
        for (let i = 0; i < 4; i++) v.style.palette.push({ name: '', hex: '#101010', usage: '' })
      })
      expect(rules(warnings)).toEqual(['palette-size'])
    })
  })

  describe('5. chroma key clash', () => {
    it('warns when the background is close to a palette color and suggests magenta', () => {
      const warnings = withValues((v) => v.style.palette.push({ name: 'Leaf green', hex: '#22EE22', usage: 'cactus' }))
      expect(warnings).toEqual([expect.objectContaining({ rule: 'chroma-clash', field: 'asset.backgroundColor' })])
      expect(warnings[0].message).toContain('#FF00FF')
    })

    it('is quiet for colors further than 100 away', () => {
      expect(withValues((v) => v.style.palette.push({ name: '', hex: '#009000', usage: '' }))).toEqual([])
    })

    it('is quiet for scene types that have no background color', () => {
      const warnings = withValues((v) => {
        v.style.palette.push({ name: '', hex: '#00FF00', usage: '' })
        v.asset = applyAssetPreset({ ...v.asset, subject: 'grass' }, 'tile')
      })
      expect(warnings).toEqual([])
    })
  })

  describe('6. missing "no text"', () => {
    it('warns when no exclusion mentions text', () => {
      const warnings = withValues((v) => (v.asset.exclusions = ['no logos']))
      expect(warnings).toEqual([expect.objectContaining({ rule: 'missing-no-text', field: 'asset.exclusions' })])
    })
  })

  describe('7. ambiguous hands', () => {
    it('hints when held items name no hand', () => {
      const warnings = withValues((v) => (v.asset.heldItems = 'a revolver'))
      expect(warnings).toEqual([expect.objectContaining({ rule: 'ambiguous-hands', field: 'asset.heldItems' })])
    })

    it('is quiet when a hand is named', () => {
      expect(withValues((v) => (v.asset.heldItems = 'sword in the LEFT hand'))).toEqual([])
    })
  })
})
