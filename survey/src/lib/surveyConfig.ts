export interface Q1Config { title: string; sub: string; options: string[] }
export interface Q2Config { title: string; sub: string; options: string[] }
export interface Q3Config { title: string; sub: string; options: { value: string; label: string }[] }

export interface SurveyConfig {
  q1: Q1Config
  q2: Q2Config
  q3: Q3Config
}

export const DEFAULTS: SurveyConfig = {
  q1: {
    title: 'Для чего вам нужна CRM?',
    sub: 'Выберите всё подходящее',
    options: [
      'Управление продажами',
      'Работа с клиентской базой',
      'Автоматизация маркетинга',
      'Поддержка и сервис',
      'Контроль задач и команды',
      'Аналитика и отчёты',
    ],
  },
  q2: {
    title: 'Какими CRM пользовались раньше?',
    sub: 'Можно выбрать несколько',
    options: [
      'Bitrix24', 'amoCRM', 'Salesforce', 'HubSpot',
      'МойСклад', '1С CRM', 'Pipedrive', 'Другая',
      'Не использовал(а)',
    ],
  },
  q3: {
    title: 'Текущая ситуация',
    sub: 'Один вариант',
    options: [
      { value: 'yes',      label: 'Да, используем CRM' },
      { value: 'no',       label: 'Нет, работаем без CRM' },
      { value: 'looking',  label: 'Выбираем CRM прямо сейчас' },
      { value: 'switching',label: 'Хотим сменить текущую' },
    ],
  },
}

import { getConfig, setConfig } from './api-client'

export function mergeWithDefaults(raw: Partial<SurveyConfig>): SurveyConfig {
  return {
    q1: { ...DEFAULTS.q1, ...raw.q1 },
    q2: { ...DEFAULTS.q2, ...raw.q2 },
    q3: { ...DEFAULTS.q3, ...raw.q3 },
  }
}

export async function loadConfigRemote(): Promise<SurveyConfig> {
  const raw = await getConfig()
  if (!raw || Object.keys(raw).length === 0) return DEFAULTS
  return mergeWithDefaults(raw as Partial<SurveyConfig>)
}

export async function saveConfigRemote(cfg: SurveyConfig): Promise<void> {
  await setConfig(cfg)
}

// Fallback: sync load from localStorage (used as initial state while remote loads)
const KEY = 'survey_config_v1'

export function loadConfig(): SurveyConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return mergeWithDefaults(JSON.parse(raw) as Partial<SurveyConfig>)
  } catch { /* ignore */ }
  return DEFAULTS
}

export function saveConfig(cfg: SurveyConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}
