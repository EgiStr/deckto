// Static QA: read .pptx (a zip) and check slide XML + notes XML against deckto.config.json.
import fs from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';

const NOTE_REF_RE = /<p:notesSlide r:id="([^"]+)"/g;

export function loadDeck(file) {
  const buf = fs.readFileSync(file);
  const zip = unzipSync(new Uint8Array(buf));

  const slides = Object.keys(zip)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => num(a) - num(b))
    .map((n) => strFromU8(zip[n]));

  const notes = Object.keys(zip)
    .filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n))
    .sort((a, b) => num(a) - num(b))
    .map((n) => strFromU8(zip[n]));

  // relationship maps: slideN -> notesSlideN
  const rels = {};
  for (const name of Object.keys(zip)) {
    const m = name.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/);
    if (!m) continue;
    const xml = strFromU8(zip[name]);
    const target = xml.match(/Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/);
    if (target) rels[Number(m[1])] = target[1];
  }

  return { slides, notes, rels, zip };
}

function num(n) {
  const m = n.match(/(\d+)\.xml$/);
  return m ? Number(m[1]) : 0;
}

// All text runs with their pt size, plus embedded pictures/shapes per slide.
export function analyzeSlide(xml) {
  const runs = [];
  const paragraphs = [];
  const re = /<a:r>([\s\S]*?)<\/a:r>/g;
  let m;
  while ((m = re.exec(xml))) {
    const chunk = m[1];
    const t = chunk.match(/<a:t>([\s\S]*?)<\/a:t>/);
    const sz = chunk.match(/sz="(\d+)"/);
    if (t) {
      runs.push({
        text: decode(t[1]),
        pt: sz ? Number(sz[1]) / 100 : null, // DrawingML sz is in hundredths of a point
      });
    }
  }
  const pRe = /<a:p>([\s\S]*?)<\/a:p>/g;
  while ((m = pRe.exec(xml))) {
    const texts = [...m[1].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((x) => decode(x[1]));
    if (texts.length) paragraphs.push(texts.join(''));
  }
  const pictures = (xml.match(/<p:pic>/g) || []).length;
  const shapes = (xml.match(/<p:sp>/g) || []).length;
  const charts = (xml.match(/<c:chart/g) || []).length;
  return { runs, paragraphs, pictures, shapes, charts, hasVisual: pictures + charts > 0 };
}

function decode(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function notesText(xml) {
  return [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decode(m[1])).join('\n');
}

// Classify: title = runs at/above the title floor; everything else is body.
// Using the config floor (not per-slide max) is deliberate: a slide whose *only*
// text is tiny has no title at all, so its runs are body and must be checked.
export function classifyRuns(runs, cfg) {
  const sized = runs.filter((r) => r.pt != null);
  return {
    title: sized.filter((r) => r.pt >= cfg.fonts.minTitlePt),
    body: sized.filter((r) => r.pt < cfg.fonts.minTitlePt),
    all: sized,
  };
}

export function runChecks(file, cfg) {
  const deck = loadDeck(file);
  const findings = [];
  const perSlide = [];

  deck.slides.forEach((xml, i) => {
    const slideNo = i + 1;
    const info = analyzeSlide(xml);
    const { body } = classifyRuns(info.runs, cfg);

    // FONTSIZE_LOW — any body run below the floor
    for (const r of body) {
      if (r.pt != null && r.pt < cfg.fonts.minBodyPt) {
        findings.push({
          code: 'FONTSIZE_LOW',
          slide: slideNo,
          scope: 'deck',
          detail: `${r.pt}pt below floor ${cfg.fonts.minBodyPt}pt: "${r.text.slice(0, 60)}"`,
          fix: 'Raise font size in design-spec and rebuild the deck.',
        });
        break;
      }
    }

    // WORDS_OVER_BUDGET — body paragraph word count
    const bodyWords = body.reduce((n, r) => n + r.text.trim().split(/\s+/).filter(Boolean).length, 0);
    const totalWords = info.paragraphs.join(' ').trim().split(/\s+/).filter(Boolean).length;
    const words = bodyWords || totalWords;
    if (words > cfg.words.maxBodyPerSlide) {
      findings.push({
        code: 'WORDS_OVER_BUDGET',
        slide: slideNo,
        scope: 'storyline',
        detail: `${words} body words exceeds budget ${cfg.words.maxBodyPerSlide}`,
        fix: 'Trim slide copy in storyline.md and move detail into speaker notes.',
      });
    }

    // VISUAL_MISSING — no image/chart on the slide
    if (!info.hasVisual && cfg.visual.minElementsPerSlide > 0 && info.pictures + info.charts < cfg.visual.minElementsPerSlide) {
      findings.push({
        code: 'VISUAL_MISSING',
        slide: slideNo,
        scope: 'assets',
        detail: `no image or chart on slide (need >= ${cfg.visual.minElementsPerSlide})`,
        fix: 'Add a visual element via assets-generator.',
      });
    }

    // INSIGHT — notes-slide first line must be "INSIGHT: <content>"
    const notesName = deck.rels[slideNo];
    const notesXml = notesName ? deck.notes.find((n, idx) => `notesSlide${idx + 1}.xml` === notesName) : null;
    if (!notesXml) {
      findings.push({
        code: 'INSIGHT_MISSING',
        slide: slideNo,
        scope: 'storyline',
        detail: 'slide has no speaker notes; no INSIGHT line',
        fix: 'Write notes_draft in storyline.md; build must emit INSIGHT: as the first notes line.',
      });
    } else {
      const firstLine = notesText(notesXml).split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? '';
      if (!/^INSIGHT:/.test(firstLine)) {
        findings.push({
          code: 'INSIGHT_MISSING',
          slide: slideNo,
          scope: 'storyline',
          detail: `notes first line is not an INSIGHT line: "${firstLine.slice(0, 60)}"`,
          fix: 'Ensure build writes "INSIGHT: <insight>" as the first line of speaker notes.',
        });
      } else if (firstLine.replace(/^INSIGHT:/, '').trim().length === 0) {
        findings.push({
          code: 'INSIGHT_EMPTY',
          slide: slideNo,
          scope: 'storyline',
          detail: 'INSIGHT line present but empty',
          fix: 'Fill the insight field in storyline.md.',
        });
      }
    }

    perSlide.push({ slide: slideNo, words, pictures: info.pictures, charts: info.charts });
  });

  return { findings, perSlide, slideCount: deck.slides.length };
}
