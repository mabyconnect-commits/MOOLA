import { sql } from './db.js'

// ---------------------------------------------------------------------------
// Economic constants — kept in one place and mirrored by the frontend.
// These are app-managed numbers (no real on-chain settlement happens here).
// ---------------------------------------------------------------------------
export const DAILY_RATE = 0.0205 // 2.05% per day
export const STAKE_DAYS = 20
export const PRESALE_PRICE = 0.01 // $0.01 per $MOOLA — the buy rate
// Sell rate is $0.0095 per $MOOLA: a 5% platform spread below the buy rate.
// (0.0095 / 0.01 = 0.95, so the platform keeps 5% on every sell.)
export const SELL_PRICE = 0.0095
export const SELL_FEE_PCT = 5 // platform take on each sell (the buy↔sell spread)
// Withdrawal fee: the full requested amount leaves the user's balance, but only
// (100 - WITHDRAW_FEE_PCT)% is paid on-chain to their wallet. The rest is the
// platform's fee (kept in the payout wallet).
export const WITHDRAW_FEE_PCT = 5
export const SOL_PRICE = 152 // illustrative SOL price used for sell quotes
export const AIRDROP_AMOUNT = 200 // $MOOLA granted on airdrop claim

// Airdrop referral bonus — paid to the upline (auto-staked) when a downline
// registers successfully. Fixed $MOOLA per level, summing to 2 across 10 levels:
// 1 + 0.2 + 0.18 + 0.15 + 0.13 + 0.11 + 0.1 + 0.06 + 0.04 + 0.03 = 2.
export const AIRDROP_REF_AMOUNTS = [1, 0.2, 0.18, 0.15, 0.13, 0.11, 0.1, 0.06, 0.04, 0.03]
export const AIRDROP_REF_TOTAL = 2

export interface Account {
  balance: number
  staked: number
  available: number
  reward: number
  airdrop: number
  airdropLocked: number // matured airdrop principal, locked permanently till launch
  sol: number
  usdt: number
  usdc: number
  minted: number
  airdropClaimed: boolean
  claimAddr: string | null
  stakedAt: number | null // ms timestamp of the first stake (lock start)
}

export interface Txn {
  icon: string
  title: string
  sub: string
  amt: string
  pos: boolean
}

interface AccountRow {
  balance: number
  staked: number
  available: number
  reward: number
  airdrop: number
  airdrop_locked: number
  sol: number
  usdt: number
  usdc: number
  minted: number
  airdrop_claimed: boolean
  claim_addr: string | null
  reward_updated_at: string
  staked_at: string | null
}

function fmt(n: number, d: number): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

// Ensures an account row exists for the user (created on first verify/login).
export async function ensureAccount(userId: number): Promise<void> {
  await sql`INSERT INTO accounts (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`
}

// Records a new stake "lot" — a chunk of staked $MOOLA with its OWN 20-day
// clock starting now. Each airdrop, bonus, manual stake or compound is its own
// lot, so they mature (and lock) independently based on when each was earned.
// Callers must also move the principal into accounts.staked (kept as a fast
// denormalised aggregate); the lot is the source of truth for the clock.
export async function addStakeLot(userId: number, amount: number, source: string): Promise<void> {
  if (amount <= 0) return
  await sql`INSERT INTO stake_lots (user_id, amount, source) VALUES (${userId}, ${amount}, ${source})`
}

