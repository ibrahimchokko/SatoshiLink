export const metadata = { title: 'How it works — SatoshiLink' };

const GLOSSARY: [string, string][] = [
  ['Lightning Network', 'A payment layer on top of Bitcoin for instant, near-free payments — like a tab between friends that settles to the bank later.'],
  ['Invoice (BOLT11)', 'A one-time payment request string starting with "lnbc…" that says who to pay and how much. Like a bill with a barcode.'],
  ['LND', 'Lightning Network Daemon — the node software that holds the freelancer’s funds and creates/verifies invoices.'],
  ['Macaroon', 'A password-like token file with permissions baked in. Our server uses it to talk to LND; it never reaches the browser.'],
  ['Regtest', 'A private Bitcoin test network on a laptop. Blocks are mined on demand and coins are worthless — perfect for demos.'],
  ['Channel', 'A pre-funded payment pipe between two nodes. Open it once, then pay instantly many times.'],
  ['Preimage / payment hash', 'The payer gets a secret (preimage) only when payment completes; its hash is printed on the receipt as proof.'],
];

const STAGES = [
  {
    stage: '1. Local cluster + lncli',
    how: 'Polar runs a regtest network: bitcoind + LND “alice” (freelancer) + LND “bob” (client) with a bob → alice channel. scripts/lncli-demo.sh runs getinfo, addinvoice, lookupinvoice and payinvoice via lncli.',
  },
  { stage: '2. Web client / GUI', how: 'Polar’s UI is our node GUI: mining blocks, opening channels, and paying invoices from bob.' },
  {
    stage: '3. RPC client',
    how: 'lib/lnd.ts talks to LND’s REST API over HTTPS, trusting the node’s TLS cert and authenticating with the admin macaroon — server-side only.',
  },
  {
    stage: '4. Webapp integration',
    how: 'The whole app: AddInvoice → share link + QR → client pays → we poll LookupInvoice until state = SETTLED → receipt.',
  },
];

export default function HowItWorks() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">How SatoshiLink works</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Amina, a designer in Kaduna, finishes a logo for Hans in Germany. She creates a SatoshiLink invoice for 5,000 sats and
          sends Hans the link. Hans scans the QR and pays in seconds. Amina’s dashboard turns green — “Paid ✓”.
        </p>
      </div>

      <section className="card p-6">
        <h2 className="font-semibold text-slate-900">The flow</h2>
        <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
          {[
            ['Freelancer fills the form', '/new'],
            ['Server calls LND AddInvoice', 'POST /v1/invoices'],
            ['Client opens link, scans QR', '/pay/[id]'],
            ['Server asks LND for the state', 'GET /v1/invoice/{hash}'],
            ['SETTLED → Paid ✓ + receipt', '/receipt/[id]'],
          ].map(([t, c], i) => (
            <li key={t} className="rounded-xl bg-slate-50 p-3">
              <span className="text-xs font-bold text-btc-dark">Step {i + 1}</span>
              <p className="mt-1 font-medium text-slate-800">{t}</p>
              <code className="mt-1 block text-xs text-slate-500">{c}</code>
            </li>
          ))}
        </ol>
        <pre className="mt-6 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{`Browser ──► Next.js API routes (server only) ──HTTPS + macaroon──► LND "alice"
                                                                     ▲
                                                          channel    │
                                                                     ▼
                                     client wallet / LND "bob" ──pays──┘
            (all on a Polar regtest network: bitcoind + alice + bob)`}</pre>
        <p className="mt-4 text-sm text-slate-600">
          <strong>Paid status only ever comes from the Lightning node.</strong> There is no “mark as paid” button anywhere.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Mapping to the LND developer tutorial</h2>
        <div className="card divide-y divide-slate-100">
          {STAGES.map((s) => (
            <div key={s.stage} className="grid gap-1 p-4 sm:grid-cols-3">
              <p className="font-medium text-slate-900">{s.stage}</p>
              <p className="text-sm text-slate-600 sm:col-span-2">{s.how}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Beginner glossary</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {GLOSSARY.map(([t, d]) => (
            <div key={t} className="card p-4">
              <dt className="font-medium text-slate-900">{t}</dt>
              <dd className="mt-1 text-sm text-slate-600">{d}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
