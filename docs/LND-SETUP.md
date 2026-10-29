# LND setup with Polar (beginner guide, Windows)

**What we're building:** a private, fake-money Bitcoin + Lightning network on your laptop.

- **Regtest** = "regression test" Bitcoin. A private blockchain where *you* mine blocks on demand and coins are worthless. Like a Monopoly bank in your living room.
- **LND** = Lightning Network Daemon, the Lightning node software. Each node is like a bank account that can send instant payments.
- **Channel** = a pre-funded payment pipe between two nodes. Like a bar tab: open it once, then pay instantly many times.
- **Polar** = a desktop app that runs all of this in Docker containers and gives you buttons for it.

Our network: **alice** = the freelancer (our app talks to her node), **bob** = the client who pays.

---

## 1. Install the tools (one-time)

1. **Node.js 22 LTS** — https://nodejs.org → "LTS" Windows installer → Next through it (defaults are fine).
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop/ → Windows installer.
   - Keep "Use WSL 2" ticked. If it asks to install/update WSL, say yes and **restart the PC**.
   - Open Docker Desktop once and wait until the bottom-left says **Engine running** (green).
3. **Polar** — https://github.com/jamaljsr/polar/releases → latest release → download the `.exe` (Windows) → install.
4. Close and reopen VS Code so it sees the new `node` and `docker` commands.
5. **Allow npm in PowerShell** (Windows blocks it by default with "running scripts is disabled on this system"). Run this once in a PowerShell terminal:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
   Type `Y` if asked. This only allows locally created scripts and signed downloaded ones, for your user account.

Check in a new terminal:
```
node -v      # v22.x or higher
docker --version
```

## 2. Create the network in Polar

1. Open Polar → **Create a Lightning Network** (or "+ Create Network").
2. Name: `satoshilink`. Set **LND: 2**, Core Lightning: 0, Eclair: 0, **Bitcoin Core: 1**. Click **Create Network**.
3. Rename the nodes: click the first LND node → in the right panel, rename to **alice**; the second → **bob**. (If renaming isn't offered, keep the default names and tell Claude which is which.)
4. Click **Start** (top right). First start downloads Docker images — can take a few minutes. All nodes turn green.

## 3. Fund bob and open a channel bob → alice

1. Click **bob** → **Actions** tab → **Deposit** → `5,000,000` sats → Deposit. (Polar mines blocks to give bob coins.)
2. Still on bob → **Actions** → **Open Channel (outgoing)** → choose **alice** as the destination → capacity `1,000,000` sats → Open Channel.
3. Click the **Bitcoin Core** node → **Actions** → **Mine 6 blocks**. This confirms the channel.
4. You should see a line connecting bob and alice on the canvas.

Why bob → alice? Money in a channel starts on the opener's side. bob opened it, so bob can pay alice. Exactly what we want.

## 4. Test a payment in Polar

1. Click **alice** → **Actions** → **Create Invoice** → `1000` sats → copy the invoice (starts with `lnbcrt…`).
2. Click **bob** → **Actions** → **Pay Invoice** → paste → Pay.
3. ✅ Success message = your Lightning network works.

## 5. Give the app alice's connection details

Click **alice** → **Connect** tab. Choose the **REST** option and copy:

- **REST Host** (e.g. `https://127.0.0.1:8081`)
- **TLS Cert** — the file path (choose "File Paths")
- **Admin Macaroon** — the file path

> **Macaroon** = a password-like token file for the node, with permissions baked in. "Admin" can do everything, so it stays secret on the server. Like a hotel key card that only opens certain doors.
> **TLS cert** = the node's ID card so our app knows it's really talking to alice over an encrypted connection.

These go in `.env.local` (never committed).

## 6. Run the app

```bash
cp .env.example .env.local     # then paste the 3 values (forward slashes in paths!)
npm run dev                    # open http://localhost:3000 (for the live demo use: npm run demo)
```
> Changed `.env.local` or recreated the Polar network? Stop and restart the server — LND settings are read once at startup.
```bash
```
The home page should say **Connected to alice (regtest)**.

## 7. Terminal scripts (lncli)

```bash
docker ps --format '{{.Names}}'          # find container names, e.g. polar-n1-alice
npm run lncli-demo                  # getinfo / addinvoice / lookupinvoice / payinvoice
npm run pay -- <bolt11>        # pay an app invoice from bob
```
If your names differ, set `ALICE_CONTAINER` / `BOB_CONTAINER`:
- PowerShell: `$env:ALICE_CONTAINER="polar-n2-alice"; $env:BOB_CONTAINER="polar-n2-bob"; npm run lncli-demo`
- Git Bash: `ALICE_CONTAINER=polar-n2-alice BOB_CONTAINER=polar-n2-bob npm run lncli-demo`

(The scripts need Git Bash installed, which comes with Git for Windows; `npm run` calls it for you.)

## Troubleshooting
- **"Couldn't reach your Lightning node"**: Polar isn't started, or the REST port in `.env.local` is wrong.
- **TLS / certificate errors**: the paths must point at *alice's* files. Polar's cert is issued for `localhost`. The app sets that by default; override it with `LND_TLS_SERVERNAME` if needed.
- **bob can't pay**: there's no channel, or it isn't confirmed yet. Mine 6 blocks. The channel must go **from bob to alice**.
