import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Uses Upstash Redis when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set.
// Falls back to a per-instance in-memory window otherwise so local dev and
// preview deploys work without credentials. The fallback is best-effort only
// (resets on cold start) — set the Upstash env vars in production.

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const redis = hasUpstash ? Redis.fromEnv() : undefined

const limiters = new Map<string, Ratelimit>()

function getLimiter(name: string, tokens: number, windowSec: number): Ratelimit | null {
  if (!redis) return null
  const key = `${name}:${tokens}:${windowSec}`
  let limiter = limiters.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, `${windowSec} s`),
      prefix: `rl:${name}`,
    })
    limiters.set(key, limiter)
  }
  return limiter
}

// In-memory fallback: fixed window per identifier.
const memory = new Map<string, { count: number; resetAt: number }>()

function memoryLimit(key: string, tokens: number, windowSec: number): boolean {
  const now = Date.now()
  const entry = memory.get(key)
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    return true
  }
  entry.count += 1
  if (memory.size > 10_000) memory.clear() // ponytail: crude cap, Upstash is the real path
  return entry.count <= tokens
}

/**
 * Returns true when the request is allowed, false when rate limited.
 * `identifier` is usually the user id or client IP.
 */
export async function rateLimit(
  name: string,
  identifier: string,
  tokens: number,
  windowSec: number
): Promise<boolean> {
  const limiter = getLimiter(name, tokens, windowSec)
  if (limiter) {
    const { success } = await limiter.limit(identifier)
    return success
  }
  return memoryLimit(`${name}:${identifier}`, tokens, windowSec)
}

/** Client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