// Loads the account, accruing staking rewards per-lot (each lot earns
// DAILY_RATE/day for STAKE_DAYS from its own earned_at). When a lot passes its
// 20-day mark its principal is moved out of `staked` into `airdrop_locked`
// (locked permanently till launch) and it stops earning. Rewards accumulate
// into the claimable `reward` balance, which the user can claim → withdraw.
export async function loadAccount(userId: number): Promise<Account> {
  const { rows } = await sql<AccountRow>`SELECT * FROM accounts WHERE user_id = ${userId}`
  if (rows.length === 0) {
    await ensureAccount(userId)
    return {
      balance: 0, staked: 0, available: 0, reward: 0, airdrop: 0, airdropLocked: 0,
      sol: 0, usdt: 0, usdc: 0, minted: 0, airdropClaimed: false, claimAddr: null,
      stakedAt: null,
    }
  }
  const r = rows[0]
  const now = Date.now()

  // Walk the still-earning lots, accruing reward up to each lot's own maturity.
  const lots = await sql<{ id: number; amount: number; earned_at: string; reward_paid: number }>`
    SELECT id, amount, earned_at, reward_paid FROM stake_lots
    WHERE user_id = ${userId} AND locked = FALSE`

  let rewardDelta = 0
  let lockedDelta = 0
  let earliest: number | null = null
  const accrueIds: number[] = []
  const accruePaid: number[] = []
  const matureIds: number[] = []
  for (const lot of lots.rows) {
    const start = new Date(lot.earned_at).getTime()
    if (earliest === null || start < earliest) earliest = start
    const matureAt = start + STAKE_DAYS * 86400 * 1000
    const effEnd = Math.min(now, matureAt)
    const totalDue = (Number(lot.amount) * DAILY_RATE * Math.max(0, (effEnd - start) / 1000)) / 86400
    const newReward = totalDue - Number(lot.reward_paid)
    if (newReward > 1e-12) {
      rewardDelta += newReward
      accrueIds.push(lot.id)
      accruePaid.push(totalDue)
    }
    if (now >= matureAt) {
      matureIds.push(lot.id)
      lockedDelta += Number(lot.amount)
    }
  }

  const reward = r.reward + rewardDelta
  let staked = r.staked - lockedDelta
  if (staked < 0) staked = 0
  const airdropLocked = Number(r.airdrop_locked || 0) + lockedDelta

  if (accrueIds.length) {
    await sql`
      UPDATE stake_lots SET reward_paid = d.rp
      FROM (SELECT unnest(${accrueIds}::bigint[]) AS id, unnest(${accruePaid}::float8[]) AS rp) d
      WHERE stake_lots.id = d.id`
  }
  if (matureIds.length) {
    await sql`UPDATE stake_lots SET locked = TRUE, locked_at = now() WHERE id = ANY(${matureIds}::bigint[])`
  }
  if (rewardDelta !== 0 || lockedDelta !== 0) {
    await sql`
      UPDATE accounts SET reward = ${reward}, staked = ${staked}, airdrop_locked = ${airdropLocked}, reward_updated_at = now()
      WHERE user_id = ${userId}`
  }

  return {
    balance: r.balance,
    staked,
    available: r.available,
    reward,
    airdrop: r.airdrop,
    airdropLocked,
    sol: r.sol,
    usdt: r.usdt,
    usdc: r.usdc,
    minted: r.minted,
    airdropClaimed: r.airdrop_claimed,
    claimAddr: r.claim_addr,
    stakedAt: earliest,
  }
}

// Writes the mutable economic fields back. reward_updated_at is reset to now()
// so the next accrual window starts fresh from the persisted reward value.
export async function saveAccount(userId: number, a: Account): Promise<void> {
  await sql`
    UPDATE accounts SET
      balance = ${a.balance},
      staked = ${a.staked},
      available = ${a.available},
      reward = ${a.reward},
      airdrop = ${a.airdrop},
      airdrop_locked = ${a.airdropLocked},
      sol = ${a.sol},
      usdt = ${a.usdt},
      usdc = ${a.usdc},
      minted = ${a.minted},
      airdrop_claimed = ${a.airdropClaimed},
      claim_addr = ${a.claimAddr},
      reward_updated_at = now()
    WHERE user_id = ${userId}
  `
}

export async function addTxn(userId: number, t: Txn): Promise<void> {
  await sql`
    INSERT INTO transactions (user_id, type, icon, title, sub, amt, pos)
    VALUES (${userId}, ${t.title}, ${t.icon}, ${t.title}, ${t.sub}, ${t.amt}, ${t.pos})
  `
}

export async function loadTxns(userId: number): Promise<Txn[]> {
  const { rows } = await sql<{ icon: string; title: string; sub: string; amt: string; pos: boolean }>`
    SELECT icon, title, sub, amt, pos FROM transactions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 50
  `
  return rows.map((r) => ({ icon: r.icon, title: r.title, sub: r.sub, amt: r.amt, pos: r.pos }))
}

// ---------------------------------------------------------------------------
// Launch stats — real aggregates plus a marketing baseline so the numbers look
// alive at launch and grow with genuine activity.
// ---------------------------------------------------------------------------
export const PRESALE_TOTAL = 700_000_000
export const BASE_SOLD = 2_300_000
export const BASE_RAISED = 23_000
export const BASE_HOLDERS = 1_300

export interface Stats {
  raised: number
  holders: number
  sold: number
  total: number
}

/**
 * Live launch stats: a marketing baseline plus REAL on-app activity.
 *
 * `sold` is derived from the actual $MOOLA distributed across every account
 * (SUM(balance)), so it reflects all genuine holders the moment they hold
 * tokens and grows as more is bought — no separate counter to drift out of
 * sync. `raised` stays consistent at sold × presale price, and `holders`
 * counts everyone actually holding tokens.
 */
export async function loadStats(): Promise<Stats> {
  const { rows } = await sql<{ sold: number; holders: number }>`
    SELECT COALESCE(SUM(balance), 0)::float8 AS sold,
           COUNT(*) FILTER (WHERE balance + staked > 0)::int AS holders
    FROM accounts`
  const realSold = Number(rows[0]?.sold || 0)
  return {
    raised: BASE_RAISED + realSold * PRESALE_PRICE,
    holders: BASE_HOLDERS + Number(rows[0]?.holders || 0),
    sold: BASE_SOLD + realSold,
    total: PRESALE_TOTAL,
  }
}

export { fmt }
