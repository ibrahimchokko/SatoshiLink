'use client';

import { useState } from 'react';

export function CopyButton({ value, label, className = 'btn-secondary' }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for non-secure contexts (e.g. LAN IP over http)
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? 'Copied ✓' : label}
    </button>
  );
}
