import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { renderWeb } from '../cli/lib/web-renderer.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLI = path.join(ROOT, 'cli', 'bin', 'deckto.js');
const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'web-deck');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'deckto.config.json'), 'utf8'));

function goodHtml() {
  const storyline = YAML.parse(fs.readFileSync(path.join(FIXTURE, 'storyline.md'), 'utf8'));
  const theme = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'theme.json'), 'utf8'));
  return renderWeb({ storyline, theme, config: cfg, warn: () => {} });
}

function qaWeb(html, { json = true } = {}) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-qaweb-')), 'index.html');
  fs.writeFileSync(file, html, 'utf8');
  let stdout = '';
  let failed = false;
  try {
    stdout = execFileSync(process.execPath, [CLI, 'qa', 'web', file, ...(json ? ['--json'] : [])], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    failed = true;
    stdout = String(err.stdout ?? '');
  }
  return { failed, env: JSON.parse(stdout) };
}

const codes = (env) => (env.data?.findings ?? []).map((f) => f.code);

test('qa web passes a deck produced by the renderer', () => {
  const { failed, env } = qaWeb(goodHtml());
  assert.equal(failed, false, 'a clean deck must not fail the gate');
  assert.equal(env.ok, true);
  assert.equal(env.command, 'qa');
  assert.equal(env.data.sub, 'web');
  assert.equal(env.data.findings.length, 0, JSON.stringify(env.data.findings));
  assert.equal(env.data.pass, true);
  assert.ok(env.data.slideCount > 0);
});

// Rule 3: insight per slide. This mirrors the pptx static check, which parses
// the same INSIGHT: prefix out of notes XML — same contract, two formats.
test('qa web flags a slide whose notes do not open with INSIGHT:', () => {
  const html = goodHtml().replace('INSIGHT: ', 'NOTE: ');
  const { failed, env } = qaWeb(html);
  assert.equal(failed, true, 'findings must fail the gate');
  assert.ok(codes(env).includes('INSIGHT_MISSING'), JSON.stringify(codes(env)));
  const f = env.data.findings.find((x) => x.code === 'INSIGHT_MISSING');
  assert.equal(f.scope, 'storyline');
  assert.equal(f.slide, 1);
});

test('qa web flags an empty insight as INSIGHT_EMPTY', () => {
  const html = goodHtml().replace(/<p>INSIGHT: [^<]*<\/p>/, '<p>INSIGHT: </p>');
  const { failed, env } = qaWeb(html);
  assert.equal(failed, true);
  assert.ok(codes(env).includes('INSIGHT_EMPTY'), JSON.stringify(codes(env)));
  assert.equal(env.data.findings.find((x) => x.code === 'INSIGHT_EMPTY').scope, 'storyline');
});

// Rule 2: visual over wordy. A slide with no diagram is the pptx VISUAL_MISSING
// equivalent — the words are all there, which is exactly how it got past.
test('qa web flags a slide with no visual block', () => {
  const html = goodHtml()
    .split('<div class="visual" data-visual="comparison-columns">')
    .join('<div data-renderer-bug-removed-visual="1">');
  const { failed, env } = qaWeb(html);
  assert.equal(failed, true);
  assert.ok(codes(env).includes('VISUAL_MISSING'), JSON.stringify(codes(env)));
  assert.equal(env.data.findings.find((x) => x.code === 'VISUAL_MISSING').scope, 'assets');
});

// Rule 4: fonts large enough to read from the back of the room.
test('qa web flags emitted font floors below config', () => {
  const html = goodHtml().replace(/--body-floor: [\d.]+px/, '--body-floor: 8px');
  const { failed, env } = qaWeb(html);
  assert.equal(failed, true);
  const f = env.data.findings.find((x) => x.code === 'FONTSIZE_LOW');
  assert.ok(f, JSON.stringify(codes(env)));
  assert.equal(f.scope, 'deck');
  assert.match(f.detail, /body/i);
});

// Decision 2: one self-contained file. A remote href/src would break offline use.
test('qa web flags external references', () => {
  const html = goodHtml().replace('</head>', '<link rel="stylesheet" href="https://cdn.example.com/x.css"></head>');
  const { failed, env } = qaWeb(html);
  assert.equal(failed, true);
  assert.ok(codes(env).includes('EXTERNAL_REF'), JSON.stringify(codes(env)));
  assert.equal(env.data.findings.find((x) => x.code === 'EXTERNAL_REF').scope, 'deck');
});

test('qa web accepts plain URLs inside slide text', () => {
  const html = goodHtml().replace('<p class="slide-body">', '<p class="slide-body">See https://example.com/docs ');
  const { failed, env } = qaWeb(html);
  assert.equal(failed, false, JSON.stringify(env.data.findings));
  assert.equal(env.data.findings.length, 0);
});

test('qa web reports a missing file', () => {
  assert.throws(
    () => execFileSync(process.execPath, [CLI, 'qa', 'web', 'no-such-file.html', '--json'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }),
    /web file not found|no-such-file/,
  );
});

test('qa rejects an unknown subcommand', () => {
  assert.throws(
    () => execFileSync(process.execPath, [CLI, 'qa', 'bogus', '--json'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }),
    /subcommand/,
  );
});
