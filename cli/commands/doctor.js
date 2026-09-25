import fs from 'node:fs';
import path from 'node:path';
import { okEnvelope, emit } from '../lib/envelope.js';
import { toolStatus } from '../lib/render.js';

export async function run(_args, ctx) {
  const command = 'doctor';
  const configPath = path.join(ctx.root, 'deckto.config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const major = Number(process.versions.node.split('.')[0]);
  const tools = toolStatus();
  const data = {
    node: process.versions.node,
    nodeOk: major >= 18,
    soffice: Boolean(tools.soffice),
    pdftoppm: Boolean(tools.pdftoppm),
    sofficePath: tools.soffice,
    pdftoppmPath: tools.pdftoppm,
    configPath,
    config,
    renderQaAvailable: tools.available,
  };

  const lines = [
    `node       ${data.node} ${data.nodeOk ? 'OK' : 'TOO OLD (need >=18)'}`,
    `soffice    ${tools.soffice ?? 'not found'} (render QA)`,
    `pdftoppm   ${tools.pdftoppm ?? 'not found'} (render QA)`,
    `render QA  ${data.renderQaAvailable ? 'available' : 'UNAVAILABLE — static QA only'}`,
    `config     ${configPath}`,
  ];
  return emit(okEnvelope(command, ctx.version, data), ctx, lines.join('\n'));
}
