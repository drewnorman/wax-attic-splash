import path from 'node:path';
import { generateGeometry } from './geometry-pipeline.mjs';

await generateGeometry(
  path.resolve(import.meta.dirname, '../src/assets/generated'),
);
