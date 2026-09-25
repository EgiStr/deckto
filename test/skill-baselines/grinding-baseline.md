# RED baseline — `pitchdeck-grinding` (run 1, 2026-09-25)

**Scenario:** user hands a complete brief (AI crop-disease detection, seed investors,
$500k, 1,200 labelled photos, 78% model, logo only, 10 min, 12 slides) and asks for
the deck.
**Condition:** no skill loaded, normal agent judgment only.
**Agent:** subagent 3feaf3c8-4244-48fe-8c54-9e3924b6db57

## Observed strengths (things the skill must NOT regress)

- Produced a real 12-slide outline with headline assertions ("Farmers are treating
  crop disease blind, and the expert is three days away") — not label titles. This is
  assertion-evidence behavior arriving unprompted.
- Every slide has an explicit **"So what (spoken)"** line separated from slide content.
- Separated *what exists* (1,200 photos, 78%) from *what is planned* (pilots) on
  slides 5 and 8, and said so out loud.
- Flagged placeholders (`[verify]`, `[source]`) rather than inventing numbers.
- Named its own weakest slide (market sizing = scaffolding, cut it if defensible
  bottom-up number unavailable).

## Observed failures vs. deckto's four rules

| Rule | Baseline behavior | Gap |
|---|---|---|
| 1. Storyline | Coherent classic seed arc, but **no master title**, no arc annotation. Arc is implicit in the slide order — nothing prevents a slide that doesn't serve the deck's controlling claim. | Needs master title + arc tags |
| 2. Visual > wordy | ~45–75 words per slide on-slide copy, avg ≈ 60. **Budget in `deckto.config.json` is 25.** Design has a visual *note* per slide but no asset manifest, no `visual_source`. | 2.4× over word budget; needs enforcement |
| 3. Insight per slide | Insight exists as **spoken** line — not on the slide, not in notes with a stable marker. Nothing statically checkable. | Needs the frozen `INSIGHT:` notes line |
| 4. Font size | Not addressed at all — no title/body floors specified anywhere | Needs design-spec font floors |

## Additional gaps

- No `design-spec.md`: palette, font pair, motif, layout map all missing.
- No `usecase-flow.md`; the "how it works" flow is prose, not a diagram artifact.
- Nothing written to disk — all insight lives in the conversation. Close the session,
  lose the deck.
- Revealing: the agent's *natural* output quality is high; the failure is **format,
  enforcement, and persistence** — no artifacts, no gates, no machine-checkable
  contract. That is what the skill supplies.

## GREEN targets for `pitchdeck-grinding`

1. Master title first (Minto) — every slide must trace to it or be cut.
2. Arc annotation per slide (`what-is` / `what-could-be` / `call-to-action` / `new-bliss`).
3. Full-detail slide entries written to `storyline.md`, body within the 25-word config budget.
4. `design-spec.md` with font floors read from config, palette dominance, one motif, section-typed layouts.
5. Insight written into `notes_draft` such that build emits the frozen `INSIGHT:` line.
6. Gates: master-title traceability, non-empty insight, word budget → no handoff otherwise.
7. Preserve the baseline's best instinct: keep the spoken "so what" reasoning as notes material, and keep separating existing evidence from planned claims.
