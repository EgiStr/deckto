# Slide Anatomy — what makes a slide pass the four rules

Every slide in `storyline.md` is judged on four things. This file is the reasoning
behind each test, with the source that backs it.

## 1. Title = assertion, not label `[A]`

**Test:** does the title state a claim someone could disagree with?

- ✗ "Market", "Our Solution", "Results", "Background"
- ✓ "Farmers spray blind because the expert is three days away"
- ✓ "Onboarding completion is the entire churn story"

**Evidence:** assertion-evidence slide design (full-sentence assertion headline +
visual evidence body) outperformed topic-headline+text slides on comprehension and
recall of complex concepts. `[A] [open]` Garner, Alley, Wolfe, Zappe, Sawarynski —
ASEE 2011, DOI 10.18260/1-2--17510. `[BOOK/STANDARD]` Alley, assertion-evidence
(book/conference corpus).

**Why it matters here:** the title is the one element guaranteed to be read. A label
title transmits nothing; an assertion transmits the whole slide even if everything
else is missed.

## 2. Insight = the so-what, distinct from the point `[B]`/`[C]`

**Test (all three must hold):**
1. Answers "so what?" **for the audience named in pitch.md phase B**
2. Has a concrete anchor — number, date, named entity, measured result
3. Is **not** a paraphrase of `point`

**Source:** `[B]` Heath & Heath, *Made to Stick* — concreteness and credibility
(SUCCESs); "so what?" discipline is `[C]` consulting/practitioner canon.
`[BOOK/STANDARD]` Minto, *Pyramid Principle* — answer-first structure means each
supporting point carries its own conclusion.

**Failing examples:**
- point: "We cut onboarding from 9 steps to 3" → insight: "Onboarding was shortened"
  *(paraphrase — fails test 3)*
- point: "Market is $4B" → insight: "The market is large" *(no anchor, no so-what
  relative to an investor — fails 1 and 2)*

**Passing:** point: "We cut onboarding from 9 steps to 3." → insight: "Setup friction,
not price, was the churn driver — every paid signup was leaking in the first hour."

If a real insight can't be written, the slide has no reason to exist. Cut it.

## 3. Body ≠ speaker notes `[A]`

**Rule:** slide body carries the minimum needed to support the visual. Everything
else goes to `notes_draft`.

**Evidence:** the **redundancy principle** — on-screen text that duplicates spoken
narration hurts learning; **signaling** and **coherence** principles — attention
cues help, decorative extraneous material hurts.
`[A] [paywalled — DOI 10.1017/cbo9781139547369.015]` Fiorella & Mayer, Cambridge
Handbook of Multimedia Learning (2014 ed., pp. 279–315); earlier edition
`[A] [paywalled — DOI 10.1017/cbo9780511816819.013]`.

**Word budget:** `words.maxBodyPerSlide` (default 25) is an *empirical-derived*
threshold, not a quoted standard — it operationalizes working-memory limits from
Cognitive Load Theory `[A] [Sweller — paywalled, DOI at implementation time]`.
Tune it in `deckto.config.json`; don't argue it in prose.

## 4. Visual present, and chosen by section `[A]`

**Rule:** every slide declares a `visual` and a `visual_source`.

**Evidence:** analysis of 96 real accelerator pitch decks found visual element use
**varies systematically by deck section** — so section-typed visual treatment is
empirically grounded, not stylistic preference. `[A] [open]` Cabezas, *Visual
composition of the pitch deck*, Visual Communication (SAGE) 2026,
DOI 10.1177/14703572261424383.

**Practical mapping:** problem sections carry tension imagery; market sections carry
charts; team sections carry people/identity; the ask carries a use-of-funds visual.

## Font floors (rule 4 — belongs to design-spec, enforced by CLI)

Static QA checks every body run against `fonts.minBodyPt` and title runs against
`fonts.minTitlePt`. **Honesty label:** published font-size guidance varies by room
size and audience distance, and **no empirical source was found** for absolute
thresholds like "14pt" or "24pt" `[C] [open]` — see
`docs/research/frameworks-methodology.md` Part 5 verification log. deckto therefore
treats its floors as a **convention plus a derived visual-angle rationale**, and
labels them that way rather than citing a standard that doesn't govern slides.
