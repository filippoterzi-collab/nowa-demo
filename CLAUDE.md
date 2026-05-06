# CLAUDE.md

## Project Overview

This is a hackathon demo for the Solana Frontier Hackathon by Colosseum (deadline: May 11, 2026).

**Product:** Earned Wage Access (EWA) for the global digital workforce.

**One-liner:** Freelancers and creators wait weeks or months to get paid by platforms like Upwork, Fiverr, YouTube, and Spotify. This app lets them cash out their pending earnings instantly in USDC on Solana.

**Demo scope:** A working prototype where a user connects a Solana wallet, sees a list of mock pending earnings from multiple platforms, clicks "Cash Out", and receives REAL mock-USDC on Solana devnet from a treasury wallet. The transaction must be verifiable on Solscan.

**What is mocked vs real:**
- MOCKED: the platform integrations (Upwork API, Fiverr API, etc.). Pending earnings are hardcoded in the frontend. The "USDC" token is a mock SPL token we create on devnet, not Circle's official USDC.
- REAL: the wallet connection, the SPL token transfer on Solana devnet, the transaction signature, the Solscan link.

## Stack

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS only — no separate CSS files, no styled-components
- **Solana libraries:** `@solana/web3.js`, `@solana/spl-token`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-wallets`
- **Wallet:** Phantom (primary), Solflare (optional fallback)
- **RPC:** Helius devnet endpoint (key in `.env.local`)
- **Network:** Solana devnet only — never mainnet
- **Deploy target:** Vercel

## Critical Constraints

1. **Never write Rust or Anchor smart contracts.** This project uses only client-side TypeScript with `@solana/web3.js` for direct SPL token transfers from a treasury keypair. No on-chain programs.

2. **Never commit secrets.** Treasury private key, Helius API key, and any sensitive config must live in `.env.local`. The `.env.local` file must be in `.gitignore`. Use `process.env` to access them.

3. **USDC mint address (devnet):** We create our own mock USDC SPL token on devnet for demo reliability. The mint address is generated during setup and stored in `.env.local` as `NEXT_PUBLIC_USDC_MINT_ADDRESS`. Hardcode it as a constant in `lib/constants.ts` after creation. In the pitch video, disclose that we use a mock token for demo purposes; production would use Circle's official USDC mint.

4. **The cash-out and repayment transactions must succeed on devnet and return real signatures.** If a transaction fails, the UI must show the error clearly, not a fake success state.

5. **Persistence is on-chain — read Solana directly rather than browser storage.** Active loans are reconstructed on wallet connect from recent USDC transfers between user and treasury (chunked `getParsedTransaction` on the user's USDC ATA, public devnet RPC for that read-only query). React state holds in-flight UI only; the chain is the source of truth.

## Test Wallet (mine, for development)

- **Phantom devnet wallet (user-side, where USDC is sent during cash-out):** `3UEB2aA45oguSmTwoF4LNtuhLJ3fuZPh3SB5ECu7kn7a`
- The treasury wallet will be created via Solana CLI during setup and stored as a keypair file referenced in `.env.local` as `TREASURY_PRIVATE_KEY`.

## Code Style and Conventions

- Use **functional components** with hooks. No class components.
- Use **async/await**, never `.then()` chains.
- Always use **TypeScript types**, never `any`. If a type is unknown, use `unknown` and narrow it.
- File naming: kebab-case for files (e.g., `cash-out-button.tsx`), PascalCase for components.
- Folder structure:
  - `app/` — Next.js App Router pages
  - `components/` — reusable React components
  - `lib/` — Solana logic, helpers, constants
  - `lib/solana.ts` — all Solana transaction logic in one file
  - `lib/constants.ts` — addresses, mints, config
  - `lib/mock-data.ts` — mocked user and platform data
- Imports: use absolute paths with `@/` alias (configured in `tsconfig.json`).
- Tailwind: prefer utility classes over custom CSS.

## UI Design Principles

- **Aesthetic:** clean, modern, fintech-grade. Reference: Wise, Linear, Mercury, Cash App. NOT crypto-bro neon, NOT Web3 dark-mode default.
- **Mobile-first:** every page must work on a phone screen first, desktop second.
- **Color palette:**
  - Background: white / very light gray
  - Primary text: near-black (#0E1116 or similar)
  - Accent: a single fresh color (suggest mint green #2EC4B6 or electric coral #FF5A4E)
  - Neutral grays for borders and secondary text
- **Typography:** sans-serif system stack or Inter. No serifs.
- **No emojis in UI** unless I explicitly ask.
- **No "loading..." text** — use proper skeleton loaders or animated spinners.

## Behavior Expectations from Claude Code

1. **Plan before coding.** When given a task, write a 3-5 step plan first, get my confirmation, then execute.

2. **Ask before installing dependencies.** Don't `npm install` random packages. Confirm with me first what you want to add and why.

3. **Test as you go.** After each significant change, run `npm run dev` and tell me what to check in the browser.

4. **One task at a time.** Don't bundle 5 features into one PR-style commit. Build one thing, verify it works, move on.

5. **Explain WHY, not just WHAT.** When you write Solana code, briefly explain what it does — I'm learning Solana for the first time and need to understand the basics to debug later.

6. **If something is unclear, ASK.** Don't assume my intent. I'd rather answer one question than rewrite a feature.

7. **Use `solana logs` and Solscan to verify transactions.** When a transaction is sent, confirm the signature exists on devnet by giving me the Solscan link.

## Demo Flow (Definitive Spec)

The demo is a 6-step linear flow. All platform integrations are mocked; both Solana transactions are real on devnet.

### Step 1 — Connect Platform (MOCKED)
- User lands on the app, sees a list of platform logos: Upwork, Fiverr, YouTube, Spotify
- User clicks "Connect Upwork"
- Show a fake OAuth modal: "Connecting to Upwork..." with a 2-second loading state
- On complete, show a connected state: "Connected as Maria Silva ✓" (hardcoded fake user)

### Step 2 — Algorithm Analysis (MOCKED)
- After connect, automatically transition to an "Analyzing your earnings" screen
- Show fake metrics being calculated with a 3-second animation:
  - "Average monthly earnings: $1,247"
  - "Completion rate: 87%"
  - "Active for 14 months"
  - "Pending payouts: $487"
- End with a clear card: "You can access up to $347 (80% of pending)"

### Step 3 — Choose Amount
- User sees a slider or numeric input from $50 to $347 (the max calculated)
- Below the input, show in real-time:
  - "Cash out: $100"
  - "Fee: $2 (2%)"
  - "Repayment: $102 within 14 days"
- Big primary button: "Get $100 now"

### Step 4 — Cash Out (REAL ON-CHAIN)
- User clicks "Get $100 now"
- Trigger a real USDC SPL token transfer on Solana devnet from the treasury wallet to the user's connected wallet
- Show loading state: "Sending USDC to your wallet..."
- On success: show a success card with:
  - "$100 USDC received"
  - Link to Solscan with the real transaction signature
  - "View on Solscan" button (opens https://solscan.io/tx/{signature}?cluster=devnet)

### Step 5 — Active Loan State (Visual Loan Tracker)
- After successful cash-out, transition to an "Active Loan" screen
- Display:
  - Loan amount: $100
  - Repayment amount: $102
  - Due date: 14 days from now (calculated dynamically)
  - **Visual progress bar**: "Day 0 of 14" with a horizontal bar that's empty initially. Purely visual — no actual countdown logic needed.
  - **Badge below the loan card**: "In production, repayment auto-deducts from your next Upwork payout. Demo allows manual repayment for testing."
- Primary button at the bottom: "Repay now"

### Step 6 — Repayment (REAL ON-CHAIN)
- User clicks "Repay now"
- Trigger a real USDC SPL token transfer on Solana devnet from the user's wallet back to the treasury wallet
- **Demo simplification**: the user repays only $100 (the principal), not $102. The $2 fee is "waived for demo" — note this clearly in a small disclaimer in the UI: "Demo: fee waived for testing. In production, repayment includes the 2% fee."
- Loading state: spinner + "Confirming…" inline inside the Repay button (button stays in place, disabled)
- On success: the button area is replaced by a success state showing:
  - Green checkmark icon + "Repayment confirmed"
  - "View on Solscan" link to the repay transaction
  - Brand-themed confetti burst (emerald + neutral palette) at the moment of success
- **Post-repay flow**: after 4 seconds, full reset to the Choose Platform picker — `selectedPlatform = null`, `platformStatus = "not_selected"`, all loan + cash-out state cleared. The user re-picks a platform, re-does OAuth + analysis, lands on Choose Amount for the next cycle. Clicking "View on Solscan" cancels the auto-transition timer so the user can verify on Solscan and remain on the success card.

## Revenue Model Positioning

When language about money is needed in the UI or copy:
- **Always use "fee"**, never "interest" or "interest rate"
- **Always show the fee upfront**, before the user confirms anything
- **Frame the product as "earned wage access" or "advance"**, never as "loan" or "credit" in user-facing copy
- The pitch deck and README can use "microloan" for investor clarity, but the UI itself must use EWA framing

## Mock Data Constants

Hardcode these in `lib/mock-data.ts`:

```typescript
export const MOCK_USER = {
  name: "Maria Silva",
  platform: "Upwork",
  avgMonthlyEarnings: 1247,
  completionRate: 0.87,
  monthsActive: 14,
  pendingPayouts: 487,
  maxAdvance: 347, // 80% of pending
};

