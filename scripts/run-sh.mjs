// Runs a scripts/*.sh file with Git Bash on Windows (bash usually isn't on PowerShell's PATH),
// or plain bash elsewhere. Usage: node scripts/run-sh.mjs <script.sh> [args...]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [script, ...args] = process.argv.slice(2);
const dir = path.dirname(fileURLToPath(import.meta.url));

const candidates =
  process.platform === 'win32'
    ? [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Git', 'bin', 'bash.exe'),
      ]
    : [];
const bash = candidates.find((p) => existsSync(p)) ?? 'bash';

const res = spawnSync(bash, [path.join(dir, script), ...args], { stdio: 'inherit' });
if (res.error) console.error(`Could not start bash (${bash}): ${res.error.message}. Install Git for Windows.`);
process.exit(res.status ?? 1);
