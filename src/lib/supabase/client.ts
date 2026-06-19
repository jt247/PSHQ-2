import { createBrowserClient } from '@supabase/ssr'

// Database generic is intentionally omitted here — our types in @/types/database
// are hand-written for export/documentation. Use `supabase gen types typescript --linked`
// to replace them with generated types once you wire up the Supabase CLI.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
