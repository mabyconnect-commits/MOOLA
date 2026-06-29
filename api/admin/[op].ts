import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ensureSchema, getDepCredited, getDepositIndex, sql } from '../_lib/db.js'
import { requireAdmin } from '../_lib/admin.js'
import { addTxn, fmt, loadAccount, saveAccount } from '../_lib/economics.js'

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

      // ---- DEPOSIT LOOKUP: where are a user's funds? ---------------------
      // Given ?q=email-or-id, shows the user's unique deposit address, what is
      // currently sitting there on-chain, and what's already been credited —
      // so "I deposited but it didn't reflect" can be diagnosed at a glance.
      case 'deposit-lookup': {
        const q = String((req.query.q as string) || '').trim()
        if (!q) return res.status(400).json({ error: 'Pass ?q=email or user id' })
        type DepRow = { id: number; email: string; deposit_index: number | null; sol: number; usdt: number; usdc: number; dep_sol: number; dep_usdt: number; dep_usdc: number }
        const rows = /^\d+$/.test(q)
          ? await sql<DepRow>`
              SELECT u.id, u.email, u.deposit_index,
                     COALESCE(a.sol,0) AS sol, COALESCE(a.usdt,0) AS usdt, COALESCE(a.usdc,0) AS usdc,
                     COALESCE(a.dep_sol,0) AS dep_sol, COALESCE(a.dep_usdt,0) AS dep_usdt, COALESCE(a.dep_usdc,0) AS dep_usdc
              FROM users u LEFT JOIN accounts a ON a.user_id = u.id
              WHERE u.id = ${Number(q)} LIMIT 1`
          : await sql<DepRow>`
              SELECT u.id, u.email, u.deposit_index,
                     COALESCE(a.sol,0) AS sol, COALESCE(a.usdt,0) AS usdt, COALESCE(a.usdc,0) AS usdc,
                     COALESCE(a.dep_sol,0) AS dep_sol, COALESCE(a.dep_usdt,0) AS dep_usdt, COALESCE(a.dep_usdc,0) AS dep_usdc
              FROM users u LEFT JOIN accounts a ON a.user_id = u.id
              WHERE u.email ILIKE ${q} ORDER BY u.created_at DESC LIMIT 1`
        const u = rows.rows[0]
        if (!u) return res.status(404).json({ error: 'No user matches that email/id' })

        const solana = await import('../_lib/solana.js')
        let address: string | null = null
        let onchain: { sol: number; usdt: number; usdc: number } | null = null
        if (u.deposit_index != null) {
          try {
            address = solana.depositAddress(u.deposit_index)
            onchain = await solana.readBalances(u.deposit_index)
          } catch (e) {
            console.error('[moola] deposit-lookup chain read failed:', e)
          }
        }
        // Anything on-chain beyond what's been credited is recoverable.
        const uncredited = onchain
          ? {
              sol: Math.max(0, onchain.sol - Number(u.dep_sol)),
              usdt: Math.max(0, onchain.usdt - Number(u.dep_usdt)),
              usdc: Math.max(0, onchain.usdc - Number(u.dep_usdc)),
            }
          : null
        return res.status(200).json({
          user: { id: u.id, email: u.email, depositIndex: u.deposit_index },
          depositAddress: address,
          onchain,
          credited: { sol: Number(u.dep_sol), usdt: Number(u.dep_usdt), usdc: Number(u.dep_usdc) },
          balances: { sol: Number(u.sol), usdt: Number(u.usdt), usdc: Number(u.usdc) },
          uncredited,
          depositReady: solana.depositConfigured(),
          sweepReady: solana.sweepConfigured(),
        })
      }

      // ---- DEPOSIT RECONCILE: credit any uncredited on-chain funds -------
      // Runs the same credit + sweep the user's own "check for deposit" does,
      // but server-side on demand. Mirrors api/action deposit-check.
      case 'deposit-reconcile': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
        const id = Number(body.id)
        if (!id) return res.status(400).json({ error: 'Missing user id' })
        const exists = await sql<{ id: number }>`SELECT id FROM users WHERE id = ${id}`
        if (!exists.rows[0]) return res.status(404).json({ error: 'No such user' })

        const solana = await import('../_lib/solana.js')
        if (!solana.depositConfigured()) return res.status(503).json({ error: 'Deposit system not configured' })

        // Per-user mutex (same as deposit-check) so we never double-credit.
        const lock = await sql`
          UPDATE accounts SET dep_lock = now()
          WHERE user_id = ${id} AND (dep_lock IS NULL OR dep_lock < now() - interval '30 seconds')
          RETURNING user_id`
        if (!lock.rows.length) return res.status(409).json({ error: 'A deposit check is already running for this user — try again in a moment.' })

        try {
          const index = await getDepositIndex(id)
          const onchain = await solana.readBalances(index)
          const seen = await getDepCredited(id)
          const newSol = Math.max(0, onchain.sol - seen.dep_sol)
          const newUsdt = Math.max(0, onchain.usdt - seen.dep_usdt)
          const newUsdc = Math.max(0, onchain.usdc - seen.dep_usdc)
          const found = newSol > 0 || newUsdt > 0 || newUsdc > 0
          if (found) {
            const a = await loadAccount(id)
            a.sol += newSol
            a.usdt += newUsdt
            a.usdc += newUsdc
            await saveAccount(id, a)
            if (newSol > 0) await addTxn(id, { icon: '⬇️', title: 'SOL deposit', sub: 'Solana (admin reconcile)', amt: `+${fmt(newSol, 4)} SOL`, pos: true })
            if (newUsdt > 0) await addTxn(id, { icon: '⬇️', title: 'USDT deposit', sub: 'Solana SPL (admin reconcile)', amt: `+${fmt(newUsdt, 2)} USDT`, pos: true })
            if (newUsdc > 0) await addTxn(id, { icon: '⬇️', title: 'USDC deposit', sub: 'Solana SPL (admin reconcile)', amt: `+${fmt(newUsdc, 2)} USDC`, pos: true })
          }

          // Forward whatever sits there to the treasury/payout (best-effort).
          let depSol = onchain.sol
          let depUsdt = onchain.usdt
          let depUsdc = onchain.usdc
          let sweepNote: string | null = null
          if (onchain.sol > 0.0001 || onchain.usdt > 0 || onchain.usdc > 0) {
            if (!solana.sweepConfigured()) {
              sweepNote = 'not-configured'
            } else {
              try {
                await solana.sweepToTreasury(index)
              } catch (e) {
                sweepNote = 'error: ' + (e instanceof Error ? e.message : String(e))
              }
              const after = await solana.readBalances(index)
              depSol = after.sol
              depUsdt = after.usdt
              depUsdc = after.usdc
              if (!sweepNote && (after.sol > 0.0001 || after.usdt > 0 || after.usdc > 0)) sweepNote = 'incomplete'
            }
          }
          await sql`UPDATE accounts SET dep_sol = ${depSol}, dep_usdt = ${depUsdt}, dep_usdc = ${depUsdc}, dep_lock = NULL WHERE user_id = ${id}`

          return res.status(200).json({ found, credited: { sol: newSol, usdt: newUsdt, usdc: newUsdc }, sweepNote })
        } catch (e) {
          await sql`UPDATE accounts SET dep_lock = NULL WHERE user_id = ${id}`
          throw e
        }
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
