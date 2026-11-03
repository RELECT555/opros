import { useBackgroundMotion } from '../../lib/useBackgroundMotion'

export function BackgroundMotionToggle() {
  const [enabled, setEnabled] = useBackgroundMotion()
  return (
    <button
      type="button"
      className="welcome-intro__motion-toggle"
      aria-pressed={enabled}
      aria-label="Анимация фона"
      onClick={() => setEnabled(!enabled)}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
        {enabled
          ? <path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2" />
          : <path d="m5 3 8 5-8 5V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />}
      </svg>
      Анимация фона: {enabled ? 'вкл.' : 'выкл.'}
    </button>
  )
}
