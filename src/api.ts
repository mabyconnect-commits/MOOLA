// Thin client for the Moola backend (Vercel serverless functions under /api).
// The server is the source of truth for balances; the app hydrates from it on
// load and re-syncs after every action.

const TOKEN_KEY = 'moola_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function setToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t)
  } catch {
    /* ignore */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export interface Account {
  balance: number
  staked: number
  available: number
  reward: number
  airdrop: number
  airdropLocked: number
  sol: number
  usdt: number
  usdc: number
  minted: number
  airdropClaimed: boolean
  claimAddr: string | null
  stakedAt: number | null
}

export interface Stats {
  raised: number
  holders: number
  sold: number
  total: number
}

export interface ApiTxn {
  icon: string
  title: string
  sub: string
  amt: string
  pos: boolean
}

export interface RefRow {
  refs: string
  buy: string
  comm: string
  bonus: string
}

export interface ReferralData {
  code: string
  commissionStr: string
  bonusStr: string
  rows: RefRow[]
}

export interface AccountResponse {
  account: Account
  txns: ApiTxn[]
  referral?: ReferralData
  token?: string
  email?: string
  needsDeposit?: boolean
  depositAsset?: 'SOL' | 'USDT' | 'USDC'
  depositAmt?: string
  address?: string
  found?: boolean
  sweepNote?: string | null
  pending?: boolean
  stats?: Stats
  isAdmin?: boolean
}

export interface AdminWalletBal {
  sol: number
  usdt: number
  usdc: number
}
export interface AdminOverview {
  users: { total: number; verified: number }
  totals: { staked: number; available: number; balance: number; sol: number; usdt: number; usdc: number }
  withdrawals: { status: string; n: number; amount: number }[]
  wallets: {
    treasury: { address: string; balances: AdminWalletBal | null }
    payout: { address: string; balances: AdminWalletBal | null }
    splitPct: number
  }
}
export interface AdminWithdrawal {
  id: number
  user_id: number
  email: string | null
  asset: string
  amount: number
  address: string
  status: string
  signature: string | null
  created_at: string
}
export interface AdminUser {
  id: number
  email: string
  created_at: string
  deposit_index: number | null
  balance: number
  staked: number
  available: number
  sol: number
  usdt: number
  usdc: number
}

export interface DepositLookup {
  user: { id: number; email: string; depositIndex: number | null }
  depositAddress: string | null
  onchain: { sol: number; usdt: number; usdc: number } | null
  credited: { sol: number; usdt: number; usdc: number }
  balances: { sol: number; usdt: number; usdc: number }
  uncredited: { sol: number; usdt: number; usdc: number } | null
  depositReady: boolean
  sweepReady: boolean
}

export interface AuthChallenge {
  ok: boolean
  emailed: boolean
  devCode: string | null
  needsVerify?: boolean
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch('/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Network error — check your connection')
  }

  let data: unknown = {}
  try {
    data = await res.json()
  } catch {
    /* non-JSON response */
  }
  const obj = (data || {}) as Record<string, unknown>

  if (!res.ok) {
    const err = new Error((obj.error as string) || 'Something went wrong') as Error & {
      status?: number
      data?: Record<string, unknown>
    }
    err.status = res.status
    err.data = obj
    throw err
  }
  return data as T
}

export const api = {
  signup: (email: string, password: string, ref?: string) =>
    request<AuthChallenge>('/auth/signup', 'POST', { email, password, ref: ref || '' }),
  verify: (email: string, code: string) =>
    request<AccountResponse>('/auth/verify', 'POST', { email, code }),
  resend: (email: string) => request<AuthChallenge>('/auth/resend', 'POST', { email }),
  login: (email: string, password: string) =>
    request<AccountResponse>('/auth/login', 'POST', { email, password }),
  account: () => request<AccountResponse>('/account', 'GET'),
  action: (type: string, body: Record<string, unknown>) =>
    request<AccountResponse>('/action/' + type, 'POST', body),
  admin: {
    overview: () => request<AdminOverview>('/admin/overview', 'GET'),
    withdrawals: (status?: string) =>
      request<{ withdrawals: AdminWithdrawal[] }>('/admin/withdrawals' + (status ? '?status=' + status : ''), 'GET'),
    resolve: (id: number) => request<{ resolved: string }>('/admin/resolve-withdrawal', 'POST', { id }),
    sweepAll: () => request<{ checked: number; swept: number }>('/admin/sweep-all', 'POST', {}),
    users: (q?: string) =>
      request<{ users: AdminUser[] }>('/admin/users' + (q ? '?q=' + encodeURIComponent(q) : ''), 'GET'),
    depositLookup: (q: string) =>
      request<DepositLookup>('/admin/deposit-lookup?q=' + encodeURIComponent(q), 'GET'),
    depositReconcile: (id: number) =>
      request<{ found: boolean; credited: { sol: number; usdt: number; usdc: number }; sweepNote: string | null }>(
        '/admin/deposit-reconcile',
        'POST',
        { id },
      ),
  },
}
