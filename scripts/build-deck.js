// Builds deck/<slug>/deck.pptx from storyline.md + theme.json.
// Transcription only: every word, layout and colour comes from the storyline and the
// deck's own theme file — the same contract as the original deck-specific script,
// parameterised so any deck can be built without editing code.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import PptxGenJS from 'pptxgenjs';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('usage: node scripts/build-deck.js <kebab-slug>');
  process.exit(1);
}

const ROOT = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const DECK = path.join(ROOT, 'deck', slug);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'deckto.config.json'), 'utf8'));

const storylinePath = path.join(DECK, 'storyline.md');
const themePath = path.join(DECK, 'theme.json');
for (const p of [storylinePath, themePath]) {
  if (!fs.existsSync(p)) {
    console.error(`missing ${p}`);
    process.exit(1);
  }
}
const storyline = YAML.parse(fs.readFileSync(storylinePath, 'utf8'));

const T = {
  dominant: JSON.parse(fs.readFileSync(themePath, 'utf8')).dominant.replace('#', ''),
  secondary: JSON.parse(fs.readFileSync(themePath, 'utf8')).secondary.replace('#', ''),
  accent: JSON.parse(fs.readFileSync(themePath, 'utf8')).accent.replace('#', ''),
  accentLight: JSON.parse(fs.readFileSync(themePath, 'utf8')).accentLight.replace('#', ''),
  titleFont: 'Segoe UI',
  bodyFont: 'Segoe UI',
  minTitlePt: cfg.fonts.minTitlePt,
  minBodyPt: cfg.fonts.minBodyPt,
  statPt: cfg.fonts.statCalloutPt,
};

const pres = new PptxGenJS();
// LAYOUT_16x9 is 10 x 5.625in; these coordinates assume 13.333 x 7.5 => LAYOUT_WIDE.
pres.layout = 'LAYOUT_WIDE';
pres.author = 'deckto';
pres.title = storyline.master_title;

const W = 13.333;
const H = 7.5;
const M = 0.9;

// Motif: thin accent bar left of the title, field-appropriate accent.
function motif(slide, dark) {
  slide.addShape(pres.ShapeType.rect, {
    x: M, y: 1.05, w: 0.075, h: 1.15,
    fill: { color: dark ? T.accent : T.accentLight },
  });
}

function title(slide, text, dark) {
  slide.addText(text, {
    x: M + 0.3, y: 0.95, w: W - 2 * M - 0.3, h: 1.35,
    fontSize: T.minTitlePt, bold: true, fontFace: T.titleFont,
    color: dark ? T.secondary : T.dominant,
    align: 'left', valign: 'middle',
  });
}

// Composition contract: the strip carries the body line + diagram; the pptx carries
// title + footer + notes. Placed y=2.4, h = w / (1232/460) => ends at 6.70in.
function image(slide, file) {
  const w = W - 2 * M;
  slide.addImage({ path: file, x: M, y: 2.4, w, h: w / (1232 / 460) });
}

function footer(slide, s, dark) {
  const arc = String(s.arc).replace(/-/g, ' ');
  slide.addText(`${s.slide} / ${storyline.slides.length}   ·   ${arc}`, {
    x: M, y: H - 0.62, w: W - 2 * M, h: 0.35,
    fontSize: T.minBodyPt, fontFace: T.bodyFont,
    color: dark ? T.secondary : T.dominant, transparency: 40, align: 'left',
  });
}

function addSlide(s) {
  const slide = pres.addSlide();
  const dark = s.layout === 'title-dark' || s.layout === 'stat-callout';

  slide.background = { color: dark ? T.dominant : T.secondary };
  motif(slide, dark);
  title(slide, s.title, dark);

  const assetPath = path.join(DECK, 'assets', `s${String(s.slide).padStart(2, '0')}.png`);
  if (!fs.existsSync(assetPath)) {
    throw new Error(`GATE 2 violation: missing asset for slide ${s.slide} (${s.layout})`);
  }
  image(slide, assetPath);
  footer(slide, s, dark);

  // GATE 3: frozen INSIGHT line first, then the elaboration.
  slide.addNotes(`INSIGHT: ${s.insight}\n\n${s.notes_draft}`);
}

for (const s of storyline.slides) addSlide(s);

const out = path.join(DECK, 'deck.pptx');
await pres.writeFile({ fileName: out });
console.log(`built ${out} — ${storyline.slides.length} slides`);
