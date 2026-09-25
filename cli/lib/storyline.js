// Storyline QA: parse storyline.md (YAML) and enforce the grinding gates.
import fs from 'node:fs';
import YAML from 'yaml';

const REQUIRED = [
  'slide', 'title', 'point', 'insight', 'body',
  'visual', 'visual_source', 'evidence', 'layout', 'arc', 'notes_draft',
];
const ARCS = ['what-is', 'what-could-be', 'call-to-action', 'new-bliss'];
const SOURCES = ['existing', 'generate', 'research'];
const MIN_INSIGHT_CHARS = 10;

export function parseStoryline(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return YAML.parse(raw);
}

export function validateStoryline(file, cfg) {
  const errors = [];
  let doc;
  try {
    doc = parseStoryline(file);
  } catch (err) {
    return { errors: [{ code: 'YAML_INVALID', slide: null, detail: String(err.message) }], slideCount: 0, pass: false };
  }

  if (!doc || typeof doc !== 'object') {
    return { errors: [{ code: 'YAML_INVALID', slide: null, detail: 'not an object' }], slideCount: 0, pass: false };
  }

  const masterTitle = doc.master_title;
  if (!masterTitle || String(masterTitle).trim().length < 10) {
    errors.push({
      code: 'MASTER_TITLE_MISSING',
      slide: null,
      detail: 'master_title missing or shorter than 10 characters',
      fix: 'Write ONE controlling statement (Minto main line) before any slide.',
    });
  }

  const slides = doc.slides;
  if (!Array.isArray(slides) || slides.length === 0) {
    errors.push({ code: 'SLIDES_MISSING', slide: null, detail: 'slides array missing or empty' });
    return { errors, slideCount: 0, pass: false, masterTitle: masterTitle ?? null };
  }

  slides.forEach((s, i) => {
    const slide = s?.slide ?? i + 1;

    for (const field of REQUIRED) {
      if (s?.[field] === undefined || s?.[field] === null || String(s[field]).trim() === '') {
        errors.push({
          code: 'FIELD_MISSING',
          slide,
          detail: `required field "${field}" missing or empty`,
          fix: `Fill ${field} for slide ${slide}.`,
        });
      }
    }

    const insight = s?.insight === undefined || s?.insight === null ? '' : String(s.insight).trim();
    if (insight.length > 0 && insight.length < MIN_INSIGHT_CHARS) {
      errors.push({
        code: 'INSIGHT_EMPTY',
        slide,
        detail: `insight is trivial (${insight.length} chars < ${MIN_INSIGHT_CHARS})`,
        fix: 'Write a real so-what with a concrete anchor, or cut the slide.',
      });
    }

    const body = s?.body === undefined || s?.body === null ? '' : String(s.body).trim();
    if (body) {
      const words = body.split(/\s+/).filter(Boolean).length;
      if (words > cfg.words.maxBodyPerSlide) {
        errors.push({
          code: 'BODY_OVER_BUDGET',
          slide,
          detail: `${words} words exceeds budget ${cfg.words.maxBodyPerSlide}`,
          fix: 'Trim body copy; move detail into notes_draft.',
        });
      }
    }

    if (s?.arc !== undefined && !ARCS.includes(s.arc)) {
      errors.push({
        code: 'ARC_INVALID',
        slide,
        detail: `arc "${s.arc}" not one of ${ARCS.join(' | ')}`,
        fix: 'Tag the slide with a valid Duarte arc role.',
      });
    }

    if (s?.visual_source !== undefined && !SOURCES.includes(s.visual_source)) {
      errors.push({
        code: 'VISUAL_SOURCE_INVALID',
        slide,
        detail: `visual_source "${s.visual_source}" not one of ${SOURCES.join(' | ')}`,
        fix: 'Set visual_source from the pitch.md asset inventory.',
      });
    }
  });

  // Arc shape: must open on what-is and close on new-bliss.
  const arcs = slides.map((s) => s?.arc);
  if (arcs.length && arcs[0] && arcs[0] !== 'what-is') {
    errors.push({
      code: 'ARC_SHAPE',
      slide: slides[0].slide ?? 1,
      detail: `deck opens on "${arcs[0]}", must open on "what-is"`,
      fix: 'Establish agreed reality before proposing change.',
    });
  }
  const last = arcs[arcs.length - 1];
  if (last && last !== 'new-bliss') {
    errors.push({
      code: 'ARC_SHAPE',
      slide: slides[slides.length - 1].slide ?? slides.length,
      detail: `deck closes on "${last}", must close on "new-bliss"`,
      fix: 'End on the world with the idea adopted, not on the ask.',
    });
  }

  return {
    errors,
    slideCount: slides.length,
    masterTitle: masterTitle ?? null,
    thresholds: { maxBodyPerSlide: cfg.words.maxBodyPerSlide },
    pass: errors.length === 0,
  };
}
