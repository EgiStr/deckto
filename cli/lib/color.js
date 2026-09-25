// Color math for the design-spec theme: OKLCH -> sRGB, WCAG contrast, dominance checks.
// Derived from pocketto brand-design's math-toolkit, adapted for deck themes.
//
// Why this is code, not prose: GATE 3 says contrast validation is never skipped, and a
// model doing base-2.4 exponentiation in its head is not validation. Computed here.

export function oklchToSrgb(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toGamma = (x) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, v));
  };

  return {
    r: toGamma(rLin),
    g: toGamma(gLin),
    b: toGamma(bLin),
    inGamut: [rLin, gLin, bLin].every((v) => v >= -0.001 && v <= 1.001),
  };
}

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`invalid hex: ${hex}`);
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

export function rgbToHex({ r, g, b }) {
  const c = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function linearize(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb) {
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

export function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexToRgb(hexA));
  const lb = relativeLuminance(hexToRgb(hexB));
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// deckto's projection adaptation: 4.5:1 normal text, 3:1 large text/UI.
// NOT "WCAG requires this for slides" — see design-spec-template.md.
export const THRESHOLDS = { normal: 4.5, large: 3.0 };

export function checkPair(fg, bg, size = 'normal') {
  const ratio = contrastRatio(fg, bg);
  const min = THRESHOLDS[size];
  return { fg, bg, size, ratio: Number(ratio.toFixed(2)), min, pass: ratio >= min };
}

/**
 * Adjust foreground lightness until the pair passes, keeping hue/chroma.
 * Mirrors math-toolkit §5 so the adjustment is principled, not hand-tuned.
 */
export function adjustForContrast(fg, bg, size = 'normal', maxSteps = 60) {
  const target = THRESHOLDS[size];
  let best = hexToRgb(fg);
  if (checkPair(fg, bg).pass) return { hex: rgbToHex(best), steps: 0, pass: true };

  const bgLum = relativeLuminance(hexToRgb(bg));
  const fgLum = relativeLuminance(hexToRgb(fg));
  // To widen the gap: if the background is brighter, darken the foreground (and vice versa).
  const goDarker = bgLum > fgLum;
  let steps = 0;

  for (let i = 0; i < maxSteps; i += 1) {
    const cur = hexToRgb(rgbToHex(best));
    const lum = relativeLuminance(cur);
    if (goDarker ? lum <= 0.002 : lum >= 0.998) break;
    const delta = goDarker ? -0.035 : 0.035;
    const shifted = { r: cur.r + delta, g: cur.g + delta, b: cur.b + delta };
    best = shifted;
    steps += 1;
    if (checkPair(rgbToHex(best), bg, size).pass) break;
  }

  const hex = rgbToHex(best);
  const result = checkPair(hex, bg, size);
  return { hex, steps, pass: result.pass, ratio: result.ratio };
}

/**
 * 60/30/10 dominance check on a declared weight set (percentages).
 * Returns findings, not a throw — the caller decides whether to block.
 */
export function checkDominance(weights) {
  const errors = [];
  const total = weights.reduce((s, w) => s + w.weight, 0);
  const dominant = weights.find((w) => w.role === 'dominant');

  if (!dominant) {
    errors.push({ code: 'PALETTE_NO_DOMINANT', detail: 'no color marked dominant' });
  } else if (dominant.weight < 55 || dominant.weight > 75) {
    errors.push({
      code: 'PALETTE_DOMINANCE',
      detail: `dominant weight ${dominant.weight}% outside 60/30/10 band (55-75%)`,
    });
  }

  const accents = weights.filter((w) => w.role === 'accent');
  if (accents.length > 1) {
    errors.push({ code: 'PALETTE_MULTI_ACCENT', detail: `${accents.length} accents declared, exactly 1 allowed` });
  }

  if (Math.abs(total - 100) > 1) {
    errors.push({ code: 'PALETTE_WEIGHTS', detail: `weights sum to ${total}%, expected 100%` });
  }

  return { errors, total, pass: errors.length === 0 };
}

export function deriveRamp(hue, chroma) {
  const stops = [
    [100, 0.97, 0.25], [200, 0.92, 0.45], [300, 0.84, 0.65], [400, 0.74, 0.85],
    [500, 0.64, 1.0], [600, 0.55, 0.95], [700, 0.46, 0.85], [800, 0.37, 0.7],
    [900, 0.28, 0.55],
  ];
  return stops.map(([shade, L, cf]) => {
    // Gamut compression per math-toolkit: out-of-gamut means channels clip and the hue
    // distorts. Reduce chroma in 0.01 steps until every channel is in range.
    let c = chroma * cf;
    let rgb = oklchToSrgb(L, c, hue);
    let compressed = false;
    while (!rgb.inGamut && c > 0.001) {
      c = Math.round((c - 0.01) * 1000) / 1000;
      rgb = oklchToSrgb(L, c, hue);
      compressed = true;
    }
    return {
      shade,
      oklch: `oklch(${L} ${c.toFixed(3)} ${hue})`,
      hex: rgbToHex(rgb),
      inGamut: rgb.inGamut,
      chromaCompressed: compressed,
    };
  });
}
