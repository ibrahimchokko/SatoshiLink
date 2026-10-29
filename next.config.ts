import type { NextConfig } from 'next';

// Wavelength's WASM wallet needs SharedArrayBuffer, which browsers only allow on
// cross-origin-isolated pages. Scope the headers to the wallet routes so the rest
// of the app is unaffected.
const crossOriginIsolation = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/wallet', headers: crossOriginIsolation },
      { source: '/wallet/:path*', headers: crossOriginIsolation },
      {
        // Runtime files are versioned by path, so they can be cached forever.
        source: '/wavewalletdk/:path*',
        // The worker script must be isolated too, or Chrome refuses to start it from an isolated page.
        headers: [...crossOriginIsolation, { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
