import { createMobileSupabaseClient } from '@pshq/api-client/mobile'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not configured')
}

export const supabase = createMobileSupabaseClient(url, anonKey)
