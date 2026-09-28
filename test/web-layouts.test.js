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
test('every mapped layout declares diagram requirements', () => {
  for (const [layout, spec] of Object.entries(LAYOUTS)) {
    if (Array.isArray(spec)) {
      assert.ok(spec.length > 0, `${layout}: no diagram keys declared`);
      assert.deepEqual(requiredDiagramKeys(layout), spec, `${layout}: inconsistent keys`);
      continue;
    }
    assert.ok(Array.isArray(spec.anyOf) && spec.anyOf.length > 0, `${layout}: empty anyOf`);
    for (const group of spec.anyOf) {
      assert.ok(group.length > 0, `${layout}: an anyOf group is empty`);
    }
    // Reports every candidate key for diagnostics/tests, order-independent.
    assert.deepEqual(requiredDiagramKeys(layout), spec.anyOf.flat(), `${layout}: inconsistent keys`);
  }
});

// chart-focus is the layout with two legitimate diagram shapes — deckto-pitch
// uses checklist, ai-agent-skills uses bars, and scripts/make-assets.js accepts
// either (line 249: `if (d.checklist)` ... else `d.bars`). A contract that
// demanded only one rejected a shipped deck.
test('chart-focus accepts either a checklist or bars diagram', () => {
  const base = { slide: 6, layout: 'chart-focus' };
  assert.equal(assertRenderable({ ...base, diagram: { checklist: ['a'] } }), true);
  assert.equal(assertRenderable({ ...base, diagram: { bars: [{ label: 'x', value: 1 }] } }), true);
  assert.throws(() => assertRenderable({ ...base, diagram: {} }), {
    message: 'slide 6: diagram block for layout "chart-focus" is missing key "checklist"',
  });
  assert.throws(() => assertRenderable({ ...base, diagram: null }), /missing diagram block/);
});

// Regression guard: both shipped decks must stay renderable. This is the test
// that would have caught the one-shape assumption above.
test('every slide of both shipped decks is renderable', () => {
  const deckDir = path.join(ROOT, 'deck');
  const decks = fs.readdirSync(deckDir)
    .map((slug) => ({ slug, file: path.join(deckDir, slug, 'storyline.md') }))
    .filter((s) => fs.existsSync(s.file));
  assert.ok(decks.length >= 2, 'expected both shipped decks');
  for (const { slug, file } of decks) {
    const storyline = YAML.parse(fs.readFileSync(file, 'utf8'));
    for (const slide of storyline.slides ?? []) {
      assert.equal(assertRenderable(slide), true, `${slug} slide ${slide.slide}`);
    }
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
