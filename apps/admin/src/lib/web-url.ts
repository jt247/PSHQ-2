// Plain utility, not a server action — needs to be callable from proxy.ts
// (Edge middleware) as well as from server actions and Server Components.
export function webUrl(): string {
  const url = process.env.NEXT_PUBLIC_WEB_URL
  if (!url) throw new Error('NEXT_PUBLIC_WEB_URL is not configured')
  return url
}
