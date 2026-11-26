import { useFormContext, useWatch } from 'react-hook-form'
import { ART_STYLE_LABELS, ART_STYLES } from '../config/labels'
import type { FormValues } from '../types'
import { Field, inputClass } from './Field'
import { PaletteEditor } from './PaletteEditor'
import { ProfileBar, type ProfileControls } from './ProfileBar'
import { Section } from './Section'

export function StyleSection({ profile }: { profile: ProfileControls }) {
  const { register, control } = useFormContext<FormValues>()
  const artStyle = useWatch({ control, name: 'style.artStyle' })

  return (
    <Section title="Style" subtitle="Shared by every asset in the game">
      <ProfileBar kind="style" {...profile} />

      <Field field="style.name" label="Style profile name" htmlFor="style-name">
        <input id="style-name" className={inputClass} placeholder="Main game style" {...register('style.name')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field field="style.artStyle" label="Art style" htmlFor="style-artStyle">
          <select id="style-artStyle" className={inputClass} {...register('style.artStyle')}>
            {ART_STYLES.map((s) => (
              <option key={s} value={s}>
                {ART_STYLE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        {artStyle === 'pixel-art' && (
          <Field
            field="style.pixelResolution"
            label="Sprite resolution"
            htmlFor="style-pixelResolution"
            hint="e.g. 32x32, 64x64"
          >
            <input
              id="style-pixelResolution"
              className={inputClass}
              placeholder="64x64"
              {...register('style.pixelResolution')}
            />
          </Field>
        )}
      </div>

      {artStyle === 'custom' && (
        <Field field="style.customStyle" label="Custom art style" htmlFor="style-customStyle">
          <input
            id="style-customStyle"
            className={inputClass}
            placeholder="flat vector art, 16-bit era proportions"
            {...register('style.customStyle')}
          />
        </Field>
      )}

      <PaletteEditor />

      <Field field="style.linesAndShading" label="Lines and shading" htmlFor="style-linesAndShading">
        <input
          id="style-linesAndShading"
          className={inputClass}
          placeholder="thick dark outlines, 2-tone cel shading, no gradients"
          {...register('style.linesAndShading')}
        />
      </Field>
    </Section>
  )
}
