import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BIN = path.join(ROOT, 'cli', 'bin', 'deckto.js');

function report(findings, iteration, outDir) {
  const findingsFile = path.join(outDir, 'findings.json');
  fs.writeFileSync(findingsFile, JSON.stringify({ findings, iteration, file: 'deck.pptx' }), 'utf8');
  try {
    const stdout = execFileSync(
      process.execPath,
      [BIN, 'qa', 'report', '--findings', findingsFile, '--out', outDir, '--json'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { code: 0, env: JSON.parse(stdout) };
  } catch (err) {
    return { code: err.status ?? 1, env: err.stdout ? JSON.parse(err.stdout) : null };
  }
}

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-report-'));
}

const F = (code, scope) => ({ code, slide: 1, scope, detail: `${code} on slide 1`, fix: 'fix it' });

test('PASS: no findings → verdict PASS, directive CLOSED, report written', () => {
  const dir = tmp();
  const r = report([], 1, dir);
  assert.equal(r.env.data.verdict, 'PASS');
  assert.equal(r.env.data.directive, 'CLOSED');
  assert.ok(fs.existsSync(path.join(dir, 'qa-report.md')));
});

test('LOOP: storyline findings route back to pitchdeck-grinding', () => {
  const dir = tmp();
  const r = report([F('INSIGHT_MISSING', 'storyline')], 1, dir);
  assert.equal(r.env.data.verdict, 'FAIL');
  assert.equal(r.env.data.directive, 'LOOP:pitchdeck-grinding');
});

test('LOOP: deck-only findings route back to pitchdeck-build', () => {
  const dir = tmp();
  const r = report([F('FONTSIZE_LOW', 'deck')], 1, dir);
  assert.equal(r.env.data.directive, 'LOOP:pitchdeck-build');
});

test('LOOP: storyline findings dominate when mixed with deck findings', () => {
  const dir = tmp();
  const r = report([F('FONTSIZE_LOW', 'deck'), F('WORDS_OVER_BUDGET', 'storyline')], 1, dir);
  assert.equal(r.env.data.directive, 'LOOP:pitchdeck-grinding', 'content loop must win');
});

test('BLOCKED: exceeding maxAutoIterations stops the loop', () => {
  const dir = tmp();
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'deckto.config.json'), 'utf8'));
  const over = cfg.review.maxAutoIterations + 1;
  const r = report([F('INSIGHT_MISSING', 'storyline')], over, dir);
  assert.equal(r.env.data.verdict, 'BLOCKED');
  assert.equal(r.env.data.directive, 'REVIEW_BLOCKED');
});

test('BLOCKED report tells the agent to stop, not loop again', () => {
  const dir = tmp();
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'deckto.config.json'), 'utf8'));
  report([F('FONTSIZE_LOW', 'deck')], cfg.review.maxAutoIterations + 1, dir);
  const md = fs.readFileSync(path.join(dir, 'qa-report.md'), 'utf8');
  assert.match(md, /REVIEW_BLOCKED/);
  assert.match(md, /report to the user and stop/i);
  assert.doesNotMatch(md, /Loop back to/);
});

test('report groups findings by scope with invalidation notes', () => {
  const dir = tmp();
  report([F('INSIGHT_MISSING', 'storyline'), F('VISUAL_MISSING', 'assets'), F('FONTSIZE_LOW', 'deck')], 1, dir);
  const md = fs.readFileSync(path.join(dir, 'qa-report.md'), 'utf8');
  assert.match(md, /scope: `storyline`/);
  assert.match(md, /scope: `assets`/);
  assert.match(md, /scope: `deck`/);
  assert.match(md, /Invalidates/);
});

test('iterations within cap keep looping', () => {
  const dir = tmp();
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'deckto.config.json'), 'utf8'));
  const r = report([F('FONTSIZE_LOW', 'deck')], cfg.review.maxAutoIterations, dir);
  assert.equal(r.env.data.verdict, 'FAIL');
  assert.equal(r.env.data.directive, 'LOOP:pitchdeck-build');
});
