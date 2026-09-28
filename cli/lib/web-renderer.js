// Renders deck/<slug>/storyline.md + theme.json into a single self-contained,
// responsive HTML deck. Pure function: all inputs are passed in, nothing is
// read from disk, no input is mutated.
//
// This is a second consumer of the SAME storyline as cli/commands/build.js — the
// storyline is the single source of truth for both outputs (spec decision 1).
// The pptx path transcribes `diagram` into a fixed 1232x460 SVG strip; this path
// re-lays-out the identical data as responsive HTML (spec decision 4), so the
// slide reflows instead of letterboxing on a phone.
//
// Determinism is a contract, not an accident: no Date, no Math.random, no
// iteration over unordered structures. Same input must produce the same bytes.

import { assertRenderable, requiredDiagramKeys } from './web-layouts.js';

const PT_TO_PX = 96 / 72;
const DEFAULT_MIN_TITLE_PT = 36;
const DEFAULT_MIN_BODY_PT = 14;

/** Escape text for HTML text and attribute contexts. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function px(pt) {
  return `${pt * PT_TO_PX}px`;
}

/**
 * Resolve font floors from config, warning through the caller's callback when
 * the block is absent or unusable. The renderer never writes to stdout itself:
 * that belongs to the CLI, and staying silent keeps this function pure.
 */
function resolveFloors(config, warn) {
  const fonts = config?.fonts;
  const valid = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (valid(fonts?.minTitlePt) && valid(fonts?.minBodyPt)) {
    return { titlePt: fonts.minTitlePt, bodyPt: fonts.minBodyPt };
  }
  warn?.(
    'deckto.config.json: fonts block missing or invalid — falling back to ' +
    `${DEFAULT_MIN_TITLE_PT}pt title / ${DEFAULT_MIN_BODY_PT}pt body`
  );
  return { titlePt: DEFAULT_MIN_TITLE_PT, bodyPt: DEFAULT_MIN_BODY_PT };
}

// ---- layout renderers -------------------------------------------------------
// Each returns the inner HTML for one slide's visual container. The container
// itself (with data-visual) is added by renderVisual, so every layout is
// guaranteed to produce a visual and none can be text-only.

function renderTitleDark(d) {
  return `<p class="hero-sub">${esc(d.sub)}</p>`;
}

function renderComparisonColumns(d) {
  const cols = (d.columns ?? []).map((c) => `
        <div class="col">
          <h3>${esc(c.heading)}</h3>
          <ul>${(c.lines ?? []).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        </div>`).join('');
  return `<div class="columns">${cols}
      </div>`;
}

function renderFlowDiagram(d) {
  const steps = (d.steps ?? []).map((s, i) => `
        <li class="step">
          <span class="step-n">${i + 1}</span>
          <strong>${esc(s.label)}</strong>
          <span class="step-sub">${esc(s.sub)}</span>
        </li>`).join('');
  return `<ol class="steps">${steps}
      </ol>`;
}

function renderIconRows(d) {
  // scripts/make-assets.js draws a numbered circle in a bordered box (lines
  // 236-238), never an icon glyph — no storyline ships an `icon:` field, so
  // rendering one would emit an empty slot that only indents the label.
  const rows = (d.rows ?? []).map((r, i) => `
        <li class="row">
          <span class="row-index">${i + 1}</span>
          <span class="row-text"><strong class="row-label">${esc(r.label)}</strong>
          <span class="row-note">${esc(r.note)}</span></span>
        </li>`).join('');
  return `<ul class="rows">${rows}
      </ul>`;
}

// chart-focus carries either a checklist or labelled bars, mirroring
// scripts/make-assets.js which accepts both (`if (d.checklist)` ... else
// `d.bars`). Real decks use one each, so both shapes must render.
function renderChartFocus(d) {
  if (d.checklist) {
    // A checker panel, not a bullet list: make-assets.js draws a rounded
    // checkbox with a ✓ per item (lines 267-268). Bare <ul> bullets would be
    // the wordiest possible rendering of a layout meant to read as a visual.
    const items = d.checklist.map((c) => `
          <li class="check-row"><span class="check-box" aria-hidden="true">✓</span><span class="check-text">${esc(c)}</span></li>`
    ).join('');
    return `<ul class="checklist">${items}
      </ul>`;
  }
  const bars = d.bars ?? [];
  // Scale against the largest value, exactly as the pptx generator does, so the
  // web chart reads the same as the deck it mirrors.
  const max = Math.max(...bars.map((b) => Number(b.value) || 0), 1);
  const items = bars.map((b) => `
        <li class="bar">
          <span class="bar-label">${esc(b.label)}</span>
          <span class="bar-track"><span class="bar-fill" style="--w:${((Number(b.value) || 0) / max * 100).toFixed(1)}%"></span></span>
          <span class="bar-caption">${esc(b.caption)}</span>
        </li>`).join('');
  return `<ul class="bars">${items}</ul>`;
}

