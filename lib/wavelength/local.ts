'use client';

import type { Invoice } from '@/lib/types';

/**
 * Browser-wallet invoices live in this browser's localStorage, next to the wallet itself
 * (Vercel has no writable disk, and only this browser can see the wallet's payments anyway).
 */
export interface WalletInvoice extends Invoice {
  backend: 'wavelength';
  entryId: string; // Wavelength activity entry id for this receive
}

const KEY = 'satoshilink.wavelength.invoices.v1';
const EVENT = 'satoshilink:wallet-invoices';

export function loadWalletInvoices(): WalletInvoice[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WalletInvoice[]) : [];
  } catch {
    return [];
  }
}

function save(all: WalletInvoice[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage full or blocked — the invoice still works for this session
  }
  window.dispatchEvent(new Event(EVENT));
}

export function addWalletInvoice(inv: WalletInvoice) {
  save([inv, ...loadWalletInvoices()]);
}

export function updateWalletInvoice(id: string, patch: Partial<WalletInvoice>) {
  const all = loadWalletInvoices();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) return;
  const next = { ...all[idx], ...patch };
  if ((Object.keys(patch) as (keyof WalletInvoice)[]).every((k) => all[idx][k] === next[k])) return;
  all[idx] = next;
  save(all);
}

export function onWalletInvoicesChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
