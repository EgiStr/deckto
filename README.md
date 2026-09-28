# deckto

Turn a rough idea into a QA-passed `.pptx` pitch deck — through a gated AI skills pipeline, not a single prompt.

`deckto` is two things in one repo:

1. **A skills pipeline** (`pitchdeck-pitch-me` → `pitchdeck-grinding` → `pitchdeck-build` → `pitchdeck-review`) that refuses to let structure be optional.
2. **A small CLI** that makes the gates *run* instead of *hoping*: deterministic static checks, a real rendered vision pass, and contrast math that isn't done in a model's head.

```bash
npx deckto init my-idea     # scaffold deck/my-idea/
npx deckto doctor           # check node, LibreOffice, Poppler, config
```

---

## The problem it solves

Most people can already make a slide look good. That was solved years ago. What still fails is **structure**: a deck of attractive slides that never makes an argument. Ideas die there, not in the idea.

So deckto enforces four rules at every stage, as machine-checked gates rather than advice:

| # | Rule | How it is enforced |
|---|---|---|
| 1 | **Every deck has a storyline** | `qa storyline` fails on empty/trivial `insight`, broken arc, missing evidence |
| 2 | **Visual over words** | `visual.minElementsPerSlide`; `VISUAL_MISSING` when a slide has no picture or chart |
| 3 | **Every slide carries an insight, not just narration** | `INSIGHT:` frozen into slide notes at build time; `qa static` reads it back |
| 4 | **Fonts big enough to read from the back of the room** | `fonts.minBodyPt` / `minTitlePt` floors; `FONTSIZE_LOW` on *any* run below the floor |

One master title is the source of truth. Every slide's title must be a claim that ladders up to it.

---

## Install

```bash
# as a CLI
npx deckto init my-idea

# or clone and use the skills directly
git clone https://github.com/EgiStr/deckto
```

Requirements: **Node 18+**. LibreOffice and Poppler are optional — needed only for `qa render` (the vision pass), and `deckto doctor` will tell you which are missing.

---

## The loop

```
pitch-me  ──▶  grinding  ──▶  build  ──▶  review
   │              │             │           │
 extract        grind into    build the    judge all
 the idea       a spine       pptx         four rules
   │              │             │           │
 GATE          GATE          GATE        GATE
```

Each stage is **fail-closed**: it does not hand off until its gate passes. Handoffs are explicit and offered as options, so you always know which stage you're in and what unblocks the next one.

**`pitchdeck-pitch-me`** — extracts the idea. Asks one question per message, only when there is real ambiguity, and never invents facts to fill a gap.

**`pitchdeck-grinding`** — grinds the brief into a storyline. Proposes a diverge→converge set of narrative arcs, then commits to one and writes a per-slide spine: title as assertion, body, `insight`, evidence, layout. This is where the deck is actually won.

**`pitchdeck-build`** — builds the `.pptx` with PptxGenJS. Dark/light variants, a consistent motif, footers, and each slide's `INSIGHT:` written into its speaker notes.

**`pitchdeck-review`** — the independent judgment. Runs QA, reads the *rendered* slides, and emits findings tagged with the layer that owns each defect so the loop routes them back to the right skill.

---

## Why two QA layers, not one

This is the part that matters, and it's not theoretical — it comes from building this repo's own pitch deck.

**Static checks** parse the `.pptx` XML: font floors, word budgets, missing visuals, insight presence, arc integrity. They are fast, deterministic, and free. They are also **blind to anything that requires seeing the slide.**

Consider these three defects, all of which shipped past static QA, all of which were caught only by the rendered vision pass:

| Defect | Why static QA missed it |
|---|---|
| Content clipped off the right edge of slides 1, 4, 7 | Slide was 16:9 but coordinates assumed 13.33×7.5in — valid XML, wrong geometry |
| The left pillar of a comparison rendered **invisible** | It was stroked `#F4F1E8` on an `#F4F1E8` background. Valid markup, zero contrast |
| Every diagram text block sat ~40px too low, colliding with captions | SVG `<text y>` is a *baseline*, not a top edge. The SVG was well-formed and parsed cleanly |

None of those are invalid files. All three are broken decks. That's the gap `qa render` exists to close:

```bash
npx deckto qa render deck/my-idea/deck.pptx --out deck/my-idea/qa/render
# pptx → pdf → one jpg per slide, then an agent actually looks at them
```

The third defect is now structurally prevented: `cli/lib/svg-geometry.js` owns the top→baseline conversion in one place, with regression tests, instead of leaving it as a convention each generator reimplements.

