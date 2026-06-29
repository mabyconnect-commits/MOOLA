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

// Loads the account, lazily accruing staking rewards for the time elapsed since
// the last touch, and persisting the new reward + timestamp. This makes reward
// growth real and server-authoritative rather than a client-only animation.
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
  const last = new Date(r.reward_updated_at).getTime()
  const lockStart = r.staked_at ? new Date(r.staked_at).getTime() : null
  const now = Date.now()

  let staked = r.staked
  let airdropLocked = Number(r.airdrop_locked || 0)
  let reward = r.reward
  let stakedAt = lockStart
  let changed = false

  if (staked > 0 && lockStart) {
    // Rewards accrue only within the STAKE_DAYS window — capped at maturity.
    const matureAt = lockStart + STAKE_DAYS * 86400 * 1000
    const effEnd = Math.min(now, matureAt)
    const accrued = (staked * DAILY_RATE * Math.max(0, (effEnd - last) / 1000)) / 86400
    if (accrued > 0) {
      reward += accrued
      changed = true
    }
    if (now >= matureAt) {
      // Stake matured: move the principal into the locked airdrop wallet
      // (permanent till official launch) and stop earning. Clearing staked_at
      // lets any future airdrop bonus start a fresh 20-day clock.
      airdropLocked += staked
      staked = 0
      stakedAt = null
      changed = true
    }
  } else if (staked > 0 && !lockStart) {
    // A stake with no lock-start (e.g. compounded after maturity) — start now.
    stakedAt = now
    changed = true
  }

  if (changed) {
    await sql`
      UPDATE accounts SET
        reward = ${reward},
        staked = ${staked},
        airdrop_locked = ${airdropLocked},
        staked_at = ${stakedAt ? new Date(stakedAt).toISOString() : null},
        reward_updated_at = now()
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
    stakedAt,
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

/** Increment the global presale counters when someone buys. */
export async function addPresale(tokens: number, usd: number): Promise<void> {
  await sql`INSERT INTO app_meta (key, val) VALUES ('presale_sold', ${String(tokens)})
    ON CONFLICT (key) DO UPDATE SET val = (COALESCE(app_meta.val::numeric, 0) + ${tokens})::text`
  await sql`INSERT INTO app_meta (key, val) VALUES ('presale_raised', ${String(usd)})
    ON CONFLICT (key) DO UPDATE SET val = (COALESCE(app_meta.val::numeric, 0) + ${usd})::text`
}

/** Live launch stats: baseline + real presale activity + real holder count. */
export async function loadStats(): Promise<Stats> {
  const sold = await sql<{ val: string }>`SELECT val FROM app_meta WHERE key = 'presale_sold'`
  const raised = await sql<{ val: string }>`SELECT val FROM app_meta WHERE key = 'presale_raised'`
  const holders = await sql<{ c: number }>`SELECT COUNT(*)::int AS c FROM accounts WHERE balance + staked > 0`
  return {
    raised: BASE_RAISED + Number(raised.rows[0]?.val || 0),
    holders: BASE_HOLDERS + Number(holders.rows[0]?.c || 0),
    sold: BASE_SOLD + Number(sold.rows[0]?.val || 0),
    total: PRESALE_TOTAL,
  }
}

export { fmt }
