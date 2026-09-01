import { supabase } from './supabase'

// Epic E — the first mobile features that need real server-side work
// (OpenAI calls, which must never ship a secret key in the app bundle).
// This hits the web app's Next.js API routes with the mobile session's
// own Supabase access token as a Bearer header — apps/web/src/lib/
// api-auth.ts validates it the same way it validates a cookie session,
// so every Epic E route serves both platforms from one implementation.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

export async function callApi(path: string, options: RequestInit = {}): Promise<Response> {
  if (!API_BASE_URL) throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'x-app-source': 'mobile',
      ...options.headers,
    },
  })
}
