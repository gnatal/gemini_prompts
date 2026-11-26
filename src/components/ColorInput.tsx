import { isValidHex, normalizeHex } from '../lib/color'
import { inputClass } from './Field'

interface ColorInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  label: string
  inputRef?: (el: HTMLInputElement | null) => void
}

/** A native color picker next to a hex text input, both editing the same value. */
export function ColorInput({ id, value, onChange, onBlur, label, inputRef }: ColorInputProps) {
  const valid = isValidHex(value)
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={`${label} picker`}
        className="h-8 w-10 shrink-0 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-600"
        value={valid ? normalizeHex(value).toLowerCase() : '#000000'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onBlur={onBlur}
      />
      <input
        ref={inputRef}
        id={id}
        aria-label={label}
        aria-invalid={!valid}
        className={`${inputClass} w-28 font-mono uppercase ${valid ? '' : 'border-red-400 dark:border-red-500'}`}
        value={value}
        maxLength={7}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (isValidHex(value)) onChange(normalizeHex(value))
          onBlur?.()
        }}
      />
    </div>
  )
}
