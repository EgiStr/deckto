import fs from 'node:fs';
import path from 'node:path';
import { okEnvelope, failEnvelope, emit } from '../lib/envelope.js';
import { runChecks } from '../lib/pptx-static.js';

function loadConfig(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'deckto.config.json'), 'utf8'));
}

export async function run(args, ctx) {
  const command = 'qa';
  // Subcommand is the first non-flag token; everything after it (flags included) goes down intact.
  const subIdx = args.findIndex((a) => !a.startsWith('--'));
  const sub = subIdx >= 0 ? args[subIdx] : undefined;
  const rest = args.filter((_, i) => i !== subIdx);

  if (sub === 'static') {
    return qaStatic(rest, ctx, command);
  }
  if (sub === 'report') {
    return qaReport(rest, ctx, command);
  }
  if (sub === 'render') {
    return qaRender(rest, ctx, command);
  }

  const msg = 'qa requires a subcommand: static | render | report';
  emit(failEnvelope(command, ctx.version, msg), ctx);
  process.stderr.write(msg + '\n');
  return 1;
}

function qaStatic(args, ctx, command) {
  const file = args.find((a) => !a.startsWith('--'));
  if (!file || !fs.existsSync(file)) {
    const msg = `deck file not found: ${file ?? '<none>'}`;
    emit(failEnvelope(command, ctx.version, msg), ctx);
    process.stderr.write(msg + '\n');
    return 1;
  }

  const cfg = loadConfig(ctx.root);
  const { findings, perSlide, slideCount } = runChecks(file, cfg);
  const data = {
    file: path.resolve(file),
    slideCount,
    perSlide,
    findings,
    thresholds: {
      minBodyPt: cfg.fonts.minBodyPt,
      minTitlePt: cfg.fonts.minTitlePt,
      maxBodyPerSlide: cfg.words.maxBodyPerSlide,
    },
    pass: findings.length === 0,
  };

  const lines = [`QA static — ${slideCount} slide(s), ${findings.length} finding(s)`];
  for (const f of findings) {
    lines.push(`  [${f.code}] slide ${f.slide} (${f.scope}) — ${f.detail}`);
  }
  if (!findings.length) lines.push('  PASS — no findings');

  const code = emit(okEnvelope(command, ctx.version, data), ctx, lines.join('\n'));
  return findings.length ? 1 : code;
}

function qaReport(args, ctx, command) {
  const findingsPath = valueOf(args, '--findings');
  const outDir = valueOf(args, '--out') ?? process.cwd();
  if (!findingsPath || !fs.existsSync(findingsPath)) {
    const msg = 'qa report requires --findings <file.json>';
    emit(failEnvelope(command, ctx.version, msg), ctx);
    process.stderr.write(msg + '\n');
    return 1;
  }

  const cfg = loadConfig(ctx.root);
  const input = JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
  const findings = input.findings ?? [];
  const iteration = input.iteration ?? 1;
  const maxIter = cfg.review.maxAutoIterations;

  const byScope = { storyline: [], assets: [], deck: [] };
  for (const f of findings) (byScope[f.scope] ??= []).push(f);

  let verdict = 'PASS';
  let directive = 'CLOSED';
  if (findings.length) {
    if (iteration > maxIter) {
      verdict = 'BLOCKED';
      directive = 'REVIEW_BLOCKED';
    } else {
      verdict = 'FAIL';
      // content findings dominate: storyline loop subsumes downstream rebuild
      directive = byScope.storyline.length
        ? 'LOOP:pitchdeck-grinding'
        : byScope.assets.length
          ? 'LOOP:pitchdeck-build'
          : 'LOOP:pitchdeck-build';
    }
  }

  const md = renderReport({ findings, byScope, verdict, directive, iteration, maxIter, input });
  const outPath = path.join(outDir, 'qa-report.md');
  fs.writeFileSync(outPath, md, 'utf8');

  const data = { verdict, directive, iteration, maxIter, outPath, byScope };
  return emit(
    okEnvelope(command, ctx.version, data),
    ctx,
    `qa report — verdict ${verdict} (iteration ${iteration}/${maxIter})\n  directive: ${directive}\n  written: ${outPath}`,
  );
}

async function qaRender(args, ctx, command) {
  const { renderDeck } = await import('../lib/render.js');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file || !fs.existsSync(file)) {
    const msg = `deck file not found: ${file ?? '<none>'}`;
    emit(failEnvelope(command, ctx.version, msg), ctx);
    process.stderr.write(msg + '\n');
    return 1;
  }
  const outDir = valueOf(args, '--out') ?? path.join(path.dirname(path.resolve(file)), 'qa');
  const res = renderDeck(file, outDir);
  const lines = res.available
    ? `rendered ${res.images.length} slide image(s) → ${res.outDir}`
    : `render QA UNAVAILABLE — ${res.reason}\n  gate falls back to static checks + explicit vision caveat`;
  return emit(okEnvelope(command, ctx.version, res), ctx, lines);
}

function renderReport({ findings, byScope, verdict, directive, iteration, maxIter, input }) {
  const title = '# QA Report\n';
  const head = [
    `**Verdict:** ${verdict}`,
    `**Directive:** ${directive}`,
    `**Iteration:** ${iteration} of ${maxIter} auto-iterations`,
    `**Deck:** ${input.file ?? '<unknown>'}`,
    `**Static findings:** ${findings.length}`,
    '',
  ].join('\n');

  const section = (name, items, layer) => {
    if (!items.length) return '';
    const rows = items.map((f) => `| ${f.code} | ${f.slide} | ${f.detail} | ${f.fix ?? ''} |`).join('\n');
    return `\n## ${name} (scope: \`${layer}\`)\n\n| Code | Slide | Detail | Fix |\n|---|---|---|---|\n${rows}\n\n**Invalidates:** ${layer} layer — regenerate only this layer, then re-run QA.\n`;
  };

  const body =
    section('Content findings', byScope.storyline ?? [], 'storyline') +
    section('Asset findings', byScope.assets ?? [], 'assets') +
    section('Design findings', byScope.deck ?? [], 'deck');

  const tail = findings.length
    ? `\n## Next action\n\n${directive.startsWith('LOOP') ? `Loop back to \`${directive.split(':')[1]}\` with this report as input.` : 'Auto-iteration cap reached — report to the user and stop.'}\n`
    : '\n## Next action\n\nNo findings. Deck is final.\n';

  return title + '\n' + head + body + tail;
}

function valueOf(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}
