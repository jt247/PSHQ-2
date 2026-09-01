import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// React Native has no cookies — session persistence goes through
// AsyncStorage instead, which is why this can't reuse apps/web's
// createServerClient/createBrowserClient (both cookie-based, one of them
// also imports next/headers which doesn't exist outside Next.js at all).
export function createMobileSupabaseClient(url: string, anonKey: string) {
  return createSupabaseClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
}
