import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKILLS = path.join(ROOT, 'skills');

function skillDirs() {
  return fs.readdirSync(SKILLS).filter((d) => fs.existsSync(path.join(SKILLS, d, 'SKILL.md')));
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

test('every skill has a SKILL.md with YAML frontmatter', () => {
  const dirs = skillDirs();
  assert.ok(dirs.length >= 4, `expected several skills, found ${dirs.length}`);
  for (const d of dirs) {
    const text = fs.readFileSync(path.join(SKILLS, d, 'SKILL.md'), 'utf8');
    assert.ok(frontmatter(text), `${d}: missing frontmatter`);
  }
});

test('frontmatter declares name and description for every skill', () => {
  for (const d of skillDirs()) {
    const fm = frontmatter(fs.readFileSync(path.join(SKILLS, d, 'SKILL.md'), 'utf8'));
    assert.match(fm, /^name:\s*\S+/m, `${d}: missing name`);
    assert.match(fm, /^description:\s*\S+/m, `${d}: missing description`);
  }
});

test('skill name uses only letters, numbers, hyphens', () => {
  for (const d of skillDirs()) {
    const fm = frontmatter(fs.readFileSync(path.join(SKILLS, d, 'SKILL.md'), 'utf8'));
    const name = fm.match(/^name:\s*(\S+)/m)[1];
    assert.match(name, /^[a-z0-9-]+$/, `${d}: bad name "${name}"`);
  }
});

// Vendored skills (pptx, humanizer) keep their upstream descriptions — they are
// external contracts. This rule applies to deckto-authored skills.
const AUTHORED = ['pitchdeck-pitch-me', 'pitchdeck-grinding'];

test('authored skill descriptions start with "Use when" and do not summarize workflow', () => {
  for (const d of AUTHORED) {
    const fm = frontmatter(fs.readFileSync(path.join(SKILLS, d, 'SKILL.md'), 'utf8'));
    const desc = fm.match(/^description:\s*(.+)$/m)[1].trim();
    assert.match(desc, /^Use (when|BEFORE)/, `${d}: description must start with "Use when"/"Use BEFORE"`);
  }
});

test('frontmatter stays within the 1024-character budget', () => {
  for (const d of skillDirs()) {
    const fm = frontmatter(fs.readFileSync(path.join(SKILLS, d, 'SKILL.md'), 'utf8'));
    assert.ok(fm.length <= 1024, `${d}: frontmatter ${fm.length} chars > 1024`);
  }
});

test('pipeline skills declare hard gates', () => {
  for (const d of ['pitchdeck-pitch-me', 'pitchdeck-grinding']) {
    const text = fs.readFileSync(path.join(SKILLS, d, 'SKILL.md'), 'utf8');
    assert.match(text, /## Hard Gates/, `${d}: missing Hard Gates section`);
    assert.match(text, /GATE [A-Z0-9]/, `${d}: no numbered gates`);
  }
});

test('core skills reference their support files that exist on disk', () => {
  for (const d of ['pitchdeck-pitch-me', 'pitchdeck-grinding']) {
    const text = fs.readFileSync(path.join(SKILLS, d, 'SKILL.md'), 'utf8');
    const refs = [...text.matchAll(/`(references\/[^`]+\.md)`/g)].map((m) => m[1]);
    assert.ok(refs.length > 0, `${d}: no reference triggers`);
    for (const r of new Set(refs)) {
      assert.ok(fs.existsSync(path.join(SKILLS, d, r)), `${d}: missing ${r}`);
    }
  }
});

test('reference files carry tier/access labels (research honesty)', () => {
  for (const d of ['pitchdeck-pitch-me', 'pitchdeck-grinding']) {
    const refDir = path.join(SKILLS, d, 'references');
    for (const f of fs.readdirSync(refDir)) {
      const text = fs.readFileSync(path.join(refDir, f), 'utf8');
      assert.match(text, /\[A\]|\[B\]|\[C\]|\[EMPIRICAL\]|\[BOOK\/STANDARD\]|\[CONVENTION\]/,
        `${d}/${f}: no source tier labels`);
    }
  }
});
