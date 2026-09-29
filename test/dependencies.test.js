import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const BUILTINS = new Set(builtinModules);
const RELATIVE = /^[.]/;
const IMPORT_RE = /(?:\bfrom|\bimport\s*\(\s*)\s*['"]([^'"]+)['"]/g;
// `builtinModules` lists bare specifiers (`fs`), not the `node:`-prefixed form.
const isBuiltin = (spec) => {
  const bare = spec.startsWith('node:') ? spec.slice(5) : spec;
  return BUILTINS.has(bare) || BUILTINS.has(bare.split('/')[0]);
};

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return jsFiles(full);
    return e.name.endsWith('.js') ? [full] : [];
  });
}

/**
 * Everything the CLI imports at runtime must be declared in `dependencies` —
 * never in `devDependencies`. In-repo this never bites: the dev install puts
 * the package in node_modules either way. Installed from npm it resolves
 * nowhere, and the command dies with a module-resolution error on first use.
 * Caught in practice by the clean-room install: `pptxgenjs` sat in
 * devDependencies while `deckto build` imported it.
 */
test('every bare import under cli/ is a declared runtime dependency', () => {
  const declared = Object.keys(pkg.dependencies ?? {});
  const devOnly = Object.keys(pkg.devDependencies ?? {});
  const seen = new Set();
  const missing = [];

  for (const file of jsFiles(path.join(ROOT, 'cli'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(IMPORT_RE)) {
      const spec = m[1];
      if (isBuiltin(spec) || RELATIVE.test(spec)) continue;

      const name = spec.startsWith('@')
        ? spec.split('/').slice(0, 2).join('/')
        : spec.split('/')[0];
      seen.add(name);

      if (!declared.includes(name)) {
        missing.push({
          name,
          file: path.relative(ROOT, file),
          dev: devOnly.includes(name),
        });
      }
    }
  }

  assert.ok(seen.size >= 3, `expected a dependency graph, found ${seen.size} bare imports`);
  assert.deepEqual(
    missing,
    [],
    missing.map((m) =>
      `${m.file} imports "${m.name}", which is not in dependencies` +
      (m.dev ? ` — it is in devDependencies, which npm does not install` : '')
    ).join('\n')
  );
});

test('dependencies are not also listed as devDependencies', () => {
  const deps = Object.keys(pkg.dependencies ?? {});
  const dev = Object.keys(pkg.devDependencies ?? {});
  assert.deepEqual(deps.filter((d) => dev.includes(d)), []);
});
