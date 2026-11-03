import type { ComponentProps } from 'react'
import { DynamicSurveyForm } from './DynamicSurveyForm'
import './survey-entry.css'

function focusFirstQuestion(node: HTMLElement | null) {
  if (!node) return
  const heading = node.querySelector<HTMLElement>('h1, h2, h3')
  if (heading) {
    heading.tabIndex = -1
    heading.focus({ preventScroll: true })
  }
  window.scrollTo({ top: 0, behavior: 'instant' })
}

/** The form boundary owns keyboard focus after the welcome has exited. */
export function SurveyFormEntry(props: ComponentProps<typeof DynamicSurveyForm>) {
  return (
    <main className="survey-entry" ref={focusFirstQuestion} aria-label="Вопросы опроса">
      <DynamicSurveyForm {...props} />
    </main>
  )
}
