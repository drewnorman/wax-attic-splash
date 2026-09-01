import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'src/assets/source/media');
const output = path.join(root, 'src/assets/media');
await mkdir(output, { recursive: true });

for (const file of [
  'grunge-attic.webp',
  'grunge-darkness.webp',
  'grunge-lag.webp',
  'grunge-pressing.webp',
  'skull-banner.mp4',
])
  await copyFile(path.join(source, file), path.join(output, file));

const optimizeLossless = async (file, animated = false) => {
  const input = path.join(source, file);
  const sourceBytes = (await stat(input)).size;
  const candidate = await sharp(await readFile(input), { animated })
    .webp({ lossless: true, effort: 6, loop: 0 })
    .toBuffer();
  const stem = path.parse(file).name;
  if (candidate.byteLength <= sourceBytes * 0.85) {
    await writeFile(path.join(output, `${stem}.webp`), candidate);
    console.log(
      `${file} -> ${stem}.webp (${sourceBytes} -> ${candidate.byteLength})`,
    );
    return;
  }
  await copyFile(input, path.join(output, file));
  console.log(
    `${file} retained (${sourceBytes}; candidate ${candidate.byteLength})`,
  );
};

for (const file of [
  'paint-grunge-burst.png',
  'paint-grunge-dense.png',
  'paint-grunge-scatter.png',
  'wax-texture.png',
])
  await optimizeLossless(file);
await optimizeLossless('statik.gif', true);
