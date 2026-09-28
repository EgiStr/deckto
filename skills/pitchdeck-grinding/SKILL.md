---
name: pitchdeck-grinding
description: Use when a confirmed pitch.md exists and the idea must be ground into a build-ready storyline — master title, per-slide insights, full-detail content, and design spec. Trigger on "pitchdeck-grinding", "grind this into a storyline", "build the storyline", or when pitchdeck-pitch-me hands off. Do NOT use before pitch.md exists and is user-confirmed — that starts pitchdeck-pitch-me.
---

# Grinding — idea to full-detail storyline

Grind a confirmed `pitch.md` into `storyline.md` + `design-spec.md` +
`usecase-flow.md` — detailed enough that `pitchdeck-build` is near-mechanical
transcription. This is skill #2 of deckto's two core skills.

**Core principle:** Master title first, then arc, then slides. A slide that doesn't
trace to the master title is cut, not reworded. No handoff through an open gate.

## When to Use

- `pitch.md` exists and the user confirmed it
- `pitchdeck-pitch-me` just handed off
- Re-grinding after review findings scoped `storyline`

Do NOT use:
- No confirmed `pitch.md` → `pitchdeck-pitch-me` (GATE 0 below blocks you anyway)
- Storyline exists and is approved → `pitchdeck-build`

## Hard Gates

```
GATE 0: NO GRINDING without a confirmed pitch.md.
        Missing framework slots (A-F) → hand back to pitchdeck-pitch-me.

GATE 1: EVERY slide traces to the master_title, or it is cut.
        "Traces to" = removing the slide weakens the master claim.

GATE 2: NO EMPTY INSIGHT, no trivial insight (< 10 chars, schema-enforced).
        If you cannot write a real "so what", the slide is cut — not padded.

GATE 3: WORD BUDGET from deckto.config.json (default 25 words body).
        `point + insight + body` over budget does not hand off.

GATE 4: USER APPROVES storyline before design-spec is finalized
        (design-spec depends on slide layouts; don't design twice).

GATE 5: HANDOFF PRESENTS 3 OPTIONS — invoke build / iterate / stop.
```

## Phase 0 — Read pitch.md

Load `deck/<slug>/pitch.md`. Missing slots or unexplained `unknown`s that block a
specific slide → **GATE 0**: tell the user which slot and hand back to
`pitchdeck-pitch-me`. Unknowns that only affect evidence fields are allowed —
carry them as `evidence: unknown`.

## Phase 1 — Master title (Minto)

Derive ONE master title from the pitch's SCQA Q+A: a single controlling statement
the whole deck argues for. `[BOOK/STANDARD: Minto, Pyramid Principle — paywalled]`

```
master_title: "<one sentence — the claim every slide serves>"
```

Test it: could a competitor's deck also carry this line? If yes, it's a category
label, not a claim — sharpen it. Present to user, **GATE 4** applies at the
storyline level (single confirm after Phase 3).

## Phase 2 — Lay the arc (Duarte)

Tag each planned slide with its arc role before writing detail:
`what-is` → `what-could-be` → `call-to-action` → `new-bliss`.
`[BOOK/STANDARD: Duarte, Resonate]` arc mechanics verified via
`[C] [open]` duarte.com/blog.

Rules:
- Deck **opens** on `what-is` (current reality the audience agrees with)
- Deck **closes** on `new-bliss` (world with the idea adopted) — not on an ask
- Contrast pairs: every `what-is` tension gets a `what-could-be` answer
- All-`what-is` deck (a status dump) violates the storyline rule → fix before Phase 3

## Phase 3 — Full-detail slides → storyline.md

Write EVERY slide complete. Schema: `references/storyline.schema.json` (the
build and CLI validate against the same shape).

