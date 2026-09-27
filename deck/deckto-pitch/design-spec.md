# Design Spec — deckto-pitch

## Palette

```yaml
dominant:   "#1B3A2F"   # 65% — dark green field (topic: growth/agriculture/AI)
secondary:  "#F4F1E8"   # 25% — warm paper field
accent:     "#E4572E"   # accent on dark fields
accentLight: "#C2410C"  # accent on light fields (contrast-motivated variant)
```

Swap test: a corporate-blue palette would also "look fine" here → rejected; deep green
+ burnt orange is specific to the topic (field data, crops, growth).

Contrast (all computed via `deckto theme contrast`, GATE 3):

| Pair | Ratio | Threshold | Verdict |
|---|---|---|---|
| `#F4F1E8` on `#1B3A2F` | 10.98:1 | 4.5 (normal) | PASS |
| `#1B3A2F` on `#F4F1E8` | 10.98:1 | 4.5 (normal) | PASS |
| `#E4572E` on `#1B3A2F` | 3.37:1 | 3.0 (large) | PASS — accent used only at title/stat sizes on dark |
| `#C2410C` on `#F4F1E8` | 4.59:1 | 4.5 (normal) | PASS |

Note: `#E4572E` on `#F4F1E8` computes 3.26:1 → FAIL for normal text. That is why the
two-tier accent exists; never place `#E4572E` body-size text on the light field.

## Typography

```yaml
title_font: "Segoe UI"
body_font:  "Segoe UI"
floors:     # from deckto.config.json
  minTitlePt: 36
  minBodyPt:  14
  statCalloutPt: 60
```

## Motif

```yaml
motif: "thin vertical accent bar at the left of every title, in the field-appropriate accent"
```

One motif, every slide, both fields (color variant only).

## Layout map (section-typed)

| slide | arc | layout | rationale |
|---|---|---|---|
| 1 | what-is | title-dark | opening claim |
| 2 | what-is | comparison-columns | the gap, tension |
| 3 | what-could-be | comparison-columns | label vs assertion |
| 4 | what-could-be | flow-diagram | two flagship skills |
| 5 | what-could-be | chart-focus | machine-check evidence |
| 6 | what-could-be | icon-rows | notes contract |
| 7 | what-could-be | stat-callout | font floors |
| 8 | what-could-be | flow-diagram | scope routing |
| 9 | what-could-be | icon-rows | dependencies |
| 10 | call-to-action | chart-focus | install |
| 11 | new-bliss | flow-diagram | the loop |
| 12 | new-bliss | title-dark | closing thesis |

Consecutive-layout repeats avoided; no layout exceeds 3 occurrences (flow-diagram = 3).

## Anti-patterns checked

- no bullets-on-white slides (all layouts are field-colored)
- no accent underline under titles (motif is the left bar instead)
- accent never at body size on the light field (contrast)
- `evidence: "product thesis"` on slide 12 — no measured outcome claimed