export const FEE_PERCENTAGE = 0.02; // 2%
export const REPAYMENT_DAYS = 14;
```

## Two Real Solana Transactions Required

1. **Cash-out**: Treasury wallet → User wallet (mock USDC SPL token transfer on devnet)
2. **Repayment**: User wallet → Treasury wallet (mock USDC SPL token transfer on devnet)

Both must produce real signatures verifiable on Solscan at https://solscan.io/?cluster=devnet

If either fails, the demo fails. Prioritize making these two transactions rock-solid above all UI polish.

## Deployment

- **Target:** Vercel
- Environment variables required on Vercel: `NEXT_PUBLIC_HELIUS_API_KEY`, `TREASURY_PRIVATE_KEY` (server-side only, never expose to client), `NEXT_PUBLIC_USDC_MINT_ADDRESS`
- The treasury private key MUST be used only in server-side code (API routes), never in client components.

## Submission Checklist (don't forget for May 11)

- [ ] GitHub repo with all hackathon-period commits
- [ ] App deployed and live on Vercel
- [ ] Real devnet transactions demonstrable, with Solscan links
- [ ] 3-minute pitch video
- [ ] Technical demo video showing the cash-out + repayment flow
- [ ] Submitted on arena.colosseum.org

## What I Am NOT Building (out of scope for this demo)

- Real platform integrations (Upwork, Fiverr APIs) — mocked only
- Smart contracts / Anchor programs — not needed
- KYC / identity verification — out of scope
- Repayment automation — mocked in UI as "scheduled"
- Multi-chain support — Solana devnet only
- Mainnet deployment — devnet only
- Mobile app (iOS/Android) — web responsive only

## Hackathon Mode

- Time budget: ~6 days. Optimize for working code, not perfect code.
- When in doubt between two approaches, pick the simpler one and document the choice.
- Skip writing tests unless something breaks repeatedly. We'll add tests post-hackathon if the project survives.
- For UI: prefer copy-pasting from shadcn/ui or pre-built Tailwind components over hand-crafting. Speed > originality.

## Auto-funding flow

To onboard new users (judges, friends) who connect with empty wallets, the app
runs a 2-modal onboarding sequence after wallet connection.

**Detection logic (in `app/page.tsx`, after `publicKey` change):**
1. If `localStorage["giogio-setup-acknowledged"] !== "true"` → show `SetupPhantomModal`.
2. Else fetch `connection.getBalance(publicKey)`. If balance < 0.05 SOL → show `FundWalletModal`.
3. If both checks pass, no modals appear and the user proceeds to the platform picker.

**Modal 1 — `components/setup-phantom-modal.tsx`:**
Educational walkthrough for switching Phantom to devnet. The "I'm on Devnet ✓"
button is a pure self-attestation — it sets `localStorage["giogio-setup-acknowledged"] = "true"`
and closes. We don't try to verify the wallet's actual network because there's
no reliable way to read Phantom's selected network from JS (the app's
`connection.rpcEndpoint` is hardcoded to Helius devnet via `SolanaWalletProvider`,
so it can't tell us anything about Phantom). Returning visitors skip this modal.

**Modal 2 — `components/fund-wallet-modal.tsx`:**
Sends `POST /api/fund-wallet { walletAddress }`. On success, shows a green
checkmark + auto-closes after 1.5s. Funding amount is **0.1 SOL only** — no
USDC. The user borrows USDC from the app via the normal cash-out flow, which
already handles ATA creation.

**API — `app/api/fund-wallet/route.ts`:**
- Validates `walletAddress` as a Solana `PublicKey` (400 if invalid).
- Refuses if user balance ≥ 0.05 SOL (400 "Wallet already has funds").
- Refuses if treasury balance < 1 SOL (503).
- Sends 0.1 SOL via `SystemProgram.transfer` from `TREASURY_PRIVATE_KEY`,
  signed and confirmed with commitment `'confirmed'`.
- Per-IP rate limit: 3 requests / hour (429 if exceeded). In-memory `Map`,
  module-scoped — resets on cold start. Adequate for hackathon demo; for
  production, swap for Redis or Vercel KV.

## Known UI Quirks

- Phantom (and possibly other wallets) cannot read decimals correctly for SPL tokens that don't have on-chain metadata (like our mock USDC). The user's wallet may display "5 null" instead of "10 USDC" — this is a wallet rendering issue, not a balance issue. The actual on-chain balance is correct and verifiable via Solscan or programmatic queries. We are not adding metadata to the mock USDC for this hackathon.
