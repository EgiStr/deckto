# Design — deckto web renderer

**Date:** 2026-09-28
**Status:** proposed
**Precedent:** `2026-09-25-deckto-design.md`

## 1. Problem

deckto's pipeline produces one artifact: a `.pptx`. The storyline, gates, arc
enforcement, design-spec and QA are all format-agnostic — they read
`storyline.md`, which is plain YAML data. Nothing in pitch-me, grinding or
review cares that the final byte stream is OOXML.

Users increasingly need a deck they can *link to* rather than attach: a URL for
a README, a deck that opens on a phone, a deck that reflows instead of clipping.
`stackblitz/bolt-slides` proves the pull is real (responsive React decks as
presentation output), but its model is incompatible with ours: it has no
intermediate representation — the agent authors JSX directly — so there is no
storyline to gate and none of our four rules are enforced.

**Goal:** add a second renderer that turns the *same* `storyline.md` +
`theme.json` into a self-contained responsive HTML deck.

`design-spec.md` is **not** an input. It is a human-readable rationale document;
the machine-readable theme it describes is `theme.json`, which the renderer
consumes. This mirrors `cli/commands/build.js`, which reads `storyline.md` + `theme.json`
and never parses the design spec.

**Non-goal:** this does not replace `.pptx`, does not add a React/Vite scaffold,
and does not add web-only interactivity (click-builds, live data) in v1.

## 2. Decisions taken

| # | Decision | Rationale |
|---|---|---|
| 1 | Reuse existing `layout` + `diagram` fields | No schema change; one storyline drives both renderers; the four rules stay on the storyline. Reversible. |
| 2 | Emit a single self-contained `index.html` | Zero `node_modules`, zero build step, opens by double-click, deploys by copying one file. Fits the `npx` priority. |
| 3 | Renderer lives in `cli/`, not `scripts/` | `scripts/` is **absent from the npm `files` allowlist** — a consumer running `npx deckto` cannot reach it. Putting the renderer in `cli/` makes it actually shippable. |
| 4 | Responsive re-layout, **not** embedding the PNG strips | The strips are fixed 1232×460; embedding them would defeat reflow. The `diagram` block is re-rendered as HTML/CSS from the same data. |
| 5 | ~~Assets inlined as base64 data URIs~~ **retired** | Assumed slides carry image paths; they do not (see §3 note). Nothing to inline. |

## 3. Architecture

```
deck/<slug>/storyline.md ─┐
deck/<slug>/theme.json ───┼─► cli/lib/web-renderer.js ─► deck/<slug>/web/index.html
deckto.config.json ───────┘         (pure function)
```

The renderer is a **pure function**: same inputs, same bytes out. No network,
no file reading of its own, no mutation of inputs. That makes it testable
without a browser and keeps it symmetrical with `cli/commands/build.js`
(the pptx path is likewise a transcription, not an invention).

**Correction (implementation-time, 2026-09-28).** Decision 5 originally read
"assets inlined as base64", assuming a slide carried an image path. It does not:
`visual` is prose describing intent, and `visual_source` is a directive to
`assets-generator`, not a filename. `deck/<slug>/assets/` contains only the
generated 1232×460 strips, which decision 4 already excludes. There is therefore
nothing to inline, and `assets/` is **not** a renderer input. Decision 5 is
retired, not deferred — Phase 1 reads three files and emits one.

### 3.1 Layout → responsive component map

Each existing layout maps to one responsive pattern. The `diagram` block supplies
its data in both paths — only the *rendering* differs.

| `layout` | pptx rendering | web rendering | `diagram` data consumed |
|---|---|---|---|
| `title-dark` | full-bleed dark strip | full-viewport hero, dark field | `sub` |
| `comparison-columns` | two fixed columns | 2-col grid → stacks under 720px | `columns` |
| `flow-diagram` | horizontal arrow row | steps, row on wide / column on narrow | `steps` |
| `icon-rows` | fixed-height icon rows | wrapping card grid | `rows` |
| `chart-focus` | chart + checklist | chart area + supporting list | `checklist` |
| `stat-callout` | giant static number | fluid `clamp()` number | `stat`, `statLabel`, `tail` |

An unmapped `layout` is a **hard error** (`unknown layout "<x>" for web
renderer`), not a fallback. This is the web-side equivalent of GATE 2: a layout
with no visual representation must fail loudly rather than ship a text-only
slide — which would violate rule 2 (visual > wordy) silently.

