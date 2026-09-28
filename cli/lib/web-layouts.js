// Web renderer contract: which pptx layouts have a responsive web equivalent.
//
// The web renderer consumes the SAME `layout` + `diagram` fields as
// cli/commands/build.js — the storyline is the single source of truth for both
// outputs (spec §2, decision 1). That only holds if every layout the pptx path
// accepts also has a web mapping; a layout that exists in one renderer and not
// the other would silently produce a text-only web slide, which is rule 2
// ("visual over wordy") failing without a gate firing.
//
// So this table is a contract, not a convenience. `canRender` is the guard the
// renderer and its tests both call, and `test/web-layouts.test.js` asserts it
// covers every layout any real storyline uses.

/**
 * layout -> the diagram keys its web rendering REQUIRES.
 *
 * A value may be either a list of keys (all required) or an { anyOf: [...] }
 * spec, so a layout with two valid diagram shapes can say so.
 *
 * These lists are derived from what scripts/make-assets.js actually requires —
 * the pptx generator is the authority, and it guards most fields:
 *   chart-focus  : `if (d.checklist)` ... else `d.bars`  (two real shapes)
 *   stat-callout : only `stat` is unguarded; statLabel and tail are `d.x ?`.
 * Requiring more than the generator does rejects decks that legitimately build,
 * which is how both of these were caught. Optional keys are documented in
 * OPTIONAL_DIAGRAM_KEYS rather than enforced.
 */
export const LAYOUTS = {
  'title-dark': ['sub'],
  'comparison-columns': ['columns'],
  'flow-diagram': ['steps'],
  'icon-rows': ['rows'],
  'chart-focus': { anyOf: [['checklist'], ['bars']] },
  'stat-callout': ['stat'],
};

/** Keys a layout's renderer reads when present, but does not require. */
export const OPTIONAL_DIAGRAM_KEYS = {
  'title-dark': [],
  'comparison-columns': [],
  'flow-diagram': [],
  'icon-rows': [],
  'chart-focus': [],
  'stat-callout': ['statLabel', 'tail'],
};

/** Layouts the pptx path accepts but the web renderer cannot yet express. */
export const UNSUPPORTED = [];

export function canRender(layout) {
  return Object.hasOwn(LAYOUTS, layout);
}

/**
 * The diagram keys a layout may require. For a plain list, those are all
 * required. For an { anyOf: [...] } spec, every candidate key across all
 * alternatives is returned — callers that need to know which alternative
 * applies should read LAYOUTS directly.
 */
export function requiredDiagramKeys(layout) {
  const spec = LAYOUTS[layout];
  if (!spec) return [];
  return Array.isArray(spec) ? spec : spec.anyOf.flat();
}

/**
 * True when this diagram satisfies the layout's requirement. A plain list means
 * every key must be present; an { anyOf } spec means at least one alternative
 * must be fully present.
 */
export function diagramSatisfies(layout, diagram) {
  const spec = LAYOUTS[layout];
  if (!spec || !diagram || typeof diagram !== 'object') return false;
  const hasAll = (keys) => keys.every((k) => diagram[k] !== undefined);
  return Array.isArray(spec) ? hasAll(spec) : spec.anyOf.some(hasAll);
}

/**
 * Validate one slide for web rendering. Throws on the three conditions the spec
 * makes hard errors (§4): an unmapped layout, a mapped layout whose diagram
 * block is absent, and a diagram block that does not satisfy its layout. The
 * last one matters because a diagram present-but-incomplete renders an empty
 * visual — rule 2 failing silently, which is the exact failure this module
 * exists to prevent. Deliberately not a fallback.
 *
 * The error names the first acceptable key so the message is actionable even
 * when the layout accepts one of several shapes.
 */
export function assertRenderable(slide) {
  const n = slide?.slide ?? '?';
  const layout = slide?.layout;
  if (!canRender(layout)) {
    throw new Error(`slide ${n}: unknown layout "${layout}" for web renderer`);
  }
  if (!slide.diagram || typeof slide.diagram !== 'object') {
    throw new Error(`slide ${n}: missing diagram block for layout "${layout}"`);
  }
  if (!diagramSatisfies(layout, slide.diagram)) {
    // Plain list: name the first key actually missing. anyOf: name the first
    // candidate, since which alternative is "wanted" is the author's call.
    const spec = LAYOUTS[layout];
    const key = Array.isArray(spec)
      ? spec.find((k) => slide.diagram[k] === undefined) ?? spec[0]
      : requiredDiagramKeys(layout)[0];
    throw new Error(
      `slide ${n}: diagram block for layout "${layout}" is missing key "${key}"`
    );
  }
  return true;
}
