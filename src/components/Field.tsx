import type { ReactNode } from 'react'
import { useFeedback } from './feedback'

interface FieldProps {
  /** Form path, used to match warnings/errors and for focusing from the summaries. */
  field: string
  label: string
  htmlFor?: string
  hint?: string
  className?: string
  children: ReactNode
}

export function Field({ field, label, htmlFor, hint, className = '', children }: FieldProps) {
  const { warnings, errors } = useFeedback(field)
  return (
    <div data-field={field} className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <FieldMessages warnings={warnings.map((w) => w.message)} errors={errors.map((e) => e.message)} />
    </div>
  )
}

export function FieldMessages({ warnings, errors }: { warnings: string[]; errors: string[] }) {
  if (!warnings.length && !errors.length) return null
  return (
    <ul className="flex flex-col gap-0.5 text-xs">
      {errors.map((message, i) => (
        <li key={`e${i}`} className="text-red-600 dark:text-red-400">
          {message}
        </li>
      ))}
      {[...new Set(warnings)].map((message, i) => (
        <li key={`w${i}`} className="text-amber-700 dark:text-amber-400">
          ⚠ {message}
        </li>
      ))}
    </ul>
  )
}

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-xs outline-none ' +
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 ' +
  'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

export const buttonClass =
  'inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm ' +
  'font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ' +
  'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white ' +
  'shadow-xs hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'
