import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import YAML from 'yaml';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLI = path.join(ROOT, 'cli', 'bin', 'deckto.js');
const SLUG = 'deckto-pitch';
const DECK = path.join(ROOT, 'deck', SLUG);

function runCli(args) {
  const stdout = execFileSync(process.execPath, [CLI, ...args], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return stdout;
}

/**
 * Every part of the pptx except the bytes that carry ZIP timestamps.
 * pptxgenjs stamps entries with the current time, so two runs of the SAME
 * script already produce different bytes — byte equality is unachievable and
 * asserting it would be a test that can never pass.
 */
function parts(file) {
  const buf = fs.readFileSync(file);
  const zip = unzipSync(new Uint8Array(buf));
  return Object.fromEntries(
    Object.entries(zip).map(([name, bytes]) => [name, Buffer.from(bytes)])
  );
}

function tempOut() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-build-'));
  return path.join(dir, 'deck.pptx');
}

test('build renders the pptx without the web flag', () => {
  const out = tempOut();
  runCli(['build', SLUG, '--out', out]);
  assert.ok(fs.existsSync(out), 'pptx was written');

  const zip = parts(out);
  const slideNames = Object.keys(zip).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  assert.equal(slideNames.length, 12, 'one slide part per storyline slide');
  assert.ok(zip['ppt/presentation.xml'], 'presentation.xml present');
  assert.ok(zip['ppt/notesSlides/notesSlide1.xml'], 'notes are written');
});

// The storyline -> pptx transcription is the contract the old build script used
// to own. Byte equality is not the test: pptxgenjs stamps ZIP entries with the
// current time, so two runs of the SAME code already differ. What must hold is
// that every slide reaches the deck with its own diagram, structure and notes.
test('build transcribes the storyline into the pptx, slide for slide', () => {
  const out = tempOut();
  runCli(['build', SLUG, '--out', out]);

  const zip = parts(out);
  const slideNames = Object.keys(zip)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  const storyline = YAML.parse(fs.readFileSync(path.join(DECK, 'storyline.md'), 'utf8'));
  assert.equal(slideNames.length, storyline.slides.length, 'one slide part per storyline slide');

  for (const s of storyline.slides) {
    const xml = zip[`ppt\/slides\/slide${s.slide}.xml`].toString('utf8');
    const titleHead = s.title.slice(0, 24).replace(/&/g, '&amp;');
    assert.ok(xml.includes(titleHead), `slide ${s.slide} carries its title`);

    // GATE 3: the frozen insight must be in the notes, not just in the YAML.
    const notes = zip[`ppt\/notesSlides\/notesSlide${s.slide}.xml`];
    assert.ok(notes, `slide ${s.slide} has a notes part`);
    assert.ok(
      notes.toString('utf8').includes('INSIGHT:'),
      `slide ${s.slide} notes open with the INSIGHT line`
    );
  }

  // Every slide gets a diagram image; a text-only deck is rule 2 failing silently.
  const media = Object.keys(zip).filter((n) => n.startsWith('ppt/media/'));
  assert.ok(media.length >= storyline.slides.length, 'every slide embeds a diagram');
});

test('build --json emits the shared envelope', () => {
  const out = tempOut();
  const parsed = JSON.parse(runCli(['build', SLUG, '--out', out, '--json']));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.command, 'build');
  assert.equal(parsed.error, null);
  assert.equal(parsed.data.slug, SLUG);
  assert.equal(parsed.data.slides, 12);
  assert.ok(parsed.data.pptx.endsWith('deck.pptx'));
  assert.ok(parsed.data.bytes > 0);
});

// GATE 2: a deck whose diagram assets are missing must fail loudly rather than
// build a text-only deck — rule 2 failing without a gate.
test('build refuses a deck whose diagram assets are missing', () => {
  const slug = 'build-test-missing-assets';
  const dir = path.join(ROOT, 'deck', slug);
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(DECK, 'storyline.md'), path.join(dir, 'storyline.md'));
  fs.copyFileSync(path.join(DECK, 'theme.json'), path.join(dir, 'theme.json'));
  try {
    assert.throws(
      () => runCli(['build', slug, '--out', tempOut()]),
      /missing asset for slide 1/,
      'a missing diagram asset must fail loudly'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('build reports an unknown deck slug', () => {
  assert.throws(
    () => runCli(['build', 'no-such-deck-exists', '--out', tempOut()]),
    /no-such-deck-exists/,
  );
});

test('build rejects a non-kebab slug', () => {
  assert.throws(
    () => runCli(['build', 'Not_A_Slug', '--out', tempOut()]),
    /kebab/,
  );
});
