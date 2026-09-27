# deckto Methodology Research — Frameworks for `pitchdeck-pitch-me` & `pitchdeck-grinding`

**Date:** 2026-09-25
**Purpose:** Ground the two flagship skills in researched frameworks (academic + practitioner), each mapped to a concrete skill mechanism. This file is the source map; each skill's `references/` folder pulls its own entries from here.

**Labels:** Tier = evidence quality (`[A]` empirical · `[B]` book/standard · `[C]` practitioner convention). Access = retrievability (`open` link verified at build time · `paywalled` cite via DOI · `DOI-only` · `link unverified`). Access never changes tier.

---

## Part 1 — The pocketto structural model (how a skill is built)

Extracted from `rfxlamia/pocketto` (`pocket-pitching/SKILL.md`, `pocket-grinding/SKILL.md` — verified at source):

| Pattern | Pocketto usage | deckto adoption |
|---|---|---|
| **Hard Gates** (numbered, explicit, fail-closed) | GATE 1: no diverge without problem confirmation; GATE 2: advisor call mandatory; GATE 5: edge-case hunter mandatory | `pitch-me`: GATE A — no artifact work before framework A–F answered or marked `unknown`; `grinding`: GATE — no handoff with empty `insight`, over-budget slide, or slide not tracing to master title |
| **Numbered Phases** with a stated goal each | Phase 0 Preflight → Phase 7 Handoff | Stage 1: Phases 0–4; Stage 2: Phases 0–5 (see Part 4) |
| **Sufficiency Gate** (advance only when criteria met) | Discovery Sufficiency Gate: actor/trigger/outcome/failure/boundary/acceptance each identified | Framework Completeness Gate: each of A–F filled or explicitly `unknown` before converge |
| **One question per message** | "Never ask two questions in one message" | Same rule in `pitch-me` (also our own brainstorming discipline) |
| **Diverge → converge** with explicit user confirmation | Diverge first, converge second; user confirms problem statement | `pitch-me` Phase 2/3; silence is not approval |
| **Reference files loaded on demand** | `references/brainstorming-methods.csv`, `edge-case-hunter-prompt.md` etc. via "Reference Triggers" table | `references/` per skill; loaded only at the phase that needs them (token discipline) |
| **Off-ramp advisory** (route to lighter skill) | Phase 1.5 Triviality → `hotfix` | `pitch-me` off-ramp: "deck already has a full brief → go straight to `grinding`" |
| **Advisor / LLM-to-LLM curation** | `advisor()` mandatory in Phase 2c | Used where available (Pi `advisor`); degraded path = self-curation pass with stated limits |
| **Explicit handoff gate** | 3 options: invoke next / iterate / save-and-stop | Stage 1 → 2 handoff offers same 3 options |

Structural lesson: **gates make a skill enforceable instead of aspirational.** Every rule the user gave (4 syarat) becomes a gate or a CLI check, never a passive wish.

---

## Part 2 — Frameworks for `pitchdeck-pitch-me` (idea extraction)

### 2.1 Structured questioning from elicitation research `[A]`

Idea extraction is requirements elicitation wearing a suit. The evidence: elicitation technique effectiveness is directly studied.

