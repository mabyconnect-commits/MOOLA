import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ensureSchema, getDepositIndex, getDepCredited, sql } from '../_lib/db.js'
import { SOLANA_ADDR_RE, userIdFromReq } from '../_lib/auth.js'
import { distributeCommission } from '../_lib/referral.js'
// NOTE: the Solana module (heavy deps + env-derived keys) is imported lazily
// inside the deposit cases only, so a misconfig there can never crash the whole
// action function (which would 500 every action — claim, stake, buy, …).
import {
  AIRDROP_AMOUNT,
  PRESALE_PRICE,
  SOL_PRICE,
  STAKE_DAYS,
  DAILY_RATE,
  addTxn,
  fmt,
  loadAccount,
  loadTxns,
  saveAccount,
} from '../_lib/economics.js'

type Ccy = 'USDT' | 'USDC'
type Asset = 'SOL' | 'USDT' | 'USDC'

// All balance-changing actions live here so we stay well under Vercel's
// function count. Each one mirrors the frontend logic, but the server is now
// the source of truth and every change is persisted + recorded in history.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = userIdFromReq(req)
  if (!userId) return res.status(401).json({ error: 'Not authenticated' })

  const type = req.query.type as string
  const body = (req.body || {}) as Record<string, unknown>

  try {
    await ensureSchema()
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
        const { depositConfigured, readBalances } = await import('../_lib/solana.js')
        if (!depositConfigured()) return res.status(503).json({ error: 'Deposit system not configured' })
        const index = await getDepositIndex(userId)
        const onchain = await readBalances(index)
        const seen = await getDepCredited(userId)
        const newSol = Math.max(0, onchain.sol - seen.dep_sol)
        const newUsdt = Math.max(0, onchain.usdt - seen.dep_usdt)
        const newUsdc = Math.max(0, onchain.usdc - seen.dep_usdc)
        if (newSol > 0 || newUsdt > 0 || newUsdc > 0) {
          a.sol += newSol
          a.usdt += newUsdt
          a.usdc += newUsdc
          await saveAccount(userId, a)
          await sql`UPDATE accounts SET dep_sol = ${onchain.sol}, dep_usdt = ${onchain.usdt}, dep_usdc = ${onchain.usdc} WHERE user_id = ${userId}`
          if (newSol > 0) await addTxn(userId, { icon: '⬇️', title: 'SOL deposit', sub: 'Solana', amt: `+${fmt(newSol, 4)} SOL`, pos: true })
          if (newUsdt > 0) await addTxn(userId, { icon: '⬇️', title: 'USDT deposit', sub: 'Solana (SPL)', amt: `+${fmt(newUsdt, 2)} USDT`, pos: true })
          if (newUsdc > 0) await addTxn(userId, { icon: '⬇️', title: 'USDC deposit', sub: 'Solana (SPL)', amt: `+${fmt(newUsdc, 2)} USDC`, pos: true })
        }
        const account = await loadAccount(userId)
        const txns = await loadTxns(userId)
        return res.status(200).json({ account, txns, found: newSol > 0 || newUsdt > 0 || newUsdc > 0 })
      }

      // ---- SELL -----------------------------------------------------------
      case 'sell': {
        const amt = Number(body.amount)
        if (!amt || amt <= 0) return res.status(400).json({ error: 'Enter an amount to sell' })
        if (amt > a.available) return res.status(400).json({ error: 'Insufficient available balance' })
        const sol = (amt * PRESALE_PRICE) / SOL_PRICE
        a.available -= amt
        a.balance -= amt
        a.sol += sol
        await saveAccount(userId, a)
        await addTxn(userId, { icon: '💱', title: 'Sold $MOOLA', sub: `${fmt(amt, 0)} $MOOLA`, amt: `+${sol.toFixed(4)} SOL`, pos: true })
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
    return res.status(200).json({ account, txns })
  } catch (e) {
    console.error('[moola] action error:', e)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}

// Re-exported so the frontend and server share the same economic assumptions
// if ever bundled together; harmless otherwise.
export const ECON = { DAILY_RATE, STAKE_DAYS, PRESALE_PRICE, SOL_PRICE, AIRDROP_AMOUNT }
