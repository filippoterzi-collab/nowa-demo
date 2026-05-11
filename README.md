<div align="center">

# giogio

**Instant payouts for the global digital workforce.**

[![Live Demo](https://img.shields.io/badge/demo-giogio.app-2ea043?style=for-the-badge)](https://giogio.app)
[![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![Status](https://img.shields.io/badge/status-MVP-orange?style=for-the-badge)](#status)

[Live Demo](https://giogio.app) · [Pitch Video](https://www.loom.com/share/f163c74e1f1a48b49a6bb5427b396787) · [Twitter](https://twitter.com/giogio_app)

</div>

---

## The Problem

1.5 billion digital workers wait **14–90 days** to be paid for work they've already done.

| Platform | Settlement |
|---|---|
| Spotify | 30–90 days |
| YouTube AdSense | 30 days |
| TikTok Creator Fund | 30 days |
| Twitch | 15–45 days |
| Fiverr | 14 days |
| Upwork | 5–11 days |
| Deliveroo | 7 days |

Earnings accrue immediately. Settlement happens much, much later. Meanwhile, rent is due, bills arrive, life doesn't wait.

## The Solution

**giogio is instant payout infrastructure on Solana.**

Digital workers tap money they've already earned but won't receive for weeks. The advance is paid in USDC, settles in ~2 seconds, and is reconciled when the platform releases the original payout.

Not lending. Not credit. Not BNPL. **Time arbitrage on earned income.**

## How It Works (current demo)

1. Worker connects their Phantom wallet
2. giogio calculates available advance from pending platform earnings
3. Worker requests advance → USDC sent from treasury in ~2 seconds
4. Manual approval triggers reconciliation (advance + fee returns to treasury, remainder stays with worker)

## Tech Stack

**Blockchain**
- Solana (devnet)
- `@solana/web3.js` — client-side SPL token transfers
- USDC for all settlements
- Treasury keypair for advance disbursement (demo architecture)

**Frontend**
- Next.js + TypeScript
- TailwindCSS + shadcn/ui
- `@solana/wallet-adapter-react` + Phantom

**Backend**
- Next.js API routes
- On-chain reads for balances and transfer history

**AI Tools (heavy usage)**
- Claude (Opus + Sonnet) — product, architecture, copy, pitch
- Claude Code — implementation
- Cursor — IDE

## Status

**MVP / Demo** — running on Solana devnet.

**What works:**
- ✅ Phantom wallet connect
- ✅ Advance eligibility calculation
- ✅ USDC disbursement from treasury in ~2 seconds
- ✅ Manual payout approval flow (demo mode)

**Demo architecture limitations (intentional for hackathon scope):**
- Treasury keypair currently custodies USDC for advances (will move to non-custodial escrow program in v1)
- Manual payout approval (will be automated via platform webhooks)
- Fee set to 2% in code (planned production fee: 5%)

**Roadmap to v1:**
- 🔜 Escrow program for non-custodial split-at-source settlement
- 🔜 Platform integrations (Web3-native first: Superteam Earn, grants, bounties)
- 🔜 Automated repayment via platform webhooks
- 🔜 Mainnet deployment
- 🔜 Subscription tier for high-volume users

## Run Locally

```bash
git clone https://github.com/filippoterzi-collab/nowa-demo
cd nowa-demo
npm install
cp .env.local.example .env.local
# fill in:
#   NEXT_PUBLIC_HELIUS_API_KEY=
#   NEXT_PUBLIC_TREASURY_ADDRESS=
#   NEXT_PUBLIC_USDC_MINT_ADDRESS=
#   TREASURY_PRIVATE_KEY=
npm run dev
```

Open `http://localhost:3000`.

## Why I'm Building This

Five years on Solana. Seven projects shipped, zero real users, $150k of my own money spent chasing things people didn't want.

Then I noticed something I'd lived since high school: payment delays were always the bottleneck for digital workers — including me.

giogio is what I built when I stopped chasing and started listening.

Built in public, every day, at [@giogio_app](https://twitter.com/giogio_app).

## License

MIT
