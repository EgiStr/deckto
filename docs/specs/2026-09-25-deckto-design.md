# deckto — AI Skills Pipeline for Professional Pitch Decks (Design Spec)

**Date:** 2026-09-25
**Status:** Approved (design review), pending implementation plan
**Reference architecture:** [pocketto](https://github.com/rfxlamia/pocketto) — 13-skill chained pipeline, `.claude-plugin` packaging, npx CLI

---

## 1. Problem & Goals

Turn a rough idea into a finished, professional `.pptx` pitch deck through a gated skill pipeline, where the AI:

1. asks clarifying questions when the idea is ambiguous **before** producing anything,
2. grinds the idea into artifacts (storyline, design pattern, use cases, flowchart),
3. builds a professional deck in one pass through to `.pptx`.

Every deck must satisfy four non-negotiable rules:

| # | Rule | Operational definition |
|---|------|------------------------|
| 1 | Must have a storyline | Slide spine exists in `storyline.md`; every slide has a narrative role; no orphan slides |
| 2 | More visual than wordy | Per-slide body word budget (config); ≥1 visual element per slide; visual-to-text ratio checked |
| 3 | Insight per slide, not just telling | Every slide has a non-empty `insight` field ("so what?"); vision pass judges insight vs. telling |
| 4 | Fonts readable from the back | Body ≥ 14pt, title ≥ 36pt (config); static XML check on every run |

**Audience of this repo:** Claude Code / agent-skill users who want `pitchdeck-pitch-me` → finished deck. Shipped as a Claude Code plugin marketplace repo + an `npx` CLI. Language: **English** throughout (prompts/examples may be bilingual).

---

## 2. Repo & Packaging Architecture

New repo: **`deckto`** (GitHub, user's account), created via GitHub MCP and pushed after tests pass.

```
deckto/
├── .claude-plugin/          # Claude Code plugin manifest + marketplace config
├── skills/
│   ├── pitchdeck-help/      # compact router: what is deckto, which skill, flow
│   ├── pitchdeck-pitch-me/  # stage 1: brainstorm, ambiguity questions, audience-fit hook
│   ├── pitchdeck-grinding/  # stage 2: storyline + design pattern + use case + flowchart
│   ├── pitchdeck-build/     # stage 3: assets + pptxgenjs deck build
│   ├── pitchdeck-review/    # stage 4: QA gate (hybrid), loop-back, close
│   ├── audience-fit/        # supporting: audience profiling → tone/depth/font
│   ├── brand-design/        # supporting: vendored+modified from pocketto → deck theme
│   ├── assets-generator/    # supporting: charts, diagrams, icons, stat callouts
│   ├── humanizer/           # supporting: vendored+modified → slide copy & speaker notes
│   └── pptx/                # supporting: vendored+modified build primitive
├── cli/                     # Node package, `npx deckto` — QA static checks, render, report
├── docs/
│   ├── research/            # methodology library (sources per skill, tiered)
│   └── specs/               # design specs (this file)
├── test/                    # fixtures (known-bad decks), CLI tests, skill test logs
├── README.md
├── llms.txt
├── package.json
├── deckto.config.json       # all QA thresholds in one place
├── CHANGELOG.md
└── LICENSE (MIT)
```

**Distribution:**
- Claude Code: `/plugin marketplace add <user>/deckto` → `/plugin install deckto@deckto`
- CLI: `npx deckto` (Node ≥ 18, cross-platform, no Python for static QA; render QA auto-detects LibreOffice/`pdftoppm` and degrades to static-only with a warning)

**Handoff contract:** every stage reads/writes a fixed workspace `deck/<slug>/`:

```
deck/<slug>/
├── pitch.md          # stage 1 out
├── storyline.md      # stage 2 out (slide spine)
├── design-spec.md    # stage 2 out (palette/fonts/motif/layout map)
├── usecase-flow.md   # stage 2 out (use cases + flowchart mermaid + PNG)
├── assets/           # stage 3 out (charts, diagrams, icons) + asset manifest
├── deck.pptx         # stage 3 out
├── qa/               # stage 4: report, findings json, rendered slides
└── qa-report.md      # stage 4 out (gate verdict)
```

Artifacts carry a `scope` tag (`storyline` | `assets` | `deck`) so the review loop invalidates only what it must.

---

## 3. Pipeline Stages & Handoff Flow

```
pitchdeck-pitch-me ──▶ pitchdeck-grinding ──▶ pitchdeck-build ──▶ pitchdeck-review
   (pitch.md)          (storyline.md,          (assets/,          (qa-report.md,
                         design-spec.md,         deck.pptx)         deck.pptx final)
                         usecase-flow.md)
```

Each stage auto-invokes the next at handoff (pocketto convention), carrying artifacts forward. Any stage can be invoked standalone.

### Stage 1 — `pitchdeck-pitch-me`

- **Ambiguity gate:** if the idea is underspecified (goal, audience, format, time budget, stakes unknown) → ask clarifying questions **before** any artifact work. One question at a time; multiple-choice preferred.
- **Diverge → converge:** generate idea variants, converge on one direction with the user.
- **Audience hook:** runs `audience-fit` → profiles audience (investor / board / technical client / general) → locks tone, depth, recommended slide count into `pitch.md`.
- **Output:** `deck/<slug>/pitch.md` — idea, audience profile, constraints, success criteria. Assumption recorded explicitly in the doc: the term "prefer audiact-" from the original request was interpreted as **audience profiling** (`audience-fit`); if wrong, revise this stage.
- **Handoff:** invokes `pitchdeck-grinding`.

### Stage 2 — `pitchdeck-grinding`

Produces four artifacts:

1. **`storyline.md`** — slide-by-slide spine. Each slide entry:

   ```yaml
   - slide: 3
     title: "..."
     point: "..."        # the telling (what we say)
     insight: "..."      # the so-what (mandatory, non-empty — empty insight = slide cut)
     visual: "..."       # what the audience SEES (image/chart/diagram/callout)
     evidence: "..."     # data/source backing the claim
     layout: "stat-callout"   # from design-spec layout vocabulary
   ```

2. **`design-spec.md`** — palette (dominance rule: 1 dominant 60–70% + 1–2 support + 1 accent), font pair, ONE visual motif carried across slides, per-slide layout choice. **Font-size floors locked here** (rule 4), before any build.

3. **`usecase-flow.md`** — use cases + flowchart (mermaid source + rendered PNG) feeding slide visuals.

4. **Word budget enforcement at source:** `point + insight` ≤ per-slide-type word budget (default 25 words body content, config). Storyline with over-budget slides does not hand off.

- **Handoff:** invokes `pitchdeck-build`.

### Stage 3 — `pitchdeck-build`

- Runs `assets-generator` → charts (type chosen by data semantics), flowchart/diagram PNGs, icon rows, big-number stat callouts, before/after comparison columns → `assets/` + asset manifest linking assets → slides.
- Builds `deck.pptx` via pptxgenjs (vendored `pptx` skill): applies `design-spec`, big-font rules (title ≥ 36pt, body ≥ 14pt, stat callouts 60pt+), visual-first layouts — never plain bullets on white.
- Layout discipline (from pptx skill): vary layouts across slides, dark/light sandwich or committed dark theme, one motif, no accent lines under titles, 0.5" margins, consistent spacing.
- Runs `humanizer` pass on slide copy + speaker notes (short-text profile).
- **Handoff:** invokes `pitchdeck-review`.

### Stage 4 — `pitchdeck-review`

Hybrid QA (design approved as Approach A):

1. **Static QA** — `npx deckto qa static deck.pptx`: parse slide XML → min font size per text frame, words/slide, bullet density, `insight`-marker presence, storyline slide coverage (every storyline slide exists in deck and vice versa).
2. **Render QA** — `npx deckto qa render deck.pptx`: soffice → pdf → jpg into `qa/slides/`; vision pass judges what XML can't: insight vs. telling, visual>wordy impression, contrast/legibility. Skipped with a warning if tools missing (gate then rests on static checks + explicit vision caveat).
3. **Report** — `npx deckto qa report`: merge → `qa-report.md`, every finding scope-classified.

**Failure loop (iteration edge):**

- Content findings (no storyline, insight missing, wordy) → scope `storyline` → loop back to `pitchdeck-grinding`, regenerating **affected slides only** (not full re-grind); downstream `design-spec`/`assets`/`deck` entries for those slides invalidated.
- Design findings (font < threshold, visual ratio, contrast) → scope `deck` (or `assets`) → loop back to `pitchdeck-build` with report as input; only `deck.pptx` / affected assets invalidated.
- **Loop counter:** max 2 auto-iterations per deck → 3rd failure = `REVIEW_BLOCKED`: report to user, stop (no infinite loop; mirrors pocketto `CLOSE_BLOCKED`).
- **Pass** → `CLOSED`: `qa-report.md` verdict PASS, deck marked final.

---

## 4. Supporting Skills (vendored + modified)

Reuse = **vendor a copy into `deckto/skills/` and modify for deck needs** (self-contained plugin; no separate installs).

| Skill | Source | Modification for deckto |
|---|---|---|
| `brand-design` | pocketto (vendor) | Output target = `design-spec.md` (deck theme): palette dominance, deck font pairs, ONE motif; drops web-token compilers (Tailwind/CSS); keeps creative-brief logic |
| `humanizer` | existing local skill (vendor) | Scoped to slide copy + speaker notes; short-text profile (skip burstiness below ~40 words per its own guardrails); pitch-cliché list ("revolutionary", "seamless", "game-changing", "disrupt") |
| `pptx` | existing local skill (vendor) | Keeps pptxgenjs guide + thumbnail/QA scripts; drops generic template-editing paths deckto doesn't use; internal build reference for `pitchdeck-build` |
| `audience-fit` | **new** | 4-question audience profiling → profile (investor/board/technical client/general) → tone, depth, font-size, slide-count directives written into `pitch.md` |
| `assets-generator` | **new** | Asset recipes: chart-type selection by data semantics (comparison→bar, trend→line, part-to-whole→donut), flowchart diagrams (mermaid→PNG), icon-in-circle rows, stat callouts, comparison columns; writes `assets/` + manifest |

**CLI — `npx deckto`:**

| Command | Purpose |
|---|---|
| `deckto qa static <deck.pptx>` | XML checks → JSON findings |
| `deckto qa render <deck.pptx>` | soffice→pdf→jpg → `qa/slides/` (graceful skip) |
| `deckto qa report --findings <json>` | Merge static + vision findings → `qa-report.md` with scope + loop directive |
| `deckto doctor` | Check Node, soffice, pdftoppm, skill presence |
| `deckto init <slug>` | Scaffold `deck/<slug>/` workspace + artifact templates |
| `--json` envelope | `{ ok, command, version, data, error }` (pocketto contract style) |

All thresholds (font ≥14pt body / ≥36pt title, word budgets, visual ratio, loop cap) live in **`deckto.config.json`** — never scattered in skill prose.

---

## 5. Research & Methodology Basis

Every skill has a `references/` folder; `docs/research/` aggregates. **Two orthogonal labels per source:**

**Tier (evidence quality):**

| Tier | Meaning |
|---|---|
| A | empirical, verifiable research (papers, standards bodies) |
| B | book / paywalled standard — cited by bibliographic entry or standard number |
| C | practitioner convention / industry blog |

**Access (retrievability):**

| Access | Meaning |
|---|---|
| open | link verified at build time |
| paywalled | cite via DOI / standard number; not fetched at build time |
| DOI-only | article reachable only through DOI resolution |
| link unverified | URL could not be confirmed |

**Rules:**
- Access NEVER changes tier. Paywalled empirical stays `[A][paywalled — DOI: ...]`. Unreachable practitioner blog is `[C][link unverified]`.
- The only demotion: if the source **does not say what it's claimed to say** → re-cite or cut, regardless of tier.
- Every rule inside a skill body is tagged `[EMPIRICAL]`, `[BOOK/STANDARD]`, or `[CONVENTION]`.

**Core source map (verification pass assigns tiers/access at build time):**

*Storyline / narrative (Stage 2):*
- Duarte, *Resonate* (story arc: what is / what could be / new bliss) — `[B]`
- Duarte, *slide:ology* (slide-as-visual-unit, glance media) — `[B]`
- Minto, *The Pyramid Principle* / SCQA (answer-first structure → the `insight` field) — `[B]`/`[A]` (citable articles)
- Heath & Heath, *Made to Stick* (SUCCESs → the insight-vs-telling test) — `[B]`
- Alley, assertion-evidence slide design (Penn State, published comprehension studies) — `[A]`, access at verification

*Visual > wordy (Rule 2):*
- Mayer, Cognitive Theory of Multimedia Learning (signaling, redundancy, contiguity) — `[A]`, DOI
- Sweller, Cognitive Load Theory (working-memory limits → word budget) — `[A]`, DOI
- Tufte, *The Visual Display of Quantitative Information* (data-ink, chart junk) — `[B]`
- Nielsen Norman Group on text-heavy slides — `[C]`, practitioner, link verify

*Font size / readability (Rule 4):*
- Duarte 30pt heuristic & 6x6-family rules — `[B]`/`[C]`, labeled **convention**
- Visual-angle / viewing-distance legibility (signage sizing standards, e.g. ANSI/ISO — cited by number, paywalled) — `[B][paywalled]`
- Deck thresholds presented as a **derived adaptation** (min cap-height ≈ visual-angle formula), not a quoted standard.

*Design / color / charts:*
- WCAG 2.2 contrast minima — `[A]`, open link; **labeled adaptation**: WCAG assumes close-range screen viewing — projection in a lit room is different geometry; deck use (4.5:1 + size floors) is our adaptation rationale, not "WCAG requires this for slides"
- Cleveland & McGill, graphical perception — `[A]`
- ISO 5807 flowchart notation — `[B][paywalled]`
- FT / Economist visual vocabulary — `[C]`, practitioner

---

## 6. Testing & Delivery

**Skill testing (writing-skills TDD, per skill):**
- **RED** — baseline subagent run *without* the skill ("turn this idea into a pitch deck") → record actual failures verbatim (skipped ambiguity questions, missing insights, wordy slides, small fonts).
- **GREEN** — write skill targeting those exact failures; re-run → must comply.
- **REFactor** — pressure scenarios (time crunch, "just make it fast", user pushback) → close rationalizations ("audience won't notice", "insight optional here").
- Minimum 3 scenarios per pipeline skill: application, edge-case, missing-info.

**CLI tests (`node --test`):**
- Known-bad fixtures: 10pt font → flagged; 40-word slide → flagged; slide without `insight` → flagged.
- Known-good fixture → zero findings.
- Loop-edge: findings with scopes → correct invalidation; 3rd iteration → `REVIEW_BLOCKED`.

**End-to-end dogfood:** run `deckto` itself through all 4 stages → `qa-report.md` PASS → rendered slides visually inspected (subagent, pptx QA prompt). Becomes README demo deck.

**Delivery sequence:**
1. Scaffold locally at `C:\Users\egistr\projects\deckto`
2. Research verification pass (tier A first; record tier + access per source)
3. Skill tests (RED→GREEN→REFactor) + CLI tests
4. Create GitHub repo `deckto` (user account) via GitHub MCP → push
5. README + `llms.txt` + plugin manifest → verify `/plugin marketplace add` instructions accurate

---

## 7. Non-Goals (v1)

- No deck-to-video, no Google Slides export, no template marketplace.
- No enterprise/GitHub-issue tracking layer (pocketto Enterprise-style) — local-first only.
- No guarantee of pixel-perfect rendering across PowerPoint vs LibreOffice — QA renders are for inspection, with documented conversion caveats.
