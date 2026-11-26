import { useState } from 'react'
import { ANIMATION_PRESETS, defaultAnimations } from '../config/animations'
import { FIELD_HELP } from '../config/fieldHelp'
import { gridFor } from '../config/assetPresets'
import { VIEW_LABELS } from '../config/labels'
import { type AnimationPrompt, isSideView, usableKeyPoses } from '../lib/buildAnimations'
import { newId } from '../lib/storage'
import type { AnimationSpec, FrameLayout, View } from '../types'
import { buttonClass, inputClass } from './Field'
import { InfoTip } from './InfoTip'
import { PromptList } from './PromptList'
import { type BlockingIssue, BlockingIssues } from './PromptPreview'

interface AnimationPanelProps {
  animations: AnimationSpec[]
  onChange: (animations: AnimationSpec[]) => void
  layout: FrameLayout
  onLayoutChange: (layout: FrameLayout) => void
  /** The view from the Asset section, shared by every animation. */
  view: View
  onUseSideView: () => void
  prompts: AnimationPrompt[]
  issues: BlockingIssue[]
  onCopy: (text: string, label: string) => void
  onCopyAll: () => void
}

const PRESET_IDS = new Set(ANIMATION_PRESETS.map((p) => p.id))
const DEFAULT_CUSTOM_FRAMES = 6

