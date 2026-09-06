import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ensureSchema, getDepositIndex, getDepCredited, sql } from '../_lib/db.js'
import { SOLANA_ADDR_RE, userIdFromReq } from '../_lib/auth.js'
import { distributeCommission } from '../_lib/referral.js'
import { rateLimit } from '../_lib/ratelimit.js'
// NOTE: the Solana module (heavy deps + env-derived keys) is imported lazily
// inside the deposit cases only, so a misconfig there can never crash the whole
// action function (which would 500 every action — claim, stake, buy, …).
import {
  AIRDROP_AMOUNT,
  PRESALE_PRICE,
  SELL_PRICE,
  WITHDRAW_FEE_PCT,
  SOL_PRICE,
  addStakeLot,
  STAKE_DAYS,
  DAILY_RATE,
  addTxn,
  fmt,
  loadAccount,
  loadTxns,
  saveAccount,
  loadStats,
  WITHDRAW_GUARD,
  assessWithdrawable,
  withdrawFreezeCutoff,
  assetUsd,
  creditDepositedUsd,
} from '../_lib/economics.js'

type Ccy = 'USDT' | 'USDC'
type Asset = 'SOL' | 'USDT' | 'USDC'

// Resolve any of a user's withdrawals left in 'pending' (an ambiguous payout)
// by checking the signature on-chain: confirmed → mark sent; failed → refund.
// 'unknown' is left pending for manual review. Self-heals at withdraw time.
async function reconcilePending(
  userId: number,
  solana: typeof import('../_lib/solana.js'),
): Promise<void> {
  const { rows } = await sql<{ id: number; asset: string; amount: number; signature: string | null }>`
    SELECT id, asset, amount, signature FROM withdrawals WHERE user_id = ${userId} AND status = 'pending'`
  for (const w of rows) {
    if (!w.signature) continue
    const landed = await solana.signatureLanded(w.signature)
    if (landed === 'confirmed') {
      await sql`UPDATE withdrawals SET status = 'sent' WHERE id = ${w.id}`
    } else if (landed === 'failed') {
      const amt = Number(w.amount)
      if (w.asset === 'SOL') await sql`UPDATE accounts SET sol = sol + ${amt} WHERE user_id = ${userId}`
      else if (w.asset === 'USDT') await sql`UPDATE accounts SET usdt = usdt + ${amt} WHERE user_id = ${userId}`
      else await sql`UPDATE accounts SET usdc = usdc + ${amt} WHERE user_id = ${userId}`
      await sql`UPDATE withdrawals SET status = 'reversed' WHERE id = ${w.id}`
    }
  }
}

