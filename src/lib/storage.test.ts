import { describe, expect, it } from 'vitest'
import { cleanAsset, cleanCharacter, cleanStyle } from '../test/fixtures'
import type { CharacterProfile, StyleProfile } from '../types'
import {
  EMPTY_STATE,
  exportProfiles,
  loadState,
  mergeProfiles,
  parseImport,
  saveAssetDraft,
  saveCharacters,
  saveSelection,
  saveStyles,
  STORAGE_KEYS,
  type KeyValueStorage,
} from './storage'

const style: StyleProfile = { id: 's1', ...cleanStyle() }
const character: CharacterProfile = { id: 'c1', ...cleanCharacter() }

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
  }
}

describe('storage', () => {
  it('round-trips profiles, selection and the asset draft', () => {
    const storage = memoryStorage()
    saveStyles([style], storage)
    saveCharacters([character], storage)
    saveSelection({ styleId: 's1', characterId: 'c1' }, storage)
    saveAssetDraft(cleanAsset(), storage)
    expect(storage.data[STORAGE_KEYS.version]).toBe('1')
    expect(loadState(storage)).toEqual({
      styles: [style],
      characters: [character],
      selection: { styleId: 's1', characterId: 'c1' },
      asset: cleanAsset(),
    })
  })

  it('falls back to an empty state on corrupted JSON without crashing', () => {
    const storage = memoryStorage({
      [STORAGE_KEYS.styles]: '{not json',
      [STORAGE_KEYS.characters]: '"just a string"',
      [STORAGE_KEYS.selection]: 'null',
      [STORAGE_KEYS.asset]: '[1,2,3]',
    })
    expect(loadState(storage)).toEqual(EMPTY_STATE)
  })

  it('drops invalid entries but keeps the valid ones', () => {
    const storage = memoryStorage({ [STORAGE_KEYS.styles]: JSON.stringify([style, { id: 'bad', palette: 'red' }]) })
    expect(loadState(storage).styles).toEqual([style])
  })

  it('clears a selection that points to a missing profile', () => {
    const storage = memoryStorage({ [STORAGE_KEYS.selection]: JSON.stringify({ styleId: 'gone', characterId: null }) })
    expect(loadState(storage).selection).toEqual({ styleId: null, characterId: null })
  })

  it('works when storage is unavailable or throws', () => {
    expect(loadState(null)).toEqual(EMPTY_STATE)
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadState(throwing)).toEqual(EMPTY_STATE)
    expect(saveStyles([style], throwing)).toBe(false)
    expect(saveStyles([style], null)).toBe(false)
  })
})

describe('import / export', () => {
  it('imports what it exported', () => {
    const result = parseImport(exportProfiles([style], [character]))
    expect(result).toEqual({ ok: true, styles: [style], characters: [character] })
  })

  it.each([
    ['not JSON', '{oops', /not valid JSON/],
    ['another app’s file', JSON.stringify({ hello: 'world' }), /not an Asset Prompt Builder export/],
    [
      'a newer format',
      JSON.stringify({ format: 'asset-prompt-builder', version: 99, styles: [], characters: [] }),
      /newer version/,
    ],
    [
      'invalid profiles',
      JSON.stringify({
        format: 'asset-prompt-builder',
        version: 1,
        styles: [{ ...style, artStyle: 'watercolor' }],
        characters: [],
      }),
      /invalid data.*styles\.0\.artStyle/,
    ],
  ])('rejects %s with a readable message', (_label, text, message) => {
    const result = parseImport(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(message)
  })

  it('merges imported profiles by id', () => {
    const updated = { ...style, name: 'Renamed' }
    const other = { ...style, id: 's2' }
    expect(mergeProfiles([style], [updated, other])).toEqual([updated, other])
  })
})
