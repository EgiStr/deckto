---
name: assets-generator
description: "Use when a storyline references visuals that do not exist yet — generate SVG diagrams (flow, timeline, funnel, comparison), render them to PNG, and assemble the asset manifest for pitchdeck-build. Trigger on \"generate assets\", \"create the diagram\", \"make flow.png\", when design-spec references assets/ paths, or when assets-generator is invoked by pitchdeck-build for visual_source: generate. Do NOT use for assets marked existing (collect those first) or research (search instead)."
---

# Assets Generator — visuals from the storyline

Generate the missing visuals for `visual_source: generate` slides, render them to
usable PNGs, and hand `pitchdeck-build` a manifest. Research-needed assets go through
the research path (below); existing assets are collected, not generated.

**Core principle:** The storyline already decided *what* the visual must show — this
skill only decides *how*. Never re-design the message; render it.

## When to Use

- `storyline.md` has slides with `visual_source: generate` and no file in `assets/`
- `usecase-flow.md` exists but `assets/flow.png` doesn't
- `pitchdeck-build` hits a missing asset reference mid-build

Do NOT use:
- `visual_source: existing` → the asset should be in `assets/` already; report if missing
- `visual_source: research` → web search + download path (Phase 3)
- Visual is a data chart → build it as a native chart in the deck (pptx skill), not as an image

## Phase 1 — Scan and split

Read `storyline.md`. For each slide, pull `visual`, `visual_source`, and any asset
path from `design-spec.md`. Split into three buckets:

| Bucket | Action |
|---|---|
| `existing` | verify file exists in `deck/<slug>/assets/`; missing → report, do not invent |
| `generate` | Phase 2 |
| `research` | Phase 3 |

## Phase 2 — Generate

**Format:** author as SVG (text-based, diffable, palette-driven), render with:

```bash
npx deckto assets render deck/<slug>/assets/flow.svg   # → flow.png via soffice
```

If soffice is unavailable the command reports `available: false` — the deck build
must then swap the image slide for a native shape/text layout (announce this to the
user; never silently ship a missing image).

**Diagram recipes** (pick by what the storyline says, not by taste):

| Recipe | Use for | Rule |
|---|---|---|
| Node flow | process, how-it-works | ≤ 6 nodes; 1–2 words per node |
| Timeline / gates | roadmap, GTM phases | every gate carries its unlock metric |
| Funnel | TAM→SAM, activation | numbers flow down; no decorative arrows |
| Comparison columns | us/them, before/after | same row count both sides |
| Swimlane | multi-actor value exchange | lane per actor, arrows labeled with the verb |

**Design rules (all mandatory):**
1. Palette comes from `design-spec.md` only — dominant field, accent on the one key
   element. Validate text pairs with `npx deckto theme contrast <fg> <bg>` — must pass.
2. Label font size ≥ `fonts.minBodyPt` equivalent (14pt at export scale — SVG text is
   sized in px; export at ~96dpi equivalent so px ≈ pt).
3. One motif carried in (rounded corners, the rule, the chip style) — same as the deck.
4. No text-overlap, no orphan labels; test by opening the rendered PNG.
5. **Look at the PNG you rendered** (`read_image`) before declaring it done. A garbled
   render is a failed asset, not a caveat.

## Phase 3 — Research bucket

For `visual_source: research` (photos, reference charts):

1. Web search for the subject; prefer CC0/public-domain/CC-BY sources; **record the
   source URL + license** in the manifest — unlicensed is unshippable.
2. Download to `deck/<slug>/assets/`, name by slide (`s07-market.png`).
3. If no licensable image exists → fall back to a Phase 2 generated visual and note
   the substitution.

**Never generate fake data images** (a made-up chart that looks like evidence). Data
images come from real numbers in the storyline or they don't come at all.

## Phase 4 — Manifest

Append to `deck/<slug>/assets/manifest.json`:

```json
{ "slide": 4, "file": "assets/flow.png", "source": "generated", "recipe": "node-flow",
  "sourceUrl": null, "license": null, "alt": "Capture → Diagnose → Act, three steps" }
```

Research entries carry `source` URL + `license`. Then hand to `pitchdeck-build`.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Rendering without reading the PNG back | broken/blank assets ship to build |
| Generic stock photo for a data slide | violates insight rule — the visual lies |
| Label font below floor | QA catches it late or audience can't read it |
| Inventing numbers for a funnel | fabrication — pull from storyline or cut the element |
| Ignoring the `available: false` path | build references an image that doesn't exist |

## Honesty note

Diagram recipes are `[C]` practitioner convention. The contrast and font rules are the
same gates the rest of deckto enforces (computed / config-driven), so this skill adds
no new thresholds of its own.
