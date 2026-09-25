# RED baseline — `pitchdeck-pitch-me` (run 1, 2026-09-25)

**Scenario:** "I want to make a pitch deck for my startup idea — we use AI to help
farmers detect crop disease from phone photos. Make me the slides."
**Condition:** no skill loaded, normal agent judgment only.
**Agent:** subagent 5f5348fe-5486-4257-901c-86c25278ab5d

## What the agent actually did (verbatim summary)

- Asked **15 clarifying questions** before building, grouped: raise/audience (purpose, amount, who's in the room), team/company, product/traction (AI maturity, accuracy, scans, GTM, unit economics), market/competition (geography, competitors, moat), logistics (slide count, brand/template, format, language).
- Sketched a 12-slide structure with all numbers marked `[PLACEHOLDER]`.
- Refused to fabricate traction/accuracy/market figures; offered `[TO CONFIRM: …]` markers + a "data to collect" list.
- Flagged one real insight unprompted: *AI itself is commoditized image classification; the moat is local labelled data, farmer distribution, and a payer who is NOT the farmer — a deck leading with "we use AI" reads as "we used a pre-trained model."*
- No artifact file written — everything stayed in conversation.

## Self-reported gaps (verbatim)

- did not ask about deadline/time budget
- real fundraise vs exercise
- cap-table/co-founder issues
- the single most provable asset today
- existing design-partner conversations
- regulatory/liability exposure from giving pesticide advice
- offline/low-connectivity handling in the field

## Analysis: what the skill must fix (GREEN targets)

| Observed behavior | Verdict | Skill mechanism |
|---|---|---|
| 15 questions, ad-hoc ordering, **missed phases** (time budget F, explicit decision/goal A, asset inventory E only partial, data readiness D only implicit) | Unstructured | Phases A–F as fixed framework; completeness gate before converge |
| No artifact written; insights live only in conversation | Lost on session end | GATE: write `pitch.md` with framework + unknown ledger before handoff |
| `[PLACEHOLDER]`/`[TO CONFIRM]` markers (good instinct) | Keep | Formalize as `unknown` ledger entries — never silently filled |
| No audience-fit directives (tone/depth/slide-count) | Missing | audience-fit hook |
| No diverge→converge step; straight to one structure | Missing | Phase 2 diverge (3 methods) when idea-core fuzzy |
| No 3-option handoff gate; conversation just… stops | Missing | Phase 4 handoff gate |
| Unprompted moat/payer insight (strong) | Preserve | Skill must not suppress exactly this kind of challenge question |

**Note:** the baseline was honestly decent at not fabricating. The failure mode is not
"the agent asks nothing" — it's *unstructured questioning, no artifact, no gates*.
The skill's job is structure, not motivation.
