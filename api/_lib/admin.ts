import type { VercelRequest } from '@vercel/node'
import { sql } from './db.js'
import { userIdFromReq } from './auth.js'

// Comma-separated allowlist of admin emails (case-insensitive).
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || !ADMIN_EMAILS.length) return false
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

export async function isAdminUser(userId: number): Promise<boolean> {
  if (!ADMIN_EMAILS.length) return false
  const { rows } = await sql<{ email: string }>`SELECT email FROM users WHERE id = ${userId}`
  return isAdminEmail(rows[0]?.email)
}

// Returns the admin's user id, or null if the request isn't an authenticated
// admin. Every admin endpoint gates on this server-side.
export async function requireAdmin(req: VercelRequest): Promise<number | null> {
  const userId = userIdFromReq(req)
  if (!userId) return null
  return (await isAdminUser(userId)) ? userId : null
}