### 3.2 Composition

Every slide renders:

1. **title** — from `slide.title`, `clamp()` scaled, floor enforced by
   `deckto.config.json` `fonts.minTitlePt` → equivalent `rem` floor
2. **body** — `slide.body`, `clamp()` with `minBodyPt` floor. Sits directly
   under the title, matching the strip rhythm the pptx path already establishes.
3. **visual** — re-laid-out from `diagram` (§3.1), below the body copy
4. **insight** — rendered inside each slide's collapsible notes panel (a
   `<details>` element, closed by default) as the first line
   `INSIGHT: <insight>`, preserving the pptx speaker-notes contract. It is
   **not** surfaced on the slide face: rule 3 asks for a speaker insight, not
   audience copy.

The `body` ≤25-word budget and arc validation are already enforced upstream by
`qa storyline`, so the web renderer inherits them without re-implementing.

## 4. Error handling

| Condition | Behaviour |
|---|---|
| missing `storyline.md` / `theme.json` | exit 1, `missing <path>` (mirrors `cli/commands/build.js`) |
| missing `deckto.config.json` | exit 1, `missing <path>` (needed for font floors) |
| unknown `layout` | exit 1, `slide N: unknown layout "<x>" for web renderer` |
| layout present, `diagram` block absent | exit 1, `slide N: missing diagram block for layout "<x>"` |
| config `fonts` block missing or non-numeric | warning on stderr, fall back to defaults (36pt title / 14pt body), still emits |

Errors use the existing envelope contract (`{ ok, command, version, data,
error }`) when `--json` is passed.

## 5. QA

The four rules map to the web output as:

1. **storyline** — enforced upstream, unchanged
2. **visual > wordy** — enforced by §3.1's hard error on unmapped or
   diagram-less slides
3. **insight per slide** — structural assertion: every slide element contains a
   notes `<details>` whose first text line is `INSIGHT: <insight>` and whose
   value is non-empty. This is the web mirror of the pptx static check, which
   parses the identical `INSIGHT: ` prefix out of notes XML.
4. **font size** — emitted CSS floors are checked against `deckto.config.json`

A `deckto qa web <file.html>` command performs these deterministically — the
same split the pptx path uses (static check now, rendered vision pass later).

## 6. Testing

- **Unit:** each §3.1 mapping renders expected structure from known `diagram`
  data (6 layouts × structural assertions).
- **Contract:** every `layout` appearing in any `deck/*/storyline.md` has a web
  mapping — fails when a new layout is added to the pptx path only.
- **Golden:** build a **committed fixture deck** (a minimal `deck/<slug>/` with
  a small `storyline.md`, `theme.json` and one stub asset, under `test/fixtures/`)
  → assert single file, no external `src=`, every slide carries an insight, no
  text-only slide. Using a fixture rather than `deckto-pitch` keeps the test
  running on a fresh clone — `deck/*/assets/**` is gitignored, so the real decks
  cannot serve as fixtures.
- **Regression (filed from today's bug):** extend `test/skills.contract.test.js`
  with a rule that no skill references a sibling path that fails to resolve from
  the skill's own directory. Today's test covers `references/` only, which is
  why the `skills/pptx/` break shipped.

## 7. Alternatives considered

- **Embed the PNG strips as `<img>`** — responsive *page*, unresponsive
  *content*; the slide would letterbox on phones. Rejected: it answers "website"
  while delivering fixed canvas.
- **`scripts/build-web.js` next to the pptx build** — structurally consistent,
  but `scripts/` is not in the npm `files` allowlist, so `npx deckto` users
  could not invoke it. Rejected on distribution grounds (decision 3).
- **React/Vite scaffold** — full bolt-slides parity, but imposes `npm install`
  + dev server on consumers, which `npx deckto` exists to avoid.

## 8. Open questions

1. **CLI shape:** `deckto build <slug> --web` (one command, both outputs) vs
   `deckto web <slug>` (separate). Recommendation: `deckto build <slug> [--web]`
   — and while touching it, move the pptx path behind the same command so
   `scripts/` stops being the only build entry point.
2. **Should `deckto build` (no flag) emit both?** Tempting for symmetry, but
   changes existing behaviour — needs an explicit call.
3. **Vision QA for web** (screenshot + review) — deferred; the deterministic
   checks in §5 cover the four rules without a browser dependency.
