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
  sol: number
  usdt: number
  usdc: number
  minted: number
  airdropClaimed: boolean
  claimAddr: string | null
}

export interface ApiTxn {
  icon: string
  title: string
  sub: string
  amt: string
  pos: boolean
}

export interface AccountResponse {
  account: Account
  txns: ApiTxn[]
  token?: string
  email?: string
  needsDeposit?: boolean
  depositAsset?: 'SOL' | 'USDT' | 'USDC'
  depositAmt?: string
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
  signup: (email: string, password: string) =>
    request<AuthChallenge>('/auth/signup', 'POST', { email, password }),
  verify: (email: string, code: string) =>
    request<AccountResponse>('/auth/verify', 'POST', { email, code }),
  resend: (email: string) => request<AuthChallenge>('/auth/resend', 'POST', { email }),
  login: (email: string, password: string) =>
    request<AccountResponse>('/auth/login', 'POST', { email, password }),
  account: () => request<AccountResponse>('/account', 'GET'),
  action: (type: string, body: Record<string, unknown>) =>
    request<AccountResponse>('/action/' + type, 'POST', body),
}