// All balance-changing actions live here so we stay well under Vercel's
// function count. Each one mirrors the frontend logic, but the server is now
// the source of truth and every change is persisted + recorded in history.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = userIdFromReq(req)
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  const type = req.query.type as string
  const body = (req.body || {}) as Record<string, unknown>

  // Rate limit: generous per-user cap to stop abuse/runaway loops without
  // hampering normal use. Money-moving actions get a tighter cap.
  const tight = type === 'withdraw' || type === 'buy' || type === 'sell'
  const allowed = await rateLimit(`act:${userId}:${tight ? type : 'all'}`, tight ? 12 : 60, 60_000)
  if (!allowed) return res.status(429).json({ error: 'Too many requests — please slow down.' })

  try {
    await ensureSchema()

    // Banned accounts can't perform any balance-changing action.
    const banRow = await sql<{ banned: boolean }>`SELECT banned FROM users WHERE id = ${userId}`
    if (banRow.rows[0]?.banned) {
      return res.status(403).json({ error: 'This account is suspended. If you believe this is a mistake, contact support.' })
    }

    const a = await loadAccount(userId)

    switch (type) {
      // ---- AIRDROP CLAIM (once per account) -------------------------------
      case 'claim-airdrop': {
        if (a.airdropClaimed) return res.status(409).json({ error: 'Airdrop already claimed' })
        const addr = String(body.claimAddr || '').trim()
        if (!SOLANA_ADDR_RE.test(addr)) {
          return res.status(400).json({ error: 'Enter a valid Solana address' })
        }
        a.airdrop = AIRDROP_AMOUNT
        a.staked += AIRDROP_AMOUNT
        a.balance += AIRDROP_AMOUNT
        a.airdropClaimed = true
        a.claimAddr = addr
        await saveAccount(userId, a)
        // New stake lot with its own 20-day clock.
        await addStakeLot(userId, AIRDROP_AMOUNT, 'airdrop')
        await addTxn(userId, { icon: '🎁', title: 'Airdrop claimed', sub: `${AIRDROP_AMOUNT} $MOOLA staked`, amt: `+${AIRDROP_AMOUNT} $MOOLA`, pos: true })
        break
      }

      // ---- STAKE ----------------------------------------------------------
      case 'stake': {
        const amt = Number(body.amount)
        if (!amt || amt <= 0) return res.status(400).json({ error: 'Enter an amount to stake' })
        if (amt > a.available) return res.status(400).json({ error: 'Insufficient available balance' })
        a.staked += amt
        a.available -= amt
        await saveAccount(userId, a)
        // New stake lot with its own 20-day clock.
        await addStakeLot(userId, amt, 'stake')
        await addTxn(userId, { icon: '🔒', title: 'Staked', sub: `${fmt(amt, 3)} $MOOLA locked`, amt: `-${fmt(amt, 3)} avail`, pos: false })
        break
      }

      // ---- CLAIM REWARDS --------------------------------------------------
      case 'claim-rewards': {
        const r = a.reward
        if (r <= 0) return res.status(400).json({ error: 'No rewards to claim yet' })
        a.available += r
        a.balance += r
        a.reward = 0
        await saveAccount(userId, a)
        await addTxn(userId, { icon: '✅', title: 'Rewards claimed', sub: 'to available balance', amt: `+${fmt(r, 4)} $MOOLA`, pos: true })
        break
      }

      // ---- COMPOUND REWARDS ----------------------------------------------
      case 'compound': {
        const r = a.reward
        if (r <= 0) return res.status(400).json({ error: 'No rewards to compound yet' })
        a.staked += r
        a.balance += r
        a.reward = 0
        await saveAccount(userId, a)
        // Compounded rewards start their own fresh 20-day clock.
        await addStakeLot(userId, r, 'compound')
        await addTxn(userId, { icon: '🔁', title: 'Rewards compounded', sub: 'added to stake', amt: `+${fmt(r, 4)} $MOOLA`, pos: true })
        break
      }

      // ---- PRESALE BUY ----------------------------------------------------
      case 'buy': {
        const amt = Number(body.amount)
        const ccy: Asset = body.ccy === 'USDC' ? 'USDC' : body.ccy === 'SOL' ? 'SOL' : 'USDT'
        if (!amt || amt <= 0) return res.status(400).json({ error: 'Enter an amount' })
        const bal = ccy === 'USDT' ? a.usdt : ccy === 'USDC' ? a.usdc : a.sol
        if (bal < amt) {
          // Not enough of the chosen coin — route the user to deposit the difference.
          const needed = amt - bal
          return res.status(200).json({
            account: a,
            txns: await loadTxns(userId),
            needsDeposit: true,
            depositAsset: ccy,
            depositAmt: needed.toFixed(ccy === 'SOL' ? 4 : 2),
          })
        }
        // USDT/USDC ≈ $1; SOL is converted via SOL_PRICE.
        const usd = ccy === 'SOL' ? amt * SOL_PRICE : amt
        const tokens = Math.floor(usd / PRESALE_PRICE)
        if (ccy === 'USDT') a.usdt -= amt
        else if (ccy === 'USDC') a.usdc -= amt
        else a.sol -= amt
        a.balance += tokens
        a.available += tokens
        await saveAccount(userId, a)
        await addTxn(userId, { icon: '🛒', title: 'Presale buy', sub: `${fmt(amt, ccy === 'SOL' ? 4 : 2)} ${ccy}`, amt: `+${fmt(tokens, 0)} $MOOLA`, pos: true })
        // Pay 10-level referral commission on the purchased tokens.
        await distributeCommission(userId, tokens)
        break
      }

      // ---- DEPOSIT (record a top-up) -------------------------------------
      // NOTE: this records a deposit against the account. It does not move real
      // funds on-chain — settlement is intentionally out of scope for launch.
      case 'deposit': {
        // Simulated credit — ONLY allowed when the on-chain deposit system
        // isn't configured (local/dev). In production this is disabled so
        // nobody can credit themselves free balance.
        const { depositConfigured } = await import('../_lib/solana.js')
        if (depositConfigured()) {
          return res.status(400).json({ error: 'Use the deposit address — funds are credited on-chain.' })
        }
        const amt = Number(body.amount)
        const asset: Asset = body.asset === 'SOL' ? 'SOL' : body.asset === 'USDC' ? 'USDC' : 'USDT'
        if (!amt || amt <= 0) return res.status(400).json({ error: 'Enter the amount you sent' })
        if (asset === 'SOL') a.sol += amt
        else if (asset === 'USDT') a.usdt += amt
        else a.usdc += amt
        await saveAccount(userId, a)
        await creditDepositedUsd(userId, assetUsd(asset, amt))
        const dec = asset === 'SOL' ? 4 : 2
        await addTxn(userId, { icon: '⬇️', title: 'Deposit', sub: asset, amt: `+${fmt(amt, dec)} ${asset}`, pos: true })
        break
      }

      // ---- REAL DEPOSIT: return the user's unique on-chain address --------
      case 'deposit-address': {
        const { depositConfigured, depositAddress } = await import('../_lib/solana.js')
        if (!depositConfigured()) return res.status(503).json({ error: 'Deposit system not configured' })
        const index = await getDepositIndex(userId)
        return res.status(200).json({ address: depositAddress(index) })
      }

      // ---- REAL DEPOSIT: detect on-chain deposits and credit anything new -
      case 'deposit-check': {
        const solana = await import('../_lib/solana.js')
        const { depositConfigured, readBalances, sweepConfigured, sweepToTreasury } = solana
        if (!depositConfigured()) return res.status(503).json({ error: 'Deposit system not configured' })

        // Per-user mutex: only one deposit-check runs at a time, so two
        // concurrent checks can't read the same on-chain balance and both
        // credit it (double-credit). Stale locks (>30s) are reclaimable.
        const lock = await sql`
          UPDATE accounts SET dep_lock = now()
          WHERE user_id = ${userId} AND (dep_lock IS NULL OR dep_lock < now() - interval '30 seconds')
          RETURNING user_id`
        if (!lock.rows.length) {
          const account = await loadAccount(userId)
          const txns = await loadTxns(userId)
          return res.status(200).json({ account, txns, found: false })
        }

        const index = await getDepositIndex(userId)
        const onchain = await readBalances(index)
        const seen = await getDepCredited(userId)
        const newSol = Math.max(0, onchain.sol - seen.dep_sol)
        const newUsdt = Math.max(0, onchain.usdt - seen.dep_usdt)
        const newUsdc = Math.max(0, onchain.usdc - seen.dep_usdc)
        const found = newSol > 0 || newUsdt > 0 || newUsdc > 0
        if (found) {
          a.sol += newSol
          a.usdt += newUsdt
          a.usdc += newUsdc
          await saveAccount(userId, a)
          // Record the real value brought in, so it counts toward what the user
          // is later allowed to withdraw.
          await creditDepositedUsd(userId, newSol * SOL_PRICE + newUsdt + newUsdc)
          if (newSol > 0) await addTxn(userId, { icon: '⬇️', title: 'SOL deposit', sub: 'Solana', amt: `+${fmt(newSol, 4)} SOL`, pos: true })
          if (newUsdt > 0) await addTxn(userId, { icon: '⬇️', title: 'USDT deposit', sub: 'Solana (SPL)', amt: `+${fmt(newUsdt, 2)} USDT`, pos: true })
          if (newUsdc > 0) await addTxn(userId, { icon: '⬇️', title: 'USDC deposit', sub: 'Solana (SPL)', amt: `+${fmt(newUsdc, 2)} USDC`, pos: true })
        }

        // Forward whatever sits in the deposit address into the treasury. We
        // sweep on any non-trivial balance (not just when `found`) so a sweep
        // that failed on a previous check gets retried. `dep_*` tracks the
        // last-seen balance, so after a successful sweep it resets to ~0 and
        // the next real deposit is detected cleanly.
        let depSol = onchain.sol
        let depUsdt = onchain.usdt
        let depUsdc = onchain.usdc
        const hasFunds = onchain.sol > 0.0001 || onchain.usdt > 0 || onchain.usdc > 0
        // sweepNote tells the client *why* a sweep didn't complete, so the
        // failure isn't silently swallowed (config gap vs gas vs cluster issue).
        let sweepNote: string | null = null
        if (hasFunds) {
          if (!sweepConfigured()) {
            sweepNote = 'not-configured'
          } else {
            try {
              await sweepToTreasury(index)
            } catch (e) {
              sweepNote = 'error: ' + (e instanceof Error ? e.message : String(e))
              console.error('[moola] treasury sweep failed:', e)
            }
            // Re-read; if funds still sit here the sweep didn't actually move
            // them (usually the treasury has no SOL for gas, or a cluster/mint
            // mismatch between the RPC and where the funds live).
            const after = await readBalances(index)
            depSol = after.sol
            depUsdt = after.usdt
            depUsdc = after.usdc
            if (!sweepNote && (after.sol > 0.0001 || after.usdt > 0 || after.usdc > 0)) {
              sweepNote = 'incomplete'
            }
          }
        }
        await sql`UPDATE accounts SET dep_sol = ${depSol}, dep_usdt = ${depUsdt}, dep_usdc = ${depUsdc}, dep_lock = NULL WHERE user_id = ${userId}`

        const account = await loadAccount(userId)
        const txns = await loadTxns(userId)
        return res.status(200).json({ account, txns, found, sweepNote })
      }

      // ---- SELL -----------------------------------------------------------
      case 'sell': {
        const amt = Number(body.amount)
        const out: Asset = body.asset === 'USDT' ? 'USDT' : body.asset === 'USDC' ? 'USDC' : 'SOL'
        if (!amt || amt <= 0) return res.status(400).json({ error: 'Enter an amount to sell' })
        if (amt < 50) return res.status(400).json({ error: 'Minimum sell is 50 $MOOLA' })
        if (amt > a.available) return res.status(400).json({ error: 'Insufficient available balance' })
        // Sell at $0.0095 (5% below the $0.01 buy rate) — the platform's spread.
        const usd = amt * SELL_PRICE
        a.available -= amt
        a.balance -= amt
        let recvStr: string
        if (out === 'SOL') {
          const sol = usd / SOL_PRICE
          a.sol += sol
          recvStr = `${sol.toFixed(4)} SOL`
        } else if (out === 'USDT') {
          a.usdt += usd // USDT ≈ $1
          recvStr = `${fmt(usd, 2)} USDT`
        } else {
          a.usdc += usd // USDC ≈ $1
          recvStr = `${fmt(usd, 2)} USDC`
        }
        await saveAccount(userId, a)
        await addTxn(userId, { icon: '💱', title: 'Sold $MOOLA', sub: `${fmt(amt, 0)} $MOOLA`, amt: `+${recvStr}`, pos: true })
        break
      }

      // ---- WITHDRAW (on-chain payout from treasury) -----------------------
      case 'withdraw': {
        const solana = await import('../_lib/solana.js')
        if (!solana.payoutConfigured()) {
          return res.status(503).json({ error: 'Withdrawals are not available yet.' })
        }
        // First, settle any earlier ambiguous withdrawals (self-healing).
        await reconcilePending(userId, solana)

        const wasset: Asset = body.asset === 'USDC' ? 'USDC' : body.asset === 'USDT' ? 'USDT' : 'SOL'
        const wamt = Number(body.amount)
        const waddr = String(body.address || '').trim()
        const clientKey = String(body.key || '').slice(0, 80) || null
        if (!wamt || wamt <= 0) return res.status(400).json({ error: 'Enter an amount to withdraw' })
        if (!SOLANA_ADDR_RE.test(waddr)) return res.status(400).json({ error: 'Enter a valid Solana address' })
        // SOL min is set so the NET payout (after the 5% fee) still clears
        // Solana's rent-exempt floor (~0.00089) for a brand-new wallet.
        const MIN: Record<Asset, number> = { SOL: 0.002, USDT: 0.5, USDC: 0.5 }
        if (wamt < MIN[wasset]) {
          return res.status(400).json({ error: `Minimum withdrawal is ${MIN[wasset]} ${wasset}` })
        }

        // Blacklisted destination wallet (a known farm-ring payout address).
        const blk = await sql`SELECT 1 FROM blocked_addresses WHERE address = ${waddr}`
        if (blk.rows.length) {
          return res.status(403).json({ error: 'This destination wallet is blocked. Withdraw to a different address or contact support.' })
        }

        // ---- Anti-abuse guard ------------------------------------------
        // Blocks the farming loop: cashing out free airdrop/bonus tokens (and
        // the rewards they spin off) as real crypto. Runs BEFORE any withdrawal
        // row is created so a rejected attempt leaves no trace to reconcile.
        if (WITHDRAW_GUARD) {
          const [cutoff, assess] = await Promise.all([withdrawFreezeCutoff(), assessWithdrawable(userId)])

          // 1) Old accounts (the ones that existed when this shipped) are frozen.
          if (cutoff !== null && assess.createdAt < cutoff) {
            return res.status(403).json({
              error: 'Withdrawals are disabled for this account. If you believe this is a mistake, contact support.',
            })
          }

          // 2) Must have SOME legitimately-earned value (real deposit, or
          //    commission from a downline who actually invested).
          if (!assess.eligible) {
            return res.status(403).json({
              error:
                'You can only withdraw real funds — your own deposits, or commission from referrals who actually invested. Free airdrop and bonus tokens can’t be withdrawn.',
            })
          }

          // 3) Can't withdraw more than that legitimately-earned value.
          const reqUsd = assetUsd(wasset, wamt)
          if (reqUsd > assess.remainingUsd + 1e-6) {
            const left = assess.remainingUsd.toFixed(2)
            return res.status(403).json({
              error: `This exceeds your withdrawable limit (≈ $${left}). Your limit is your deposits + commission from investing referrals + rewards on your own stake, minus what you've already withdrawn.`,
            })
          }
        }

        // Idempotency: claim the request by (user, client_key). A duplicate
        // (e.g. a retry after a lost response) hits the unique index and is a
        // no-op rather than a second payout.
        const claim = await sql<{ id: number }>`
          INSERT INTO withdrawals (user_id, asset, amount, address, status, client_key)
          VALUES (${userId}, ${wasset}, ${wamt}, ${waddr}, 'new', ${clientKey})
          ON CONFLICT (user_id, client_key) DO NOTHING RETURNING id`
        if (clientKey && !claim.rows.length) {
          const account = await loadAccount(userId)
          const txns = await loadTxns(userId)
          return res.status(200).json({ account, txns, pending: true, error: 'This withdrawal was already submitted.' })
        }
        const withdrawalId = claim.rows[0]?.id

        // Atomically reserve the funds: the deduction only succeeds if the
        // balance covers it, so concurrent requests can't overdraw the wallet.
        let reserved = false
        if (wasset === 'SOL') {
          const r = await sql`UPDATE accounts SET sol = sol - ${wamt} WHERE user_id = ${userId} AND sol >= ${wamt} RETURNING user_id`
          reserved = r.rows.length > 0
        } else if (wasset === 'USDT') {
          const r = await sql`UPDATE accounts SET usdt = usdt - ${wamt} WHERE user_id = ${userId} AND usdt >= ${wamt} RETURNING user_id`
          reserved = r.rows.length > 0
        } else {
          const r = await sql`UPDATE accounts SET usdc = usdc - ${wamt} WHERE user_id = ${userId} AND usdc >= ${wamt} RETURNING user_id`
          reserved = r.rows.length > 0
        }
        if (!reserved) {
          await sql`UPDATE withdrawals SET status = 'failed' WHERE id = ${withdrawalId}`
          return res.status(400).json({ error: `Insufficient ${wasset} balance` })
        }

        await sql`UPDATE withdrawals SET status = 'pending' WHERE id = ${withdrawalId}`

        // 5% platform fee: the full `wamt` was deducted above, but only the net
        // (after fee) is paid on-chain. The fee stays in the payout wallet.
        const netAmt = wasset === 'SOL'
          ? Number((wamt * (1 - WITHDRAW_FEE_PCT / 100)).toFixed(9))
          : Number((wamt * (1 - WITHDRAW_FEE_PCT / 100)).toFixed(6))

        let sig: string
        try {
          sig = await solana.payout(waddr, wasset, netAmt)
        } catch (e) {
          const pe = e as { broadcast?: boolean; signature?: string; message?: string }
          if (pe.broadcast) {
            // Ambiguous — the payout may have landed on-chain. NEVER refund here,
            // or the user could be paid twice. Hold the (already-deducted) balance
            // and mark the withdrawal pending for reconciliation.
            await sql`UPDATE withdrawals SET status = 'pending', signature = ${pe.signature ?? null} WHERE id = ${withdrawalId}`
            const account = await loadAccount(userId)
            const txns = await loadTxns(userId)
            return res.status(200).json({
              account,
              txns,
              pending: true,
              error: "Your withdrawal is processing and should arrive shortly. If it doesn't, contact support — your balance is held safely.",
            })
          }
          // Provably not broadcast → nothing was paid out → safe to refund.
          if (wasset === 'SOL') await sql`UPDATE accounts SET sol = sol + ${wamt} WHERE user_id = ${userId}`
          else if (wasset === 'USDT') await sql`UPDATE accounts SET usdt = usdt + ${wamt} WHERE user_id = ${userId}`
          else await sql`UPDATE accounts SET usdc = usdc + ${wamt} WHERE user_id = ${userId}`
          await sql`UPDATE withdrawals SET status = 'failed' WHERE id = ${withdrawalId}`
          console.error('[moola] withdraw payout failed (safe refund):', e)
          return res.status(502).json({ error: 'Withdrawal failed: ' + (pe.message || 'please try again') })
        }

        await sql`UPDATE withdrawals SET status = 'sent', signature = ${sig} WHERE id = ${withdrawalId}`
        const wdec = wasset === 'SOL' ? 4 : 2
        await addTxn(userId, {
          icon: '🏧',
          title: `Withdrew ${wasset}`,
          sub: `${waddr.slice(0, 4)}…${waddr.slice(-4)} · ${fmt(netAmt, wdec)} sent (5% fee)`,
          amt: `-${fmt(wamt, wdec)} ${wasset}`,
          pos: false,
        })
        break
      }

      // ---- MINT NFT -------------------------------------------------------
      case 'mint': {
        const price = Number(body.price)
        const name = String(body.name || 'Calf NFT')
        if (!price || price <= 0) return res.status(400).json({ error: 'Invalid NFT' })
        if (a.available < price) return res.status(400).json({ error: `Need ${fmt(price, 0)} $MOOLA to mint` })
        a.available -= price
        a.balance -= price
        a.minted += 1
        await saveAccount(userId, a)
        await addTxn(userId, { icon: '🐮', title: `Minted ${name}`, sub: 'Calf NFT', amt: `-${fmt(price, 0)} $MOOLA`, pos: false })
        break
      }

      default:
        return res.status(404).json({ error: 'Unknown action' })
    }

    // Reload so the response reflects freshly-accrued rewards + new history.
    const account = await loadAccount(userId)
    const txns = await loadTxns(userId)
    const stats = await loadStats()
    return res.status(200).json({ account, txns, stats })
  } catch (e) {
    console.error('[moola] action error:', e)
    // Surface the real reason so deposit/chain misconfig is actionable instead
    // of a mystery "Something went wrong".
    const msg = e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.'
    return res.status(500).json({ error: msg })
  }
}

// Re-exported so the frontend and server share the same economic assumptions
// if ever bundled together; harmless otherwise.
export const ECON = { DAILY_RATE, STAKE_DAYS, PRESALE_PRICE, SOL_PRICE, AIRDROP_AMOUNT }
