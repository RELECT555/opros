import type { Survey } from '../lib/supabase'

export const welcomeSurvey: Survey = {
  id: -1,
  slug: '__preview_crm',
  title: 'CRM-консультация — локальный пример',
  is_active: true,
  created_at: '2026-11-02T00:00:00Z',
  config: {
    welcome_title: 'Помогите нам стать лучше для вас',
    welcome_sub: 'Пройдите короткий опрос из 4 вопросов — и мы подберём лучшее CRM-решение для вас.',
    design: {
      accent: '#ec4899',
      accent2: '#f43f5e',
      bg: '#10070b',
      text: '#fce7f3',
      text2: '#b9809d',
    },
    questions: [
      { id: 'purpose', type: 'checkbox', title: 'Для чего вам нужна CRM?', options: ['Управление продажами', 'Работа с клиентской базой', 'Аналитика и отчёты'] },
      { id: 'experience', type: 'checkbox', title: 'Какими CRM вы пользовались?', options: ['Bitrix24', 'amoCRM', 'Не пользовались'] },
      { id: 'situation', type: 'radio', title: 'Как вы работаете сейчас?', options: ['Уже используем CRM', 'Выбираем первую CRM', 'Хотим сменить CRM'] },
    ],
  },
}
