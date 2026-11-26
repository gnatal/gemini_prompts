import { joinBatch } from '../lib/buildBatch'
import type { AnimationFrames } from '../lib/buildFrames'
import { buttonClass } from './Field'
import { CopyButton } from './PromptPreview'

interface FramePromptListProps {
  sets: AnimationFrames[]
  blocked: boolean
  onCopy: (text: string, label: string) => void
  onCopyAll: () => void
}

/** Frame prompts grouped by animation, each frame with its own Copy button. */
export function FramePromptList({ sets, blocked, onCopy, onCopyAll }: FramePromptListProps) {
  if (!sets.length) return null
  const total = sets.reduce((n, s) => n + s.frames.length, 0)
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {total} frame {total === 1 ? 'prompt' : 'prompts'} in {sets.length} {sets.length === 1 ? 'animation' : 'animations'}
        </h2>
        <CopyButton disabled={blocked} onCopy={onCopyAll} label="Copy all" />
      </div>
      <ol className="flex flex-col gap-2">
        {sets.map(({ spec, frames }, setIndex) => {
          const name = spec.name.trim() || 'Untitled'
          const mirrored = frames.filter((f) => f.basedOn !== null).length
          return (
            <li key={spec.id} className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <details open={setIndex === 0} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 select-none">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {name} · {frames.length} frames{spec.loop ? ', loop' : ''}
                    {mirrored > 0 && (
                      <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                        Generate frames 1 to {frames.length - mirrored} first. The last {mirrored} each build on one of them.
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={blocked}
                    onClick={(e) => {
                      e.preventDefault()
                      onCopy(joinBatch(frames.map((f) => f.prompt)), `Copied ${frames.length} ${name} frame prompts`)
                    }}
                  >
                    Copy {frames.length}
                  </button>
                </summary>
                <ol className="flex flex-col gap-3 border-t border-slate-200 px-3 py-2 dark:border-slate-700">
                  {frames.map((frame) => (
                    <li key={frame.index} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Frame {frame.index + 1}
                          {frame.basedOn !== null && (
                            <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                              attach frame {frame.basedOn + 1} too
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          className={buttonClass}
                          disabled={blocked}
                          onClick={() => onCopy(frame.prompt, `Copied ${name} frame ${frame.index + 1}`)}
                        >
                          Copy
                        </button>
                      </div>
                      <pre
                        data-testid="frame-prompt"
                        className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        {frame.prompt}
                      </pre>
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          )
        })}
      </ol>
    </>
  )
}
