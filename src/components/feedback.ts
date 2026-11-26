import { createContext, useContext } from 'react'
import type { ValidationIssue } from '../schemas'
import type { LintWarning } from '../types'
import { anchorField } from './fieldLabels'

export interface Feedback {
  warnings: LintWarning[]
  issues: ValidationIssue[]
  /** Whether validation errors for this field should be shown inline yet (touched, edited or requested). */
  showErrorFor: (field: string) => boolean
}

export const FeedbackContext = createContext<Feedback>({
  warnings: [],
  issues: [],
  showErrorFor: () => false,
})

export function useFeedback(field: string) {
  const { warnings, issues, showErrorFor } = useContext(FeedbackContext)
  return {
    warnings: warnings.filter((w) => anchorField(w.field) === field),
    errors: showErrorFor(field) ? issues.filter((i) => i.field === field) : [],
  }
}

/** Opens the section that holds a field, scrolls to it and focuses its first input. */
export function focusField(field: string): void {
  const el = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(field)}"]`)
  if (!el) return
  const details = el.closest('details')
  if (details) details.open = true
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  el.querySelector<HTMLElement>('input, textarea, select, button')?.focus({ preventScroll: true })
}
