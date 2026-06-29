import { sql } from './db.js'
import { fmt, AIRDROP_REF_AMOUNTS } from './economics.js'

// 10-level commission rates (mirrors the frontend refLevels: 3.5% … 0.1%).
// Commission is paid in $MOOLA as a percentage of the tokens a downline buys.
export const REF_PCTS = [0.035, 0.018, 0.016, 0.014, 0.012, 0.01, 0.008, 0.004, 0.002, 0.001]

// Unambiguous character set (no 0/O/1/I) for shareable codes.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function genRefCode(): string {
  let s = ''
  for (let i = 0; i < 8; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return s
}

export interface ReferrerInfo {
  id: number
  upline: number[]
}

// Look up a referrer by their shareable code.
export async function resolveReferrer(code: string): Promise<ReferrerInfo | null> {
  const c = (code || '').trim().toUpperCase()
  if (!c) return null
  const { rows } = await sql<{ id: number | string; upline: (number | string)[] | null }>`
    SELECT id, upline FROM users WHERE ref_code = ${c} LIMIT 1`
  if (!rows.length) return null
  return { id: Number(rows[0].id), upline: (rows[0].upline || []).map(Number) }
}

// A new user's upline = their referrer, then the referrer's upline, capped at
// 10 levels. Stored once so commission payouts never have to walk the tree.
export function buildUpline(referrer: ReferrerInfo | null): number[] {
  if (!referrer) return []
  return [referrer.id, ...referrer.upline].slice(0, 10)
}

// Backfill a referral code for an existing account that predates this feature.
export async function ensureRefCode(userId: number): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = genRefCode()
    try {
      await sql`UPDATE users SET ref_code = ${code} WHERE id = ${userId} AND ref_code IS NULL`
    } catch {
      continue // unique collision — try another code
    }
    const { rows } = await sql<{ ref_code: string | null }>`SELECT ref_code FROM users WHERE id = ${userId}`
    if (rows[0]?.ref_code) return rows[0].ref_code
  }
  return ''
}

export interface RefRowData {
  refs: string
  buy: string
  comm: string
}
export interface ReferralData {
  code: string
  commissionStr: string
  rows: RefRowData[]
}

// Everything the referral UI needs, in two indexed aggregate queries:
//  - downline counts per level (from the upline membership)
//  - buy volume + commission per level (from recorded earnings)
export async function loadReferral(userId: number): Promise<ReferralData> {
  const u = await sql<{ ref_code: string | null }>`SELECT ref_code FROM users WHERE id = ${userId}`
  let code = u.rows[0]?.ref_code || ''
  if (!code) code = await ensureRefCode(userId)

  const counts = await sql<{ lvl: number | string | null; n: number | string }>`
    SELECT array_position(upline, ${userId}::bigint) AS lvl, count(*)::int AS n
    FROM users
    WHERE ${userId}::bigint = ANY(upline)
    GROUP BY 1`

  const earn = await sql<{ level: number | string; comm: number | string; buy: number | string }>`
    SELECT level, COALESCE(sum(commission), 0) AS comm, COALESCE(sum(buy_tokens), 0) AS buy
    FROM referral_earnings
    WHERE beneficiary = ${userId}
    GROUP BY level`

  const refsByLvl = new Map<number, number>()
  for (const r of counts.rows) {
    const l = Number(r.lvl)
    if (l >= 1 && l <= 10) refsByLvl.set(l, Number(r.n))
  }
  const earnByLvl = new Map<number, { comm: number; buy: number }>()
  let totalComm = 0
  for (const r of earn.rows) {
    const l = Number(r.level)
    earnByLvl.set(l, { comm: Number(r.comm), buy: Number(r.buy) })
    totalComm += Number(r.comm)
  }

  const rows: RefRowData[] = []
  for (let lvl = 1; lvl <= 10; lvl++) {
    const e = earnByLvl.get(lvl) || { comm: 0, buy: 0 }
    rows.push({ refs: String(refsByLvl.get(lvl) || 0), buy: fmt(e.buy, 0), comm: fmt(e.comm, 3) })
  }
  return { code, commissionStr: fmt(totalComm, 3), rows }
}

