---
name: pitchdeck-review
description: Use after pitchdeck-build produces a deck that needs judging — runs QA, reviews rendered slides against the four rules (storyline, visual-over-words, insight, font size), and emits scope-tagged findings for the loop-back. Trigger on "pitchdeck-review", "review the deck", "is this deck good", or after build handoff option 1. Do NOT use as a substitute for build QA (build owns its own gates) — this is the independent post-build judgment.
---

# Review — judge the deck, emit scoped findings

Independent post-build review: run both QA halves, judge the rendered slides against
the four rules, and produce findings that carry `scope` so the loop sends each defect
to the skill that owns it.

**Core principle:** A review without a scoped next step is a complaint. Every finding
names its scope and its fix target; the pipeline's loop (max 2 auto-iterations, then
`REVIEW_BLOCKED`) only works if scopes are honest.

## When to Use

- `pitchdeck-build` finished (its own gates passed)
- User asks "review the deck" / "is this ready"
- Re-review after a loop-back iteration (bounded by `review.maxAutoIterations`)

Do NOT use:
- Build QA hasn't run — build fails first, review shouldn't double-report it
- No deck file yet → `pitchdeck-build`

## Hard Gates

```
GATE 1: BOTH QA halves run before any judgment:
        deckto qa static + deckto qa render (when tools present).
        Render missing → say so; do not review from XML alone and call it visual.

GATE 2: EVERY finding carries scope: storyline | assets | deck.
        Scope decides the loop-back target — missing scope = unusable finding.

GATE 3: EVERY finding carries rule + evidence + fix.
        "Looks meh" without the slide number, the rule, and the fix is not a finding.

GATE 4: Findings are written to deck/<slug>/qa/findings.json in the qa report
        schema, then run `deckto qa report` for the loop directive.
        Honor REVIEW_BLOCKED — after maxAutoIterations, stop looping and ask the user.
```

## Phase 1 — Mechanical evidence

```bash
npx deckto qa static  deck/<slug>/deck.pptx --json
npx deckto qa render  deck/<slug>/deck.pptx --out deck/<slug>/qa/render
npx deckto qa storyline deck/<slug>/storyline.md --json   # cross-check intent vs output
```

Static failures (font floor, word budget, insight, visual, arc) are *already findings* —
import them with their scope (`deck` for build defects; if the same root cause lives in
storyline.md, scope it `storyline`).

## Phase 2 — Visual review of rendered slides

Read every JPG. Judge against the four rules + UX:

| Rule | What to look for | Typical scope |
|---|---|---|
| 1. Storyline | does the deck have a spine visible in the slide order? master title claim actually argued? | `storyline` |
| 2. Visual > wordy | paragraph walls, text-through-images, tiny-but-legible? | `deck` (build) or `storyline` (if body already over budget in source) |
| 3. Insight | headline carries a "so what"? or is it a label pretending? | `storyline` if source insight is weak, `deck` if notes lost it |
| 4. Font size | readable at back of room (judge from the image, not XML) | `deck` |
| UX | overlaps, off-center, contrast failures, inconsistent motif, placeholder artifacts | `deck` or `assets` |

**Judge the image, not the intent.** The storyline's intention doesn't reach the
audience — only pixels do.

## Phase 3 — Findings + loop directive

Write `deck/<slug>/qa/findings.json`:

```json
{ "file": "deck/<slug>/deck.pptx",
  "findings": [
    { "scope": "assets", "rule": "visual-quality",
      "slide": 7, "evidence": "flow.png rendered with overlapping node labels",
      "fix": "regenerate flow.svg with wider nodes, re-run assets render" }
  ] }
```

Then:

```bash
npx deckto qa report --findings deck/<slug>/qa/findings.json --iterations <n>
```

Output tells you the loop action: which scopes to re-invoke (storyline →
pitchdeck-grinding, assets → assets-generator, deck → pitchdeck-build) or
`REVIEW_BLOCKED` → present remaining findings to the user and stop.

## Phase 4 — Verdict

Present: pass/fail per rule, the scoped findings table, the loop directive, and the
three options (fix via loop / accept with noted risks / stop). Honesty over
smoothness: if the deck is thin on insight, say so with the slide numbers — a soft
review costs the user their pitch.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Reviewing only the XML | visual defects (overlaps, contrast) invisible |
| Findings without scope | loop can't route; iteration stalls |
| Re-scoping build defects as storyline | grinding re-runs unnecessarily; 4× cost |
| Ignoring REVIEW_BLOCKED cap | infinite loop; user never consulted |
| Reviewing intent ("the story is there") instead of pixels | rule 2 and UX pass on paper, fail on screen |

## Honesty note

The four-rule judgment is human-design-principled (`[A]`/`[B]` sources recorded in
`../../docs/research/frameworks-methodology.md`); the review applies them as structured
checklists, not as a validated scoring model. Two passes of the same review will not
produce identical numbers — findings with slide-level evidence remain actionable even
when verdicts are judgment calls.
