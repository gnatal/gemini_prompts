import { describe, expect, it } from 'vitest'
import { applyAssetPreset } from './config/assetPresets'
import { validateForm } from './schemas'
import { cleanValues } from './test/fixtures'
import type { FormValues } from './types'

const fieldsOf = (edit: (v: FormValues) => void) => {
  const v = cleanValues()
  edit(v)
  return validateForm(v).map((i) => i.field)
}

describe('validateForm', () => {
  it('accepts a complete form', () => {
    expect(validateForm(cleanValues())).toEqual([])
  })

  it('requires at least one palette color with valid hex values', () => {
    expect(fieldsOf((v) => (v.style.palette = []))).toEqual(['style.palette'])
    expect(fieldsOf((v) => (v.style.palette[1].hex = '#12345'))).toEqual(['style.palette.1.hex'])
  })

  it('requires the character name and proportions only when the character is included', () => {
    const blank = (v: FormValues) => {
      v.character.name = ' '
      v.character.proportions = ''
    }
    expect(fieldsOf(blank)).toEqual(['character.name', 'character.proportions'])
    expect(
      fieldsOf((v) => {
        blank(v)
        v.asset = applyAssetPreset({ ...v.asset, subject: 'a lantern' }, 'item-icon')
      }),
    ).toEqual([])
  })

  it('requires an action or a subject', () => {
    expect(fieldsOf((v) => (v.asset.action = ''))).toEqual(['asset.action'])
    expect(
      fieldsOf((v) => {
        v.asset = applyAssetPreset({ ...v.asset, action: '', subject: 'grass' }, 'tile')
      }),
    ).toEqual([])
  })

  it('checks the sprite strip frame count and the custom aspect ratio', () => {
    expect(fieldsOf((v) => (v.asset = { ...applyAssetPreset(v.asset, 'sprite-strip'), frameCount: 13 }))).toEqual([
      'asset.frameCount',
    ])
    expect(fieldsOf((v) => Object.assign(v.asset, { aspectRatio: 'custom', customAspectRatio: '16x9' }))).toEqual([
      'asset.customAspectRatio',
    ])
    expect(fieldsOf((v) => Object.assign(v.asset, { aspectRatio: 'custom', customAspectRatio: '21:9' }))).toEqual([])
  })
})
