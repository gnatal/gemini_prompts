import { describe, expect, it } from 'vitest'
import { cleanAsset } from '../test/fixtures'
import { applyAssetPreset, syncFrameCount, syncFrameLayout } from './assetPresets'

describe('asset presets', () => {
  it('applies the preset table without wiping the action', () => {
    const asset = cleanAsset({ action: 'waving', subject: 'a lantern', heldItems: 'lamp in the left hand' })
    const portrait = applyAssetPreset(asset, 'portrait')
    expect(portrait).toMatchObject({
      type: 'portrait',
      includeCharacter: true,
      view: 'three-quarter-front',
      aspectRatio: '1:1',
      framing: 'head and shoulders, centered',
      action: 'waving',
      subject: 'a lantern',
      heldItems: 'lamp in the left hand',
    })
    expect(applyAssetPreset(asset, 'background')).toMatchObject({
      includeCharacter: false,
      aspectRatio: '16:9',
      action: 'waving',
    })
    expect(applyAssetPreset(asset, 'tile')).toMatchObject({ view: 'top-down', includeCharacter: false })
  })

  it('derives the sprite strip framing and N:1 ratio from the frame count', () => {
    const strip = applyAssetPreset(cleanAsset({ frameCount: 4 }), 'sprite-strip')
    expect(strip).toMatchObject({ frameCount: 4, aspectRatio: 'custom', customAspectRatio: '4:1' })
    expect(strip.framing).toMatch(/^4 frames in one row/)

    // Typing "1" then "12": intermediate invalid values don't break the sync.
    const typed = syncFrameCount(syncFrameCount(strip, 1), 12)
    expect(typed).toMatchObject({ frameCount: 12, customAspectRatio: '12:1' })
    expect(typed.framing).toMatch(/^12 frames in one row/)
  })

  it('keeps a customized framing when the frame count changes', () => {
    const strip = { ...applyAssetPreset(cleanAsset(), 'sprite-strip'), framing: 'my own framing' }
    expect(syncFrameCount(strip, 3).framing).toBe('my own framing')
  })
})

describe('frame layout', () => {
  it('switches the framing and ratio between one row and a grid, both ways', () => {
    const strip = applyAssetPreset(cleanAsset({ frameCount: 8 }), 'sprite-strip')
    const grid = syncFrameLayout(strip, 'grid')
    expect(grid).toMatchObject({ frameLayout: 'grid', customAspectRatio: '2:1' })
    expect(grid.framing).toMatch(/^4 columns by 2 rows/)
    expect(syncFrameCount(grid, 12)).toMatchObject({ customAspectRatio: '4:3' })
    expect(syncFrameLayout(grid, 'row')).toMatchObject({ customAspectRatio: '8:1', framing: strip.framing })
  })

  it('keeps a customized framing and ratio when the layout changes', () => {
    const strip = { ...applyAssetPreset(cleanAsset({ frameCount: 8 }), 'sprite-strip'), framing: 'mine', customAspectRatio: '3:2' }
    expect(syncFrameLayout(strip, 'grid')).toMatchObject({ framing: 'mine', customAspectRatio: '3:2' })
  })
})
