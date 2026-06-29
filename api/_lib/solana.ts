import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { mnemonicToSeedSync } from 'bip39'
import { derivePath } from 'ed25519-hd-key'

// NOTE: @solana/spl-token and bs58 are imported lazily (inside the functions
// that use them) so deposit-address generation depends only on web3.js + the
// HD-derivation libs. A load failure in those heavier packages can then only
// affect token detection / payouts, never address generation.

const RPC = process.env.SOLANA_RPC_URL || ''
const MASTER = process.env.MASTER_SEED || ''
const TREASURY = process.env.TREASURY_ADDRESS || ''
const TREASURY_SECRET = process.env.TREASURY_SECRET || ''

// Dedicated payout wallet — withdrawals are paid from here, not the treasury.
// On each sweep, SWEEP_PAYOUT_PCT of the deposit goes to the payout wallet and
// the remainder to the treasury (default 45 / 55).
const PAYOUT = process.env.PAYOUT_ADDRESS || ''
const PAYOUT_SECRET = process.env.PAYOUT_SECRET || ''
const SWEEP_PAYOUT_PCT = Math.max(0, Math.min(100, Math.round(Number(process.env.SWEEP_PAYOUT_PCT || '45'))))

const DEFAULT_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const DEFAULT_USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
function usdcMint(): PublicKey {
  return new PublicKey((process.env.USDC_MINT || DEFAULT_USDC).trim())
}
function usdtMint(): PublicKey {
  return new PublicKey((process.env.USDT_MINT || DEFAULT_USDT).trim())
}
const TOKEN_DECIMALS = 6 // USDT & USDC
const LAMPORTS = 1e9

export type Asset = 'SOL' | 'USDT' | 'USDC'

export function depositConfigured(): boolean {
  return Boolean(RPC && MASTER && TREASURY)
}
// Withdrawals are paid from the dedicated payout wallet.
export function payoutConfigured(): boolean {
  return Boolean(RPC && PAYOUT && PAYOUT_SECRET)
}
// Sweeping splits a deposit between the payout + treasury wallets; the treasury
// signs as fee payer.
export function sweepConfigured(): boolean {
  return Boolean(RPC && MASTER && TREASURY && PAYOUT && TREASURY_SECRET)
}

let _conn: Connection | null = null
export function connection(): Connection {
  if (!RPC) throw new Error('SOLANA_RPC_URL not set')
  if (!_conn) _conn = new Connection(RPC, 'confirmed')
  return _conn
}

function mintFor(asset: Exclude<Asset, 'SOL'>): PublicKey {
  return asset === 'USDC' ? usdcMint() : usdtMint()
}

/** Deterministic per-user deposit keypair: m/44'/501'/<index>'/0'. */
export function depositKeypair(index: number): Keypair {
  if (!MASTER) throw new Error('MASTER_SEED not set')
  const seed = mnemonicToSeedSync(MASTER.trim())
  const { key } = derivePath(`m/44'/501'/${index}'/0'`, seed.toString('hex'))
  return Keypair.fromSeed(Uint8Array.from(key))
}
export function depositAddress(index: number): string {
  return depositKeypair(index).publicKey.toBase58()
}

/** Treasury hot keypair (signs sweeps as fee payer). Base58 secret from env. */
export async function treasuryKeypair(): Promise<Keypair> {
  if (!TREASURY_SECRET) throw new Error('TREASURY_SECRET not set')
  const bs58 = (await import('bs58')).default
  return Keypair.fromSecretKey(bs58.decode(TREASURY_SECRET.trim()))
}

/** Payout hot keypair (signs withdrawals). Base58 secret from env. */
export async function payoutKeypair(): Promise<Keypair> {
  if (!PAYOUT_SECRET) throw new Error('PAYOUT_SECRET not set')
  const bs58 = (await import('bs58')).default
  return Keypair.fromSecretKey(bs58.decode(PAYOUT_SECRET.trim()))
}

async function tokenBalance(conn: Connection, owner: PublicKey, mint: PublicKey): Promise<number> {
  try {
    const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token')
    const ata = await getAssociatedTokenAddress(mint, owner)
    const acc = await getAccount(conn, ata)
    return Number(acc.amount) / 10 ** TOKEN_DECIMALS
  } catch {
    return 0 // no token account yet => zero balance
  }
}

