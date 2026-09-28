---
name: pitchdeck-build
description: Use when storyline.md and design-spec.md are approved and a .pptx file must be produced — transcribes the storyline into a real presentation with the INSIGHT notes contract, then runs static QA before handing off. Trigger on "pitchdeck-build", "build the deck", "generate the pptx", or when pitchdeck-grinding hands off. Do NOT use without an approved storyline (that is pitchdeck-grinding) and do NOT skip QA to hand off faster.
---

# Build — storyline to a real .pptx

Transcribe the approved `storyline.md` + `design-spec.md` into `deck/<slug>/deck.pptx`
via pptxgenjs, then pass the QA gates before anyone sees the deck.

**Core principle:** This stage is transcription, not invention. The storyline already
decided every word, visual, and layout. If you find yourself writing new copy at build
time, the storyline has a gap — go back, don't improvise.

## When to Use

- `storyline.md` validated (`npx deckto qa storyline ...` passes) and user approved (GATE 4 of grinding)
- Rebuilding an existing deck from its storyline (regeneration after copy edits)

Do NOT use:
- No storyline or unapproved → `pitchdeck-grinding`
- Deck file exists and only review is needed → `pitchdeck-review`
- Visual assets still missing → `assets-generator` first (build must not block mid-flight)

## Hard Gates

```
GATE 1: storyline.md passes `deckto qa storyline` BEFORE any build code runs.
        Open gates in build code do not exist — fix the storyline.

GATE 2: assets referenced by the storyline exist on disk (manifest from
        assets-generator). Missing asset + visual_source: generate → hand to
        assets-generator. Never render a placeholder box and hope.

GATE 3: EVERY slide's notes start with the frozen line
        "INSIGHT: <storyline insight>" — verbatim, first line, before any
        humanized elaboration. Humanizer rewrites ONLY after line 1.

GATE 4: body/title sizes honor deckto.config.json floors (minBodyPt /
        minTitlePt / statCalloutPt). Read the config — do not hardcode.

GATE 5: `npx deckto qa static <file>` passes (0 errors) before handoff.
        Also run `npx deckto qa render <file>` when available; review the JPGs.
```

## Phase 0 — Preflight

```
1. npx deckto qa storyline deck/<slug>/storyline.md     # GATE 1 — must pass
2. read deck/<slug>/design-spec.md                      # palette, fonts, motif, layout map
3. read deck/<slug>/assets/manifest.json                # GATE 2 — every generate/research asset present
4. read deckto.config.json                              # GATE 4 thresholds
5. read ../pptx/SKILL.md → ../pptx/pptxgenjs.md          # real API + pitfalls, do not freestyle
```

## Phase 1 — Theme constants

Derive ONCE from design-spec, never per-slide ad hoc:

```js
const T = {
  dominant: '#1B3A2F', secondary: '#F4F1E8', accent: '#E4572E',
  titleFont: 'Segoe UI', bodyFont: 'Segoe UI',
  minTitlePt: 36, minBodyPt: 14, statPt: 60,   // from deckto.config.json
};
```

Contrast pairs in the theme must already be validated (brand-design GATE 3 /
`deckto theme contrast`). Re-deriving colors here = violation.

## Phase 2 — Layout function per layout id

Map each `layout` id from the storyline/design-spec to ONE function
(`titleDark(slide, s)`, `statCallout(slide, s)`, …). Rules:

- Layout decides composition; the **storyline decides content**. Swap the storyline's
  `body`/`visual` into the composition, verbatim.
- Assertion title at `minTitlePt+` (or larger per layout), body at `minBodyPt+`.
- Title and body **never overlap**; every element inside slide bounds.
- `stat-callout` uses `statCalloutPt` for the number.
- The motif from design-spec appears in every layout function — that is what makes it
  a motif instead of a decoration.
- Layout map variety: honor design-spec (no two consecutive identical layouts).

## Phase 3 — Notes and insight (GATE 3)

```js
slide.addNotes(`INSIGHT: ${s.insight}\n\n${s.notes_draft}`);
```

Notes **start** with `INSIGHT: ` exactly — the static QA parses this line; a variation
(`Insight:`, second line, empty) fails the gate. The humanizer may later rewrite
everything after line 1 and never line 1 itself (documented in `../humanizer/SKILL.md`
deckto profile).

## Phase 4 — Generate, QA, iterate

```bash
npx deckto qa static deck/<slug>/deck.pptx --json
npx deckto qa render  deck/<slug>/deck.pptx --out deck/<slug>/qa/render   # when available
```

Loop until static passes, then **read the rendered JPGs** (`read_image`). Static QA
cannot see visual defects (overlaps, off-center, ugly contrast). Fix → re-render →
re-check. `qa report` aggregates findings; if review findings are in play, honor their
`scope` and the `maxAutoIterations` cap.

## Phase 5 — Handoff

Present the three options: open/review deck · iterate · stop. Never claim success
before GATE 5 evidence (QA output) has been shown.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Improvising copy because a slide "needs more" | storyline drift; GATE 1 was supposed to prevent this |
| Hardcoding 18pt "because it looks big" | floors come from config — different rooms, different config |
| Notes without `INSIGHT:` prefix | rule 3 becomes uncheckable; QA fails late |
| Skipping render review "since static passed" | overlaps and illegibility are invisible to static checks |
| Re-deriving theme colors per slide | inconsistent look; motif silently breaks |
| Building before assets exist | placeholder boxes shipped as final |

## Honesty note

pptxgenjs coordinates are in inches (13.333×7.5 for 16:9) — read layout dimensions from
`../pptx/pptxgenjs.md`, which also documents pitfall behavior (text overflow,
image aspect ratios). The deckto thresholds are conventions recorded in config, not
claims about projector science — say so if a user asks.
