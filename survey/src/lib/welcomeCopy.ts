interface WelcomeCopyInput {
  title: string
  sub: string
  btnLabel: string
  hintLeft: string
  hintRight: string
  questionCount?: number
}

export function questionLabel(count: number): string {
  const n = Math.abs(count) % 100
  const last = n % 10
  const word = n >= 11 && n <= 14 ? 'вопросов' : last === 1 ? 'вопрос' : last >= 2 && last <= 4 ? 'вопроса' : 'вопросов'
  return `${count} ${word}`
}

/** Refresh the original CRM template only; authored survey copy stays intact. */
export function welcomeCopy(input: WelcomeCopyInput) {
  const originalTemplate = input.title.trim() === 'Помогите нам стать лучше для вас'
  const originalSub = /^Пройдите короткий опрос из \d+ вопросов — и мы подберём лучшее CRM-решение для вас\.$/.test(input.sub.trim())
  return {
    title: originalTemplate ? 'Подберём CRM под задачи бизнеса' : input.title,
    sub: originalTemplate && originalSub
      ? 'Расскажите, как вы работаете с клиентами. Ваши ответы помогут нам предложить подходящее решение.'
      : input.sub,
    btnLabel: originalTemplate && input.btnLabel === 'Начать опрос' ? 'Начать подбор' : input.btnLabel,
    count: input.questionCount ? questionLabel(input.questionCount) : '',
    hintLeft: input.hintLeft === '2 минуты' ? 'около 2 минут' : input.hintLeft,
    hintRight: input.hintRight === 'данные в безопасности' ? 'Без регистрации' : input.hintRight,
  }
}
