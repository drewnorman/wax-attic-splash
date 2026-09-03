import * as THREE from 'three';
import { skullVertexShader, skullFragmentShader } from './shaders';
import type { QualityTier } from './quality';
import { QUALITY_TIERS } from './quality';

const createSkullMaterial = (shadow = 0) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWarp: { value: 0.055 },
      uHeat: { value: 0 },
      uGlitch: { value: 0 },
      uGlitchSeed: { value: 0 },
      uFinalMorph: { value: 0 },
      uTear: { value: 0 },
      uTexture: { value: null as THREE.Texture | null },
      uKeyDirection: { value: new THREE.Vector3(-0.42, 0.62, 0.86) },
      uKeyIntensity: { value: 1.34 },
      uFillIntensity: { value: 0.46 },
      uRimIntensity: { value: 0.82 },
      uSpecular: { value: 0.7 },
      uOpacity: { value: 1 },
      uShadow: { value: shadow },
    },
    vertexShader: skullVertexShader,
    fragmentShader: skullFragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
  });

export const createProceduralSkull = () => {
  const group = new THREE.Group();
  const bone = createSkullMaterial(0);
  const shadow = createSkullMaterial(1);
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
  const chin = add(
    new THREE.TorusGeometry(0.48, 0.115, 3, 7, Math.PI),
    bone,
    [0, -0.4, 0.36],
    [1.2, 0.82, 0.88],
    jaw,
  );
  chin.rotation.z = Math.PI;
  const leftRamus = add(
    new THREE.BoxGeometry(0.18, 0.72, 0.22),
    bone,
    [-0.52, -0.12, 0.28],
    [1, 1, 1],
    jaw,
  );
  const rightRamus = add(
    new THREE.BoxGeometry(0.18, 0.72, 0.22),
    bone,
    [0.52, -0.12, 0.28],
    [1, 1, 1],
    jaw,
  );
  leftRamus.rotation.z = -0.18;
  rightRamus.rotation.z = 0.18;
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
  group.userData.materials = [bone, shadow];
  group.scale.setScalar(0.72);
  group.visible = false;
  return group;
};

