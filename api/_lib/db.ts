import { sql } from '@vercel/postgres'

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
    })().catch((e) => {
      // Reset so a later request can retry schema creation.
      schemaReady = null
      throw e
    })
  }
  return schemaReady
}

export { sql }
