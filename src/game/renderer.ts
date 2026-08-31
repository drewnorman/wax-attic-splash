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
  loadMorphGeometry,
  loadHeadGeometry,
  markHeadSourceFailed,
} from './head-geometry';
import { createDepthField } from './depth-field';
import { createFinalSceneEffects } from './finale-effects';

export const createRenderer = async (
  canvas: HTMLCanvasElement,
  state: ChapterState,
  root: HTMLElement,
  ambient: AmbientState,
  ambientTimelines: Timeline[],
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
    uExpression: { value: new THREE.Vector4() },
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
  const modelGroup = new THREE.Group();
  modelGroup.rotation.set(-0.18, -0.38, 0.04);
  modelGroup.add(cubeMesh, headMesh);
  scene.add(modelGroup);
  const finalEffects = createFinalSceneEffects(modelGroup, headMesh, root);
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
  try {
    const texture = await new THREE.TextureLoader().loadAsync(
      '/images/wax-texture.png',
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.MirroredRepeatWrapping;
    texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    meshUniforms.uTexture.value = texture;
    headUniforms.uTexture.value = texture;
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
  let glitchIntensity = 0;
  let glitchSeed = 0;
  let glitchEndsAt = 0;
  let nextGlitchAt = 0;
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    timer.update();
    const delta = Math.min(timer.getDelta(), 0.05);
    ambient.sceneTime += delta * ambient.timeScale;
    const time = ambient.sceneTime;
    const pointerEase = 1 - Math.exp(-delta * 8.5);
    const burnEase =
      1 - Math.exp(-delta * (burnTarget > burnIntensity ? 11 : 2.8));
    burnIntensity = THREE.MathUtils.lerp(burnIntensity, burnTarget, burnEase);
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
    root.style.setProperty(
      '--parallax-far-x',
      `${interaction.parallaxX * -5}px`,
    );
    root.style.setProperty(
      '--parallax-far-y',
      `${interaction.parallaxY * -4}px`,
    );
    root.style.setProperty(
      '--parallax-mid-x',
      `${interaction.parallaxX * -12}px`,
    );
    root.style.setProperty(
      '--parallax-mid-y',
      `${interaction.parallaxY * -9}px`,
    );
    root.style.setProperty(
      '--parallax-near-x',
      `${interaction.parallaxX * -24}px`,
    );
    root.style.setProperty(
      '--parallax-near-y',
      `${interaction.parallaxY * -17}px`,
    );
    meshUniforms.uTime.value = time;
    meshUniforms.uMorph.value = state.morph;
    meshUniforms.uWarp.value = state.warp;
    meshUniforms.uChaos.value = state.chaos;
    const finalGlitchBoost = finalEffects.update(delta * ambient.timeScale);
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
    meshUniforms.uBurn.value = burnIntensity;
    meshUniforms.uGlitch.value = glitchIntensity;
    meshUniforms.uGlitchSeed.value = glitchSeed;
    meshUniforms.uOpacity.value = state.cubeOpacity;
    headUniforms.uTime.value = time;
    headUniforms.uWarp.value = state.warp;
    headUniforms.uHeadWarp.value = state.headWarp;
    headUniforms.uChaos.value = state.chaos;
    headUniforms.uColorPhase.value = colorPhase;
    headUniforms.uBurn.value = burnIntensity;
    headUniforms.uGlitch.value = glitchIntensity;
    headUniforms.uGlitchSeed.value = glitchSeed;
    headUniforms.uOpacity.value = state.headOpacity;
    cubeMesh.visible = state.cubeOpacity > 0.004;
    if (!finalEffects.isFragmented())
      headMesh.visible = state.headOpacity > 0.004;
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
    sludgeUniforms.uTime.value = time;
    sludgeUniforms.uIntensity.value = state.sludge;
    spinX += delta * state.rotationRate * 0.43;
    spinY += delta * state.rotationRate;
    spinZ += delta * state.rotationRate * 0.16;
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
    modelGroup.position.set(
      Math.sin(time * 21) * state.shake,
      Math.cos(time * 17) * state.shake,
      Math.sin(time * 13) * state.shake * 0.55,
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
      Math.min(window.devicePixelRatio || 1, width < 720 ? 1.5 : 2),
    );
    renderer.setSize(width, height, false);
    viewportScale = width < 720 ? 0.82 : 1;
    finalEffects.resize();
  };
  resize();
  const onVisibilityChange = () => {
    visible = !document.hidden;
    if (visible) timer.reset();
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
    interaction.targetYaw = -normalizedX * (reducedMotion ? 0.18 : 0.44);
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
  const setSlowMotion = (active: boolean) => {
    const cssAnimations = root.getAnimations({ subtree: true });
    const videos = Array.from(
      root.querySelectorAll<HTMLVideoElement>('.ambient-video'),
    );
    gsap.killTweensOf(ambient, 'timeScale');
    gsap.to(ambient, {
      timeScale: active ? 0.15 : 1,
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
  const setBurning = (active: boolean) => {
    burnTarget = active ? 1 : 0;
  };
  const setChapter = (index: number) => finalEffects.setActive(index === 3);
  const setReducedMotion = (active: boolean) =>
    finalEffects.setReducedMotion(active);
  const destroy = () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    gsap.killTweensOf(interaction);
    gsap.killTweensOf(ambient);
    renderer.setAnimationLoop(null);
    finalEffects.dispose();
    cubeMesh.geometry.dispose();
    meshMaterial.dispose();
    headMesh.geometry.dispose();
    headMaterial.dispose();
    sludgePlane.geometry.dispose();
    sludgeMaterial.dispose();
    depthField.dispose();
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
    setChapter,
    setReducedMotion,
    headAvailable: isHeadSourceAvailable(),
  };
};
