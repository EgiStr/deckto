import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { renderWeb } from '../cli/lib/web-renderer.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'web-deck');

const storyline = YAML.parse(fs.readFileSync(path.join(FIXTURE, 'storyline.md'), 'utf8'));
const theme = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'theme.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'deckto.config.json'), 'utf8'));

const html = renderWeb({ storyline, theme, config });

test('emits one complete HTML document', () => {
  assert.match(html, /^<!DOCTYPE html>/i);
  assert.match(html, /<html[^>]*lang="en"/i);
  assert.match(html, /<\/html>\s*$/);
  // Exactly one head and body — a fragment or a doubled document is not a page.
  assert.equal((html.match(/<head>/gi) ?? []).length, 1);
  assert.equal((html.match(/<body/gi) ?? []).length, 1);
});

// Decision 2: single self-contained file. No external reference may survive,
// or the deck breaks the moment it is emailed or moved.
test('is self-contained — no external references', () => {
  assert.equal((html.match(/<link\b/gi) ?? []).length, 0, 'no <link> elements');
  assert.equal((html.match(/<script[^>]+src=/gi) ?? []).length, 0, 'no external scripts');
  assert.equal((html.match(/src="(?!data:)/gi) ?? []).length, 0, 'no non-data src');
  assert.equal((html.match(/href="(?!data:|#)/gi) ?? []).length, 0, 'no non-data href');
  assert.equal((html.match(/@import/gi) ?? []).length, 0, 'no CSS @import');
  // A remote font/file reference is the most likely accidental leak.
  assert.doesNotMatch(html, /https?:\/\//i);
});

test('renders one section per slide', () => {
  const sections = html.match(/<section\b[^>]*class="[^"]*slide[^"]*"/gi) ?? [];
  assert.equal(sections.length, storyline.slides.length, 'one <section> per slide');
  for (const s of storyline.slides) {
    assert.match(html, new RegExp(`data-slide="${s.slide}"`), `slide ${s.slide} missing`);
  }
});

// Rule 3: insight per slide, mirroring the pptx speaker-notes contract.
test('every slide carries its insight in a closed notes panel', () => {
  for (const s of storyline.slides) {
    const marker = `INSIGHT: ${s.insight}`;
    assert.ok(html.includes(marker), `slide ${s.slide}: insight text missing`);
  }
  // Every panel is collapsed by default and present once per slide.
  const details = html.match(/<details[^>]*>/gi) ?? [];
  assert.equal(details.length, storyline.slides.length, 'one notes panel per slide');
  for (const d of details) {
    assert.doesNotMatch(d, /\bopen\b/i, 'notes panel must start closed');
  }
});

test('the insight panel owns the INSIGHT line as its first line', () => {
  const blocks = html.match(/<details[\s\S]*?<\/details>/gi) ?? [];
  assert.equal(blocks.length, storyline.slides.length);
  blocks.forEach((block, i) => {
    const text = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    assert.match(
      text,
      /^INSIGHT: /,
      `slide ${storyline.slides[i].slide}: INSIGHT must be the first line, got "${text.slice(0, 40)}"`
    );
    assert.ok(text.length > 'INSIGHT: '.length, 'insight value must not be empty');
  });
});

test('renders the title and body text of every slide', () => {
  for (const s of storyline.slides) {
    assert.ok(html.includes(s.title), `slide ${s.slide}: title missing`);
    assert.ok(html.includes(s.body), `slide ${s.slide}: body missing`);
  }
});

// Every slide must have a visual container — this is rule 2 made structural.
test('every slide has a visual element, never text-only', () => {
  const visuals = html.match(/data-visual="[^"]+"/gi) ?? [];
  assert.equal(visuals.length, storyline.slides.length, 'one visual per slide');
  for (const s of storyline.slides) {
    assert.match(
      html,
      new RegExp(`data-visual="${s.layout}"`),
      `slide ${s.slide}: no visual for layout ${s.layout}`
    );
  }
});

test('applies the theme palette rather than hardcoded colours', () => {
  for (const key of ['dominant', 'secondary', 'accent']) {
    const hex = theme[key].replace('#', '').toLowerCase();
    assert.match(html.toLowerCase(), new RegExp(hex), `theme ${key} not used`);
  }
  assert.doesNotMatch(html, /#000000|#ffffff\b/i, 'no raw black/white literals');
});

// Rule 4: big fonts. Floors come from deckto.config.json, and clamp() must
// never scale below them — a clamp minimum under the floor is the web
// equivalent of a FONTSIZE_LOW finding.
test('font floors honour deckto.config.json', () => {
  const bodyPx = config.fonts.minBodyPt * (96 / 72);
  const titlePx = config.fonts.minTitlePt * (96 / 72);
  assert.ok(html.includes(`${bodyPx}px`), `body floor ${bodyPx}px (${config.fonts.minBodyPt}pt) missing`);
  assert.ok(html.includes(`${titlePx}px`), `title floor ${titlePx}px (${config.fonts.minTitlePt}pt) missing`);

  // No clamp() may declare a minimum below its floor.
  for (const m of html.matchAll(/clamp\((\d+(?:\.\d+)?)px/g)) {
    assert.ok(Number(m[1]) >= bodyPx, `clamp minimum ${m[1]}px is below the body floor ${bodyPx}px`);
  }
});

test('is responsive — has a viewport meta and a stacking breakpoint', () => {
  assert.match(html, /<meta[^>]+name="viewport"[^>]+width=device-width/i);
  assert.match(html, /@media[^{]*max-width/i, 'no responsive breakpoint');
});

test('escapes slide text instead of injecting markup', () => {
  const hostile = {
    storyline: {
      master_title: 'x',
      slides: [{
        slide: 1, title: '<script>alert(1)</script>', point: 'p', insight: 'i<b>',
        body: 'b & c', visual: 'v', visual_source: 'generate', evidence: 'e',
        layout: 'title-dark', arc: 'what-is', notes_draft: 'n',
        diagram: { sub: 'x' },
      }],
    },
    theme, config,
  };
  const out = renderWeb(hostile);
  assert.doesNotMatch(out, /<script>alert\(1\)<\/script>/);
  assert.match(out, /&lt;script&gt;/);
  assert.match(out, /b &amp; c/);
  assert.ok(out.includes('INSIGHT: i&lt;b&gt;'), 'insight must be escaped too');
});

test('throws the spec error for an unmapped layout', () => {
  const bad = {
    storyline: {
      master_title: 'x',
      slides: [{
        slide: 2, title: 't', point: 'p', insight: 'i', body: 'b', visual: 'v',
        visual_source: 'generate', evidence: 'e', layout: 'freeform', arc: 'what-is',
        notes_draft: 'n', diagram: {},
      }],
    },
    theme, config,
  };
  assert.throws(() => renderWeb(bad), {
    message: 'slide 2: unknown layout "freeform" for web renderer',
  });
});

test('warns and falls back when font floors are missing from config', () => {
  const out = renderWeb({ storyline, theme, config: {} });
  // Falls back to the documented defaults (36pt title / 14pt body) rather
  // than emitting NaN.
  assert.doesNotMatch(out, /NaN/);
  assert.ok(out.includes(`${36 * (96 / 72)}px`), 'default title floor (36pt) missing');
  assert.ok(out.includes(`${14 * (96 / 72)}px`), 'default body floor (14pt) missing');
});

test('is deterministic — same input, same bytes', () => {
  assert.equal(renderWeb({ storyline, theme, config }), renderWeb({ storyline, theme, config }));
});

// A diagram block present but lacking the key its layout reads would emit an
// empty visual — rule 2 failing without an error. Only keys the pptx generator
// genuinely requires are enforced: make-assets.js guards statLabel and tail
// with `d.x ?`, so those stay optional (ai-agent-skills slide 8 omits tail).
test('throws when a diagram is missing a required key', () => {
  const noStat = {
    storyline: {
      master_title: 'x',
      slides: [{
        slide: 9, title: 't', point: 'p', insight: 'i', body: 'b', visual: 'v',
        visual_source: 'generate', evidence: 'e', layout: 'stat-callout', arc: 'what-is',
        notes_draft: 'n', diagram: { statLabel: 'lbl', tail: 't' }, // stat omitted
      }],
    },
    theme, config,
  };
  assert.throws(() => renderWeb(noStat), {
    message: 'slide 9: diagram block for layout "stat-callout" is missing key "stat"',
  });
});

test('renders a stat-callout with optional statLabel and tail omitted', () => {
  const minimal = {
    storyline: {
      master_title: 'x',
      slides: [{
        slide: 8, title: 't', point: 'p', insight: 'i', body: 'b', visual: 'v',
        visual_source: 'generate', evidence: 'e', layout: 'stat-callout', arc: 'what-is',
        notes_draft: 'n', diagram: { stat: '48 hours' },
      }],
    },
    theme, config,
  };
  const out = renderWeb(minimal);
  assert.ok(out.includes('48 hours'), 'stat must render');
  assert.match(out, /data-visual="stat-callout"/);
  // No stray placeholder text where the optional fields would have been.
  assert.doesNotMatch(out, /undefined|NaN|\[object Object\]/);
});

// Spec §4: font floors missing from config warn but still emit, via a
// callback the CLI owns — the renderer itself stays silent and pure.
test('reports the font-fallback through the warn callback, not stdout', () => {
  const warnings = [];
  renderWeb({ storyline, theme, config: {}, warn: (m) => warnings.push(m) });
  assert.equal(warnings.length, 1, `expected one warning, got: ${warnings.join(' | ')}`);
  assert.match(warnings[0], /font/i);
});

// ---- visual structure, pinned to what scripts/make-assets.js draws ----------
// These three passed a text-only renderer: a layout can emit its words and still
// lose everything that makes it a *visual*. Each assertion below is taken from
// the pptx generator's actual geometry.

/** The inner HTML of the single slide rendered with this layout. */
function visualFor(layout) {
  const m = html.match(
    new RegExp(`<section[^>]*data-layout="${layout}"[^>]*>([\\s\\S]*?)</section>`)
  );
  assert.ok(m, `expected a slide with layout "${layout}" in the fixture`);
  return m[1];
}

// make-assets.js iconRows draws a numbered circle in a bordered box per row
// (lines 236-238) — never an icon glyph. No storyline ships an `icon:` field,
// so rendering one produces an empty slot that just pushes the label right.
test('icon-rows renders a numbered index, not an empty icon slot', () => {
  const sec = visualFor('icon-rows');
  assert.match(sec, /<span class="row-index">1<\/span>/, '1-based index');
  assert.doesNotMatch(sec, /class="row-icon"[^>]*><\/span>/, 'no empty icon span');
  assert.match(sec, /<strong class="row-label">/, 'label is bold');
  assert.match(sec, /class="row-note"/, 'note present');
});

// make-assets.js chartFocus checklist draws a rounded checkbox with a ✓ in it
// (lines 267-268) — bare <ul> bullets are the wordiest form, the opposite of
// the layout's intent.
test('chart-focus checklist renders checkboxes inside a panel', () => {
  const sec = visualFor('chart-focus');
  assert.match(sec, /<ul class="checklist"[^>]*>/, 'checklist panel container');
  assert.match(sec, /class="check-box"/, 'per-item checkbox');
  assert.match(sec, /class="check-box"[^>]*>✓/, 'checkbox carries the ✓ mark');
  assert.doesNotMatch(sec, /<ul class="checklist">\s*<li>/, 'not bare bullet items');

  // Markup alone is not the panel: without list-style:none the default bullets
  // render beside the checkbox spans, and without a background the surface stays
  // transparent (measured as rgba(0,0,0,0)). Assert the rules, not just the HTML.
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const checklistRule = css.match(/\.checklist\s*\{([^}]*)\}/);
  assert.ok(checklistRule, 'a .checklist rule exists');
  assert.match(checklistRule[1], /list-style:\s*none/, 'bullets suppressed');
  assert.match(checklistRule[1], /background:/, 'panel has a surface');
  assert.match(checklistRule[1], /border:/, 'panel has a border');
  assert.match(css, /\.check-row\s*\{[^}]*display:\s*flex/, 'rows align horizontally');
  assert.match(css, /\.check-box\s*\{[^}]*display:\s*grid/, '✓ is centred in its box');
});

// The bar geometry must scale to the largest value, exactly like the pptx
// generator (`max = Math.max(...bars.map(b => b.value), 1)`).
test('chart-focus bars scale each fill against the largest value', () => {
  const barsOut = renderWeb({
    storyline: {
      master_title: 'x',
      slides: [{
        slide: 1, title: 't', point: 'p', insight: 'i', body: 'b', visual: 'v',
        visual_source: 'generate', evidence: 'e', layout: 'chart-focus', arc: 'what-is',
        notes_draft: 'n',
        diagram: {
          bars: [
            { label: 'idle', value: 10000, caption: '~10k tokens' },
            { label: 'triggered', value: 5000, caption: '5k tokens' },
          ],
        },
      }],
    },
    theme, config,
  });
  assert.match(barsOut, /class="bar-label"/, 'each bar is labelled');
  assert.match(barsOut, /class="bar-track"/, 'each bar has a track');
  assert.match(barsOut, /--w:100\.0%/, 'largest bar fills the track');
  assert.match(barsOut, /--w:50\.0%/, 'half the value is half the width');
  assert.ok(barsOut.includes('~10k tokens'), 'caption renders');
});

// The accent is two-tier because the bright brand accent is illegible on a light
// field (#F5A524 on #F1F5FE is 1.87:1). Without this the visible accent silently
// disappears on every non-dark slide — which is how the bug shipped.
test('the accent switches per field so it stays legible', () => {
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.match(
    css,
    /--accent-live:\s*var\(--accent-light\)/,
    'the default field uses the dark accent variant'
  );
  assert.match(
    css,
    /\.slide--dark\s*\{[^}]*--accent-live:\s*var\(--accent\)/,
    'dark slides re-point the accent at the bright variant'
  );
  // Exactly one override: a second one means some other rule re-points the accent.
  assert.equal((css.match(/var\(--accent\)/g) ?? []).length, 1, 'only .slide--dark overrides');
});

// The light-field / dark-field decision lives in build.js for the pptx, which
// darkens title-dark AND stat-callout. The web renderer darkened only the first,
// so the same slide read dark in the deck and light on the web. Which of the two
// is right is a design call, not a test's; what the test fixes is that they agree.
test('both renderers agree on which layouts are dark', () => {
  const build = fs.readFileSync(path.join(ROOT, 'cli', 'commands', 'build.js'), 'utf8');
  const pptxDark = build.match(/const dark = (.*);/)[1];
  const renderer = fs.readFileSync(path.join(ROOT, 'cli', 'lib', 'web-renderer.js'), 'utf8');
  const webDark = renderer.match(/const dark = (.*);/)[1];

  const layoutsOf = (expr) => [...expr.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(
    layoutsOf(webDark),
    layoutsOf(pptxDark),
    `web renderer darkens [${layoutsOf(webDark)}] but the pptx darkens [${layoutsOf(pptxDark)}]`
  );
});
