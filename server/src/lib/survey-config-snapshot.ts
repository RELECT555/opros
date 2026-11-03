import type { SurveyConfigData } from '../types/models.js'
import { respondentQuestions } from './response-validation.js'

/** Historical answering contract, without duplicating decorative/page-layout data. */
export function surveyConfigSnapshot(config: SurveyConfigData): SurveyConfigData {
  return structuredClone({
    questions: respondentQuestions(config),
    contacts_block: config.contacts_block,
    legacy_analytics: config.legacy_analytics,
  })
}
