import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../cli/bin/deckto.js', import.meta.url));

function run(args, cwd) {
  try {
    const stdout = execFileSync(process.execPath, [BIN, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

test('deckto init <slug> scaffolds the deck workspace with artifact templates', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-init-'));
  const res = run(['init', 'my-idea'], tmp);
  assert.equal(res.code, 0, `init failed: ${res.stderr}`);
  const deckDir = path.join(tmp, 'deck', 'my-idea');
  for (const f of ['pitch.md', 'storyline.md', 'design-spec.md', 'usecase-flow.md']) {
    assert.ok(fs.existsSync(path.join(deckDir, f)), `missing ${f}`);
  }
  assert.ok(fs.existsSync(path.join(deckDir, 'assets')), 'missing assets/');
});

test('deckto init emits the JSON envelope when --json is passed', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-init-json-'));
  const res = run(['init', 'x-slug', '--json'], tmp);
  assert.equal(res.code, 0);
  const env = JSON.parse(res.stdout);
  assert.equal(env.ok, true);
  assert.equal(env.command, 'init');
  assert.ok(typeof env.version === 'string' && env.version.length > 0);
  assert.ok(env.data && typeof env.data === 'object');
  assert.equal(env.error, null);
});

test('deckto init rejects a bad slug', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-init-bad-'));
  const res = run(['init', 'Bad Slug/!'], tmp);
  assert.notEqual(res.code, 0);
});

test('deckto doctor reports tool availability and deck config', () => {
  const res = run(['doctor', '--json']);
  assert.equal(res.code, 0, `doctor failed: ${res.stderr}`);
  const env = JSON.parse(res.stdout);
  assert.equal(env.ok, true);
  assert.equal(env.command, 'doctor');
  assert.equal(typeof env.data.nodeOk, 'boolean');
  assert.equal(typeof env.data.soffice, 'boolean');
  assert.equal(typeof env.data.pdftoppm, 'boolean');
  assert.ok(env.data.config, 'config not loaded');
  assert.equal(typeof env.data.config.fonts.minBodyPt, 'number');
  assert.equal(typeof env.data.config.review.maxAutoIterations, 'number');
});

test('envelope contract: every command --json response has {ok,command,version,data,error}', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-contract-'));
  for (const args of [['doctor', '--json'], ['init', 'c-slug', '--json']]) {
    const res = run(args, tmp);
    const env = JSON.parse(res.stdout);
    for (const key of ['ok', 'command', 'version', 'data', 'error']) {
      assert.ok(key in env, `missing envelope key ${key} for ${args[0]}`);
    }
  }
});