function parseFrames(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function posesHint(spec: AnimationSpec): string {
  const lines = spec.keyPoses.map((p) => p.trim()).filter(Boolean).length
  if (!lines) return 'No frame poses. The prompt describes the motion only.'
  if (usableKeyPoses(spec).length) return `${lines} poses for ${lines} frames. Each frame gets its own pose line.`
  return `${lines} poses but ${spec.frames ?? 0} frames, so the poses are left out. Match the counts to use them.`
}

const LAYOUTS: { value: FrameLayout; label: string; hint: string }[] = [
  { value: 'grid', label: 'Grid', hint: 'Equal square cells, e.g. 8 frames as 4×2. Easy to cut, and fits image models that cap the aspect ratio.' },
  { value: 'row', label: 'One row', hint: 'All frames side by side (N:1). Very wide sheets often come out squashed or unevenly spaced.' },
]

function layoutSummary(frames: number | undefined, layout: FrameLayout): string {
  if (!frames) return ''
  if (layout === 'row') return `${frames} frames`
  const { columns, rows } = gridFor(frames)
  return `${frames} frames, ${columns}×${rows} grid`
}

export function AnimationPanel({
  animations,
  onChange,
  layout,
  onLayoutChange,
  view,
  onUseSideView,
  prompts,
  issues,
  onCopy,
  onCopyAll,
}: AnimationPanelProps) {
  const [newName, setNewName] = useState('')
  const blocked = issues.length > 0
  const enabledCount = animations.filter((a) => a.enabled).length

  const update = (id: string, patch: Partial<AnimationSpec>) =>
    onChange(animations.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const setAll = (enabled: boolean) => onChange(animations.map((a) => ({ ...a, enabled })))

  const reset = () => {
    if (window.confirm('Reset the animation list to the presets? Custom animations and edits are removed.')) {
      onChange(defaultAnimations())
    }
  }

  const addCustom = () => {
    const name = newName.trim()
    if (!name) return
    onChange([
      ...animations,
      { id: newId(), name, enabled: true, frames: DEFAULT_CUSTOM_FRAMES, loop: false, motion: '', keyPoses: [] },
    ])
    setNewName('')
  }

  return (
    <section aria-label="Animations" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Animation sprite sheets</h2>
          <InfoTip label="animations" help={FIELD_HELP['animations.list']} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          One sprite strip prompt per animation. View, held items, background, lighting and exclusions come from the
          Asset section. {enabledCount} of {animations.length} on.
        </p>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Sheet layout</legend>
        <div className="flex gap-1 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
          {LAYOUTS.map((l) => (
            <label
              key={l.value}
              className={
                'flex-1 cursor-pointer rounded-md px-3 py-1 text-center text-sm font-medium ' +
                (layout === l.value
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
              }
            >
              <input
                type="radio"
                name="animation-layout"
                value={l.value}
                checked={layout === l.value}
                onChange={() => onLayoutChange(l.value)}
                className="sr-only"
              />
              {l.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{LAYOUTS.find((l) => l.value === layout)?.hint}</p>
      </fieldset>

      {!isSideView(view) && (
        <div
          role="status"
          className="flex flex-col items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p>
            ⚠ The view is “{VIEW_LABELS[view]}”. Walk, run and dash cycles read best from the side: in other views the
            model loses track of which leg leads, and the same leg ends up in front in every frame.
          </p>
          <button type="button" className={buttonClass} onClick={onUseSideView}>
            Use side view, facing right
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={() => setAll(true)}>
          All on
        </button>
        <button type="button" className={buttonClass} onClick={() => setAll(false)}>
          All off
        </button>
        <button type="button" className={buttonClass} onClick={reset}>
          Reset to presets
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
        {animations.map((spec) => {
          const name = spec.name.trim() || 'Untitled animation'
          const rowIssues = issues.filter((i) => i.field === `animations.${spec.id}`)
          return (
            <li key={spec.id} data-field={`animations.${spec.id}`} className="flex flex-col gap-2 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex min-w-28 flex-1 items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={spec.enabled}
                    onChange={(e) => update(spec.id, { enabled: e.target.checked })}
                    aria-label={`Include ${name}`}
                  />
                  {name}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  Frames
                  <input
                    type="number"
                    min={2}
                    max={12}
                    step={1}
                    inputMode="numeric"
                    className={`${inputClass} w-16`}
                    value={spec.frames ?? ''}
                    onChange={(e) => update(spec.id, { frames: parseFrames(e.target.value) })}
                    aria-label={`${name} frames`}
                    aria-invalid={rowIssues.length > 0 || undefined}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={spec.loop}
                    onChange={(e) => update(spec.id, { loop: e.target.checked })}
                    aria-label={`${name} loops`}
                  />
                  Loop
                </label>
                {!PRESET_IDS.has(spec.id) && (
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    onClick={() => onChange(animations.filter((a) => a.id !== spec.id))}
                    aria-label={`Remove ${name}`}
                  >
                    Remove
                  </button>
                )}
              </div>

              {spec.enabled &&
                rowIssues.map((issue, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400">
                    {issue.message}
                  </p>
                ))}

              <details className="group text-xs">
                <summary className="cursor-pointer text-slate-500 select-none hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
                  Motion and frame poses
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Name</span>
                    <input
                      className={inputClass}
                      value={spec.name}
                      onChange={(e) => update(spec.id, { name: e.target.value })}
                      aria-label={`${name} name`}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Motion</span>
                    <input
                      className={inputClass}
                      value={spec.motion}
                      placeholder="what happens over the whole animation"
                      onChange={(e) => update(spec.id, { motion: e.target.value })}
                      aria-label={`${name} motion`}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Frame poses, one per line</span>
                    <textarea
                      rows={Math.min(Math.max(spec.keyPoses.length, 3), 12)}
                      className={`${inputClass} font-mono text-xs`}
                      value={spec.keyPoses.join('\n')}
                      placeholder={'frame 1 pose\nframe 2 pose\n...'}
                      onChange={(e) => update(spec.id, { keyPoses: e.target.value.split('\n') })}
                      aria-label={`${name} frame poses`}
                    />
                  </label>
                  <p className="text-slate-500 dark:text-slate-400">{posesHint(spec)}</p>
                </div>
              </details>
            </li>
          )
        })}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          addCustom()
        }}
      >
        <input
          className={inputClass}
          value={newName}
          placeholder="Custom animation, e.g. wall slide"
          onChange={(e) => setNewName(e.target.value)}
          aria-label="New animation name"
        />
        <button type="submit" className={buttonClass} disabled={!newName.trim()}>
          Add
        </button>
      </form>

      <BlockingIssues issues={issues.filter((i) => !i.field.startsWith('animations.'))} />
      {blocked && issues.every((i) => i.field.startsWith('animations.')) && (
        <p role="status" className="text-sm text-red-700 dark:text-red-400">
          Fix the animations marked above to copy.
        </p>
      )}

      <PromptList
        items={prompts.map(({ spec, prompt }) => {
          const title = `${spec.name.trim() || 'Untitled'} · ${layoutSummary(spec.frames, layout)}${spec.loop ? ', loop' : ''}`
          return { title, prompt, copiedLabel: `Copied ${spec.name.trim() || 'animation'} prompt` }
        })}
        blocked={blocked}
        testId="animation-prompt"
        onCopy={onCopy}
        onCopyAll={onCopyAll}
      />
    </section>
  )
}
