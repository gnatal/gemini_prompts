import { buttonClass } from './Field'
import { CopyButton } from './PromptPreview'

export interface PromptListItem {
  title: string
  prompt: string
  /** Toast text after copying this one prompt. */
  copiedLabel: string
}

interface PromptListProps {
  items: PromptListItem[]
  blocked: boolean
  testId: string
  onCopy: (text: string, label: string) => void
  onCopyAll: () => void
}

/** A list of prompts, each with its own Copy button, plus Copy all. */
export function PromptList({ items, blocked, testId, onCopy, onCopyAll }: PromptListProps) {
  if (!items.length) return null
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {items.length} {items.length === 1 ? 'prompt' : 'prompts'}
        </h2>
        <CopyButton disabled={blocked} onCopy={onCopyAll} label="Copy all" />
      </div>
      <ol className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.title}</span>
              <button
                type="button"
                className={buttonClass}
                disabled={blocked}
                onClick={() => onCopy(item.prompt, item.copiedLabel)}
              >
                Copy
              </button>
            </div>
            <pre
              data-testid={testId}
              className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {item.prompt}
            </pre>
          </li>
        ))}
      </ol>
    </>
  )
}
