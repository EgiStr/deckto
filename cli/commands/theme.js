import { okEnvelope, failEnvelope, emit } from '../lib/envelope.js';
import {
  contrastRatio, checkPair, adjustForContrast, checkDominance, deriveRamp,
} from '../lib/color.js';

function parseWeights(str) {
  // Accept '{"dominant":65,"secondary":25,"accent":10}' or role-coded names.
  const obj = JSON.parse(str);
  return Object.entries(obj).map(([name, weight]) => {
    let role = 'secondary';
    if (name.startsWith('dominant')) role = 'dominant';
    else if (name.startsWith('accent')) role = 'accent';
    return { role, name, weight };
  });
}

export async function run(args, ctx) {
  const command = 'theme';
  const [sub, ...rest] = args;

  try {
    if (sub === 'contrast') {
      const [fg, bg] = rest.filter((a) => !a.startsWith('--'));
      const sizeArg = rest.indexOf('--size');
      const size = sizeArg >= 0 ? rest[sizeArg + 1] : 'normal';
      if (!fg || !bg) return fail(command, ctx, 'theme contrast requires <fg-hex> <bg-hex> [--size normal|large]');
      const r = checkPair(fg, bg, size);
      const rc = emit(okEnvelope(command, ctx.version, r), ctx,
        `${r.fg} on ${r.bg} (${r.size}) = ${r.ratio}:1 — ${r.pass ? `PASS (min ${r.min})` : `FAIL (min ${r.min})`}`);
      // Check outcome drives the exit code; envelope ok means the command ran.
      return r.pass ? 0 : 1;
    }

    if (sub === 'adjust') {
      const [fg, bg] = rest.filter((a) => !a.startsWith('--'));
      const sizeArg = rest.indexOf('--size');
      const size = sizeArg >= 0 ? rest[sizeArg + 1] : 'normal';
      if (!fg || !bg) return fail(command, ctx, 'theme adjust requires <fg-hex> <bg-hex> [--size normal|large]');
      const r = adjustForContrast(fg, bg, size);
      emit(okEnvelope(command, ctx.version, r), ctx,
        r.pass
          ? `${fg} → ${r.hex} (${r.ratio}:1 PASS after ${r.steps} step(s))`
          : `could not reach ${size} threshold from ${fg} on ${bg} — pick a different color`);
      return r.pass ? 0 : 1;
    }

    if (sub === 'ramp') {
      const [hue, chroma] = rest.filter((a) => !a.startsWith('--'));
      if (!hue || !chroma) return fail(command, ctx, 'theme ramp requires <hue> <chroma>');
      const stops = deriveRamp(Number(hue), Number(chroma));
      const compressed = stops.filter((s) => s.chromaCompressed).map((s) => s.shade);
      const data = { hue: Number(hue), chroma: Number(chroma), stops, compressed };
      return emit(okEnvelope(command, ctx.version, data), ctx,
        stops.map((s) => `  ${s.shade}  ${s.hex}  ${s.oklch}${s.chromaCompressed ? '  (chroma compressed)' : ''}`).join('\n'));
    }

    if (sub === 'dominance') {
      const weightsArg = rest.find((a) => !a.startsWith('--'));
      if (!weightsArg) return fail(command, ctx, 'theme dominance requires <json-weights> e.g. \'{"dominant":65,"secondary":25,"accent":10}\'');
      const weights = parseWeights(weightsArg);
      const r = checkDominance(weights);
      emit(okEnvelope(command, ctx.version, r), ctx,
        r.pass ? '60/30/10 dominance OK' : r.errors.map((e) => `  [${e.code}] ${e.detail}`).join('\n'));
      return r.pass ? 0 : 1;
    }

    return fail(command, ctx, `unknown theme subcommand "${sub ?? ''}". Use: contrast | adjust | ramp | dominance`);
  } catch (err) {
    return fail(command, ctx, String(err.message ?? err));
  }
}

function fail(command, ctx, message) {
  emit(failEnvelope(command, ctx.version, message), ctx, message);
  process.stderr.write(message + '\n');
  return 1;
}
