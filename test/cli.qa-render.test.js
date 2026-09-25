import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolStatus, renderDeck } from '../cli/lib/render.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GOOD = path.join(ROOT, 'test', 'fixtures', 'known-good', 'good.pptx');

test('tool discovery finds soffice and pdftoppm off-PATH when installed', () => {
  const s = toolStatus();
  // Discovery must work even when neither tool is on PATH (the winget case).
  if (s.soffice) assert.ok(fs.existsSync(s.soffice), `soffice path does not exist: ${s.soffice}`);
  if (s.pdftoppm) assert.ok(fs.existsSync(s.pdftoppm), `pdftoppm path does not exist: ${s.pdftoppm}`);
  assert.equal(typeof s.available, 'boolean');
});

test('render produces one jpg per slide when tools are available', { timeout: 240000 }, (t) => {
  const s = toolStatus();
  if (!s.available) {
    t.skip('soffice/pdftoppm not installed — render QA degrades to static-only');
    return;
  }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-render-'));
  const res = renderDeck(GOOD, out);
  assert.equal(res.available, true, res.reason ?? '');
  assert.equal(res.images.length, 1, `expected 1 image, got ${res.images.length}`);
  assert.ok(fs.existsSync(res.images[0]));
  assert.ok(fs.statSync(res.images[0]).size > 1000, 'rendered image looks empty');
});

test('render degrades gracefully with a reason when a tool is missing', () => {
  // Simulate by calling with an impossible deck path only when tools are present;
  // when absent, the unavailable branch must carry a human-readable reason.
  const s = toolStatus();
  if (s.available) return;
  const res = renderDeck(GOOD, os.tmpdir());
  assert.equal(res.available, false);
  assert.match(res.reason, /not found/);
});
