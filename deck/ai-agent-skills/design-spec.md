# Design Spec — AI agent skills deck

Derived with `deckto theme ramp 265 0.13` and verified pair-by-pair with
`deckto theme contrast`. Every ratio below is a measured CLI output, not an estimate.

## Palette

| role | hex | OKLCH | visual weight |
|---|---|---|---|
| dominant | `#17274C` | `oklch(0.28 0.072 265)` | 60% (dark slides, title text) |
| secondary | `#F1F5FE` | `oklch(0.97 0.013 265)` | 30% (light field) |
| accent | `#F5A524` | amber, dark-field only | 10% |
| accentLight | `#9A3412` | dark amber, light-field only | — |
| mid | `#395595` | `oklch(0.46 0.111 265)` | borders, dividers |

**Two-tier accent is mandatory, not stylistic.** `#F5A524` on the light field `#F1F5FE`
measures **1.87:1 — FAIL**. Amber is only legible on the dark field, so light-field
slides use `#9A3412` (6.69:1). Using one accent on both fields is the defect this
split exists to prevent.

## Contrast (all CLI-verified)

| pair | ratio | verdict |
|---|---|---|
| `#F1F5FE` on `#17274C` | 13.44:1 | PASS |
| `#17274C` on `#F1F5FE` | 13.44:1 | PASS |
| `#F5A524` on `#17274C` | 7.19:1 | PASS |
| `#9A3412` on `#F1F5FE` | 6.69:1 | PASS |
| `#395595` on `#F1F5FE` | 6.62:1 | PASS |
| `#F5A524` on `#F1F5FE` | 1.87:1 | **FAIL — never do this** |

Dominance: `60/30/10` — `dominance OK`.

## Typography

- title font / body font: **Segoe UI** (ships with Windows, renders in LibreOffice fallback)
- floors from `deckto.config.json`: title ≥ 36pt, body ≥ 14pt, stat callouts 60pt+
- Back-of-room floor governs. If a line must shrink below 14pt to fit, the copy is too
  long — cut words, never the font.

## Motif

**A thin accent bar left of the title**, amber `#F5A524` on dark slides and `#9A3412`
on light slides. Same geometry on every slide; only the tone swaps with the field.
This mirrors the accent-bar motif so the series reads as one family while the palette
differs from deck #1.

## Layout map (section-typed)

| slide | layout | arc | rationale |
|---|---|---|---|
| 1 | title-dark | what-is | open on the current reality — dark establishes stakes |
| 2 | comparison-columns | what-is | the cost of N agents reads as two columns |
| 3 | flow-diagram | what-is | folder → SKILL.md → frontmatter is a structure, not a claim |
| 4 | icon-rows | what-could-be | three disclosure levels stack as rows with costs |
| 5 | comparison-columns | what-could-be | one agent + library vs many agents |
| 6 | chart-focus | what-could-be | the context-cost numbers need a chart |
| 7 | icon-rows | what-could-be | catalog categories, one row each |
| 8 | stat-callout | what-could-be | one hard date and one hard number carry the slide |
| 9 | comparison-columns | what-could-be | single folder vs the tools that read it |
| 10 | flow-diagram | what-could-be | three build steps in order |
| 11 | chart-focus | call-to-action | the ask, with the command to run |
| 12 | title-dark | new-bliss | close on the world after adoption, not on the ask |

No two consecutive slides share a layout.

## Composition contract

Carried over unchanged from `deck/deckto-pitch/design-spec.md` — the pptx holds title,
footer and notes; the 1232×460 SVG strip holds the body line plus the diagram. Strip
content occupies `TOP=120` … `BOT=410` with the caption at `422`. Any filled block must
end above the caption band.
