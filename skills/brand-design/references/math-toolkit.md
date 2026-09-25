# Math Toolkit — Compute, Never Estimate

Load during brand-design Phase 3. Every number comes from a formula. For *checks* run
the CLI rather than arithmetic:

```bash
npx deckto theme contrast <fg> <bg> [--size normal|large]   # ratio + pass/fail, exit 1 on fail
npx deckto theme adjust   <fg> <bg> [--size normal|large]   # corrected fg until it passes
npx deckto theme ramp     <hue> <chroma>                    # 9-stop shade ramp, gamut-compressed
npx deckto theme dominance '{"dominant":65,"secondary":25,"accent":10}'
```

All of this is implemented in `cli/lib/color.js` and unit-tested against known WCAG
reference values (`test/color.test.js`).

## Contrast formula (what the CLI computes)

**Step A — linearize each sRGB channel** (0–1, call it `c`):
```
if c <= 0.03928:  c_lin = c / 12.92
else:             c_lin = ((c + 0.055) / 1.055) ^ 2.4
```
**Step B — relative luminance:**
```
L = 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin
```
**Step C — contrast ratio:**
```
ratio = (L1 + 0.05) / (L2 + 0.05)      # L1 = lighter
```

**Thresholds (brand-design GATE 3):**

| Use | Minimum |
|---|---|
| Normal text | 4.5:1 |
| Large text (title / stat floors) | 3:1 |

deckto applies its **projection adaptation** here (see design-spec-template.md) — these
are the deckto thresholds, not a claim that WCAG governs projectors.

## Shade ramps + gamut

Build a 9-stop ramp (100–900) by stepping lightness L (0.97 → 0.28) at fixed hue,
scaling chroma per stop. OKLCH is perceptually uniform, so equal L steps look equal.

**Gamut compression is mandatory:** if any linear channel falls outside [0,1], the color
is out of sRGB gamut — channels clip and the hue distorts (a deep blue can lose its red
component entirely and drift toward cyan). Reduce chroma by 0.01 and recompute until in
range. `theme ramp` does this automatically and flags compressed stops.

## OKLCH → sRGB (reference)

```
a = C*cos(H); b = C*sin(H)
l_ = L + 0.3963377774*a + 0.2158037573*b
m_ = L - 0.1055613458*a - 0.0638541728*b
s_ = L - 0.0894841775*a - 1.2914855480*b
l=l_^3; m=m_^3; s=s_^3
R_lin =  4.0767416621*l - 3.3077115913*m + 0.2309699292*s
G_lin = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
B_lin = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
```
then gamma-encode per Step A's inverse.

## Auto-adjusting lightness until it passes

```
goDarker = bgLum > fgLum     # background brighter → darken the foreground
step: move fg luminance toward contrast (±0.035 nudge) until ratio passes
never reach → adjust background instead, or pick another shade stop
```
Keep hue/chroma fixed — only move lightness. `theme adjust` implements this; record the
final value and ratio in the design-spec contrast table.

## Correction to pocketto's worked example

pocketto's `math-toolkit.md` claims white text on `oklch(0.64 0.16 250)` is **4.57:1 ✅ AA**.
Recomputed (and unit-tested): that color is `#2C90E8`, luminance ≈ 0.263, ratio **3.35:1 ❌**.
Their worked example's arithmetic is wrong. Do not copy the conclusion — run
`npx deckto theme contrast "#FFFFFF" "#2C90E8"` and believe the output. This is precisely
why deckto makes GATE 3 a command instead of a hand calculation.

## Deck font pairings

Choose pairings that survive PowerPoint's font substitution (both faces present on
Windows/macOS Office installs unless brand assets say otherwise):

| Personality | Header | Body |
|---|---|---|
| Professional / technical | Segoe UI Semibold / Inter | Segoe UI / Inter |
| Premium / editorial | Georgia | Segoe UI / Helvetica |
| Bold / energetic | Arial Black (titles only) | Arial |
| Neutral default | Calibri Light | Calibri |

Floors never change here — `deckto.config.json` (36/14/60pt) governs size; this table
only governs face choice.
