# Moola 🐮

A mobile-first crypto dApp for the **$MOOLA** meme token — built from the
high-fidelity design handoff. Stake $MOOLA to earn ~2.05% daily, buy in the
presale, mint Calf NFTs for APR boosts, and manage referrals & profile.

Built with **React + TypeScript + Vite**.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

The app is designed as a centered **440px** mobile shell. Open it in a desktop
browser at a narrow width or in mobile device emulation for the intended look.

## What's inside

- **Auth gate** — welcome / sign up / email verification / log in. Until the
  account is verified the gate covers the whole app.
- **Token (Home)** — hero pitch, airdrop & Telegram banners, live stats,
  presale progress, how-it-works, roadmap, tokenomics, FAQ.
- **Stake** — live-accruing reward ring with countdown, total-staked card,
  10-level referral breakdown.
- **Swap (Presale)** — buy $MOOLA with SOL at the current presale price.
- **NFT** — the 16 Calf NFTs grid with tiers (Genesis / Rare / Common) and mint.
- **Me** — profile, balances, referral commission, settings entry points.
- **Overlays** — Connect Wallet, Claim Airdrop, Stake form, Sell, Deposit (QR),
  Transaction History, and Settings.

## Project structure

```
src/
  App.tsx            App shell: glow blobs, screen switch, overlays, nav, auth gate
  useMoola.ts        All state, the live rewards ticker, formatters & handlers
  data.ts            Static data (NFTs, roadmap, FAQ, referral rows, txns)
  css.ts             Helper that maps the design's CSS strings to React styles
  CalfLogo.tsx       Hexagon calf logo mark
  Auth.tsx           Auth gate views
  BottomNav.tsx      Fixed bottom tab bar
  screens/           Home, Stake, Presale, Nft, Me
  modals/Overlays.tsx  All bottom-sheet / full-screen overlays + toast
public/assets/       Mascot, NFT artwork, deposit QR
```

## Backend

The app is backed by **Vercel Serverless Functions** (`/api`) + **Vercel
Postgres (Neon)**. Everything deploys as a single Vercel project — no separate
server to run.

```
api/
  _lib/
    db.ts          Postgres pool + auto-creating schema (users, accounts, transactions)
    auth.ts        password hashing (bcrypt), JWT sessions, request auth
    email.ts       Resend verification email (with graceful fallback)
    economics.ts   account loading, server-side reward accrual, history
  auth/[action].ts signup · verify · resend · login
  account.ts       GET — hydrate the signed-in user's balances + history
  action/[type].ts stake · claim-airdrop · claim-rewards · compound · buy · deposit · sell · mint
```

What's real now:

- **Auth** — real accounts with bcrypt-hashed passwords, email verification
  codes (15-min expiry), and 30-day JWT sessions persisted in `localStorage`.
  Verification emails send via Resend; if no API key is set the code is shown
  on-screen so the flow still works.
- **Persistence** — every balance, stake, reward, claim, deposit and mint is
  stored per-user in Postgres and survives reloads and devices. Staking
  rewards accrue **server-side** based on elapsed time.
- **Empty wallet until claim** — new accounts start at 0 across the board. The
  one-time airdrop claim (200 $MOOLA, recorded against the user's Solana
  address) is the first thing that funds the wallet.

What's intentionally **not** on-chain yet: the economic amounts are
app-managed numbers, and deposits/sells/presale buys are recorded but do **not**
move real crypto. Wiring real Solana settlement (SPL token, staking program,
custody) is a separate, audited piece of work — don't take real user funds
against these flows until that's built.

### Deploy to Vercel

1. Import the repo into Vercel.
2. **Storage → Create Database → Postgres (Neon)** and connect it to the
   project. This sets `POSTGRES_URL` automatically. Tables auto-create on the
   first request.
3. **Settings → Environment Variables** — add `JWT_SECRET`
   (`openssl rand -base64 48`). Optionally add `RESEND_API_KEY` +
   `MOOLA_EMAIL_FROM` to send real verification emails.
4. Deploy. See `.env.example` for the full list.

Local full-stack dev: `npm run dev:full` (runs `vercel dev`, serving the SPA
and `/api` together). `npm run dev` runs the UI only (no backend).

## Withdrawal safety & anti-abuse

Withdrawals are guarded server-side so free tokens can't be cashed out as real
crypto:

- **Rolling age freeze** — only accounts newer than
  `WITHDRAW_MAX_ACCOUNT_AGE_HOURS` (default 24) can withdraw; older accounts are
  blocked. `WITHDRAW_FREEZE_BEFORE` sets a fixed cutoff instead; `off` disables.
- **Real-earnings cap** — a withdrawal can never exceed the user's own deposits
  + commission from referrals who actually deposited + staking rewards on their
  own stake, minus what they've already withdrawn. No deposit and no investing
  downlines ⇒ nothing to withdraw.
- **Master switch** — `WITHDRAW_GUARD=off` disables the guard in an emergency.

The **Admin** dashboard surfaces the abuse: a Withdrawers list (most-active
first, tap for a full per-user breakdown), an abuse report (money in vs out,
wallets paid by many accounts, $0-deposit cash-outs), and deposit-backing on
every pending payout. Set `ADMIN_EMAILS` to grant access.