function renderStatCallout(d) {
  // statLabel and tail are optional in the pptx generator (`d.x ?`), and
  // ai-agent-skills slide 8 ships without a tail — omit the element rather than
  // emitting an empty paragraph that would still take vertical space.
  const label = d.statLabel ? `<p class="stat-label">${esc(d.statLabel)}</p>` : '';
  const tail = d.tail ? `<p class="stat-tail">${esc(d.tail)}</p>` : '';
  return `<p class="stat">${esc(d.stat)}</p>${label}${tail}`;
}

const RENDERERS = {
  'title-dark': renderTitleDark,
  'comparison-columns': renderComparisonColumns,
  'flow-diagram': renderFlowDiagram,
  'icon-rows': renderIconRows,
  'chart-focus': renderChartFocus,
  'stat-callout': renderStatCallout,
};

function renderVisual(slide) {
  const layout = slide.layout;
  // assertRenderable has already rejected unknown/incomplete slides, so this
  // lookup cannot miss; the guard is here so the invariant is local and obvious.
  const render = RENDERERS[layout];
  if (!render) throw new Error(`slide ${slide.slide}: no renderer for layout "${layout}"`);
  return `<div class="visual" data-visual="${esc(layout)}">${render(slide.diagram)}</div>`;
}

function renderSlide(slide) {
  // Must stay in step with cli/commands/build.js: the pptx darkens title-dark
  // AND stat-callout. When the two disagreed, the same slide read as a dark
  // field in the deck and a light one on the web.
  const dark = slide.layout === 'title-dark' || slide.layout === 'stat-callout';
  return `
    <section class="slide${dark ? ' slide--dark' : ''}" data-slide="${esc(slide.slide)}" data-layout="${esc(slide.layout)}">
      <div class="slide-inner">
        <h2 class="slide-title">${esc(slide.title)}</h2>
        <p class="slide-body">${esc(slide.body)}</p>
        ${renderVisual(slide)}
        <details class="notes">
          <summary aria-label="Speaker notes"></summary>
          <p>INSIGHT: ${esc(slide.insight)}</p>
          <p>${esc(slide.notes_draft)}</p>
        </details>
      </div>
    </section>`;
}

// ---- document ---------------------------------------------------------------

