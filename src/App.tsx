import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { AnimationPanel } from './components/AnimationPanel'
import { AssetSection } from './components/AssetSection'
import { BatchPanel } from './components/BatchPanel'
import { CharacterSection } from './components/CharacterSection'
import { FeedbackContext, type Feedback } from './components/feedback'
import { GluePanel } from './components/GluePanel'
import { buttonClass } from './components/Field'
import { LintSummary } from './components/LintSummary'
import type { ProfileControls } from './components/ProfileBar'
import { PastePromptPanel } from './components/PastePromptPanel'
import { CopyButton, PromptPreview } from './components/PromptPreview'
import { StyleSection } from './components/StyleSection'
import { Toast } from './components/Toast'
import { defaultAsset, defaultCharacter, defaultStyle } from './config/defaults'
import { animationAsset, buildAnimationSet, validateAnimations } from './lib/buildAnimations'
import { buildBatch, joinBatch, parseActions } from './lib/buildBatch'
import { buildFrameSet, validateFrameMode } from './lib/buildFrames'
import { buildPrompt } from './lib/buildPrompt'
import { copyText, downloadText } from './lib/clipboard'
import { deepEqual } from './lib/deepEqual'
import { lint } from './lib/lint'
import { parsePrompt } from './lib/parsePrompt'
import { getPath } from './lib/path'
import { toCharacterData, toStyleData, uniqueName } from './lib/profiles'
import {
  exportProfiles,
  loadAnimations,
  loadState,
  mergeProfiles,
  newId,
  parseImport,
  saveAnimations,
  saveAssetDraft,
  saveCharacters,
  saveSelection,
  saveStyles,
} from './lib/storage'
import { validateForm } from './schemas'
import type { CharacterProfile, FormValues, StyleProfile } from './types'

function loadInitial() {
  const stored = loadState()
  const style = stored.styles.find((s) => s.id === stored.selection.styleId)
  const character = stored.characters.find((c) => c.id === stored.selection.characterId)
  const values: FormValues = {
    style: style ? toStyleData(style) : defaultStyle(),
    character: character ? toCharacterData(character) : defaultCharacter(),
    asset: stored.asset ? { ...defaultAsset(), ...stored.asset } : defaultAsset(),
  }
  return { stored, values }
}

type Tab = 'single' | 'batch' | 'animations' | 'glue'

const TAB_LABELS: Record<Tab, string> = { single: 'Single prompt', batch: 'Batch', animations: 'Animations', glue: 'Glue' }
type Notice = { kind: 'error' | 'info'; text: string }

