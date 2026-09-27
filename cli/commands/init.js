import fs from 'node:fs';
import path from 'node:path';
import { okEnvelope, failEnvelope, emit } from '../lib/envelope.js';

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const TEMPLATES = {
  'pitch.md': `# Pitch — <idea name>

## Master intent
<one sentence: what this deck must make the audience do>

## Question framework
- **A. Goal**: <presentation goal / decision requested>
- **B. Audience**: <investor | board | technical client | general> — <what they know, their skepticism>
- **C. Idea core**: <problem, why now, evidence>
- **D. Data readiness**: <ready | partial | missing> — <source, gaps, may we research?>
- **E. Assets**: <existing assets (brand kit, logos, prior decks) | must source/generate | desired theme>
- **F. Constraints**: <time budget, slide count, format/stakes>

## Unknowns (recorded, never silently filled)
- <unknown items>

## Success criteria
- <what a good outcome looks like>
`,
  // The scaffold must pass `deckto qa storyline` as written — a new user's first
  // command pair (init -> qa storyline) is the onboarding path, and it used to fail
  // three ways: the bare `- slide:` list was invalid YAML after a mapping key,
  // visual_source held a pipe-joined menu instead of one enum member, and a single
  // slide could not satisfy the arc rule that a deck closes on new-bliss.
  'storyline.md': `master_title: "<ONE controlling statement — the spine of the whole deck>"

# Storyline
# Arc tags: what-is | what-could-be | call-to-action | new-bliss
# The deck opens on what-is and closes on new-bliss (never on the ask).
# These four slides are structural placeholders: replace the copy, keep the shape.

slides:
  - slide: 1
    title: "<assertion stating the problem, not a label>"
    point: "<what we say — the current reality the audience agrees with>"
    insight: "<the so-what for this audience — must be concrete>"
    body: "<final on-slide copy, within word budget>"
    visual: "<what the audience SEES>"
    visual_source: "generate"
    evidence: "<data/source, or unknown>"
    layout: "title-dark"
    arc: "what-is"
    notes_draft: "<speaker notes; the INSIGHT line is added at build>"
  - slide: 2
    title: "<assertion stating what changes>"
    point: "<what we say — the answer to slide 1's tension>"
    insight: "<the so-what for this audience — must be concrete>"
    body: "<final on-slide copy, within word budget>"
    visual: "<what the audience SEES>"
    visual_source: "generate"
    evidence: "<data/source, or unknown>"
    layout: "comparison-columns"
    arc: "what-could-be"
    notes_draft: "<speaker notes; the INSIGHT line is added at build>"
  - slide: 3
    title: "<assertion asking for one specific action>"
    point: "<what we say — the single thing to do next>"
    insight: "<the so-what for this audience — must be concrete>"
    body: "<final on-slide copy, within word budget>"
    visual: "<what the audience SEES>"
    visual_source: "generate"
    evidence: "<data/source, or unknown>"
    layout: "flow-diagram"
    arc: "call-to-action"
    notes_draft: "<speaker notes; the INSIGHT line is added at build>"
  - slide: 4
    title: "<assertion describing the world after adoption>"
    point: "<what we say — life with the idea in place>"
    insight: "<the so-what for this audience — must be concrete>"
    body: "<final on-slide copy, within word budget>"
    visual: "<what the audience SEES>"
    visual_source: "generate"
    evidence: "<data/source, or unknown>"
    layout: "title-dark"
    arc: "new-bliss"
    notes_draft: "<speaker notes; the INSIGHT line is added at build>"
`,
  'design-spec.md': `# Design Spec

## Palette
- dominant: #RRGGBB (60-70% visual weight)
- support: #RRGGBB
- accent: #RRGGBB

## Typography
- title font: <pair header>
- body font: <pair body>
- floors: title >= 36pt, body >= 14pt, stat callouts 60pt+ (deckto.config.json)

## Motif
- <ONE distinctive element repeated on every slide>

## Layout map (section-typed)
| slide | layout | rationale |
|-------|--------|-----------|
| 1 | title-dark | opening |
`,
  'usecase-flow.md': `# Use Cases & Flow

## Use cases
| id | actor | goal | success |
|----|-------|------|---------|

## Flowchart (mermaid)
\`\`\`mermaid
flowchart TD
  A[Start] --> B[Step]
\`\`\`

Rendered: assets/flow.png
`,
};

export async function run(args, ctx) {
  const slug = args[0];
  const command = 'init';
  if (!slug || !SLUG_RE.test(slug)) {
    const msg = 'init requires a kebab-case slug: deckto init <slug>';
    emit(failEnvelope(command, ctx.version, msg), ctx);
    process.stderr.write(msg + '\n');
    return 1;
  }

  const deckDir = path.join(process.cwd(), 'deck', slug);
  fs.mkdirSync(path.join(deckDir, 'assets'), { recursive: true });
  const written = [];
  for (const [name, body] of Object.entries(TEMPLATES)) {
    const file = path.join(deckDir, name);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, body, 'utf8');
      written.push(name);
    }
  }

  const data = { slug, dir: deckDir, written, assets: path.join(deckDir, 'assets') };
  return emit(
    okEnvelope(command, ctx.version, data),
    ctx,
    `Initialized deck/${slug}/ (${written.length} templates written)\n  ${deckDir}`,
  );
}
