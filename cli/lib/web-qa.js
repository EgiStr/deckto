// Deterministic checks over a rendered web deck — the web mirror of
// pptx-static.js. Same four rules, same finding codes and scopes, different
// substrate: HTML + CSS instead of OOXML.
//
// What this can and cannot see: it verifies that the structure the rules need
// is PRESENT (a visual block, an INSIGHT line, emitted font floors). It cannot
// judge whether the result looks good — that is what the render/vision pass is
// for, and it is deferred for the web output (spec §8.3). Static QA passing has
// historically not been sufficient; treat this as necessary, not conclusive.

const PT_TO_PX = 96 / 72;
// Compare floors with a small tolerance: the renderer derives px from pt, and
// float text does not always round-trip identically.
const EPSILON = 0.01;

const SLIDE_RE = /<section class="slide[^"]*" data-slide="(\d+)"[\s\S]*?<\/section>/g;
const VISUAL_RE = /<div class="visual" data-visual="[^"]*"/;
const NOTES_RE = /<details class="notes">([\s\S]*?)<\/details>/;
const INSIGHT_P_RE = /<p>(INSIGHT:\s*)([^<]*)<\/p>/;
const TITLE_FLOOR_RE = /--title-floor:\s*([\d.]+)px/;
const BODY_FLOOR_RE = /--body-floor:\s*([\d.]+)px/;
// Only URL *attributes* count as external. A deck that cites a link in its body
// text is fine — `See https://example.com` in a sentence is content, not a
// dependency. (Every earlier variant of this check flagged prose URLs.)
const EXTERNAL_RE =
  /<(?:link|script|img|iframe|source|video|audio|embed)\b[^>]*\b(?:href|src)\s*=\s*["']\s*(?:https?:)?\/\//i;
const EXTERNAL_CSS_RE = /(?:@import|url\()\s*["']?\s*(?:https?:)?\/\//i;

/**
 * @param {string} html a self-contained deck document from renderWeb()
 * @param {object} cfg deckto.config.json
 * @returns {{ findings: Array<{code:string,slide:number|null,scope:string,detail:string}>, slideCount: number, floors: object }}
 */
export function runWebChecks(html, cfg) {
  const findings = [];

  if (EXTERNAL_RE.test(html) || EXTERNAL_CSS_RE.test(html)) {
    findings.push({
      code: 'EXTERNAL_REF',
      slide: null,
      scope: 'deck',
      detail: 'deck references an external href/src — the output must be one self-contained file',
    });
  }

  const sections = [...html.matchAll(SLIDE_RE)];
  for (const match of sections) {
    const n = Number(match[1]);
    const body = match[0];

    if (!VISUAL_RE.test(body)) {
      findings.push({
        code: 'VISUAL_MISSING',
        slide: n,
        scope: 'assets',
        detail: 'slide has no visual block — words only (rule 2: visual over wordy)',
      });
    }

    const notes = body.match(NOTES_RE);
    const insight = notes ? notes[1].match(INSIGHT_P_RE) : null;
    if (!notes || !insight) {
      findings.push({
        code: 'INSIGHT_MISSING',
        slide: n,
        scope: 'storyline',
        detail: "speaker notes do not open with an 'INSIGHT:' line (rule 3)",
      });
    } else if (!insight[2].trim()) {
      findings.push({
        code: 'INSIGHT_EMPTY',
        slide: n,
        scope: 'storyline',
        detail: 'INSIGHT line is present but empty — tell the audience the so-what',
      });
    }
  }

  // Rule 4: the floors the renderer EMITTED, checked against config. Reading
  // config here and not the stylesheet alone is the point — a renderer that
  // silently drops its clamp() floor still reads a valid config.
  const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
  const floors = {
    titlePt: Number(style.match(TITLE_FLOOR_RE)?.[1] ?? NaN) / PT_TO_PX,
    bodyPt: Number(style.match(BODY_FLOOR_RE)?.[1] ?? NaN) / PT_TO_PX,
  };

  if (!Number.isFinite(floors.titlePt) || floors.titlePt + EPSILON < cfg.fonts.minTitlePt) {
    findings.push({
      code: 'FONTSIZE_LOW',
      slide: null,
      scope: 'deck',
      detail: `emitted title floor ${fmt(floors.titlePt)}pt is below config minTitlePt ${cfg.fonts.minTitlePt}pt`,
    });
  }
  if (!Number.isFinite(floors.bodyPt) || floors.bodyPt + EPSILON < cfg.fonts.minBodyPt) {
    findings.push({
      code: 'FONTSIZE_LOW',
      slide: null,
      scope: 'deck',
      detail: `emitted body floor ${fmt(floors.bodyPt)}pt is below config minBodyPt ${cfg.fonts.minBodyPt}pt`,
    });
  }

  return { findings, slideCount: sections.length, floors };
}

function fmt(pt) {
  return Number.isFinite(pt) ? String(Math.round(pt * 100) / 100) : 'none';
}
