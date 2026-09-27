// Generic strip generator: deck/<slug>/assets/sNN.svg from storyline.md.
//
// Replaces the hand-coded deck #1 scenes with one function per layout id, so a new
// deck is a storyline edit rather than a rewrite. Build stays transcription: every
// string drawn here comes from the storyline's `diagram` block or its `body` line.
//
// Geometry contract (see deck/*/design-spec.md, all deck-agnostic):
//   strip 1232x460; content band TOP=120 .. BOT=410; caption top at 422.
//   A filled block that has a caption under it must END at or above 366.
//   Largest strip text <= 44px so it never competes with the pptx title.
//   Text colour follows the FIELD: light field -> dark ink, dark field -> light ink.
//   (A light stroke on a light field is invisible but still valid — that shipped once.)
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { baseline } from '../cli/lib/svg-geometry.js';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('usage: node scripts/make-assets.js <kebab-slug>');
  process.exit(1);
}

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\//, ''));
const DECK = path.join(ROOT, 'deck', slug);
const OUT = path.join(DECK, 'assets');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'deckto.config.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

const storyline = YAML.parse(fs.readFileSync(path.join(DECK, 'storyline.md'), 'utf8'));
const bodyOf = (n) => storyline.slides.find((s) => s.slide === n).body;

// Palette comes from deck/<slug>/theme.json (written from design-spec.md and
// validated with `deckto theme contrast`). Kept separate so two decks can differ.
const themePath = path.join(DECK, 'theme.json');
if (!fs.existsSync(themePath)) {
  console.error(`missing ${themePath} — write it from design-spec.md before generating assets`);
  process.exit(1);
}
const D = JSON.parse(fs.readFileSync(themePath, 'utf8'));

// Normalise the field aliases the layout functions expect. theme.json stores the
// palette by ramp role (dominant/secondary); the layouts think in field terms
// (light/dark). Without this map D.light is undefined, label() emits fill="undefined",
// and a dark slide silently renders black-on-navy — invisible in static QA, obvious
// only once the slide is rendered.
D.dark = D.dark ?? D.dominant;
D.light = D.light ?? D.secondary;

const W = 1232;
const H = 460;
const TOP = 120;
const BOT = 410;
const CAPTION_Y = 422;
const MAX_LABEL_PX = 44;
const DARK_LAYOUTS = new Set(['title-dark', 'stat-callout']);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Text baseline from a top coordinate — cli/lib/svg-geometry.js owns this so no
// call site can reintroduce the top/baseline confusion that shifted a whole deck.
const label = (x, y, text, opts = {}) => {
  const { size = 30, color = D.light, weight = 'normal', anchor = 'start' } = opts;
  const px = Math.min(size, MAX_LABEL_PX);
  return `<text x="${x}" y="${baseline(y, px)}" font-family="Segoe UI, Arial" font-size="${px}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(text)}</text>`;
};

const box = (x, y, w, h, fill, stroke, rx = 14) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke || 'none'}" stroke-width="3"/>`;

const caption = (n, color) => label(16, CAPTION_Y, bodyOf(n), { size: 34, color });

// Wrap text to fit a pixel width at a given size. Rough but stable: monospace-ish
// advance of 0.55em keeps long storyline copy inside its column.
const wrap = (text, size, maxWidth) => {
  const perChar = size * 0.55;
  const max = Math.max(1, Math.floor(maxWidth / perChar));
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line ? line + ' ' : '').length + w.length > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const wrapLabel = (x, y, text, size, color, maxWidth, lineHeight = 1.22) =>
  wrap(text, size, maxWidth)
    .map((l, i) => label(x, y + i * size * lineHeight, l, { size, color }))
    .join('\n  ');

const svg = (body, dark) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${dark ? D.dominant : D.secondary}"/>
  ${body}
