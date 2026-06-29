import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from './_lib/db.js'

// Diagnostic endpoint — open https://<your-domain>/api/health in a browser.
// Reports which env vars are present (booleans only, never the values) and
// whether a trivial database query succeeds. Safe to leave in; exposes no
// secrets.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const env = {
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    DATABASE_URL_UNPOOLED: !!process.env.DATABASE_URL_UNPOOLED,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    MOOLA_EMAIL_FROM: !!process.env.MOOLA_EMAIL_FROM,
  }

  // Deposit / treasury-sweep configuration (booleans only).
  const rpc = !!process.env.SOLANA_RPC_URL
  const masterSeed = !!process.env.MASTER_SEED
  const treasuryAddr = !!process.env.TREASURY_ADDRESS
  const treasurySecret = !!process.env.TREASURY_SECRET
  const payoutAddr = !!process.env.PAYOUT_ADDRESS
  const payoutSecret = !!process.env.PAYOUT_SECRET
  const solana = {
    SOLANA_RPC_URL: rpc,
    MASTER_SEED: masterSeed,
    TREASURY_ADDRESS: treasuryAddr,
    TREASURY_SECRET: treasurySecret,
    PAYOUT_ADDRESS: payoutAddr,
    PAYOUT_SECRET: payoutSecret,
    SWEEP_PAYOUT_PCT: process.env.SWEEP_PAYOUT_PCT || '45 (default)',
    USDC_MINT: !!process.env.USDC_MINT,
    USDT_MINT: !!process.env.USDT_MINT,
    // What each capability needs:
    depositReady: rpc && masterSeed && treasuryAddr, // detect + credit deposits
    sweepReady: rpc && masterSeed && treasuryAddr && payoutAddr && treasurySecret, // split-sweep
    payoutReady: rpc && payoutAddr && payoutSecret, // withdrawals (from payout wallet)
  }

  let db: { ok: boolean; error?: string }
  try {
    const r = await sql<{ ok: number }>`SELECT 1 AS ok`
    db = { ok: r.rows.length > 0 }
  } catch (e) {
    db = { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  res.status(200).json({ ok: true, node: process.version, env, solana, db })
}
