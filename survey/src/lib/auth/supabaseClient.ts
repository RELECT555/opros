import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  console.error(
    '❌ Supabase не настроен. Создайте файл survey/.env:\n' +
    'VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=eyJ...'
  )
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', key ?? 'placeholder')

/** false, если в момент сборки не были заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (типичная причина «ничего не грузится» на Vercel). */
export function isViteSupabaseConfigured(): boolean {
  return Boolean(url?.trim() && key?.trim())
}



