#!/usr/bin/env node
// deckto CLI — argument router. Envelope contract: { ok, command, version, data, error }
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const COMMANDS = {
  init: () => import('../commands/init.js'),
  doctor: () => import('../commands/doctor.js'),
  qa: () => import('../commands/qa.js'),
  theme: () => import('../commands/theme.js'),
  assets: () => import('../commands/assets.js'),
};

function usage() {
  return [
    'deckto — AI skills pipeline for professional pitch decks',
    '',
    'Usage:',
    '  deckto init <slug> [--json]        Scaffold deck/<slug>/ workspace',
    '  deckto doctor [--json]             Check node, tools, and deck config',
    '',
    'QA (hybrid: deterministic static checks + rendered vision pass):',
    '  deckto qa storyline <file.md> [--json]   Check storyline.md structure',
    '  deckto qa static <deck.pptx> [--json]    Static checks on a built deck',
    '  deckto qa render <deck.pptx> [--out <dir>] [--json]',
    '                                          Render pptx -> pdf -> jpg for vision review',
    '  deckto qa report --findings <file> [--iterations <n>] [--out <dir>] [--json]',
    '                                          Merge scoped findings into qa-report.md',
    '',
    'Theme + assets:',
    '  deckto theme contrast <fg> <bg> [--json] WCAG contrast check',
    '  deckto theme adjust|ramp|dominance ...  Derive/validate a deck palette',
    '  deckto assets render <file.svg> [--out <dir>] [--json]',
    '                                          SVG -> PNG (LibreOffice headless)',
    '',
    `deckto v${pkg.version}`,
  ].join('\n');
}

const args = process.argv.slice(2);
const wantsJson = args.includes('--json');
// Remove ONLY the command token; flags and their values must reach subcommands intact.
const cmdIndex = args.findIndex((a) => !a.startsWith('--'));
const cmd = cmdIndex >= 0 ? args[cmdIndex] : undefined;
const rest = cmdIndex >= 0 ? args.filter((_, i) => i !== cmdIndex) : [];

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help') {
    process.stdout.write(usage() + '\n');
    return 0;
  }
  const loader = COMMANDS[cmd];
  if (!loader) {
    process.stderr.write(`Unknown command: ${cmd}\n\n${usage()}\n`);
    return 1;
  }
  try {
    const mod = await loader();
    return await mod.run(rest, { json: wantsJson, root: ROOT, version: pkg.version });
  } catch (err) {
    if (wantsJson) {
      process.stdout.write(JSON.stringify({
        ok: false, command: cmd, version: pkg.version, data: null,
        error: String(err && err.message ? err.message : err),
      }) + '\n');
    } else {
      process.stderr.write(`Error: ${err && err.message ? err.message : err}\n`);
    }
    return 1;
  }
}

const code = await main();
process.exit(code);
