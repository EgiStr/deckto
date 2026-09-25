---
name: pitchdeck-pitch-me
description: Use BEFORE pitchdeck-grinding when you have a rough idea for a presentation and need to extract, question, and shape it first. Turns a vague idea into a confirmed brief with audience, goal, data, and assets mapped. Trigger on "pitchdeck-pitch-me", "pitch my idea", "I have an idea for a deck", "help me shape this presentation", or when no clear problem/goal/audience exists yet. Do NOT use when a completed pitch.md already exists — that starts pitchdeck-grinding.
---

# Pitch Me — idea extraction before any deck work

Extract the user's idea through a fixed questioning framework, converge it with
them, and write `deck/<slug>/pitch.md`. This skill and `pitchdeck-grinding` are
the pipeline's two core skills: **this one gets the idea OUT of the user's head.**

**Core principle:** Diverge first, converge second. No artifacts until the
framework is answered or explicitly marked `unknown`. Never invent answers.

## When to Use

- "I have an idea for a deck / pitch / presentation"
- "Pitch my idea", "help me shape this", "I need slides for …" with no brief
- Idea exists but goal, audience, data, or assets are unclear

Do NOT use:
- When `pitch.md` exists and is confirmed → `pitchdeck-grinding`
- When the user only needs a deck file rebuilt with no thinking → `pitchdeck-build`

## Off-ramp (advisory, non-blocking)

If the user already hands you a complete brief (goal, audience, data, assets,
constraints all stated), say so and offer: run the fast confirmation pass (Phase 1,
one question per gap only) or go straight to `pitchdeck-grinding`. Their call.

## Hard Gates

```
GATE A: NO ARTIFACT WORK before Phases 1-3 complete.
        pitch.md is written only at Phase 4. Silence is not an answer.

GATE B: EVERY framework slot (A-F) is filled OR marked `unknown`
        in pitch.md. Never silently filled, never invented.
        "Unknown" is a valid, honest answer — fabricated answers are not.

GATE C: USER MUST EXPLICITLY CONFIRM the converged synthesis.
        "ok", "sure", or silence while scrolling is not confirmation.

GATE D: HANDOFF MUST PRESENT ALL 3 OPTIONS. Do not auto-invoke
        pitchdeck-grinding on your own initiative.
```

## Phase 0 — Preflight (silent)

Check the workspace for existing material before greeting: prior decks
(`deck/*/`), brand assets, data files, `humanizer-context.md`. Greet with what
you found:

```
Found: <existing artifacts or "nothing yet">
What idea are we shaping?
```

## Phase 1 — Framework questioning (A–F)

Ask **one question per message**. Walk the framework in order; skip a slot only
if the user already answered it. Use multiple choice when natural.

| Phase | Theme | Probe |
|---|---|---|
| A. Goal | decision & purpose | What's the goal? What should the audience *do* after? What decision are you asking for? |
| B. Audience | who & skepticism | Who's in the room? What do they already know? What's their likely objection? |
| C. Idea core | the content | The idea in one sentence? The problem? Why now? What evidence do you have? |
| D. Data readiness | evidence state | Is the data ready? Where from exactly? What's missing? May I research/estimate gaps (marked as such)? |
| E. Assets | existing material | Existing assets (brand kit, logos, prior decks, charts)? Or must they be sourced/generated? What theme/visual direction? |
| F. Constraints | format & stakes | Time budget? Slide count? Format (internal / pitch / keynote)? |

Questioning discipline (see `references/question-framework.md` for rationale +
sources):

- **Indirect probing** over accepting first answers: "You said the data exists —
  where would someone actually find it?" `[EMPIRICAL: elicitation research]`
- **SCQA framing for Phase A**: push for Situation → Complication → Question →
  Answer. If the user can't state a Complication, the idea isn't ready to grind —
  say so plainly. `[BOOK/STANDARD: Minto]`
- **5W1H completeness check** after the walk-through: any W/H unaccounted? `[CONVENTION]`
- Record every gap as `unknown` — never fill it yourself.

## Phase 2 — Diverge (conditional)

Run only if Phase C stays fuzzy after two attempts (user can't state the idea in
one sentence) **or** the user asks for options.

Pick **3 methods** from `references/diverge-methods.md` (default trio: Question
Storming, First Principles, Six Thinking Hats). Output each method's results
visibly:

```
### [Method] — [category]
[4-6 ideas generated against THIS idea]
```

Then converge: present shortlist + discarded-with-reason.

## Phase 3 — Converge + confirm

```
## Problem synthesis
Goal (SCQA): <S / C / Q / A, one line each>
Audience: <profile + primary objection>
Data: <ready | partial | missing> — <one line>
Assets: <existing | generate | research> — <one line>
Constraints: <time / slides / format>
Unknowns: <list — explicitly unknown, to be resolved or carried>

Does this match what you want? (I'll write it to pitch.md next)
```

**GATE C:** explicit yes required. Revise on pushback.

## Phase 4 — Write pitch.md + handoff

Write `deck/<slug>/pitch.md` using the template from `deckto init` (run
`npx deckto init <slug>` first if the workspace doesn't exist). Fill every
framework slot; put gaps under **Unknowns** — never fabricate.

Then **GATE D** — present exactly these three options:

```
pitch.md written to deck/<slug>/pitch.md

What next?
  1. Invoke pitchdeck-grinding now (turns this into storyline + design spec)
  2. Iterate on <phase> before proceeding
  3. Save and stop here
```

Option 1 → invoke `pitchdeck-grinding`, passing the pitch.md path.
Option 2 → return to the named phase, revise, re-present the gate.
Option 3 → confirm path, stop cleanly.

## Common Mistakes

| Mistake | Why it breaks the deck |
|---|---|
| Asking "what's your idea?" then immediately building | Produces the agent's idea, not the user's — this is the #1 baseline failure |
| Filling a framework slot by inference | GATE B violation; the fabricated goal steers every downstream slide |
| 15 unstructured questions in one message | Overwhelms the user, still misses phases — framework + one-per-message prevents both |
| Auto-invoking grinding after synthesis | User never approved; changes cost 4× more downstream |
| Skipping Phase E | Assets decide `visual_source` for every slide; guessing here means re-grinding later |

## Reference Triggers

| Reference | When to Load |
|-----------|--------------|
| `references/question-framework.md` | Phase 1: per-question rationale, SCQA probes, sources |
| `references/diverge-methods.md` | Phase 2: method catalog + default trio |
