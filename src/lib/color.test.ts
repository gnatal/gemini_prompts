import { describe, expect, it } from 'vitest'
import { hexToHsl, nameHexMismatch } from './color'

describe('hexToHsl', () => {
  it('converts primaries and grays', () => {
    expect(hexToHsl('#FF0000')).toEqual({ h: 0, s: 1, l: 0.5 })
    expect(hexToHsl('#0000FF')?.h).toBe(240)
    expect(hexToHsl('#808080')?.s).toBe(0)
    expect(hexToHsl('nope')).toBeNull()
  })
})

describe('nameHexMismatch', () => {
  it.each([
    ['Indigo', '#D2452D', 'red'],
    ['Torii red', '#264478', 'blue'],
    ['Sky blue', '#E1B53A', 'yellow'],
  ])('%s %s is actually %s', (name, hex, actual) => {
    expect(nameHexMismatch(name, hex)).toBe(actual)
  })

  it.each([
    ['Ocean teal', '#1F6F78'],
    ['Sakura pink', '#F4B6C2'],
    ['Coat red', '#A3262A'],
    ['Treasure gold', '#E1B53A'],
    ['Royal blue', '#1E4FD8'],
    ['Ship wood', '#7A4E2D'],
    ['Hair gray', '#606060'],
  ])('%s %s matches', (name, hex) => {
    expect(nameHexMismatch(name, hex)).toBeNull()
  })
})
