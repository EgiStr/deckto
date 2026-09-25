import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BIN = path.join(ROOT, 'cli', 'bin', 'deckto.js');

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

test('theme contrast returns a passing pair', () => {
  const r = runCli(['theme', 'contrast', '#000000', '#FFFFFF', '--json']);
  assert.equal(r.code, 0);
  assert.equal(r.env.data.pass, true);
  assert.equal(r.env.data.ratio, 21);
});

test('theme contrast exits non-zero on a failing pair', () => {
  const r = runCli(['theme', 'contrast', '#999999', '#AAAAAA', '--json']);
  assert.equal(r.code, 1);
  assert.equal(r.env.data.pass, false);
});

test('theme adjust auto-fixes a failing pair', () => {
  const r = runCli(['theme', 'adjust', '#999999', '#FFFFFF', '--json']);
  assert.equal(r.env.data.pass, true);
  assert.notEqual(r.env.data.hex, '#999999');
});

test('theme dominance reports findings for a bad palette', () => {
  const r = runCli(['theme', 'dominance', '{"dominant":34,"secondary":33,"accent":33}', '--json']);
  assert.equal(r.env.data.pass, false);
  assert.ok(r.env.data.errors.some((e) => e.code === 'PALETTE_DOMINANCE'));
});

test('theme ramp outputs 9 in-gamut stops', () => {
  const r = runCli(['theme', 'ramp', '250', '0.16', '--json']);
  assert.equal(r.env.data.stops.length, 9);
  assert.ok(r.env.data.stops.every((s) => s.inGamut));
});

test('theme unknown subcommand fails with usage', () => {
  const r = runCli(['theme', 'nope', '--json']);
  assert.equal(r.code, 1);
  assert.match(r.env.error, /unknown theme subcommand/);
});
