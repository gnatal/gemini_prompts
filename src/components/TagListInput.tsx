import { forwardRef, useContext, useState, type KeyboardEvent } from 'react'
import { FeedbackContext } from './feedback'
import { inputClass } from './Field'

interface TagListInputProps {
  id?: string
  /** Form path of the list, used to highlight items that have warnings. */
  field: string
  value: string[]
  onChange: (value: string[]) => void
  onBlur?: () => void
  placeholder?: string
  maxItems?: number
}

/** A list of short phrases. Enter adds the typed phrase, Backspace on an empty input removes the last one. */
export const TagListInput = forwardRef<HTMLInputElement, TagListInputProps>(function TagListInput(
  { id, field, value, onChange, onBlur, placeholder, maxItems },
  ref,
) {
  const [draft, setDraft] = useState('')
  const { warnings } = useContext(FeedbackContext)
  const full = maxItems !== undefined && value.length >= maxItems

  const add = () => {
    const item = draft.trim()
    if (!item || full) return
    if (!value.some((v) => v.toLowerCase() === item.toLowerCase())) onChange([...value, item])
    setDraft('')
  }

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value.length - 1)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Items">
          {value.map((item, i) => {
            const flagged = warnings.some((w) => w.field === `${field}.${i}`)
            return (
              <li
                key={`${item}-${i}`}
                className={
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm ' +
                  (flagged
                    ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200'
                    : 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100')
                }
              >
                {flagged && <span aria-label="has warning">⚠</span>}
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="-mr-1 rounded-full px-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-600 dark:hover:text-white"
                  aria-label={`Remove ${item}`}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          ref={ref}
          id={id}
          className={inputClass}
          value={draft}
          placeholder={full ? `Up to ${maxItems} items` : placeholder}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add()
            onBlur?.()
          }}
        />
      </div>
    </div>
  )
})
