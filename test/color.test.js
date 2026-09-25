import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contrastRatio, checkPair, adjustForContrast, checkDominance, deriveRamp,
  hexToRgb, rgbToHex, oklchToSrgb,
} from '../cli/lib/color.js';

// Known-good WCAG reference values.
test('contrast of black on white is 21:1', () => {
  assert.equal(Number(contrastRatio('#000000', '#FFFFFF').toFixed(2)), 21);
});

test('contrast of identical colors is 1:1', () => {
  assert.equal(Number(contrastRatio('#336699', '#336699').toFixed(2)), 1);
});

test('oklch(0.64 0.16 250) converts in-gamut and resolves to the expected hue family', () => {
  const primary = rgbToHex(oklchToSrgb(0.64, 0.16, 250));
  assert.equal(oklchToSrgb(0.64, 0.16, 250).inGamut, true);
  const rgb = hexToRgb(primary);
  assert.ok(rgb.b > rgb.g && rgb.g > rgb.r, `${primary} is not a blue-family color`);
  // NOTE: pocketto's math-toolkit worked example claims this pair is 4.57:1 / AA with white
  // text. Recomputed here it is 3.35:1 — that example's arithmetic is wrong. Consequently
  // white does NOT pass on this swatch at normal size. Asserted as the true value.
  const r = checkPair('#FFFFFF', primary, 'normal');
  assert.equal(r.pass, false, `expected this swatch to fail AA with white text, got ${r.ratio}:1`);
  assert.ok(r.ratio > 3 && r.ratio < 4.5, `expected between 3 and 4.5, got ${r.ratio}`);
});

test('low-contrast pair fails and is reported as failed', () => {
  const r = checkPair('#999999', '#AAAAAA');
  assert.equal(r.pass, false);
  assert.ok(r.ratio < 4.5);
});

test('adjustForContrast darkens until it passes, keeping the pair', () => {
  const fixed = adjustForContrast('#999999', '#FFFFFF', 'normal');
  assert.equal(fixed.pass, true, `ratio ${fixed.ratio} after ${fixed.steps} steps`);
  assert.ok(fixed.steps > 0);
  assert.equal(checkPair(fixed.hex, '#FFFFFF').pass, true);
});

test('adjustForContrast is a no-op when the pair already passes', () => {
  const fixed = adjustForContrast('#000000', '#FFFFFF');
  assert.equal(fixed.pass, true);
  assert.equal(fixed.steps, 0);
  assert.equal(fixed.hex, '#000000');
});

test('large text threshold is lower than normal (3:1 vs 4.5:1)', () => {
  const c = '#949494'; // ~3.03:1 on white — inside the large-only band
  assert.equal(checkPair(c, '#FFFFFF', 'large').pass, true);
  assert.equal(checkPair(c, '#FFFFFF', 'normal').pass, false);
});

test('hex parsing accepts short form and rejects nonsense', () => {
  assert.deepEqual(hexToRgb('#fff'), { r: 1, g: 1, b: 1 });
  assert.throws(() => hexToRgb('#zzz'), /invalid hex/);
});

test('dominance check accepts a valid 60/30/10 palette', () => {
  const r = checkDominance([
    { role: 'dominant', weight: 65 },
    { role: 'secondary', weight: 25 },
    { role: 'accent', weight: 10 },
  ]);
  assert.equal(r.pass, true, JSON.stringify(r.errors));
});

test('dominance check rejects equal-weight palettes', () => {
  const r = checkDominance([
    { role: 'dominant', weight: 34 },
    { role: 'secondary', weight: 33 },
    { role: 'accent', weight: 33 },
  ]);
  assert.equal(r.pass, false);
  assert.ok(r.errors.some((e) => e.code === 'PALETTE_DOMINANCE'));
});

test('dominance check rejects multiple accents', () => {
  const r = checkDominance([
    { role: 'dominant', weight: 60 },
    { role: 'secondary', weight: 20 },
    { role: 'accent', weight: 10 },
    { role: 'accent', weight: 10 },
  ]);
  assert.ok(r.errors.some((e) => e.code === 'PALETTE_MULTI_ACCENT'));
});

test('dominance check rejects weights that do not sum to 100', () => {
  const r = checkDominance([{ role: 'dominant', weight: 60 }, { role: 'secondary', weight: 20 }]);
  assert.ok(r.errors.some((e) => e.code === 'PALETTE_WEIGHTS'));
});

test('deriveRamp produces 9 stops with monotonic darkening, all in gamut', () => {
  const ramp = deriveRamp(250, 0.16);
  assert.equal(ramp.length, 9);
  assert.equal(ramp[0].shade, 100);
  assert.equal(ramp[8].shade, 900);
  for (const stop of ramp) {
    assert.equal(stop.inGamut, true, `${stop.shade} out of gamut: ${stop.hex}`);
  }
  // Contrast against white RISES as L falls, so the series must be non-decreasing.
  const lums = ramp.map((s) => contrastRatio(s.hex, '#FFFFFF'));
  for (let i = 1; i < lums.length; i += 1) {
    assert.ok(lums[i] >= lums[i - 1] - 0.001, `stop ${ramp[i].shade} not darker than previous`);
  }
});
