/**
 * Browser-wallet invoices have no server copy, so the client's pay link carries the invoice
 * itself in the URL *fragment* (#...). Fragments are never sent to the server.
 */
export interface SharedInvoice {
  v: 1;
  i: string; // BOLT11
  a: number; // amount (sats)
  d: string; // description
  c: string; // client name
  f: string; // freelancer name
}

const toB64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromB64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
};

export const encodeShared = (inv: SharedInvoice) => toB64Url(JSON.stringify(inv));

export function decodeShared(fragment: string): SharedInvoice | null {
  try {
    const data = JSON.parse(fromB64Url(fragment.replace(/^#/, '')));
    if (data?.v !== 1 || typeof data.i !== 'string' || !/^ln/i.test(data.i) || typeof data.a !== 'number') return null;
    return {
      v: 1,
      i: data.i,
      a: data.a,
      d: String(data.d ?? ''),
      c: String(data.c ?? ''),
      f: String(data.f ?? ''),
    };
  } catch {
    return null;
  }
}
