import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
// Demo mode = no Supabase credentials. Demo data lives in memory only and is never presented as saved.
export const demoMode = !url || !key
export const supabase = demoMode ? null : createClient(url!, key!)