| Source | Claim supported | Tier / Access |
|---|---|---|
| Lloyd, Rosson, Arthur, *Effectiveness of elicitation techniques in distributed requirements engineering*, IEEE RE 2002, DOI: [10.1109/ICRE.2002.1048544](https://doi.org/10.1109/ICRE.2002.1048544) | Different elicitation techniques differ measurably in effectiveness; structured interviews outperform unstructured recall | `[A]` `paywalled — DOI` |
| Horkoff et al., *Efficiency and Effectiveness of Requirements Elicitation Techniques*, IEEE RE 2018, DOI: [10.1109/RE.2018.00028](https://doi.org/10.1109/RE.2018.00028) | Technique selection should be deliberate; interviews + brainstorming + questionnaires are among the strongest for surfacing unstated needs | `[A]` `paywalled — DOI` |
| Hudlicka, *Requirements elicitation with indirect knowledge elicitation techniques*, ICRE 1996, DOI: [10.1109/ICRE.1996.491424](https://doi.org/10.1109/ICRE.1996.491424) | Indirect/probing questions surface needs users don't state directly | `[A]` `paywalled — DOI` |
| Requirement elicitation technique surveys (interview / brainstorming / document analysis / focus group taxonomy) — practitioner syntheses (softwaretestinghelp, ScienceDirect Topics, academic thesis trepo.tuni.fi) | Canonical technique taxonomy: conversational (interview), collaborative (brainstorming/workshop), documentary (artifact review) | `[C]` `open` |

**Skill mechanism:** `pitch-me` Phase 1 uses *conversational* structured interview (phases A–F), Phase 2 uses *collaborative* divergent brainstorming when idea-core is fuzzy, and a *documentary* pass when the user offers existing artifacts (prior decks, brand kit → feeds phase E). Phase D/E explicitly invoke **indirect probing**: "you say the data exists — where would someone find it?" rather than accepting the first answer.

### 2.2 SCQA — the goal-discovery structure `[B]`

Minto's Situation → Complication → Question → Answer frames *why the presentation must exist* before any slide does.

| Source | Claim supported | Tier / Access |
|---|---|---|
| Minto, *The Pyramid Principle* (Barbara Minto, McKinsey, 1970s–) | Answer-first structure; main line = one controlling idea | `[B]` `paywalled — book` |
| SCQA practitioner guides verified: [Think Insights SCQA Logic](https://thinkinsights.net/strategy/scqa-logic), [Management Consulted SCQA](https://managementconsulted.com/scqa-framework), [Deckary Pyramid Principle guide](https://deckary.com/blog/pyramid-principle-consulting) | SCQA definitions + worked pitch examples; "mirrors how people naturally process information" (practitioner claim) | `[C]` `open` (link verified) |

**Skill mechanism:** Phase A (Goal) converts the user's raw idea into an SCQA frame; the **Q + A of SCQA seed the master title** in `grinding`. If the user can't state the Complication, the idea isn't ready to grind — that's a GATE, not a warning.

### 2.3 The question framework itself (A–F) — 5W1H completeness + JTBD-style goal questions `[B]`/`[C]`

- 5W1H (Who/What/Where/When/Why/How) as a completeness checklist — `[B]` classical attribution (attributed to Kipling/Coleman — cited as convention lineage, `[CONVENTION]`).
- Presentation-goal questions ("what should the audience *do* after?") — practitioner pitch-coaching canon — `[C]`.
- Every question in the framework table gets its phase-mapping + one-line rationale (pocketto's "selection rationale" pattern).

### 2.4 Diverge → converge `[B]`/`[C]`

- Structured brainstorming methods (question storming, first principles, Six Thinking Hats as pocketto's default trio) — adapted from pocketto's `brainstorming-methods.csv` pattern — `[B]` (van der Kinkelen/Osborn, Six Hats de Bono — book citations) / mechanism `[C]`.
- **Skill mechanism:** Phase 2 runs 3 selected methods, outputs results visibly, then converges (Phase 3) with explicit user confirmation.

---

## Part 3 — Frameworks for `pitchdeck-grinding` (storyline + detail)

### 3.1 Master title = Minto Pyramid main line `[B]`

One controlling statement; every slide is a supporting argument keyed to it. Mechanism: `master_title` field; slides that don't trace to it are cut (GATE). Same DOI-free book citation as 2.2.

### 3.2 Story arc — Duarte *Resonate* `[B]` + `[C]`

| Source | Claim supported | Tier / Access |
|---|---|---|
| Duarte, *Resonate: Present Visual Stories That Transform Audiences* | Arc: **what is → (repeated contrast) → what could be → call to action → new bliss**; two turning points; contrast (content/emotion/delivery) drives tension | `[B]` `paywalled — book` |
| [duarte.com/blog — structure & story techniques](https://www.duarte.com/blog/move-presentation-audience-with-story-techniques-in-presentations) (verified), [Willis Wired review w/ page cites](https://www.williswired.com/2011/10/26/resonate-presentation-form) | Worked arc structure with page references (38–44); "new bliss" ending | `[C]` `open` (link verified) |

**Skill mechanism:** `storyline.md` gets an **arc annotation** — each slide tagged `what-is` / `what-could-be` / `call-to-action` / `new-bliss`; the deck must open on agreed `what-is` and close on `new-bliss`. A deck whose slides are all `what-is` (pure status dump) fails the storyline gate — this is rule 1 made mechanical.

### 3.3 Assertion-evidence slides `[A]`

| Source | Claim supported | Tier / Access |
|---|---|---|
| Garner, Alley, Wolfe, Zappe, Sawarynski, *Assertion-Evidence Slides Appear to Lead to Better Comprehension and Recall of More Complex Concepts*, ASEE 2011, DOI: [10.18260/1-2--17510](https://doi.org/10.18260/1-2--17510) | Slides with **assertion titles** (full-sentence claim) + supporting visual evidence produce better comprehension and recall than topic-title + text slides | `[A]` `open` (ASEE proceedings) |

**Skill mechanism:** every `storyline.md` slide title must be an **assertion** (states the point, not the label: "Churn drops 40% when onboarding is guided" — not "Results"). The `insight` field is the assertion-evidence companion: title asserts, insight explains the so-what, visual provides evidence. **This single paper underwrites rules 2 and 3 together.**

### 3.4 Cognitive science of the slide itself `[A]`

| Source | Claim supported | Tier / Access |
|---|---|---|
| Mayer (Fiorella & Mayer), *Principles for Reducing Extraneous Processing in Multimedia Learning: Coherence, Signaling, Redundancy, Spatial/Temporal Contiguity*, Cambridge Handbook of Multimedia Learning, DOI: [10.1017/cbo9781139547369.015](https://doi.org/10.1017/cbo9781139547369.015) (2014 ed., pp. 279–315; earlier ed. DOI: [10.1017/cbo9780511816819.013](https://doi.org/10.1017/cbo9780511816819.013)) | **Signaling** (visual cues guide attention), **redundancy** (on-screen text duplicating narration/speech hurts learning → don't write the speaker's words on the slide), **coherence** (decorative junk hurts) | `[A]` `paywalled — DOI` (Cambridge Handbook) |
| Sweller, *Cognitive Load During Problem Solving: Effects on Learning*, Cognitive Science 12(2):257–285, DOI: [10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4) (1988) — the origin paper for Cognitive Load Theory (germane/extraneous/intrinsic load; limited working memory). Verified via CrossRef: 8,662 citations. | Word budgets per slide are a *cognitive-load* constraint, not taste | `[A]` `paywalled — DOI` (Wiley) |
| Sweller, *Element Interactivity and Intrinsic, Extraneous, and Germane Cognitive Load*, Educational Psychology Review 22(2):123–138, DOI: [10.1007/s10648-010-9128-5](https://doi.org/10.1007/s10648-010-9128-5) (2010) — the refinement that splits load into the three named types the word-budget rule leans on. | Which load the word budget actually reduces (extraneous), and why "more detail" is not automatically better | `[A]` `paywalled — DOI` (Springer) |

**Skill mechanism:** redundancy principle → **slide body ≠ speaker notes** (body carries the visual-supporting minimum; full prose lives in notes). Coherence → `assets-generator` forbids decorative filler. Signal → one motif + stat callouts. Word budget (default 25 words body) derives from CLT and is configurable, tagged `[EMPIRICAL-derived]`.

### 3.5 Pitch-deck-specific empirical research `[A]`

| Source | Claim supported | Tier / Access |
|---|---|---|
| Cabezas, *Visual composition of the pitch deck: a multimodal analysis of entrepreneurial pitch presentations*, Visual Communication (SAGE), DOI: [10.1177/14703572261424383](https://doi.org/10.1177/14703572261424383) — 96 real accelerator decks analysed | Visual element use **varies systematically by deck section** (problem, solution, market, team get different visual treatments) → design-pattern-per-section is empirically grounded, not stylistic | `[A]` `open` (PDF listed at sagepub) |

**Skill mechanism:** `design-spec.md` assigns **section-typed layouts** (e.g. problem → tension visual; market → chart; team → photo/identity grid) — section-aware design pattern, directly supported by this study.

### 3.6 Insight-vs-telling (rule 3) `[B]`/`[C]`

- Heath & Heath, *Made to Stick* (SUCCESs: Simple, Unexpected, Concrete, Credible, Emotional, Stories) — concreteness test for insights — `[B]` book.
- "So what?" test — consulting/practitioner canon — `[C]`.
- **Skill mechanism:** an insight must pass: (a) answers "so what?" for the *audience in phase B*, (b) contains a concrete (ideally numeric) anchor, (c) is not a rephrase of `point`. Static QA checks presence; vision pass + humanizer check quality.

---

## Part 4 — Framework → skill phase mapping (summary)

### `pitchdeck-pitch-me` phases

| Phase | Name | Framework base |
|---|---|---|
| 0 | Preflight (scan existing artifacts, prior decks) | documentary elicitation `[A/C]` |
| 1 | Framework questioning A–F, one per message | structured interview elicitation `[A]` + 5W1H `[CONVENTION]` + indirect probing `[A]` |
| 2 | Diverge (3 methods) when idea-core fuzzy | pocketto diverge model `[B/C]` |
| 3 | Converge + user confirmation + SCQA goal frame | SCQA `[B/C]` |
| 4 | Write `pitch.md` + handoff gate (3 options) | pocketto handoff pattern |

### `pitchdeck-grinding` phases

| Phase | Name | Framework base |
|---|---|---|
| 0 | Read `pitch.md`; block if A–F has unexplained gaps | sufficiency gate (pocketto) |
| 1 | Derive **master title** (from SCQA Q+A) | Minto pyramid `[B]` |
| 2 | Lay arc: what-is → what-could-be → CTA → new bliss | Duarte `Resonate` `[B/C]` |
| 3 | Fill slides full-detail (assertion title / point / insight / body / visual / evidence / notes) | assertion-evidence `[A]` + SUCCESs `[B]` + CLT word budget `[A]` |
| 4 | `design-spec` (section-typed patterns, palette dominance, motif, font floors) | Cabezas `[A]` + Mayer signaling `[A]` + convention tags for font `[C]` |
| 5 | Gates: master-title traceability, non-empty insight, word budget → handoff | GATEs (pocketto model) |

---

## Part 5 — Verification log

| Source | Verified (date) | Result |
|---|---|---|
| pocketto `pocket-pitching/SKILL.md`, `pocket-grinding/SKILL.md` | 2026-09-25 | read at source, structures extracted |
| Garner et al. 2011 DOI 10.18260/1-2--17510 | 2026-09-25 | CrossRef confirmed |
| Mayer chapter DOIs (2005/2014/2021 eds.) | 2026-09-25 | CrossRef confirmed |
| Cabezas DOI 10.1177/14703572261424383 | 2026-09-25 | CrossRef confirmed, PDF URL listed |
| Lloyd/Rosson/Arthur 2002, Horkoff 2018, Hudlicka 1996 DOIs | 2026-09-25 | CrossRef confirmed |
| duarte.com blog structure article | 2026-09-25 | fetched, content matches claim |
| Think Insights / Management Consulted / Deckary SCQA pages | 2026-09-25 | fetched, definitions match |
| Font-size guidance (beautiful.ai, presentations.ai, whitepage, magicslides) | 2026-09-25 | fetched — **all `[C]` convention; no empirical source found for "14pt"/"24pt" absolutes**; ranges vary by room → deckto threshold = derived adaptation, tagged `[CONVENTION + derived visual-angle rationale]` |
| Sweller CLT primary papers | 2026-09-25 | CrossRef confirmed — 1988 origin paper DOI [10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4) (Cognitive Science 12(2):257–285); 2010 three-types-of-load paper DOI [10.1007/s10648-010-9128-5](https://doi.org/10.1007/s10648-010-9128-5) (Educ. Psych. Review 22(2):123–138). Full text paywalled — titles/volume/pages verified, abstracts confirmed |
| Minto *Pyramid Principle*, Duarte *Resonate*, Heath *Made to Stick*, Tufte | books | `[B]` bibliographic, no page-level online verification claimed |
| Signage standards (ANSI/ISO sizing) | not fetched | `[B][paywalled — standard number]`, cite by number only |
