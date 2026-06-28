import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { VercelRequest } from '@vercel/node'

// Sessions are stateless JWTs. JWT_SECRET MUST be set in production — without a
// stable secret, tokens issued by one deployment won't validate on the next.
const SECRET = process.env.JWT_SECRET || 'moola-dev-secret-change-me'

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('[moola] JWT_SECRET is not set — using an insecure dev default. Set it in Vercel before production.')
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function signToken(userId: number): string {
  return jwt.sign({ uid: userId }, SECRET, { expiresIn: '30d' })
}

// Returns the authenticated user id, or null when the request carries no valid
// bearer token.
export function userIdFromReq(req: VercelRequest): number | null {
  const header = (req.headers.authorization || req.headers.Authorization) as string | undefined
  const match = header?.match(/^Bearer (.+)$/)
  if (!match) return null
  try {
    const decoded = jwt.verify(match[1], SECRET) as { uid?: number }
    return decoded.uid ? Number(decoded.uid) : null
  } catch {
    return null
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Loose Solana (base58) address check — enough to catch obvious typos without
// pulling in a crypto dependency.
export const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
