import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { LAYOUTS, UNSUPPORTED, canRender, requiredDiagramKeys, assertRenderable } from '../cli/lib/web-layouts.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function allStorylines() {
  const deckDir = path.join(ROOT, 'deck');
  if (!fs.existsSync(deckDir)) return [];
  return fs.readdirSync(deckDir)
    .map((slug) => ({ slug, file: path.join(deckDir, slug, 'storyline.md') }))
    .filter((s) => fs.existsSync(s.file))
    .map((s) => ({ ...s, storyline: YAML.parse(fs.readFileSync(s.file, 'utf8')) }));
}

// The contract: every layout any real storyline uses must have a web mapping.
// A layout added to the pptx path without a web equivalent fails here rather
// than silently emitting a text-only slide.
test('every layout used by a real storyline has a web mapping', () => {
  const decks = allStorylines();
  assert.ok(decks.length > 0, 'expected at least one deck storyline');
  for (const { slug, storyline } of decks) {
    for (const slide of storyline.slides ?? []) {
      assert.ok(
        canRender(slide.layout),
        `${slug} slide ${slide.slide}: layout "${slide.layout}" has no web mapping`
      );
    }
  }
});

// Every mapped layout must actually read diagram data — a mapping that ignores
// the diagram would render a generic slide and defeat visual-over-wordy.
test('every mapped layout consumes diagram data', () => {
  for (const [layout, keys] of Object.entries(LAYOUTS)) {
    assert.ok(keys.length > 0, `${layout}: no diagram keys declared`);
    assert.deepEqual(requiredDiagramKeys(layout), keys, `${layout}: inconsistent keys`);
  }
});

test('canRender is false for unknown layouts, not a silent pass', () => {
  assert.equal(canRender('title-dark'), true);
  assert.equal(canRender('no-such-layout'), false);
  assert.equal(canRender(undefined), false);
  assert.equal(canRender(''), false);
});

test('assertRenderable rejects an unmapped layout with the spec error', () => {
  assert.throws(
    () => assertRenderable({ slide: 3, layout: 'freeform', diagram: {} }),
    { message: 'slide 3: unknown layout "freeform" for web renderer' }
  );
});

test('assertRenderable rejects a mapped layout with no diagram block', () => {
  assert.throws(
    () => assertRenderable({ slide: 7, layout: 'stat-callout' }),
    { message: 'slide 7: missing diagram block for layout "stat-callout"' }
  );
  assert.throws(
    () => assertRenderable({ slide: 7, layout: 'stat-callout', diagram: null }),
    { message: 'slide 7: missing diagram block for layout "stat-callout"' }
  );
});

test('assertRenderable accepts a well-formed slide', () => {
  assert.equal(
    assertRenderable({ slide: 1, layout: 'title-dark', diagram: { sub: 'x' } }),
    true
  );
});

// Defensive: if UNSUPPORTED is ever non-empty, the table has drifted from
// shipped behaviour and that must be visible rather than assumed.
test('no layout is declared unsupported', () => {
  assert.deepEqual(UNSUPPORTED, []);
});