/** Read-only: what currently sits in a user's deposit address. */
export async function readBalances(index: number): Promise<{ sol: number; usdt: number; usdc: number }> {
  const conn = connection()
  const owner = depositKeypair(index).publicKey
  const lamports = await conn.getBalance(owner)
  const [usdt, usdc] = await Promise.all([
    tokenBalance(conn, owner, usdtMint()),
    tokenBalance(conn, owner, usdcMint()),
  ])
  return { sol: lamports / LAMPORTS, usdt, usdc }
}

/**
 * Sweep everything sitting in a user's deposit address into the treasury.
 *
 * The treasury is set as the fee payer on every transaction, so a deposit
 * address never needs SOL of its own to forward its SPL tokens — it only signs
 * to authorise moving its funds. Token accounts are closed after transfer so
 * their rent flows to the treasury too. SOL is swept last (the whole balance,
 * since the treasury covers the fee). Returns the confirmed signatures.
 */
export async function sweepToTreasury(index: number): Promise<string[]> {
  if (!sweepConfigured()) throw new Error('Sweep requires TREASURY + PAYOUT + TREASURY_SECRET')
  const conn = connection()
  const treasury = await treasuryKeypair() // fee payer + receives the larger share
  const payoutPk = new PublicKey(PAYOUT)
  const dep = depositKeypair(index)
  const sigs: string[] = []
  const splitBig = (total: bigint) => {
    const toPayout = (total * BigInt(SWEEP_PAYOUT_PCT)) / 100n
    return { toPayout, toTreasury: total - toPayout }
  }

  // ---- SPL tokens (USDT, USDC): split to payout + treasury, then close ----
  const {
    getAssociatedTokenAddress,
    getAccount,
    createTransferCheckedInstruction,
    createCloseAccountInstruction,
    createAssociatedTokenAccountInstruction,
  } = await import('@solana/spl-token')

  for (const asset of ['USDT', 'USDC'] as const) {
    try {
      const mint = mintFor(asset)
      const fromAta = await getAssociatedTokenAddress(mint, dep.publicKey)
      let raw: bigint
      try {
        raw = (await getAccount(conn, fromAta)).amount
      } catch {
        continue // no token account / nothing here
      }
      if (raw <= 0n) continue

      const { toPayout, toTreasury } = splitBig(raw)
      const treasuryAta = await getAssociatedTokenAddress(mint, treasury.publicKey)
      const payoutAta = await getAssociatedTokenAddress(mint, payoutPk)
      const tx = new Transaction()
      // Make sure both receiving accounts exist (treasury funds creation).
      if (!(await conn.getAccountInfo(treasuryAta))) {
        tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, treasuryAta, treasury.publicKey, mint))
      }
      if (toPayout > 0n && !(await conn.getAccountInfo(payoutAta))) {
        tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, payoutAta, payoutPk, mint))
      }
      if (toPayout > 0n) {
        tx.add(createTransferCheckedInstruction(fromAta, mint, payoutAta, dep.publicKey, toPayout, TOKEN_DECIMALS))
      }
      if (toTreasury > 0n) {
        tx.add(createTransferCheckedInstruction(fromAta, mint, treasuryAta, dep.publicKey, toTreasury, TOKEN_DECIMALS))
      }
      // Close the now-empty deposit token account, returning its rent to treasury.
      tx.add(createCloseAccountInstruction(fromAta, treasury.publicKey, dep.publicKey))
      tx.feePayer = treasury.publicKey
      sigs.push(await sendAndConfirmTransaction(conn, tx, [treasury, dep]))
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[moola] ${asset} sweep failed for index ${index}:`, e)
    }
  }

  // ---- SOL (whole balance, split; treasury pays the fee) ----
  try {
    const lamports = await conn.getBalance(dep.publicKey)
    if (lamports > 0) {
      const toPayout = Math.floor((lamports * SWEEP_PAYOUT_PCT) / 100)
      const toTreasury = lamports - toPayout
      const tx = new Transaction()
      if (toPayout > 0) {
        tx.add(SystemProgram.transfer({ fromPubkey: dep.publicKey, toPubkey: payoutPk, lamports: toPayout }))
      }
      if (toTreasury > 0) {
        tx.add(SystemProgram.transfer({ fromPubkey: dep.publicKey, toPubkey: treasury.publicKey, lamports: toTreasury }))
      }
      tx.feePayer = treasury.publicKey
      sigs.push(await sendAndConfirmTransaction(conn, tx, [treasury, dep]))
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[moola] SOL sweep failed for index ${index}:`, e)
  }

  return sigs
}

