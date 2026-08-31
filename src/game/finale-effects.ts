import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { HeadMesh } from './state';
import { getVector4Uniform } from './renderer';

export const createMouthRig = (headGeometry: THREE.BufferGeometry) => {
  headGeometry.computeBoundingBox();
  const bounds = headGeometry.boundingBox;
  if (!bounds) throw new Error('Unable to calculate head geometry bounds.');
  const positions = headGeometry.getAttribute('position');
  const faceWidth = bounds.max.x - bounds.min.x;
  let frontZ = -Infinity;
  let mouthX = 0;
  let mouthSamples = 0;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    if (y > -0.66 && y < -0.34 && Math.abs(x) < faceWidth * 0.28 && z > 0) {
      frontZ = Math.max(frontZ, z);
      mouthX += x;
      mouthSamples += 1;
    }
  }
  if (!Number.isFinite(frontZ)) frontZ = bounds.max.z * 0.72;
  mouthX = mouthSamples ? mouthX / mouthSamples : 0;
  const group = new THREE.Group();
  group.position.set(mouthX, -0.5, frontZ - 0.055);
  group.scale.x = faceWidth * 0.4;
  group.visible = false;

  const cavityMaterial = new THREE.MeshBasicMaterial({
    color: 0x030303,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const cavity = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 24),
    cavityMaterial,
  );
  cavity.scale.set(1, 0.27, 1);
  group.add(cavity);

  const toothMaterial = new THREE.MeshBasicMaterial({
    color: 0xd8d5b7,
    transparent: true,
    opacity: 0,
  });
  const gumMaterial = new THREE.MeshBasicMaterial({
    color: 0x32131d,
    transparent: true,
    opacity: 0,
  });
  const upper = new THREE.Group();
  const lower = new THREE.Group();
  const toothGeometry = new THREE.BoxGeometry(0.105, 0.16, 0.075, 1, 1, 1);
  const gumGeometry = new THREE.BoxGeometry(0.92, 0.075, 0.055);
  const upperGum = new THREE.Mesh(gumGeometry, gumMaterial);
  const lowerGum = new THREE.Mesh(gumGeometry, gumMaterial);
  upperGum.position.y = 0.075;
  lowerGum.position.y = -0.075;
  upper.add(upperGum);
  lower.add(lowerGum);

  for (let index = 0; index < 9; index += 1) {
    const normalized = index / 8 - 0.5;
    const x = normalized * 0.82;
    const curve = normalized * normalized;
    const widthScale = 1 - Math.abs(normalized) * 0.34;
    const upperTooth = new THREE.Mesh(toothGeometry, toothMaterial);
    upperTooth.position.set(x, 0.005 - curve * 0.065, 0.015 - curve * 0.08);
    upperTooth.scale.set(widthScale, 0.9 + (1 - Math.abs(normalized)) * 0.2, 1);
    upperTooth.rotation.z = normalized * -0.08;
    upper.add(upperTooth);
    const lowerTooth = upperTooth.clone();
    lowerTooth.position.y = -0.005 + curve * 0.055;
    lowerTooth.rotation.z *= -1;
    lower.add(lowerTooth);
  }
  upper.position.y = 0.015;
  lower.position.y = -0.02;
  group.add(upper, lower);

  let opacity = 0;
  let allowed = false;
  const update = (expression: THREE.Vector4, detail: THREE.Vector4) => {
    const jaw = THREE.MathUtils.clamp(expression.w, 0, 1);
    const gape = THREE.MathUtils.clamp(detail.w, 0, 1);
    const reveal = THREE.MathUtils.smoothstep(
      jaw * 0.58 + gape * 0.72,
      0.16,
      0.58,
    );
    group.visible = allowed && opacity > 0.01 && reveal > 0.01;
    if (!group.visible) return;
    cavity.scale.y = 0.18 + gape * 0.34 + jaw * 0.18;
    upper.position.y = 0.025 + gape * 0.055;
    lower.position.y = -0.025 - gape * 0.11 - jaw * 0.13;
    lower.rotation.z = expression.z * 0.035;
    const visibleOpacity = opacity * reveal;
    cavityMaterial.opacity = visibleOpacity * 0.96;
    toothMaterial.opacity = visibleOpacity;
    gumMaterial.opacity = visibleOpacity * 0.92;
  };

  return {
    group,
    update,
    setOpacity: (value: number) => {
      opacity = value;
    },
    setAllowed: (value: boolean) => {
      allowed = value;
      if (!value) group.visible = false;
    },
    dispose: () => {
      cavity.geometry.dispose();
      cavityMaterial.dispose();
      toothGeometry.dispose();
      gumGeometry.dispose();
      toothMaterial.dispose();
      gumMaterial.dispose();
    },
  };
};

