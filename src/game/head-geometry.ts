import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const proceduralHeadTarget = (direction: THREE.Vector3) => {
  const x = direction.x * 1.22;
  const y = direction.y * 1.66 - 0.06;
  const jaw = THREE.MathUtils.smoothstep(-y, 0.35, 1.45);
  const temple = Math.exp(-(((y - 0.62) / 0.52) ** 2));
  let shapedX = x * (1 + jaw * 0.13 - temple * 0.07);
  let z = direction.z * (1.0 + Math.abs(y) * 0.035);
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

const fitHeadReference = (geometry: THREE.BufferGeometry) => {
  const fitted = geometry.clone();
  fitted.computeBoundingBox();
  const size = new THREE.Vector3();
  fitted.boundingBox?.getSize(size);
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
  positions.needsUpdate = true;
  fitted.computeBoundingBox();
  const center = new THREE.Vector3();
  fitted.boundingBox?.getCenter(center);
  fitted.translate(-center.x, -center.y, -center.z);
  fitted.computeVertexNormals();
  fitted.computeBoundingSphere();
  return fitted;
};

const createCleanMorphGeometry = (
  sourceGeometry: THREE.BufferGeometry | null = null,
  segments = 14,
) => {
  const geometry = new THREE.BoxGeometry(
    2.24,
    2.24,
    2.24,
    segments,
    segments,
    segments,
  ).toNonIndexed();
  const position = geometry.getAttribute('position');
  const headPositions = new Float32Array(position.array.length);
  const seeds = new Float32Array(position.count);
  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  let referenceMesh: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshBasicMaterial
  > | null = null;

  if (sourceGeometry) {
    referenceMesh = new THREE.Mesh(
      fitHeadReference(sourceGeometry),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    referenceMesh.updateMatrixWorld(true);
  }

  for (let index = 0; index < position.count; index += 1) {
    direction.fromBufferAttribute(position, index).normalize();
    let target: THREE.Vector3 | null = null;
    if (referenceMesh) {
      origin.copy(direction).multiplyScalar(5);
      raycaster.set(origin, direction.clone().negate());
      const hit = raycaster.intersectObject(referenceMesh, false)[0];
      if (hit) target = hit.point;
    }
    if (!target) target = proceduralHeadTarget(direction);
    const offset = index * 3;
    headPositions[offset] = target.x;
    headPositions[offset + 1] = target.y;
    headPositions[offset + 2] = target.z;
    seeds[index] =
      Math.abs(
        Math.sin(
          direction.x * 12.9898 + direction.y * 78.233 + direction.z * 37.719,
        ),
      ) % 1;
  }

  geometry.setAttribute('aHead', new THREE.BufferAttribute(headPositions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.computeBoundingSphere();
  referenceMesh?.geometry.dispose();
  referenceMesh?.material.dispose();
  return geometry;
};

let headSourcePromise: Promise<THREE.BufferGeometry> | undefined;

let headSourceFailed = false;

export const markHeadSourceFailed = () => {
  headSourceFailed = true;
};

export const isHeadSourceAvailable = () => !headSourceFailed;

const loadHeadSourceGeometry = () => {
  if (!headSourcePromise) {
    headSourcePromise = new OBJLoader()
      .loadAsync('/models/human-head-basemesh.obj')
      .then((object) => {
        let sourceGeometry: THREE.BufferGeometry | undefined;
        object.traverse((child) => {
          if (!sourceGeometry && child instanceof THREE.Mesh) {
            sourceGeometry = (child as THREE.Mesh<THREE.BufferGeometry>)
              .geometry;
          }
        });
        if (!sourceGeometry)
          throw new Error('The head OBJ did not contain a mesh.');
        return sourceGeometry;
      });
  }
  return headSourcePromise;
};

export const loadMorphGeometry = async () => {
  try {
    const sourceGeometry = await loadHeadSourceGeometry();
    return createCleanMorphGeometry(sourceGeometry);
  } catch (error) {
    headSourceFailed = true;
    console.warn(
      'Head model unavailable; using the procedural fallback.',
      error,
    );
    return createCleanMorphGeometry();
  }
};

export const loadHeadGeometry = async () => {
  const sourceGeometry = await loadHeadSourceGeometry();
  const geometry = fitHeadReference(sourceGeometry);
  if (!geometry.getAttribute('uv')) {
    const positions = geometry.getAttribute('position');
    geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(positions.count * 2), 2),
    );
  }
  return geometry;
};
