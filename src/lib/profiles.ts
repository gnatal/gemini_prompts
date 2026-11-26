import { defaultCharacter, defaultStyle } from '../config/defaults'
import type { CharacterData, CharacterProfile, StyleData, StyleProfile } from '../types'

/** Strips the id and fills optional fields, so a stored profile can be loaded into the form. */
export function toStyleData(profile: StyleProfile): StyleData {
  const { id: _id, ...data } = profile
  return {
    ...defaultStyle(),
    customStyle: '',
    pixelResolution: '',
    ...data,
    palette: data.palette.map((c) => ({ ...c })),
  }
}

export function toCharacterData(profile: CharacterProfile): CharacterData {
  const { id: _id, ...data } = profile
  return { ...defaultCharacter(), ...data, signatureDetails: [...data.signatureDetails] }
}

/** Returns `name`, or `name (2)`, `name (3)`... if it is already taken. */
export function uniqueName(name: string, taken: string[], fallback: string): string {
  const base = name.trim() || fallback
  const lower = new Set(taken.map((t) => t.trim().toLowerCase()))
  if (!lower.has(base.toLowerCase())) return base
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})`
    if (!lower.has(candidate.toLowerCase())) return candidate
  }
}
