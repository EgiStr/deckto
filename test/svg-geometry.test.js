// Regression tests for SVG text geometry.
//
// The dogfood deck shipped a strip set where every scene drew ~40px too low, colliding
// rows and competing with the caption. The SVG was well-formed and every static check
// passed, so only the vision pass caught it. Root cause: a <text> node's `y` is the
// baseline, but the generator authored top-edge coordinates. These tests pin the
// conversion so the same class of silent offset cannot come back.

import test from 'node:test';
import assert from 'node:assert/strict';
import { baseline, lineBox, TEXT_ASCENT_RATIO } from '../cli/lib/svg-geometry.js';

test('baseline sits below the top edge by the cap height', () => {
  assert.equal(baseline(120, 30), 141);
  assert.equal(baseline(0, 100), 70);
});

test('baseline is strictly monotonic in both top and size', () => {
  assert.ok(baseline(200, 30) > baseline(150, 30), 'lower top must give lower baseline');
  assert.ok(baseline(200, 44) > baseline(200, 30), 'larger size must give lower baseline');
});

test('baseline never exceeds one full line box below the top edge', () => {
  for (const size of [14, 26, 30, 34, 44, 52, 110]) {
    const b = baseline(120, size);
    assert.ok(b > 120, `baseline for size ${size} must be below the top edge`);
    assert.ok(b < 120 + lineBox(size), `baseline for size ${size} must stay within its line box`);
  }
});

test('a text box authored inside a row keeps its baseline inside that row', () => {
  // Row of 84px starting at y=120; the label is authored at row top + 29 (size 36).
  const top = 120 + 29;
  const b = baseline(top, 36);
  assert.ok(b <= 120 + 84, `baseline ${b} escaped the 84px row`);
  assert.ok(b - 36 * TEXT_ASCENT_RATIO >= 120, 'ascender climbed out of the row top');
});

test('caption descenders stay inside the 460px strip', () => {
  const stripHeight = 460;
  const b = baseline(422, 34);
  const descender = b + 34 * 0.22; // rough descender depth
  assert.ok(descender < stripHeight, `caption descender ${descender} exceeded strip height`);
});

test('lineBox grows with font size and is never less than the font size', () => {
  assert.ok(lineBox(14) < lineBox(36));
  for (const size of [14, 30, 52]) assert.ok(lineBox(size) >= size);
});
