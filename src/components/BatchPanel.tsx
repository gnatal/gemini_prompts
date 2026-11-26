import { ACTION_LISTS } from '../config/actionLists'
import { FIELD_HELP } from '../config/fieldHelp'
import type { ValidationIssue } from '../schemas'
import { buttonClass, inputClass } from './Field'
import { InfoTip } from './InfoTip'
import { PromptList } from './PromptList'
import { BlockingIssues } from './PromptPreview'

interface BatchPanelProps {
  text: string
  onTextChange: (text: string) => void
  prompts: string[]
  issues: ValidationIssue[]
  onCopy: (text: string, label: string) => void
  onCopyAll: () => void
}

export function BatchPanel({ text, onTextChange, prompts, issues, onCopy, onCopyAll }: BatchPanelProps) {
  const blocked = issues.length > 0
  return (
    <section aria-label="Batch mode" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <label htmlFor="batch-actions" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Actions, one per line
          </label>
          <InfoTip label="batch actions" help={FIELD_HELP['batch.actions']} />
        </div>
        <textarea
          id="batch-actions"
          rows={6}
          className={`${inputClass} font-mono`}
          placeholder={'idle\nrun\njump'}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Every prompt shares the exact same Style and Character blocks. Only the action changes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTION_LISTS.map((list) => (
          <button
            key={list.name}
            type="button"
            className={buttonClass}
            title={list.actions.join(', ')}
            onClick={() => onTextChange(list.actions.join('\n'))}
          >
            {list.name}
          </button>
        ))}
        {text && (
          <button type="button" className={buttonClass} onClick={() => onTextChange('')}>
            Clear
          </button>
        )}
      </div>

      <BlockingIssues issues={issues} />

      <PromptList
        items={prompts.map((prompt, i) => ({ title: `#${i + 1}`, prompt, copiedLabel: `Copied prompt #${i + 1}` }))}
        blocked={blocked}
        testId="batch-prompt"
        onCopy={onCopy}
        onCopyAll={onCopyAll}
      />
    </section>
  )
}
