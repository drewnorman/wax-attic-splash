import * as THREE from 'three';
import type { ChapterState } from './state';

const FIELD_COUNT = 72;

const setFieldTarget = (
  index: number,
  form: number,
  time: number,
  position: THREE.Vector3,
  rotation: THREE.Euler,
) => {
  const angle = (index / FIELD_COUNT) * Math.PI * 2;
  let scale = 0.15;
  if (form === 0) {
    const radius = 3.7 + (index % 7) * 0.34;
    position.set(
      Math.cos(angle * 3.1) * radius,
      Math.sin(angle * 2.3) * radius * 0.62,
      -5 - (index % 9) * 0.72,
    );
    rotation.set(angle, angle * 0.4, angle * 0.8);
    scale = 0.07 + (index % 4) * 0.025;
  } else if (form === 1) {
    const ring = Math.floor(index / 12);
    const ringAngle = ((index % 12) / 12) * Math.PI * 2 + time * 0.08;
    const radius = 2.7 + ring * 0.2;
    position.set(
      Math.cos(ringAngle) * radius,
      Math.sin(ringAngle) * radius * 0.68,
      -3.2 - ring * 2.2,
    );
    rotation.set(ringAngle, ringAngle * 0.5, time * 0.12 + index);
    scale = 0.15 + ring * 0.045;
  } else if (form === 2) {
    const depth = (index % 16) / 15;
    const vortexAngle = angle * 4.6 + time * (0.32 + (index % 5) * 0.035);
    const radius = 0.75 + depth * 4.1;
    position.set(
      Math.cos(vortexAngle) * radius,
      Math.sin(vortexAngle * 1.17) * radius * 0.62,
      -2.4 - depth * 12,
    );
    rotation.set(vortexAngle * 0.7, time * 0.55 + index, vortexAngle);
    scale = 0.13 + depth * 0.32;
  } else {
    position.set(
      Math.cos(angle) * 3.6,
      Math.sin(angle) * 2.35,
      -4.8 - Math.abs(Math.sin(angle)) * 1.6,
    );
    rotation.set(angle * 0.25, angle, -angle);
    scale = 0.1 + (index % 3) * 0.025;
  }
  if (index >= FIELD_COUNT - 12) {
    const side = index % 2 === 0 ? -1 : 1;
    position.x = side * (2.35 + (index % 4) * 0.38);
    position.y = -2.6 + ((index - (FIELD_COUNT - 12)) % 6) * 1.05;
    position.z = 0.35 - (index % 3) * 0.75 - form * 0.18;
    rotation.set(time * 0.14 + index, angle * 2.0, -angle);
    scale *= 1.6;
  }
  return scale;
};

export const createDepthField = (scene: THREE.Scene, state: ChapterState) => {
  const group = new THREE.Group();
  scene.add(group);
  const geometry = new THREE.PlaneGeometry(0.52, 1.6, 3, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0x0fed19,
    transparent: true,
    opacity: state.fieldOpacity * 0.72,
    alphaTest: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const field = new THREE.InstancedMesh(geometry, material, FIELD_COUNT);
  field.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  field.frustumCulled = false;
  group.add(field);

  const linePositions = new Float32Array(FIELD_COUNT * 6);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(linePositions, 3),
  );
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x8cff3e,
    transparent: true,
    opacity: state.fieldOpacity * 0.62,
    depthWrite: false,
    fog: true,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;
  group.add(lines);

  const particleCount = 220;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(particlePositions, 3),
  );
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x66ff83,
    size: 0.035,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  group.add(particles);

  const dummy = new THREE.Object3D();
  const positionA = new THREE.Vector3();
  const positionB = new THREE.Vector3();
  const rotationA = new THREE.Euler();
  const rotationB = new THREE.Euler();

  const update = (time: number) => {
    const lower = Math.floor(state.fieldForm);
    const upper = Math.min(3, lower + 1);
    const mix = THREE.MathUtils.smoothstep(state.fieldForm - lower, 0, 1);
    const fieldTime = time * state.fieldMotion;
    for (let index = 0; index < FIELD_COUNT; index += 1) {
      const scaleA = setFieldTarget(
        index,
        lower,
        fieldTime,
        positionA,
        rotationA,
      );
      const scaleB = setFieldTarget(
        index,
        upper,
        fieldTime,
        positionB,
        rotationB,
      );
      dummy.position.copy(positionA).lerp(positionB, mix);
      dummy.rotation.set(
        THREE.MathUtils.lerp(rotationA.x, rotationB.x, mix),
        THREE.MathUtils.lerp(rotationA.y, rotationB.y, mix),
        THREE.MathUtils.lerp(rotationA.z, rotationB.z, mix),
      );
      dummy.scale.setScalar(THREE.MathUtils.lerp(scaleA, scaleB, mix));
      dummy.scale.x *= 0.5 + (index % 4) * 0.28;
      dummy.scale.y *= 1.2 + (index % 5) * 0.26;
      dummy.updateMatrix();
      field.setMatrixAt(index, dummy.matrix);
      const lineOffset = index * 6;
      const span = 0.18 + (index % 5) * 0.11;
      const itemAngle = (index / FIELD_COUNT) * Math.PI * 2;
      linePositions[lineOffset] =
        dummy.position.x - Math.cos(itemAngle + time * 0.08) * span;
      linePositions[lineOffset + 1] =
        dummy.position.y - Math.sin(itemAngle) * span;
      linePositions[lineOffset + 2] = dummy.position.z;
      linePositions[lineOffset + 3] =
        dummy.position.x + Math.cos(itemAngle + time * 0.08) * span;
      linePositions[lineOffset + 4] =
        dummy.position.y + Math.sin(itemAngle) * span;
      linePositions[lineOffset + 5] = dummy.position.z + Math.sin(index) * 0.2;
    }
    field.instanceMatrix.needsUpdate = true;
    lineGeometry.attributes.position.needsUpdate = true;
    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3;
      const seed = (index * 0.61803398875) % 1;
      const depth = (index % 55) / 54;
      const particleAngle =
        seed * Math.PI * 10 + fieldTime * (0.08 + (index % 7) * 0.012);
      const radius = 1.4 + depth * (3.2 + state.fieldForm * 0.48);
      particlePositions[offset] =
        Math.cos(particleAngle) * radius +
        Math.sin(fieldTime * 0.22 + index) * 0.24;
      particlePositions[offset + 1] =
        Math.sin(particleAngle * 1.17) * radius * 0.58;
      particlePositions[offset + 2] =
        -1.2 - depth * (5.5 + state.fieldForm * 2.2);
    }
    particleGeometry.attributes.position.needsUpdate = true;
    material.opacity = state.fieldOpacity * 0.72;
    material.color.setHSL(
      0.31 - state.colorPhase * 0.08,
      0.92,
      0.36 + state.colorPhase * 0.08,
    );
    lineMaterial.opacity = state.fieldOpacity * 0.62;
    lineMaterial.color.setHSL(0.3 - state.colorPhase * 0.18, 0.95, 0.55);
    particleMaterial.opacity = 0.18 + state.fieldOpacity * 0.58;
    particleMaterial.color.setHSL(0.32 - state.colorPhase * 0.23, 0.92, 0.62);
  };

  return {
    update,
    setTexture: (texture: THREE.Texture) => {
      material.map = texture;
      material.alphaMap = texture;
      material.needsUpdate = true;
    },
    setParallax: (x: number, y: number) => {
      group.position.x = x * -0.18;
      group.position.y = y * 0.12;
    },
    dispose: () => {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
    },
  };
};
