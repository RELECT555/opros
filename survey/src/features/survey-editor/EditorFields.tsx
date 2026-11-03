import { useId } from 'react'

export function QField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const inputId = useId()
  return (
    <div className="qed-field">
      <label className="qed-field-label" htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        className="qed-field-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={label + '...'}
      />
    </div>
  )
}

export function CheckboxIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <rect x="0.75" y="0.75" width="9.5" height="9.5" rx="2.25" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M3 5.5l1.8 1.8L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function RadioIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4.75" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="5.5" cy="5.5" r="2.5" fill="currentColor"/>
    </svg>
  )
}

export function TextIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M1.5 3h8M1.5 5.5h8M1.5 8h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

export function ScaleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <rect x="1" y="7" width="1.5" height="3" rx="0.5" fill="currentColor"/>
      <rect x="3.5" y="5" width="1.5" height="5" rx="0.5" fill="currentColor"/>
      <rect x="6" y="3" width="1.5" height="7" rx="0.5" fill="currentColor"/>
      <rect x="8.5" y="1" width="1.5" height="9" rx="0.5" fill="currentColor"/>
    </svg>
  )
}
