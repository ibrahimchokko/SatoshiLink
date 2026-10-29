// Downloads the Wavelength WebAssembly runtime that matches the installed SDK
// into public/wavewalletdk/<version>/, verifying every file against the
// SHA-256 digests pinned in @lightninglabs/wavelength-web. Skips the download
// when a verified copy is already present. Runs automatically before dev/build.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RUNTIME_ASSET_DIGESTS,
  RUNTIME_ASSET_FILES,
  RUNTIME_MANIFEST_VERSION,
} from '@lightninglabs/wavelength-web';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = RUNTIME_MANIFEST_VERSION;
const dest = path.join(root, 'public', 'wavewalletdk', version);
const workerSrc = path.join(root, 'node_modules', '@lightninglabs', 'wavelength-web', 'dist', 'wavewalletdk-worker.js');
const url = `https://github.com/lightninglabs/wavelength/releases/download/${version}/Wavewalletdk.wasm.tar.gz`;

// On Vercel, skip the 133 MB uncompressed wasm: the SDK loads wavewalletdk.wasm.gz first and only falls
// back to the raw file in browsers without DecompressionStream (all supported browsers have it).
const SKIP = new Set(process.env.VERCEL ? ['wavewalletdk.wasm'] : []);
const FILES = RUNTIME_ASSET_FILES.filter((f) => !SKIP.has(f));

const sri = (file) => `sha256-${createHash('sha256').update(fs.readFileSync(file)).digest('base64')}`;

function verify(dir) {
  const bad = [];
  for (const name of FILES) {
    const file = path.join(dir, name);
    const expected = RUNTIME_ASSET_DIGESTS[name];
    if (!fs.existsSync(file)) bad.push(`${name} (missing)`);
    else if (expected && sri(file) !== expected) bad.push(`${name} (digest mismatch)`);
  }
  return bad;
}

function copyWorker() {
  // Serve the SDK's worker next to the runtime so we don't depend on the bundler emitting it.
  fs.copyFileSync(workerSrc, path.join(dest, 'wavewalletdk-worker.js'));
}

if (fs.existsSync(dest) && verify(dest).length === 0) {
  copyWorker();
  console.log(`[wavelength] runtime ${version} already present and verified.`);
  process.exit(0);
}

console.log(`[wavelength] downloading runtime ${version} (~42 MB) from ${url}`);
const res = await fetch(url);
if (!res.ok) {
  console.error(`[wavelength] download failed: HTTP ${res.status}`);
  process.exit(1);
}

// Extract into a fresh, isolated temp folder; only verified files are copied into public/.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wavewalletdk-'));
try {
  const archive = path.join(tmp, 'runtime.tar.gz');
  fs.writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
  const out = path.join(tmp, 'out');
  fs.mkdirSync(out);
  // Run tar from inside the temp dir with relative paths: Windows' bsdtar would read "C:" as a remote host.
  execFileSync('tar', ['-xzf', 'runtime.tar.gz', '-C', 'out'], { cwd: tmp, stdio: 'inherit' });

  const bad = verify(out);
  if (bad.length) {
    console.error(`[wavelength] integrity check failed: ${bad.join(', ')}`);
    process.exit(1);
  }

  fs.mkdirSync(dest, { recursive: true });
  for (const name of FILES) fs.copyFileSync(path.join(out, name), path.join(dest, name));
  copyWorker();
  console.log(`[wavelength] runtime ${version} installed and verified → public/wavewalletdk/${version}/`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
