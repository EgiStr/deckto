// Render QA: pptx -> pdf -> per-slide jpg via soffice + pdftoppm.
// Degrades to { available: false } when tools are missing — static QA stays the gate.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function has(tool) {
  try {
    execFileSync(tool, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execFileSync(process.platform === 'win32' ? 'where' : 'which', [tool], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

export function renderDeck(file, outDir) {
  if (!has('soffice')) {
    return { available: false, reason: 'soffice not found (install LibreOffice)', images: [], outDir };
  }
  if (!has('pdftoppm')) {
    return { available: false, reason: 'pdftoppm not found (install Poppler)', images: [], outDir };
  }

  fs.mkdirSync(outDir, { recursive: true });
  const abs = path.resolve(file);
  const tmpPdf = path.join(outDir, path.basename(abs, '.pptx') + '.pdf');

  execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', outDir, abs], {
    stdio: 'ignore',
    timeout: 120000,
  });

  execFileSync('pdftoppm', ['-jpeg', '-r', '150', tmpPdf, path.join(outDir, 'slide')], {
    stdio: 'ignore',
    timeout: 120000,
  });

  const images = fs
    .readdirSync(outDir)
    .filter((f) => /^slide.*\.jpe?g$/.test(f))
    .sort()
    .map((f) => path.join(outDir, f));

  return { available: true, reason: null, images, outDir, pdf: tmpPdf };
}
