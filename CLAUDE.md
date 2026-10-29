# CLAUDE.md — SatoshiLink (Bitcoin Hackathon Build Brief)

> Put this file in the **root of an empty project folder** and start Claude Code there.
> Claude Code reads `CLAUDE.md` automatically at the start of every session.

---

## 0. Who you are working with (read first)

- **Owner:** Ibrahim — full-stack engineer (React, Flutter, Python), based in Kaduna, Nigeria.
- **Bitcoin/Lightning experience: beginner.** He is strong at web dev but new to Lightning, LND, macaroons, regtest, etc.
- **Deadline:** hackathon build day is **29 October 2026** (timezone Africa/Lagos, UTC+1). Speed matters. A working, honest demo beats a big unfinished one.
- **Goal:** Claude Code builds the **whole project**, end to end, and asks Ibrahim whenever a decision, credential, or manual step is needed.

### How to communicate with Ibrahim
1. **Explain like a beginner.** When you introduce a Bitcoin/Lightning concept (invoice, macaroon, regtest, channel, preimage…), give a one-line plain-English meaning and a tiny real-world analogy.
2. **Keep him in the loop at milestones.** After each milestone in Section 9: summarise what was built, how to see it working, and what's next.
3. **Ask, don't guess, on these:** anything in Section 1 "Open questions", any credential/file path on his machine, anything that needs him to click in Polar or a browser, and any scope change. Use the AskUserQuestion tool (multiple-choice) when available; otherwise ask in plain text and wait.
4. **Don't ask about things you can decide yourself** (folder names, component structure, styling details, library choice where this file already recommends one). Decide, then mention it in one line.
5. **When you need him to do a manual step** (install Docker, click "Mine blocks" in Polar, copy a macaroon), give numbered steps with exactly what to click and what he should see afterwards.
6. Casual, direct tone. No walls of text.

---

## 1. Open questions — ASK THESE FIRST (one batch, before writing code)

Ask Ibrahim these at the very start of the first session. Record answers in `docs/DECISIONS.md`.

1. **Exact hackathon criteria.** "Please paste the judging criteria / technical requirements from the hackathon (the form or event page). I know LND is part of the criteria — what exactly do they require? (e.g. must use lnd, must use gRPC, must show lncli, specific network?)"
2. **Team size and roles.** Solo, or how many teammates, and who does what?
3. **Machine setup.** OS (Windows / macOS / Linux)? Is **Docker** installed and running? Is **Node.js 20+** installed? (Check with `node -v` and `docker --version` yourself if you can run commands.)
4. **Payment backends.** Recommended: **LND (via Polar, regtest) as the primary backend** + **Wavelength as an optional second mode**. Options: (a) LND only, (b) LND + Wavelength (recommended if time allows), (c) Wavelength only.
5. **Demo format.** Live on his laptop (localhost), deployed URL, or both? (LND on Polar is local only — see Section 5.4.)
6. **Submission deadline time** and what must be submitted (repo, video, deployed link, slides).

If he doesn't know an answer yet, take the recommended default, write it in `docs/DECISIONS.md` as "assumed", and keep going.

---

## 2. Product in one paragraph

**SatoshiLink** lets freelancers request payment in Bitcoin over the Lightning Network. The freelancer fills a simple form (client name, service description, amount), the app creates a **real Lightning invoice** on the freelancer's own Lightning node, and shows a QR code plus a shareable link. The client opens the link, scans the QR with any Lightning wallet and pays. The app **verifies the payment with the node itself** (invoice state `SETTLED`), flips the status to **Paid**, and shows a receipt. Payment status is **never** set by a button click.

### Scenario (use this in the README and pitch)
Amina, a designer in Kaduna, finishes a logo for Hans in Germany. She creates a SatoshiLink invoice for 5,000 sats, sends Hans the link. Hans scans the QR and pays in seconds. Amina's dashboard turns green — "Paid ✓" — and both can open a receipt. No bank, no 5-day wait, no 10% fee.

