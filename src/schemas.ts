import { z } from 'zod'
import { ART_STYLES, ASPECT_RATIOS, ASSET_TYPES, VIEWS } from './config/labels'
import { isValidFrameCount, usesChromaKey } from './config/assetPresets'
import { isValidHex } from './lib/color'
import type {
  AssetRequest,
  CharacterData,
  CharacterProfile,
  FormValues,
  PaletteColor,
  StyleData,
  StyleProfile,
} from './types'

/*
 * Structural schemas mirror types.ts. They check shape only, and are used for
 * localStorage and imported files. The stricter "can this be copied?" rules
 * live in `formSchema` below.
 */

export const artStyleSchema = z.enum(ART_STYLES as [StyleProfile['artStyle'], ...StyleProfile['artStyle'][]])
export const assetTypeSchema = z.enum(ASSET_TYPES as [AssetRequest['type'], ...AssetRequest['type'][]])
export const viewSchema = z.enum(VIEWS as [AssetRequest['view'], ...AssetRequest['view'][]])
export const aspectRatioSchema = z.enum(
  ASPECT_RATIOS as [AssetRequest['aspectRatio'], ...AssetRequest['aspectRatio'][]],
)

export const paletteColorSchema = z.object({
  name: z.string(),
  hex: z.string(),
  usage: z.string(),
}) satisfies z.ZodType<PaletteColor>

export const styleDataSchema = z.object({
  name: z.string(),
  artStyle: artStyleSchema,
  customStyle: z.string().optional(),
  pixelResolution: z.string().optional(),
  setting: z.string().optional(),
  palette: z.array(paletteColorSchema),
  linesAndShading: z.string(),
}) satisfies z.ZodType<StyleData>

export const styleProfileSchema = styleDataSchema.extend({
  id: z.string().min(1),
}) satisfies z.ZodType<StyleProfile>

export const characterDataSchema = z.object({
  name: z.string(),
  proportions: z.string(),
  head: z.string(),
  torso: z.string(),
  armsAndHands: z.string(),
  legsAndFeet: z.string(),
  signatureDetails: z.array(z.string()),
  hasReferenceImage: z.boolean(),
}) satisfies z.ZodType<CharacterData>

export const characterProfileSchema = characterDataSchema.extend({
  id: z.string().min(1),
}) satisfies z.ZodType<CharacterProfile>

export const assetRequestSchema = z.object({
  type: assetTypeSchema,
  includeCharacter: z.boolean(),
  subject: z.string().optional(),
  action: z.string(),
  heldItems: z.string().optional(),
  view: viewSchema,
  frameCount: z.number().optional(),
  framing: z.string(),
  backgroundColor: z.string(),
  lighting: z.string(),
  aspectRatio: aspectRatioSchema,
  customAspectRatio: z.string().optional(),
  exclusions: z.array(z.string()),
}) satisfies z.ZodType<AssetRequest>

export const formValuesSchema = z.object({
  style: styleDataSchema,
  character: characterDataSchema,
  asset: assetRequestSchema,
}) satisfies z.ZodType<FormValues>

const ASPECT_RATIO_RE = /^\s*[1-9]\d*\s*:\s*[1-9]\d*\s*$/

/**
 * The rules that block the Copy button. All checks live in one superRefine on
 * the structural schema, so every rule runs and reports at its own field path.
 */
export const formSchema = formValuesSchema.superRefine((values, ctx) => {
  const { style, character, asset } = values
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })

  // Style
  if (style.artStyle === 'custom' && !style.customStyle?.trim()) {
    issue(['style', 'customStyle'], 'Describe the custom art style.')
  }
  if (style.palette.length === 0) {
    issue(['style', 'palette'], 'Add at least 1 palette color.')
  }
  style.palette.forEach((color, i) => {
    if (!isValidHex(color.hex)) issue(['style', 'palette', i, 'hex'], 'Enter a valid hex color, e.g. #1E4FD8.')
  })

  // Character
  if (asset.includeCharacter) {
    if (!character.name.trim()) issue(['character', 'name'], 'Character name is required.')
    if (!character.proportions.trim()) issue(['character', 'proportions'], 'Proportions are required.')
  }

  // Asset
  const hasSubject = !asset.includeCharacter && !!asset.subject?.trim()
  if (!asset.action.trim() && !hasSubject) {
    issue(['asset', 'action'], asset.includeCharacter ? 'Describe the action.' : 'Describe the subject or the action.')
  }
  if (asset.type === 'sprite-strip' && !isValidFrameCount(asset.frameCount)) {
    issue(['asset', 'frameCount'], 'Frame count must be a whole number from 2 to 12.')
  }
  if (asset.aspectRatio === 'custom' && !ASPECT_RATIO_RE.test(asset.customAspectRatio ?? '')) {
    issue(['asset', 'customAspectRatio'], 'Use the W:H format, e.g. 6:1.')
  }
  if (usesChromaKey(asset.type) && !isValidHex(asset.backgroundColor)) {
    issue(['asset', 'backgroundColor'], 'Enter a valid hex color, e.g. #00FF00.')
  }
})

export interface ValidationIssue {
  field: string
  message: string
}

export function validateForm(values: FormValues): ValidationIssue[] {
  const result = formSchema.safeParse(values)
  if (result.success) return []
  return result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
}

export const EXPORT_FORMAT = 'asset-prompt-builder'

export const exportFileSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int().positive(),
  exportedAt: z.string().optional(),
  styles: z.array(styleProfileSchema),
  characters: z.array(characterProfileSchema),
})

export type ExportFile = z.infer<typeof exportFileSchema>