export const createProceduralSkull = () => {
  const group = new THREE.Group();
  const bone = new THREE.MeshBasicMaterial({
    color: 0xd9d1a8,
    toneMapped: false,
  });
  const shadow = new THREE.MeshBasicMaterial({
    color: 0x090307,
    toneMapped: false,
  });
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number],
    scale: [number, number, number],
    parent: THREE.Object3D = group,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  };
  add(
    new THREE.IcosahedronGeometry(1, 2),
    bone,
    [0, 0.28, 0],
    [1.05, 1.18, 0.88],
  );
  add(
    new THREE.IcosahedronGeometry(0.55, 1),
    bone,
    [-0.5, -0.27, 0.05],
    [0.76, 0.9, 0.8],
  );
  add(
    new THREE.IcosahedronGeometry(0.55, 1),
    bone,
    [0.5, -0.27, 0.05],
    [0.76, 0.9, 0.8],
  );
  add(
    new THREE.IcosahedronGeometry(0.22, 1),
    bone,
    [0, -0.08, 0.88],
    [0.7, 1.45, 0.75],
  );
  add(
    new THREE.CircleGeometry(0.28, 8),
    shadow,
    [-0.4, 0.26, 0.79],
    [1.18, 0.9, 1],
  );
  add(
    new THREE.CircleGeometry(0.28, 8),
    shadow,
    [0.4, 0.26, 0.79],
    [1.18, 0.9, 1],
  );
  const nose = add(
    new THREE.CircleGeometry(0.18, 3),
    shadow,
    [0, -0.13, 0.96],
    [0.72, 1, 1],
  );
  nose.rotation.z = Math.PI;
  const jaw = new THREE.Group();
  jaw.position.y = -0.48;
  group.add(jaw);
  add(
    new THREE.BoxGeometry(1.16, 0.42, 0.44, 4, 2, 1),
    bone,
    [0, -0.36, 0.25],
    [1, 1, 1],
    jaw,
  );
  const toothGeometry = new THREE.BoxGeometry(0.115, 0.22, 0.12);
  for (let index = 0; index < 9; index += 1) {
    const x = (index - 4) * 0.125;
    const curve = Math.abs(index - 4) * 0.014;
    const upper = add(
      toothGeometry,
      bone,
      [x, -0.2 - curve, 0.75 - curve],
      [0.9, 1, 1],
    );
    upper.rotation.z = (index - 4) * -0.025;
    const lower = add(
      toothGeometry,
      bone,
      [x, -0.48 + curve, 0.75 - curve],
      [0.9, 0.92, 1],
      jaw,
    );
    lower.rotation.z = (index - 4) * 0.025;
  }
  group.userData.jaw = jaw;
  group.userData.materials = [bone, shadow];
  group.visible = false;
  return group;
};

export const loadExternalSkull = async () => {
  const gltf = await new GLTFLoader().loadAsync('/models/low-poly-skull.glb');
  const group = gltf.scene;
  const material = new THREE.MeshBasicMaterial({
    color: 0xff7fa3,
    toneMapped: false,
  });
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.material = material;
    child.frustumCulled = false;
  });
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const fitted = new THREE.Group();
  fitted.add(group);
  const scale = 3.2 / Math.max(size.y, 0.001);
  group.position.copy(center).multiplyScalar(-1);
  fitted.scale.setScalar(scale);
  fitted.rotation.y = Math.PI;
  fitted.userData.materials = [material];
  fitted.visible = false;
  return fitted;
};

