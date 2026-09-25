// Render QA: pptx -> pdf -> per-slide jpg via soffice + pdftoppm.
// Degrades to { available: false } when tools are missing — static QA stays the gate.
//
// Tool discovery: PATH first, then well-known install locations (LibreOffice and
// Poppler winget installs frequently do not land on a fresh shell's PATH).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CANDIDATES = {
  soffice: [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
  ],
  pdftoppm: [
    '/usr/bin/pdftoppm',
    '/usr/local/bin/pdftoppm',
    '/opt/homebrew/bin/pdftoppm',
  ],
};

function whichOnPath(tool) {
  try {
    execFileSync(tool, ['--version'], { stdio: 'ignore', timeout: 15000 });
    return tool;
  } catch {
    try {
      const finder = process.platform === 'win32' ? 'where' : 'which';
      const out = execFileSync(finder, [tool], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const first = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
      return first || null;
    } catch {
      return null;
    }
  }
}

// Glob-ish search for winget-installed Poppler (version-stamped dir, so not fixed).
function findPopplerInWinget() {
  const root = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
  if (!fs.existsSync(root)) return null;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.name.toLowerCase() === 'pdftoppm.exe') {
        return full;
      }
    }
  }
  return null;
}

export function resolveTool(tool) {
  const onPath = whichOnPath(tool);
  if (onPath) return onPath;
  for (const c of CANDIDATES[tool] ?? []) {
    if (fs.existsSync(c)) return c;
  }
  if (tool === 'pdftoppm' && process.platform === 'win32') {
    return findPopplerInWinget();
  }
  return null;
}

export function toolStatus() {
  const soffice = resolveTool('soffice');
  const pdftoppm = resolveTool('pdftoppm');
  return { soffice, pdftoppm, available: Boolean(soffice && pdftoppm) };
}

// Concurrent soffice invocations collide on LibreOffice's shared user profile
// (seen as flaky conversions under `npm test`). Each call gets a private profile.
export function withPrivateProfile(fn) {
  const profile = path.join(os.tmpdir(), `deckto-lo-${crypto.randomUUID()}`);
  const args = [`-env:UserInstallation=${pathToFileURL(profile).href}`];
  try {
    return fn(args);
  } finally {
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
}

export function renderDeck(file, outDir) {
  const tools = toolStatus();
  if (!tools.soffice) {
    return { available: false, reason: 'soffice not found (install LibreOffice)', images: [], outDir, tools };
  }
  if (!tools.pdftoppm) {
    return { available: false, reason: 'pdftoppm not found (install Poppler)', images: [], outDir, tools };
  }

  fs.mkdirSync(outDir, { recursive: true });
  const abs = path.resolve(file);
  const tmpPdf = path.join(outDir, path.basename(abs, '.pptx') + '.pdf');

  withPrivateProfile((profileArgs) => {
    execFileSync(tools.soffice, [...profileArgs, '--headless', '--convert-to', 'pdf', '--outdir', outDir, abs], {
      stdio: 'ignore',
      timeout: 180000,
    });
  });

  execFileSync(tools.pdftoppm, ['-jpeg', '-r', '150', tmpPdf, path.join(outDir, 'slide')], {
    stdio: 'ignore',
    timeout: 120000,
  });

  const images = fs
    .readdirSync(outDir)
    .filter((f) => /^slide.*\.jpe?g$/.test(f))
    .sort()
    .map((f) => path.join(outDir, f));

  return { available: true, reason: null, images, outDir, pdf: tmpPdf, tools };
}
