// build: the single entry point for producing a deck. Transcribes storyline.md +
// theme.json into deck.pptx (and optionally the self-contained web/index.html).
//
// The pptx path is a line-for-line transcription of the script it replaces:
// npm's files allowlist ships cli/ and skills/ but not scripts/, so the script
// was unreachable from npx. test/build.test.js asserts equivalence between the
// two while this file still exists; once it is deleted, that test guards the
// storyline -> pptx transcription directly.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import PptxGenJS from 'pptxgenjs';
import { okEnvelope, failEnvelope, emit } from '../lib/envelope.js';
import { renderWeb } from '../lib/web-renderer.js';

const SLUG_RE = /^[a-z0-9-]+$/;
const ASSET_SIZE = '1232/460';

export async function run(args, ctx) {
  const command = 'build';
  const positionals = args.filter((a) => !a.startsWith('--'));
  const slug = positionals[0];

  if (slug === undefined) {
    const msg = 'build requires <slug>. Usage: deckto build <slug> [--out <file>] [--web] [--all]';
    emit(failEnvelope(command, ctx.version, msg), ctx, msg);
    process.stderr.write(msg + '\n');
    return 1;
  }
  if (!SLUG_RE.test(slug)) {
    const msg = `deckto build expects a kebab-case slug, got "${slug}"`;
    emit(failEnvelope(command, ctx.version, msg), ctx, msg);
    process.stderr.write(msg + '\n');
    return 1;
  }

  // Format selection: no flag builds pptx only (the historical behaviour),
  // --web builds only the HTML, --all builds both.
  const wantAll = args.includes('--all');
  const wantPptx = wantAll || !args.includes('--web');
  const wantWeb = wantAll || args.includes('--web');

  // The deck belongs to the caller, not to the package: `deckto init` writes
  // deck/<slug>/ under the working directory and every other command reads the
  // user's files from there. Resolving against ctx.root made an installed user's
  // deck invisible — the command reported missing node_modules/deckto/deck/...
  // for a deck sitting in the directory it was run from.
  const DECK = path.join(process.cwd(), 'deck', slug);
  const storylinePath = path.join(DECK, 'storyline.md');
  const themePath = path.join(DECK, 'theme.json');
  const missing = [storylinePath, themePath].filter((p) => !fs.existsSync(p));
  if (missing.length) {
    const msg = `missing ${missing.join(', ')}`;
    emit(failEnvelope(command, ctx.version, msg), ctx, msg);
    process.stderr.write(msg + '\n');
    return 1;
  }

  const storyline = YAML.parse(fs.readFileSync(storylinePath, 'utf8'));
  const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(path.join(ctx.root, 'deckto.config.json'), 'utf8'));

  const data = { slug, slides: storyline.slides.length, pptx: null, bytes: 0, web: null, warnings: [] };

  if (wantPptx) {
    const outIdx = args.indexOf('--out');
    const out = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.join(DECK, 'deck.pptx');
    data.pptx = await buildPptx({ storyline, theme, cfg, deckDir: DECK, out });
    data.bytes = fs.statSync(out).size;
  }

  if (wantWeb) {
    const webPath = path.join(DECK, 'web', 'index.html');
    const html = renderWeb({
      storyline,
      theme,
      config: cfg,
      warn: (m) => data.warnings.push(m),
    });
    fs.mkdirSync(path.dirname(webPath), { recursive: true });
    fs.writeFileSync(webPath, html, 'utf8');
    data.web = webPath;
  }

  const text = data.pptx
    ? `built ${data.pptx} — ${data.slides} slides${data.web ? `\nbuilt ${data.web}` : ''}`
    : `built ${data.web} — ${data.slides} slides`;
  emit(okEnvelope(command, ctx.version, data), ctx, text);
  return 0;
}

async function buildPptx({ storyline, theme, cfg, deckDir, out }) {
  const T = {
    dominant: theme.dominant.replace('#', ''),
    secondary: theme.secondary.replace('#', ''),
    accent: theme.accent.replace('#', ''),
    accentLight: theme.accentLight.replace('#', ''),
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

  // Composition contract: the strip carries the body line + diagram; the pptx
  // carries title + footer + notes. Placed y=2.4, h = w / (1232/460).
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

    const assetPath = path.join(deckDir, 'assets', `s${String(s.slide).padStart(2, '0')}.png`);
    if (!fs.existsSync(assetPath)) {
      throw new Error(`GATE 2 violation: missing asset for slide ${s.slide} (${s.layout})`);
    }
    image(slide, assetPath);
    footer(slide, s, dark);

    // GATE 3: frozen INSIGHT line first, then the elaboration.
    slide.addNotes(`INSIGHT: ${s.insight}\n\n${s.notes_draft}`);
  }

  for (const s of storyline.slides) addSlide(s);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await pres.writeFile({ fileName: out });
  return out;
}