// Pay the airdrop referral bonus up a NEW user's upline when they register
// successfully. Each level earns a fixed $MOOLA amount (AIRDROP_REF_AMOUNTS),
// auto-staked into the earner's airdrop stake. Fires once per new user.
export async function distributeAirdropCommission(newUserId: number): Promise<void> {
  const u = await sql<{ upline: (number | string)[] | null }>`SELECT upline FROM users WHERE id = ${newUserId}`
  const upline = (u.rows[0]?.upline || []).map(Number)
  if (!upline.length) return

  const ids: number[] = []
  const amts: number[] = []
  const levels: number[] = []
  for (let i = 0; i < upline.length && i < AIRDROP_REF_AMOUNTS.length; i++) {
    ids.push(upline[i])
    amts.push(AIRDROP_REF_AMOUNTS[i])
    levels.push(i + 1)
  }
  if (!ids.length) return

  // Make sure every upline earner has an accounts row (a referrer may not have
  // verified yet), so the credit below can't silently miss them.
  await sql`INSERT INTO accounts (user_id) SELECT unnest(${ids}::bigint[]) ON CONFLICT (user_id) DO NOTHING`

  // Auto-stake the bonus: it joins the earner's airdrop principal + stake, and
  // starts their 20-day lock clock if it isn't already running.
  await sql`
    UPDATE accounts SET
      staked = staked + d.amt,
      balance = balance + d.amt,
      airdrop = airdrop + d.amt,
      staked_at = COALESCE(staked_at, now())
    FROM (SELECT unnest(${ids}::bigint[]) AS user_id, unnest(${amts}::float8[]) AS amt) d
    WHERE accounts.user_id = d.user_id`

  // Notify each earner in their activity feed.
  const types = ids.map(() => 'Airdrop bonus')
  const icons = ids.map(() => '🎁')
  const titles = ids.map(() => 'Airdrop bonus')
  const subs = levels.map((l) => `Level ${l} · referral signup · auto-staked`)
  const amtStrs = amts.map((a) => `+${fmt(a, 3)} $MOOLA`)
  const poss = ids.map(() => true)
  await sql`
    INSERT INTO transactions (user_id, type, icon, title, sub, amt, pos)
    SELECT * FROM unnest(
      ${ids}::bigint[], ${types}::text[], ${icons}::text[], ${titles}::text[],
      ${subs}::text[], ${amtStrs}::text[], ${poss}::boolean[])`
}

// Pay commission up the buyer's stored upline in two batched statements.
// `tokens` is the $MOOLA the buyer received in the presale purchase.
export async function distributeCommission(buyerId: number, tokens: number): Promise<void> {
  if (tokens <= 0) return
  const u = await sql<{ upline: (number | string)[] | null }>`SELECT upline FROM users WHERE id = ${buyerId}`
  const upline = (u.rows[0]?.upline || []).map(Number)
  if (!upline.length) return

  const ids: number[] = []
  const amts: number[] = []
  const levels: number[] = []
  for (let i = 0; i < upline.length && i < 10; i++) {
    const amt = tokens * REF_PCTS[i]
    if (amt <= 0) continue
    ids.push(upline[i])
    amts.push(amt)
    levels.push(i + 1)
  }
  if (!ids.length) return

  // Credit every upline account in a single statement.
  await sql`
    UPDATE accounts SET available = available + d.amt, balance = balance + d.amt
    FROM (SELECT unnest(${ids}::bigint[]) AS user_id, unnest(${amts}::float8[]) AS amt) d
    WHERE accounts.user_id = d.user_id`

  // Record the earnings (powers the per-level breakdown) in a single statement.
  const fromUsers = ids.map(() => buyerId)
  const buyTokens = ids.map(() => tokens)
  await sql`
    INSERT INTO referral_earnings (beneficiary, from_user, level, buy_tokens, commission)
    SELECT * FROM unnest(${ids}::bigint[], ${fromUsers}::bigint[], ${levels}::int[], ${buyTokens}::float8[], ${amts}::float8[])`

  // Drop a notification into each beneficiary's activity feed so referral
  // commission is visible there, not just in the referral breakdown.
  const types = ids.map(() => 'Referral commission')
  const icons = ids.map(() => '🤝')
  const titles = ids.map(() => 'Referral commission')
  const subs = levels.map((l) => `Level ${l} · from a referral's buy`)
  const amtStrs = amts.map((a) => `+${fmt(a, 3)} $MOOLA`)
  const poss = ids.map(() => true)
  await sql`
    INSERT INTO transactions (user_id, type, icon, title, sub, amt, pos)
    SELECT * FROM unnest(
      ${ids}::bigint[], ${types}::text[], ${icons}::text[], ${titles}::text[],
      ${subs}::text[], ${amtStrs}::text[], ${poss}::boolean[])`
}
