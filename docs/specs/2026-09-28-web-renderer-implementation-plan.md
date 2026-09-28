# deckto — Web Renderer Implementation Plan

**Spec:** `docs/specs/2026-09-28-web-renderer-design.md`
**Date:** 2026-09-28
**Scope:** storyline-driven, single-file responsive HTML output alongside `.pptx`

## Phase 0 — Contract first: layout → component mapping

Write the mapping table as code before any renderer exists, so the contract is
executable rather than prose.

- `cli/lib/web-layouts.js` — exports `LAYOUTS` (the 6 keys) and a
  `canRender(layout)` guard. One key per §3.1 of the spec.
- `test/web-layouts.test.js` — asserts every `layout` used across
  `deck/*/storyline.md` resolves through `canRender`.
- **This test fails first** if any existing storyline uses a layout the web
  path can't render — which is the signal the table is incomplete.

**Exit:** contract test green, no renderer yet.

## Phase 1 — `cli/lib/web-renderer.js` (pure function)

`renderWeb({ storyline, theme, config, assets, baseDir }) -> string`.

- Reads nothing on its own; all inputs are passed in (testable without a
  filesystem). The CLI wrapper does the reading.
- Emits one HTML document: `<head>` with inlined CSS, `<body>` with one
  `<section>` per slide, inlined JS for nav/hash/presenter.
- Title/body use `clamp()` with floors derived from
  `deckto.config.json` `fonts.minTitlePt` / `minBodyPt`.
- Every slide renders a closed `<details>` whose first line is
  `INSIGHT: <insight>`.
- Assets read as base64 → `data:` URIs; no external `src=`/`href=` may survive.

**Exit:** golden fixture test green — single file, zero external references,
every slide carries a non-empty insight.

## Phase 2 — The six layout renderers

One function per layout, all pure `diagram` → HTML:

| layout | shape |
|---|---|
| `title-dark` | full-viewport hero, dark field, `sub` line |
| `comparison-columns` | 2-col grid, stacks under 720px, `columns` |
| `flow-diagram` | stepped row → column on narrow, `steps` |
| `icon-rows` | wrapping card grid, `rows` |
| `chart-focus` | chart area + supporting list, `checklist` |
| `stat-callout` | fluid `clamp()` figure, `stat`/`statLabel`/`tail` |

Unknown `layout` or missing `diagram` → throw with the spec's exact error
string. **No fallback, no silent text-only slide** — that is rule 2 failing
silently, the failure mode this whole feature must not reintroduce.

**Exit:** 6 unit tests green (structural assertions per layout) + error tests.

## Phase 3 — `deckto build <slug> [--web] [--all]`

New `cli/commands/build.js`, registered in `cli/bin/deckto.js`.

- `deckto build <slug>` → pptx only. **Behaviour must match
  `scripts/build-deck.js` exactly** — this is a move, not a rewrite.
- `deckto build <slug> --web` → additionally emits `deck/<slug>/web/index.html`.
- `--all` → both.
- Exit codes and `--json` envelope follow `qa.js`'s subcommand pattern
  (first non-flag token is the command; flags pass through intact).

Then delete `scripts/build-deck.js` and update every reference to it —
README line ~204, llms.txt, CHANGELOG. **Verify the scripts allowlist:** `build`
now ships under `cli/`, which *is* in the npm `files` allowlist; confirm no
regression to `assets`, which stays in `scripts/` (and is therefore still
unreachable via `npx` — file that as a known gap, do not silently fix it here).

**Exit:** `node --test` green; `deckto build <slug>` byte-identical pptx to the
pre-move script (build both, diff the output).

## Phase 4 — `deckto qa web <file.html>`

Deterministic checks only (vision QA deferred per spec §8.3):

1. every slide has a `<details>` whose first line starts `INSIGHT: `
2. no external `src=`/`href=`
3. emitted font floors ≥ `deckto.config.json` thresholds
4. every slide has a visual element (non-empty layout container)

Registers under the existing `qa` subcommand dispatch.

**Exit:** `qa web` green on the fixture; red on a deliberately broken fixture.

## Phase 5 — Regression test for today's bug

Extend `test/skills.contract.test.js` with: *every path referenced in a
`SKILL.md` resolves from that skill's own directory* (not from repo root).

This is the test that would have caught the `skills/pptx/` break. It covers
`references/` only today, which is exactly why that shipped.

**Exit:** test green on current tree; demonstrably red if you revert `abd9151`.

## Phase 6 — Docs + distribution

- README: `deckto build` usage, web output, `--web` flag
- llms.txt: command surface + test count
- CHANGELOG `[Unreleased]`: Added (web renderer, `build` command), Changed
  (build moved from `scripts/` to `cli/`), Known gap (`assets` still
  `scripts/`-only)
- Confirm `deckto doctor` still reports correctly

**Exit:** docs match shipped behaviour, not aspirational behaviour.

## Phase 7 — Release

- npm `0.1.1` — carries the frontmatter fix (`bd7a2b4`), the path fix
  (`abd9151`), and the web renderer. Registry currently ships broken skills.
- GitHub release notes updated to mention web output.
- Clean-room verify: `npx deckto@0.1.1 doctor` from an empty temp dir **outside
  the repo** — never done, and the one check that proves a stranger can use it.

**Exit:** `npm view deckto version` → `0.1.1`; clean-room doctor passes.

## Cross-phase rules

1. **Tests before implementation in each phase.** Phase 0's contract test
   exists before Phase 1 writes a renderer.
2. **No storyline schema change.** Reuse `layout` + `diagram` verbatim — the
   spec's core decision. If a phase needs a schema field, stop and escalate.
3. **Envelope contract preserved** — `{ ok, command, version, data, error }`,
   `--json` supported on every new command.
4. **Both decks must still build.** `deck/deckto-pitch` and
   `deck/ai-agent-skills` are the regression corpus; run them after Phase 3 and
   Phase 4.
5. **Static QA is necessary but not sufficient.** Every layout/collision defect
   you have caught came from the render pass. After Phase 4, render the web
   output and look at it before calling the phase done.
