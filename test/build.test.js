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
const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'web-deck');

// A real 1x1 PNG. deck/deck*/assets/** is gitignored, so the deck's own diagrams
// cannot serve as fixtures — the suite must build from tracked sources only,
// or it goes red on a fresh clone.
const STUB_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * A deck workspace in a temp directory, built from the tracked fixture. Returns
 * its path so tests can run the CLI with `cwd` set elsewhere — which is the
 * normal installed case, and the one in-repo runs can never exercise.
 */
function workspace({ withAssets = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-ws-'));
  const deck = path.join(dir, 'deck', 'fixture-deck');
  fs.mkdirSync(deck, { recursive: true });
  fs.copyFileSync(path.join(FIXTURE, 'storyline.md'), path.join(deck, 'storyline.md'));
  fs.copyFileSync(path.join(FIXTURE, 'theme.json'), path.join(deck, 'theme.json'));

  const slides = YAML.parse(fs.readFileSync(path.join(deck, 'storyline.md'), 'utf8')).slides;
  if (withAssets) {
    fs.mkdirSync(path.join(deck, 'assets'), { recursive: true });
    for (const s of slides) {
      const n = String(s.slide).padStart(2, '0');
      fs.writeFileSync(path.join(deck, 'assets', `s${n}.png`), STUB_PNG);
    }
  }
  return { dir, deck, slideCount: slides.length };
}

function runCli(args, cwd = ROOT) {
  return execFileSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** Unzip into { name: Buffer } — used for content assertions on the built deck. */
function parts(file) {
  const zip = unzipSync(new Uint8Array(fs.readFileSync(file)));
  return Object.fromEntries(Object.entries(zip).map(([k, v]) => [k, Buffer.from(v)]));
}

function tempOut() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'deckto-build-')), 'deck.pptx');
}

test('deck/<slug> resolves from the working directory, not the installed package', () => {
  // `deckto init` writes here, and every other command reads the user's file from
  // here. build resolved deck/ against the package dir instead, so an installed
  // user's deck was invisible: the command answered "missing .../node_modules/
  // deckto/deck/<slug>/storyline.md" for a deck sitting right there on disk.
  const { dir, deck, slideCount } = workspace();
  const out = path.join(dir, 'built.pptx');
  runCli(['build', 'fixture-deck', '--out', out], dir);

  assert.ok(fs.existsSync(out), 'built from the caller working directory');
  assert.ok(fs.existsSync(path.join(deck, 'storyline.md')), 'fixture is where init would have put it');
  assert.equal(Object.keys(parts(out)).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length, slideCount);
});

test('build renders the pptx without the web flag', () => {
  const { dir } = workspace();
  const out = tempOut();
  runCli(['build', 'fixture-deck', '--out', out], dir);

  assert.ok(fs.existsSync(out), 'pptx was written');
  const zip = parts(out);
  const slideNames = Object.keys(zip).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  assert.equal(slideNames.length, 6, 'one slide part per storyline slide');
  assert.ok(zip['ppt/presentation.xml'], 'presentation.xml present');
  assert.ok(zip['ppt/notesSlides/notesSlide1.xml'], 'notes are written');
});

// The storyline -> pptx transcription is the contract the old build script used
// to own. Byte equality is not the test: pptxgenjs stamps ZIP entries with the
// current time, so two runs of the SAME code already differ. What must hold is
// that every slide reaches the deck with its own structure and notes.
test('build transcribes the storyline into the pptx, slide for slide', () => {
  const { dir, deck, slideCount } = workspace();
  const out = tempOut();
  runCli(['build', 'fixture-deck', '--out', out], dir);

  const zip = parts(out);
  const storyline = YAML.parse(fs.readFileSync(path.join(deck, 'storyline.md'), 'utf8'));
  assert.equal(storyline.slides.length, slideCount);

  for (const s of storyline.slides) {
    const xml = zip[`ppt/slides/slide${s.slide}.xml`].toString('utf8');
    const head = s.title.slice(0, 24).replace(/&/g, '&amp;');
    assert.ok(xml.includes(head), `slide ${s.slide} carries its title`);

    // GATE 3: the insight must be in the notes, not just in the YAML.
    const notes = zip[`ppt/notesSlides/notesSlide${s.slide}.xml`];
    assert.ok(notes, `slide ${s.slide} has a notes part`);
    assert.ok(notes.toString('utf8').includes('INSIGHT:'), `slide ${s.slide} notes open with INSIGHT:`);
  }

  const media = Object.keys(zip).filter((n) => n.startsWith('ppt/media/'));
  assert.ok(media.length >= storyline.slides.length, 'every slide embeds a diagram');
});

test('build emits the web deck with --web', () => {
  const { dir, deck, slideCount } = workspace();
  runCli(['build', 'fixture-deck', '--web'], dir);

  const html = fs.readFileSync(path.join(deck, 'web', 'index.html'), 'utf8');
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'a complete document');
  assert.equal((html.match(/<section class="slide/g) ?? []).length, slideCount, 'one section per slide');
  assert.ok(html.includes('INSIGHT:'), 'the insight contract travels to the web');
});

test('build --all emits both formats', () => {
  const { dir, deck } = workspace();
  runCli(['build', 'fixture-deck', '--all'], dir);
  assert.ok(fs.existsSync(path.join(deck, 'deck.pptx')), 'pptx built');
  assert.ok(fs.existsSync(path.join(deck, 'web', 'index.html')), 'web built');
});

test('build --json emits the shared envelope', () => {
  const { dir } = workspace();
  const parsed = JSON.parse(runCli(['build', 'fixture-deck', '--json'], dir));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.command, 'build');
  assert.equal(parsed.error, null);
  assert.equal(parsed.data.slug, 'fixture-deck');
  assert.equal(parsed.data.slides, 6);
  assert.ok(parsed.data.pptx.endsWith('deck.pptx'));
  assert.ok(parsed.data.bytes > 0);
  assert.equal(parsed.data.web, null, 'pptx only by default');
});

// GATE 2: a deck whose diagram assets are missing must fail loudly rather than
// build a text-only deck — rule 2 failing without a gate.
test('build refuses a deck whose diagram assets are missing', () => {
  const { dir } = workspace({ withAssets: false });
  assert.throws(
    () => runCli(['build', 'fixture-deck', '--out', tempOut()], dir),
    /missing asset for slide 1/,
    'a missing diagram asset must fail loudly'
  );
});

test('build reports an unknown deck slug', () => {
  const { dir } = workspace();
  assert.throws(
    () => runCli(['build', 'no-such-deck-exists', '--out', tempOut()], dir),
    /no-such-deck-exists/,
  );
});

test('build rejects a non-kebab slug', () => {
  const { dir } = workspace();
  assert.throws(
    () => runCli(['build', 'Not_A_Slug', '--out', tempOut()], dir),
    /kebab/,
  );
});

test('build requires a slug', () => {
  assert.throws(() => runCli(['build', '--json']), /requires <slug>/);
});
