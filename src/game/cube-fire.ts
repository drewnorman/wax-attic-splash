import * as THREE from 'three';

export const createCubeFireEmitter = (modelGroup: THREE.Group) => {
  const capacity = 280;
  const positions = new Float32Array(capacity * 3);
  const colors = new Float32Array(capacity * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.13,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  modelGroup.add(points);
  const particles = Array.from({ length: capacity }, () => ({
    age: 1,
    life: 1,
    velocity: new THREE.Vector3(),
    smoke: false,
  }));
  const normal = new THREE.Vector3();
  let cursor = 0;
  let accumulator = 0;
  let active = false;
  let pressure = 0.7;
  let reducedMotion = false;
  let limit = capacity;

  const emit = (smoke: boolean) => {
    const index = cursor++ % limit;
    const particle = particles[index];
    const face = Math.floor(Math.random() * 6);
    const axis = Math.floor(face / 2);
    const sign = face % 2 ? 1 : -1;
    normal.set(0, 0, 0).setComponent(axis, sign);
    const offset = index * 3;
    const point = new THREE.Vector3(
      (Math.random() - 0.5) * 2.24,
      (Math.random() - 0.5) * 2.24,
      (Math.random() - 0.5) * 2.24,
    );
    point.setComponent(axis, sign * 1.12);
    positions[offset] = point.x;
    positions[offset + 1] = point.y;
    positions[offset + 2] = point.z;
    particle.age = 0;
    particle.life = smoke
      ? 0.8 + Math.random() * 0.9
      : 0.32 + Math.random() * 0.48;
    particle.smoke = smoke;
    particle.velocity
      .copy(normal)
      .multiplyScalar(
        (smoke ? 0.5 : 1.5) + Math.random() * (smoke ? 0.8 : 2.4) * pressure,
      );
    particle.velocity.y += smoke
      ? 0.75 + Math.random()
      : 1.1 + Math.random() * 1.6;
  };
  const update = (delta: number, intensity: number, cubeVisible: boolean) => {
    points.visible = cubeVisible && !reducedMotion;
    if (active && !reducedMotion && cubeVisible) {
      accumulator += delta * (70 + pressure * 150) * intensity;
      while (accumulator >= 1) {
        emit(false);
        if (Math.random() < 0.72) emit(true);
        accumulator -= 1;
      }
    }
    for (let index = 0; index < limit; index += 1) {
      const particle = particles[index];
      if (particle.age >= particle.life) continue;
      particle.age += delta;
      const offset = index * 3;
      positions[offset] += particle.velocity.x * delta;
      positions[offset + 1] += particle.velocity.y * delta;
      positions[offset + 2] += particle.velocity.z * delta;
      particle.velocity.multiplyScalar(
        Math.exp(-delta * (particle.smoke ? 0.7 : 2.2)),
      );
      const fade = Math.max(0, 1 - particle.age / particle.life);
      if (particle.smoke) {
        colors[offset] = 0.18 * fade;
        colors[offset + 1] = 0.2 * fade;
        colors[offset + 2] = 0.18 * fade;
      } else {
        colors[offset] = fade;
        colors[offset + 1] = (0.18 + fade * 0.72) * fade;
        colors[offset + 2] = 0.08 * fade;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  };
  const resize = () => {
    limit = window.innerWidth < 720 ? 120 : capacity;
    points.geometry.setDrawRange(0, limit);
  };
  resize();
  return {
    update,
    resize,
    setBurning: (next: boolean, nextPressure = 0.7) => {
      active = next;
      pressure = THREE.MathUtils.clamp(nextPressure || 0.7, 0.25, 1);
    },
    setReducedMotion: (next: boolean) => {
      reducedMotion = next;
      if (next) active = false;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      modelGroup.remove(points);
    },
  };
};
