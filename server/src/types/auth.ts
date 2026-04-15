/** Контекст авторизации после успешной проверки Bearer-токена */

export type PasswordAdminAuth = { kind: 'password_admin' }

export type OauthAuth = {
  kind: 'oauth'
  userId: string
  email: string
  isGlobalAdmin: boolean
}

export type AuthContext = PasswordAdminAuth | OauthAuth

export function isFullAccess(ctx: AuthContext): boolean {
  return ctx.kind === 'password_admin' || (ctx.kind === 'oauth' && ctx.isGlobalAdmin)
}
