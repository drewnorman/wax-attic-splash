import * as THREE from 'three';
import { gsap } from 'gsap';
import type { ChapterState, AmbientState, Timeline } from './state';
import {
  vertexShader,
  headVertexShader,
  fragmentShader,
  sludgeVertexShader,
  sludgeFragmentShader,
} from './shaders';
import {
  isHeadSourceAvailable,
  markHeadSourceFailed,
  loadMorphGeometry,
  loadHeadGeometry,
} from './head-geometry';
import { createDepthField } from './depth-field';
import { createCubeFireEmitter } from './cube-fire';
import type { QualityTier } from './quality';
import { QUALITY_TIERS } from './quality';
import waxTextureUrl from '../assets/media/wax-texture.webp?url';

const getVariantMaterials = (variant: THREE.Object3D) => {
  const materials: unknown = variant.userData.materials;
  return Array.isArray(materials)
    ? materials.filter(
        (material): material is THREE.ShaderMaterial =>
          material instanceof THREE.ShaderMaterial,
      )
    : [];
};

export const createRenderer = async (
  canvas: HTMLCanvasElement,
  state: ChapterState,
  root: HTMLElement,
  ambient: AmbientState,
  ambientTimelines: Timeline[],
  onQualityDowngrade?: (tier: QualityTier) => void,
) => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020503, 0.075);
  const camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.z = 7;
  const fallbackTexture = new THREE.DataTexture(
    new Uint8Array([72, 86, 67, 255]),
    1,
    1,
  );
  fallbackTexture.needsUpdate = true;
  fallbackTexture.colorSpace = THREE.SRGBColorSpace;
  const meshUniforms = {
    uTime: { value: 0 },
    uMorph: { value: state.morph },
    uWarp: { value: state.warp },
    uChaos: { value: state.chaos },
    uColorPhase: { value: state.colorPhase },
    uTexture: { value: fallbackTexture as THREE.Texture },
    uKeyDirection: {
      value: new THREE.Vector3(state.keyX, state.keyY, state.keyZ),
    },
    uKeyIntensity: { value: state.keyIntensity },
    uFillIntensity: { value: state.fillIntensity },
    uRimIntensity: { value: state.rimIntensity },
    uSpecular: { value: state.specular },
    uBurn: { value: 0 },
    uGlitch: { value: 0 },
    uGlitchSeed: { value: 0 },
    uOpacity: { value: state.cubeOpacity },
  };
  const meshMaterial = new THREE.ShaderMaterial({
    uniforms: meshUniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const cubeMesh = new THREE.Mesh(await loadMorphGeometry(), meshMaterial);
  const headUniforms = {
    uTime: { value: 0 },
    uMorph: { value: 1 },
    uWarp: { value: state.warp },
    uHeadWarp: { value: state.headWarp },
    uChaos: { value: state.chaos },
    uColorPhase: { value: state.colorPhase },
    uTexture: { value: fallbackTexture as THREE.Texture },
    uKeyDirection: {
      value: new THREE.Vector3(state.keyX, state.keyY, state.keyZ),
    },
    uKeyIntensity: { value: state.keyIntensity },
    uFillIntensity: { value: state.fillIntensity },
    uRimIntensity: { value: state.rimIntensity },
    uSpecular: { value: state.specular },
    uBurn: { value: 0 },
    uGlitch: { value: 0 },
    uGlitchSeed: { value: 0 },
    uOpacity: { value: state.headOpacity },
    uFinalMorph: { value: 0 },
    uTear: { value: 0 },
  };
  const headMaterial = new THREE.ShaderMaterial({
    uniforms: headUniforms,
    vertexShader: headVertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
  });
  let headGeometry: THREE.BufferGeometry;
  try {
    headGeometry = await loadHeadGeometry();
  } catch (error) {
    markHeadSourceFailed();
    console.warn(
      'Head model unavailable; using the procedural fallback.',
      error,
    );
    headGeometry = new THREE.SphereGeometry(1.2, 32, 24);
  }
  const headMesh = new THREE.Mesh(headGeometry, headMaterial);
  headMesh.scale.setScalar(1.18);
  headMesh.position.y = -0.48;
  const skullVariants: THREE.Group[] = [];
  const headVariants: THREE.Object3D[] = [headMesh];
  skullVariants.forEach((variant) => {
    variant.userData.idleBasePosition = variant.position.clone();
    variant.userData.idleBaseRotation = variant.rotation.clone();
    getVariantMaterials(variant).forEach((material) => {
      material.uniforms.uTexture.value = fallbackTexture;
    });
  });
  const modelGroup = new THREE.Group();
  const contentPivot = new THREE.Group();
  const effectsGroup = new THREE.Group();
  modelGroup.rotation.set(-0.18, -0.38, 0.04);
  contentPivot.add(cubeMesh, ...headVariants);
  modelGroup.add(contentPivot);
  scene.add(modelGroup, effectsGroup);
  const cubeFire = createCubeFireEmitter(contentPivot);
  type FinalEffects = ReturnType<
    (typeof import('./finale-effects'))['createFinalSceneEffects']
  >;
  const emptyMorph = { intensity: 0, tear: 0 };
  let finalEffects: FinalEffects | null = null;
  let finalePromise: Promise<void> | null = null;
  let finaleActive = false;
  let destroyed = false;
  const preloadFinale = () => {
    if (finalePromise) return finalePromise;
    finalePromise = import('./finale-effects')
      .then(({ createProceduralSkull, createFinalSceneEffects }) => {
        if (destroyed) return;
        const skull = createProceduralSkull();
        skull.userData.idleBasePosition = skull.position.clone();
        skull.userData.idleBaseRotation = skull.rotation.clone();
        getVariantMaterials(skull).forEach((material) => {
          material.uniforms.uTexture.value = skullTexture ?? fallbackTexture;
        });
        skullVariants.push(skull);
        headVariants.push(skull);
        contentPivot.add(skull);
        finalEffects = createFinalSceneEffects(
          effectsGroup,
          contentPivot,
          headVariants,
          root,
        );
        if (skullTexture) finalEffects.setTexture(skullTexture);
        finalEffects.setQuality(quality);
        finalEffects.setReducedMotion(reducedMotion);
        finalEffects.setActive(finaleActive);
        finalEffects.resize();
      })
      .catch((error: unknown) => {
        console.warn(
          'Finale effects unavailable; keeping the base head.',
          error,
        );
      });
    return finalePromise;
  };
  const sludgeUniforms = {
    uTime: { value: 0 },
    uIntensity: { value: state.sludge },
  };
  const sludgeMaterial = new THREE.ShaderMaterial({
    uniforms: sludgeUniforms,
    vertexShader: sludgeVertexShader,
    fragmentShader: sludgeFragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const sludgePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 9),
    sludgeMaterial,
  );
  sludgePlane.position.z = -3.5;
  scene.add(sludgePlane);
  const depthField = createDepthField(scene, state);
  let skullTexture: THREE.Texture | null = null;
  try {
    const texture = await new THREE.TextureLoader().loadAsync(waxTextureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    meshUniforms.uTexture.value = texture;
    headUniforms.uTexture.value = texture;
    skullTexture = texture.clone();
    skullTexture.needsUpdate = true;
    skullVariants.forEach((variant) => {
      getVariantMaterials(variant).forEach((material) => {
        material.uniforms.uTexture.value = skullTexture;
      });
    });
    depthField.setTexture(texture);
    fallbackTexture.dispose();
  } catch (error) {
    console.warn(
      'Wax texture unavailable; using the material fallback.',
      error,
    );
  }

  const timer = new THREE.Timer();
  timer.connect(document);
  const interaction = {
    targetYaw: 0,
    targetPitch: 0,
    yaw: 0,
    pitch: 0,
    targetParallaxX: 0,
    targetParallaxY: 0,
    parallaxX: 0,
    parallaxY: 0,
  };
  let visible = !document.hidden;
  let spinX = 0;
  let spinY = 0;
  let spinZ = 0;
  let viewportScale = 1;
  let renderedFov = camera.fov;
  let burnTarget = 0;
  let burnIntensity = 0;
  let cubeHeatTarget = 0;
  let headHeatTarget = 0;
  let cubeHeat = 0;
  let headHeat = 0;
  let glitchIntensity = 0;
  let glitchSeed = 0;
  let glitchEndsAt = 0;
  let nextGlitchAt = 0;
  let reducedMotion = false;
  let quality = QUALITY_TIERS.high;
  let sampleStartedAt = performance.now();
  let sampleAfter = sampleStartedAt + 1000;
  let sampleTotal = 0;
  let sampleCount = 0;
  const parallaxValues = new Map<string, number>();
  const setParallaxProperty = (name: string, value: number) => {
    const previous = parallaxValues.get(name);
    if (previous !== undefined && Math.abs(previous - value) < 0.08) return;
    parallaxValues.set(name, value);
    root.style.setProperty(name, `${value}px`);
  };
  let nextShowcaseAt = 4 + Math.random() * 4;
  let showcaseStartedAt = -1;
  let showcaseDuration = 0;
  let showcaseAxis = 'y';
  const showcaseAxisWorld = new THREE.Vector3();
  const showcaseAxisLocal = new THREE.Vector3();
  const inverseModelQuaternion = new THREE.Quaternion();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    timer.update();
    const delta = Math.min(timer.getDelta(), 0.05);
    const now = performance.now();
    if (!root.classList.contains('is-introduced')) {
      sampleStartedAt = now;
      sampleAfter = now + 1000;
      sampleTotal = 0;
      sampleCount = 0;
    } else if (now >= sampleAfter) {
      sampleTotal += delta * 1000;
      sampleCount += 1;
      if (now - sampleAfter >= 2000) {
        const average = sampleCount ? sampleTotal / sampleCount : 0;
        const next =
          quality.name === 'high' && average > 20
            ? QUALITY_TIERS.medium
            : quality.name === 'medium' && average > 28
              ? QUALITY_TIERS.low
              : null;
        if (next) {
          setQuality(next);
          onQualityDowngrade?.(next);
        }
        sampleStartedAt = now;
        sampleAfter = now;
        sampleTotal = 0;
        sampleCount = 0;
      }
    }
    ambient.sceneTime += delta * ambient.timeScale;
    const time = ambient.sceneTime;
    const pointerEase = 1 - Math.exp(-delta * 8.5);
    const burnEase =
      1 - Math.exp(-delta * (burnTarget > burnIntensity ? 11 : 2.8));
    burnIntensity = THREE.MathUtils.lerp(burnIntensity, burnTarget, burnEase);
    const heatEase =
      1 - Math.exp(-delta * (headHeatTarget > headHeat ? 22 : 3.2));
    cubeHeat = THREE.MathUtils.lerp(cubeHeat, cubeHeatTarget, heatEase);
    headHeat = THREE.MathUtils.lerp(headHeat, headHeatTarget, heatEase);
    cubeFire.update(
      delta,
      Math.min(1.8, burnIntensity + cubeHeat),
      state.headOpacity < 0.5,
    );
    interaction.yaw = THREE.MathUtils.lerp(
      interaction.yaw,
      interaction.targetYaw,
      pointerEase,
    );
    interaction.pitch = THREE.MathUtils.lerp(
      interaction.pitch,
      interaction.targetPitch,
      pointerEase,
    );
    interaction.parallaxX = THREE.MathUtils.lerp(
      interaction.parallaxX,
      interaction.targetParallaxX,
      pointerEase,
    );
    interaction.parallaxY = THREE.MathUtils.lerp(
      interaction.parallaxY,
      interaction.targetParallaxY,
      pointerEase,
    );
    setParallaxProperty('--parallax-far-x', interaction.parallaxX * -5);
    setParallaxProperty('--parallax-far-y', interaction.parallaxY * -4);
    setParallaxProperty('--parallax-mid-x', interaction.parallaxX * -12);
    setParallaxProperty('--parallax-mid-y', interaction.parallaxY * -9);
    setParallaxProperty('--parallax-near-x', interaction.parallaxX * -24);
    setParallaxProperty('--parallax-near-y', interaction.parallaxY * -17);
    meshUniforms.uTime.value = time;
    meshUniforms.uMorph.value = state.morph;
    meshUniforms.uWarp.value = state.warp + cubeHeat * 0.48;
    meshUniforms.uChaos.value = state.chaos + cubeHeat * 1.15;
    const finalGlitchBoost =
      finalEffects?.update(delta * ambient.timeScale) ?? 0;
    if (
      !reducedMotion &&
      (finalEffects?.canShowcase() ?? false) &&
      showcaseStartedAt < 0 &&
      time >= nextShowcaseAt
    ) {
      showcaseStartedAt = time;
      showcaseDuration = 0.65 + Math.random() * 0.25;
      showcaseAxis = Math.random() < 0.5 ? 'x' : 'y';
    }
    if (showcaseStartedAt >= 0) {
      if (!(finalEffects?.canShowcase() ?? false) || reducedMotion) {
        showcaseStartedAt = -1;
        contentPivot.quaternion.identity();
        nextShowcaseAt = time + 4 + Math.random() * 4;
      } else {
        const progress = THREE.MathUtils.clamp(
          (time - showcaseStartedAt) / showcaseDuration,
          0,
          1,
        );
        const eased =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - (-2 * progress + 2) ** 3 / 2;
        showcaseAxisWorld.set(
          showcaseAxis === 'x' ? 1 : 0,
          showcaseAxis === 'y' ? 1 : 0,
          0,
        );
        inverseModelQuaternion.copy(modelGroup.quaternion).invert();
        showcaseAxisLocal
          .copy(showcaseAxisWorld)
          .applyQuaternion(inverseModelQuaternion)
          .normalize();
        contentPivot.quaternion.setFromAxisAngle(
          showcaseAxisLocal,
          eased * Math.PI * 2,
        );
        if (progress >= 1) {
          showcaseStartedAt = -1;
          contentPivot.quaternion.identity();
          nextShowcaseAt = time + 4 + Math.random() * 4;
        }
      }
    }
    skullVariants.forEach((variant, index) => {
      const basePosition: unknown = variant.userData.idleBasePosition;
      const baseRotation: unknown = variant.userData.idleBaseRotation;
      if (
        !(basePosition instanceof THREE.Vector3) ||
        !(baseRotation instanceof THREE.Euler)
      )
        return;
      const motion =
        (finalEffects?.isActive() ?? false) && !reducedMotion ? 1 : 0;
      const phase = index * 1.73;
      variant.position.set(
        basePosition.x + Math.sin(time * 0.53 + phase) * 0.035 * motion,
        basePosition.y + Math.sin(time * 0.84 + phase) * 0.045 * motion,
        basePosition.z,
      );
      variant.rotation.set(
        baseRotation.x + Math.sin(time * 0.66 + phase) * 0.055 * motion,
        baseRotation.y + Math.sin(time * 0.49 + phase) * 0.085 * motion,
        baseRotation.z + Math.cos(time * 0.58 + phase) * 0.025 * motion,
      );
    });
    const colorPhase =
      state.hueCycleRate > 0.001
        ? Math.sin(
            (time * state.hueCycleRate + state.colorPhase) * Math.PI * 2,
          ) *
            0.5 +
          0.5
        : state.colorPhase;
    const effectiveGlitchStrength = state.glitchStrength + finalGlitchBoost;
    const effectiveGlitchRate = state.glitchRate + finalGlitchBoost * 2.5;
    if (
      effectiveGlitchStrength > 0.01 &&
      effectiveGlitchRate > 0.01 &&
      time >= nextGlitchAt
    ) {
      glitchSeed = Math.random() * 1000;
      glitchIntensity = effectiveGlitchStrength * (0.72 + Math.random() * 0.38);
      glitchEndsAt = time + 0.034 + Math.random() * 0.036;
      const baseInterval = 1 / effectiveGlitchRate;
      nextGlitchAt = time + baseInterval * (0.62 + Math.random() * 1.4);
    }
    if (time >= glitchEndsAt) glitchIntensity = 0;
    if (effectiveGlitchStrength <= 0.01) {
      glitchIntensity = 0;
      nextGlitchAt = time + 0.18;
    }
    meshUniforms.uColorPhase.value = colorPhase;
    meshUniforms.uBurn.value = Math.min(1, burnIntensity * 0.62 + cubeHeat);
    meshUniforms.uGlitch.value = glitchIntensity;
    meshUniforms.uGlitchSeed.value = glitchSeed;
    meshUniforms.uOpacity.value = state.cubeOpacity;
    headUniforms.uTime.value = time;
    headUniforms.uWarp.value = state.warp;
    headUniforms.uHeadWarp.value = state.headWarp + headHeat * 0.12;
    headUniforms.uChaos.value = state.chaos + headHeat * 0.7;
    headUniforms.uColorPhase.value = colorPhase;
    headUniforms.uBurn.value = Math.min(1, burnIntensity * 0.5 + headHeat);
    headUniforms.uGlitch.value = glitchIntensity;
    headUniforms.uGlitchSeed.value = glitchSeed;
    headUniforms.uOpacity.value = state.headOpacity;
    const finalMorph = finalEffects?.getMorphState() ?? emptyMorph;
    headUniforms.uFinalMorph.value = finalMorph.intensity;
    headUniforms.uTear.value = finalMorph.tear;
    cubeMesh.visible = state.cubeOpacity > 0.004;
    if (
      !(finalEffects?.isActive() ?? false) &&
      !(finalEffects?.isFragmented() ?? false)
    ) {
      headVariants.forEach((variant, index) => {
        variant.visible = index === 0 && state.headOpacity > 0.004;
      });
    }
    const sweep = time * (1.15 + state.lightSweep * 1.8);
    meshUniforms.uKeyDirection.value.set(
      state.keyX + Math.sin(sweep) * state.lightSweep * 0.62,
      state.keyY + Math.cos(sweep * 0.73) * state.lightSweep * 0.25,
      state.keyZ,
    );
    headUniforms.uKeyDirection.value.copy(meshUniforms.uKeyDirection.value);
    const restless =
      1 +
      Math.sin(time * 7.1) * state.lightSweep * 0.07 +
      Math.sin(time * 3.7) * state.lightSweep * 0.05;
    meshUniforms.uKeyIntensity.value = state.keyIntensity * restless;
    meshUniforms.uFillIntensity.value = state.fillIntensity;
    meshUniforms.uRimIntensity.value = state.rimIntensity;
    meshUniforms.uSpecular.value = state.specular;
    headUniforms.uKeyIntensity.value = state.keyIntensity * restless;
    headUniforms.uFillIntensity.value = state.fillIntensity;
    headUniforms.uRimIntensity.value = state.rimIntensity;
    headUniforms.uSpecular.value = state.specular;
    skullVariants.forEach((variant) => {
      getVariantMaterials(variant).forEach((material) => {
        const uniforms = material.uniforms;
        uniforms.uTime.value = reducedMotion ? 0 : time;
        uniforms.uWarp.value = reducedMotion ? 0 : 0.055;
        uniforms.uHeat.value = reducedMotion ? 0 : headHeat;
        uniforms.uGlitch.value = reducedMotion ? 0 : glitchIntensity;
        uniforms.uGlitchSeed.value = glitchSeed;
        uniforms.uOpacity.value = state.headOpacity;
        uniforms.uFinalMorph.value = finalMorph.intensity;
        uniforms.uTear.value = finalMorph.tear;
        const keyDirection = uniforms.uKeyDirection.value as unknown;
        if (keyDirection instanceof THREE.Vector3)
          keyDirection.copy(meshUniforms.uKeyDirection.value);
        uniforms.uKeyIntensity.value = state.keyIntensity * restless;
        uniforms.uFillIntensity.value = state.fillIntensity;
        uniforms.uRimIntensity.value = state.rimIntensity;
        uniforms.uSpecular.value = state.specular;
      });
    });
    sludgeUniforms.uTime.value = time;
    sludgeUniforms.uIntensity.value = state.sludge;
    spinX += delta * state.rotationRate * (0.43 + cubeHeat * 1.6);
    spinY += delta * state.rotationRate * (1 + cubeHeat * 3.8);
    spinZ += delta * state.rotationRate * (0.16 + cubeHeat * 1.25);
    modelGroup.rotation.set(
      state.baseRotX +
        spinX * state.spinMix +
        Math.sin(time * 0.41) * state.idlePitch +
        interaction.pitch,
      state.baseRotY +
        spinY * state.spinMix +
        Math.sin(time * 0.58) * state.idleYaw +
        interaction.yaw,
      state.baseRotZ +
        spinZ * state.spinMix +
        Math.cos(time * 0.33) * state.idleRoll,
    );
    const heatShake = cubeHeat * 0.16 + headHeat * 0.13;
    modelGroup.position.set(
      Math.sin(time * 31) * (state.shake + heatShake),
      Math.cos(time * 27) * (state.shake + heatShake),
      Math.sin(time * 23) * (state.shake + heatShake) * 0.55,
    );
    camera.position.set(
      Math.sin(time * 0.19) * state.cameraDrift,
      Math.cos(time * 0.16) * state.cameraDrift * 0.55,
      state.cameraZ,
    );
    if (Math.abs(renderedFov - state.cameraFov) > 0.001) {
      renderedFov = state.cameraFov;
      camera.fov = renderedFov;
      camera.updateProjectionMatrix();
    }
    const basePerspective = Math.tan(THREE.MathUtils.degToRad(38 / 2)) * 7;
    const currentPerspective =
      Math.tan(THREE.MathUtils.degToRad(state.cameraFov / 2)) * state.cameraZ;
    modelGroup.scale.setScalar(
      ((viewportScale * currentPerspective) / basePerspective) *
        state.modelScale,
    );
    effectsGroup.position.copy(modelGroup.position);
    effectsGroup.scale.copy(modelGroup.scale);
    sludgePlane.position.set(
      interaction.parallaxX * -0.08,
      interaction.parallaxY * 0.06,
      -3.5 - state.fieldForm * 0.28,
    );
    depthField.setParallax(interaction.parallaxX, interaction.parallaxY);
    depthField.update(time);
    renderer.render(scene, camera);
  });
  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        reducedMotion ? 1 : quality.pixelRatioCap,
      ),
    );
    renderer.setSize(width, height, false);
    viewportScale = width < 720 ? 0.82 : 1;
    finalEffects?.resize();
    cubeFire.resize();
    sampleStartedAt = performance.now();
    sampleAfter = sampleStartedAt + 1000;
    sampleTotal = 0;
    sampleCount = 0;
  };
  resize();
  const onVisibilityChange = () => {
    visible = !document.hidden;
    if (visible) timer.reset();
    if (visible) {
      sampleStartedAt = performance.now();
      sampleAfter = sampleStartedAt + 1000;
      sampleTotal = 0;
      sampleCount = 0;
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  const setPointer = (
    clientX: number,
    clientY: number,
    reducedMotion = false,
  ) => {
    const normalizedX = THREE.MathUtils.clamp(
      (clientX / window.innerWidth) * 2 - 1,
      -1,
      1,
    );
    const normalizedY = THREE.MathUtils.clamp(
      (clientY / window.innerHeight) * 2 - 1,
      -1,
      1,
    );
    interaction.targetYaw = normalizedX * (reducedMotion ? 0.18 : 0.44);
    interaction.targetPitch = normalizedY * (reducedMotion ? 0.1 : 0.26);
    interaction.targetParallaxX = reducedMotion ? 0 : normalizedX;
    interaction.targetParallaxY = reducedMotion ? 0 : normalizedY;
  };
  const resetPointer = () => {
    interaction.targetYaw = 0;
    interaction.targetPitch = 0;
    interaction.targetParallaxX = 0;
    interaction.targetParallaxY = 0;
  };
  const burnRaycaster = new THREE.Raycaster();
  const burnPointer = new THREE.Vector2();
  const setBurnPoint = (clientX: number, clientY: number) => {
    burnPointer.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    burnRaycaster.setFromCamera(burnPointer, camera);
    cubeHeatTarget = burnRaycaster.intersectObject(cubeMesh, false).length
      ? 1
      : 0;
    headHeatTarget = burnRaycaster.intersectObjects(headVariants, true).length
      ? 1
      : 0;
  };
  const setSlowMotion = (active: boolean) => {
    const cssAnimations = root.getAnimations({ subtree: true });
    const videos = Array.from(
      root.querySelectorAll<HTMLVideoElement>('.ambient-video'),
    );
    gsap.killTweensOf(ambient, 'timeScale');
    gsap.to(ambient, {
      timeScale: active ? 0.32 : 1,
      duration: active ? 0.18 : 0.5,
      ease: active ? 'power2.out' : 'power2.inOut',
      overwrite: true,
      onUpdate: () => {
        cssAnimations.forEach((animation) =>
          animation.updatePlaybackRate?.(ambient.timeScale),
        );
        videos.forEach((video) => {
          video.playbackRate = ambient.timeScale;
        });
        ambientTimelines.forEach((timeline) => {
          timeline.timeScale(ambient.timeScale);
        });
      },
    });
  };
  const setBurning = (active: boolean, pressure = 0.7) => {
    burnTarget = active ? 1 : 0;
    if (!active) {
      cubeHeatTarget = 0;
      headHeatTarget = 0;
    }
    cubeFire.setBurning(active, pressure);
  };
  const setChapter = (index: number) => {
    finaleActive = index === 3;
    finalEffects?.setActive(finaleActive);
    showcaseStartedAt = -1;
    contentPivot.quaternion.identity();
    nextShowcaseAt = ambient.sceneTime + 4 + Math.random() * 4;
  };
  const setReducedMotion = (active: boolean) => {
    reducedMotion = active;
    if (active) {
      showcaseStartedAt = -1;
      contentPivot.quaternion.identity();
    }
    finalEffects?.setReducedMotion(active);
    cubeFire.setReducedMotion(active);
    resize();
  };
  const setQuality = (next: QualityTier) => {
    quality = next;
    root.dataset.quality = next.name;
    cubeFire.setQuality(next);
    depthField.setQuality(next);
    finalEffects?.setQuality(next);
    resize();
  };
  const destroy = () => {
    destroyed = true;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    gsap.killTweensOf(interaction);
    gsap.killTweensOf(ambient);
    renderer.setAnimationLoop(null);
    finalEffects?.dispose();
    cubeFire.dispose();
    cubeMesh.geometry.dispose();
    meshMaterial.dispose();
    headMesh.geometry.dispose();
    headMaterial.dispose();
    sludgePlane.geometry.dispose();
    sludgeMaterial.dispose();
    depthField.dispose();
    skullVariants.forEach((variant) => {
      variant.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child as THREE.Mesh<THREE.BufferGeometry>).geometry.dispose();
        }
      });
      getVariantMaterials(variant).forEach((material) => material.dispose());
    });
    skullTexture?.dispose();
    meshUniforms.uTexture.value.dispose();
    timer.dispose();
    renderer.dispose();
  };
  return {
    resize,
    destroy,
    setPointer,
    resetPointer,
    setSlowMotion,
    setBurning,
    setBurnPoint,
    setChapter,
    setReducedMotion,
    setQuality,
    preloadFinale,
    headAvailable: isHeadSourceAvailable(),
  };
};
