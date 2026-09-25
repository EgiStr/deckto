# Question Framework — rationale and sources

Why each slot exists, what a good answer looks like, and where the method comes from.
Tier/access labels per `docs/research/frameworks-methodology.md`: `[A]` empirical ·
`[B]` book/standard · `[C]` practitioner · plus access (open / paywalled / DOI-only).

## A. Goal

**Ask:** What's the goal of this presentation? What should the audience *do* after?
What decision are you asking for?

**Why:** A deck with no decision attached is a document, not a presentation. Every
downstream choice (slide count, depth, ending) keys off this.

**How to probe:** SCQA — Situation (what's true now) → Complication (what changed /
what's at stake) → Question (what must be decided) → Answer (your recommendation).
If the user cannot state a Complication, say so: there is no tension, and a deck
without tension has no reason to exist. `[B]` Minto, *The Pyramid Principle* —
`paywalled — book`. SCQA definitions verified via practitioner guides `[C] [open]`:
Think Insights, Management Consulted, Deckary.

**Good answer:** "Convince the board to approve a 6-month pilot budget." / "Get a
second meeting with the investor." Bad: "Tell people about our product."

## B. Audience

**Ask:** Who is in the room? What do they already know? What's their likely objection?

**Why:** The insight test in `pitchdeck-grinding` is *relative to this audience* —
"so what?" has no answer without a "so what, to whom".

**How to probe:** Ask for the skeptic, not the audience: "If someone in that room
pushes back hardest, what's their argument?" Their objection becomes your strongest
slide. `[C]` `open` — standard pitch-coaching practice.

## C. Idea core

**Ask:** The idea in one sentence? The problem? Why now? What evidence do you have?

**Why:** This seeds the master title in `pitchdeck-grinding`. An idea that can't be
stated in one sentence cannot produce a controlling statement.

**How to probe:** "Why now?" is the question users most often cannot answer, and the
one investors most often ask. `[C]` `open`.

## D. Data readiness

**Ask:** Is the data ready? Where from exactly? What's missing? May I research or
estimate the gaps (marked as such)?

**Why:** Rule 3 (insight per slide) requires a concrete anchor — a number, a
measurement, a named source. Without data, insights degrade into adjectives.

**How to probe — indirect elicitation:** never accept "we have data". Ask "where
would someone actually find that number?" Indirect/probing questions surface needs
users don't state directly. `[A]` `paywalled — DOI 10.1109/ICRE.1996.491424`
(Hudlicka). Structured interviews beat unstructured recall: `[A]`
`paywalled — DOI 10.1109/ICRE.2002.1048544` (Lloyd/Rosson/Arthur 2002) and
`[A]` `paywalled — DOI 10.1109/RE.2018.00028` (Horkoff 2018).

**Critical rule:** if the user authorizes estimates, mark them
`estimated — method: <how>` in `pitch.md` and carry the marker all the way to the
slide's `evidence` field. An unmarked estimate is a fabrication.

## E. Assets

**Ask:** Existing assets (brand kit, logos, prior decks, charts)? Or must they be
sourced/generated? What theme or visual direction do you want?

**Why:** Answers decide `visual_source` (`existing` | `generate` | `research`) for
every slide in `storyline.md`. Skip this and Stage 3 either invents a look or
re-litigates design after the storyline is locked.

## F. Constraints

**Ask:** Time budget? Slide count? Format — internal memo, investor pitch, keynote?

**Why:** Slide count drives the storyline's granularity. A 10-minute investor pitch
and a 45-minute keynote need different slide counts and different depths for the
same idea.

**Literature note:** real pitch decks vary their visual composition by section
(`[A]` `open` — Cabezas 2026, DOI 10.1177/14703572261424383, analysing 96 decks), so
constraints are not just logistics; they change the design pattern.

## 5W1H completeness check (after the walk-through)

Before converging, verify each is accounted for: **Who** (audience — B),
**What** (idea — C), **Where/When** (context, timing — C/A), **Why** (goal,
complication — A), **How** (approach — C), plus **What's missing** (data/assets —
D/E). `[CONVENTION]` — classical attribution; labeled convention, not evidence.

Any gap that can't be filled → `unknown` ledger entry. Never inferred.
