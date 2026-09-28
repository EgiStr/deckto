---
name: brand-design
description: Use when a deck needs a visual identity derived from brand language before pitchdeck-grinding Phase 4 or pitchdeck-build — translates adjectives/logo color into a math-validated palette (60/30/10 dominance), font pair, and ONE motif, then writes/merges the design-spec.md theme. Trigger on "design spec", "deck theme", "define the visual identity", "make it look like our brand", or when design-spec.md has no palette. Adapted from pocketto brand-design for presentations.
---

# Brand Design — deck visual identity, computed not guessed

Turn vague brand language ("modern but trustworthy") into a concrete, contrast-validated
deck theme: palette, font pair, motif. Deliverable is the **theme section of
`design-spec.md`** — the artifact `pitchdeck-grinding` Phase 4 consumes.

**Core principle:** Compute, never guess. Colors derive by rule, contrast derives by
formula, fonts come from a safe-pairing table. "Feel" is the input; math is the output.

Adapted from pocketto's `brand-design` (web design systems) — same discipline, web
token compilation (Tailwind/CSS), HTML preview, and project hooks dropped.

## When to Use

- `design-spec.md` exists but has no palette/motif (or is missing entirely)
- User gives brand language: adjectives, a logo, brand colors, existing deck style
- Re-theming a deck after a brand change

Do NOT use:
- design-spec has a confirmed theme → proceed to build
- `pitchdeck-grinding` Phase 4 already derives theme from pitch.md → this skill is
  the fallback when the theme inputs are unclear

## Hard Gates

```
GATE 1: No palette before Q1-Q4 answered (or asset supplied — a logo
        makes Q1/Q2 optional). No assumptions about brand personality.

GATE 2: NO theme is written before the user confirms the palette preview
        (swatch + contrast table in chat). "OK to finalize" must be typed.

GATE 3: Contrast validation is never skipped. Every text/background pair
        gets a computed ratio (math-toolkit.md §3). Deckto threshold: 4.5:1
        normal, 3:1 large text (deck's projection adaptation).

GATE 4: Exactly ONE motif. "We'll use a few motifs" = rejected.
```

## Phase 1 — Inputs (one question per message)

| # | Input | Optional when |
|---|---|---|
| Q1 | 3–5 brand adjectives | a logo color exists (Q4 supersedes hue choice) |
| Q2 | Emotional goal — what should the audience *feel*? | never |
| Q3 | Existing brand assets: logo colors, brand fonts, prior decks? | never — asset may be "none" |
| Q4 | Audience register: formal / neutral / warm? | `audience-fit` already ran with tone directive |

## Phase 2 — Semantic translation (rule-cited, see `references/semantic-map.md`)

Map adjectives → hue family, chroma band, font category via the map. **Every row must
cite its rule** — "vibes" is not a translation. If a logo exists, its hue becomes the
primary and the map validates accents only.

Conflicts ("trustworthy + playful") resolve via `references/semantic-map.md`
Conflict Resolution — the emotional goal (Q2) is the tiebreaker.

## Phase 3 — Compute the theme (`references/math-toolkit.md`)

1. **Palette** — derive primary from hue/chroma; apply **60/30/10 dominance**:
   dominant 60–70% visual weight, secondary ~20–30%, accent ~10% (one accent only).
   The accent is reserved for the single most important element per slide.
2. **Contrast check** — for every pairing that will carry text (body on dominant,
   body on secondary, accent on dominant, title on dark field), compute the ratio
   per `math-toolkit.md` §3. Fail → adjust lightness per §5, recompute. Record
   final ratios.
3. **Font pair** — from `math-toolkit.md` deck pairing table (header + body, both
   safe for PowerPoint — no custom install assumed unless brand assets exist).
   Floors stay at `deckto.config.json` values; font *choice* doesn't move floors.
4. **Motif** — ONE shape/rule repeated every slide (see design-spec-template.md
   examples).

## Phase 4 — Preview + confirm (GATE 2)

Render the preview **in chat** (no file written yet):

```
THEME PREVIEW — <slug>
Adjectives: […] → resolved: […] (Q2 tiebreak: …)
Palette: dominant #XXXXXX (60-70%) | secondary #XXXXXX | accent #XXXXXX
Contrast: body/dominant 7.2:1 ✅ | title/dark 8.9:1 ✅ | accent/dark 4.8:1 ✅
Fonts: <header> + <body> (floors 36/14pt from config)
Motif: <one element>

Type OK to finalize.
```

Revise on pushback (re-run Phase 2/3 — never hand-edit a failing ratio).

## Phase 5 — Write the theme into design-spec.md

On OK: fill the design-spec theme section (palette, typography, motif, contrast
table, register → tone line feeding humanizer). If `design-spec.md` doesn't exist,
write it from `../pitchdeck-grinding/references/design-spec-template.md`
(sibling skill — that path is relative to this skill's directory).

**Never write theme into the file before GATE 2.**

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Picking colors by preference | palette looks arbitrary; 60/30/10 unenforced |
| Skipping contrast "because it looks fine" | GATE 3 violation — projector + distance make eyeballing unreliable |
| Two or more motifs | GATE 4 — deck reads assembled, not designed |
| Writing spec before confirmation | rework when the user rejects the theme |
| Assuming a custom brand font renders | PowerPoint substitutes silently; only use brand fonts present as assets + warn |

## Reference Triggers

| Reference | When to Load |
|-----------|--------------|
| `references/semantic-map.md` | Phase 2 — adjective → hue/chroma/font rules |
| `references/math-toolkit.md` | Phase 3 — contrast formula, lightness adjust, pairing table |