export const createFinalSceneEffects = (
  modelGroup: THREE.Group,
  headVariants: THREE.Object3D[],
  headMesh: HeadMesh,
  root: HTMLElement,
) => {
  const maxFragments = 300;
  const maxDrops = 80;
  const dummy = new THREE.Object3D();
  const fragmentGeometry = new THREE.BoxGeometry(0.075, 0.075, 0.075);
  const fragmentMaterial = new THREE.MeshBasicMaterial({ color: 0x8446a8 });
  const fragments = new THREE.InstancedMesh(
    fragmentGeometry,
    fragmentMaterial,
    maxFragments,
  );
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fragments.visible = false;
  fragments.frustumCulled = false;
  modelGroup.add(fragments);

  const dropGeometry = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, 0.24),
      new THREE.Vector2(0.018, 0.18),
      new THREE.Vector2(0.025, 0.1),
      new THREE.Vector2(0.065, -0.02),
      new THREE.Vector2(0.078, -0.13),
      new THREE.Vector2(0.052, -0.21),
      new THREE.Vector2(0, -0.25),
    ],
    6,
  );
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

  let origins: THREE.Vector3[] = [];
  const collectOrigins = (variant: THREE.Object3D) => {
    const candidates: THREE.Vector3[] = [];
    modelGroup.updateMatrixWorld(true);
    const inverseModel = new THREE.Matrix4()
      .copy(modelGroup.matrixWorld)
      .invert();
    variant.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const geometry = (child as THREE.Mesh<THREE.BufferGeometry>).geometry;
      if (!geometry.getAttribute('position')) return;
      const positions = geometry.getAttribute('position');
      const matrix = new THREE.Matrix4().multiplyMatrices(
        inverseModel,
        child.matrixWorld,
      );
      const stride = Math.max(1, Math.floor(positions.count / maxFragments));
      for (let index = 0; index < positions.count; index += stride) {
        candidates.push(
          new THREE.Vector3()
            .fromBufferAttribute(positions, index)
            .applyMatrix4(matrix),
        );
      }
    });
    if (!candidates.length) candidates.push(new THREE.Vector3());
    return Array.from({ length: maxFragments }, (_, index) =>
      candidates[
        Math.floor((index * candidates.length) / maxFragments) %
          candidates.length
      ].clone(),
    );
  };
  origins = collectOrigins(headVariants[0]);
  const fragmentState = origins.map((origin) => ({
    position: origin.clone(),
    velocity: new THREE.Vector3(),
    reassembleFrom: origin.clone(),
    rotation: new THREE.Euler(),
  }));
  const drops = Array.from({ length: maxDrops }, () => ({
    position: new THREE.Vector3(),
    speed: 0,
    scale: 1,
    tilt: 0,
  }));
  const expressionClips = [
    {
      face: new THREE.Vector4(0.18, 0.12, 0, 0.05),
      detail: new THREE.Vector4(0, 0, 0, 0.06),
    },
    {
      face: new THREE.Vector4(0.92, -0.42, -0.34, 0.12),
      detail: new THREE.Vector4(0.18, -0.12, 0, 0.18),
    },
    {
      face: new THREE.Vector4(-0.38, 0.78, 0.68, 0.2),
      detail: new THREE.Vector4(0.24, 0.18, 0, 0.3),
    },
    {
      face: new THREE.Vector4(-0.7, -0.58, -0.12, 0.32),
      detail: new THREE.Vector4(0.72, -0.18, 0, 0.5),
    },
    {
      face: new THREE.Vector4(0.42, 0.36, 0.22, 0.9),
      detail: new THREE.Vector4(0.08, 0.04, 0, 0.96),
    },
    {
      face: new THREE.Vector4(-0.82, 0.62, -0.74, 0.52),
      detail: new THREE.Vector4(0.38, 0.32, 0, 0.68),
    },
    {
      face: new THREE.Vector4(0.66, 0.7, 0.08, 0.38),
      detail: new THREE.Vector4(0.92, -0.22, 0, 0.62),
    },
    {
      face: new THREE.Vector4(-0.3, -0.18, 0.5, 0.68),
      detail: new THREE.Vector4(-0.18, 0.56, 0, 0.74),
    },
  ];
  const expression = getVector4Uniform(headMesh.material, 'uExpression');
  const expressionDetail = getVector4Uniform(
    headMesh.material,
    'uExpressionDetail',
  );
  const expressionBase = new THREE.Vector4();
  const detailBase = new THREE.Vector4();
  const expressionTarget = new THREE.Vector4();
  const detailTarget = new THREE.Vector4();
  let active = false;
  let reducedMotion = false;
  let sceneTime = 0;
  let rainEndsAt = Infinity;
  let explosionAt = Infinity;
  let phaseEndsAt = Infinity;
  let phaseStartedAt = 0;
  let expressionAt = 0;
  let activeVariantIndex = 0;
  let nextHeadSwitchAt = 0;
  let ambientAt = Infinity;
  let ambientEndsAt = Infinity;
  let ambientType = 'none';
  let blinkAt = 0;
  let blinkStartedAt = -1;
  let lastExpressionIndex = -1;
  let phase = 'calm';
  let fragmentCount = maxFragments;
  let dropCount = maxDrops;
  let glitchBoost = 0;
  let rainAccumulator = 0;
  let fragmentAccumulator = 0;
  const RAIN_STEP = 0.1;
  const FRAGMENT_STEP = 1 / 12;

  const showActiveHead = () => {
    headVariants.forEach((variant, index) => {
      variant.visible = index === activeVariantIndex;
    });
    root.dataset.headVariant = String(activeVariantIndex);
  };

  const scheduleHeadSwitch = () => {
    nextHeadSwitchAt = sceneTime + 1.4 + Math.random() * 1.8;
  };
  const switchHead = () => {
    let next = Math.floor(Math.random() * headVariants.length);
    if (next === activeVariantIndex) next = (next + 1) % headVariants.length;
    activeVariantIndex = next;
    showActiveHead();
    root.classList.remove('is-head-switching');
    void root.offsetWidth;
    root.classList.add('is-head-switching');
    scheduleHeadSwitch();
  };

  const resetDrop = (drop: (typeof drops)[number], initial = false) => {
    drop.position.set(
      (Math.random() - 0.5) * 5.4,
      initial ? -2.4 + Math.random() * 6.4 : 3.3 + Math.random() * 2.5,
      (Math.random() - 0.5) * 2.5,
    );
    drop.speed = 4.2 + Math.random() * 4.5;
    drop.scale = 0.65 + Math.random() * 0.75;
    drop.tilt = -0.28 + Math.random() * 0.34;
  };
  drops.forEach((drop) => resetDrop(drop, true));

  const resetState = () => {
    sceneTime = 0;
    rainEndsAt = Infinity;
    explosionAt = 10 + Math.random() * 6;
    ambientAt = 1.5 + Math.random() * 2;
    ambientEndsAt = Infinity;
    ambientType = 'none';
    phaseEndsAt = Infinity;
    phaseStartedAt = 0;
    expressionAt = 0;
    blinkAt = 1.2 + Math.random() * 1.8;
    blinkStartedAt = -1;
    lastExpressionIndex = -1;
    phase = 'calm';
    rainAccumulator = 0;
    fragmentAccumulator = 0;
    rain.visible = false;
    root.classList.remove('is-final-splattering');
    fragments.visible = false;
    activeVariantIndex = Math.floor(Math.random() * headVariants.length);
    showActiveHead();
    scheduleHeadSwitch();
    expression.set(0, 0, 0, 0);
    expressionDetail.set(0, 0, 0, 0);
    expressionBase.set(0, 0, 0, 0);
    detailBase.set(0, 0, 0, 0);
    expressionTarget.set(0, 0, 0, 0);
    detailTarget.set(0, 0, 0, 0);
    fragmentState.forEach((piece, index) => {
      piece.position.copy(origins[index]);
      piece.rotation.set(0, 0, 0);
    });
  };
  const startRain = () => {
    ambientType = 'rain';
    rain.visible = true;
    rainEndsAt = sceneTime + 1.5 + Math.random() * 1.5;
    ambientEndsAt = rainEndsAt;
    rainAccumulator = RAIN_STEP;
  };
  const stopRain = (scheduleNext = true) => {
    rain.visible = false;
    rainEndsAt = Infinity;
    if (scheduleNext) ambientAt = sceneTime + 4 + Math.random() * 5;
  };
  const startSplatter = () => {
    ambientType = 'splatter';
    ambientEndsAt = sceneTime + 1.8 + Math.random() * 1.4;
    root.classList.add('is-final-splattering');
  };
  const stopAmbient = () => {
    stopRain(false);
    root.classList.remove('is-final-splattering');
    ambientType = 'none';
    ambientEndsAt = Infinity;
    ambientAt = sceneTime + 4 + Math.random() * 5;
  };
  const startAmbient = () => {
    if (Math.random() < 0.5) startRain();
    else startSplatter();
  };
  const explode = () => {
    stopAmbient();
    phase = 'burst';
    phaseStartedAt = sceneTime;
    phaseEndsAt = sceneTime + 0.45 + Math.random() * 0.2;
    fragments.visible = true;
    origins = collectOrigins(headVariants[activeVariantIndex]);
    fragmentState.forEach((piece, index) =>
      piece.position.copy(origins[index]),
    );
    headVariants.forEach((variant) => {
      variant.visible = false;
    });
    for (let index = 0; index < fragmentCount; index += 1) {
      const piece = fragmentState[index];
      piece.position.copy(origins[index]);
      piece.velocity
        .copy(origins[index])
        .normalize()
        .multiplyScalar(2.3 + Math.random() * 3.2);
      piece.velocity.x += (Math.random() - 0.5) * 2;
      piece.velocity.y += 1.8 + Math.random() * 2.8;
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
    if (active && !reducedMotion) resetState();
    else {
      rain.visible = false;
      fragments.visible = false;
      headVariants.forEach((variant, index) => {
        variant.visible = index === 0;
      });
      expression.set(0, 0, 0, 0);
      expressionDetail.set(0, 0, 0, 0);
      glitchBoost = 0;
      root.style.removeProperty('--final-chaos');
    }
    if (!active || reducedMotion)
      root.classList.remove(
        'is-final-raining',
        'is-final-splattering',
        'is-final-exploding',
        'is-final-reassembling',
        'is-head-switching',
      );
  };
  const setReducedMotion = (next: boolean) => {
    reducedMotion = next;
    setActive(active);
  };
  const resize = () => {
    const mobile = window.innerWidth < 720;
    fragmentCount = mobile ? 160 : maxFragments;
    dropCount = mobile ? 44 : maxDrops;
    fragments.count = fragmentCount;
    rain.count = dropCount;
  };
  const update = (delta: number) => {
    if (!active || reducedMotion) return 0;
    const safeDelta = Math.min(delta, 0.25);
    sceneTime += safeDelta;
    if (sceneTime >= expressionAt) {
      let nextExpressionIndex = Math.floor(
        Math.random() * expressionClips.length,
      );
      if (nextExpressionIndex === lastExpressionIndex)
        nextExpressionIndex =
          (nextExpressionIndex + 1) % expressionClips.length;
      lastExpressionIndex = nextExpressionIndex;
      expressionTarget.copy(expressionClips[nextExpressionIndex].face);
      detailTarget.copy(expressionClips[nextExpressionIndex].detail);
      expressionAt = sceneTime + 0.9 + Math.random() * 1.9;
    }
    const expressionBlend = 1 - Math.exp(-safeDelta * 4.6);
    expressionBase.lerp(expressionTarget, expressionBlend);
    detailBase.lerp(detailTarget, expressionBlend);
    if (blinkStartedAt < 0 && sceneTime >= blinkAt) blinkStartedAt = sceneTime;
    let blink = 0;
    if (blinkStartedAt >= 0) {
      const blinkProgress = (sceneTime - blinkStartedAt) / 0.18;
      if (blinkProgress >= 1) {
        blinkStartedAt = -1;
        blinkAt = sceneTime + 2.1 + Math.random() * 3.8;
      } else blink = Math.sin(blinkProgress * Math.PI);
    }
    expression.copy(expressionBase);
    expression.x += Math.sin(sceneTime * 1.7) * 0.055;
    expression.y += Math.sin(sceneTime * 1.31 + 1.8) * 0.045;
    expression.z += Math.sin(sceneTime * 2.2 + 0.7) * 0.035;
    expressionDetail.copy(detailBase);
    expressionDetail.z = Math.max(expressionDetail.z, blink);
    const proceduralJaw: unknown = headVariants[1]?.userData.jaw;
    if (proceduralJaw instanceof THREE.Object3D)
      proceduralJaw.rotation.x =
        -0.12 - Math.max(expression.w, expressionDetail.w) * 0.28;
    if (phase === 'calm' && sceneTime >= nextHeadSwitchAt) switchHead();
    if (phase === 'calm' && sceneTime >= explosionAt) explode();
    else if (
      phase === 'calm' &&
      ambientType === 'none' &&
      sceneTime >= ambientAt
    )
      startAmbient();
    if (ambientType !== 'none' && sceneTime >= ambientEndsAt) stopAmbient();
    if (rain.visible) {
      rainAccumulator = Math.min(rainAccumulator + safeDelta, RAIN_STEP * 2);
      while (rainAccumulator >= RAIN_STEP) {
        rainAccumulator -= RAIN_STEP;
        for (let index = 0; index < dropCount; index += 1) {
          const drop = drops[index];
          drop.position.y -= drop.speed * RAIN_STEP;
          drop.position.x -= RAIN_STEP * 0.5;
          if (drop.position.y < -2.65) resetDrop(drop);
          dummy.position.copy(drop.position);
          dummy.rotation.set(drop.tilt, 0, 0.16);
          dummy.scale.setScalar(drop.scale * 0.58);
          dummy.updateMatrix();
          rain.setMatrixAt(index, dummy.matrix);
        }
        rain.instanceMatrix.needsUpdate = true;
        root.style.setProperty(
          '--final-chaos',
          String(0.56 + Math.random() * 0.2),
        );
      }
    }
    fragmentAccumulator = Math.min(
      fragmentAccumulator + safeDelta,
      FRAGMENT_STEP * 2,
    );
    if (phase === 'burst' && sceneTime >= phaseEndsAt) {
      phase = 'hold';
      phaseStartedAt = sceneTime;
      phaseEndsAt = sceneTime + 0.25 + Math.random() * 0.15;
    } else if (phase === 'hold' && sceneTime >= phaseEndsAt) {
      phase = 'reassemble';
      phaseStartedAt = sceneTime;
      phaseEndsAt = sceneTime + 0.5 + Math.random() * 0.15;
      fragmentState.forEach((piece) =>
        piece.reassembleFrom.copy(piece.position),
      );
    }
    if (fragments.visible && fragmentAccumulator >= FRAGMENT_STEP) {
      fragmentAccumulator -= FRAGMENT_STEP;
      const rawProgress =
        phase === 'reassemble'
          ? (sceneTime - phaseStartedAt) / (phaseEndsAt - phaseStartedAt)
          : 0;
      const reassemblyProgress =
        phase === 'reassemble'
          ? Math.floor(THREE.MathUtils.clamp(rawProgress, 0, 1) * 7) / 7
          : 0;
      for (let index = 0; index < fragmentCount; index += 1) {
        const piece = fragmentState[index];
        if (phase === 'burst') {
          piece.velocity.y -= 7.4 * FRAGMENT_STEP;
          piece.position.addScaledVector(piece.velocity, FRAGMENT_STEP);
          if (piece.position.y < -2.1) {
            piece.position.y = -2.1;
            if (piece.velocity.y < 0) piece.velocity.y *= -0.28;
            piece.velocity.x *= 0.78;
            piece.velocity.z *= 0.78;
          }
          piece.rotation.x += FRAGMENT_STEP * (2 + (index % 7));
          piece.rotation.y += FRAGMENT_STEP * (1.5 + (index % 5));
        } else if (phase === 'reassemble') {
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
      if (phase === 'reassemble' && sceneTime >= phaseEndsAt) {
        fragments.visible = false;
        showActiveHead();
        phase = 'calm';
        scheduleHeadSwitch();
        ambientAt = sceneTime + 4 + Math.random() * 5;
        explosionAt = sceneTime + 14 + Math.random() * 8;
      }
    }
    glitchBoost =
      phase === 'burst'
        ? 1.25
        : phase === 'hold'
          ? 0.78
          : phase === 'reassemble'
            ? 1.05
            : rain.visible || ambientType === 'splatter'
              ? 0.5
              : 0.16;
    root.classList.toggle('is-final-raining', rain.visible);
    root.classList.toggle(
      'is-final-exploding',
      phase === 'burst' || phase === 'hold',
    );
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
    setTexture: (texture: THREE.Texture) => {
      fragmentMaterial.map = texture;
      fragmentMaterial.color.setHex(0x8446a8);
      fragmentMaterial.needsUpdate = true;
    },
    isFragmented: () => fragments.visible,
    isActive: () => active,
    getActiveVariant: () => activeVariantIndex,
    dispose: () => {
      root.classList.remove(
        'is-final-sequence',
        'is-final-raining',
        'is-final-splattering',
        'is-final-exploding',
        'is-final-reassembling',
        'is-head-switching',
      );
      root.style.removeProperty('--final-chaos');
      fragmentGeometry.dispose();
      fragmentMaterial.dispose();
      dropGeometry.dispose();
      dropMaterial.dispose();
    },
  };
};
