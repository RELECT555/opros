import { easeOut } from 'framer-motion'
import type { DynamicFormData } from './types'

export const phoneRegex = /^[\d\s\+\-\(\)]{7,}$/

export const slideVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 48 : -48,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.32, ease: easeOut },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -48 : 48,
    transition: { duration: 0.22, ease: easeOut },
  }),
}

export function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

export function scaleColor(ratio: number): string {
  if (ratio < 0.6) {
    const t = ratio / 0.6
    const r = Math.round(91 + (155 - 91) * t)
    const g = Math.round(115 + (109 - 115) * t)
    const b = Math.round(249 + (255 - 249) * t)
    return `rgb(${r},${g},${b})`
  }

  const t = (ratio - 0.6) / 0.4
  const r = Math.round(155 + (192 - 155) * t)
  const g = Math.round(109 + (132 - 109) * t)
  const b = Math.round(255 + (252 - 255) * t)
  return `rgb(${r},${g},${b})`
}

export function isContactsDone(form: DynamicFormData): boolean {
  return form.name.trim().length > 0 && phoneRegex.test(form.phone.trim())
}
