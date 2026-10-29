# 3-minute demo script

**Before you start:** Polar network running (alice + bob, channel open). `npm run demo` running (production mode: faster, no dev error overlay). Two browser windows: a normal one (Amina) and an incognito one (Hans). A terminal open in the project folder.

| Time | Say | Do |
|---|---|---|
| 0:00 | "Freelancers in Nigeria wait days for international payments and lose up to 10% in fees. SatoshiLink lets them get paid in Bitcoin over Lightning in seconds." | Home page. |
| 0:20 | "Everything you'll see is verified by a real LND node. Here it is: alice, on regtest, synced, one channel." | Point at the node status card. |
| 0:35 | "Amina just finished a logo for Hans. She creates an invoice: 5,000 sats." | `/new` → Hans · Logo design · 5000 → Create. |
| 0:55 | "Her node created a real Lightning invoice. She sends Hans this link." | Show the QR, then click **Copy share link**. |
| 1:05 | "This is what Hans sees." | Paste the link in the incognito window. It shows **Waiting**. |
| 1:15 | "Hans pays from his wallet. Here, that's bob's node in Polar." | Polar → bob → Pay Invoice → paste the invoice → Pay. |
| 1:25 | "No button clicked in our app. The server asked LND, the invoice is SETTLED, so it shows Paid." | Both windows flip to **Paid ✓**. |
| 1:40 | "Both sides get a receipt with the payment hash, the cryptographic proof." | Open the receipt. Show Print. |
| 1:55 | "Same thing from the command line, the LND tutorial way." | New invoice → `npm run pay -- <bolt11>` → **Paid ✓**. |
| 2:20 | "Dashboard: totals received, what's outstanding." | `/dashboard`. |
| 2:35 | "How we used LND: local cluster with Polar and lncli, a GUI, an RPC client with macaroon and TLS, and a full web app integration." | `/how-it-works` page. |
| 2:50 | "Next: mainnet with your own node, multiple users, and stablecoin invoices via Taproot Assets. Thank you!" | |

**Backup:** record this flow as a video the night before, in case the live demo fails.
