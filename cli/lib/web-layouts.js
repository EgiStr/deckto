// Web renderer contract: which pptx layouts have a responsive web equivalent.
//
// The web renderer consumes the SAME `layout` + `diagram` fields as
// scripts/build-deck.js — the storyline is the single source of truth for both
// outputs (spec §2, decision 1). That only holds if every layout the pptx path
// accepts also has a web mapping; a layout that exists in one renderer and not
// the other would silently produce a text-only web slide, which is rule 2
// ("visual over wordy") failing without a gate firing.
//
// So this table is a contract, not a convenience. `canRender` is the guard the
// renderer and its tests both call, and `test/web-layouts.test.js` asserts it
// covers every layout any real storyline uses.

/** layout -> the diagram keys its web rendering reads. */
export const LAYOUTS = {
  'title-dark': ['sub'],
  'comparison-columns': ['columns'],
  'flow-diagram': ['steps'],
  'icon-rows': ['rows'],
  'chart-focus': ['checklist'],
  'stat-callout': ['stat', 'statLabel', 'tail'],
};

/** Layouts the pptx path accepts but the web renderer cannot yet express. */
export const UNSUPPORTED = [];

export function canRender(layout) {
  return Object.hasOwn(LAYOUTS, layout);
}

/**
 * The diagram fields a given layout's web rendering needs. Returns [] for an
 * unknown layout so callers can report the layout itself as the error rather
 * than a confusing missing-field message.
 */
export function requiredDiagramKeys(layout) {
  return LAYOUTS[layout] ?? [];
}

/**
 * Validate one slide for web rendering. Throws on the two conditions the spec
 * makes hard errors (§4): an unmapped layout, and a mapped layout whose
 * diagram block is absent. Deliberately not a fallback — see the note above.
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
  return true;
}
