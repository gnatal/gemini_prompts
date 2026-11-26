import type { z } from 'zod'
import {
  assetRequestSchema,
  characterProfileSchema,
  EXPORT_FORMAT,
  exportFileSchema,
  styleProfileSchema,
  type ExportFile,
} from '../schemas'
import type { AssetRequest, CharacterProfile, StyleProfile } from '../types'

export const STORAGE_KEYS = {
  styles: 'apb:styles',
  characters: 'apb:characters',
  version: 'apb:version',
  selection: 'apb:selection',
  asset: 'apb:asset',
} as const

export const SCHEMA_VERSION = 1

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export interface Selection {
  styleId: string | null
  characterId: string | null
}

export interface StoredState {
  styles: StyleProfile[]
  characters: CharacterProfile[]
  selection: Selection
  /** The last asset draft, so a reload doesn't lose the action being written. */
  asset: AssetRequest | null
}

export const EMPTY_STATE: StoredState = {
  styles: [],
  characters: [],
  selection: { styleId: null, characterId: null },
  asset: null,
}

/** localStorage, or null when it is unavailable (private mode, disabled cookies, sandboxed iframe...). */
export function getStorage(): KeyValueStorage | null {
  try {
    const storage = globalThis.localStorage
    return storage ?? null
  } catch {
    return null
  }
}

function readJson(storage: KeyValueStorage, key: string): unknown {
  try {
    const raw = storage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function writeJson(storage: KeyValueStorage | null, key: string, value: unknown): boolean {
  if (!storage) return false
  try {
    storage.setItem(key, JSON.stringify(value))
    storage.setItem(STORAGE_KEYS.version, String(SCHEMA_VERSION))
    return true
  } catch {
    return false // quota exceeded, storage disabled mid-session...
  }
}

/** Keeps the valid entries of a stored list and drops the rest. */
function readList<T>(schema: z.ZodType<T>, value: unknown): T[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const result = schema.safeParse(item)
    return result.success ? [result.data] : []
  })
}

function readSelection(value: unknown): Selection {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_STATE.selection }
  const v = value as Record<string, unknown>
  return {
    styleId: typeof v.styleId === 'string' ? v.styleId : null,
    characterId: typeof v.characterId === 'string' ? v.characterId : null,
  }
}

/** Loads everything from storage. Never throws: missing or corrupted data falls back to an empty state. */
export function loadState(storage: KeyValueStorage | null = getStorage()): StoredState {
  if (!storage) return structuredClone(EMPTY_STATE)
  try {
    // apb:version is read for future migrations. Version 1 is the only format so far.
    const styles = readList(styleProfileSchema, readJson(storage, STORAGE_KEYS.styles))
    const characters = readList(characterProfileSchema, readJson(storage, STORAGE_KEYS.characters))
    const selection = readSelection(readJson(storage, STORAGE_KEYS.selection))
    const assetResult = assetRequestSchema.safeParse(readJson(storage, STORAGE_KEYS.asset))
    return {
      styles,
      characters,
      selection: {
        styleId: styles.some((s) => s.id === selection.styleId) ? selection.styleId : null,
        characterId: characters.some((c) => c.id === selection.characterId) ? selection.characterId : null,
      },
      asset: assetResult.success ? assetResult.data : null,
    }
  } catch {
    return structuredClone(EMPTY_STATE)
  }
}

export function saveStyles(styles: StyleProfile[], storage = getStorage()): boolean {
  return writeJson(storage, STORAGE_KEYS.styles, styles)
}

export function saveCharacters(characters: CharacterProfile[], storage = getStorage()): boolean {
  return writeJson(storage, STORAGE_KEYS.characters, characters)
}

export function saveSelection(selection: Selection, storage = getStorage()): boolean {
  return writeJson(storage, STORAGE_KEYS.selection, selection)
}

export function saveAssetDraft(asset: AssetRequest, storage = getStorage()): boolean {
  return writeJson(storage, STORAGE_KEYS.asset, asset)
}

export function exportProfiles(
  styles: StyleProfile[],
  characters: CharacterProfile[],
  now: Date = new Date(),
): string {
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    version: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    styles,
    characters,
  }
  return JSON.stringify(file, null, 2)
}

export type ImportResult =
  | { ok: true; styles: StyleProfile[]; characters: CharacterProfile[] }
  | { ok: false; error: string }

/** Validates an exported JSON file. Invalid files are rejected with a readable message. */
export function parseImport(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }
  if (typeof data !== 'object' || data === null || (data as { format?: unknown }).format !== EXPORT_FORMAT) {
    return { ok: false, error: 'This file is not an Asset Prompt Builder export.' }
  }
  const version = (data as { version?: unknown }).version
  if (typeof version === 'number' && version > SCHEMA_VERSION) {
    return { ok: false, error: `This file was exported by a newer version of the app (format ${version}).` }
  }
  const result = exportFileSchema.safeParse(data)
  if (!result.success) {
    const details = result.error.issues.slice(0, 3).map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'file'
      return `${path}: ${issue.message}`
    })
    const more = result.error.issues.length > 3 ? ` (and ${result.error.issues.length - 3} more)` : ''
    return { ok: false, error: `The file has invalid data. ${details.join('; ')}${more}` }
  }
  return { ok: true, styles: result.data.styles, characters: result.data.characters }
}

/** Adds incoming profiles. A profile with an id that already exists replaces it. */
export function mergeProfiles<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(existing.map((p) => [p.id, p]))
  for (const p of incoming) byId.set(p.id, p)
  return [...byId.values()]
}

export function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}
