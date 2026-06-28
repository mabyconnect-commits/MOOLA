import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { faqData, nfts as nftBase, refLevels, refRows, roadmap, type Nft } from './data'
import { api, clearToken, getToken, setToken, type Account, type ApiTxn, type RefRow, type ReferralData } from './api'

export type Screen = 'home' | 'stake' | 'presale' | 'nft' | 'me'
export type AuthView = 'welcome' | 'signup' | 'verify' | 'login'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Orb {
  style: string
}

interface MoolaState {
  screen: Screen
  wallet: boolean
  claim: boolean
  stakeForm: boolean
  reward: number
  staked: number
  available: number
  airdrop: number
  balance: number
  sol: number
  usdt: number
  usdc: number
  payCcy: 'USDT' | 'USDC'
  cd: number
  copyLabel: string
  toast: string
  solIn: string
  buySuccess: number
  stakeAmt: string
  claimStep: number
  claimAddr: string
  airdropClaimed: boolean
  faqOpen: number
  deposit: boolean
  depositAsset: 'SOL' | 'USDT' | 'USDC'
  depositAmt: string
  depAddress: string
  depChecking: boolean
  depCopied: boolean
  sell: boolean
  sellAmt: string
  minted: number
  history: boolean
  settings: boolean
  rewards: boolean
  details: boolean
  notif: boolean
  biometric: boolean
  hideBal: boolean
  autoStake: boolean
  authed: boolean
  booting: boolean
  busy: boolean
  authView: AuthView
  email: string
  password: string
  confirm: string
  code: string
  demoCode: string
  showPw: boolean
  joinedTg: boolean
  txns: ApiTxn[]
  refCode: string
  refInput: string
  refCommissionStr: string
  refRowsData: RefRow[]
}

const initialState: MoolaState = {
  screen: 'stake',
  wallet: false,
  claim: false,
  stakeForm: false,
  // Wallet starts empty — balances stay 0 until the user claims their airdrop.
  reward: 0,
  staked: 0,
  available: 0,
  airdrop: 0,
  balance: 0,
  sol: 0,
  usdt: 0,
  usdc: 0,
  payCcy: 'USDT',
  cd: 12 * 3600 + 24 * 60 + 6,
  copyLabel: 'Copy',
  toast: '',
  solIn: '',
  buySuccess: 0,
  stakeAmt: '',
  claimStep: 1,
  claimAddr: '',
  airdropClaimed: false,
  faqOpen: 0,
  deposit: false,
  depositAsset: 'USDT',
  depositAmt: '',
  depAddress: '',
  depChecking: false,
  depCopied: false,
  sell: false,
  sellAmt: '',
  minted: 0,
  history: false,
  settings: false,
  rewards: false,
  details: false,
  notif: true,
  biometric: false,
  hideBal: false,
  autoStake: true,
  authed: false,
  booting: false,
  busy: false,
  authView: 'welcome',
  email: '',
  password: '',
  confirm: '',
  code: '',
  demoCode: '',
  showPw: false,
  joinedTg: false,
  txns: [],
  refCode: '',
  refInput: '',
  refCommissionStr: '0.000',
  refRowsData: refRows,
}

function fmt(n: number, d: number): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong'
}

function buildOrbs(): Orb[] {
  const cols = ['#23d39a', '#2fe3c2', '#3ad17f', '#6ee6b4', '#1bbd84', '#52c9a0']
  const orbs: Orb[] = []
  let seed = 7
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2
    const r = 14 + rnd() * 42
    const sz = 7 + rnd() * 20
    orbs.push({
      style:
        'position:absolute;border-radius:50%;left:' +
        (50 + Math.cos(a) * r) +
        '%;top:' +
        (46 + Math.sin(a) * r * 0.92) +
        '%;width:' +
        sz +
        'px;height:' +
        sz +
        'px;transform:translate(-50%,-50%);background:radial-gradient(circle at 35% 30%, #d8ffe9, ' +
        cols[i % cols.length] +
        ' 65%, rgba(8,30,20,.6));box-shadow:0 0 ' +
        sz * 0.7 +
        'px ' +
        cols[i % cols.length] +
        '66;opacity:' +
        (0.45 + rnd() * 0.5).toFixed(2),
    })
  }
  return orbs
}

