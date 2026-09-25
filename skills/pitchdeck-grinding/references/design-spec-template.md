# Design Spec Template

Fill this into `deck/<slug>/design-spec.md` at grinding Phase 4. Font floors are
locked **here**, before any build work — that is what makes rule 4 cheap to enforce
later instead of expensive to retrofit.

## Palette

One dominant color carries 60–70% of visual weight; 1–2 supporting tones; exactly
one sharp accent. Equal weighting across colors is the failure mode to avoid.

```yaml
dominant: "#RRGGBB"   # 60-70% of visual weight — backgrounds, large fields
support:  ["#RRGGBB", "#RRGGBB"]
accent:   "#RRGGBB"   # one only — used for the single most important element per slide
```

Pick from the topic, not from default corporate blue. If swapping the palette into
an unrelated deck would still look fine, the choice isn't specific enough.

## Typography

```yaml
title_font: "<header face>"
body_font:  "<body face>"
floors:     # read from deckto.config.json — do not invent numbers
  minTitlePt: 36
  minBodyPt:  14
  statCalloutPt: 60
```

**Contrast** — deckto uses **4.5:1** minimum for text. This is an **adaptation**:
WCAG 2.2 contrast minima assume close-range screen viewing, which is a different
viewing geometry from a projector in a lit room. Stated here as our rationale, not
as "WCAG requires this for slides." `[A] [open: WCAG 2.2]` + adaptation note.

## Motif

```yaml
motif: "<ONE distinctive element repeated on every slide>"
```

Examples: icons in colored circles, thick single-side borders, rounded image frames,
a recurring corner shape. One motif, carried everywhere — this is what makes a deck
look designed rather than assembled.

## Layout map (section-typed)

Visual treatment varies by deck section — empirically grounded, not stylistic taste.
`[A] [open: Cabezas 2026, DOI 10.1177/14703572261424383]`

| slide | arc tag | layout id | rationale |
|---|---|---|---|
| 1 | what-is | title-dark | opening statement |
| 2 | what-is | tension-split | problem visual |
| … | … | … | … |

## Layout vocabulary

| id | Use for |
|---|---|
| `title-dark` | opening / closing statement, dark field |
| `tension-split` | problem: text left, tension image right |
| `stat-callout` | one big number (60pt+) with a short label under it |
| `chart-focus` | data slide: chart dominant, ≤10 words of text |
| `three-screens` | product flow: three UI frames left-to-right |
| `icon-rows` | 3–4 icon-in-circle rows, bold header + short description |
| `comparison-columns` | before/after, us/them, option A/B |
| `flow-diagram` | process or system: numbered steps with arrows |
| `identity-grid` | team: photos in a grid |
| `funds-donut` | the ask: use-of-funds visual + milestone bar |

## Anti-patterns (these fail QA or look machine-made)

- Plain bullets on white
- Accent line under the title (the single most recognizable AI-slide tell)
- Every slide using the same layout
- Decorative elements that serve no informational purpose (coherence principle)
- Light text on light backgrounds / icon with no contrasting container
- Body copy at the same size as the title

## Layout variety rule

No two consecutive slides use the same layout, and no layout appears more than
~3 times in a deck of 12. Variety is the cheapest available signal of design intent.