export const createFinalSceneEffects = (
  effectsGroup: THREE.Group,
  contentPivot: THREE.Group,
  headVariants: THREE.Object3D[],
  root: HTMLElement,
  camera: THREE.PerspectiveCamera,
) => {
  const maxFragments = 360;
  const maxDrops = 80;
  const maxSnow = 220;
  const dummy = new THREE.Object3D();
  const fragmentGeometry = new THREE.BoxGeometry(0.075, 0.075, 0.075);
  const fragmentBaseColor = new THREE.Color(0x8446a8);
  const fragmentBurnColor = new THREE.Color(0xffb52e);
  const fragmentMaterial = new THREE.MeshBasicMaterial({
    color: fragmentBaseColor,
    transparent: true,
  });
  const fragments = new THREE.InstancedMesh(
    fragmentGeometry,
    fragmentMaterial,
    maxFragments,
  );
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fragments.visible = false;
  fragments.frustumCulled = false;
  contentPivot.add(fragments);

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
  effectsGroup.add(rain);

  const snowGeometry = new THREE.SphereGeometry(0.042, 6, 4);
  const snowMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vSnowLocal;
      varying vec3 vSnowNormal;
      varying vec3 vSnowWorld;
      void main() {
        vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
        vec4 worldPosition = modelMatrix * instancePosition;
        vSnowLocal = position;
        vSnowNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vSnowWorld = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vSnowLocal;
      varying vec3 vSnowNormal;
      varying vec3 vSnowWorld;
      void main() {
        float edge = pow(1.0 - abs(vSnowNormal.z), 1.7);
        float checker = mod(floor((vSnowLocal.x + 0.2) * 44.0) + floor((vSnowLocal.y + 0.2) * 44.0), 2.0);
        float flashWave = sin(uTime * 7.5 + vSnowWorld.x * 3.1 + vSnowWorld.y * 1.7);
        float flash = smoothstep(0.72, 0.98, flashWave);
        vec3 black = mix(vec3(0.006, 0.005, 0.009), vec3(0.34, 0.28, 0.4), edge * 0.78);
        vec3 checked = mix(vec3(0.015), vec3(0.92), checker);
        vec3 color = mix(black, checked, flash * 0.88);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const snow = new THREE.InstancedMesh(snowGeometry, snowMaterial, maxSnow);
  snow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  snow.visible = false;
  snow.frustumCulled = false;
  effectsGroup.add(snow);

  let origins: THREE.Vector3[] = [];
  const collectOrigins = (variant: THREE.Object3D) => {
    const candidates: THREE.Vector3[] = [];
    contentPivot.updateMatrixWorld(true);
    const inverseModel = new THREE.Matrix4()
      .copy(contentPivot.matrixWorld)
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
  const snowflakes = Array.from({ length: maxSnow }, () => ({
    position: new THREE.Vector3(),
    baseX: 0,
    speed: 0,
    scale: 1,
    sway: 0,
    swayRate: 0,
    phase: 0,
    spin: 0,
  }));
  let active = false;
  let reducedMotion = false;
  let sceneTime = 0;
  let rainEndsAt = Infinity;
  let explosionAt = Infinity;
  let phaseEndsAt = Infinity;
  let phaseStartedAt = 0;
  let activeVariantIndex = 0;
  let nextHeadSwitchAt = 0;
  let switchesRemaining = 0;
  let nextTearAt = Infinity;
  let tearStartedAt = -1;
  let morphIntensity = 0;
  let tearIntensity = 0;
  let ambientAt = Infinity;
  let ambientEndsAt = Infinity;
  let ambientType = 'none';
  let phase = 'calm';
  let fragmentCount = maxFragments;
  let dropCount = maxDrops;
  let snowCount = maxSnow;
  let quality = QUALITY_TIERS.high;
  let glitchBoost = 0;
  let rainAccumulator = 0;
  let snowAccumulator = 0;
  let fragmentAccumulator = 0;
  let fragmentBurnTarget = 0;
  let fragmentBurnIntensity = 0;
  const RAIN_STEP = 0.1;
  const FRAGMENT_STEP = 1 / 12;

  const showActiveHead = () => {
    fragments.position.x = 0;
    headVariants.forEach((variant, index) => {
      variant.visible = index === activeVariantIndex;
    });
    root.dataset.headVariant = String(activeVariantIndex);
  };

  const scheduleHeadBurst = (initial = false) => {
    switchesRemaining = 0;
    nextHeadSwitchAt =
      sceneTime +
      (initial ? 1.2 + Math.random() * 1.4 : 2.8 + Math.random() * 2.4);
  };
  const switchHead = () => {
    if (switchesRemaining <= 0)
      switchesRemaining = 5 + Math.floor(Math.random() * 2) * 2;
    activeVariantIndex = (activeVariantIndex + 1) % headVariants.length;
    showActiveHead();
    root.classList.remove('is-head-switching');
    void root.offsetWidth;
    root.classList.add('is-head-switching');
    switchesRemaining -= 1;
    if (switchesRemaining > 0)
      nextHeadSwitchAt = sceneTime + 0.08 + Math.random() * 0.1;
    else scheduleHeadBurst();
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
  const resetSnow = (flake: (typeof snowflakes)[number], initial = false) => {
    flake.position.set(
      (Math.random() - 0.5) * 6.2,
      initial ? -2.8 + Math.random() * 7.2 : 3.4 + Math.random() * 2.8,
      (Math.random() - 0.5) * 2.8,
    );
    flake.baseX = flake.position.x;
    flake.speed = 0.8 + Math.random() * 2.1;
    flake.scale = 0.45 + Math.random() * 1.5;
    flake.sway = 0.16 + Math.random() * 0.42;
    flake.swayRate = 0.75 + Math.random() * 1.4;
    flake.phase = Math.random() * Math.PI * 2;
    flake.spin = (Math.random() - 0.5) * 2.6;
  };
  snowflakes.forEach((flake) => resetSnow(flake, true));

  const resetState = () => {
    sceneTime = 0;
    rainEndsAt = Infinity;
    explosionAt = 4.5 + Math.random() * 3;
    ambientAt = 1 + Math.random() * 1.5;
    ambientEndsAt = Infinity;
    ambientType = 'none';
    phaseEndsAt = Infinity;
    phaseStartedAt = 0;
    nextTearAt = 8 + Math.random() * 6;
    tearStartedAt = -1;
    morphIntensity = 0;
    tearIntensity = 0;
    phase = 'calm';
    rainAccumulator = 0;
    snowAccumulator = 0;
    fragmentAccumulator = 0;
    fragmentBurnTarget = 0;
    fragmentBurnIntensity = 0;
    fragmentMaterial.color.copy(fragmentBaseColor);
    fragmentMaterial.opacity = 1;
    rain.visible = false;
    snow.visible = false;
    fragments.visible = false;
    activeVariantIndex = Math.floor(Math.random() * headVariants.length);
    showActiveHead();
    scheduleHeadBurst(true);
    fragmentState.forEach((piece, index) => {
      piece.position.copy(origins[index]);
      piece.rotation.set(0, 0, 0);
    });
  };
  const startRain = () => {
    snow.visible = false;
    ambientType = 'rain';
    rain.visible = true;
    rainEndsAt = sceneTime + 2.2 + Math.random() * 2;
    ambientEndsAt = rainEndsAt;
    rainAccumulator = RAIN_STEP;
  };
  const stopRain = (scheduleNext = true) => {
    rain.visible = false;
    rainEndsAt = Infinity;
    if (scheduleNext) ambientAt = sceneTime + 0.8 + Math.random() * 1.4;
  };
  const startSnow = () => {
    rain.visible = false;
    rainEndsAt = Infinity;
    ambientType = 'snow';
    snow.visible = true;
    ambientEndsAt = sceneTime + 2.8 + Math.random() * 2.2;
    snowAccumulator = RAIN_STEP;
  };
  const stopAmbient = () => {
    stopRain(false);
    snow.visible = false;
    ambientType = 'none';
    ambientEndsAt = Infinity;
    ambientAt = sceneTime + 0.8 + Math.random() * 1.4;
  };
  const startAmbient = () => {
    if (Math.random() < 0.64) startRain();
    else startSnow();
  };
  const explode = () => {
    stopAmbient();
    phase = 'burst';
    phaseStartedAt = sceneTime;
    phaseEndsAt = sceneTime + 0.68 + Math.random() * 0.58;
    fragments.visible = true;
    origins = collectOrigins(headVariants[activeVariantIndex]);
    fragments.position.x = 0;
    if (activeVariantIndex === 0 && window.innerWidth <= 720) {
      contentPivot.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      let minX = Infinity;
      let maxX = -Infinity;
      origins.forEach((origin) => {
        const projectedX = origin
          .clone()
          .applyMatrix4(contentPivot.matrixWorld)
          .project(camera).x;
        minX = Math.min(minX, projectedX);
        maxX = Math.max(maxX, projectedX);
      });
      const projectedOrigin = new THREE.Vector3()
        .applyMatrix4(contentPivot.matrixWorld)
        .project(camera).x;
      const projectedUnitX = new THREE.Vector3(1, 0, 0)
        .applyMatrix4(contentPivot.matrixWorld)
        .project(camera).x;
      const unitsToNdc = projectedUnitX - projectedOrigin;
      if (
        Number.isFinite(minX) &&
        Number.isFinite(maxX) &&
        Math.abs(unitsToNdc) > 0.0001
      )
        fragments.position.x = -((minX + maxX) * 0.5) / unitsToNdc;
    }
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
        .multiplyScalar(2.45 + Math.random() * 3.35);
      piece.velocity.x += (Math.random() - 0.5) * 2;
      piece.velocity.y += 1.8 + Math.random() * 2.8;
      if (index % 4 === 0) piece.velocity.z += 0.65 + Math.random() * 0.85;
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
      snow.visible = false;
      fragments.visible = false;
      headVariants.forEach((variant, index) => {
        variant.visible = index === 0;
      });
      glitchBoost = 0;
      morphIntensity = 0;
      tearIntensity = 0;
      fragmentBurnTarget = 0;
      fragmentBurnIntensity = 0;
      fragmentMaterial.color.copy(fragmentBaseColor);
      root.style.removeProperty('--final-chaos');
    }
    if (!active || reducedMotion)
      root.classList.remove(
        'is-final-raining',
        'is-final-snowing',
        'is-final-exploding',
        'is-final-reassembling',
        'is-head-switching',
      );
  };
  const setReducedMotion = (next: boolean) => {
    reducedMotion = next;
    setActive(active);
  };
  const setQuality = (next: QualityTier) => {
    quality = next;
    fragmentCount = quality.finaleFragments;
    dropCount = quality.finaleDrops;
    snowCount = quality.finaleSnow;
    fragments.count = fragmentCount;
    rain.count = dropCount;
    snow.count = snowCount;
  };
  const resize = () => setQuality(quality);
  const update = (delta: number) => {
    if (!active || reducedMotion) return 0;
    const safeDelta = Math.min(delta, 0.25);
    sceneTime += safeDelta;
    fragmentBurnIntensity = THREE.MathUtils.lerp(
      fragmentBurnIntensity,
      fragmentBurnTarget,
      1 -
        Math.exp(
          -safeDelta * (fragmentBurnTarget > fragmentBurnIntensity ? 14 : 3.5),
        ),
    );
    fragmentMaterial.color.lerpColors(
      fragmentBaseColor,
      fragmentBurnColor,
      fragmentBurnIntensity,
    );
    fragmentMaterial.opacity = 0.86 + fragmentBurnIntensity * 0.14;
    morphIntensity =
      0.62 +
      Math.sin(sceneTime * 1.45) * 0.16 +
      Math.sin(sceneTime * 3.7) * 0.08;
    if (tearStartedAt < 0 && phase === 'calm' && sceneTime >= nextTearAt)
      tearStartedAt = sceneTime;
    if (tearStartedAt >= 0) {
      const tearProgress = (sceneTime - tearStartedAt) / 0.42;
      tearIntensity = tearProgress < 1 ? Math.sin(tearProgress * Math.PI) : 0;
      if (tearProgress >= 1) {
        tearStartedAt = -1;
        nextTearAt = sceneTime + 8 + Math.random() * 6;
      }
    }
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
    if (snow.visible) {
      snowMaterial.uniforms.uTime.value = sceneTime;
      snowAccumulator = Math.min(snowAccumulator + safeDelta, RAIN_STEP * 2);
      while (snowAccumulator >= RAIN_STEP) {
        snowAccumulator -= RAIN_STEP;
        for (let index = 0; index < snowCount; index += 1) {
          const flake = snowflakes[index];
          flake.position.y -= flake.speed * RAIN_STEP;
          flake.position.x =
            flake.baseX +
            Math.sin(sceneTime * flake.swayRate + flake.phase) * flake.sway;
          if (flake.position.y < -2.8) resetSnow(flake);
          dummy.position.copy(flake.position);
          dummy.rotation.set(
            sceneTime * flake.spin + index,
            sceneTime * flake.spin * 0.7,
            index * 0.31,
          );
          dummy.scale.setScalar(flake.scale);
          dummy.updateMatrix();
          snow.setMatrixAt(index, dummy.matrix);
        }
        snow.instanceMatrix.needsUpdate = true;
        root.style.setProperty(
          '--final-chaos',
          String(0.48 + Math.random() * 0.24),
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
      phaseEndsAt = sceneTime + 0.12 + Math.random() * 0.43;
    } else if (phase === 'hold' && sceneTime >= phaseEndsAt) {
      phase = 'reassemble';
      phaseStartedAt = sceneTime;
      phaseEndsAt = sceneTime + 0.3 + Math.random() * 0.9;
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
        dummy.scale.setScalar(
          (0.75 + (index % 6) * 0.08) *
            (1 + fragmentBurnIntensity * (0.08 + (index % 3) * 0.035)),
        );
        dummy.updateMatrix();
        fragments.setMatrixAt(index, dummy.matrix);
      }
      fragments.instanceMatrix.needsUpdate = true;
      if (phase === 'reassemble' && sceneTime >= phaseEndsAt) {
        fragments.visible = false;
        showActiveHead();
        phase = 'calm';
        scheduleHeadBurst(true);
        ambientAt = sceneTime + 0.6 + Math.random() * 1.2;
        explosionAt = sceneTime + 5 + Math.random() * 3.5;
      }
    }
    glitchBoost =
      phase === 'burst'
        ? 1.25
        : phase === 'hold'
          ? 0.78
          : phase === 'reassemble'
            ? 1.05
            : rain.visible || snow.visible
              ? 0.5
              : 0.16 + tearIntensity * 0.9;
    root.classList.toggle('is-final-raining', rain.visible);
    root.classList.toggle('is-final-snowing', snow.visible);
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
    setQuality,
    setActive,
    setReducedMotion,
    setBurnPoint: (raycaster: THREE.Raycaster) => {
      fragmentBurnTarget =
        fragments.visible && raycaster.intersectObject(fragments, false).length
          ? 1
          : 0;
    },
    setBurning: (burning: boolean) => {
      if (!burning) fragmentBurnTarget = 0;
    },
    setTexture: (texture: THREE.Texture) => {
      fragmentMaterial.map = texture;
      fragmentMaterial.color.copy(fragmentBaseColor);
      fragmentMaterial.needsUpdate = true;
    },
    isFragmented: () => fragments.visible,
    isActive: () => active,
    canShowcase: () => (active ? phase === 'calm' : true),
    getMorphState: () => ({
      intensity: active && !reducedMotion ? morphIntensity : 0,
      tear: active && !reducedMotion ? tearIntensity : 0,
    }),
    getActiveVariant: () => activeVariantIndex,
    dispose: () => {
      root.classList.remove(
        'is-final-sequence',
        'is-final-raining',
        'is-final-snowing',
        'is-final-exploding',
        'is-final-reassembling',
        'is-head-switching',
      );
      root.style.removeProperty('--final-chaos');
      fragmentGeometry.dispose();
      fragmentMaterial.dispose();
      dropGeometry.dispose();
      dropMaterial.dispose();
      snowGeometry.dispose();
      snowMaterial.dispose();
    },
  };
};
