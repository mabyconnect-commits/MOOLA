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

## Notes for production

This is a faithful UI build with simulated state. Before shipping:

- **Auth** — replace the demo 6-digit code flow with a real provider
  (email/password + verification email or magic link, session persistence).
  Remove the on-screen "Demo code" banner.
- **Wallet & chain** — wire real Solana wallet connection, presale purchase,
  staking, NFT minting, and sell flows to the contracts/backend.
- The economic numbers (rewards, balances, prices) are illustrative.
