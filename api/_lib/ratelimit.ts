import { sql } from './db.js'

// Lightweight fixed-window rate limiter backed by Postgres (no Redis needed).
// One upsert per check. Keep windows short and limits generous — this is abuse
// protection, not fine-grained quota.
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const win = Math.floor(Date.now() / windowMs)
  try {
    const { rows } = await sql<{ n: number }>`
      INSERT INTO rate_limits (k, win, n) VALUES (${key}, ${win}, 1)
      ON CONFLICT (k) DO UPDATE SET
        n = CASE WHEN rate_limits.win = ${win} THEN rate_limits.n + 1 ELSE 1 END,
        win = ${win}
      RETURNING n`
    return Number(rows[0]?.n || 1) <= limit
  } catch {
    // Never let the limiter take down a request if its table/query hiccups.
    return true
  }
}

// Best-effort client IP from the proxy headers Vercel sets.
export function clientIp(headers: Record<string, string | string[] | undefined>): string {
  const xff = headers['x-forwarded-for']
  const raw = Array.isArray(xff) ? xff[0] : xff
  return (raw || 'unknown').split(',')[0].trim()
}
