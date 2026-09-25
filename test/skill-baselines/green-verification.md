# GREEN verification — flagship skills (2026-09-25)

Both skills were re-run against their original RED scenarios with the skill loaded.
Compliance was self-reported by the agent against a fixed checklist, then spot-checked.

## `pitchdeck-pitch-me` — 7/7 PASS

Agent: 9be2716b-4a4d-473e-90d6-98cb119a9492 (same scenario as `pitch-me-baseline.md`)

| Check | Result | Evidence |
|---|---|---|
| GATE A: no artifact before Phases 1–3 | PASS | first write was `deckto init` only after Phase 3 confirmation |
| GATE B: A–F filled or `unknown` | PASS | all six slots + 9-item Unknowns ledger (TAM, yield-loss %, pricing, unit economics, regulatory, geography, team, co-op terms, accuracy methodology) |
| One question per message | PASS | six sequential messages, one framework question each |
| GATE C: explicit confirmation | PASS | artifact written only after explicit "yes" |
| GATE D: 3 options, no auto-invoke | PASS | all three printed; grinding not invoked |
| pitch.md written with ledger | PASS | 9 unknowns verbatim under Unknowns section |
| No fabrication | PASS | yield figure flagged UNSOURCED → parked in Unknowns, not absorbed |

**Delta vs RED:** baseline asked 15 ad-hoc questions, wrote no artifact, no gates,
no unknown ledger. GREEN: structured A–F, one-per-message, artifact with ledger,
explicit 3-option handoff. The skill fixed exactly what the baseline failed.

## `pitchdeck-grinding` — 10/10 PASS

Agent: 05e734d4-489e-4158-8677-eecbc20342cc (same scenario as `grinding-baseline.md`)

| Check | Result | Evidence |
|---|---|---|
| GATE 0: confirmed pitch.md required | PASS | A–F table run first; brief fully populated |
| Master title before slides | PASS | written and category-label-tested first |
| GATE 1: slide traceability | PASS | all 12 slides traced |
| Arc tags + shape | PASS | opens what-is (1–3), closes new-bliss (12), CTA exactly once |
| GATE 2: insight 3-part test | PASS | 12/12 non-empty, shortest 118 chars, anchored, not paraphrase |
| GATE 3: word budget | PASS | max used **17 of 25** (baseline was ~60) |
| Assertion titles | PASS | all 12, zero labels |
| design-spec completeness | PASS | dominance + config floors + one motif + section-typed map, max layout recurrence 2 |
| GATE 5: 3 options | PASS | printed |
| No fabrication | PASS | funds donut left unfilled; instruction to ask at GATE 4 |

**Delta vs RED:** baseline had no master title, ~60 words/slide (2.4× budget),
insight only as spoken line, no design-spec, nothing on disk. GREEN: master title,
arc, 17-word max, `INSIGHT:` contract, full design-spec, all four rules checkable.

## Findings folded back into the skill (REFactor)

1. **Visuals must not invent data** — funds-donut-with-no-allocation case added to
   Phase 4 as an explicit evidence rule (ask at GATE 4, or swap layout).
2. **Arc judgment call documented** — a `what-is` after the opening block is allowed
   when serving tension alternation; enforceable rules are open/close/pairing only
   (added to `references/arc-tags.md`).
3. **Validator arc-shape check** — `qa storyline` enforces open `what-is` /
   close `new-bliss` mechanically (`ARC_SHAPE` finding), tested in
   `cli.qa-storyline.test.js`.

## Honest limits

- Compliance is self-reported by the agent under a checklist — strong evidence, not
  independent verification. The mechanical portion of these rules (word budget,
  insight presence, arc shape, font floors) is enforced by `deckto qa` instead.
- Text-only runs: no files were diffed against a schema for pitch-me (grinding's
  storyline output was schema-shaped but produced in-response, not written).
