// Static data mirrored from the design prototype's logic block.

export interface RefLevel {
  n: number
  pct: string
}
export interface RefRow {
  refs: string
  buy: string
  comm: string
}
export interface Nft {
  name: string
  tier: string
  price: string
  img: string
}
export interface RoadmapPhase {
  phase: string
  status: string
  title: string
  body: string
  dotBg: string
  dotRing: string
  labelColor: string
  tagBg: string
  tagColor: string
}
export interface FaqItem {
  q: string
  a: string
}
export interface Txn {
  icon: string
  title: string
  sub: string
  amt: string
  pos: boolean
}

export const refLevels: RefLevel[] = [
  { n: 1, pct: '3.5' },
  { n: 2, pct: '1.8' },
  { n: 3, pct: '1.6' },
  { n: 4, pct: '1.4' },
  { n: 5, pct: '1.2' },
  { n: 6, pct: '1' },
  { n: 7, pct: '0.8' },
  { n: 8, pct: '0.4' },
  { n: 9, pct: '0.2' },
  { n: 10, pct: '0.1' },
]

// New users start with no referrals — these populate as people join.
export const refRows: RefRow[] = Array.from({ length: 10 }, () => ({
  refs: '0',
  buy: '0',
  comm: '0',
}))

export const nfts: Nft[] = [
  { name: 'Calf #001', tier: 'Genesis', price: '12,000', img: 'assets/m1.jpg' },
  { name: 'Calf #014', tier: 'Genesis', price: '11,500', img: 'assets/m12.jpg' },
  { name: 'Calf #027', tier: 'Rare', price: '7,200', img: 'assets/m13.jpg' },
  { name: 'Calf #033', tier: 'Rare', price: '6,800', img: 'assets/m14.jpg' },
  { name: 'Calf #045', tier: 'Rare', price: '6,500', img: 'assets/m15.jpg' },
  { name: 'Calf #052', tier: 'Rare', price: '6,300', img: 'assets/m16.jpg' },
  { name: 'Calf #061', tier: 'Common', price: '2,600', img: 'assets/m2.jpg' },
  { name: 'Calf #074', tier: 'Common', price: '2,500', img: 'assets/m3.jpg' },
  { name: 'Calf #088', tier: 'Common', price: '2,400', img: 'assets/m4.jpg' },
  { name: 'Calf #096', tier: 'Common', price: '2,300', img: 'assets/m5.jpg' },
  { name: 'Calf #103', tier: 'Common', price: '2,200', img: 'assets/m6.jpg' },
  { name: 'Calf #117', tier: 'Common', price: '2,200', img: 'assets/m7.jpg' },
  { name: 'Calf #128', tier: 'Common', price: '2,100', img: 'assets/m8.jpg' },
  { name: 'Calf #134', tier: 'Common', price: '2,000', img: 'assets/m9.jpg' },
  { name: 'Calf #145', tier: 'Common', price: '1,900', img: 'assets/m10.jpg' },
  { name: 'Calf #156', tier: 'Common', price: '1,800', img: 'assets/m11.jpg' },
]

export const roadmap: RoadmapPhase[] = [
  {
    phase: 'PHASE 1',
    status: 'LIVE',
    title: 'Airdrop & Presale launch',
    body: '200 $MOOLA airdrop (≈ $2) goes live, presale Stage 1 opens at $0.01, staking enabled at 2.05% daily.',
    dotBg: '#23d39a',
    dotRing: 'rgba(35,211,154,.4)',
    labelColor: '#23d39a',
    tagBg: 'rgba(35,211,154,.18)',
    tagColor: '#23d39a',
  },
  {
    phase: 'PHASE 2',
    status: 'NEXT',
    title: '10-level referral & NFTs',
    body: 'Multi-level referral commissions activate, Calf NFT collection mints for APR boosts.',
    dotBg: '#f2b34e',
    dotRing: 'rgba(242,179,78,.4)',
    labelColor: '#f2b34e',
    tagBg: 'rgba(242,179,78,.18)',
    tagColor: '#f2b34e',
  },
  {
    phase: 'PHASE 3',
    status: 'Q3 2026',
    title: 'DEX listing & liquidity lock',
    body: '$MOOLA lists on Raydium & Jupiter, liquidity locked, CEX listing talks begin.',
    dotBg: '#0a1d14',
    dotRing: 'rgba(110,200,150,.45)',
    labelColor: '#cfe7da',
    tagBg: 'rgba(110,200,150,.12)',
    tagColor: '#92b8a3',
  },
  {
    phase: 'PHASE 4',
    status: 'Q4 2026',
    title: 'Moola ecosystem & 100x',
    body: 'Lotto, NFT marketplace, mobile app and community treasury — the road to 100x.',
    dotBg: '#0a1d14',
    dotRing: 'rgba(110,200,150,.45)',
    labelColor: '#cfe7da',
    tagBg: 'rgba(110,200,150,.12)',
    tagColor: '#92b8a3',
  },
]

export const faqData: FaqItem[] = [
  {
    q: 'How do I deposit?',
    a: 'Deposits are made in SOL on the Solana network. Open your wallet, copy your Moola deposit address, and send SOL — your presale buys settle instantly.',
  },
  {
    q: 'When can I withdraw / sell?',
    a: 'Your staked tokens unlock after the 20-day staking period. Available $MOOLA can be sold back to SOL at any time from the wallet.',
  },
  {
    q: 'How does the 2.05% daily work?',
    a: "Every staked $MOOLA earns 2.05% per day for 20 days — that's 41% total. Rewards accrue live and you can re-stake them to compound.",
  },
  {
    q: 'What are the 10 referral levels?',
    a: 'You earn commission on the presale purchases of people you refer, plus their referrals, down 10 levels — from 3.5% at level 1 to 0.1% at level 10.',
  },
]

// Transaction history is empty for a new account — it fills as the user acts.
export const txnsData: Txn[] = []
