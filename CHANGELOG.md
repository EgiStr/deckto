# Changelog

All notable changes to deckto will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Website output format.** `deckto build <slug> --web` renders `storyline.md` into a single self-contained `deck/<slug>/web/index.html` — no network, no build step, one file you can open or host. It reuses the existing `layout` and `diagram:` blocks, so no storyline change was needed, and it carries the same `INSIGHT:` contract in a per-slide speaker-notes panel. The CLI is the only entry point; the renderer lives in `cli/lib/` because npm's `files` allowlist ships `cli/` but not `scripts/`.
- **`deckto build <slug> [--out <file>] [--web] [--all]`.** One command for both formats: no flag builds the `.pptx` (the historical behaviour), `--web` builds only the HTML, `--all` builds both. `--json` emits the shared envelope.

### Changed

- **One deck generator, not two.** `scripts/make-assets.js` and `scripts/build-deck.js` now build any deck from `deck/<slug>/storyline.md` + `theme.json`, so the deck-#1-specific `scripts/make-dogfood-assets.js` and `scripts/build-dogfood.js` are gone. `deck/deckto-pitch/` gained the `theme.json` and per-slide `diagram:` blocks it needs to build through the generic path, and was regenerated and visually re-verified.
- **The pptx build moved from `scripts/build-deck.js` to `deckto build`.** That script was unreachable from `npx` because npm's `files` allowlist ships `cli/` and `skills/` but not `scripts/`, so the deck generator was invisible to anyone who installed the package. It is now a line-for-line transcription in `cli/commands/build.js`, and `test/build.test.js` pins the transcription directly: every slide reaches the deck with its title, its diagram, and its `INSIGHT:` notes line. Byte equality is not asserted — pptxgenjs stamps ZIP entries with the current time, so two runs of the *same* script already differ.

### Fixed

- **`stat-callout` tail collided with its own label.** The context line sat at a hard-coded `y=350`, so any `statLabel` that wrapped to two lines was overlapped by the `tail` line beneath it. The tail's position now derives from the wrapped label's height. Caught in the render pass; the file was valid and static QA passed.
- **Two web layouts rendered their words but lost their visual.** `icon-rows` emitted an empty icon slot (no storyline ships an `icon:` field, and the generator draws a numbered circle instead), and a `chart-focus` checklist emitted bare `<ul>` bullets where the generator draws boxed checkboxes with a `✓`. Both shipped past a fully green static suite; the tests now assert the drawn structure and its CSS, not just that the text appeared.
- **Bright accent was illegible on light fields in the web renderer.** `#F5A524` on `#F1F5FE` is 1.87:1. The accent is now two-tier: the dark variant is the default and dark slides re-point it at the bright one.

## [0.1.0] — 2026-09-27

First public release. The full pipeline from rough idea to a QA-passed `.pptx`, plus the CLI that makes its gates actually run.

### Added — skills

- `pitchdeck-pitch-me` — extract the idea. One question per message, only for real ambiguity; never invents facts to fill a gap.
- `pitchdeck-grinding` — grind the brief into a storyline: diverge on narrative arcs, converge on one, write a per-slide spine (assertion title, body, insight, evidence, layout).
- `pitchdeck-build` — build the `.pptx` with PptxGenJS; write `INSIGHT:` into each slide's speaker notes.
- `pitchdeck-review` — independent judgment; emits findings tagged with the `scope` that owns each defect.
- Support skills: `audience-fit`, `brand-design`, `assets-generator` (standalone-capable), plus vendored `pptx` and `humanizer`.

### Added — CLI (`deckto`)

- `init` / `doctor` — scaffold a deck workspace; check node, LibreOffice, Poppler, config.
- `qa storyline` — structural checks on a storyline (master title, arcs, per-slide insight).
- `qa static` — deterministic `.pptx` XML checks: font floors, word budget, missing visuals, insight presence.
- `qa render` — rendered vision pass: `pptx → pdf → jpg` per slide, for a model to actually look at.
- `qa report` — merges scoped findings into `qa-report.md` and decides the loop: `LOOP:<skill>` or `REVIEW_BLOCKED` once `review.maxAutoIterations` is exceeded.
- `theme contrast|adjust|ramp|dominance` — WCAG contrast math and validated palette derivation (OKLCH, gamut-aware).
- `assets render` — SVG → PNG via headless LibreOffice, with a private profile to avoid concurrent-instance collisions.

### Added — docs and dogfood

- `README.md`, `llms.txt`
- `docs/specs/` design spec and phased implementation plan
- `docs/research/frameworks-methodology.md` — cited methodology behind each skill
- `deck/deckto-pitch/` — this repo's own pitch, built by these skills. Hand-authored `storyline.md` and `design-spec.md` are tracked; generated assets and the `.pptx` are not.

### Fixed

- **`--iterations` was never read.** `pitchdeck-review` documented `qa report --findings <f> --iterations <n>`, but the CLI only read the file's `iteration` field, so the auto-iteration cap always fell back to 1 and `REVIEW_BLOCKED` was unreachable — a bounded loop that never bounded. The flag is now authoritative.
- **Findings with documented field names rendered as `undefined`.** The renderer expected `code`/`detail` while skills are told to write `rule`/`evidence`; the table cells printed `undefined` while still exiting 0. Both spellings are accepted now.
- **SVG text baseline offset.** `<text y>` is a baseline, not a top edge; the dogfood generator authored top coordinates, drawing every diagram ~40px too low. Conversion is centralized in `cli/lib/svg-geometry.js` with regression tests.
- **Invisible strokes.** Panels stroked in the light tone over a light background rendered blank while producing valid markup. Now caught by the rendered vision pass.
- **Off-slide content.** A 16:9 layout with 13.33×7.5in coordinates clipped slides 1, 4, 7. Static QA passed; only the render pass saw it.
- `.gitignore` excluded all of `deck/`, which would have dropped the hand-authored deck sources on clone.
- `--help` omitted `qa storyline`, `qa render`, `theme`, and `assets`.

### Notes

- 75 tests, `node:test`, no test framework.
- Requires Node 18+. LibreOffice and Poppler are optional and only needed for `qa render` and `assets render`.
