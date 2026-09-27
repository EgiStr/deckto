// Dogfood asset generator: 12 SVG strips (1232x460) for the deckto-pitch deck.
// Composition contract (avoids duplication between image and pptx text):
//   pptx  -> title (selectable, QA-checked) + notes (INSIGHT) + footer
//   this  -> diagram + the slide's body line (from storyline.md)
// Dark slides (title-dark, stat-callout) use the dominant background so the strip
// blends into the slide field; light slides use the secondary background.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { baseline } from '../cli/lib/svg-geometry.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\//, ''));
const DECK = path.join(ROOT, 'deck', 'deckto-pitch');
const OUT = path.join(DECK, 'assets');
fs.mkdirSync(OUT, { recursive: true });

const storyline = YAML.parse(fs.readFileSync(path.join(DECK, 'storyline.md'), 'utf8'));
const bodyOf = (n) => storyline.slides.find((s) => s.slide === n).body;

const D = { dark: '#1B3A2F', light: '#F4F1E8', accent: '#E4572E', accentLight: '#C2410C' };
const W = 1232;
const H = 460;
const DARK_LAYOUTS = new Set(['title-dark', 'stat-callout']);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// label() takes a TOP coordinate (the box convention used throughout the scenes) and
// converts to SVG's baseline origin via the shared helper. Authoring "y=200" as a
// baseline silently shifted every scene down ~40px and made multi-line rows collide.
const label = (x, y, text, opts = {}) => {
  const { size = 30, color = D.light, weight = 'normal', anchor = 'start' } = opts;
  return `<text x="${x}" y="${baseline(y, size)}" font-family="Segoe UI, Arial" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(text)}</text>`;
};

const box = (x, y, w, h, fill, stroke, rx = 14) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke || 'none'}" stroke-width="3"/>`;

// Vertical rhythm: the strip sits under the pptx title block (no dead space at top,
// nothing floating in the middle). Content occupies y=120..410, caption at y=436.
const TOP = 120;
const BOT = 410;

// Caption = the storyline's body line, bottom-left of the strip (top coord; the
// baseline conversion must keep its descenders inside H=460).
const caption = (n, color) => label(16, BOT + 12, bodyOf(n), { size: 34, color });

