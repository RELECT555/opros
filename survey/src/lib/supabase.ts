// Compatibility exports; domain contracts and OAuth infrastructure have separate owners.
export * from '../domain/models'
export { supabase, isViteSupabaseConfigured } from './auth/supabaseClient'
