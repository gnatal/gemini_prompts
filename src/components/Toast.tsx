export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
      {message && (
        <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
          {message}
        </div>
      )}
    </div>
  )
}
