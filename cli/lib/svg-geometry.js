// SVG text geometry. Why this is code, not a convention documented in prose:
//
// SVG puts a <text> node's `y` at the BASELINE, but every layout decision a human makes
// ("the label sits at the top of this box") is expressed as a TOP edge. Treating one as
// the other offsets text by roughly half a line — silently, with valid SVG and a clean
// parse. The dogfood deck shipped exactly that bug: every strip drew its content ~40px
// too low, rows collided, and no static check noticed because the SVG was well-formed.
//
// So the conversion lives here, in one place, and generators author top coordinates only.

/** Cap-height fraction of fontSize for a typical sans face. baseline = top + ratio*size. */
export const TEXT_ASCENT_RATIO = 0.7;

/**
 * Convert a top-edge coordinate to the baseline `y` of an SVG <text> node.
 * @param {number} top Top edge of the text box, in SVG user units.
 * @param {number} fontSize Font size in those same units.
 * @returns {number} Value to emit as the <text> node's `y`.
 */
export function baseline(top, fontSize) {
  return Math.round((top + fontSize * TEXT_ASCENT_RATIO) * 10) / 10;
}

/**
 * Approximate the height a single line of text occupies, used for vertical rhythm
 * checks (does this row of labels fit inside its box?).
 * @param {number} fontSize Font size in SVG user units.
 * @param {number} [lineHeight=1.22] Multiple of fontSize occupied by one line.
 * @returns {number} Line box height in SVG user units.
 */
export function lineBox(fontSize, lineHeight = 1.22) {
  return fontSize * lineHeight;
}
