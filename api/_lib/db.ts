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
    })().catch((e) => {
      // Reset so a later request can retry schema creation.
      schemaReady = null
      throw e
    })
  }
  return schemaReady
}