// Error carrying whether the value transfer ever hit the network. `broadcast:
// false` => provably nothing was paid out (caller may safely refund). `true` =>
// ambiguous (it may have landed) — caller must NOT refund, to avoid paying a
// user twice.
export interface PayoutError extends Error {
  payout: true
  broadcast: boolean
  signature?: string
}
function payoutError(message: string, broadcast: boolean, signature?: string): PayoutError {
  const e = new Error(message) as PayoutError
  e.payout = true
  e.broadcast = broadcast
  e.signature = signature
  return e
}
function isPayoutError(e: unknown): e is PayoutError {
  return !!e && typeof e === 'object' && (e as PayoutError).payout === true
}

// Reconciliation: did a previously-broadcast signature actually land?
//   'confirmed' — succeeded on-chain
//   'failed'    — landed but errored (no funds moved)
//   'unknown'   — not found / inconclusive (leave the withdrawal pending)
export async function signatureLanded(sig: string): Promise<'confirmed' | 'failed' | 'unknown'> {
  try {
    const conn = connection()
    const st = (await conn.getSignatureStatus(sig, { searchTransactionHistory: true })).value
    if (!st) return 'unknown'
    if (st.err) return 'failed'
    if (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized') return 'confirmed'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Pay a user out from the treasury (used by withdrawals). Returns the confirmed
 * signature, or throws a PayoutError whose `broadcast` flag tells the caller
 * whether a refund is safe. We deliberately bias toward "do not refund" on any
 * ambiguity so a user can never be paid twice.
 */
export async function payout(to: string, asset: Asset, amount: number): Promise<string> {
  const conn = connection()

  // ---- Build + sign (nothing on-chain yet; failures here mean nothing paid) ----
  let tx: Transaction
  let signers: Keypair[]
  try {
    const payer = await payoutKeypair() // withdrawals are paid from the payout wallet
    const dest = new PublicKey(to)
    signers = [payer]
    if (asset === 'SOL') {
      tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: dest, lamports: Math.round(amount * LAMPORTS) }),
      )
    } else {
      const { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, createTransferCheckedInstruction } =
        await import('@solana/spl-token')
      const mint = mintFor(asset)
      const fromAta = await getAssociatedTokenAddress(mint, payer.publicKey)
      // Creating the destination account moves no user funds, so a failure here
      // is still "nothing paid out".
      const toAta = await getOrCreateAssociatedTokenAccount(conn, payer, mint, dest)
      tx = new Transaction().add(
        createTransferCheckedInstruction(fromAta, mint, toAta.address, payer.publicKey, Math.round(amount * 10 ** TOKEN_DECIMALS), TOKEN_DECIMALS),
      )
    }
    tx.feePayer = signers[0].publicKey
    tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
    tx.sign(...signers)
  } catch (e) {
    throw payoutError(e instanceof Error ? e.message : String(e), false)
  }

  // ---- Broadcast ----
  let signature: string
  try {
    signature = await conn.sendRawTransaction(tx.serialize())
  } catch (e) {
    // Rejected before entering the network => nothing paid out => safe to refund.
    throw payoutError('send failed: ' + (e instanceof Error ? e.message : String(e)), false)
  }

  // ---- Confirm (from here, ambiguity must never trigger a refund) ----
  try {
    const latest = await conn.getLatestBlockhash()
    const conf = await conn.confirmTransaction(
      { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
      'confirmed',
    )
    if (conf.value.err) throw payoutError('on-chain failure', false, signature) // failed => no funds moved
    return signature
  } catch (e) {
    if (isPayoutError(e) && e.broadcast === false) throw e // the on-chain-failure above
    // Confirmation was inconclusive — verify the signature directly.
    try {
      const st = (await conn.getSignatureStatus(signature)).value
      if (st && !st.err && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) {
        return signature // it actually landed
      }
      if (st && st.err) throw payoutError('on-chain failure', false, signature)
    } catch (inner) {
      if (isPayoutError(inner) && inner.broadcast === false) throw inner
    }
    // Truly ambiguous => never refund.
    throw payoutError('unconfirmed', true, signature)
  }
}
