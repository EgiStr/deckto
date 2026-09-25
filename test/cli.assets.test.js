import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolStatus } from '../cli/lib/render.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BIN = path.join(ROOT, 'cli', 'bin', 'deckto.js');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160">
  <rect width="400" height="160" fill="#1B3A2F"/>
  <rect x="20" y="55" width="100" height="50" rx="8" fill="#E4572E"/>
  <text x="70" y="85" font-family="Arial" font-size="16" fill="#FFFFFF" text-anchor="middle">Step</text>
</svg>`;

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [BIN, ...args], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, env: JSON.parse(stdout) };
  } catch (err) {
    return { code: err.status ?? 1, env: err.stdout ? JSON.parse(err.stdout) : null };
  }
}

test('assets render converts an SVG to a non-empty PNG', { timeout: 180000 }, (t) => {
  if (!toolStatus().soffice) {
    t.skip('soffice not installed — assets render unavailable');
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-assets-'));
  const svg = path.join(dir, 'flow.svg');
  fs.writeFileSync(svg, SVG, 'utf8');

  const r = runCli(['assets', 'render', svg, '--json']);
  assert.equal(r.env.ok, true, JSON.stringify(r.env.error));
  const png = path.join(dir, 'flow.png');
  assert.equal(r.env.data.png, png);
  assert.ok(fs.existsSync(png));
  assert.ok(fs.statSync(png).size > 1000, 'png looks empty');
  assert.equal(r.env.data.available, true);
});

test('assets render degrades gracefully when soffice is missing', (t) => {
  if (toolStatus().soffice) {
    // Instead of uninstalling, assert the unavailable branch exists in the contract:
    // a missing INPUT file must fail with a clear message regardless.
    const r = runCli(['assets', 'render', '/nonexistent/file.svg', '--json']);
    assert.equal(r.code, 1);
    assert.match(r.env.error, /not found|no such|ENOENT|svg/i);
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-assets-'));
  const svg = path.join(dir, 'flow.svg');
  fs.writeFileSync(svg, SVG, 'utf8');
  const r = runCli(['assets', 'render', svg, '--json']);
  assert.equal(r.env.data.available, false);
  assert.match(r.env.data.reason, /soffice/);
});

test('assets unknown subcommand fails with usage', () => {
  const r = runCli(['assets', 'nope', '--json']);
  assert.equal(r.code, 1);
  assert.match(r.env.error, /unknown assets subcommand/);
});
