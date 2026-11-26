import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FIELD_HELP } from '../config/fieldHelp'
import type { FormValues } from '../types'
import { Field, inputClass } from './Field'
import { InfoTip } from './InfoTip'
import { ProfileBar, type ProfileControls } from './ProfileBar'
import { Section } from './Section'
import { TagListInput } from './TagListInput'

const BODY_FIELDS = [
  { name: 'head', label: 'Head', placeholder: 'round blue helmet with a short vertical fin on top, large round eyes' },
  { name: 'torso', label: 'Torso', placeholder: 'sky blue bodysuit, brass belt buckle shaped as a star' },
  { name: 'armsAndHands', label: 'Arms and hands', placeholder: 'dark blue fingerless gloves, thin forearms' },
  { name: 'legsAndFeet', label: 'Legs and feet', placeholder: 'oversized royal blue boots with brass spurs' },
] as const

export function CharacterSection({ profile }: { profile: ProfileControls }) {
  const { register, control } = useFormContext<FormValues>()
  const included = useWatch({ control, name: 'asset.includeCharacter' })

  return (
    <Section
      title="Character"
      subtitle="Describe the character once, reuse it everywhere"
      badge={
        !included && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Not in this asset
          </span>
        )
      }
    >
      <ProfileBar kind="character" {...profile} />

      {!included && (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          The current asset type doesn't include the character, so this block is left out of the prompt. Turn on
          “Include character” in the Asset section to add it.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field field="character.name" label="Name" htmlFor="character-name">
          <input id="character-name" className={inputClass} placeholder="Rex Ranger" {...register('character.name')} />
        </Field>
        <Field field="character.proportions" label="Proportions" htmlFor="character-proportions">
          <input
            id="character-proportions"
            className={inputClass}
            placeholder="4 heads tall, small torso, oversized boots"
            {...register('character.proportions')}
          />
        </Field>
      </div>

      {BODY_FIELDS.map(({ name, label, placeholder }) => (
        <Field key={name} field={`character.${name}`} label={label} htmlFor={`character-${name}`}>
          <textarea
            id={`character-${name}`}
            rows={2}
            className={inputClass}
            placeholder={placeholder}
            {...register(`character.${name}`)}
          />
        </Field>
      ))}

      <Field
        field="character.signatureDetails"
        label="Signature details"
        htmlFor="character-signatureDetails"
        hint="The 2 or 3 features that make the character unmistakable. Press Enter to add each one."
      >
        <Controller
          control={control}
          name="character.signatureDetails"
          render={({ field }) => (
            <TagListInput
              ref={field.ref}
              id="character-signatureDetails"
              field="character.signatureDetails"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="red scarf that always trails behind"
            />
          )}
        />
      </Field>

      <div className="flex items-start gap-1.5">
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="mt-0.5 size-4 accent-indigo-600" {...register('character.hasReferenceImage')} />
          <span>
            I will attach an approved reference image
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Adds a line telling the model to copy the attached design exactly.
            </span>
          </span>
        </label>
        <span className="mt-0.5">
          <InfoTip label="Reference image" help={FIELD_HELP['character.hasReferenceImage']} />
        </span>
      </div>
    </Section>
  )
}
