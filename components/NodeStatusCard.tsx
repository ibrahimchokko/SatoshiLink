import { fetchNodeInfo } from '@/lib/service';

/** Server component: proves the live LND connection (GET /v1/getinfo). */
export async function NodeStatusCard() {
  const result = await fetchNodeInfo();

  if (!result.ok && result.kind === 'not_configured') {
    // e.g. the hosted (Vercel) deployment, which can't reach a laptop's Polar node
    return (
      <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">No LND node connected to this deployment</p>
          <p className="mt-0.5 text-sm text-slate-500">
            The LND mode runs on the team’s laptop (Polar, regtest). Online, try Browser wallet mode — a self-custodial
            Lightning wallet in your browser (Wavelength, signet).
          </p>
        </div>
        <a href="/wallet" className="btn-primary shrink-0">
          Open browser wallet
        </a>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="card flex items-start gap-3 p-5">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
        <div>
          <p className="font-semibold text-slate-900">Lightning node offline</p>
          <p className="mt-0.5 text-sm text-slate-500">{result.error}</p>
        </div>
      </div>
    );
  }

  const { node } = result;
  const rows: [string, string][] = [
    ['Network', node.network],
    ['Synced to chain', node.synced ? 'Yes' : 'No'],
    ['Active channels', String(node.activeChannels)],
    ['Block height', node.blockHeight.toLocaleString('en-US')],
    ['Node pubkey', `${node.pubkey.slice(0, 12)}…`],
    ['LND version', node.version.split(' ')[0]],
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${node.synced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <p className="font-semibold text-slate-900">
          Connected to {node.alias} ({node.network})
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className="font-medium break-all text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
