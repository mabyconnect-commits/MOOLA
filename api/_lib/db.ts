import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// Use Neon's native serverless driver (the integration Vercel now provisions
// for Postgres). Resolve the connection string from whichever env var the
// integration created — POSTGRES_URL, DATABASE_URL, or a Neon-specific name.
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.NEON_DATABASE_URL

// Create the query function lazily so a missing/invalid connection string
// surfaces as a handled error at request time (JSON 500) rather than crashing
// the serverless function at import time (which would hide the real cause).
let _query: NeonQueryFunction<false, false> | null = null
function query(): NeonQueryFunction<false, false> {
  if (!_query) {
    if (!connectionString) {
      throw new Error('No Postgres connection string configured (set POSTGRES_URL or DATABASE_URL).')
    }
    _query = neon(connectionString)
  }
  return _query
}

// `sql\`...\`` returns { rows } to match the shape the rest of the code expects.
export async function sql<O = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: O[] }> {
  const rows = (await query()(strings, ...values)) as O[]
  return { rows }
}

// ---------------------------------------------------------------------------
// Schema
//
// We keep three tables:
//   users         — credentials + email-verification state
//   accounts      — one row per user holding the on-app economic balances
//   transactions  — the user's activity feed (powers Transaction History)
//
// Everything auto-creates on the first request to a fresh database, so a brand
// new Vercel Postgres needs no manual migration step.
// ---------------------------------------------------------------------------

