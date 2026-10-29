# SatoshiLink — Decisions

Recorded at kickoff (M0), 28 Oct 2026.

| # | Question | Answer | Status |
|---|---|---|---|
| 1 | Hackathon LND criteria | "Use LND" — no gRPC or specific-network requirement. **REST API** used (CLAUDE.md §5.2 default). | answered |
| 2 | Team | 2–4 people; **only Ibrahim writes code**. Teammate names/roles to be added to the README later. | answered (names TBD) |
| 3 | Machine | Windows 11 Home, ~8 GB RAM, git 2.55. **Node.js and Docker not installed** → install in M1. | checked |
| 4 | Payment backends | **LND (Polar, regtest) + Wavelength (signet)**. LND first; Wavelength starts only after the §10 acceptance test passes. | answered |
| 5 | Demo format | **Both**: localhost live demo (LND, fully real) + a public link. | answered |
| 6 | Submission | GitHub repo, demo video, slides, deployed link. Deadline time: **assumed end of day 29 Oct 2026 (WAT)** — confirm. | partly assumed |

## Consequences
- **Deployed link:** LND on Polar can't be reached from Vercel. Plan: deploy the app to Vercel with Wavelength mode as the online demo; during live judging, optionally expose localhost with `cloudflared tunnel --url http://localhost:3000` to show LND mode.
- **8 GB RAM:** Polar with bitcoind + 2 LND nodes is fine; close heavy apps when demoing.
- **Folder path:** the project lives in the folder VS Code has open: `C:/Users/Zamson/Desktop/<non-breaking space>/SatoshiLink` (Ibrahim's choice). Build and run were verified there. If a Windows tool ever fails on that path, a backup copy is at `C:/Users/Zamson/Desktop/SatoshiLink`.

## Update — 28 Oct 2026: Wavelength mode
- **Ibrahim chose (b): Wavelength "Browser wallet" mode on Vercel** as the deployed link, built *before* the LND acceptance test (explicit override of CLAUDE.md §7's "only after"). LND mode stays the main live demo.
- SDK pinned at **@lightninglabs/wavelength-web / -react 0.2.0** (latest stable). Runtime (`Wavewalletdk.wasm.tar.gz`, ~42 MB, official GitHub release) is downloaded and SHA-256-verified by `scripts/fetch-wavelength-runtime.mjs` before every `dev`/`build`; gitignored. On Vercel the 133 MB uncompressed `.wasm` is skipped (browsers load the 20 MB `.gz`).
- Browser-wallet invoices are stored in the freelancer's browser (localStorage), since Vercel has no writable disk. The client's pay link (`/w/pay#…`) carries the invoice in the URL fragment (never sent to a server).
- Ibrahim has **no signet coins yet**.
- **Known blocker (28 Oct, 20:40 WAT):** the public signet operator rejects invoice creation with `ARK_VERSION_MISMATCH` ("operator selected ark version 0, runtime bound to 1"). Same result on SDK 0.1.2, so it's server-side. Wallet boot/create/unlock all work.
