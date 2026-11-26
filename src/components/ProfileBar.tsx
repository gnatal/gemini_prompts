import { FIELD_HELP } from '../config/fieldHelp'
import { buttonClass, inputClass } from './Field'
import { InfoTip } from './InfoTip'

export interface ProfileBarProps {
  kind: 'style' | 'character'
  profiles: { id: string; name: string }[]
  selectedId: string | null
  isDirty: boolean
  onSelect: (id: string | null) => void
  onSave: () => void
  onSaveAsNew: () => void
  onDelete: () => void
}

export function ProfileBar({
  kind,
  profiles,
  selectedId,
  isDirty,
  onSelect,
  onSave,
  onSaveAsNew,
  onDelete,
}: ProfileBarProps) {
  const id = `${kind}-profile`
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
      <label htmlFor={id} className="sr-only">
        Saved {kind} profile
      </label>
      <select
        id={id}
        className={`${inputClass} min-w-40 flex-1`}
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        <option value="">{profiles.length ? `Unsaved ${kind}` : `No saved ${kind}s yet`}</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name || '(untitled)'}
          </option>
        ))}
      </select>
      {selectedId && isDirty && (
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400" title="The form differs from the saved profile">
          Unsaved changes
        </span>
      )}
      <div className="flex gap-2">
        <button type="button" className={buttonClass} onClick={onSave} disabled={!selectedId || !isDirty}>
          Save
        </button>
        <button type="button" className={buttonClass} onClick={onSaveAsNew}>
          Save as new
        </button>
        <button
          type="button"
          className={`${buttonClass} text-red-700 dark:text-red-400`}
          onClick={onDelete}
          disabled={!selectedId}
        >
          Delete
        </button>
      </div>
      <InfoTip label={`saved ${kind}s`} help={FIELD_HELP[`${kind}.profile`]} />
    </div>
  )
}

export type ProfileControls = Omit<ProfileBarProps, 'kind'>
