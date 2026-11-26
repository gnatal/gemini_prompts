const LABELS: Record<string, string> = {
  'style.name': 'Style name',
  'style.artStyle': 'Art style',
  'style.customStyle': 'Custom style',
  'style.pixelResolution': 'Pixel resolution',
  'style.setting': 'Setting',
  'style.palette': 'Palette',
  'style.linesAndShading': 'Lines and shading',
  'character.name': 'Character name',
  'character.proportions': 'Proportions',
  'character.head': 'Head',
  'character.torso': 'Torso',
  'character.armsAndHands': 'Arms and hands',
  'character.legsAndFeet': 'Legs and feet',
  'character.signatureDetails': 'Signature details',
  'asset.subject': 'Subject',
  'asset.action': 'Action',
  'asset.heldItems': 'Held items',
  'asset.frameCount': 'Frame count',
  'asset.frameLayout': 'Layout',
  'asset.framing': 'Framing',
  'asset.backgroundColor': 'Background color',
  'asset.lighting': 'Lighting',
  'asset.customAspectRatio': 'Custom aspect ratio',
  'asset.exclusions': 'Exclusions',
}

const PALETTE_PART: Record<string, string> = { name: 'name', hex: 'hex', usage: 'usage' }

/** Human-readable name for a form field path. */
export function fieldLabel(field: string): string {
  if (LABELS[field]) return LABELS[field]
  const palette = /^style\.palette\.(\d+)\.(\w+)$/.exec(field)
  if (palette) return `Palette color ${Number(palette[1]) + 1} ${PALETTE_PART[palette[2]] ?? palette[2]}`
  const detail = /^character\.signatureDetails\.(\d+)$/.exec(field)
  if (detail) return `Signature detail ${Number(detail[1]) + 1}`
  return field
}

/** The field a warning should be shown next to (list items roll up to their list). */
export function anchorField(field: string): string {
  return field.replace(/^(character\.signatureDetails)\.\d+$/, '$1')
}
