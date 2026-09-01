import * as THREE from 'three';
import morphGeometryUrl from '../assets/generated/head-morph-v1.bin?url';
import headGeometryUrl from '../assets/generated/trimmed-head-v1.bin?url';

const VERSION = 1;
const MORPH_VERTEX_COUNT = 7056;
let headSourceFailed = false;
let warned = false;

const warnFallback = (error: unknown) => {
  headSourceFailed = true;
  if (warned) return;
  warned = true;
  console.warn(
    'Head geometry unavailable; using the procedural fallback.',
    error,
  );
};

const proceduralHeadTarget = (direction: THREE.Vector3) => {
  const x = direction.x * 1.22;
  const y = direction.y * 1.66 - 0.06;
  const jaw = THREE.MathUtils.smoothstep(-y, 0.35, 1.45);
  const temple = Math.exp(-(((y - 0.62) / 0.52) ** 2));
  let shapedX = x * (1 + jaw * 0.13 - temple * 0.07);
  let z = direction.z * (1 + Math.abs(y) * 0.035);
  if (direction.z > -0.05) {
    const nose = Math.exp(-((shapedX / 0.24) ** 2 + ((y - 0.02) / 0.36) ** 2));
    const leftEye = Math.exp(
      -(((shapedX + 0.38) / 0.22) ** 2 + ((y - 0.34) / 0.14) ** 2),
    );
    const rightEye = Math.exp(
      -(((shapedX - 0.38) / 0.22) ** 2 + ((y - 0.34) / 0.14) ** 2),
    );
    const brow = Math.exp(
      -((Math.abs(shapedX) / 0.64) ** 4 + ((y - 0.49) / 0.13) ** 2),
    );
    const mouth = Math.exp(-((shapedX / 0.56) ** 2 + ((y + 0.48) / 0.1) ** 2));
    const chin = Math.exp(-((shapedX / 0.5) ** 2 + ((y + 0.91) / 0.28) ** 2));
    z +=
      nose * 0.62 -
      (leftEye + rightEye) * 0.16 +
      brow * 0.09 -
      mouth * 0.1 +
      chin * 0.12;
    shapedX +=
      Math.exp(-(((shapedX + 0.15) / 0.72) ** 2 + ((y + 0.05) / 1.25) ** 2)) *
      0.025;
  }
  return new THREE.Vector3(shapedX, y, z);
};

const createBaseMorphGeometry = () =>
  new THREE.BoxGeometry(2.24, 2.24, 2.24, 14, 14, 14).toNonIndexed();

const createProceduralMorphGeometry = () => {
  const geometry = createBaseMorphGeometry();
  const position = geometry.getAttribute('position');
  const heads = new Float32Array(position.count * 3);
  const seeds = new Float32Array(position.count);
  const direction = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    direction.fromBufferAttribute(position, index).normalize();
    heads.set(proceduralHeadTarget(direction).toArray(), index * 3);
    seeds[index] =
      Math.abs(
        Math.sin(
          direction.x * 12.9898 + direction.y * 78.233 + direction.z * 37.719,
        ),
      ) % 1;
  }
  geometry.setAttribute('aHead', new THREE.BufferAttribute(heads, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.computeBoundingSphere();
  return geometry;
};

const loadBinary = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Unable to load ${url} (${response.status}).`);
  return response.arrayBuffer();
};

const parseArrays = (
  buffer: ArrayBuffer,
  magic: string,
  itemSizes: number[],
) => {
  const headerBytes = 12 + itemSizes.length * 4;
  if (buffer.byteLength < headerBytes)
    throw new Error('Geometry header is truncated.');
  const bytes = new Uint8Array(buffer);
  const actualMagic = String.fromCharCode(...bytes.subarray(0, 4));
  const view = new DataView(buffer);
  const version = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  if (actualMagic !== magic || version !== VERSION || count === 0)
    throw new Error('Geometry header is invalid.');
  const lengths = itemSizes.map((_, index) =>
    view.getUint32(12 + index * 4, true),
  );
  itemSizes.forEach((itemSize, index) => {
    if (lengths[index] !== count * itemSize * Float32Array.BYTES_PER_ELEMENT)
      throw new Error('Geometry array length is invalid.');
  });
  if (
    headerBytes + lengths.reduce((sum, length) => sum + length, 0) !==
    buffer.byteLength
  )
    throw new Error('Geometry file length is invalid.');
  let offset = headerBytes;
  const arrays = lengths.map((length) => {
    const array = new Float32Array(length / Float32Array.BYTES_PER_ELEMENT);
    for (let index = 0; index < array.length; index += 1)
      array[index] = view.getFloat32(
        offset + index * Float32Array.BYTES_PER_ELEMENT,
        true,
      );
    offset += length;
    for (const value of array)
      if (!Number.isFinite(value))
        throw new Error('Geometry contains non-finite values.');
    return array;
  });
  return { count, arrays };
};

export const markHeadSourceFailed = () => {
  headSourceFailed = true;
};
export const isHeadSourceAvailable = () => !headSourceFailed;

export const loadMorphGeometry = async () => {
  try {
    const { count, arrays } = parseArrays(
      await loadBinary(morphGeometryUrl),
      'WMOR',
      [3, 1],
    );
    if (count !== MORPH_VERTEX_COUNT)
      throw new Error('Morph vertex count is invalid.');
    const geometry = createBaseMorphGeometry();
    if (geometry.getAttribute('position').count !== count)
      throw new Error('Morph topology does not match the runtime box.');
    geometry.setAttribute('aHead', new THREE.BufferAttribute(arrays[0], 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(arrays[1], 1));
    geometry.computeBoundingSphere();
    return geometry;
  } catch (error) {
    warnFallback(error);
    return createProceduralMorphGeometry();
  }
};

export const loadHeadGeometry = async () => {
  try {
    const { count, arrays } = parseArrays(
      await loadBinary(headGeometryUrl),
      'WHED',
      [3, 3, 2],
    );
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(arrays[0], 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(arrays[1], 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(arrays[2], 2));
    if (geometry.getAttribute('position').count !== count)
      throw new Error('Head vertex count is invalid.');
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  } catch (error) {
    warnFallback(error);
    throw error;
  }
};
