import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  children: ReactNode
}

/** A collapsible form section. Uses <details> so it can be opened programmatically when focusing a field. */
export function Section({ title, subtitle, badge, children }: SectionProps) {
  return (
    <details
      open
      className="group rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
        <span className="text-slate-400 transition-transform group-open:rotate-90" aria-hidden>
          ▶
        </span>
        <span className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{title}</span>
          {subtitle && <span className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>}
        </span>
        {badge && <span className="ml-auto">{badge}</span>}
      </summary>
      <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 dark:border-slate-700">{children}</div>
    </details>
  )
}
