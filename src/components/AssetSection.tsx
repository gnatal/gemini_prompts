import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { applyAssetPreset, syncFrameCount, usesChromaKey } from '../config/assetPresets'
import { CHROMA_GREEN, CHROMA_MAGENTA } from '../config/defaults'
import { ASPECT_RATIO_LABELS, ASPECT_RATIOS, ASSET_TYPE_LABELS, ASSET_TYPES, VIEW_LABELS, VIEWS } from '../config/labels'
import { deepEqual } from '../lib/deepEqual'
import type { AssetRequest, AssetType, FormValues } from '../types'
import { ColorInput } from './ColorInput'
import { buttonClass, Field, inputClass } from './Field'
import { Section } from './Section'
import { TagListInput } from './TagListInput'

const SUBJECT_LABELS: Partial<Record<AssetType, { label: string; placeholder: string }>> = {
  'item-icon': { label: 'Item', placeholder: 'a brass revolver with a dark wooden grip' },
  background: { label: 'Scene', placeholder: 'desert canyon at dusk, layered rock walls, cacti in the foreground' },
  tile: { label: 'Tile', placeholder: 'dry cracked earth with small pebbles' },
}

export function AssetSection() {
  const { register, control, getValues, setValue } = useFormContext<FormValues>()
  const type = useWatch({ control, name: 'asset.type' })
  const includeCharacter = useWatch({ control, name: 'asset.includeCharacter' })
  const aspectRatio = useWatch({ control, name: 'asset.aspectRatio' })

  /** Sets each changed key, so every registered input and controller picks up the change. */
  const replaceAsset = (next: AssetRequest, skip: (keyof AssetRequest)[] = []) => {
    const current = getValues('asset')
    for (const key of Object.keys(next) as (keyof AssetRequest)[]) {
      if (skip.includes(key) || deepEqual(current[key], next[key])) continue
      setValue(`asset.${key}`, next[key] as never, { shouldDirty: true })
    }
  }

  const subject = SUBJECT_LABELS[type] ?? { label: 'Subject', placeholder: 'what to draw' }

  return (
    <Section title="Asset" subtitle="What to draw this time">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field field="asset.type" label="Asset type" htmlFor="asset-type" hint="Changing it applies that type's defaults.">
          <select
            id="asset-type"
            className={inputClass}
            {...register('asset.type', {
              onChange: (e) => replaceAsset(applyAssetPreset(getValues('asset'), e.target.value as AssetType)),
            })}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {ASSET_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        {type === 'sprite-strip' && (
          <Field field="asset.frameCount" label="Frames" htmlFor="asset-frameCount" hint="2 to 12, in one row">
            <input
              id="asset-frameCount"
              type="number"
              min={2}
              max={12}
              className={inputClass}
              {...register('asset.frameCount', {
                setValueAs: (v: unknown) => {
                  if (v === '' || v === null || v === undefined) return undefined
                  const n = Number(v)
                  return Number.isNaN(n) ? undefined : n
                },
                // Keep the framing text and the N:1 ratio in step with the frame count.
                onChange: () => {
                  const asset = getValues('asset')
                  replaceAsset(syncFrameCount(asset, asset.frameCount), ['frameCount'])
                },
              })}
            />
          </Field>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" className="size-4 accent-indigo-600" {...register('asset.includeCharacter')} />
        Include character
      </label>

      {!includeCharacter && (
        <Field field="asset.subject" label={subject.label} htmlFor="asset-subject">
          <textarea
            id="asset-subject"
            rows={2}
            className={inputClass}
            placeholder={subject.placeholder}
            {...register('asset.subject')}
          />
        </Field>
      )}

      <Field
        field="asset.action"
        label="Action"
        htmlFor="asset-action"
        hint={includeCharacter ? 'One clear action.' : 'Optional when the subject is filled in.'}
      >
        <input
          id="asset-action"
          className={inputClass}
          placeholder={includeCharacter ? 'running' : 'spinning slowly'}
          {...register('asset.action')}
        />
      </Field>

      {includeCharacter && (
        <Field
          field="asset.heldItems"
          label="Held items"
          htmlFor="asset-heldItems"
          hint="Which hand holds what, from the character's perspective."
        >
          <input
            id="asset-heldItems"
            className={inputClass}
            placeholder="revolver in the right hand"
            {...register('asset.heldItems')}
          />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field field="asset.view" label="View" htmlFor="asset-view">
          <select id="asset-view" className={inputClass} {...register('asset.view')}>
            {VIEWS.map((v) => (
              <option key={v} value={v}>
                {VIEW_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex gap-2">
          <Field field="asset.aspectRatio" label="Aspect ratio" htmlFor="asset-aspectRatio" className="flex-1">
            <select id="asset-aspectRatio" className={inputClass} {...register('asset.aspectRatio')}>
              {ASPECT_RATIOS.map((r) => (
                <option key={r} value={r}>
                  {ASPECT_RATIO_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          {aspectRatio === 'custom' && (
            <Field field="asset.customAspectRatio" label="W:H" htmlFor="asset-customAspectRatio" className="w-24">
              <input
                id="asset-customAspectRatio"
                className={inputClass}
                placeholder="6:1"
                {...register('asset.customAspectRatio')}
              />
            </Field>
          )}
        </div>
      </div>

      <Field field="asset.framing" label="Framing" htmlFor="asset-framing">
        <textarea id="asset-framing" rows={2} className={inputClass} {...register('asset.framing')} />
      </Field>

      {usesChromaKey(type) && (
        <Field
          field="asset.backgroundColor"
          label="Background color"
          htmlFor="asset-backgroundColor"
          hint="A flat chroma key color that's easy to remove later."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Controller
              control={control}
              name="asset.backgroundColor"
              render={({ field }) => (
                <ColorInput
                  id="asset-backgroundColor"
                  label="Background color"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              )}
            />
            <button
              type="button"
              className={buttonClass}
              onClick={() => setValue('asset.backgroundColor', CHROMA_GREEN, { shouldDirty: true })}
            >
              Green
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => setValue('asset.backgroundColor', CHROMA_MAGENTA, { shouldDirty: true })}
            >
              Magenta
            </button>
          </div>
        </Field>
      )}

      <Field field="asset.lighting" label="Lighting" htmlFor="asset-lighting">
        <input id="asset-lighting" className={inputClass} {...register('asset.lighting')} />
      </Field>

      <Field
        field="asset.exclusions"
        label="Exclude"
        htmlFor="asset-exclusions"
        hint="Things the model must leave out. Press Enter to add each one."
      >
        <Controller
          control={control}
          name="asset.exclusions"
          render={({ field }) => (
            <TagListInput
              ref={field.ref}
              id="asset-exclusions"
              field="asset.exclusions"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="no ground shadow"
            />
          )}
        />
      </Field>
    </Section>
  )
}
