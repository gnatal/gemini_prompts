import { useEffect, useRef, useState } from 'react'
import { buttonClass, inputClass, primaryButtonClass } from './Field'

interface PastePromptPanelProps {
  /** Fills the form from the text. Returns an error message when nothing could be read. */
  onFill: (text: string) => string | null
  onClose: () => void
}

/** A textarea that reads a prompt back into the form. */
export function PastePromptPanel({ onFill, onClose }: PastePromptPanelProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  useEffect(() => textarea.current?.focus(), [])

  const fill = () => {
    const message = onFill(text)
    if (message) setError(message)
  }

  return (
    <section
      aria-label="Fill from prompt"
      className="flex flex-col gap-2 rounded-xl border border-indigo-200 bg-white p-4 shadow-xs dark:border-indigo-900 dark:bg-slate-900"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div>
        <h2 className="text-sm font-semibold">Fill from prompt</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Paste a prompt made here, or one you edited by hand. Lines like <code>Action: running</code> are read into
          the matching fields. Each of the Style, Character and Asset blocks found in the text replaces that whole
          section, and missing blocks are left as they are. Saved profiles are not changed.
        </p>
      </div>
      <textarea
        ref={textarea}
        rows={10}
        className={`${inputClass} font-mono text-xs`}
        placeholder={'[STYLE]\nArt style: Pixel art, 64x64 sprite resolution\n...\n\n[CHARACTER]\nName: ...\n\n[ASSET]\nAction: running'}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setError(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) fill()
        }}
        aria-label="Prompt to read"
      />
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className={buttonClass} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={primaryButtonClass} disabled={!text.trim()} onClick={fill}>
          Fill form
        </button>
      </div>
    </section>
  )
}
