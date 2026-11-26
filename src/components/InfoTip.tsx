import { useEffect, useId, useRef, useState } from 'react'
import type { FieldHelp } from '../config/fieldHelp'

const PANEL_WIDTH = 288 // w-72

/** An (i) button that opens a small panel explaining a field, with examples. */
export function InfoTip({ label, help }: { label: string; help: FieldHelp }) {
  const [open, setOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const wrapper = useRef<HTMLSpanElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = () => {
    if (!open && button.current) {
      // Open toward the left when there isn't room on the right.
      const { left } = button.current.getBoundingClientRect()
      setAlignRight(left + PANEL_WIDTH > window.innerWidth - 16)
    }
    setOpen((o) => !o)
  }

  return (
    <span ref={wrapper} className="relative inline-flex">
      <button
        ref={button}
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
        className={
          'inline-flex size-4 items-center justify-center rounded-full border font-serif text-[10px] leading-none font-bold italic ' +
          (open
            ? 'border-indigo-500 bg-indigo-500 text-white'
            : 'border-slate-400 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-500 dark:text-slate-400 dark:hover:border-indigo-400 dark:hover:text-indigo-300')
        }
      >
        <span aria-hidden>i</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="note"
          aria-label={`About ${label}`}
          className={
            'absolute top-full z-30 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed font-normal text-slate-700 shadow-lg ' +
            'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ' +
            (alignRight ? 'right-0' : 'left-0')
          }
        >
          <p>{help.text}</p>
          {help.examples && help.examples.length > 0 && (
            <>
              <p className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
                {help.examples.length === 1 ? 'Example' : 'Examples'}
              </p>
              <ul className="mt-0.5 flex flex-col gap-0.5">
                {help.examples.map((example) => (
                  <li key={example} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-slate-900">
                    {example}
                  </li>
                ))}
              </ul>
            </>
          )}
          {help.tip && (
            <p className="mt-2 text-indigo-800 dark:text-indigo-300">
              <span className="font-semibold">Tip:</span> {help.tip}
            </p>
          )}
        </div>
      )}
    </span>
  )
}