</svg>`;

// ---------------------------------------------------------------------------
// Layout functions. `d` is the slide's `diagram` block from the storyline.
// Ink colour is derived from the field, never hard-coded, so a light-field layout
// cannot accidentally draw in the light tone.
// ---------------------------------------------------------------------------

// title-dark: the opening/closing composition. Accent bar + one large line.
function titleDark(s, d) {
  const ink = D.light;
  return svg(`
  <line x1="16" y1="${TOP}" x2="1216" y2="${TOP}" stroke="${ink}" stroke-width="2" opacity="0.35"/>
  <rect x="16" y="180" width="8" height="150" rx="4" fill="${D.accent}"/>
  ${label(60, 196, s.body, { size: 44, weight: 'bold', color: ink })}
  ${d.sub ? label(60, 268, d.sub, { size: 30, color: ink }) : ''}`, true);
}

// comparison-columns: two bordered pillars. Left uses the strong border, right the
// accent — both must be visible against the field they sit on.
// The pillar must END at 366 (the caption block limit), not at BOT=410: four lines
// of text starting at 250 ran to ~414, past the box and onto the caption at 422.
function comparisonColumns(s, d) {
  const ink = D.dominant;
  const border = ink;                       // visible on the light field
  const rightBorder = D.accentLight;        // tinted variant that still passes
  const colW = 560;
  const colH = 366 - TOP;                   // 246 — leaves 56px clear above the caption
  const [L, R] = d.columns;
  const lines = (col, x) =>
    col.lines
      .map((t, i) => label(x, 196 + i * 44, t, { size: 28, color: ink }))
      .join('\n  ');
  return svg(`
  ${box(16, TOP, colW, colH, 'none', border)}
  ${label(52, 140, L.heading, { size: 40, weight: 'bold', color: ink })}
  ${lines(L, 52)}
  ${box(640, TOP, colW, colH, 'none', rightBorder)}
  ${label(676, 140, R.heading, { size: 40, weight: 'bold', color: D.accentLight })}
  ${lines(R, 676)}
  ${caption(s.slide, ink)}`, false);
}

// flow-diagram: 2-4 ordered steps with arrows between them.
function flowDiagram(s, d) {
  const ink = D.dominant;
  const steps = d.steps;
  const gap = 46;                           // room for a readable arrow inside the gap
  const w = (1184 - gap * (steps.length - 1)) / steps.length;
  const h = 150;
  const y = TOP + 40;
  const parts = steps.map((st, i) => {
    const x = 16 + i * (w + gap);
    const filled = i === 0;
    const body = box(x, y, w, h, filled ? ink : 'none', ink);
    const txt = label(x + w / 2, y + 44, st.label, {
      size: Math.min(MAX_LABEL_PX, 34),
      weight: 'bold',
      color: filled ? D.light : ink,
      anchor: 'middle',
    });
    const sub = st.sub
      ? label(x + w / 2, y + 96, st.sub, { size: 24, color: filled ? D.light : ink, anchor: 'middle' })
      : '';
    const arrow =
      i < steps.length - 1
        ? (() => {
            // The arrow must live entirely in the gap [x+w, x+w+gap]. It used to run
            // to x+w+gap+24, which drew the arrowhead 24px INSIDE the next box.
            const cy = y + h / 2;
            const base = x + w + gap - 16;
            const tip = x + w + gap - 4;
            return (
              `<line x1="${x + w + 3}" y1="${cy}" x2="${base}" y2="${cy}" stroke="${D.accentLight}" stroke-width="6"/>` +
              `<polygon points="${base},${cy - 14} ${tip},${cy} ${base},${cy + 14}" fill="${D.accentLight}"/>`
            );
          })()
        : '';
    return `${body}\n  ${txt}\n  ${sub}\n  ${arrow}`;
  });
  return svg(`
  ${parts.join('\n  ')}
  ${caption(s.slide, ink)}`, false);
}

// icon-rows: 2-6 rows of circle + label + note. Row box borders follow the field.
// Row height and type size adapt to the row count: the caption band is fixed, so a
// six-row list must shrink rather than spill under the caption or climb above TOP.
function iconRows(s, d) {
  const ink = D.dominant;
  const rows = d.rows;
  const gap = 12;
  const bandTop = TOP;
  const bandBottom = CAPTION_Y - 36;
  const band = bandBottom - bandTop;
  const rowH = Math.max(44, Math.min(84, Math.floor((band - (rows.length - 1) * gap) / rows.length)));
  const labelSize = Math.min(36, rowH - 10);
  // The note must never be taller than its row. Two lines at 26px need 63px of a
  // 48px row, which bled notes across the borders; derive the size from the row and
  // require the wrap to fit one line when the row is short.
  const noteSize = Math.max(15, Math.min(26, Math.floor(rowH / 1.9)));
  const totalH = rows.length * rowH + (rows.length - 1) * gap;
  const startY = bandTop + Math.max(0, (band - totalH) / 2);
  // The note column starts after the widest label, not at a fixed x: slide 4's labels
  // ("Level 2 · instructions") need room up to ~470px while slide 7's ("Code review")
  // need ~330, and a fixed 640 left the short-label rows with a cramped note column
  // whose 45-char notes wrapped out of their rows.
  const widestLabel = Math.max(...rows.map((r) => String(r.label).length)) * labelSize * 0.55;
  const noteX = Math.min(900, Math.ceil(112 + widestLabel + 48));
  const noteW = 1216 - noteX;
  const body = rows
    .map((r, i) => {
      const y = startY + i * (rowH + gap);
      const active = i === 0;
      const stroke = active ? D.accentLight : ink;
      // Centre each text block in its own row — label() takes a top coordinate.
      const labelTop = y + Math.round((rowH - labelSize) / 2);
      const noteTop = y + Math.round((rowH - noteSize) / 2);
      const numSize = Math.min(30, rowH - 20);
      // Wrap inside the column, then truncate if even the wrapped lines outrun the row.
      let noteLines = r.note ? wrap(r.note, noteSize, noteW) : [];
      const maxLines = Math.max(1, Math.floor(rowH / (noteSize * 1.22)));
      if (noteLines.length > maxLines) {
        noteLines = noteLines.slice(0, maxLines);
        const last = noteLines.length - 1;
        noteLines[last] = `${noteLines[last].replace(/[.,;:]$/, '')}…`;
      }
      const blockTop = noteLines.length > 1
        ? y + Math.round((rowH - noteLines.length * noteSize * 1.22) / 2)
        : noteTop;
      const noteSvg = noteLines
        .map((l, li) => label(noteX, blockTop + li * noteSize * 1.22, l, { size: noteSize, color: ink }))
        .join('\n  ');
      return `
  ${box(16, y, 1200, rowH, 'none', stroke)}
  <circle cx="66" cy="${y + rowH / 2}" r="${Math.min(22, rowH / 2 - 4)}" fill="none" stroke="${stroke}" stroke-width="3"/>
  ${label(66, y + rowH / 2 - Math.round(numSize * 0.7), String(i + 1), { size: numSize, weight: 'bold', color: stroke, anchor: 'middle' })}
  ${label(112, labelTop, r.label, { size: labelSize, weight: 'bold', color: ink })}
  ${noteSvg}`;
    })
    .join('\n');
  return svg(`${body}\n  ${caption(s.slide, ink)}`, false);
}

// chart-focus: horizontal bars scaled to the largest value, or a checklist panel.
function chartFocus(s, d) {
  const ink = D.dominant;
  if (d.checklist) {
    const items = d.checklist;
    const gap = 10;
    // Same adaptive sizing as icon-rows: the band above the caption is fixed, so the
    // row height must fall out of the item count. Four fixed 66px rows ran to y=430
    // and landed on the caption at 422.
    const bandTop = TOP;
    const bandBottom = CAPTION_Y - 36;
    const band = bandBottom - bandTop;
    const rowH = Math.max(38, Math.min(66, Math.floor((band - (items.length - 1) * gap) / items.length)));
    const totalH = items.length * rowH + (items.length - 1) * gap;
    const startY = bandTop + Math.max(0, (band - totalH) / 2);
    const size = Math.min(32, rowH - 12);
    const body = items
      .map((t, i) => {
        const y = startY + i * (rowH + gap);
        const boxSize = Math.min(40, rowH - 8);
        return `
  <rect x="16" y="${y + (rowH - boxSize) / 2}" width="${boxSize}" height="${boxSize}" rx="8" fill="${i === 0 ? D.accentLight : 'none'}" stroke="${ink}" stroke-width="3"/>
  ${label(16 + boxSize / 2, y + (rowH - boxSize) / 2 + Math.round(boxSize * 0.16), '✓', { size: Math.min(30, boxSize - 8), weight: 'bold', color: i === 0 ? D.light : ink, anchor: 'middle' })}
  ${label(80, y + Math.round((rowH - size) / 2), t, { size, color: ink })}`;
      })
      .join('\n');
    return svg(`${body}\n  ${caption(s.slide, ink)}`, false);
  }

  const bars = d.bars;
  const max = Math.max(...bars.map((b) => b.value), 1);
  const labelW = 340;
  const trackX = 16 + labelW;
  const trackW = 1184 - labelW;
  const barH = 54;
  const gap = 26;
  const startY = TOP + 30;
  const body = bars
    .map((b, i) => {
      const y = startY + i * (barH + gap);
      const w = Math.max(8, Math.round((b.value / max) * trackW));
      const fill = i === 0 ? D.accentLight : ink;
      const text = b.caption ?? String(b.value);
      // A full-width bar leaves no room to its right: drawing the caption at
      // trackX+w+16 puts it past the 1232px canvas and it is clipped away. Put it
      // inside the bar whenever the bar can hold it, outside otherwise.
      const textW = Math.ceil(String(text).length * 30 * 0.55);
      const fitsInside = w >= textW + 32;
      const captionEl = fitsInside
        ? label(trackX + w - 16, y + 14, text, { size: 30, weight: 'bold', color: D.light, anchor: 'end' })
        : label(trackX + w + 16, y + 14, text, { size: 30, weight: 'bold', color: ink });
      return `
  ${label(16, y + 14, b.label, { size: 30, color: ink })}
  ${box(trackX, y, trackW, barH, 'none', ink, 10)}
  <rect x="${trackX}" y="${y}" width="${w}" height="${barH}" rx="10" fill="${fill}"/>
  ${captionEl}`;
    })
    .join('\n');
  return svg(`${body}\n  ${caption(s.slide, ink)}`, false);
}

// stat-callout: one dominant number on the dark field, context beneath it.
// The stat deliberately bypasses MAX_LABEL_PX: design-spec sets stat callouts at 60pt
// and this slide's whole job is to be one number. 60pt in the strip = 60/72 in × 106.8
// px/in ≈ 89px. The cap exists for ordinary strip copy, not for the callout itself.
function statCallout(s, d) {
  const ink = D.light;
  const statSize = 89;
  const labelSize = 30;
  const lineHeight = 1.22;
  // The tail cannot sit at a fixed y: statLabel wraps to 1, 2 or 3 lines depending on
  // the copy, and a hard-coded 350 collided with the second line (caught in the render
  // pass, invisible to static QA). Derive the tail's top from the wrapped label height.
  const labelLines = d.statLabel ? wrap(d.statLabel, labelSize, 1160).length : 0;
  const labelBottom = 285 + labelLines * labelSize * lineHeight;
  const tailY = Math.max(350, Math.ceil(labelBottom + 12));
  return svg(`
  <line x1="16" y1="${TOP}" x2="1216" y2="${TOP}" stroke="${ink}" stroke-width="2" opacity="0.35"/>
  ${label(16, 160, d.stat, { size: statSize, weight: 'bold', color: D.accent })}
  ${d.statLabel ? wrapLabel(16, 285, d.statLabel, labelSize, ink, 1160) : ''}
  ${d.tail ? wrapLabel(16, tailY, d.tail, 26, ink, 1160) : ''}
  ${caption(s.slide, ink)}`, true);
}

const LAYOUTS = {
  'title-dark': titleDark,
  'comparison-columns': comparisonColumns,
  'flow-diagram': flowDiagram,
  'icon-rows': iconRows,
  'chart-focus': chartFocus,
  'stat-callout': statCallout,
};

// ---------------------------------------------------------------------------
let failed = 0;
for (const s of storyline.slides) {
  const fn = LAYOUTS[s.layout];
  if (!fn) {
    console.error(`slide ${s.slide}: unknown layout "${s.layout}"`);
    failed++;
    continue;
  }
  if (!s.diagram) {
    console.error(`slide ${s.slide}: missing diagram block for layout "${s.layout}"`);
    failed++;
    continue;
  }
  const dark = DARK_LAYOUTS.has(s.layout);
  const file = path.join(OUT, `s${String(s.slide).padStart(2, '0')}.svg`);
  fs.writeFileSync(file, fn(s, s.diagram), 'utf8');
}

if (failed) {
  console.error(`${failed} slide(s) failed to render`);
  process.exit(1);
}
console.log(`${storyline.slides.length} strips -> ${OUT}`);
