# Deploying the online demo to Vercel (Browser wallet mode)

The Vercel deployment can't reach your laptop's Polar node, so online visitors use **Browser wallet mode**: a self-custodial Lightning wallet that runs inside the browser (Wavelength, on **signet**, Bitcoin's public test network). The home page detects that no LND node is configured and points visitors to `/wallet`.

## Steps

1. Push the repo to GitHub (Claude can do this when you're ready — ask).
2. Go to https://vercel.com → **Add New… → Project** → import the GitHub repo.
3. Framework preset: **Next.js** (auto-detected). Leave build settings as they are: `npm run build` runs `prebuild`, which downloads and verifies the wallet runtime.
4. **Environment variables** (Settings → Environment Variables):
   - `NEXT_PUBLIC_FREELANCER_NAME` = `Amina` (or your name)
   - Do **not** add any `LND_*` variables.
5. Click **Deploy**. Open `https://<your-app>.vercel.app/wallet`.

## Check it worked
```bash
curl -sI https://<your-app>.vercel.app/wallet | grep -i cross-origin
```
You should see `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.

## Things to know
- The wallet lives **in that browser only**. Clearing site data deletes it, so write down the 24-word recovery phrase.
- Only **one tab** can run the wallet at a time ("Wallet already open in another tab").
- Pay links (`/w/pay#…`) show the QR, but not live status. Only the freelancer's wallet tab sees the payment arrive.
- To *pay* a browser-wallet invoice you need a funded signet Lightning wallet, e.g. the hosted demo at https://wavelength.lightning.engineering/demo/, funded on-chain from a signet faucet.
