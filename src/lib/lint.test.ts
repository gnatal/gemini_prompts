import { describe, expect, it } from 'vitest'
import { applyAssetPreset } from '../config/assetPresets'
import { defaultFormValues } from '../config/defaults'
import { GENRES } from '../config/genres'
import { cleanValues } from '../test/fixtures'
import type { FormValues, LintWarning } from '../types'
import { asksForText, findBlockedName, hasMetaphor, lint } from './lint'
import { parsePrompt } from './parsePrompt'

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

describe('8. palette name vs hex', () => {
  it('flags a name whose hex is a different color, and says which color it is', () => {
    const warnings = withValues((v) => {
      v.style.palette[0] = { name: 'Indigo', hex: '#D2452D', usage: 'kimono' }
      v.style.palette[1] = { name: 'Torii red', hex: '#264478', usage: 'gates' }
    })
    expect(warnings.filter((w) => w.rule === 'palette-name-mismatch')).toEqual([
      expect.objectContaining({ field: 'style.palette.0.name', message: expect.stringContaining('#D2452D is red') }),
      expect.objectContaining({ field: 'style.palette.1.name', message: expect.stringContaining('#264478 is blue') }),
    ])
  })

  it('is quiet when the name has no color word or the hex is gray', () => {
    const warnings = withValues((v) => {
      v.style.palette[0] = { name: 'Ship wood', hex: '#7A4E2D', usage: '' }
      v.style.palette[1] = { name: 'Blue steel', hex: '#808080', usage: '' }
    })
    expect(rules(warnings)).not.toContain('palette-name-mismatch')
  })

  it('is quiet for every genre preset palette', () => {
    for (const genre of GENRES) {
      const warnings = withValues((v) => (v.style.palette = genre.palette))
      expect(rules(warnings), genre.id).not.toContain('palette-name-mismatch')
    }
  })
})

describe('9. text while excluding text', () => {
  it.each([
    ['character.signatureDetails.0', (v: FormValues) => (v.character.signatureDetails[0] = 'wristband with the word "luck"')],
    ['character.legsAndFeet', (v: FormValues) => (v.character.legsAndFeet = 'hakama with a phrase in kanji')],
    ['asset.heldItems', (v: FormValues) => (v.asset.heldItems = 'a sign that reads “closed” in the right hand')],
  ])('flags %s', (field, edit) => {
    expect(withValues(edit)).toContainEqual(expect.objectContaining({ rule: 'text-conflict', field }))
  })

  it('is quiet when "no text" is not excluded', () => {
    const warnings = withValues((v) => {
      v.character.signatureDetails[0] = 'wristband with the word "luck"'
      v.asset.exclusions = ['no logos']
    })
    expect(rules(warnings)).not.toContain('text-conflict')
  })

  it('does not count apostrophes or ordinary words as text', () => {
    expect(asksForText("the ranger's star badge, textured leather")).toBe(false)
  })
})

describe('10 and 11. lighting', () => {
  it('flags mood lighting on a sprite', () => {
    const warnings = withValues((v) => (v.asset.lighting = 'cold moonlight from above, soft shadows'))
    expect(warnings).toContainEqual(expect.objectContaining({ rule: 'sprite-lighting', field: 'asset.lighting' }))
  })

  it('allows mood lighting on a background', () => {
    const warnings = withValues((v) => {
      Object.assign(v.asset, applyAssetPreset(v.asset, 'background'), { subject: 'harbor at night' })
      v.asset.lighting = 'cold moonlight from above'
    })
    expect(rules(warnings)).not.toContain('sprite-lighting')
  })

  it('flags warm shading against cold lighting, once', () => {
    const warnings = withValues((v) => {
      Object.assign(v.asset, applyAssetPreset(v.asset, 'background'), { subject: 'harbor' })
      v.style.linesAndShading = 'bold outlines, warm sunny highlights'
      v.asset.lighting = 'cold light from above'
    })
    expect(rules(warnings).filter((r) => r === 'lighting-conflict')).toHaveLength(1)
  })

  it('leaves a deliberate warm and cold split in one field alone', () => {
    const warnings = withValues((v) => (v.style.linesAndShading = 'warm highlights, cold shadows'))
    expect(rules(warnings)).not.toContain('lighting-conflict')
  })
})

