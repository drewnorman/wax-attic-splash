import * as THREE from 'three';
import type { HeadMesh } from './state';

export const createFinalSceneEffects = (
  modelGroup: THREE.Group,
  headMesh: HeadMesh,
  root: HTMLElement,
) => {
  const maxFragments = 420;
  const maxDrops = 120;
  const dummy = new THREE.Object3D();
  const fragmentGeometry = new THREE.BoxGeometry(0.075, 0.075, 0.075);
  const fragmentMaterial = new THREE.MeshBasicMaterial({ color: 0x7cff5b });
  const fragments = new THREE.InstancedMesh(
    fragmentGeometry,
    fragmentMaterial,
    maxFragments,
  );
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fragments.visible = false;
  fragments.frustumCulled = false;
  modelGroup.add(fragments);

  const dropGeometry = new THREE.ConeGeometry(0.035, 0.34, 4);
  const dropMaterial = new THREE.MeshBasicMaterial({
    color: 0xff1838,
    transparent: true,
    opacity: 0.82,
  });
  const rain = new THREE.InstancedMesh(dropGeometry, dropMaterial, maxDrops);
  rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rain.visible = false;
  rain.frustumCulled = false;
  modelGroup.add(rain);

  const positions = headMesh.geometry.getAttribute('position');
  const origins = Array.from({ length: maxFragments }, (_, index) => {
    const vertex = Math.floor((index * positions.count) / maxFragments);
    return new THREE.Vector3().fromBufferAttribute(positions, vertex);
  });
  const fragmentState = origins.map((origin) => ({
    position: origin.clone(),
    velocity: new THREE.Vector3(),
    reassembleFrom: origin.clone(),
    rotation: new THREE.Euler(),
  }));
  const drops = Array.from({ length: maxDrops }, () => ({
    position: new THREE.Vector3(),
    speed: 0,
  }));
  const expressions = [
    new THREE.Vector4(0.9, 0.25, -0.35, 0.08),
    new THREE.Vector4(-0.65, 0.75, 0.6, 0.1),
    new THREE.Vector4(0.25, -0.2, -0.5, 0.8),
    new THREE.Vector4(-0.85, 0.45, 0.75, 0.32),
  ];
  const expressionValue: unknown =
    headMesh.material.uniforms.uExpression?.value;
  if (!(expressionValue instanceof THREE.Vector4)) {
    throw new Error('The head shader is missing its expression uniform.');
  }
  const expression = expressionValue;
  let active = false;
  let reducedMotion = false;
  let elapsed = 0;
  let cycleLength = 10;
  let rainAt = 0.8;
  let explosionAt = 4;
  let reassembleAt = 6.7;
  let expressionAt = 0;
  let phase = 'calm';
  let fragmentCount = maxFragments;
  let dropCount = maxDrops;
  let glitchBoost = 0;

  const resetDrop = (drop: (typeof drops)[number], initial = false) => {
    drop.position.set(
      (Math.random() - 0.5) * 5.4,
      initial ? -2.4 + Math.random() * 6.4 : 3.3 + Math.random() * 2.5,
      (Math.random() - 0.5) * 2.5,
    );
    drop.speed = 4.2 + Math.random() * 4.5;
  };
  drops.forEach((drop) => resetDrop(drop, true));

  const resetCycle = () => {
    elapsed = 0;
    cycleLength = 8 + Math.random() * 4;
    rainAt = 0.5 + Math.random();
    explosionAt = 3.3 + Math.random() * 1.4;
    reassembleAt = Math.min(
      cycleLength - 1.35,
      explosionAt + 2.5 + Math.random() * 0.7,
    );
    expressionAt = 0;
    phase = 'calm';
    fragments.visible = false;
    headMesh.visible = true;
    fragmentState.forEach((piece, index) =>
      piece.position.copy(origins[index]),
    );
  };
  const explode = () => {
    phase = 'explode';
    fragments.visible = true;
    headMesh.visible = false;
    for (let index = 0; index < fragmentCount; index += 1) {
      const piece = fragmentState[index];
      piece.position.copy(origins[index]);
      piece.velocity
        .copy(origins[index])
        .normalize()
        .multiplyScalar(1.15 + Math.random() * 2.5);
      piece.velocity.x += (Math.random() - 0.5) * 1.5;
      piece.velocity.y += 1.25 + Math.random() * 2.2;
      piece.rotation.set(
        Math.random() * 3,
        Math.random() * 3,
        Math.random() * 3,
      );
    }
  };
  const setActive = (next: boolean) => {
    active = next;
    root.classList.toggle('is-final-sequence', active && !reducedMotion);
    if (active && !reducedMotion) resetCycle();
    else {
      rain.visible = false;
      fragments.visible = false;
      headMesh.visible = true;
      expression.set(0, 0, 0, 0);
      glitchBoost = 0;
    }
    if (!active || reducedMotion)
      root.classList.remove(
        'is-final-raining',
        'is-final-exploding',
        'is-final-reassembling',
      );
  };
  const setReducedMotion = (next: boolean) => {
    reducedMotion = next;
    setActive(active);
  };
  const resize = () => {
    const mobile = window.innerWidth < 720;
    fragmentCount = mobile ? 230 : maxFragments;
    dropCount = mobile ? 64 : maxDrops;
    fragments.count = fragmentCount;
    rain.count = dropCount;
  };
  const update = (delta: number) => {
    if (!active || reducedMotion) return 0;
    elapsed += delta;
    if (elapsed >= cycleLength) resetCycle();
    if (elapsed >= expressionAt) {
      expression.copy(
        expressions[Math.floor(Math.random() * expressions.length)],
      );
      expressionAt = elapsed + 0.18 + Math.random() * 0.42;
    }
    rain.visible = elapsed > rainAt && elapsed < reassembleAt + 0.55;
    if (rain.visible) {
      for (let index = 0; index < dropCount; index += 1) {
        const drop = drops[index];
        drop.position.y -= drop.speed * delta;
        drop.position.x -= delta * 0.5;
        if (drop.position.y < -2.65) resetDrop(drop);
        dummy.position.copy(drop.position);
        dummy.rotation.set(0, 0, 0.16);
        dummy.scale.setScalar(0.72 + (index % 5) * 0.08);
        dummy.updateMatrix();
        rain.setMatrixAt(index, dummy.matrix);
      }
      rain.instanceMatrix.needsUpdate = true;
    }
    if (phase === 'calm' && elapsed >= explosionAt) explode();
    if (phase === 'explode' && elapsed >= reassembleAt) {
      phase = 'reassemble';
      fragmentState.forEach((piece) =>
        piece.reassembleFrom.copy(piece.position),
      );
    }
    if (fragments.visible) {
      const reassemblyProgress =
        phase === 'reassemble'
          ? THREE.MathUtils.smoothstep(
              elapsed,
              reassembleAt,
              reassembleAt + 1.05,
            )
          : 0;
      for (let index = 0; index < fragmentCount; index += 1) {
        const piece = fragmentState[index];
        if (phase === 'explode') {
          piece.velocity.y -= 5.8 * delta;
          piece.position.addScaledVector(piece.velocity, delta);
          if (piece.position.y < -2.1) {
            piece.position.y = -2.1;
            if (piece.velocity.y < 0) piece.velocity.y *= -0.32;
            piece.velocity.x *= 0.94;
            piece.velocity.z *= 0.94;
          }
          piece.rotation.x += delta * (2 + (index % 7));
          piece.rotation.y += delta * (1.5 + (index % 5));
        } else {
          piece.position.lerpVectors(
            piece.reassembleFrom,
            origins[index],
            reassemblyProgress,
          );
          piece.rotation.x *= 1 - reassemblyProgress;
          piece.rotation.y *= 1 - reassemblyProgress;
        }
        dummy.position.copy(piece.position);
        dummy.rotation.copy(piece.rotation);
        dummy.scale.setScalar(0.75 + (index % 6) * 0.08);
        dummy.updateMatrix();
        fragments.setMatrixAt(index, dummy.matrix);
      }
      fragments.instanceMatrix.needsUpdate = true;
      if (phase === 'reassemble' && reassemblyProgress >= 0.995) {
        fragments.visible = false;
        headMesh.visible = true;
        phase = 'cooldown';
      }
    }
    glitchBoost =
      phase === 'explode'
        ? 1.25
        : phase === 'reassemble'
          ? 1.05
          : rain.visible
            ? 0.5
            : 0.16;
    root.classList.toggle('is-final-raining', rain.visible);
    root.classList.toggle('is-final-exploding', phase === 'explode');
    root.classList.toggle('is-final-reassembling', phase === 'reassemble');
    root.style.setProperty('--final-chaos', String(glitchBoost));
    return glitchBoost;
  };
  resize();
  return {
    update,
    resize,
    setActive,
    setReducedMotion,
    isFragmented: () => fragments.visible,
    dispose: () => {
      root.classList.remove(
        'is-final-sequence',
        'is-final-raining',
        'is-final-exploding',
        'is-final-reassembling',
      );
      root.style.removeProperty('--final-chaos');
      fragmentGeometry.dispose();
      fragmentMaterial.dispose();
      dropGeometry.dispose();
      dropMaterial.dispose();
    },
  };
};