let schemaReady: Promise<void> | null = null

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id             BIGSERIAL PRIMARY KEY,
          email          TEXT UNIQUE NOT NULL,
          password_hash  TEXT NOT NULL,
          email_verified BOOLEAN NOT NULL DEFAULT FALSE,
          verify_code    TEXT,
          verify_expires TIMESTAMPTZ,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS accounts (
          user_id           BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          balance           DOUBLE PRECISION NOT NULL DEFAULT 0,
          staked            DOUBLE PRECISION NOT NULL DEFAULT 0,
          available         DOUBLE PRECISION NOT NULL DEFAULT 0,
          reward            DOUBLE PRECISION NOT NULL DEFAULT 0,
          airdrop           DOUBLE PRECISION NOT NULL DEFAULT 0,
          sol               DOUBLE PRECISION NOT NULL DEFAULT 0,
          usdt              DOUBLE PRECISION NOT NULL DEFAULT 0,
          usdc              DOUBLE PRECISION NOT NULL DEFAULT 0,
          minted            INTEGER NOT NULL DEFAULT 0,
          airdrop_claimed   BOOLEAN NOT NULL DEFAULT FALSE,
          claim_addr        TEXT,
          reward_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS transactions (
          id         BIGSERIAL PRIMARY KEY,
          user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type       TEXT NOT NULL,
          icon       TEXT NOT NULL DEFAULT '💸',
          title      TEXT NOT NULL,
          sub        TEXT NOT NULL,
          amt        TEXT NOT NULL,
          pos        BOOLEAN NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `

      // ---- Referral columns + table (idempotent migrations) ----
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code TEXT`
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by BIGINT`
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS upline BIGINT[] NOT NULL DEFAULT '{}'`
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_ref_code_idx ON users(ref_code)`
      await sql`CREATE INDEX IF NOT EXISTS users_upline_gin ON users USING GIN (upline)`
      await sql`
        CREATE TABLE IF NOT EXISTS referral_earnings (
          id          BIGSERIAL PRIMARY KEY,
          beneficiary BIGINT NOT NULL,
          from_user   BIGINT NOT NULL,
          level       INT NOT NULL,
          buy_tokens  DOUBLE PRECISION NOT NULL,
          commission  DOUBLE PRECISION NOT NULL,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS ref_earn_beneficiary_idx ON referral_earnings(beneficiary)`
      // Airdrop referral bonus earned per downline signup (separate from buy
      // commission), so the referral breakdown can show it per level.
      await sql`ALTER TABLE referral_earnings ADD COLUMN IF NOT EXISTS bonus DOUBLE PRECISION NOT NULL DEFAULT 0`

      // ---- On-chain deposit columns (idempotent migrations) ----
      // deposit_index: per-user HD index for their unique deposit address.
      // dep_*: cumulative on-chain amount already credited (prevents double-credit).
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_index INTEGER`
      // Matured airdrop principal, locked permanently till official launch.
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS airdrop_locked DOUBLE PRECISION NOT NULL DEFAULT 0`
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS dep_sol DOUBLE PRECISION NOT NULL DEFAULT 0`
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS dep_usdt DOUBLE PRECISION NOT NULL DEFAULT 0`
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS dep_usdc DOUBLE PRECISION NOT NULL DEFAULT 0`

      // Stake lock start time (for real lock-progress). Backfill existing
      // active stakes from their last reward timestamp.
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS staked_at TIMESTAMPTZ`
      await sql`UPDATE accounts SET staked_at = reward_updated_at WHERE staked_at IS NULL AND staked > 0`

      // ---- Withdrawals audit log (on-chain payouts from the treasury) ----
      await sql`
        CREATE TABLE IF NOT EXISTS withdrawals (
          id         BIGSERIAL PRIMARY KEY,
          user_id    BIGINT NOT NULL,
          asset      TEXT NOT NULL,
          amount     DOUBLE PRECISION NOT NULL,
          address    TEXT NOT NULL,
          status     TEXT NOT NULL DEFAULT 'pending',
          signature  TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS withdrawals_user_idx ON withdrawals(user_id)`
      // Index the payout destination so the abuse report can group by address
      // (spotting one wallet drained by many accounts — a farming ring).
      await sql`CREATE INDEX IF NOT EXISTS withdrawals_address_idx ON withdrawals(address)`
      // Idempotency: a (user, client_key) pair maps to at most one withdrawal.
      // Must be a FULL unique index (not partial) so `ON CONFLICT (user_id,
      // client_key)` can match it. NULL client_keys stay distinct (Postgres
      // treats NULLs as not-equal), so rows without a key never collide.
      await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS client_key TEXT`
      await sql`DROP INDEX IF EXISTS withdrawals_user_key_idx`
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_user_key_uq ON withdrawals(user_id, client_key)`
      // Per-user mutex so concurrent deposit-checks can't double-credit.
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS dep_lock TIMESTAMPTZ`
      // Cumulative USD value of REAL on-chain deposits this account has ever
      // been credited (survives sweeps, which reset dep_*). This is the anchor
      // for the withdrawal guard: you can only cash out real money you brought
      // in (deposits) plus what you genuinely earned (investor commission /
      // rewards on real stake) — never free airdrop/bonus tokens.
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deposited_usd DOUBLE PRECISION NOT NULL DEFAULT 0`
      // Fixed-window rate limiting.
      await sql`CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, win BIGINT NOT NULL, n INT NOT NULL)`

      // ---- Stake lots: each staked chunk has its OWN 20-day clock ----
      // A lot is created per airdrop claim / referral bonus / manual stake /
      // compound, with earned_at = when it was earned. Rewards accrue per-lot
      // until that lot's maturity, after which its principal locks. accounts.
      // staked / airdrop_locked are kept as fast aggregates of the lots.
      await sql`
        CREATE TABLE IF NOT EXISTS stake_lots (
          id          BIGSERIAL PRIMARY KEY,
          user_id     BIGINT NOT NULL,
          amount      DOUBLE PRECISION NOT NULL,
          source      TEXT NOT NULL DEFAULT 'stake',
          earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
          reward_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
          locked      BOOLEAN NOT NULL DEFAULT FALSE,
          locked_at   TIMESTAMPTZ
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS stake_lots_user_active_idx ON stake_lots(user_id) WHERE locked = FALSE`

      // ---- One-time pre-launch test-data wipe ----
      // Clears fake balances created by the old simulated deposit/buy. Runs
      // exactly once (tracked in app_meta), automatically on deploy.
      await sql`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, val TEXT)`

      const reset = await sql<{ key: string }>`SELECT key FROM app_meta WHERE key = 'reset_testdata_v1'`
      if (!reset.rows[0]) {
        await sql`UPDATE accounts SET
          balance=0, staked=0, available=0, reward=0, airdrop=0,
          sol=0, usdt=0, usdc=0, minted=0, airdrop_claimed=false,
          dep_sol=0, dep_usdt=0, dep_usdc=0, reward_updated_at=now()`
        await sql`DELETE FROM transactions`
        await sql`DELETE FROM referral_earnings`
        await sql`INSERT INTO app_meta (key, val) VALUES ('reset_testdata_v1', 'done')`
      }

      // ---- One-time stake-lot backfill (runs after the test-data reset) ----
      // Turns each existing staked balance into a single lot so per-lot accrual
      // takes over without losing reward already credited. reward_paid is the
      // reward already produced (capped at maturity) so no balance jumps;
      // DAILY_RATE=0.0205, STAKE_DAYS window = 20*86400s.
      const lotsBackfill = await sql<{ key: string }>`SELECT key FROM app_meta WHERE key = 'lots_backfill_v1'`
      if (!lotsBackfill.rows[0]) {
        await sql`
          INSERT INTO stake_lots (user_id, amount, source, earned_at, reward_paid)
          SELECT user_id, staked, 'legacy',
                 COALESCE(staked_at, reward_updated_at, now()),
                 staked * 0.0205
                   * LEAST(EXTRACT(EPOCH FROM (now() - COALESCE(staked_at, reward_updated_at, now()))), 20 * 86400) / 86400
          FROM accounts WHERE staked > 0`
        await sql`INSERT INTO app_meta (key, val) VALUES ('lots_backfill_v1', 'done')`
      }
    })().catch((e) => {
      // Reset so a later request can retry schema creation.
      schemaReady = null
      throw e
    })
  }
  return schemaReady
}

/** Assign (once) and return a user's deposit-address HD index. Index 0 reserved. */
export async function getDepositIndex(userId: number): Promise<number> {
  const { rows } = await sql<{ deposit_index: number | null }>`
    SELECT deposit_index FROM users WHERE id = ${userId}`
  if (rows[0]?.deposit_index != null) return rows[0].deposit_index
  const max = await sql<{ m: number }>`SELECT COALESCE(MAX(deposit_index), 0) AS m FROM users`
  const next = Number(max.rows[0].m) + 1
  await sql`UPDATE users SET deposit_index = ${next} WHERE id = ${userId}`
  return next
}

/** Read the cumulative already-credited deposit amounts for an account. */
export async function getDepCredited(
  userId: number,
): Promise<{ dep_sol: number; dep_usdt: number; dep_usdc: number }> {
  const { rows } = await sql<{ dep_sol: number; dep_usdt: number; dep_usdc: number }>`
    SELECT dep_sol, dep_usdt, dep_usdc FROM accounts WHERE user_id = ${userId}`
  return rows[0] || { dep_sol: 0, dep_usdt: 0, dep_usdc: 0 }
}
