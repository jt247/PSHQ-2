import type { NextRequest } from 'next/server'
import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { createClient } from '@pshq/api-client/server'

// Epic E is the first place a Next.js API route needs to serve both web
// (cookie session, existing pattern) and mobile (no cookies — the mobile
// app only has its own Supabase access token) with one implementation.
// For the Bearer path, a plain supabase-js client with the token forwarded
// as the Authorization header keeps RLS's auth.uid() working exactly like
// the cookie-based client — anon key + a valid user JWT is all RLS needs.
export async function getAuthedRequestUser(req: NextRequest): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const authHeader = req.headers.get('authorization')
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : null

  if (bearerToken) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser(bearerToken)
    if (!user) return null
    return { user, supabase }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { user, supabase }
}
