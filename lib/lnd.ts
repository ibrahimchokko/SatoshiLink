import 'server-only';
import https from 'node:https';
import fs from 'node:fs';

/**
 * Minimal LND REST client (no extra deps).
 * Auth: admin macaroon (hex) in the `Grpc-Metadata-macaroon` header.
 * Transport: HTTPS, trusting the node's self-signed TLS cert via `ca`.
 * Config is loaded lazily so the app builds and runs (with friendly errors) without LND.
 */

export type LndErrorKind = 'not_configured' | 'offline' | 'lnd';

export class LndError extends Error {
  constructor(
    public kind: LndErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'LndError';
  }
}

interface LndConfig {
  host: URL;
  cert: Buffer;
  macaroonHex: string;
  servername: string;
}

let cached: LndConfig | null = null;

function getConfig(): LndConfig {
  if (cached) return cached;
  const env = process.env;
  if (!env.LND_REST_HOST) throw new LndError('not_configured', 'LND_REST_HOST is not set');

  let host: URL;
  try {
    host = new URL(env.LND_REST_HOST);
  } catch {
    throw new LndError('not_configured', `LND_REST_HOST is not a valid URL: ${env.LND_REST_HOST}`);
  }

  let cert: Buffer;
  let macaroonHex: string;
  try {
    if (env.LND_TLS_CERT_BASE64) cert = Buffer.from(env.LND_TLS_CERT_BASE64, 'base64');
    else if (env.LND_TLS_CERT_PATH) cert = fs.readFileSync(env.LND_TLS_CERT_PATH);
    else throw new LndError('not_configured', 'Set LND_TLS_CERT_PATH or LND_TLS_CERT_BASE64');

    if (env.LND_MACAROON_HEX) macaroonHex = env.LND_MACAROON_HEX.trim();
    else if (env.LND_MACAROON_PATH) macaroonHex = fs.readFileSync(env.LND_MACAROON_PATH).toString('hex');
    else throw new LndError('not_configured', 'Set LND_MACAROON_PATH or LND_MACAROON_HEX');
  } catch (e) {
    if (e instanceof LndError) throw e;
    throw new LndError('not_configured', `Could not read LND credential file: ${(e as Error).message}`);
  }

  cached = { host, cert, macaroonHex, servername: env.LND_TLS_SERVERNAME || 'localhost' };
  return cached;
}

function lnd<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const cfg = getConfig();
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: cfg.host.hostname,
        port: cfg.host.port || 443,
        path,
        method,
        ca: cfg.cert,
        servername: cfg.servername,
        timeout: 5000,
        headers: {
          'Grpc-Metadata-macaroon': cfg.macaroonHex,
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json: Record<string, unknown> = {};
          try {
            json = data ? JSON.parse(data) : {};
          } catch {
            return reject(new LndError('lnd', `LND returned non-JSON (HTTP ${res.statusCode})`, res.statusCode));
          }
          const code = res.statusCode ?? 500;
          if (code >= 400) {
            const msg = (json.message as string) ?? (json.error as string) ?? `LND HTTP ${code}`;
            return reject(new LndError('lnd', msg, code));
          }
          resolve(json as T);
        });
      },
    );
    req.on('timeout', () => req.destroy(Object.assign(new Error('LND request timed out'), { code: 'ETIMEDOUT' })));
    // Network/TLS-level failures (ECONNREFUSED, timeout, cert mismatch…) all mean "can't reach the node".
    req.on('error', (e: NodeJS.ErrnoException) => {
      reject(new LndError('offline', `${e.code ?? 'ERR'}: ${e.message}`));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

// ---- Raw LND REST shapes (int64 fields come back as strings) ----

export interface LndGetInfo {
  alias: string;
  identity_pubkey: string;
  version: string;
  synced_to_chain: boolean;
  num_active_channels?: number;
  block_height?: number;
  chains?: { chain: string; network: string }[];
}

export interface LndAddInvoiceResponse {
  r_hash: string; // base64
  payment_request: string;
  add_index?: string;
}

export interface LndInvoice {
  memo?: string;
  r_hash?: string;
  value?: string;
  state?: 'OPEN' | 'SETTLED' | 'CANCELED' | 'ACCEPTED';
  creation_date?: string;
  settle_date?: string;
  expiry?: string;
  amt_paid_sat?: string;
  payment_request?: string;
}

export const getInfo = () => lnd<LndGetInfo>('GET', '/v1/getinfo');

export const addInvoice = (sats: number, memo: string, expirySec = 3600) =>
  lnd<LndAddInvoiceResponse>('POST', '/v1/invoices', {
    value: String(sats),
    memo,
    expiry: String(expirySec),
  });

export const lookupInvoice = (rHashHex: string) => {
  if (!/^[0-9a-f]{64}$/i.test(rHashHex)) throw new LndError('lnd', 'Invalid payment hash');
  return lnd<LndInvoice>('GET', `/v1/invoice/${rHashHex}`);
};

export const b64ToHex = (b64: string) => Buffer.from(b64, 'base64').toString('hex');

/** Friendly, non-technical message for the UI. Technical details stay in server logs. */
export function friendlyLndError(e: unknown): { message: string; kind: LndErrorKind | 'unknown' } {
  if (e instanceof LndError) {
    if (e.kind === 'not_configured')
      return { kind: e.kind, message: 'Lightning node is not configured yet. Fill in .env.local (see docs/LND-SETUP.md).' };
    if (e.kind === 'offline')
      return { kind: e.kind, message: "Couldn't reach your Lightning node — is Polar running?" };
    return { kind: e.kind, message: 'The Lightning node rejected the request. Check the server logs for details.' };
  }
  return { kind: 'unknown', message: 'Something went wrong talking to the Lightning node.' };
}
