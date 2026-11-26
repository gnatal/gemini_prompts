import type { ValidationIssue } from '../schemas'
import { primaryButtonClass } from './Field'
import { fieldLabel } from './fieldLabels'
import { focusField } from './feedback'

interface PromptPreviewProps {
  prompt: string
  issues: ValidationIssue[]
  onCopy: () => void
}

export function PromptPreview({ prompt, issues, onCopy }: PromptPreviewProps) {
  return (
    <section aria-label="Prompt preview" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Prompt</h2>
        <CopyButton disabled={issues.length > 0} onCopy={onCopy} className="hidden lg:inline-flex" />
      </div>
      <pre
        data-testid="prompt-preview"
        className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      >
        {prompt}
      </pre>
      <BlockingIssues issues={issues} />
    </section>
  )
}

export function BlockingIssues({ issues }: { issues: ValidationIssue[] }) {
  if (!issues.length) return null
  return (
    <div
      role="status"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      <p className="font-semibold">Fix {issues.length === 1 ? 'this' : 'these'} to copy:</p>
      <ul className="mt-1 list-disc pl-5">
        {issues.map((issue, i) => (
          <li key={`${issue.field}-${i}`}>
            <button
              type="button"
              className="text-left underline decoration-red-300 underline-offset-2"
              onClick={() => focusField(issue.field)}
            >
              {fieldLabel(issue.field)}
            </button>
            : {issue.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CopyButton({
  disabled,
  onCopy,
  label = 'Copy prompt',
  className = '',
}: {
  disabled: boolean
  onCopy: () => void
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      className={`${primaryButtonClass} ${className}`}
      disabled={disabled}
      onClick={onCopy}
      title={disabled ? 'Fix the issues below to copy' : undefined}
    >
      {label}
    </button>
  )
}