---

## Scoped findings, bounded loops

A finding that doesn't name its owner just spins. So every finding carries a `scope`:

```json
{
  "file": "deck/my-idea/deck.pptx",
  "iteration": 1,
  "findings": [
    {
      "scope": "assets",
      "rule": "STRIP_COLLISION",
      "slide": 5,
      "evidence": "terminal block bottom edge overlaps the caption by 12px",
      "fix": "shorten the block so it clears the caption band"
    }
  ]
}
```

```bash
npx deckto qa report --findings deck/my-idea/qa/findings.json --iterations 1
```

| `scope` | Owner | Verdict |
|---|---|---|
| `storyline` | `pitchdeck-grinding` | `LOOP:pitchdeck-grinding` (dominates — a rebuild can't fix a bad argument) |
| `assets` | `pitchdeck-build` | `LOOP:pitchdeck-build` |
| `deck` | `pitchdeck-build` | `LOOP:pitchdeck-build` |

The loop is **bounded**: after `review.maxAutoIterations` (default 2) it returns `REVIEW_BLOCKED` and hands the remaining findings to you instead of grinding forever.

---

## Skills

The pipeline skills plus four support skills:

| Skill | Role |
|---|---|
| `pitchdeck-pitch-me` | Extract the idea; ask only when genuinely ambiguous |
| `pitchdeck-grinding` | Grind the idea into a storyline with a per-slide spine |
| `pitchdeck-build` | Build the `.pptx` and its visual assets |
| `pitchdeck-review` | Judge the deck, emit scoped findings |
| `audience-fit` | Who's in the room → tone, depth, evidence type, font floor, slide count |
| `brand-design` | Translate brand language into a validated palette and type scale |
| `assets-generator` | Generate genuine visuals (never fake data) |
| `pptx` | General PowerPoint create/inspect/edit |
| `humanizer` | Strip AI tells from the prose, without touching frozen insights |

Support skills are composable — `audience-fit` and `brand-design` also work standalone. Each skill documents its methodology with citations rather than asserting best practice; see `docs/research/frameworks-methodology.md`.

---

## Layout contract

The pptx and its image assets are **not** redundant. Each carries a distinct band:

| Layer | Carries |
|---|---|
| `.pptx` | Title (selectable, QA-checked), footer, speaker notes (`INSIGHT:`) |
| SVG strip (1232×460) | The body line + the diagram |

Three composition rules keep the two from fighting: the strip never competes with the title, content sits in a fixed vertical rhythm (`TOP=120` … `BOT=410`, caption at `422`), and any filled block must *end above* the caption band.

---

## CLI reference

| Command | Purpose |
|---|---|
| `deckto init <slug>` | Scaffold `deck/<slug>/` |
| `deckto build <slug> [--out <file>] [--web] [--all]` | Build `deck.pptx` (default), `web/index.html` (`--web`), or both (`--all`) |
| `deckto doctor` | Check node, LibreOffice, Poppler, config |
| `deckto qa storyline <file.md>` | Structural checks on a storyline |
| `deckto qa static <deck.pptx>` | Static XML checks |
| `deckto qa web <index.html>` | Static checks on a rendered web deck |
| `deckto qa render <deck.pptx> --out <dir>` | Rendered vision pass |
| `deckto qa report --findings <f> --iterations <n>` | Merge findings, decide the loop |
| `deckto theme contrast <fg> <bg>` | WCAG contrast ratio |
| `deckto theme adjust\|ramp\|dominance` | Derive and validate a palette |
| `deckto assets render <file.svg>` | SVG → PNG |

All commands accept `--json` for a stable envelope: `{ ok, command, version, data, error }`.

---

## Configuration

`deckto.config.json`:

```json
{
  "fonts": { "minBodyPt": 14, "minTitlePt": 36, "statCalloutPt": 60 },
  "words": { "maxBodyPerSlide": 25 },
  "visual": { "minElementsPerSlide": 1 },
  "review": { "maxAutoIterations": 2 }
}
```

Raise the font floors if your room is bigger than the default assumes.

---

## Development

```bash
npm test        # 77 tests, node:test — no test framework
```

The dogfood deck in `deck/deckto-pitch/` is this repo's own pitch, built by these skills. Its hand-authored `storyline.md`, `design-spec.md`, and `theme.json` are tracked; the generated `.pptx`, assets, and renders are not — regenerate them with `node scripts/make-assets.js deckto-pitch` then `deckto build deckto-pitch` (add `--web` for `web/index.html`, or `--all` for both).

## License

MIT
