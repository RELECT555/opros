export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly currentRevision?: number

  constructor(message: string, status: number, code?: string, currentRevision?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.currentRevision = currentRevision
  }
}
