import type { AssetRequest, CharacterData, StyleData } from '../types'
import { buildPrompt } from './buildPrompt'

export const BATCH_SEPARATOR = '\n\n---\n\n'

/** Splits a textarea into actions: one per line, blank lines ignored. */
export function parseActions(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * One prompt per action. Only the action changes, so the Style and Character
 * blocks are byte-identical across every prompt in the batch.
 */
export function buildBatch(
  style: StyleData,
  character: CharacterData | null,
  asset: AssetRequest,
  actions: string[],
): string[] {
  return actions
    .map((a) => a.trim())
    .filter(Boolean)
    .map((action) => buildPrompt(style, character, { ...asset, action }))
}

export function joinBatch(prompts: string[]): string {
  return prompts.join(BATCH_SEPARATOR)
}