function styles(theme, floors) {
  // Floors come from the same config the pptx path reads, converted with the
  // same pt->px ratio, so the two outputs cannot drift apart on font size.
  const bodyFloor = px(floors.bodyPt);
  const titleFloor = px(floors.titlePt);
  return `
      :root {
        --dominant: ${theme.dominant};
        --secondary: ${theme.secondary};
        --accent: ${theme.accent};
        --accent-light: ${theme.accentLight ?? theme.accent};
        --mid: ${theme.mid ?? theme.dominant};
        /* Two-tier accent, same rule as the pptx path: the bright accent only
           works on a dark field (#F5A524 on #F1F5FE is 1.87:1 — a fail), so
           light slides use the darker accent instead. */
        --accent-live: var(--accent-light); /* default: light field */
        --title-floor: ${titleFloor};
        --body-floor: ${bodyFloor};
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        background: var(--secondary);
        color: var(--mid);
        font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      .slide {
        display: flex;
        align-items: center;
        min-height: 100vh;
        padding: 6vh 5vw;
      }
      .slide--dark {
        background: var(--dominant);
        color: var(--secondary);
        --accent-live: var(--accent); /* bright accent is safe on a dark field */
      }
      .slide-inner { width: 100%; max-width: 1100px; margin: 0 auto; }
      .slide-title {
        font-size: clamp(${titleFloor}, 4.2vw, 62px);
        line-height: 1.15;
        margin: 0 0 0.5em;
      }
      .slide-body {
        font-size: clamp(${bodyFloor}, 1.9vw, 30px);
        line-height: 1.5;
        margin: 0 0 1.5em;
        opacity: 0.92;
      }
      .visual { width: 100%; }
      .hero-sub { font-size: clamp(${bodyFloor}, 2.2vw, 34px); opacity: 0.85; }
      .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
      .col {
        background: color-mix(in srgb, var(--secondary) 88%, transparent);
        border-left: 6px solid var(--accent-live);
        padding: 1.25rem 1.5rem;
      }
      .slide--dark .col { background: color-mix(in srgb, var(--secondary) 12%, transparent); }
      .col h3 { font-size: clamp(${bodyFloor}, 1.7vw, 26px); margin: 0 0 0.5em; }
      .col ul { margin: 0; padding-left: 1.1em; }
      .col li, .checklist li, .row-note, .step-sub { font-size: clamp(${bodyFloor}, 1.4vw, 22px); }
      .steps { display: flex; gap: 1rem; list-style: none; margin: 0; padding: 0; }
      .step { flex: 1; border-top: 6px solid var(--accent-live); padding-top: 0.75rem; }
      .step-n { display: block; font-size: clamp(${bodyFloor}, 1.4vw, 22px); opacity: 0.6; }
      .step strong { display: block; font-size: clamp(${bodyFloor}, 1.9vw, 28px); }
      .step-sub { display: block; opacity: 0.8; }
      .rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.9rem; }
      /* A bordered row with a numbered disc, per make-assets.js iconRows: the
         rows read as boxes, so stacked rows stay scannable as a group. */
      .row {
        display: flex; gap: 1rem; align-items: center;
        border: 2px solid var(--mid); padding: 0.7rem 1rem;
      }
      .row-index {
        flex: none;
        width: 2.2rem; height: 2.2rem; border-radius: 50%;
        border: 3px solid var(--accent-live); color: var(--accent-live);
        display: grid; place-items: center;
        font-weight: 700; font-size: clamp(${bodyFloor}, 1.4vw, 21px);
      }
      .row-label { display: block; font-size: clamp(${bodyFloor}, 1.9vw, 28px); }
      .row-note { display: block; opacity: 0.8; }
      .chart-bars { display: flex; align-items: flex-end; gap: 1rem; height: 190px; }
      .chart-bars span {
        flex: 1;
        height: var(--h);
        background: var(--accent-live);
      }
      .bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.9rem; }
      .bar { display: grid; grid-template-columns: minmax(9rem, 1fr) 3fr auto; gap: 0.9rem; align-items: center; }
      .bar-label { font-size: clamp(${bodyFloor}, 1.4vw, 22px); }
      /* Bars carry the accent, and the fill is the only place accent colour
         appears at this size — it must stay legible on both fields. */
      .bar-track { background: color-mix(in srgb, var(--mid) 18%, transparent); height: 1.6rem; }
      .bar-fill { display: block; width: var(--w); height: 100%; background: var(--accent-live); }
      .bar-caption { font-size: clamp(${bodyFloor}, 1.3vw, 20px); opacity: 0.8; }
      /* A checker panel, matching the pptx chart-focus checklist: a bordered
         surface with a boxed ✓ per row, so four findings read as a checklist
         rather than as four bullets of prose. list-style:none is required —
         without it the default bullets render alongside the checkbox spans. */
      .checklist {
        list-style: none;
        margin: 0;
        padding: 1.1rem;
        border: 2px solid var(--mid);
        background: color-mix(in srgb, var(--mid) 9%, transparent);
        display: grid;
        gap: 0.7rem;
      }
      .check-row { display: flex; gap: 0.9rem; align-items: center; }
      .check-box {
        flex: none;
        width: 1.9rem; height: 1.9rem; border-radius: 8px;
        border: 3px solid var(--accent-live);
        display: grid; place-items: center;
        font-weight: 700; color: #fff;
        background: var(--accent-live);
      }
      .check-text { font-size: clamp(${bodyFloor}, 1.4vw, 22px); }
      .stat {
        font-size: clamp(${floors.titlePt * 2 * PT_TO_PX}px, 11vw, 140px);
        font-weight: 700;
        line-height: 1;
        margin: 0;
        color: var(--accent-live);
      }
      .stat-label { font-size: clamp(${bodyFloor}, 2.2vw, 34px); margin: 0.4em 0 0; }
      .stat-tail { font-size: clamp(${bodyFloor}, 1.5vw, 24px); margin: 0.6em 0 0; opacity: 0.75; }
      .notes { margin-top: 2rem; font-size: clamp(${bodyFloor}, 1.3vw, 20px); }
      /* The summary is intentionally label-free so the INSIGHT line is the
         panel's first text — same contract the pptx notes do. The accessible
         name rides on aria-label instead. */
      .notes summary {
        cursor: pointer;
        list-style: none;
        opacity: 0.55;
        font-size: 0;
        padding: 0.4em 0;
      }
      .notes summary::after {
        content: "Speaker notes";
        font-size: clamp(${bodyFloor}, 1.3vw, 20px);
      }
      .notes summary::-webkit-details-marker { display: none; }
      .notes p { margin: 0.6em 0 0; }

      /* Web's advantage over a fixed canvas: content reflows instead of
         clipping. Two columns and step rows stack before they get cramped. */
      @media (max-width: 720px) {
        .columns { grid-template-columns: 1fr; }
        .steps { flex-direction: column; }
        .slide { padding: 8vh 6vw; }
      }`;
}

/**
 * Render a whole deck to one self-contained HTML document.
 *
 * @param {object}   input
 * @param {object}   input.storyline parsed storyline.md
 * @param {object}   input.theme     parsed theme.json
 * @param {object}   input.config    parsed deckto.config.json (font floors)
 * @param {Function} [input.warn]    receives non-fatal messages
 * @returns {string} complete HTML document
 */
export function renderWeb({ storyline, theme, config, warn }) {
  const slides = storyline?.slides ?? [];
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error('storyline has no slides');
  }
  for (const slide of slides) assertRenderable(slide);

  const floors = resolveFloors(config, warn);
  const body = slides.map(renderSlide).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(storyline.master_title)}</title>
<style>${styles(theme, floors)}
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

export { requiredDiagramKeys };