const wrap = (body, dark) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${dark ? D.dark : D.light}"/>
${body}
</svg>`;

const scenes = {};

// s01 (title-dark) — supporting composition under the title, no title duplication
// Composition rule: the strip never competes with the pptx title. Its largest text
// stays at caption scale so the title remains the single visual anchor.
scenes[1] = wrap(`
  <line x1="16" y1="${TOP}" x2="1216" y2="${TOP}" stroke="${D.light}" stroke-width="2" opacity="0.35"/>
  <rect x="16" y="180" width="8" height="150" rx="4" fill="${D.accent}"/>
  ${label(60, 237, bodyOf(1), { size: 52, weight: 'bold', color: D.light })}`, true);

// s02 — polished vs arguing. Light-field: left pillar outlines in D.dark (a D.light
// stroke vanishes on the D.light background), right pillar carries the accent.
scenes[2] = wrap(`
  ${box(16, TOP, 560, BOT - TOP, 'none', D.dark)}
  ${label(52, 190, 'Polished', { size: 44, weight: 'bold', color: D.dark })}
  ${label(52, 250, 'layout · colour · type', { size: 30, color: D.dark })}
  ${label(52, 320, 'solved', { size: 32, color: D.dark })}
  ${box(640, TOP, 560, BOT - TOP, 'none', D.accentLight)}
  ${label(676, 190, 'Arguing', { size: 44, weight: 'bold', color: D.accentLight })}
  ${label(676, 250, 'claim · evidence · so-what', { size: 30, color: D.dark })}
  ${label(676, 320, 'not solved', { size: 32, color: D.accentLight })}
  ${caption(2, D.dark)}`, false);

// s03 — label vs assertion (pillar y in TOP..BOT, text inside the pillar)
scenes[3] = wrap(`
  ${label(16, 142, 'Label title', { size: 28, color: D.dark })}
  ${box(16, 182, 560, 158, 'none', D.dark)}
  ${label(52, 236, '"Market"', { size: 52, color: D.dark })}
  ${label(16, 360, 'states nothing', { size: 32, color: D.accentLight })}
  ${label(640, 142, 'Assertion title', { size: 28, color: D.dark })}
  ${box(640, 182, 560, 158, 'none', D.accentLight)}
  ${label(676, 244, '"We start one crop"', { size: 44, color: D.dark })}
  ${label(640, 360, 'states a claim', { size: 32, color: D.accentLight })}
  ${caption(3, D.dark)}`, false);

// s04 — pitch-me -> grinding (vertically centered in the 120..330 blocks)
scenes[4] = wrap(`
  ${box(16, TOP, 500, 210, D.dark)}
  ${label(266, 168, 'pitch-me', { size: 48, weight: 'bold', color: D.light, anchor: 'middle' })}
  ${label(266, 235, 'extract the idea', { size: 30, color: D.light, anchor: 'middle' })}
  ${box(700, TOP, 500, 210, D.dark)}
  ${label(950, 168, 'grinding', { size: 48, weight: 'bold', color: D.light, anchor: 'middle' })}
  ${label(950, 235, 'grind into a spine', { size: 30, color: D.light, anchor: 'middle' })}
  <line x1="540" y1="225" x2="676" y2="225" stroke="${D.accentLight}" stroke-width="6"/>
  <polygon points="676,211 706,225 676,239" fill="${D.accentLight}"/>
  ${caption(4, D.dark)}`, false);

// s05 — a real failing finding (terminal). All four lines stay inside the
// 120..366 block and the block clears the caption at 412.
scenes[5] = wrap(`
  <rect x="16" y="${TOP}" width="1200" height="246" rx="12" fill="#12271F"/>
  ${label(48, 150, '$ npx deckto qa storyline deck/x/storyline.md', { size: 32, color: D.light })}
  ${label(48, 210, '[INSIGHT_EMPTY] slide 6 — trivial (7 chars < 10)', { size: 32, color: D.accent })}
  ${label(48, 268, 'fix: write a real so-what, or cut the slide', { size: 30, color: D.light })}
  ${label(48, 314, 'exit 1 — handoff blocked until fixed', { size: 28, color: D.accentLight })}
  ${caption(5, D.dark)}`, false);

// s06 — frozen insight line
scenes[6] = wrap([0, 1, 2].map((i) => {
  const y = TOP + i * 98;
  const t = ['written at build time', 'first line of every slide notes', 'never rewritten by humanizer'][i];
  return `${box(16, y, 1200, 84, 'none', i === 0 ? D.accentLight : D.dark)}
    <circle cx="70" cy="${y + 42}" r="20" fill="${i === 0 ? D.accentLight : 'none'}" stroke="${i === 0 ? D.accentLight : D.dark}" stroke-width="3"/>
    ${label(120, y + 29, t, { size: 36, color: D.dark })}`;
}).join('\n  ') + `\n  ${caption(6, D.dark)}`, false);

// s07 — font floors (stat-callout): numbers 150..250 / 285..385, labels centered
scenes[7] = wrap(`
  ${label(16, 150, '36', { size: 110, weight: 'bold', color: D.accent })}
  ${label(260, 170, 'pt minimum title', { size: 52, color: D.light })}
  ${label(16, 285, '14', { size: 110, weight: 'bold', color: D.accent })}
  ${label(260, 305, 'pt minimum body', { size: 52, color: D.light })}
  ${caption(7, D.light)}`, true);

// s08 — scope routing
scenes[8] = wrap([0, 1, 2].map((i) => {
  const y = TOP + i * 98;
  const t = ['storyline  ->  grinding', 'assets  ->  assets-generator', 'deck  ->  build'];
  return `${box(16, y, 1200, 84, 'none', D.dark)}
    ${label(56, y + 29, t[i], { size: 36, color: D.dark })}
    ${label(1176, y + 36, 'ITERATE', { size: 26, color: D.accentLight, anchor: 'end' })}`;
}).join('\n  ') + `\n  ${caption(8, D.dark)}`, false);

// s09 — dependencies
scenes[9] = wrap(['Node 18+   required', 'LibreOffice   render QA only', 'Poppler   render QA only'].map((t, i) => {
  const y = TOP + i * 98;
  return `${box(16, y, 1200, 84, 'none', D.dark)}
    <circle cx="70" cy="${y + 42}" r="18" fill="none" stroke="${D.accentLight}" stroke-width="4"/>
    ${label(120, y + 29, t, { size: 36, color: D.dark })}`;
}).join('\n  ') + `\n  ${caption(9, D.dark)}`, false);

// s10 — install (CTA). Block 120..350, caption top 422.
scenes[10] = wrap(`
  <rect x="16" y="${TOP}" width="1200" height="230" rx="12" fill="#12271F"/>
  ${label(56, 150, '$ npx deckto init my-idea', { size: 44, color: D.accent })}
  ${label(56, 228, 'deck/<slug>/ with pitch, storyline, design-spec, usecase-flow', { size: 26, color: D.light })}
  ${label(56, 296, 'or install the plugin — all 8 skills', { size: 36, color: D.light })}
  ${caption(10, D.dark)}`, false);

// s11 — the four-stage loop (content centered in 120..330)
scenes[11] = wrap(['pitch', 'grind', 'build', 'review'].map((t, i) => {
  const x = 16 + i * 306;
  return `${box(x, TOP, 260, 210, D.dark)}
    ${label(x + 130, 182, t, { size: 44, weight: 'bold', color: D.light, anchor: 'middle' })}
    ${label(x + 130, 245, 'gate', { size: 28, color: D.accent, anchor: 'middle' })}
    ${i < 3 ? `<line x1="${x + 260}" y1="225" x2="${x + 306}" y2="225" stroke="${D.accentLight}" stroke-width="5"/>` : ''}`;
}).join('\n  ') + `\n  ${caption(11, D.dark)}`, false);

// s12 — closing thesis support (title lives in pptx)
scenes[12] = wrap(`
  <line x1="16" y1="${TOP}" x2="1216" y2="${TOP}" stroke="${D.light}" stroke-width="2" opacity="0.35"/>
  <rect x="16" y="180" width="8" height="150" rx="4" fill="${D.accent}"/>
  ${label(60, 237, bodyOf(12), { size: 52, weight: 'bold', color: D.light })}`, true);

for (const [n, svg] of Object.entries(scenes)) {
  fs.writeFileSync(path.join(OUT, `s${String(n).padStart(2, '0')}.svg`), svg, 'utf8');
}
console.log(`wrote ${Object.keys(scenes).length} svg strips to ${OUT}`);
