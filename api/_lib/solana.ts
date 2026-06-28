import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
} from '@solana/spl-token'
import { mnemonicToSeedSync } from 'bip39'
import { derivePath } from 'ed25519-hd-key'
import bs58 from 'bs58'

const RPC = process.env.SOLANA_RPC_URL || ''
const MASTER = process.env.MASTER_SEED || ''
const TREASURY = process.env.TREASURY_ADDRESS || ''
const TREASURY_SECRET = process.env.TREASURY_SECRET || ''

// Stablecoin mints. On devnet, set USDC_MINT / USDT_MINT in env to your test
// mints. Defaults are Solana mainnet USDC/USDT.
const USDC_MINT = new PublicKey(
  process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
)
const USDT_MINT = new PublicKey(
  process.env.USDT_MINT || 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
)
const TOKEN_DECIMALS = 6 // USDT & USDC
const SOL_DECIMALS = 9
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
  return asset === 'USDC' ? USDC_MINT : USDT_MINT
}

/** Deterministic per-user deposit keypair: m/44'/501'/<index>'/0'. */
export function depositKeypair(index: number): Keypair {
  if (!MASTER) throw new Error('MASTER_SEED not set')
  const seed = mnemonicToSeedSync(MASTER)
  const { key } = derivePath(`m/44'/501'/${index}'/0'`, seed.toString('hex'))
  return Keypair.fromSeed(key)
}
export function depositAddress(index: number): string {
  return depositKeypair(index).publicKey.toBase58()
}

/** Treasury hot keypair (signs payouts/sweeps). Base58 secret from env. */
export function treasuryKeypair(): Keypair {
  if (!TREASURY_SECRET) throw new Error('TREASURY_SECRET not set')
  return Keypair.fromSecretKey(bs58.decode(TREASURY_SECRET))
}

async function tokenBalance(conn: Connection, owner: PublicKey, mint: PublicKey): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(mint, owner)
    const acc = await getAccount(conn, ata)
    return Number(acc.amount) / 10 ** TOKEN_DECIMALS
  } catch {
    return 0
  }
}

/** Read-only: what currently sits in a user's deposit address. */
export async function readBalances(index: number): Promise<{ sol: number; usdt: number; usdc: number }> {
  const conn = connection()
  const owner = depositKeypair(index).publicKey
  const lamports = await conn.getBalance(owner)
  const [usdt, usdc] = await Promise.all([
    tokenBalance(conn, owner, USDT_MINT),
    tokenBalance(conn, owner, USDC_MINT),
  ])
  return { sol: lamports / LAMPORTS, usdt, usdc }
}

/** Pay a user out from the treasury (used by withdrawals). Returns the tx sig. */
export async function payout(to: string, asset: Asset, amount: number): Promise<string> {
  const conn = connection()
  const treasury = treasuryKeypair()
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

export const SOL_DECIMALS_EXPORT = SOL_DECIMALS