---

## 3. Hackathon context & criteria mapping

- Track: **Greenfield Build**. Teams of 1–4. Language: **TypeScript/JavaScript**.
- **LND is part of the judging criteria.** The build must clearly demonstrate the skills from the official LND developer tutorial (https://dev.lightning.community/tutorial/), which has 4 stages:
  1. **Local cluster** — run several LND nodes that can pay each other, use `lncli`.
  2. **Web client** — use a GUI for lnd.
  3. **RPC client** — talk to lnd from code (gRPC/REST), handle macaroons & TLS.
  4. **Webapp integration** — add Lightning payments to a web app (the tutorial's example is a micropayment paywall on a news site).
- SatoshiLink covers all four:

| Tutorial stage | How SatoshiLink shows it |
|---|---|
| 1. Local cluster + lncli | **Polar** runs a regtest network (bitcoind + 2–3 LND nodes: `alice` = freelancer, `bob` = client). README + `scripts/` show real `lncli` commands (`getinfo`, `addinvoice`, `lookupinvoice`, `payinvoice`). |
| 2. Web client / GUI | Polar's UI is the GUI for node management (mine blocks, open channels, pay invoices). Mention in README/pitch. |
| 3. RPC client | `lib/lnd.ts` talks to LND over its **REST API** (or gRPC — see 5.2) with **admin macaroon + TLS cert**, server-side only. |
| 4. Webapp integration | The whole app: create invoice → share → pay → verify `SETTLED` → receipt. |

- **Optional bonus:** Lightning Labs' **Wavelength** SDK (alpha, July 2026) as a second "Browser wallet" mode — self-custodial wallet running in the browser on signet. Only after LND mode is fully working (see Section 7).

**If the criteria Ibrahim pastes (Q1) differ from this mapping, update this section and `docs/DECISIONS.md`, and adjust the plan before building.**

---

## 4. Scope

### MVP — must work (in this order)
1. Invoice form: client name, service description, amount in **sats** (whole number > 0, max 10,000,000), optional client email (display only).
2. Server creates a real invoice on LND (`POST /v1/invoices`), stores it, returns `payment_request` (BOLT11).
3. Invoice page for the freelancer: details, **QR code**, copy invoice, copy share link, live status.
4. Public pay page `/pay/[id]` for the client: who's billing, what for, amount, QR, "Open in wallet" (`lightning:` URI), live status.
5. **Verification**: server asks LND for the invoice state (`OPEN | SETTLED | CANCELED | ACCEPTED`). UI polls our API every 2–3 s (or SSE if time). Expired = `OPEN` past `created + expiry`.
6. Receipt page `/receipt/[id]`: amount paid (`amt_paid_sat`), settle date, payment hash, memo; printable.
7. Dashboard `/dashboard`: list of invoices with status badges and totals.
8. Node status card: shows LND alias, network (regtest), synced, number of channels (`GET /v1/getinfo`). Proves the LND connection to judges.

### Stretch (only after MVP passes the acceptance test in Section 10)
- Wavelength "Browser wallet" mode (Section 7).
- Server-Sent Events instead of polling (LND `GET /v2/invoices/subscribe/{r_hash}` stream).
- ≈USD display using a fixed demo rate labelled "approximate".
- Invoice expiry selector, cancel invoice.
- Dark mode, nicer receipt PDF.

### Out of scope
Mainnet/real money, user accounts/login, multi-tenant nodes, fiat conversion, exchanges, AI features, custodial balances.

---

## 5. Architecture

```
┌────────────────────── Ibrahim's laptop ───────────────────────────┐
│                                                                  │
│  Next.js app (App Router, TypeScript, Tailwind)                  │
│  ├─ Pages: / , /new, /dashboard, /invoice/[id], /pay/[id],       │
│  │         /receipt/[id], (/wallet — stretch, Wavelength)        │
│  ├─ API routes (server only):                                    │
│  │    POST /api/invoices            → LND AddInvoice              │
│  │    GET  /api/invoices            → list                        │
│  │    GET  /api/invoices/[id]       → one (public-safe fields)    │
│  │    GET  /api/invoices/[id]/status→ LND LookupInvoice           │
│  │    GET  /api/node                → LND GetInfo                 │
│  ├─ lib/lnd.ts   (REST client: macaroon + TLS, server only)      │
│  └─ data/invoices.json (simple file store)                       │
│              │ HTTPS REST + macaroon                              │
│              ▼                                                   │
│  Polar (Docker): bitcoind (regtest) + LND "alice" (freelancer)   │
│                                     + LND "bob"   (client/payer) │
│                    alice ◄──channel──► bob                        │
└──────────────────────────────────────────────────────────────────┘
```

### 5.1 Stack
- **Next.js (App Router) + TypeScript + Tailwind CSS.** Server API routes are needed because the LND macaroon is a secret and must never reach the browser.
- **QR:** `qrcode.react` (render `QRCodeSVG` with the invoice **uppercased** — denser, easier to scan).
- **Validation:** `zod`.
- **Storage:** `data/invoices.json` via a tiny repository module (`lib/store.ts`) with read/write helpers. (Swap for SQLite later if needed — don't do it today.)
- **IDs:** `crypto.randomUUID()` → use a short slug (first 10 chars) for URLs.
- Package manager: npm.

### 5.2 Talking to LND — REST (default) vs gRPC
- **Default: REST** using Node's built-in `https` module (no extra deps). LND REST runs on HTTPS with a **self-signed TLS cert**, so pass the cert as `ca`. Authenticate with header `Grpc-Metadata-macaroon: <admin macaroon as hex>`.
- **If the criteria require gRPC** (ask in Q1): use `@grpc/grpc-js` + `@grpc/proto-loader` with `lightning.proto` from the lnd repo, `grpc.credentials.createSsl(tlsCert)` combined with a macaroon metadata call credential. Keep the same `lib/lnd.ts` function signatures so the rest of the app doesn't change.

Endpoints used (REST):
| Purpose | Method + path | Notes |
|---|---|---|
| Node info | `GET /v1/getinfo` | alias, identity_pubkey, synced_to_chain, num_active_channels, chains[].network |
| Create invoice | `POST /v1/invoices` body `{ value: "<sats>", memo, expiry: "3600" }` | returns `r_hash` (base64), `payment_request`, `add_index` |
| Look up invoice | `GET /v1/invoice/{r_hash_hex}` | convert base64 `r_hash` → hex. Response has `state`, `amt_paid_sat`, `settle_date`, `creation_date`, `expiry` |
| Stream (stretch) | `GET /v2/invoices/subscribe/{r_hash_base64url}` | newline-delimited JSON |

Reference: https://lightning.engineering/api-docs/api/lnd/rest-endpoints/

`state` values: `OPEN` (not paid yet), `SETTLED` (paid ✓), `CANCELED`, `ACCEPTED` (hold invoices only — treat as "processing").

### 5.3 Environment variables (`.env.local`, never committed; provide `.env.example`)
```
LND_REST_HOST=https://127.0.0.1:8081      # from Polar → alice → Connect tab → REST Host
LND_TLS_CERT_PATH=/absolute/path/tls.cert  # Polar → alice → Connect → TLS Cert (file path)
LND_MACAROON_PATH=/absolute/path/admin.macaroon  # Polar → alice → Connect → Admin Macaroon (file path)
# Alternative if paths are awkward on Windows:
# LND_TLS_CERT_BASE64=...
# LND_MACAROON_HEX=...
NEXT_PUBLIC_APP_NAME=SatoshiLink
```
`lib/lnd.ts` must support both path and inline forms. **Ask Ibrahim to paste the Connect-tab values** — never guess paths.

### 5.4 Deployment reality (explain this to Ibrahim)
LND on Polar runs **only on his laptop**. A Vercel deployment cannot reach it. So:
- **Main demo = localhost** (LND mode, fully real).
- If a deployed URL is required: deploy the app with Wavelength mode (signet) as the online demo, or expose the local app with a tunnel (`cloudflared tunnel --url http://localhost:3000`) during judging. Ask him which (Q5).

### 5.5 Data model (`lib/types.ts`)
```ts
export type InvoiceStatus = 'pending' | 'paid' | 'expired' | 'canceled' | 'processing';

export interface Invoice {
  id: string;              // short slug used in URLs
  clientName: string;
  clientEmail?: string;
  description: string;
  amountSat: number;
  memo: string;            // `${clientName} – ${description}` (max ~100 chars)
  paymentRequest: string;  // BOLT11
  rHashHex: string;        // payment hash (hex) — used for lookup
  backend: 'lnd' | 'wavelength';
  status: InvoiceStatus;   // cached; source of truth is LND
  createdAt: string;       // ISO
  expiresAt: string;       // ISO
  settledAt?: string;      // ISO, from LND settle_date
  amountPaidSat?: number;  // from LND amt_paid_sat
}
```
Public endpoints must not leak anything secret (there's nothing secret in Invoice, but never return node credentials or raw LND errors).

---

## 6. Pages & UX

Design: clean, professional, trustworthy (it's an invoice, not a crypto casino). Bitcoin orange `#F7931A` as the accent, dark slate text, lots of white space, mobile-first. Status badges: Waiting (amber, pulsing dot), Paid (green ✓), Expired (grey), Canceled (red).

| Route | Who | Content |
|---|---|---|
| `/` | everyone | Hero: "Get paid in Bitcoin in seconds." 3-step explainer (Create → Share → Get paid), CTA "Create invoice", Node status card. |
| `/new` | freelancer | Form + live preview card. Submit → redirect to `/invoice/[id]`. Friendly errors ("Couldn't reach your Lightning node — is Polar running?"). |
| `/invoice/[id]` | freelancer | Invoice card, QR, copy invoice, copy share link, status (polling), link to receipt when paid. |
| `/pay/[id]` | client | Minimal page: "Amina is requesting 5,000 sats for Logo design", QR, copy, `lightning:` button, status. On paid → "Payment received ✓" + receipt link. |
| `/receipt/[id]` | both | Receipt: from/to, description, amount, settled time, payment hash (short + copy), "Verified by Lightning node" note, Print button with print CSS. Only renders when status = paid; otherwise "Not paid yet". |
| `/dashboard` | freelancer | Table/cards of invoices, filters (all/paid/waiting), totals (sats received). |
| `/how-it-works` (optional) | judges | Beginner explanation + architecture diagram + LND tutorial mapping. Great for judging. |

---

## 7. Stretch: Wavelength "Browser wallet" mode

Only start after Section 10 acceptance test passes. **Ask Ibrahim before starting.**

- Packages: `@lightninglabs/wavelength-web`, `@lightninglabs/wavelength-react`. Docs (AI-friendly): https://wavelength.lightning.engineering/llms.txt — fetch `.md` versions of pages; check npm for current versions rather than guessing.
- Runs a **self-custodial wallet in the browser** (WASM) on **signet** with `defaultConfig('signet')`. No node needed.
- Key hooks: `useWallet()` (phase), `useWalletCreate()` (`create({ password })` → mnemonic), `useWalletReceive()` (`receive({ amountSat, memo })` → `.invoice`), `useWalletActivity()` (find entry where `kind === 'receive'` and `request?.lightningInvoice === bolt11`; `status` `'pending' | 'complete' | 'failed'`).
- Runtime assets: host the WASM files under `public/wavewalletdk/<RUNTIME_MANIFEST_VERSION>/` (from the matching release `Wavewalletdk.wasm.tar.gz` at github.com/lightninglabs/wavelength/releases).
- **Cross-origin isolation is required** (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`). In Next.js set these headers **only on `/wallet/:path*`** in `next.config` so the rest of the app (fonts, etc.) isn't affected. Wavelength components must be client-only (`'use client'` + dynamic import with `ssr: false`).
- In this mode the payment is verified by the browser wallet's activity stream; invoices are stored with `backend: 'wavelength'`. The client pay page can show the QR but not live status (only the freelancer's browser sees settlement) — say so in the UI and README.
- Paying it requires a funded signet wallet (e.g. the hosted demo at https://wavelength.lightning.engineering/demo/). Ask Ibrahim whether he has signet coins.

---

## 8. Project structure

```
satoshilink/
├── CLAUDE.md
├── README.md
├── .env.example
├── docs/
│   ├── DECISIONS.md          # answers to Section 1 + assumptions
│   ├── LND-SETUP.md          # Polar step-by-step for beginners
│   └── DEMO-SCRIPT.md        # 3-minute pitch
├── scripts/
│   ├── lncli-demo.sh         # getinfo / addinvoice / lookupinvoice / payinvoice via docker exec
│   └── pay-invoice.sh        # pay a BOLT11 from "bob" (used in live demo)
├── data/invoices.json        # gitignored (keep data/.gitkeep)
├── app/
│   ├── layout.tsx  page.tsx  globals.css
│   ├── new/page.tsx
│   ├── dashboard/page.tsx
│   ├── invoice/[id]/page.tsx
│   ├── pay/[id]/page.tsx
│   ├── receipt/[id]/page.tsx
│   ├── how-it-works/page.tsx
│   └── api/
│       ├── node/route.ts
│       └── invoices/
│           ├── route.ts                 # POST create, GET list
│           └── [id]/
│               ├── route.ts             # GET one
│               └── status/route.ts      # GET live status from LND
├── components/
│   ├── InvoiceForm.tsx  InvoiceCard.tsx  QRBlock.tsx  CopyButton.tsx
│   ├── StatusBadge.tsx  PaymentStatus.tsx (polling hook)  ReceiptCard.tsx
│   └── NodeStatusCard.tsx
└── lib/
    ├── lnd.ts          # getInfo, addInvoice, lookupInvoice (server only: import 'server-only')
    ├── store.ts        # JSON file repository
    ├── status.ts       # map LND state + expiry → InvoiceStatus
    ├── validation.ts   # zod schemas
    ├── format.ts       # sats formatting, dates, short hash
    └── types.ts
```

### `lib/lnd.ts` reference sketch (REST, no extra deps)
```ts
import 'server-only';
import https from 'node:https';
import fs from 'node:fs';

const host = new URL(process.env.LND_REST_HOST!);
const cert = process.env.LND_TLS_CERT_BASE64
  ? Buffer.from(process.env.LND_TLS_CERT_BASE64, 'base64')
  : fs.readFileSync(process.env.LND_TLS_CERT_PATH!);
const macaroonHex = process.env.LND_MACAROON_HEX
  ?? fs.readFileSync(process.env.LND_MACAROON_PATH!).toString('hex');

function lnd<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host.hostname, port: host.port, path, method,
      ca: cert,
      headers: { 'Grpc-Metadata-macaroon': macaroonHex, 'Content-Type': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        const json = data ? JSON.parse(data) : {};
        (res.statusCode ?? 500) >= 400 ? reject(new Error(json.message ?? `LND ${res.statusCode}`)) : resolve(json);
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export const getInfo = () => lnd<any>('GET', '/v1/getinfo');
export const addInvoice = (sats: number, memo: string, expirySec = 3600) =>
  lnd<{ r_hash: string; payment_request: string }>('POST', '/v1/invoices',
    { value: String(sats), memo, expiry: String(expirySec) });
export const lookupInvoice = (rHashHex: string) => lnd<any>('GET', `/v1/invoice/${rHashHex}`);
export const b64ToHex = (b64: string) => Buffer.from(b64, 'base64').toString('hex');
```
(If Polar's cert hostname causes a TLS name mismatch on `127.0.0.1`, try `localhost`, or set `servername: 'localhost'`. Do **not** disable TLS verification.)

---

## 9. Milestones (build in order, check in with Ibrahim after each)

Use the task list. Commit after each milestone (`git init` first if needed).

**M0 — Kickoff (≈15 min)**
Ask Section 1 questions. Create `docs/DECISIONS.md`. Check `node -v`, `docker --version`.
✅ Done when: decisions recorded.

**M1 — Lightning lab with Polar (≈45 min)** — *mostly Ibrahim clicking; you guide him.*
Write `docs/LND-SETUP.md` and walk him through:
1. Install Docker (Docker Desktop on Windows/macOS) and Polar (https://github.com/jamaljsr/polar/releases).
2. Polar → Create network: 1× Bitcoin Core, 2× LND named **alice** (freelancer) and **bob** (client). Start it.
3. Fund bob: right-click/Deposit regtest coins (or "Quick Mine" then deposit). Open a channel **bob → alice** (e.g. 1,000,000 sats) so bob can pay alice. Mine a few blocks to confirm.
4. Test once in Polar UI: alice creates invoice, bob pays it. ✅ That proves the network works.
5. alice → **Connect** tab → copy REST host, TLS cert path, admin macaroon path → paste to you.
✅ Done when: `.env.local` filled and `GET /api/node` returns alice's alias with `synced_to_chain: true`.

**M2 — Scaffold (≈30 min)**
`npx create-next-app@latest satoshilink --ts --tailwind --app --eslint` (or in current folder), install `qrcode.react zod server-only`. Layout, header, colors, home page with NodeStatusCard.
✅ Done when: home page shows "Connected to alice (regtest)".

**M3 — Create invoice (≈1 h)**
`lib/validation.ts`, `lib/store.ts`, `POST /api/invoices`, `/new` form → redirect `/invoice/[id]` with QR + copy buttons.
✅ Done when: the invoice string from the app can be pasted into Polar (bob → Pay Invoice) and decodes correctly.

**M4 — Verify payment (≈1 h)**
`GET /api/invoices/[id]/status` calls LND lookup, maps state (`lib/status.ts`), updates store. `PaymentStatus` polls every 2.5 s, stops on final state.
✅ Done when: paying from bob in Polar turns the page to **Paid ✓** within ~3 s, with no manual click in our app.

**M5 — Pay page, receipt, dashboard (≈1.5 h)**
`/pay/[id]`, `/receipt/[id]` (print CSS), `/dashboard` with totals.
✅ Done when: full flow works across pages; receipt refuses to render for unpaid invoices.

**M6 — LND tutorial evidence (≈30 min)**
`scripts/lncli-demo.sh` and `scripts/pay-invoice.sh` using `docker exec <polar-container> lncli --network regtest ...`. **Ask Ibrahim for the container names** (`docker ps` — Polar names look like `polar-n1-alice`), or run `docker ps` yourself if possible. Add `/how-it-works` page mapping features to the 4 tutorial stages.
✅ Done when: `./scripts/pay-invoice.sh <bolt11>` pays an app invoice from the terminal and the app shows Paid.

**M7 — Polish & submission (≈1 h)**
Responsive pass, empty/error states, README (Section 11), `docs/DEMO-SCRIPT.md`, screenshots, record backup video reminder.
✅ Done when: Section 10 acceptance test passes twice in a row.

**M8 — Stretch** (ask first): Wavelength mode, SSE, USD label, etc.

If a milestone takes >1.5× its estimate, stop and tell Ibrahim with options (cut scope / plan B).

---

## 10. Acceptance test (run before calling it done)

1. Polar network running; home page shows node connected.
2. Create invoice: "Hans", "Logo design", 5000 sats.
3. Open share link in a second browser/incognito (`/pay/[id]`) — shows details + QR + Waiting.
4. Pay from bob (Polar UI **and** separately `scripts/pay-invoice.sh`) on two invoices.
5. Both freelancer page and pay page switch to **Paid ✓** automatically.
6. Receipt shows correct amount, settle time, payment hash.
7. Dashboard totals update.
8. Invalid input (0, negative, letters, 100M) is rejected with a friendly message **server-side too**.
9. Stop Polar → app shows a friendly "node offline" message, no crash, no stack trace.
10. `git grep -i macaroon` shows no secrets committed; `.env.local` and `data/*.json` are gitignored.
11. `npm run build` passes with no type errors.

---

## 11. README must include
- One-line pitch + the Amina/Hans scenario.
- Screenshots / GIF.
- **"How we used LND"** table (Section 3 mapping) with real `lncli` commands.
- Architecture diagram (Section 5).
- Setup: Docker + Polar steps, `.env.local`, `npm install`, `npm run dev`.
- Known limitations: regtest/local only; single-freelancer node; JSON file storage; Wavelength mode (if built) is alpha + signet.
- Next steps: mainnet with the freelancer's own node (or Wavelength mainnet when available), multi-user, stablecoin invoices via Taproot Assets, PDF receipts.
- Team & hackathon track.

---

## 12. Security & honesty rules (non-negotiable)
- Macaroon and TLS cert are **server-only**. Never send them to the client, never log them, never commit them.
- **Paid status only comes from LND** (or the Wavelength activity stream in that mode). No "Mark as paid" button anywhere.
- Validate all input with zod on the server.
- Regtest/signet only. Never mainnet keys or real funds.
- Label anything simulated or approximate (e.g. USD rate).
- Don't swallow errors silently; show friendly messages, log technical details server-side.

---

## 13. Known gotchas
- **"self signed certificate" / ECONNREFUSED:** wrong REST port, Polar not started, or cert not passed as `ca`. Check Polar's Connect tab again.
- **TLS hostname mismatch:** use `localhost` instead of `127.0.0.1` (or vice versa), or set `servername`.
- **bob can't pay:** no channel, channel not confirmed (mine blocks), or not enough outbound liquidity on bob's side. Open the channel **from bob to alice**.
- **Windows paths in `.env.local`:** use forward slashes or the BASE64/HEX alternatives.
- **Next.js caching:** status routes must be dynamic (`export const dynamic = 'force-dynamic'`) and fetched with `cache: 'no-store'`.
- **`r_hash` encoding:** REST returns base64; v1 lookup path needs hex.
- **Expiry:** an `OPEN` invoice past `creation_date + expiry` is expired — show Expired.
- **Wavelength (stretch):** COOP/COEP headers block third-party fonts/scripts on those routes; `wallet_locked` = wallet open in another tab.

---

## 14. Useful links
- LND tutorial: https://dev.lightning.community/tutorial/
- LND REST endpoints: https://lightning.engineering/api-docs/api/lnd/rest-endpoints/
- AddInvoice: https://lightning.engineering/api-docs/api/lnd/lightning/add-invoice/
- LookupInvoice: https://lightning.engineering/api-docs/api/lnd/lightning/lookup-invoice
- SubscribeInvoices: https://lightning.engineering/api-docs/api/lnd/lightning/subscribe-invoices/
- Polar: https://github.com/jamaljsr/polar
- Wavelength launch post: https://lightning.engineering/posts/2026-07-21-wavelength-launch/
- Wavelength docs: https://wavelength.lightning.engineering/ (index: /llms.txt)
- Hackathon registration form: https://docs.google.com/forms/d/e/1FAIpQLSc9Pes0fY-MbKivzFgmJU5qIdM1FEl9QGgMuoXjwyP-oLSrOg/viewform
