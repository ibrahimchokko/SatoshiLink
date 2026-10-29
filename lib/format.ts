export const formatSats = (n: number) => `${n.toLocaleString('en-US')} sats`;

export const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const shortHash = (hex: string, n = 8) => (hex.length > n * 2 ? `${hex.slice(0, n)}…${hex.slice(-n)}` : hex);

export const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
