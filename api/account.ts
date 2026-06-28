import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ensureSchema } from './_lib/db.js'
import { userIdFromReq } from './_lib/auth.js'
import { loadAccount, loadTxns } from './_lib/economics.js'

// GET /api/account — returns the signed-in user's current balances + history.
// This is what hydrates the app on load so state survives reloads and devices.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const userId = userIdFromReq(req)
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  try {
    await ensureSchema()
    const account = await loadAccount(userId)
    const txns = await loadTxns(userId)
    return res.status(200).json({ account, txns })
  } catch (e) {
    console.error('[moola] account error:', e)
    return res.status(500).json({ error: 'Could not load your account' })
  }
}
