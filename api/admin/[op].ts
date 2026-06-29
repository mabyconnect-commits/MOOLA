import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ensureSchema, sql } from '../_lib/db.js'
import { requireAdmin } from '../_lib/admin.js'

// All admin operations live behind requireAdmin (server-side allowlist check).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema()
  } catch {
    return res.status(500).json({ error: 'Service temporarily unavailable.' })
  }

  const adminId = await requireAdmin(req)
  if (!adminId) return res.status(403).json({ error: 'Admins only.' })

  const op = req.query.op as string
  const body = (req.body || {}) as Record<string, unknown>

  try {
    switch (op) {
      // ---- OVERVIEW ------------------------------------------------------
      case 'overview': {
        const users = await sql<{ total: number; verified: number }>`
          SELECT count(*)::int AS total, count(*) FILTER (WHERE email_verified)::int AS verified FROM users`
        const totals = await sql<{ staked: number; available: number; balance: number; sol: number; usdt: number; usdc: number }>`
          SELECT COALESCE(sum(staked),0) AS staked, COALESCE(sum(available),0) AS available,
                 COALESCE(sum(balance),0) AS balance, COALESCE(sum(sol),0) AS sol,
                 COALESCE(sum(usdt),0) AS usdt, COALESCE(sum(usdc),0) AS usdc FROM accounts`
        const wd = await sql<{ status: string; n: number; amount: number }>`
          SELECT status, count(*)::int AS n, COALESCE(sum(amount),0) AS amount FROM withdrawals GROUP BY status`

        const solana = await import('../_lib/solana.js')
        const [treasury, payout] = await Promise.all([
          solana.walletBalances(solana.treasuryAddressStr()),
          solana.walletBalances(solana.payoutAddressStr()),
        ])

        return res.status(200).json({
          users: users.rows[0],
          totals: totals.rows[0],
          withdrawals: wd.rows,
          wallets: {
            treasury: { address: solana.treasuryAddressStr(), balances: treasury },
            payout: { address: solana.payoutAddressStr(), balances: payout },
            splitPct: solana.sweepPayoutPct(),
          },
        })
      }

      // ---- WITHDRAWALS LIST ---------------------------------------------
      case 'withdrawals': {
        const status = String((req.query.status as string) || '').trim()
        const rows = status
          ? await sql`SELECT w.id, w.user_id, u.email, w.asset, w.amount, w.address, w.status, w.signature, w.created_at
                      FROM withdrawals w LEFT JOIN users u ON u.id = w.user_id
                      WHERE w.status = ${status} ORDER BY w.created_at DESC LIMIT 100`
          : await sql`SELECT w.id, w.user_id, u.email, w.asset, w.amount, w.address, w.status, w.signature, w.created_at
                      FROM withdrawals w LEFT JOIN users u ON u.id = w.user_id
                      ORDER BY w.created_at DESC LIMIT 100`
        return res.status(200).json({ withdrawals: rows.rows })
      }

      // ---- RESOLVE A PENDING WITHDRAWAL ----------------------------------
      case 'resolve-withdrawal': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
        const id = Number(body.id)
        if (!id) return res.status(400).json({ error: 'Missing id' })
        const { rows } = await sql<{ id: number; user_id: number; asset: string; amount: number; status: string; signature: string | null }>`
          SELECT id, user_id, asset, amount, status, signature FROM withdrawals WHERE id = ${id}`
        const w = rows[0]
        if (!w) return res.status(404).json({ error: 'Not found' })
        if (w.status !== 'pending') return res.status(200).json({ resolved: w.status })
        if (!w.signature) return res.status(200).json({ resolved: 'no-signature' })

        const solana = await import('../_lib/solana.js')
        const landed = await solana.signatureLanded(w.signature)
        if (landed === 'confirmed') {
          await sql`UPDATE withdrawals SET status = 'sent' WHERE id = ${id}`
          return res.status(200).json({ resolved: 'sent' })
        }
        if (landed === 'failed') {
          const amt = Number(w.amount)
          if (w.asset === 'SOL') await sql`UPDATE accounts SET sol = sol + ${amt} WHERE user_id = ${w.user_id}`
          else if (w.asset === 'USDT') await sql`UPDATE accounts SET usdt = usdt + ${amt} WHERE user_id = ${w.user_id}`
          else await sql`UPDATE accounts SET usdc = usdc + ${amt} WHERE user_id = ${w.user_id}`
          await sql`UPDATE withdrawals SET status = 'reversed' WHERE id = ${id}`
          return res.status(200).json({ resolved: 'reversed (refunded)' })
        }
        return res.status(200).json({ resolved: 'still-unknown' })
      }

      // ---- SWEEP ALL deposit addresses that hold funds -------------------
      case 'sweep-all': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
        const solana = await import('../_lib/solana.js')
        if (!solana.sweepConfigured()) return res.status(503).json({ error: 'Sweep not configured.' })
        // Cap per call to stay within the function timeout; admin can re-run.
        const users = await sql<{ deposit_index: number }>`
          SELECT deposit_index FROM users WHERE deposit_index IS NOT NULL ORDER BY deposit_index LIMIT 20`
        let checked = 0
        let swept = 0
        for (const u of users.rows) {
          checked++
          try {
            const b = await solana.readBalances(u.deposit_index)
            if (b.sol > 0.0001 || b.usdt > 0 || b.usdc > 0) {
              await solana.sweepToTreasury(u.deposit_index)
              swept++
            }
          } catch (e) {
            console.error('[moola] admin sweep-all failed for index', u.deposit_index, e)
          }
        }
        return res.status(200).json({ checked, swept })
      }

      // ---- USERS LIST ----------------------------------------------------
      case 'users': {
        const q = String((req.query.q as string) || '').trim()
        const rows = q
          ? await sql`SELECT u.id, u.email, u.created_at, u.deposit_index, a.balance, a.staked, a.available, a.sol, a.usdt, a.usdc
                      FROM users u LEFT JOIN accounts a ON a.user_id = u.id
                      WHERE u.email ILIKE ${'%' + q + '%'} ORDER BY u.created_at DESC LIMIT 50`
          : await sql`SELECT u.id, u.email, u.created_at, u.deposit_index, a.balance, a.staked, a.available, a.sol, a.usdt, a.usdc
                      FROM users u LEFT JOIN accounts a ON a.user_id = u.id
                      ORDER BY u.created_at DESC LIMIT 50`
        return res.status(200).json({ users: rows.rows })
      }

      default:
        return res.status(404).json({ error: 'Unknown admin op' })
    }
  } catch (e) {
    console.error('[moola] admin error:', e)
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Something went wrong' })
  }
}
