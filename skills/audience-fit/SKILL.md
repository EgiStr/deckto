---
name: audience-fit
description: Use when a deck's audience must be profiled before tone, depth, font size, or slide count can be decided — called by pitchdeck-pitch-me Phase 1 phase B, or standalone when someone asks "who is this deck for" / "how should I pitch this to X". Produces an audience profile with explicit directives. Do NOT use as a substitute for the full pitch-me questioning framework.
---

# Audience Fit — who is in the room, and what that changes

Profile the deck's audience and emit **directives** that downstream stages obey:
tone, depth, evidence type, font size floor, and recommended slide count.

**Core principle:** An insight is only an insight relative to a specific audience.
"so what?" has no answer without a "so what, to whom" — so this runs before grinding,
not after.

## When to Use

- `pitchdeck-pitch-me` Phase 1 (phase B) calls it
- Standalone: "who should this deck target", "how do I pitch this to <audience>"
- Re-profiling when the audience changes mid-deck (rare, but it invalidates tone)

## Phase 1 — Four questions

Ask one at a time (same discipline as `pitchdeck-pitch-me`):

| # | Question | Why it changes the deck |
|---|---|---|
| 1 | **Who exactly is in the room?** (roles, not "investors") | Role determines what counts as evidence |
| 2 | **What do they already know?** | Sets the baseline — explaining known things wastes the deck |
| 3 | **What decision can they actually make?** | Bounds the ask; asking beyond their authority wastes the close |
| 4 | **What's their strongest objection?** | Becomes the highest-value slide (usually the moat/risk slide) |

## Phase 2 — Profile

Map to a profile. When someone spans two, pick the **narrower** — you can always
under-explain less.

| Profile | Optimize for | Evidence that lands | Typical length |
|---|---|---|---|
| `investor` | return, market, defensibility, team | traction numbers, unit economics, market sizing | 10–15 slides |
| `board` | decisions, risk, tradeoffs | trend lines, variance vs plan, named risks | 12–20 |
| `technical-client` | feasibility, integration, correctness | architecture, benchmarks, honest limits | 15–25 |
| `executive` | cost, time, risk to them | the recommendation, options, cost of delay | 5–10 |
| `general` | clarity, story, one takeaway | narrative, concrete examples, analogy | 10–20 |

## Phase 3 — Emit directives

Write this block into `pitch.md` (pitch-me) or return it standalone:

```yaml
audience_profile:
  profile: "investor"                # from the table
  roles: ["seed-stage partner", "associate"]
  known_baseline: "<what we can skip explaining>"
  decision_authority: "<what they can approve>"
  primary_objection: "<the strongest pushback>"
directives:
  tone: "professional"               # feeds humanizer --voice
  depth: "shallow-broad"             # vs deep-narrow
  evidence_priority: "traction-first"
  font_floor_override: null          # null = use deckto.config.json floors
  recommended_slides: 12
  must_include_slide: "<the objection slide>"
```

## Rules

- **Never invent the audience.** If the user doesn't know, that's an
  `unknown` entry — an invented audience silently corrupts every downstream choice.
- **The objection is required.** An audience with no stated objection has not been
  profiled; ask again.
- **Font floor override is rare.** Only for genuine room-size constraints (a keynote
  in a 2,000-seat hall raises floors; a 1:1 read-on-laptop deck may lower them).
  Default is always the config value — this is an escape hatch, not a dial.
- **`must_include_slide` is the point of this skill.** The objection slide is
  usually the one amateurs cut.

## Honesty note

The profile table is `[C]` practitioner convention (pitch-coaching canon, investor
guidance), not empirically validated audience segmentation. Deck-length ranges are
conventions that vary wildly by context. Recorded as conventions deliberately — the
skill's value is forcing the four questions, not the precision of the table.
