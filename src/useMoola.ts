import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { faqData, nfts as nftBase, refLevels, refRows, roadmap, txnsData, type Nft } from './data'

export type Screen = 'home' | 'stake' | 'presale' | 'nft' | 'me'
export type AuthView = 'welcome' | 'signup' | 'verify' | 'login'

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
  faqOpen: number
  deposit: boolean
  depositAsset: 'SOL' | 'USDT' | 'USDC'
  depositAmt: string
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
  authView: AuthView
  email: string
  password: string
  confirm: string
  code: string
  demoCode: string
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
  faqOpen: 0,
  deposit: false,
  depositAsset: 'USDT',
  depositAmt: '',
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
  authView: 'welcome',
  email: '',
  password: '',
  confirm: '',
  code: '',
  demoCode: '',
}

function fmt(n: number, d: number): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
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

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function useMoola() {
  const [s, setFull] = useState<MoolaState>(initialState)
  const stateRef = useRef(s)
  stateRef.current = s
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const orbs = useMemo(buildOrbs, [])

  // Functional/partial setState helper that mirrors React class setState.
  const set = (patch: Partial<MoolaState> | ((prev: MoolaState) => Partial<MoolaState>)) => {
    setFull((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }

  // live rewards ticker
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
  const doSignup = () => {
    const { email, password, confirm } = stateRef.current
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      flash('Enter a valid email')
      return
    }
    if (password.length < 8) {
      flash('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      flash('Passwords do not match')
      return
    }
    const c = genCode()
    set({ demoCode: c, authView: 'verify', code: '' })
    flash('📧 Verification code sent to ' + email)
  }
  const doVerify = () => {
    const cur = stateRef.current
    if (cur.code.trim() !== cur.demoCode) {
      flash('Incorrect code — try again')
      return
    }
    // Verified → land on the Home page (Claim is one tap away via the banner).
    set({ authed: true, password: '', confirm: '', code: '', screen: 'home', claim: false, claimStep: 1 })
  }
  const resendCode = () => {
    set({ demoCode: genCode() })
    flash('📧 New code sent')
  }
  const doLogin = () => {
    const { email, password } = stateRef.current
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      flash('Enter a valid email')
      return
    }
    if (password.length < 8) {
      flash('Enter your password')
      return
    }
    // Signed in → land on the Home page (Claim is one tap away via the banner).
    set({ authed: true, password: '', screen: 'home', claim: false })
  }

  // ---- economic actions ----
  const doStake = () => {
    const amt = parseFloat(stateRef.current.stakeAmt)
    if (!amt || amt <= 0) {
      flash('Enter an amount to stake')
      return
    }
    if (amt > stateRef.current.available) {
      flash('Insufficient available balance')
      return
    }
    set((p) => ({ staked: p.staked + amt, available: p.available - amt, stakeForm: false, stakeAmt: '' }))
    flash('Staked ' + fmt(amt, 3) + ' $MOOLA')
  }
  const claimRewards = () => {
    const r = stateRef.current.reward
    if (r <= 0) {
      flash('No rewards to claim yet')
      return
    }
    set((p) => ({ available: p.available + r, balance: p.balance + r, reward: 0, rewards: false }))
    flash('✅ Claimed ' + fmt(r, 4) + ' $MOOLA to your wallet')
  }
  const compoundRewards = () => {
    const r = stateRef.current.reward
    if (r <= 0) {
      flash('No rewards to compound yet')
      return
    }
    set((p) => ({ staked: p.staked + r, balance: p.balance + r, reward: 0, rewards: false }))
    flash('🔁 Compounded ' + fmt(r, 4) + ' $MOOLA into your stake')
  }
  // Presale is paid in a Solana (SPL) stablecoin — USDT or USDC. If the user
  // already holds enough of the chosen coin, buy immediately; otherwise route
  // them to deposit it.
  const doBuy = () => {
    const amt = parseFloat(stateRef.current.solIn)
    if (!amt || amt <= 0) {
      flash('Enter a USDT / USDC amount')
      return
    }
    const ccy = stateRef.current.payCcy
    const bal = ccy === 'USDT' ? stateRef.current.usdt : stateRef.current.usdc
    if (bal >= amt) {
      const tokens = Math.floor(amt / 0.01) // $0.01 per $MOOLA, stablecoin ≈ $1
      set((p) =>
        ccy === 'USDT'
          ? { usdt: p.usdt - amt, balance: p.balance + tokens, available: p.available + tokens, solIn: '' }
          : { usdc: p.usdc - amt, balance: p.balance + tokens, available: p.available + tokens, solIn: '' },
      )
      flash('✅ Bought ' + fmt(tokens, 0) + ' $MOOLA with ' + fmt(amt, 2) + ' ' + ccy)
    } else {
      const needed = amt - bal
      set({ deposit: true, depositAsset: ccy, depositAmt: needed.toFixed(2) })
      flash('Deposit ' + ccy + ' on Solana to continue')
    }
  }
  const openDeposit = (asset: 'SOL' | 'USDT' | 'USDC') =>
    set({ deposit: true, depositAsset: asset, depositAmt: '', wallet: false })
  const confirmDeposit = () => {
    const amt = parseFloat(stateRef.current.depositAmt) || 0
    if (amt <= 0) {
      flash('Enter the amount you sent')
      return
    }
    const asset = stateRef.current.depositAsset
    set((p) =>
      asset === 'SOL'
        ? { sol: p.sol + amt, deposit: false, depositAmt: '' }
        : asset === 'USDT'
          ? { usdt: p.usdt + amt, deposit: false, depositAmt: '' }
          : { usdc: p.usdc + amt, deposit: false, depositAmt: '' },
    )
    flash('✅ ' + fmt(amt, asset === 'SOL' ? 4 : 2) + ' ' + asset + ' credited to your wallet')
  }
  const doMint = (n: Nft) => {
    const price = parseFloat(String(n.price).replace(/,/g, ''))
    if (stateRef.current.available < price) {
      flash('Need ' + n.price + ' $MOOLA to mint')
      return
    }
    set((p) => ({ available: p.available - price, balance: p.balance - price, minted: p.minted + 1 }))
    flash('🐮 Minted ' + n.name + '!')
  }
  const doSell = () => {
    const amt = parseFloat(stateRef.current.sellAmt)
    if (!amt || amt <= 0) {
      flash('Enter an amount to sell')
      return
    }
    if (amt > stateRef.current.available) {
      flash('Insufficient available balance')
      return
    }
    const sol = (amt * 0.01) / 152
    set((p) => ({ available: p.available - amt, balance: p.balance - amt, sol: p.sol + sol, sell: false, sellAmt: '' }))
    flash('✅ Sold ' + fmt(amt, 0) + ' $MOOLA → ' + sol.toFixed(4) + ' SOL')
  }
  const claimAirdrop = () => set({ claimStep: 2 })
  const confirmClaim = () => {
    if (!stateRef.current.claimAddr || stateRef.current.claimAddr.length < 6) {
      flash('Enter your Solana address')
      return
    }
    set((p) => ({
      airdrop: 200,
      staked: p.staked + 200,
      balance: p.balance + 200,
      claim: false,
      claimStep: 1,
      claimAddr: '',
    }))
    flash('🎉 200 $MOOLA airdrop claimed & staked!')
  }

  const onInput =
    (key: keyof MoolaState) => (e: ChangeEvent<HTMLInputElement>) =>
      set({ [key]: e.target.value } as Partial<MoolaState>)

  const active = '#eafff4'
  const dim = '#5e7d6a'
  const solNum = parseFloat(s.solIn) || 0
  const stakeNum = parseFloat(s.stakeAmt) || 0
  const payBal = s.payCcy === 'USDT' ? s.usdt : s.usdc

  const faqs = faqData.map((f, i) => ({
    q: f.q,
    a: f.a,
    open: s.faqOpen === i,
    sign: s.faqOpen === i ? '–' : '+',
    toggle: () => set((st) => ({ faqOpen: st.faqOpen === i ? -1 : i })),
  }))

  const copyRef = () => {
    set({ copyLabel: 'Copied!' })
    flash('Referral link copied')
    setTimeout(() => set({ copyLabel: 'Copy' }), 1500)
  }

  const v = {
    // screen flags
    isHome: s.screen === 'home',
    isStake: s.screen === 'stake',
    isPresale: s.screen === 'presale',
    isMe: s.screen === 'me',
    isNft: s.screen === 'nft',
    // auth gate
    showAuth: !s.authed,
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
    onEmail: onInput('email'),
    onPassword: onInput('password'),
    onConfirm: onInput('confirm'),
    onCode: (e: ChangeEvent<HTMLInputElement>) =>
      set({ code: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) }),
    doSignup,
    doVerify,
    doLogin,
    resendCode,
    goSignup: () => setAuth('signup'),
    goLogin: () => setAuth('login'),
    goWelcome: () => setAuth('welcome'),
    // data
    refRows,
    roadmap,
    faqs,
    refLevels,
    nfts: nftBase.map((n) => ({ ...n, mint: () => doMint(n) })),
    txns: txnsData.map((t) => ({ ...t, amtColor: t.pos ? '#23d39a' : '#ff8f8f' })),
    // modals
    wallet: s.wallet,
    claim: s.claim,
    stakeForm: s.stakeForm,
    claimStep1: s.claimStep === 1,
    claimStep2: s.claimStep === 2,
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
    openClaim: () => set({ claim: true, claimStep: 1 }),
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
    depAddr: 'So1aMooLaPreSa1e9xKqTbD7vRt4Z8aE2nWyMoo9aE2',
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
    joinTelegram: () => {
      try {
        window.open('https://t.me/moola_io', '_blank')
      } catch {
        /* ignore */
      }
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
      flash('Wallet disconnected')
    },
  }

  return v
}

export type MoolaVals = ReturnType<typeof useMoola>
