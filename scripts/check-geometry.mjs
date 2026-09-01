import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  generateGeometry,
  HEAD_FILE,
  MORPH_FILE,
} from './geometry-pipeline.mjs';

const temporary = await mkdtemp(path.join(tmpdir(), 'wax-attic-geometry-'));
await generateGeometry(temporary);
const tracked = path.resolve(import.meta.dirname, '../src/assets/generated');
for (const file of [MORPH_FILE, HEAD_FILE]) {
  const digest = async (directory) =>
    createHash('sha256')
      .update(await readFile(path.join(directory, file)))
      .digest('hex');
  const [expected, actual] = await Promise.all([
    digest(tracked),
    digest(temporary),
  ]);
  if (expected !== actual)
    throw new Error(`${file} is stale. Run yarn generate:geometry.`);
  console.log(`${file} ${actual}`);
}
