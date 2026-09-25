import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { okEnvelope, emit } from '../lib/envelope.js';

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

export async function run(_args, ctx) {
  const command = 'doctor';
  const configPath = path.join(ctx.root, 'deckto.config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const major = Number(process.versions.node.split('.')[0]);
  const data = {
    node: process.versions.node,
    nodeOk: major >= 18,
    soffice: has('soffice'),
    pdftoppm: has('pdftoppm'),
    configPath,
    config,
    renderQaAvailable: has('soffice') && has('pdftoppm'),
  };

  const lines = [
    `node       ${data.node} ${data.nodeOk ? 'OK' : 'TOO OLD (need >=18)'}`,
    `soffice    ${data.soffice ? 'found' : 'not found'} (render QA)`,
    `pdftoppm   ${data.pdftoppm ? 'found' : 'not found'} (render QA)`,
    `render QA  ${data.renderQaAvailable ? 'available' : 'UNAVAILABLE — static QA only'}`,
    `config     ${configPath}`,
  ];
  return emit(okEnvelope(command, ctx.version, data), ctx, lines.join('\n'));
}
