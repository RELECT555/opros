import type { SurveyConfigData } from './supabase'

type SaveState = { status: 'idle' | 'pending' | 'saving' | 'error'; error: string }

/** Serializes full-config writes so an older request cannot overwrite a newer edit. */
export class ConfigAutosave {
  private pending: SurveyConfigData | null = null
  private inFlight: Promise<void> | null = null
  private save: (config: SurveyConfigData) => Promise<void>
  private timer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<() => void>()
  private state: SaveState = { status: 'idle', error: '' }

  constructor(save: (config: SurveyConfigData) => Promise<void>) { this.save = save }

  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private publish(status: SaveState['status'], error = '') {
    this.state = { status, error }
    this.listeners.forEach(listener => listener())
  }

  schedule(config: SurveyConfigData) {
    this.pending = config
    this.publish('pending')
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => { void this.flush() }, 400)
  }

  flush = (): Promise<void> => {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.inFlight) return this.inFlight
    this.inFlight = this.drain().finally(() => { this.inFlight = null })
    return this.inFlight
  }

  private async drain(): Promise<void> {
    while (this.pending) {
      const config = this.pending
      this.pending = null
      this.publish('saving')
      try {
        await this.save(config)
      } catch (error) {
        // Prefer any newer edit; retain the failed write for an explicit retry.
        this.pending ??= config
        this.publish('error', error instanceof Error ? error.message : 'Ошибка сохранения')
        return
      }
    }
    this.publish('idle')
  }
}
