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
export function payoutConfigured(): boolean {
  return Boolean(RPC && TREASURY && TREASURY_SECRET)
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

/** Treasury hot keypair (signs payouts/sweeps). Base58 secret from env. */
export async function treasuryKeypair(): Promise<Keypair> {
  if (!TREASURY_SECRET) throw new Error('TREASURY_SECRET not set')
  const bs58 = (await import('bs58')).default
  return Keypair.fromSecretKey(bs58.decode(TREASURY_SECRET.trim()))
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
  if (!payoutConfigured()) throw new Error('Sweep requires TREASURY_ADDRESS + TREASURY_SECRET')
  const conn = connection()
  const treasury = await treasuryKeypair()
  const dep = depositKeypair(index)
  const sigs: string[] = []

  // ---- SPL tokens (USDT, USDC) ----
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

      const toAta = await getAssociatedTokenAddress(mint, treasury.publicKey)
      const tx = new Transaction()
      // Make sure the treasury's receiving account exists (treasury funds it).
      if (!(await conn.getAccountInfo(toAta))) {
        tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, toAta, treasury.publicKey, mint))
      }
      tx.add(createTransferCheckedInstruction(fromAta, mint, toAta, dep.publicKey, raw, TOKEN_DECIMALS))
      // Close the now-empty deposit token account, returning its rent SOL.
      tx.add(createCloseAccountInstruction(fromAta, treasury.publicKey, dep.publicKey))
      tx.feePayer = treasury.publicKey
      sigs.push(await sendAndConfirmTransaction(conn, tx, [treasury, dep]))
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[moola] ${asset} sweep failed for index ${index}:`, e)
    }
  }

  // ---- SOL (whole balance; treasury pays the fee) ----
  try {
    const lamports = await conn.getBalance(dep.publicKey)
    if (lamports > 0) {
      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: dep.publicKey, toPubkey: treasury.publicKey, lamports }),
      )
      tx.feePayer = treasury.publicKey
      sigs.push(await sendAndConfirmTransaction(conn, tx, [treasury, dep]))
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[moola] SOL sweep failed for index ${index}:`, e)
  }

  return sigs
}

/** Pay a user out from the treasury (used by withdrawals). Returns the tx sig. */
export async function payout(to: string, asset: Asset, amount: number): Promise<string> {
  const conn = connection()
  const treasury = await treasuryKeypair()
  const dest = new PublicKey(to)

  if (asset === 'SOL') {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: dest,
        lamports: Math.round(amount * LAMPORTS),
      }),
    )
    return sendAndConfirmTransaction(conn, tx, [treasury])
  }

  const { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, createTransferCheckedInstruction } =
    await import('@solana/spl-token')
  const mint = mintFor(asset)
  const fromAta = await getAssociatedTokenAddress(mint, treasury.publicKey)
  const toAta = await getOrCreateAssociatedTokenAccount(conn, treasury, mint, dest)
  const tx = new Transaction().add(
    createTransferCheckedInstruction(
      fromAta,
      mint,
      toAta.address,
      treasury.publicKey,
      Math.round(amount * 10 ** TOKEN_DECIMALS),
      TOKEN_DECIMALS,
    ),
  )
  return sendAndConfirmTransaction(conn, tx, [treasury])
}
