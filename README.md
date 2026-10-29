# ⚡ SatoshiLink

**Freelancers get paid in Bitcoin in seconds: a Lightning invoice, a link, a QR code, and payment verified by your own node.**

> Amina, a designer in Kaduna, finishes a logo for Hans in Germany. She creates a SatoshiLink invoice for 5,000 sats and sends Hans the link. Hans scans the QR and pays in seconds. Amina's dashboard turns green ("Paid ✓") and both can open a receipt. No bank, no 5-day wait, no 10% fee.

Built for the Bitcoin hackathon (**Greenfield Build** track) in TypeScript with Next.js and **LND**.

<!-- Screenshots: add docs/screenshots/*.png here before submitting -->

## Features

- **Real Lightning invoices.** The server calls `AddInvoice` on the freelancer's own LND node.
- **Share link + QR code.** The client page at `/pay/[id]` shows the QR, a copy button and an "Open in wallet" (`lightning:`) button.
- **Payment verified by the node.** The app polls `LookupInvoice` every 2.5 s, and **Paid only appears when LND reports `SETTLED`**. There is no "mark as paid" button anywhere.
- **Receipts.** `/receipt/[id]` shows the amount paid, settle time and payment hash, and can be printed. It refuses to render until the invoice is settled.
- **Dashboard.** Lists all invoices with status badges and totals (received / outstanding).
- **Node status card.** Shows `GetInfo` output (alias, network, sync state, channels) as proof of the live LND connection.
- **Friendly failures.** If Polar is stopped you see "Couldn't reach your Lightning node — is Polar running?" instead of a crash. Technical details go to the server log only.

## How we used LND

The app follows the 4 stages of the [LND developer tutorial](https://dev.lightning.community/tutorial/):

| Tutorial stage | How SatoshiLink shows it |
|---|---|
| 1. Local cluster + `lncli` | **Polar** runs a regtest network: bitcoind + LND `alice` (freelancer) + LND `bob` (client), with a bob → alice channel. [`scripts/lncli-demo.sh`](scripts/lncli-demo.sh) drives it with real `lncli`. |
| 2. Web client / GUI | Polar's UI is the node GUI: mining blocks, opening channels, paying invoices from bob. |
| 3. RPC client | [`lib/lnd.ts`](lib/lnd.ts) talks to LND's **REST API** over HTTPS. It trusts the node's self-signed **TLS cert** and authenticates with the **admin macaroon**, server-side only. |
| 4. Webapp integration | The whole app: create → share → pay → verify `SETTLED` → receipt. |

LND REST calls used:

| Purpose | Endpoint |
|---|---|
| Node info | `GET /v1/getinfo` |
| Create invoice | `POST /v1/invoices` `{ value, memo, expiry }` |
| Verify payment | `GET /v1/invoice/{r_hash_hex}` → `state`, `amt_paid_sat`, `settle_date` |

`lncli` equivalents (run inside the Polar containers):

```bash
docker exec polar-n1-alice lncli --network regtest getinfo
docker exec polar-n1-alice lncli --network regtest addinvoice --amt 5000 --memo "Hans – Logo design"
docker exec polar-n1-alice lncli --network regtest lookupinvoice <r_hash>
docker exec polar-n1-bob   lncli --network regtest payinvoice --force <bolt11>
```

## Browser wallet mode (Wavelength, signet)

Our online demo can't reach a laptop's LND node, so SatoshiLink also has a second mode. In it, a **self-custodial Lightning wallet runs in the freelancer's browser**, built with Lightning Labs' [Wavelength SDK](https://wavelength.lightning.engineering/) (alpha) on signet.

| Route | What it does |
|---|---|
| `/wallet` | Boots the WebAssembly wallet. Create it (password + 24-word recovery phrase) or unlock it. Shows the balance, a new-invoice form and the invoice list. |
| `/wallet/invoice/[id]` | QR + share link. Status comes live from the wallet's activity stream (`complete` → Paid ✓ → receipt). |
| `/w/pay#…` | The client's pay page. The invoice travels in the URL fragment, so no server copy is needed. |

How it works:
- `useWalletReceive()` creates the BOLT11 invoice.
- `useWalletActivity()` reports when the matching receive entry reaches `complete`. Paid status comes **only** from the wallet; there is no button for it.
- The wallet needs cross-origin isolation, so COOP/COEP headers are set **only** on `/wallet/*` and the runtime files ([`next.config.ts`](next.config.ts)).
- The ~42 MB runtime is downloaded from the official release, and every file is checked against the SHA-256 digests pinned in the SDK ([`scripts/fetch-wavelength-runtime.mjs`](scripts/fetch-wavelength-runtime.mjs)).

Deploy guide: [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md).

## Architecture

```
┌────────────────────────── Laptop ──────────────────────────────┐
│  Next.js (App Router, TypeScript, Tailwind)                    │
│  ├─ Pages: /  /new  /dashboard  /invoice/[id]  /pay/[id]       │
│  │         /receipt/[id]  /how-it-works                        │
│  ├─ API (server only):                                         │
│  │    POST /api/invoices             → LND AddInvoice          │
│  │    GET  /api/invoices[/id]        → list / one              │
│  │    GET  /api/invoices/[id]/status → LND LookupInvoice       │
│  │    GET  /api/node                 → LND GetInfo             │
│  ├─ lib/lnd.ts  (REST: macaroon + TLS, never sent to browser)  │
│  └─ data/invoices.json                                         │
│              │ HTTPS REST + macaroon                           │
│              ▼                                                 │
│  Polar (Docker): bitcoind (regtest) + LND alice ◄─ch─► LND bob │
└────────────────────────────────────────────────────────────────┘
```

## Setup

**You need:** Docker Desktop, [Polar](https://github.com/jamaljsr/polar/releases), and Node.js 20+.

1. Follow [`docs/LND-SETUP.md`](docs/LND-SETUP.md). It walks you through creating the Polar network (alice + bob), funding bob, opening a bob → alice channel, and a test payment.
2. Configure the app:
   ```bash
   cp .env.example .env.local
   # fill in from Polar → alice → Connect tab (REST, File Paths). Use forward slashes on Windows.
   ```
3. Run it:
   ```bash
   npm install
   npm run dev        # http://localhost:3000
   ```
4. Pay an invoice from bob, either with Polar's UI (bob → Actions → Pay Invoice) or from the terminal:
   ```bash
   npm run pay -- <bolt11>
   ```
   If your container names differ, check them with `docker ps` and set `ALICE_CONTAINER` / `BOB_CONTAINER`.

## Known limitations

- **Regtest, local only.** The LND node runs in Polar on the demo laptop, so a hosted deployment can't reach it. For live judging the laptop app is exposed with `cloudflared tunnel --url http://localhost:3000`.
- **Single freelancer.** There is one node and no accounts or login.
- **JSON file storage** (`data/invoices.json`). Fine for a demo, not for production.
- **Polling.** Status is checked every 2.5 s. Streaming via LND's `SubscribeInvoices` is a planned upgrade.
- **Browser wallet mode is alpha + signet.** The wallet and its invoices live in one browser, the client pay page can't show live status, and on 28 Oct 2026 the public signet server was rejecting invoice creation (`ARK_VERSION_MISMATCH`, a server-side issue).

## Next steps

- Mainnet with the freelancer's own node, or Wavelength's self-custodial browser wallet once it supports mainnet.
- Multiple users, each connecting their own node.
- Stablecoin invoices via Taproot Assets.
- PDF receipts and email delivery.

## Team

- **Ibrahim Muhammad**: full-stack engineering
- **Umar Alhassan**: full-stack engineering

Track: **Greenfield Build**.
