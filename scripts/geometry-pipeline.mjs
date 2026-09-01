import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export const MORPH_FILE = 'head-morph-v1.bin';
export const HEAD_FILE = 'trimmed-head-v1.bin';
const VERSION = 1;

const fitHeadReference = (geometry) => {
  const fitted = geometry.clone();
  fitted.computeBoundingBox();
  const size = new THREE.Vector3();
  fitted.boundingBox.getSize(size);
  fitted.center();
  fitted.scale(3.35 / size.y, 3.35 / size.y, 3.35 / size.y);
  const positions = fitted.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    let x = positions.getX(index);
    const y = positions.getY(index);
    let z = positions.getZ(index);
    const cheek = Math.exp(
      -(((Math.abs(x) - 0.72) / 0.4) ** 2) - ((y + 0.02) / 0.52) ** 2,
    );
    const jaw = Math.exp(
      -(((Math.abs(x) - 0.62) / 0.42) ** 2) - ((y + 0.72) / 0.46) ** 2,
    );
    const brow = Math.exp(-((x / 0.92) ** 4) - ((y - 0.48) / 0.2) ** 2);
    const nose = Math.exp(-((x / 0.26) ** 2) - ((y - 0.02) / 0.42) ** 2);
    x *= 1 + cheek * 0.08 + jaw * 0.11;
    x += Math.exp(-((x / 1.1) ** 2) - (y / 1.7) ** 2) * 0.018;
    if (z > 0) z += nose * 0.15 + brow * 0.035;
    positions.setXYZ(index, x, y * 1.035, z);
  }
  fitted.computeBoundingBox();
  const center = new THREE.Vector3();
  fitted.boundingBox.getCenter(center);
  fitted.translate(-center.x, -center.y, -center.z);
  fitted.computeVertexNormals();
  return fitted;
};

const trimHeadAtJaw = (geometry) => {
  const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const position = source.getAttribute('position');
  const kept = [];
  for (let index = 0; index < position.count; index += 3) {
    let keep = true;
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = index + corner;
      const x = position.getX(vertex);
      const y = position.getY(vertex);
      const z = position.getZ(vertex);
      const cutoff =
        -0.94 +
        Math.sin(x * 10.7 + Math.sin(z * 8.3) * 1.8) * 0.052 +
        Math.sin(z * 15.1 - x * 4.6) * 0.026;
      if (y < cutoff) keep = false;
    }
    if (keep) kept.push(index, index + 1, index + 2);
  }
  const trimmed = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const attribute = source.getAttribute(name);
    const itemSize = name === 'uv' ? 2 : 3;
    const values = new Float32Array(kept.length * itemSize);
    if (attribute) {
      kept.forEach((sourceIndex, outputIndex) => {
        for (let component = 0; component < itemSize; component += 1)
          values[outputIndex * itemSize + component] =
            attribute.array[sourceIndex * itemSize + component];
      });
    }
    trimmed.setAttribute(name, new THREE.BufferAttribute(values, itemSize));
  }
  trimmed.computeVertexNormals();
  return trimmed;
};

const writeBinary = async (output, magic, count, arrays) => {
  const headerBytes = 12 + arrays.length * 4;
  const buffer = Buffer.alloc(
    headerBytes + arrays.reduce((sum, array) => sum + array.byteLength, 0),
  );
  buffer.write(magic, 0, 4, 'ascii');
  buffer.writeUInt32LE(VERSION, 4);
  buffer.writeUInt32LE(count, 8);
  let offset = headerBytes;
  arrays.forEach((array, index) => {
    buffer.writeUInt32LE(array.byteLength, 12 + index * 4);
    Buffer.from(array.buffer, array.byteOffset, array.byteLength).copy(
      buffer,
      offset,
    );
    offset += array.byteLength;
  });
  await writeFile(output, buffer);
};

export const generateGeometry = async (outputDirectory) => {
  const root = path.resolve(import.meta.dirname, '..');
  const obj = await readFile(
    path.join(root, 'src/assets/source/geometry/human-head-basemesh.obj'),
    'utf8',
  );
  const object = new OBJLoader().parse(obj);
  let source;
  object.traverse((child) => {
    if (!source && child instanceof THREE.Mesh) source = child.geometry;
  });
  if (!source) throw new Error('The head OBJ did not contain a mesh.');
  const fitted = fitHeadReference(source);
  const box = new THREE.BoxGeometry(
    2.24,
    2.24,
    2.24,
    14,
    14,
    14,
  ).toNonIndexed();
  const positions = box.getAttribute('position');
  const head = new Float32Array(positions.array.length);
  const seeds = new Float32Array(positions.count);
  const mesh = new THREE.Mesh(
    fitted,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  mesh.updateMatrixWorld(true);
  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  for (let index = 0; index < positions.count; index += 1) {
    direction.fromBufferAttribute(positions, index).normalize();
    origin.copy(direction).multiplyScalar(5);
    raycaster.set(origin, direction.clone().negate());
    const hit = raycaster.intersectObject(mesh, false)[0];
    if (!hit) throw new Error(`Head ray missed morph vertex ${index}.`);
    head.set(hit.point.toArray(), index * 3);
    seeds[index] =
      Math.abs(
        Math.sin(
          direction.x * 12.9898 + direction.y * 78.233 + direction.z * 37.719,
        ),
      ) % 1;
  }
  const trimmed = trimHeadAtJaw(fitted);
  await mkdir(outputDirectory, { recursive: true });
  await writeBinary(
    path.join(outputDirectory, MORPH_FILE),
    'WMOR',
    positions.count,
    [head, seeds],
  );
  await writeBinary(
    path.join(outputDirectory, HEAD_FILE),
    'WHED',
    trimmed.getAttribute('position').count,
    [
      trimmed.getAttribute('position').array,
      trimmed.getAttribute('normal').array,
      trimmed.getAttribute('uv').array,
    ],
  );
};