export default function App() {
  const [initial] = useState(loadInitial)
  const form = useForm<FormValues>({ defaultValues: initial.values, mode: 'onChange' })
  // defaultValues are complete, so the watched values always hold every field.
  const values = useWatch({ control: form.control }) as FormValues
  const { touchedFields, dirtyFields } = form.formState

  const [styles, setStyles] = useState<StyleProfile[]>(initial.stored.styles)
  const [characters, setCharacters] = useState<CharacterProfile[]>(initial.stored.characters)
  const [styleId, setStyleId] = useState(initial.stored.selection.styleId)
  const [characterId, setCharacterId] = useState(initial.stored.selection.characterId)
  const [tab, setTab] = useState<Tab>('single')
  const [batchText, setBatchText] = useState('')
  const [animationSettings, setAnimationSettings] = useState(loadAnimations)
  const { animations, layout, output } = animationSettings
  const [toast, setToast] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const importInput = useRef<HTMLInputElement>(null)

  // Persistence
  useEffect(() => void saveStyles(styles), [styles])
  useEffect(() => void saveCharacters(characters), [characters])
  useEffect(() => void saveSelection({ styleId, characterId }), [styleId, characterId])
  useEffect(() => void saveAnimations(animationSettings), [animationSettings])
  const assetJson = JSON.stringify(values.asset)
  useEffect(() => void saveAssetDraft(JSON.parse(assetJson)), [assetJson])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Derived output
  const prompt = buildPrompt(values.style, values.character, values.asset)
  const issues = validateForm(values)
  const warnings = lint(values)
  const actions = parseActions(batchText)
  const batchPrompts = buildBatch(values.style, values.character, values.asset, actions)
  // In batch mode each line supplies the action, so only the other rules apply.
  const batchIssues = actions.length
    ? validateForm({ ...values, asset: { ...values.asset, action: actions[0] } })
    : []
  const animationPrompts = buildAnimationSet(values.style, values.character, values.asset, animations, layout)
  // Each animation supplies its own action, frames and framing, so only the other form rules apply.
  const firstAnimation = animationPrompts[0]?.spec
  const frameSets = output === 'frames' ? buildFrameSet(values.style, values.character, values.asset, animations) : []
  const animationIssues = [
    ...validateAnimations(animations),
    ...(output === 'frames' ? validateFrameMode(animations) : []),
    ...(firstAnimation ? validateForm({ ...values, asset: animationAsset(values.asset, firstAnimation, layout) }) : []),
  ]

  const feedback: Feedback = {
    warnings,
    issues,
    showErrorFor: (field) => Boolean(getPath(touchedFields, field) || getPath(dirtyFields, field)),
  }

  const showToast = (message: string) => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 1600)
  }

  const copy = async (text: string, label = 'Copied') => {
    const ok = await copyText(text)
    showToast(ok ? label : 'Copy failed. Select the text and copy it by hand.')
  }

  const replaceForm = (patch: Partial<FormValues>) => form.reset({ ...form.getValues(), ...patch })

  // Style profiles
  const selectedStyle = styles.find((s) => s.id === styleId)
  const styleProfile: ProfileControls = {
    profiles: styles,
    selectedId: styleId,
    isDirty: selectedStyle ? !deepEqual(toStyleData(selectedStyle), values.style) : false,
    onSelect: (id) => {
      setStyleId(id)
      const profile = styles.find((s) => s.id === id)
      if (profile) replaceForm({ style: toStyleData(profile) })
    },
    onSave: () => {
      if (!styleId) return
      const data = form.getValues('style')
      setStyles((list) => list.map((s) => (s.id === styleId ? { ...structuredClone(data), id: styleId } : s)))
      showToast('Style saved')
    },
    onSaveAsNew: () => {
      const data = form.getValues('style')
      const name = uniqueName(data.name, styles.map((s) => s.name), 'Untitled style')
      const id = newId()
      if (name !== data.name) form.setValue('style.name', name)
      setStyles((list) => [...list, { ...structuredClone(data), name, id }])
      setStyleId(id)
      showToast(`Saved style “${name}”`)
    },
    onDelete: () => {
      if (!selectedStyle || !window.confirm(`Delete the style “${selectedStyle.name || 'untitled'}”?`)) return
      setStyles((list) => list.filter((s) => s.id !== selectedStyle.id))
      setStyleId(null)
      showToast('Style deleted')
    },
  }

  // Character profiles
  const selectedCharacter = characters.find((c) => c.id === characterId)
  const characterProfile: ProfileControls = {
    profiles: characters,
    selectedId: characterId,
    isDirty: selectedCharacter ? !deepEqual(toCharacterData(selectedCharacter), values.character) : false,
    onSelect: (id) => {
      setCharacterId(id)
      const profile = characters.find((c) => c.id === id)
      if (profile) replaceForm({ character: toCharacterData(profile) })
    },
    onSave: () => {
      if (!characterId) return
      const data = form.getValues('character')
      setCharacters((list) =>
        list.map((c) => (c.id === characterId ? { ...structuredClone(data), id: characterId } : c)),
      )
      showToast('Character saved')
    },
    onSaveAsNew: () => {
      // The name is part of the prompt, so it is never renamed automatically.
      const data = form.getValues('character')
      const id = newId()
      setCharacters((list) => [...list, { ...structuredClone(data), id }])
      setCharacterId(id)
      showToast(`Saved character “${data.name.trim() || 'untitled'}”`)
    },
    onDelete: () => {
      if (!selectedCharacter || !window.confirm(`Delete the character “${selectedCharacter.name || 'untitled'}”?`))
        return
      setCharacters((list) => list.filter((c) => c.id !== selectedCharacter.id))
      setCharacterId(null)
      showToast('Character deleted')
    },
  }

  // Fill from a pasted prompt
  const fillFromPrompt = (text: string): string | null => {
    const result = parsePrompt(text, form.getValues())
    if (!result.filled.length) {
      return 'No fields found. Paste a prompt with lines like “Name: Rex Ranger” or “Action: running”.'
    }
    replaceForm(result.values)
    setPasteOpen(false)
    const filled = result.filled.join(', ').replace(/, ([^,]*)$/, ' and $1')
    setNotice({ kind: 'info', text: [`Filled ${filled} from the prompt.`, ...result.notes].join(' ') })
    return null
  }

  // Export / import
  const onExport = () => {
    const date = new Date().toISOString().slice(0, 10)
    downloadText(`asset-prompt-builder-profiles-${date}.json`, exportProfiles(styles, characters))
    showToast(`Exported ${styles.length + characters.length} profiles`)
  }

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow importing the same file again
    if (!file) return
    let text: string
    try {
      text = await file.text()
    } catch {
      setNotice({ kind: 'error', text: `Couldn't read “${file.name}”.` })
      return
    }
    const result = parseImport(text)
    if (!result.ok) {
      setNotice({ kind: 'error', text: `Import failed: ${result.error}` })
      return
    }
    setStyles((list) => mergeProfiles(list, result.styles))
    setCharacters((list) => mergeProfiles(list, result.characters))

    // In a fresh browser nothing is selected yet: pick the first imported profiles.
    const patch: Partial<FormValues> = {}
    if (!styleId && result.styles[0]) {
      setStyleId(result.styles[0].id)
      patch.style = toStyleData(result.styles[0])
    }
    if (!characterId && result.characters[0]) {
      setCharacterId(result.characters[0].id)
      patch.character = toCharacterData(result.characters[0])
    }
    if (patch.style || patch.character) replaceForm(patch)

    const s = result.styles.length
    const c = result.characters.length
    setNotice({
      kind: 'info',
      text: `Imported ${s} ${s === 1 ? 'style' : 'styles'} and ${c} ${c === 1 ? 'character' : 'characters'}.`,
    })
  }

  const singleBlocked = issues.length > 0
  const batchBlocked = batchIssues.length > 0 || batchPrompts.length === 0
  const copyAll = () =>
    copy(joinBatch(batchPrompts), `Copied ${batchPrompts.length} ${batchPrompts.length === 1 ? 'prompt' : 'prompts'}`)
  const framePrompts = frameSets.flatMap((s) => s.frames.map((f) => f.prompt))
  const animationOutputCount = output === 'frames' ? framePrompts.length : animationPrompts.length
  const animationsBlocked = animationIssues.length > 0 || animationOutputCount === 0
  const copyAllAnimations = () =>
    output === 'frames'
      ? copy(joinBatch(framePrompts), `Copied ${framePrompts.length} frame ${framePrompts.length === 1 ? 'prompt' : 'prompts'}`)
      : copy(
          joinBatch(animationPrompts.map((a) => a.prompt)),
          `Copied ${animationPrompts.length} animation ${animationPrompts.length === 1 ? 'prompt' : 'prompts'}`,
        )

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <h1 className="text-lg font-bold">Asset Prompt Builder</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Consistent image generation prompts for game assets
            </p>
          </div>
          <button
            type="button"
            className={buttonClass}
            aria-expanded={pasteOpen}
            onClick={() => setPasteOpen((open) => !open)}
          >
            Fill from prompt
          </button>
          <button type="button" className={buttonClass} onClick={onExport}>
            Export profiles
          </button>
          <button type="button" className={buttonClass} onClick={() => importInput.current?.click()}>
            Import profiles
          </button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="import-input"
            onChange={onImportFile}
          />
        </div>
      </header>

      {pasteOpen && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <PastePromptPanel onFill={fillFromPrompt} onClose={() => setPasteOpen(false)} />
        </div>
      )}

      {notice && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div
            role={notice.kind === 'error' ? 'alert' : 'status'}
            className={
              'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ' +
              (notice.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                : 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200')
            }
          >
            <p className="flex-1">{notice.text}</p>
            <button type="button" className="font-medium underline" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <FormProvider {...form}>
        <FeedbackContext.Provider value={feedback}>
          <main className="mx-auto grid max-w-7xl gap-6 px-4 py-4 pb-28 lg:grid-cols-2 lg:pb-8">
            <form className="flex min-w-0 flex-col gap-4" onSubmit={(e) => e.preventDefault()} noValidate>
              <StyleSection profile={styleProfile} />
              <CharacterSection profile={characterProfile} />
              <AssetSection />
            </form>

            <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
              <div role="tablist" aria-label="Output mode" className="flex gap-1 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
                {(['single', 'batch', 'animations', 'glue'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={
                      'flex-1 rounded-md px-3 py-1.5 text-sm font-medium ' +
                      (tab === t
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
                    }
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>

              {tab !== 'glue' && <LintSummary warnings={warnings} />}

              {tab === 'single' && <PromptPreview prompt={prompt} issues={issues} onCopy={() => copy(prompt)} />}
              {tab === 'batch' && (
                <BatchPanel
                  text={batchText}
                  onTextChange={setBatchText}
                  prompts={batchPrompts}
                  issues={batchIssues}
                  onCopy={copy}
                  onCopyAll={copyAll}
                />
              )}
              {tab === 'animations' && (
                <AnimationPanel
                  animations={animations}
                  onChange={(list) => setAnimationSettings((s) => ({ ...s, animations: list }))}
                  layout={layout}
                  onLayoutChange={(next) => setAnimationSettings((s) => ({ ...s, layout: next }))}
                  output={output}
                  onOutputChange={(next) => setAnimationSettings((s) => ({ ...s, output: next }))}
                  frameSets={frameSets}
                  hasReferenceImage={values.character.hasReferenceImage}
                  onOpenGlue={() => setTab('glue')}
                  view={values.asset.view}
                  onUseSideView={() => form.setValue('asset.view', 'side-right', { shouldDirty: true })}
                  prompts={animationPrompts}
                  issues={animationIssues}
                  onCopy={copy}
                  onCopyAll={copyAllAnimations}
                />
              )}
              {/* Kept mounted so loaded frames survive switching tabs. */}
              <div hidden={tab !== 'glue'}>
                <GluePanel />
              </div>
            </aside>
          </main>
        </FeedbackContext.Provider>
      </FormProvider>

      {/* Mobile: sticky copy bar */}
      <div
        hidden={tab === 'glue'}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95"
      >
        {tab === 'single' && (
          <CopyButton disabled={singleBlocked} onCopy={() => copy(prompt)} className="w-full py-2.5" />
        )}
        {tab === 'batch' && (
          <CopyButton
            disabled={batchBlocked}
            onCopy={copyAll}
            label={`Copy all (${batchPrompts.length})`}
            className="w-full py-2.5"
          />
        )}
        {tab === 'animations' && (
          <CopyButton
            disabled={animationsBlocked}
            onCopy={copyAllAnimations}
            label={`Copy all (${animationOutputCount})`}
            className="w-full py-2.5"
          />
        )}
      </div>

      <Toast message={toast} />
    </div>
  )
}
