# Semantic Map — Adjective → Visual Parameter

Load during brand-design Phase 2. This is a **lookup, not a vibe check**: every
translation in Phase 2 must cite a rule from this file.

Adapted from pocketto's `semantic-map.md` — web tokens (border radius, platform scale
ratios, CTA copy) replaced with deck parameters.

## How to use

1. Take the 3–5 adjectives (Q1) and the emotional goal (Q2).
2. For each adjective, collect the implied parameters from the tables below.
3. If a logo color exists, it sets the primary hue — the tables validate accents only.
4. Conflicts → Conflict Resolution (bottom).
5. Emit: `INPUT → OUTPUT (rule cited)`.

Hues are OKLCH hue angles (0–360°). Pass them to `theme ramp <hue> <chroma>`.

## Personality → Hue family

| Adjective(s) | Hue family | OKLCH hue |
|---|---|---|
| Professional, Trustworthy, Corporate, Secure | Navy / Blue | 240–265° |
| Calm, Healthy, Natural, Sustainable, Growth | Green / Teal | 150–185° |
| Energetic, Bold, Urgent, Impact | Warm Red / Orange | 25–55° |
| Premium, Luxurious, Sophisticated | Purple / Violet | 285–315° |
| Optimistic, Cheerful, Approachable | Yellow / Amber | 80–95° |
| Neutral, Minimal, Editorial, Serious | Near-grey (low chroma, any hue) | chroma ≤ 0.04 |

## Personality → Chroma

| Leaning | Primary OKLCH chroma |
|---|---|
| Muted, Premium, Serious | 0.04 – 0.10 |
| Balanced, Professional | 0.10 – 0.16 |
| Bold, Energetic, Playful | 0.16 – 0.26 |

High chroma at extreme lightness goes out of gamut — `theme ramp` compresses
automatically, but expect the top and bottom stops to lose saturation.

## Deck register → Tone (feeds humanizer)

| Register | Signals | On-slide voice |
|---|---|---|
| Formal | Corporate, Secure, Trustworthy | `professional` — declarative, no exclamation |
| Neutral-friendly | Approachable, Clear, Modern | `professional` with plain-language sentences |
| Casual / energetic | Playful, Bold, Friendly | `conversational` — allowed contraction, still no hype |

pitchdeck copy never uses marketing hype regardless of register — the humanizer
cliché watchlist (revolutionary, disrupt, seamless, 10x, unlock…) applies at every
register.

## Personality → Motif

| Leaning | Motif direction |
|---|---|
| Technical, Precise | thin rule + monospace label chips |
| Warm, Human | rounded image frames |
| Bold, Energetic | thick single-side colour bar |
| Premium, Editorial | generous whitespace + hairline rules |
| Neutral, Minimal | one corner mark, nothing else |

Exactly ONE motif. `theme`/design-spec GATE 4 rejects more.

## Conflict Resolution

Adjectives pull apart ("trustworthy" + "playful"):

1. **Emotional goal (Q2) is the tiebreaker.**
2. **Trust/clarity beats expressiveness** when the audience is investors, a board, or
   anyone weighing risk — lower chroma, formal tone, restrained motif.
3. **Expressiveness lives in the accent, not the structure.** Keep dominant + register
   grounded; let one playful adjective show through the single accent and tone.
4. **State the winner explicitly:** "Resolved: trustworthy wins on structure (navy
   dominant, low chroma, hairline motif); playful shows via the warm accent. Rationale:
   Q2 = 'feel confident in the numbers'."

## Honesty note

These mappings are `[C]` practitioner design convention (colour psychology and
branding canon with weak empirical support), **not** evidence that a hue causes a
feeling. They are recorded as conventions because they make choices consistent and
reviewable — not because green is proven to make audiences trust you.
