/* ── Shared admin UI components ───────────────────────────────── */

export function DataRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="adm-data-row">
      <span className="adm-data-label">{label}</span>
      <span className={`adm-data-value ${highlight ? 'adm-data-value--hi' : ''}`}>{value}</span>
    </div>
  )
}

export function QTitleField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="adm-field adm-field--sm">
      <label>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

export function OptionRow({ value, onChange, onRemove }: { value: string; onChange: (v: string) => void; onRemove: () => void }) {
  return (
    <div className="adm-option-row">
      <span className="adm-option-drag">⠿</span>
      <input
        className="adm-option-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Текст варианта..."
      />
      <button className="adm-option-remove" onClick={onRemove} title="Удалить">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

export function AddOptionBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="adm-add-option" onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Добавить вариант
    </button>
  )
}

export function SavedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