describe('12. the same gear held and worn', () => {
  it('flags a gun in the outfit when a pistol is held', () => {
    const warnings = withValues((v) => {
      v.character.torso = 'leather jacket, a gun on the right side of the waist'
      v.asset.heldItems = 'a pistol in the right hand'
    })
    expect(warnings).toContainEqual(
      expect.objectContaining({ rule: 'duplicate-gear', field: 'character.torso', message: expect.stringContaining('a gun') }),
    )
  })

  it('accepts an empty holster or scabbard', () => {
    const warnings = withValues((v) => {
      v.character.torso = 'empty holster on the right hip; empty scabbard on the left hip'
      v.asset.heldItems = 'a pistol in the right hand, a sword in the left hand'
    })
    expect(rules(warnings)).not.toContain('duplicate-gear')
  })

  it('is quiet when held and worn gear are different kinds', () => {
    const warnings = withValues((v) => {
      v.character.torso = 'sword scabbard on the left hip'
      v.asset.heldItems = 'a lantern in the right hand'
    })
    expect(rules(warnings)).not.toContain('duplicate-gear')
  })
})

describe('13. proportions in heads', () => {
  it.each(['1 head, average torso', '1head, long legs, broad shoulders', 'average build'])('flags "%s"', (text) => {
    expect(rules(withValues((v) => (v.character.proportions = text)))).toContain('proportions-heads')
  })

  it.each(['3 heads tall, chunky', 'seven heads tall', '2.5 heads tall, chibi', 'four and a half heads high'])(
    'accepts "%s"',
    (text) => {
      expect(rules(withValues((v) => (v.character.proportions = text)))).not.toContain('proportions-heads')
    },
  )
})

describe('prompts that went wrong in testing', () => {
  const lintPrompt = (text: string) => rules(lint(parsePrompt(text, defaultFormValues()).values))

  it('catches the pirate run prompt problems', () => {
    const found = lintPrompt(`[STYLE]
Art style: 2D hand-painted
Palette: Ocean teal #1F6F78 (sea, sashes); Sail canvas #E6D8B5 (sails, shirts); Ship wood #7A4E2D (hulls, barrels, boots); Treasure gold #E1B53A (coins, buttons, earrings); Coat red #A3262A (coats, bandanas)
Lines and shading: bold dark outlines, 2-tone shading, warm sunny highlights

[CHARACTER]
Name: Dread pirate Robert
Proportions: 1 head, 2 arms, 2 legs and a torso all average
Head: a pirate head, an eye patch and a black beard
Torso: a blouse with a leather jacked with a sheath for a sword on the left side of the waist line, and a gun in the right side.
Legs and feet: Brown leather boots, a leather pants.
Signature details: a perl collar; 2 wrist bands one on each arm with the follow words: "luck" and "treasure"; a red waistband

[ASSET]
Type: Sprite sheet
Frames: 8, in a grid of 4 columns and 2 rows
Action: running fast
Held items: a pistol in the right hand and a knife in the left hand
View: Side view, facing right
Background: solid flat #00FF00, no shadows or texture
Lighting: cold moonlight from above, soft shadows
Exclude: no text, no logos, no watermark, no extra characters`)
    expect(found).toEqual(expect.arrayContaining(['proportions-heads', 'text-conflict', 'sprite-lighting', 'duplicate-gear']))
    expect(found.filter((r) => r === 'duplicate-gear')).toHaveLength(2) // the gun and the sword
  })

  it('catches the samurai prompt problems', () => {
    const found = lintPrompt(`[STYLE]
Art style: Pixel art, 64x64 sprite resolution
Palette: Indigo #D2452D (kimono, cloth); Torii red #264478 (gates, accents); Sakura pink #F4B6C2 (blossoms, highlights); Charcoal #2B2B2B (hair, lacquered armor); Washi cream #F2E8D5 (paper walls, sky)
Lines and shading: bold dark outlines, flat color areas with minimal shading, wave patterns on fabric

[CHARACTER]
Name: shinichiro wannabe
Proportions: 1head, long legs, broad shoulders
Legs and feet: Samurai sandals and skirts with a Japanese phrase: "pound like water" in kanji.

[ASSET]
Type: Sprite
Action: standing upright
Held items: right hand wristband
Lighting: cold moonlight from above, soft shadows
Exclude: no text, no logos, no watermark, no extra characters`)
    expect(found.filter((r) => r === 'palette-name-mismatch')).toHaveLength(2)
    expect(found).toEqual(expect.arrayContaining(['proportions-heads', 'text-conflict', 'sprite-lighting']))
  })
})