// Read an incoming referral code from ?ref= (or stored from an earlier visit).
function readIncomingRef(): string {
  try {
    const fromUrl = (new URLSearchParams(window.location.search).get('ref') || '').trim().slice(0, 24)
    return fromUrl || localStorage.getItem('moola_ref') || ''
  } catch {
    return ''
  }
}

export function useMoola() {
  const [s, setFull] = useState<MoolaState>(() => {
    const incomingRef = typeof window !== 'undefined' ? readIncomingRef() : ''
    const hasSession = typeof window !== 'undefined' && !!getToken()
    return {
      ...initialState,
      // If we already hold a session token, boot straight into a loading state
      // and hydrate from the server rather than flashing the welcome screen.
      booting: hasSession,
      // Remember whether the user already joined Telegram (gates the claim).
      joinedTg: typeof window !== 'undefined' && localStorage.getItem('moola_tg') === '1',
      // A referral link should drop the visitor on signup with the code filled.
      refInput: incomingRef,
      authView: !hasSession && incomingRef ? 'signup' : initialState.authView,
    }
  })
  const stateRef = useRef(s)
  stateRef.current = s
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const orbs = useMemo(buildOrbs, [])

  // Functional/partial setState helper that mirrors React class setState.
  const set = (patch: Partial<MoolaState> | ((prev: MoolaState) => Partial<MoolaState>)) => {
    setFull((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }

  // Merge a server account snapshot (and optionally history) into local state.
  // The server is authoritative for every economic number.
  const applyAccount = (acc: Account, txns?: ApiTxn[]) => {
    set({
      balance: acc.balance,
      staked: acc.staked,
      available: acc.available,
      reward: acc.reward,
      airdrop: acc.airdrop,
      sol: acc.sol,
      usdt: acc.usdt,
      usdc: acc.usdc,
      minted: acc.minted,
      airdropClaimed: acc.airdropClaimed,
      ...(txns ? { txns } : {}),
    })
  }

  // Merge server referral data (code, total commission, 10-level breakdown).
  const applyReferral = (r?: ReferralData) => {
    if (!r) return
    set({ refCode: r.code, refCommissionStr: r.commissionStr, refRowsData: r.rows })
  }

  // Capture a ?ref=CODE from the share link so it rides along on signup.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('ref')
      if (p) localStorage.setItem('moola_ref', p.trim())
    } catch {
      /* ignore */
    }
  }, [])

  // Hydrate from the backend on first mount when a session exists.
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    api
      .account()
      .then((r) => {
        if (cancelled) return
        applyAccount(r.account, r.txns)
        applyReferral(r.referral)
        set({ authed: true, screen: 'home', booting: false })
      })
      .catch(() => {
        if (cancelled) return
        clearToken()
        set({ authed: false, booting: false })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // live rewards ticker (cosmetic — reconciled with the server on every sync)
  useEffect(() => {
    const t = setInterval(() => {
      setFull((prev) => ({
        ...prev,
        reward: prev.reward + (prev.staked * 0.0205) / 86400 * 0.2,
        cd: prev.cd > 0 ? prev.cd - 0.2 : 12 * 3600,
      }))
    }, 200)
    return () => clearInterval(t)
  }, [])

  const flash = (msg: string) => {
    set({ toast: msg })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => set({ toast: '' }), 1900)
  }

  const go = (screen: Screen) =>
    set({ screen, wallet: false, claim: false, stakeForm: false, rewards: false, details: false })

  const cdString = () => {
    const t = Math.max(0, Math.floor(s.cd))
    const h = String(Math.floor(t / 3600)).padStart(2, '0')
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0')
    const sec = String(t % 60).padStart(2, '0')
    return h + ':' + m + ':' + sec
  }

  // ---- auth ----
  const setAuth = (view: AuthView) => set({ authView: view, code: '' })

  const doSignup = async () => {
    const { email, password, confirm, busy } = stateRef.current
    if (busy) return
    if (!EMAIL_RE.test(email)) return flash('Enter a valid email')
    if (password.length < 8) return flash('Password must be at least 8 characters')
    if (password !== confirm) return flash('Passwords do not match')
    set({ busy: true })
    try {
      let ref = stateRef.current.refInput.trim()
      try {
        if (!ref) ref = localStorage.getItem('moola_ref') || ''
        if (ref) localStorage.setItem('moola_ref', ref)
      } catch {
        /* ignore */
      }
      const r = await api.signup(email, password, ref)
      set({ demoCode: r.devCode || '', authView: 'verify', code: '' })
      flash(r.emailed ? '📧 Verification code sent to ' + email : '📧 Use the code shown below')
    } catch (e) {
      flash(errMsg(e))
    } finally {
      set({ busy: false })
    }
  }

  const doVerify = async () => {
    const cur = stateRef.current
    if (cur.busy) return
    if (cur.code.trim().length < 6) return flash('Enter the 6-digit code')
    set({ busy: true })
    try {
      const r = await api.verify(cur.email, cur.code.trim())
      if (r.token) setToken(r.token)
      applyAccount(r.account, r.txns)
      applyReferral(r.referral)
      set({ authed: true, password: '', confirm: '', code: '', screen: 'home', claim: false, claimStep: 1, booting: false })
    } catch (e) {
      flash(errMsg(e))
    } finally {
      set({ busy: false })
    }
  }

  const resendCode = async () => {
    try {
      const r = await api.resend(stateRef.current.email)
      set({ demoCode: r.devCode || '' })
      flash(r.emailed ? '📧 New code sent' : '📧 New code shown below')
    } catch (e) {
      flash(errMsg(e))
    }
  }

  const doLogin = async () => {
    const { email, password, busy } = stateRef.current
    if (busy) return
    if (!EMAIL_RE.test(email)) return flash('Enter a valid email')
    if (password.length < 8) return flash('Enter your password')
    set({ busy: true })
    try {
      const r = await api.login(email, password)
      if (r.token) setToken(r.token)
      applyAccount(r.account, r.txns)
      applyReferral(r.referral)
      set({ authed: true, password: '', screen: 'home', claim: false, booting: false })
    } catch (e) {
      const data = (e as { data?: { needsVerify?: boolean; devCode?: string | null } }).data
      if (data?.needsVerify) {
        set({ demoCode: data.devCode || '', authView: 'verify', code: '', password: '' })
        flash('Verify your email to continue')
      } else {
        flash(errMsg(e))
      }
    } finally {
      set({ busy: false })
    }
  }

  // ---- economic actions (server-backed) ----
  const doStake = async () => {
    const amt = parseFloat(stateRef.current.stakeAmt)
    if (!amt || amt <= 0) return flash('Enter an amount to stake')
    if (amt > stateRef.current.available) return flash('Insufficient available balance')
    try {
      const r = await api.action('stake', { amount: amt })
      applyAccount(r.account, r.txns)
      set({ stakeForm: false, stakeAmt: '' })
      flash('Staked ' + fmt(amt, 3) + ' $MOOLA')
    } catch (e) {
      flash(errMsg(e))
    }
  }

  const claimRewards = async () => {
    const r0 = stateRef.current.reward
    if (r0 <= 0) return flash('No rewards to claim yet')
    try {
      const r = await api.action('claim-rewards', {})
      applyAccount(r.account, r.txns)
      set({ rewards: false })
      flash('✅ Claimed ' + fmt(r0, 4) + ' $MOOLA to your wallet')
    } catch (e) {
      flash(errMsg(e))
    }
  }

  const compoundRewards = async () => {
    const r0 = stateRef.current.reward
    if (r0 <= 0) return flash('No rewards to compound yet')
    try {
      const r = await api.action('compound', {})
      applyAccount(r.account, r.txns)
      set({ rewards: false })
      flash('🔁 Compounded ' + fmt(r0, 4) + ' $MOOLA into your stake')
    } catch (e) {
      flash(errMsg(e))
    }
  }

  // Presale is paid in a Solana (SPL) stablecoin — USDT or USDC. The server
  // either completes the buy or, when the user is short on that coin, tells us
  // to route them to deposit the difference.
  const doBuy = async () => {
    const amt = parseFloat(stateRef.current.solIn)
    if (!amt || amt <= 0) return flash('Enter a USDT / USDC amount')
    const ccy = stateRef.current.payCcy
    try {
      const r = await api.action('buy', { amount: amt, ccy })
      applyAccount(r.account, r.txns)
      if (r.needsDeposit) {
        set({ deposit: true, depositAsset: r.depositAsset || ccy, depositAmt: r.depositAmt || '' })
        flash('Deposit ' + ccy + ' on Solana to continue')
        return
      }
      const tokens = Math.floor(amt / 0.01)
      set({ solIn: '' })
      flash('✅ Bought ' + fmt(tokens, 0) + ' $MOOLA with ' + fmt(amt, 2) + ' ' + ccy)
    } catch (e) {
      flash(errMsg(e))
    }
  }

  const openDeposit = (asset: 'SOL' | 'USDT' | 'USDC') => {
    set({ deposit: true, depositAsset: asset, depositAmt: '', wallet: false, depAddress: '' })
    // Fetch this user's unique on-chain deposit address.
    api
      .action('deposit-address', {})
      .then((r) => {
        if (r.address) set({ depAddress: r.address })
      })
      .catch((e) => flash(errMsg(e)))
  }

  // After the user sends funds, ask the server to check the chain and credit
  // anything new. Real crediting is on-chain, so the typed amount is just a hint.
  const confirmDeposit = async () => {
    if (stateRef.current.depChecking) return
    set({ depChecking: true })
    try {
      const r = await api.action('deposit-check', {})
      if (r.account) applyAccount(r.account, r.txns)
      if (r.found) {
        set({ deposit: false, depositAmt: '' })
        flash('✅ Deposit detected and credited!')
      } else {
        flash('No deposit detected yet — wait ~30s after sending, then check again.')
      }
    } catch (e) {
      flash(errMsg(e))
    } finally {
      set({ depChecking: false })
    }
  }

  const doMint = async (n: Nft) => {
    const price = parseFloat(String(n.price).replace(/,/g, ''))
    if (stateRef.current.available < price) return flash('Need ' + n.price + ' $MOOLA to mint')
    try {
      const r = await api.action('mint', { price, name: n.name })
      applyAccount(r.account, r.txns)
      flash('🐮 Minted ' + n.name + '!')
    } catch (e) {
      flash(errMsg(e))
    }
  }

  const doSell = async () => {
    const amt = parseFloat(stateRef.current.sellAmt)
    if (!amt || amt <= 0) return flash('Enter an amount to sell')
    if (amt > stateRef.current.available) return flash('Insufficient available balance')
    try {
      const r = await api.action('sell', { amount: amt })
      applyAccount(r.account, r.txns)
      set({ sell: false, sellAmt: '' })
      flash('✅ Sold ' + fmt(amt, 0) + ' $MOOLA')
    } catch (e) {
      flash(errMsg(e))
    }
  }

  const claimAirdrop = () => set({ claimStep: 2 })

  const confirmClaim = async () => {
    const addr = stateRef.current.claimAddr
    if (!addr || addr.length < 6) return flash('Enter your Solana address')
    try {
      const r = await api.action('claim-airdrop', { claimAddr: addr })
      applyAccount(r.account, r.txns)
      set({ claim: false, claimStep: 1, claimAddr: '' })
      flash('🎉 200 $MOOLA airdrop claimed & staked!')
    } catch (e) {
      flash(errMsg(e))
    }
  }

  const onInput =
    (key: keyof MoolaState) => (e: ChangeEvent<HTMLInputElement>) =>
      set({ [key]: e.target.value } as Partial<MoolaState>)

  const active = '#eafff4'
  const dim = '#5e7d6a'
  const solNum = parseFloat(s.solIn) || 0
  const stakeNum = parseFloat(s.stakeAmt) || 0
  const payBal = s.payCcy === 'USDT' ? s.usdt : s.usdc
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.moolas.site'
  const refLink = s.refCode ? `${origin}/?ref=${s.refCode}` : origin

  const faqs = faqData.map((f, i) => ({
    q: f.q,
    a: f.a,
    open: s.faqOpen === i,
    sign: s.faqOpen === i ? '–' : '+',
    toggle: () => set((st) => ({ faqOpen: st.faqOpen === i ? -1 : i })),
  }))

  const copyRef = () => {
    try {
      navigator.clipboard?.writeText(refLink)
    } catch {
      /* ignore */
    }
    set({ copyLabel: 'Copied!' })
    flash('Referral link copied')
    setTimeout(() => set({ copyLabel: 'Copy' }), 1500)
  }

  const logout = () => {
    clearToken()
    setFull({ ...initialState, booting: false })
    flash('Signed out')
  }

  const v = {
    // screen flags
    isHome: s.screen === 'home',
    isStake: s.screen === 'stake',
    isPresale: s.screen === 'presale',
    isMe: s.screen === 'me',
    isNft: s.screen === 'nft',
    // auth gate — stay hidden while we boot/hydrate an existing session
    showAuth: !s.authed && !s.booting,
    booting: s.booting,
    busy: s.busy,
    authWelcome: s.authView === 'welcome',
    authSignup: s.authView === 'signup',
    authVerify: s.authView === 'verify',
    authLogin: s.authView === 'login',
    authChrome: s.authView !== 'welcome',
    orbs,
    authTagline: s.authView === 'verify' ? 'Check your inbox' : 'The 100x meme calf',
    email: s.email,
    password: s.password,
    confirm: s.confirm,
    code: s.code,
    demoCode: s.demoCode,
    showPw: s.showPw,
    pwType: s.showPw ? 'text' : 'password',
    pwEye: s.showPw ? '🙈' : '👁️',
    toggleShowPw: () => set((st) => ({ showPw: !st.showPw })),
    onEmail: onInput('email'),
    onPassword: onInput('password'),
    onConfirm: onInput('confirm'),
    onCode: (e: ChangeEvent<HTMLInputElement>) =>
      set({ code: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) }),
    refInput: s.refInput,
    onRefInput: (e: ChangeEvent<HTMLInputElement>) =>
      set({ refInput: e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) }),
    doSignup,
    doVerify,
    doLogin,
    resendCode,
    goSignup: () => setAuth('signup'),
    goLogin: () => setAuth('login'),
    goWelcome: () => setAuth('welcome'),
    // data
    refRows: s.refRowsData,
    refLink,
    refCode: s.refCode,
    refCommissionStr: s.refCommissionStr,
    roadmap,
    faqs,
    refLevels,
    nfts: nftBase.map((n) => ({ ...n, mint: () => doMint(n) })),
    txns: s.txns.map((t) => ({ ...t, amtColor: t.pos ? '#23d39a' : '#ff8f8f' })),
    // modals
    wallet: s.wallet,
    claim: s.claim,
    stakeForm: s.stakeForm,
    claimStep1: s.claimStep === 1,
    claimStep2: s.claimStep === 2,
    airdropClaimed: s.airdropClaimed,
    toast: s.toast,
    airdropAmt: 200,
    // formatted economics
    balanceStr: fmt(s.balance, 2),
    stakedStr: fmt(s.staked, 3),
    availStr: fmt(s.available, 3),
    airdropBalStr: fmt(s.airdrop, 0),
    usdtStr: fmt(s.balance * 0.01, 2),
    solStr: fmt(s.sol, 4),
    usdtBalStr: fmt(s.usdt, 2),
    usdcBalStr: fmt(s.usdc, 2),
    rewardStr: fmt(s.reward, 6),
    cdStr: cdString(),
    dailyRewardsStr: fmt(s.staked * 0.0205, 3),
    totalRewardsStr: fmt(s.staked * 0.0205 * 20, 3),
    copyLabel: s.copyLabel,
    // nav tint
    cHome: s.screen === 'home' ? active : dim,
    cNft: s.screen === 'nft' ? active : dim,
    cPresale: s.screen === 'presale' ? active : dim,
    cMe: s.screen === 'me' ? active : dim,
    // presale / stake form inputs
    solIn: s.solIn,
    stakeAmt: s.stakeAmt,
    buyTokens: solNum > 0 ? fmt(Math.floor(solNum / 0.01), 0) : '0',
    // presale pays in USDT or USDC: if the user already holds enough of the
    // chosen coin they can buy now, otherwise the CTA routes them to deposit.
    payCcy: s.payCcy,
    payBalStr: fmt(payBal, 2),
    setPayCcy: (c: 'USDT' | 'USDC') => set({ payCcy: c }),
    buyNeedsDeposit: solNum > 0 && payBal < solNum,
    buyCtaLabel: solNum > 0 && payBal < solNum ? `Deposit ${s.payCcy} to continue` : 'Buy $MOOLA',
    stakeEstTotal: stakeNum > 0 ? fmt(stakeNum * 0.0205 * 20, 3) : '0.000',
    stakeEstDaily: stakeNum > 0 ? fmt(stakeNum * 0.0205, 3) : '0.000',
    claimAddr: s.claimAddr,
    // navigation
    goHome: () => go('home'),
    goStake: () => go('stake'),
    goPresale: () => go('presale'),
    goMe: () => go('me'),
    goNft: () => go('nft'),
    stop: (e: { stopPropagation: () => void }) => e.stopPropagation(),
    // modal open/close
    openWallet: () => set({ wallet: true }),
    closeWallet: () => set({ wallet: false }),
    openClaim: () =>
      stateRef.current.airdropClaimed
        ? flash('Airdrop already claimed ✓')
        : set({ claim: true, claimStep: 1 }),
    closeClaim: () => set({ claim: false, claimStep: 1 }),
    openStakeForm: () => set({ stakeForm: true, wallet: false }),
    closeStakeForm: () => set({ stakeForm: false }),
    // My Rewards sheet
    rewards: s.rewards,
    rewardUsdStr: fmt(s.reward * 0.01, 4),
    projectedStr: fmt(s.staked * 0.0205 * 20, 3),
    openRewards: () => set({ rewards: true, wallet: false }),
    closeRewards: () => set({ rewards: false }),
    claimRewards,
    compoundRewards,
    // Staking Details sheet
    details: s.details,
    stakedUsdStr: fmt(s.staked * 0.01, 2),
    openDetails: () => set({ details: true }),
    closeDetails: () => set({ details: false }),
    onSol: onInput('solIn'),
    onStakeAmt: onInput('stakeAmt'),
    setMaxStake: () => set({ stakeAmt: String(stateRef.current.available) }),
    onClaimAddr: onInput('claimAddr'),
    doStake,
    doBuy,
    // deposit (asset top-up: SOL or USDT on Solana SPL)
    deposit: s.deposit,
    depositAsset: s.depositAsset,
    depositAmt: s.depositAmt,
    depAddr: s.depAddress || 'Generating your address…',
    depReady: !!s.depAddress,
    depChecking: s.depChecking,
    depTokensStr:
      s.depositAsset !== 'SOL' && parseFloat(s.depositAmt) > 0
        ? fmt(Math.floor(parseFloat(s.depositAmt) / 0.01), 0)
        : '',
    depCopyLabel: s.depCopied ? 'Copied!' : 'Copy',
    onDepositAmt: onInput('depositAmt'),
    openDeposit,
    closeDeposit: () => set({ deposit: false }),
    confirmDeposit,
    copyDepAddr: () => {
      try {
        if (stateRef.current.depAddress) navigator.clipboard?.writeText(stateRef.current.depAddress)
      } catch {
        /* clipboard may be unavailable */
      }
      set({ depCopied: true })
      flash('Address copied')
      setTimeout(() => set({ depCopied: false }), 1500)
    },
    // sell
    sell: s.sell,
    sellAmt: s.sellAmt,
    sellSolStr: (((parseFloat(s.sellAmt) || 0) * 0.01) / 152).toFixed(4),
    openSell: () => set({ sell: true, wallet: false }),
    closeSell: () => set({ sell: false }),
    onSellAmt: onInput('sellAmt'),
    setMaxSell: () => set({ sellAmt: String(stateRef.current.available) }),
    doSell,
    claimAirdrop,
    confirmClaim,
    copyRef,
    toastSoon: () => flash('Coming soon ✨'),
    joinedTg: s.joinedTg,
    joinTelegram: () => {
      try {
        window.open('https://t.me/MoolaAirdrop', '_blank')
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem('moola_tg', '1')
      } catch {
        /* ignore */
      }
      set({ joinedTg: true })
      flash('Opening Telegram…')
    },
    // history / settings
    history: s.history,
    settings: s.settings,
    openHistory: () => set({ history: true }),
    closeHistory: () => set({ history: false }),
    openSettings: () => set({ settings: true }),
    closeSettings: () => set({ settings: false }),
    // settings toggles
    notifTrack: s.notif ? '#23d39a' : 'rgba(110,200,150,.25)',
    notifX: s.notif ? '22px' : '3px',
    bioTrack: s.biometric ? '#23d39a' : 'rgba(110,200,150,.25)',
    bioX: s.biometric ? '22px' : '3px',
    hideTrack: s.hideBal ? '#23d39a' : 'rgba(110,200,150,.25)',
    hideX: s.hideBal ? '22px' : '3px',
    autoTrack: s.autoStake ? '#23d39a' : 'rgba(110,200,150,.25)',
    autoX: s.autoStake ? '22px' : '3px',
    toggleNotif: () => set((st) => ({ notif: !st.notif })),
    toggleBio: () => set((st) => ({ biometric: !st.biometric })),
    toggleHide: () => set((st) => ({ hideBal: !st.hideBal })),
    toggleAuto: () => set((st) => ({ autoStake: !st.autoStake })),
    disconnect: () => {
      set({ settings: false })
      logout()
    },
  }

  return v
}

export type MoolaVals = ReturnType<typeof useMoola>