```yaml
master_title: "..."
- slide: 1
  title: "<assertion — states the point, not the label>"
  point: "<what we say>"
  insight: "<the so-what, anchored to audience B, concrete>"
  body: "<final on-slide copy — <= words.maxBodyPerSlide>"
  visual: "<what the audience SEES>"
  visual_source: "existing|generate|research"   # from pitch.md phase E
  evidence: "<data/source | unknown | estimated — method: ...>"
  layout: "<from design-spec layout vocabulary>"
  arc: "what-is|what-could-be|call-to-action|new-bliss"
  notes_draft: "<speaker elaboration — the INSIGHT line is added at build>"
```

**Insight test** (all three must hold — see `references/slide-anatomy.md`):
1. Answers "so what?" **for the audience in pitch.md B**
2. Has a concrete anchor (number, event, named thing) — or is explicitly flagged unknown
3. Is not a rephrase of `point` `[BOOK/STANDARD: Heath, Made to Stick — concreteness]`

**Title test:** assertion, not label. "Guided onboarding cuts churn 40%" ✓,
"Results" ✗. `[A] [open: ASEE 2011, DOI 10.18260/1-2--17510]` — assertion-evidence
titles measurably improve comprehension/recall.

**Body ≠ notes:** slide body carries the visual-supporting minimum; full prose goes
in `notes_draft`. Duplicating speech on screen hurts learning
`[A] [paywalled — DOI 10.1017/cbo9781139547369.015, Mayer redundancy principle]`.
Budget derives from working-memory limits `[A] [Sweller, CLT]`.

**GATE 2/3 check before proceeding:** run every slide through the insight test and
word count. Cut or trim — do not hand off and hope build catches it.

## Phase 4 — design-spec.md + usecase-flow.md

**design-spec.md** (font floors locked HERE, before any build):
- Palette: 1 dominant (60–70% weight) + 1–2 support + 1 accent — never equal weight
- Font pair (safe deck pairings), floors read from `deckto.config.json`
- ONE motif carried across every slide
- Section-typed layout map — visual treatment varies by deck section
  `[A] [open: Cabezas 2026, DOI 10.1177/14703572261424383]` — 96 real decks
- Contrast: text meets deckto's projection adaptation (see design-spec template)

**usecase-flow.md:** use-case table + mermaid flowchart (rendered later to
`assets/flow.png` by `assets-generator`).

**Phase 4 evidence rule:** a slide whose visual requires data the brief doesn't have
(a use-of-funds donut with no allocation, a market slide with no market number)
must NOT get invented values. Either (a) leave the data-bearing visual unfilled and
put the question in the GATE 4 confirmation, or (b) swap the layout for one the
available data can carry (a milestone bar instead of a donut). Never render a visual
with fabricated slices.

Then present the full storyline for **GATE 4**.

## Phase 5 — Handoff

**GATE 5** — three options:

```
Storyline + design spec written (N slides, master title confirmed).

1. Invoke pitchdeck-build now (assets + .pptx)
2. Iterate on <phase>
3. Save and stop
```

Option 1 → invoke `pitchdeck-build`, passing the `deck/<slug>/` path.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Writing slides before the master title | No spine — slides drift, rule 1 fails |
| Insight = rephrase of point ("we cut churn" / "churn was cut") | Rule 3 fails vision QA even though text exists |
| Dumping spoken prose onto the slide body | Rule 2 fails; word budget catches it late |
| Designing before storyline approval | Palette/layout work redone after cuts |
| Inventing evidence to fill an `evidence` field | `[verify]`/`unknown` markers exist for this — use them |
| Cutting nothing when slides overrun | A 18-slide deck for a 10-min slot breaks pacing — cut, don't shrink fonts |

## Reference Triggers

| Reference | When to Load |
|-----------|--------------|
| `references/slide-anatomy.md` | Phase 3: insight test, assertion titles, word budget rationale |
| `references/arc-tags.md` | Phase 2: arc rules and per-tag guidance |
| `references/design-spec-template.md` | Phase 4: full template incl. palette/contrast floors |
