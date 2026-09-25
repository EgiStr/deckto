// Reproducible QA fixtures. Run: node test/fixtures/make-fixtures.js
// Generates known-bad decks + one known-good deck for static QA tests.
import PptxGenJS from 'pptxgenjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BAD = path.join(HERE, 'known-bad');
const GOOD = path.join(HERE, 'known-good');
fs.mkdirSync(BAD, { recursive: true });
fs.mkdirSync(GOOD, { recursive: true });

const WORDY_BODY =
  'This slide contains an unreasonable number of words which no audience member ' +
  'will ever read while also listening to the presenter speak about the same ' +
  'content in a redundant fashion that violates basic multimedia learning ' +
  'principles and forces readers to choose between reading and listening, ' +
  'which is exactly the failure mode research warns about.';

async function save(pptx, file) {
  await pptx.writeFile({ fileName: file });
  console.log('wrote', path.relative(process.cwd(), file));
}

// 1. small-font.pptx — body text at 10pt (below minBodyPt 14)
{
  const p = new PptxGenJS();
  const s = p.addSlide();
  s.addText('Tiny body copy that nobody in the back row can read at all', {
    x: 0.5, y: 1.5, w: 9, h: 2, fontSize: 10, fontFace: 'Arial',
  });
  s.addImage({ data: 'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', x: 8.5, y: 4.5, w: 1, h: 1 });
  s.addNotes('INSIGHT: The font is too small.\nRest of notes.');
  await save(p, path.join(BAD, 'small-font.pptx'));
}

// 2. wordy.pptx — 60+ word body (above maxBodyPerSlide 25), fonts fine
{
  const p = new PptxGenJS();
  const s = p.addSlide();
  s.addText(WORDY_BODY, { x: 0.5, y: 1.5, w: 9, h: 3, fontSize: 18, fontFace: 'Arial' });
  s.addImage({ data: 'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', x: 8.5, y: 4.5, w: 1, h: 1 });
  s.addNotes('INSIGHT: Word budget exists for a reason.\nRest of notes.');
  await save(p, path.join(BAD, 'wordy.pptx'));
}

// 3. no-insight.pptx — notes present but no INSIGHT: marker
{
  const p = new PptxGenJS();
  const s = p.addSlide();
  s.addText('A perfectly sized headline goes here', { x: 0.5, y: 1, w: 9, h: 1, fontSize: 36, fontFace: 'Arial' });
  s.addText('Some body text that is short.', { x: 0.5, y: 2.5, w: 9, h: 1, fontSize: 18, fontFace: 'Arial' });
  s.addImage({ data: 'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', x: 8.5, y: 4.5, w: 1, h: 1 });
  s.addNotes('Just ordinary speaker notes with no marker line at all.');
  await save(p, path.join(BAD, 'no-insight.pptx'));
}

// 4. empty-insight.pptx — INSIGHT: marker present but empty
{
  const p = new PptxGenJS();
  const s = p.addSlide();
  s.addText('A perfectly sized headline goes here', { x: 0.5, y: 1, w: 9, h: 1, fontSize: 36, fontFace: 'Arial' });
  s.addText('Some body text that is short.', { x: 0.5, y: 2.5, w: 9, h: 1, fontSize: 18, fontFace: 'Arial' });
  s.addImage({ data: 'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', x: 8.5, y: 4.5, w: 1, h: 1 });
  s.addNotes('INSIGHT:\nRest of notes.');
  await save(p, path.join(BAD, 'empty-insight.pptx'));
}

// 5. no-notes.pptx — slide with no speaker notes at all
{
  const p = new PptxGenJS();
  const s = p.addSlide();
  s.addText('A perfectly sized headline goes here', { x: 0.5, y: 1, w: 9, h: 1, fontSize: 36, fontFace: 'Arial' });
  s.addText('Some body text that is short.', { x: 0.5, y: 2.5, w: 9, h: 1, fontSize: 18, fontFace: 'Arial' });
  s.addImage({ data: 'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', x: 8.5, y: 4.5, w: 1, h: 1 });
  // deliberately NO addNotes — this fixture tests the missing-notes path
  await save(p, path.join(BAD, 'no-notes.pptx'));
}

// good.pptx — passes every static check
{
  const p = new PptxGenJS();
  const s = p.addSlide();
  s.addText('Guided onboarding cuts churn by 40%', { x: 0.5, y: 1, w: 9, h: 1, fontSize: 36, fontFace: 'Arial' });
  s.addText('Teams that finish setup stay.', { x: 0.5, y: 2.5, w: 9, h: 1, fontSize: 18, fontFace: 'Arial' });
  // 1x1 PNG so the slide has a visual element
  s.addImage({ data: 'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', x: 8.5, y: 4.5, w: 1, h: 1 });
  s.addNotes('INSIGHT: Retention follows activation.\nSpeaker elaboration here.');
  await save(p, path.join(GOOD, 'good.pptx'));
}

console.log('fixtures done');
