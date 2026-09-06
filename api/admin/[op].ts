import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ensureSchema, getDepCredited, getDepositIndex, sql } from '../_lib/db.js'
import { requireAdmin } from '../_lib/admin.js'
import {
  addTxn,
  fmt,
  loadAccount,
  saveAccount,
  assessWithdrawable,
  creditDepositedUsd,
  SOL_PRICE,
} from '../_lib/economics.js'

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
      // Each row carries the user's cumulative real deposits so an admin can see
      // at a glance whether a payout is backed by real money (`deposited_usd`)
      // or is a free-airdrop cash-out (`deposited_usd` = 0).
      case 'withdrawals': {
        const status = String((req.query.status as string) || '').trim()
        const rows = status
          ? await sql`SELECT w.id, w.user_id, u.email, w.asset, w.amount, w.address, w.status, w.signature, w.created_at,
                             COALESCE(a.deposited_usd, 0) AS deposited_usd
                      FROM withdrawals w LEFT JOIN users u ON u.id = w.user_id
                      LEFT JOIN accounts a ON a.user_id = w.user_id
                      WHERE w.status = ${status} ORDER BY w.created_at DESC LIMIT 100`
          : await sql`SELECT w.id, w.user_id, u.email, w.asset, w.amount, w.address, w.status, w.signature, w.created_at,
                             COALESCE(a.deposited_usd, 0) AS deposited_usd
                      FROM withdrawals w LEFT JOIN users u ON u.id = w.user_id
                      LEFT JOIN accounts a ON a.user_id = w.user_id
                      ORDER BY w.created_at DESC LIMIT 100`
        return res.status(200).json({ withdrawals: rows.rows })
      }

      // ---- ABUSE REPORT: find the withdrawal loop ------------------------
      // Three signals that catch the "farm free tokens → cash out" pattern:
      //   rings   — one destination wallet paid by MANY accounts (a farm ring,
      //             e.g. the "CBLq…" address hit over and over in the report)
      //   farmers — accounts that withdrew real crypto but NEVER deposited
      //   totals  — real money in (deposits) vs real money out (payouts)
      case 'abuse-report': {
        const rings = await sql`
          SELECT w.address,
                 COUNT(*)::int AS payouts,
                 COUNT(DISTINCT w.user_id)::int AS users,
                 COALESCE(SUM(CASE WHEN w.asset = 'SOL' THEN w.amount * ${SOL_PRICE} ELSE w.amount END), 0) AS usd,
                 MAX(w.created_at) AS last_at
          FROM withdrawals w
          WHERE w.status IN ('pending', 'sent')
          GROUP BY w.address
          HAVING COUNT(*) > 1
          ORDER BY COUNT(DISTINCT w.user_id) DESC, COUNT(*) DESC
          LIMIT 40`

        const farmers = await sql`
          SELECT u.id, u.email, u.created_at,
                 COALESCE(a.deposited_usd, 0) AS deposited_usd,
                 COUNT(w.id)::int AS payouts,
                 COALESCE(SUM(CASE WHEN w.asset = 'SOL' THEN w.amount * ${SOL_PRICE} ELSE w.amount END), 0) AS withdrawn_usd
          FROM users u
          JOIN withdrawals w ON w.user_id = u.id AND w.status IN ('pending', 'sent')
          LEFT JOIN accounts a ON a.user_id = u.id
          GROUP BY u.id, u.email, u.created_at, a.deposited_usd
          HAVING COALESCE(a.deposited_usd, 0) = 0
          ORDER BY withdrawn_usd DESC
          LIMIT 50`

        const totals = await sql<{ deposited: number }>`SELECT COALESCE(SUM(deposited_usd), 0) AS deposited FROM accounts`
        const paid = await sql<{ paid: number; n: number }>`
          SELECT COALESCE(SUM(CASE WHEN asset = 'SOL' THEN amount * ${SOL_PRICE} ELSE amount END), 0) AS paid,
                 COUNT(*)::int AS n
          FROM withdrawals WHERE status IN ('pending', 'sent')`

        // Total withdrawn (USD) + count over rolling windows: 24h / 7d / 30d / all.
        const win = await sql<{ h24: number; d7: number; d30: number; all_usd: number; n24: number; n7: number; n30: number; n_all: number }>`
          SELECT
            COALESCE(SUM(usd) FILTER (WHERE created_at > now() - interval '24 hours'), 0) AS h24,
            COALESCE(SUM(usd) FILTER (WHERE created_at > now() - interval '7 days'), 0)  AS d7,
            COALESCE(SUM(usd) FILTER (WHERE created_at > now() - interval '30 days'), 0) AS d30,
            COALESCE(SUM(usd), 0) AS all_usd,
            COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS n24,
            COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int  AS n7,
            COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS n30,
            COUNT(*)::int AS n_all
          FROM (
            SELECT created_at, CASE WHEN asset = 'SOL' THEN amount * ${SOL_PRICE} ELSE amount END AS usd
            FROM withdrawals WHERE status IN ('pending', 'sent')
          ) w`
        const w0 = win.rows[0]

        return res.status(200).json({
          rings: rings.rows,
          farmers: farmers.rows,
          totals: {
            depositedUsd: Number(totals.rows[0]?.deposited || 0),
            paidUsd: Number(paid.rows[0]?.paid || 0),
            payouts: Number(paid.rows[0]?.n || 0),
          },
          windows: {
            h24: Number(w0?.h24 || 0), d7: Number(w0?.d7 || 0), d30: Number(w0?.d30 || 0), all: Number(w0?.all_usd || 0),
            n24: Number(w0?.n24 || 0), n7: Number(w0?.n7 || 0), n30: Number(w0?.n30 || 0), nAll: Number(w0?.n_all || 0),
          },
        })
      }

      // ---- WALLET DETAIL: every account that paid ONE destination wallet ---
      // Tap a ring wallet (e.g. the one paid by 18 accounts) to see exactly
      // which accounts drained to it, each with its deposit backing + total.
      case 'wallet-detail': {
        const address = String((req.query.address as string) || '').trim()
        if (!address) return res.status(400).json({ error: 'Pass ?address=' })
        const accounts = await sql`
          SELECT u.id, u.email, u.created_at,
                 COALESCE(a.deposited_usd, 0) AS deposited_usd,
                 COUNT(w.id)::int AS payouts,
                 COALESCE(SUM(CASE WHEN w.asset = 'SOL' THEN w.amount * ${SOL_PRICE} ELSE w.amount END), 0) AS usd,
                 MAX(w.created_at) AS last_at
          FROM withdrawals w
          JOIN users u ON u.id = w.user_id
          LEFT JOIN accounts a ON a.user_id = w.user_id
          WHERE w.address = ${address} AND w.status IN ('pending', 'sent')
          GROUP BY u.id, u.email, u.created_at, a.deposited_usd
          ORDER BY usd DESC`
        const tot = await sql<{ usd: number; payouts: number; accounts: number }>`
          SELECT COALESCE(SUM(CASE WHEN asset = 'SOL' THEN amount * ${SOL_PRICE} ELSE amount END), 0) AS usd,
                 COUNT(*)::int AS payouts, COUNT(DISTINCT user_id)::int AS accounts
          FROM withdrawals WHERE address = ${address} AND status IN ('pending', 'sent')`
        const bl = await sql`SELECT 1 FROM blocked_addresses WHERE address = ${address}`
        return res.status(200).json({
          address,
          blocked: bl.rows.length > 0,
          accounts: accounts.rows,
          totals: {
            usd: Number(tot.rows[0]?.usd || 0),
            payouts: Number(tot.rows[0]?.payouts || 0),
            accounts: Number(tot.rows[0]?.accounts || 0),
          },
        })
      }

      // ---- BAN / UNBAN a user (blocks all money actions) -----------------
      case 'ban-user': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
        const id = Number(body.id)
        const banned = body.banned !== false // default true
        if (!id) return res.status(400).json({ error: 'Missing user id' })
        if (id === adminId && banned) return res.status(400).json({ error: "You can't ban your own admin account." })
        const r = await sql<{ id: number }>`UPDATE users SET banned = ${banned} WHERE id = ${id} RETURNING id`
        if (!r.rows.length) return res.status(404).json({ error: 'No such user' })
        return res.status(200).json({ id, banned })
      }

      // ---- BLOCK / UNBLOCK a destination wallet -------------------------
      case 'block-address': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
        const address = String(body.address || '').trim()
        const blocked = body.blocked !== false // default true
        if (!address) return res.status(400).json({ error: 'Missing address' })
        if (blocked) {
          await sql`INSERT INTO blocked_addresses (address, reason) VALUES (${address}, ${String(body.reason || 'admin')})
                    ON CONFLICT (address) DO NOTHING`
        } else {
          await sql`DELETE FROM blocked_addresses WHERE address = ${address}`
        }
        return res.status(200).json({ address, blocked })
      }

      // ---- ZERO UNBACKED BALANCES ---------------------------------------
      // Clears in-app SOL/USDT/USDC for accounts with NO real backing (no
      // deposit AND no commission from a downline who deposited). GET returns a
      // preview count; POST performs the wipe. Touches app numbers only — never
      // real on-chain funds.
      case 'zero-unbacked': {
        // Accounts that are unbacked (same test as the withdrawal guard) AND
        // still hold a non-zero in-app crypto balance.
        const targetSql = sql<{ n: number }>`
          SELECT COUNT(*)::int AS n FROM accounts a
          WHERE (a.sol > 0 OR a.usdt > 0 OR a.usdc > 0)
            AND COALESCE(a.deposited_usd, 0) = 0
            AND NOT EXISTS (
              SELECT 1 FROM referral_earnings re
              JOIN accounts a2 ON a2.user_id = re.from_user
              WHERE re.beneficiary = a.user_id AND COALESCE(a2.deposited_usd,0) > 0
            )`
        if (req.method !== 'POST') {
          const c = await targetSql
          return res.status(200).json({ count: Number(c.rows[0]?.n || 0), cleared: false })
        }
        const r = await sql<{ user_id: number }>`
          UPDATE accounts a SET sol = 0, usdt = 0, usdc = 0
          WHERE (a.sol > 0 OR a.usdt > 0 OR a.usdc > 0)
            AND COALESCE(a.deposited_usd, 0) = 0
            AND NOT EXISTS (
              SELECT 1 FROM referral_earnings re
              JOIN accounts a2 ON a2.user_id = re.from_user
              WHERE re.beneficiary = a.user_id AND COALESCE(a2.deposited_usd,0) > 0
            )
          RETURNING a.user_id`
        return res.status(200).json({ count: r.rows.length, cleared: true })
      }

      // ---- WITHDRAWERS: everyone who has withdrawn, most active first ----
      // One row per user with how MANY times they've withdrawn, the total value,
      // how many distinct wallets they paid, and whether it's deposit-backed —
      // so a user cashing out over and over (like the "2nTD…" pattern) is
      // obvious at the top of the list. Tap one to load full details.
      case 'withdrawers': {
        const rows = await sql`
          SELECT u.id, u.email, u.created_at,
                 COALESCE(a.deposited_usd, 0) AS deposited_usd,
                 COUNT(w.id)::int AS payouts,
                 COUNT(DISTINCT w.address)::int AS addresses,
                 COALESCE(SUM(CASE WHEN w.asset = 'SOL' THEN w.amount * ${SOL_PRICE} ELSE w.amount END), 0) AS withdrawn_usd,
                 MIN(w.created_at) AS first_at,
                 MAX(w.created_at) AS last_at
          FROM users u
          JOIN withdrawals w ON w.user_id = u.id AND w.status IN ('pending', 'sent')
          LEFT JOIN accounts a ON a.user_id = u.id
          GROUP BY u.id, u.email, u.created_at, a.deposited_usd
          ORDER BY payouts DESC, withdrawn_usd DESC
          LIMIT 100`
        return res.status(200).json({ withdrawers: rows.rows })
      }

      // ---- WITHDRAWAL DETAILS for one user ------------------------------
      // "See all their details": the full eligibility breakdown behind the guard
      // (deposits, investor commission, own-stake rewards, already withdrawn,
      // what's left), current balances, and every one of their withdrawals.
      // Matches ?q=email-or-id.
      case 'withdraw-check': {
        const q = String((req.query.q as string) || '').trim()
        if (!q) return res.status(400).json({ error: 'Pass ?q=email or user id' })
        const found = /^\d+$/.test(q)
          ? await sql<{ id: number; email: string; created_at: string; deposit_index: number | null; banned: boolean }>`
              SELECT id, email, created_at, deposit_index, COALESCE(banned,false) AS banned FROM users WHERE id = ${Number(q)} LIMIT 1`
          : await sql<{ id: number; email: string; created_at: string; deposit_index: number | null; banned: boolean }>`
              SELECT id, email, created_at, deposit_index, COALESCE(banned,false) AS banned FROM users WHERE email ILIKE ${q} ORDER BY created_at DESC LIMIT 1`
        const u = found.rows[0]
        if (!u) return res.status(404).json({ error: 'No user matches that email/id' })

        const assess = await assessWithdrawable(u.id)
        const bal = await sql<{ balance: number; staked: number; available: number; sol: number; usdt: number; usdc: number; deposited_usd: number; airdrop_claimed: boolean }>`
          SELECT COALESCE(balance,0) AS balance, COALESCE(staked,0) AS staked, COALESCE(available,0) AS available,
                 COALESCE(sol,0) AS sol, COALESCE(usdt,0) AS usdt, COALESCE(usdc,0) AS usdc,
                 COALESCE(deposited_usd,0) AS deposited_usd, COALESCE(airdrop_claimed,false) AS airdrop_claimed
          FROM accounts WHERE user_id = ${u.id}`
        const wds = await sql`
          SELECT id, asset, amount, address, status, signature, created_at
          FROM withdrawals WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 100`

        // Downline picture — who this user referred, and how many actually put
        // real money in. This is what legitimately unlocks withdrawals.
        const dl = await sql<{ total: number; invested: number; invested_usd: number }>`
          SELECT COUNT(*)::int AS total,
                 COUNT(*) FILTER (WHERE COALESCE(a.deposited_usd,0) > 0)::int AS invested,
                 COALESCE(SUM(a.deposited_usd),0) AS invested_usd
          FROM users du LEFT JOIN accounts a ON a.user_id = du.id
          WHERE ${u.id}::bigint = ANY(du.upline)`

        // Where their $MOOLA came from — stake lots by source + referral earnings.
        // Sources: airdrop / airdrop_ref (FREE) vs stake / compound (their own).
        const lots = await sql<{ source: string; amt: number }>`
          SELECT source, COALESCE(SUM(amount),0) AS amt FROM stake_lots WHERE user_id = ${u.id} GROUP BY source`
        const earn = await sql<{ commission: number; bonus: number }>`
          SELECT COALESCE(SUM(commission),0) AS commission, COALESCE(SUM(bonus),0) AS bonus
          FROM referral_earnings WHERE beneficiary = ${u.id}`

        return res.status(200).json({
          user: { id: u.id, email: u.email, createdAt: u.created_at, depositIndex: u.deposit_index, banned: Boolean(u.banned) },
          assessment: assess,
          balances: bal.rows[0] || null,
          withdrawals: wds.rows,
          downlines: {
            total: Number(dl.rows[0]?.total || 0),
            invested: Number(dl.rows[0]?.invested || 0),
            investedUsd: Number(dl.rows[0]?.invested_usd || 0),
          },
          sources: {
            airdropClaimed: Boolean(bal.rows[0]?.airdrop_claimed),
            lots: lots.rows.map((l) => ({ source: l.source, amount: Number(l.amt) })),
            commissionMoola: Number(earn.rows[0]?.commission || 0),
            bonusMoola: Number(earn.rows[0]?.bonus || 0),
          },
        })
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
            await creditDepositedUsd(id, newSol * SOL_PRICE + newUsdt + newUsdc)
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
          ? await sql`SELECT u.id, u.email, u.created_at, u.deposit_index, a.balance, a.staked, a.available, a.sol, a.usdt, a.usdc, COALESCE(a.deposited_usd,0) AS deposited_usd
                      FROM users u LEFT JOIN accounts a ON a.user_id = u.id
                      WHERE u.email ILIKE ${'%' + q + '%'} ORDER BY u.created_at DESC LIMIT 50`
          : await sql`SELECT u.id, u.email, u.created_at, u.deposit_index, a.balance, a.staked, a.available, a.sol, a.usdt, a.usdc, COALESCE(a.deposited_usd,0) AS deposited_usd
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
