import type { LintWarning } from '../types'
import { anchorField, fieldLabel } from './fieldLabels'
import { focusField } from './feedback'

export function LintSummary({ warnings }: { warnings: LintWarning[] }) {
  if (!warnings.length) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
        ✓ No prompt warnings
      </p>
    )
  }
  return (
    <section
      aria-label="Prompt warnings"
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40"
    >
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
        {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
        <span className="font-normal text-amber-800/80 dark:text-amber-300/70"> · not blocking</span>
      </h2>
      <ul className="mt-1 flex flex-col gap-1 text-sm">
        {warnings.map((w, i) => (
          <li key={`${w.rule}-${w.field}-${i}`} className="text-amber-900 dark:text-amber-200">
            <button
              type="button"
              className="font-medium underline decoration-amber-400 underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100"
              onClick={() => focusField(anchorField(w.field))}
            >
              {fieldLabel(w.field)}
            </button>
            : {w.message}
          </li>
        ))}
      </ul>
    </section>
  )
}
