import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BIN = path.join(ROOT, 'cli', 'bin', 'deckto.js');
const BAD = path.join(ROOT, 'test', 'fixtures', 'known-bad');
const GOOD = path.join(ROOT, 'test', 'fixtures', 'known-good');

function qa(file) {
  try {
    const stdout = execFileSync(process.execPath, [BIN, 'qa', 'static', file, '--json'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, env: JSON.parse(stdout) };
  } catch (err) {
    return {
      code: err.status ?? 1,
      env: err.stdout ? JSON.parse(err.stdout) : null,
      stderr: err.stderr ?? '',
    };
  }
}

const codes = (r) => (r.env?.data?.findings ?? []).map((f) => f.code);

test('FONTSIZE_LOW: body text below minBodyPt is flagged', () => {
  const r = qa(path.join(BAD, 'small-font.pptx'));
  assert.ok(codes(r).includes('FONTSIZE_LOW'), `got ${JSON.stringify(codes(r))}`);
  assert.notEqual(r.code, 0, 'findings must produce non-zero exit');
});

test('WORDS_OVER_BUDGET: slide body above maxBodyPerSlide is flagged', () => {
  const r = qa(path.join(BAD, 'wordy.pptx'));
  assert.ok(codes(r).includes('WORDS_OVER_BUDGET'), `got ${JSON.stringify(codes(r))}`);
});

test('INSIGHT_MISSING: notes without an INSIGHT: first line is flagged', () => {
  const r = qa(path.join(BAD, 'no-insight.pptx'));
  assert.ok(codes(r).includes('INSIGHT_MISSING'), `got ${JSON.stringify(codes(r))}`);
});

test('INSIGHT_MISSING: slide with no notes at all is flagged', () => {
  const r = qa(path.join(BAD, 'no-notes.pptx'));
  assert.ok(codes(r).includes('INSIGHT_MISSING'), `got ${JSON.stringify(codes(r))}`);
});

test('INSIGHT_EMPTY: "INSIGHT:" with no content is flagged', () => {
  const r = qa(path.join(BAD, 'empty-insight.pptx'));
  assert.ok(codes(r).includes('INSIGHT_EMPTY'), `got ${JSON.stringify(codes(r))}`);
});

test('known-good deck produces zero findings and exit 0', () => {
  const r = qa(path.join(GOOD, 'good.pptx'));
  assert.deepEqual(r.env.data.findings, []);
  assert.equal(r.code, 0);
});

test('findings carry slide number and scope for loop-back classification', () => {
  const r = qa(path.join(BAD, 'small-font.pptx'));
  const f = r.env.data.findings.find((x) => x.code === 'FONTSIZE_LOW');
  assert.equal(typeof f.slide, 'number');
  assert.ok(['storyline', 'assets', 'deck'].includes(f.scope), `bad scope: ${f.scope}`);
});

test('content findings are scoped storyline, design findings are scoped deck', () => {
  const wordy = qa(path.join(BAD, 'wordy.pptx')).env.data.findings;
  const insight = qa(path.join(BAD, 'no-insight.pptx')).env.data.findings;
  const font = qa(path.join(BAD, 'small-font.pptx')).env.data.findings;
  assert.equal(wordy.find((f) => f.code === 'WORDS_OVER_BUDGET').scope, 'storyline');
  assert.equal(insight.find((f) => f.code === 'INSIGHT_MISSING').scope, 'storyline');
  assert.equal(font.find((f) => f.code === 'FONTSIZE_LOW').scope, 'deck');
});

test('thresholds come from deckto.config.json, not hardcoded', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'deckto.config.json'), 'utf8'));
  const r = qa(path.join(GOOD, 'good.pptx'));
  assert.equal(r.env.data.thresholds.minBodyPt, cfg.fonts.minBodyPt);
  assert.equal(r.env.data.thresholds.maxBodyPerSlide, cfg.words.maxBodyPerSlide);
});
