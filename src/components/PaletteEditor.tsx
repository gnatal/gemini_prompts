import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { MAX_PALETTE_COLORS } from '../config/defaults'
import type { FormValues } from '../types'
import { ColorInput } from './ColorInput'
import { buttonClass, FieldMessages, inputClass } from './Field'
import { useFeedback } from './feedback'

export function PaletteEditor() {
  const { control } = useFormContext<FormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'style.palette' })
  const listFeedback = useFeedback('style.palette')

  return (
    <div data-field="style.palette" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Palette</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {fields.length} / {MAX_PALETTE_COLORS} colors (3 to 6 recommended)
        </span>
      </div>

      <div className="hidden grid-cols-[1fr_auto_1fr_auto] gap-2 px-1 text-xs text-slate-500 sm:grid dark:text-slate-400">
        <span>Name</span>
        <span className="w-40">Color</span>
        <span>Used for</span>
        <span className="w-18" />
      </div>

      <ul className="flex flex-col gap-3 sm:gap-2">
        {fields.map((item, index) => (
          <PaletteRow key={item.id} index={index} onRemove={() => remove(index)} />
        ))}
      </ul>

      <FieldMessages
        warnings={listFeedback.warnings.map((w) => w.message)}
        errors={listFeedback.errors.map((e) => e.message)}
      />

      <div>
        <button
          type="button"
          className={buttonClass}
          disabled={fields.length >= MAX_PALETTE_COLORS}
          onClick={() => append({ name: '', hex: '#888888', usage: '' })}
        >
          + Add color
        </button>
      </div>
    </div>
  )
}

function PaletteRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { control, register } = useFormContext<FormValues>()
  const name = useFeedback(`style.palette.${index}.name`)
  const hex = useFeedback(`style.palette.${index}.hex`)
  const usage = useFeedback(`style.palette.${index}.usage`)
  const feedback = [name, hex, usage]
  const warnings = feedback.flatMap((f) => f.warnings.map((w) => w.message))
  const errors = feedback.flatMap((f) => f.errors.map((e) => e.message))

  return (
    <li className="flex flex-col gap-1">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
        <div data-field={`style.palette.${index}.name`}>
          <input
            className={inputClass}
            placeholder="Royal blue"
            aria-label={`Color ${index + 1} name`}
            {...register(`style.palette.${index}.name`)}
          />
        </div>
        <div data-field={`style.palette.${index}.hex`} className="sm:w-40">
          <Controller
            control={control}
            name={`style.palette.${index}.hex`}
            render={({ field }) => (
              <ColorInput
                label={`Color ${index + 1} hex`}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
              />
            )}
          />
        </div>
        <div data-field={`style.palette.${index}.usage`}>
          <input
            className={inputClass}
            placeholder="helmet, boots"
            aria-label={`Color ${index + 1} usage`}
            {...register(`style.palette.${index}.usage`)}
          />
        </div>
        <button
          type="button"
          className={`${buttonClass} sm:w-18`}
          onClick={onRemove}
          aria-label={`Remove color ${index + 1}`}
        >
          Remove
        </button>
      </div>
      <FieldMessages warnings={warnings} errors={errors} />
    </li>
  )
}
