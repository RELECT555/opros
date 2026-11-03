import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, easeOut, motion } from 'framer-motion'

interface Props {
  open: boolean
  dialogKey: string
  labelledBy: string
  describedBy?: string
  style?: CSSProperties
  backdropDuration?: number
  dialogDuration?: number
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]'

/** Presentation boundary: portal, animation and keyboard focus; no survey mutations. */
export function SurveyDialogFrame({ open, dialogKey, labelledBy, describedBy, style,
  backdropDuration = 0.18, dialogDuration = 0.22, onClose, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) {
      const initial = dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? dialog.querySelector<HTMLElement>(FOCUSABLE)
      const target = initial ?? dialog
      target.focus()
    }
    return () => {
      document.body.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const elements = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    if (!elements.length) { event.preventDefault(); dialogRef.current?.focus(); return }
    const first = elements[0], last = elements[elements.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key={dialogKey} className="surveys-onboard-root" role="presentation"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: backdropDuration }} onClick={onClose}>
          <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
            aria-describedby={describedBy} tabIndex={-1} className="surveys-onboard-dialog" style={style}
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: dialogDuration, ease: easeOut }}
            onKeyDown={handleKeyDown} onClick={event => event.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>, document.body,
  )
}
