import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BIN = path.join(ROOT, 'cli', 'bin', 'deckto.js');

function storylineCheck(yamlText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-storyline-'));
  const file = path.join(dir, 'storyline.md');
  fs.writeFileSync(file, yamlText, 'utf8');
  try {
    const stdout = execFileSync(process.execPath, [BIN, 'qa', 'storyline', file, '--json'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, env: JSON.parse(stdout) };
  } catch (err) {
    return { code: err.status ?? 1, env: err.stdout ? JSON.parse(err.stdout) : null };
  }
}

const codes = (r) => (r.env?.data?.errors ?? []).map((e) => e.code);

const VALID = `master_title: "Guided onboarding is why teams stay"
slides:
  - slide: 1
    title: "Teams churn before they finish setup"
    point: "Setup has 9 steps and most stop at 4"
    insight: "Every paid signup leaks in the first hour"
    body: "4 of 10 never finish setup."
    visual: "funnel chart of drop-off"
    visual_source: "generate"
    evidence: "internal analytics Q3"
    layout: "chart-focus"
    arc: "what-is"
    notes_draft: "Walk through the funnel drop-off."
  - slide: 2
    title: "Three screens replace nine steps"
    point: "Guided setup collapses the flow"
    insight: "Activation becomes the retention lever, not price"
    body: "Guided setup: 3 steps, 4 minutes."
    visual: "three phone screens"
    visual_source: "generate"
    evidence: "internal test cohort"
    layout: "three-screens"
    arc: "what-could-be"
    notes_draft: "Show the new flow."
  - slide: 3
    title: "Every team finishes setup in the first session"
    point: "The end state we are asking you to fund"
    insight: "Retention stops being a support problem and becomes the product"
    body: "Target: 90% activation."
    visual: "growth curve to target"
    visual_source: "generate"
    evidence: "target, not yet measured"
    layout: "chart-focus"
    arc: "new-bliss"
    notes_draft: "Close on the world with guided setup everywhere."
`;

test('valid storyline passes with zero errors', () => {
  const r = storylineCheck(VALID);
  assert.equal(r.env.data.errors.length, 0, JSON.stringify(r.env.data.errors));
  assert.equal(r.env.data.slideCount, 3);
  assert.equal(r.code, 0);
});

test('deck that does not close on new-bliss is rejected (arc shape)', () => {
  const truncated = VALID.replace(/\n  - slide: 3[\s\S]*$/, '\n');
  const r = storylineCheck(truncated);
  assert.ok(codes(r).includes('ARC_SHAPE'), JSON.stringify(codes(r)));
});

test('missing master_title is rejected', () => {
  const r = storylineCheck(VALID.replace(/master_title: .*\n/, ''));
  assert.ok(codes(r).includes('MASTER_TITLE_MISSING'), JSON.stringify(codes(r)));
});

test('empty insight is rejected (GATE 2)', () => {
  const r = storylineCheck(VALID.replace('Every paid signup leaks in the first hour', ''));
  const got = codes(r);
  assert.ok(
    got.includes('INSIGHT_EMPTY') || got.includes('FIELD_MISSING'),
    `empty insight must be rejected, got ${JSON.stringify(got)}`,
  );
  assert.notEqual(r.code, 0);
});

test('body over the config word budget is rejected (GATE 3)', () => {
  const long = 'word '.repeat(40);
  const r = storylineCheck(VALID.replace('4 of 10 never finish setup.', long.trim()));
  assert.ok(codes(r).includes('BODY_OVER_BUDGET'), JSON.stringify(codes(r)));
});

test('invalid arc tag is rejected', () => {
  const r = storylineCheck(VALID.replace('arc: "what-could-be"', 'arc: "climax"'));
  assert.ok(codes(r).includes('ARC_INVALID'), JSON.stringify(codes(r)));
});

test('missing required field is rejected with slide number', () => {
  const r = storylineCheck(VALID.replace(/    visual_source: "generate"\n    evidence: "internal test cohort"/, '    evidence: "internal test cohort"'));
  assert.ok(codes(r).includes('FIELD_MISSING'), JSON.stringify(codes(r)));
  const err = r.env.data.errors.find((e) => e.code === 'FIELD_MISSING');
  assert.equal(typeof err.slide, 'number');
});

test('trivial insight (<10 chars) is rejected', () => {
  const r = storylineCheck(VALID.replace('Every paid signup leaks in the first hour', 'It helps'));
  assert.ok(codes(r).includes('INSIGHT_EMPTY'), JSON.stringify(codes(r)));
});

test('valid storyline reports thresholds and slide count in data', () => {
  const r = storylineCheck(VALID);
  assert.equal(typeof r.env.data.thresholds.maxBodyPerSlide, 'number');
  assert.equal(r.env.data.pass, true);
});
