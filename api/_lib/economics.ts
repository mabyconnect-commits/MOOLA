import { sql } from './db.js'

// ---------------------------------------------------------------------------
// Economic constants — kept in one place and mirrored by the frontend.
// These are app-managed numbers (no real on-chain settlement happens here).
// ---------------------------------------------------------------------------
export const DAILY_RATE = 0.0205 // 2.05% per day
export const STAKE_DAYS = 20
export const PRESALE_PRICE = 0.01 // $0.01 per $MOOLA
export const SOL_PRICE = 152 // illustrative SOL price used for sell quotes
export const AIRDROP_AMOUNT = 200 // $MOOLA granted on airdrop claim

export interface Account {
  balance: number
  staked: number
  available: number
  reward: number
  airdrop: number
  sol: number
  usdt: number
  usdc: number
  minted: number
  airdropClaimed: boolean
  claimAddr: string | null
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
  sol: number
  usdt: number
  usdc: number
  minted: number
  airdrop_claimed: boolean
  claim_addr: string | null
  reward_updated_at: string
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
      balance: 0, staked: 0, available: 0, reward: 0, airdrop: 0,
      sol: 0, usdt: 0, usdc: 0, minted: 0, airdropClaimed: false, claimAddr: null,
    }
  }
  const r = rows[0]
  const last = new Date(r.reward_updated_at).getTime()
  const elapsedSec = Math.max(0, (Date.now() - last) / 1000)
  const accrued = (r.staked * DAILY_RATE * elapsedSec) / 86400
  const reward = r.reward + accrued

  if (accrued > 0) {
    await sql`UPDATE accounts SET reward = ${reward}, reward_updated_at = now() WHERE user_id = ${userId}`
  }

  return {
    balance: r.balance,
    staked: r.staked,
    available: r.available,
    reward,
    airdrop: r.airdrop,
    sol: r.sol,
    usdt: r.usdt,
    usdc: r.usdc,
    minted: r.minted,
    airdropClaimed: r.airdrop_claimed,
    claimAddr: r.claim_addr,
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

export { fmt }
