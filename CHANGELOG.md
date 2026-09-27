# Changelog

All notable changes to deckto will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
