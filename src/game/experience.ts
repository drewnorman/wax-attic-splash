import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import createBootLoader from './loader';
import { CHAPTERS } from './state';
import type { Point, TouchOrigin } from './state';
import { createOverlayParticles, createBurnLayer } from './canvas-effects';
import { createRenderer } from './renderer';
import { createTextFlicker, createSceneStutter } from './dom-effects';

gsap.registerPlugin(Observer);

const TRANSITION_DURATION = 1.3;

const MOMENTUM_COOLDOWN = 180;

const createExperience = async () => {
  const root = document.getElementById('experience');
  const canvas = document.getElementById('scene');
  const overlayCanvas = document.getElementById('overlayParticles');
  const burnCanvas = document.getElementById('burnCanvas');
  const smokeCanvas = document.getElementById('smokeCanvas');
  if (!(root instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement))
    return null;
  const bootLoader = createBootLoader(root);
  const preloadPromise = bootLoader.preload();
  const chapters = Array.from(root.querySelectorAll<HTMLElement>('.chapter'));
  const progressMarks = Array.from(
    root.querySelectorAll<HTMLButtonElement>('.progress__mark'),
  );
  const scrollCue = document.getElementById('scrollCue');
  const state = { ...CHAPTERS[0] };
  const ambient = { timeScale: 1, sceneTime: 0 };
  const ambientTimelines = createTextFlicker(chapters);
  const overlayController = createOverlayParticles(
    overlayCanvas,
    state,
    ambient,
  );
  const burnController = createBurnLayer(burnCanvas, smokeCanvas);
  const stutterController = createSceneStutter(root);
  const media = gsap.matchMedia();
  let reducedMotion = false;
  let activeIndex = 0;
  let transitioning = false;
  let inspectingPointerId: number | null = null;
  let touchHoldTimer: number | undefined;
  let touchOrigin: TouchOrigin | null = null;
  let lastBurnPoint: Point | null = null;
  let cooldownTimer: number | undefined;
  let rendererController: Awaited<ReturnType<typeof createRenderer>> | null =
    null;
  try {
    rendererController = await createRenderer(
      canvas,
      state,
      root,
      ambient,
      ambientTimelines,
    );
    bootLoader.settle('webgl', true);
    bootLoader.settle('head', rendererController.headAvailable);
  } catch (error) {
    bootLoader.settle('webgl', false);
    root.classList.add('is-fallback');
    console.warn(
      'WebGL experience unavailable; using the text fallback.',
      error,
    );
  }

  const setAccessibilityState = (index: number) => {
    chapters.forEach((chapter, chapterIndex) => {
      const active = chapterIndex === index;
      chapter.classList.toggle('is-active', active);
      chapter.setAttribute('aria-hidden', String(!active));
      chapter.inert = !active;
    });
    progressMarks.forEach((mark, markIndex) => {
      const active = markIndex === index;
      mark.classList.toggle('is-active', active);
      if (active) mark.setAttribute('aria-current', 'step');
      else mark.removeAttribute('aria-current');
    });
  };

  const goTo = (nextIndex: number) => {
    if (
      transitioning ||
      nextIndex === activeIndex ||
      nextIndex < 0 ||
      nextIndex >= chapters.length
    )
      return;
    transitioning = true;
    observer?.disable();
    window.clearTimeout(cooldownTimer);
    const previous = chapters[activeIndex];
    const next = chapters[nextIndex];
    const direction = nextIndex > activeIndex ? 1 : -1;
    const duration = reducedMotion ? 0.24 : TRANSITION_DURATION;
    const targetState = CHAPTERS[nextIndex];
    root.dataset.chapter = String(nextIndex);
    rendererController?.setChapter(nextIndex);
    next.classList.add('is-active');
    next.removeAttribute('inert');
    next.setAttribute('aria-hidden', 'false');
    gsap.set(next, {
      autoAlpha: reducedMotion ? 0 : 1,
      yPercent: reducedMotion ? 0 : direction * 100,
    });
    const timeline = gsap.timeline({
      defaults: {
        duration,
        ease: reducedMotion ? 'power1.out' : 'power3.inOut',
      },
      onComplete: () => {
        activeIndex = nextIndex;
        gsap.set(previous, { autoAlpha: 0, yPercent: 0 });
        setAccessibilityState(activeIndex);
        transitioning = false;
        cooldownTimer = window.setTimeout(
          () => observer?.enable(),
          MOMENTUM_COOLDOWN,
        );
      },
    });
    timeline.to(
      previous,
      { autoAlpha: 0, yPercent: reducedMotion ? 0 : direction * -100 },
      0,
    );
    timeline.to(next, { autoAlpha: 1, yPercent: 0 }, 0);
    timeline.to(
      state,
      {
        morph: targetState.morph,
        cubeOpacity: targetState.cubeOpacity,
        headOpacity: targetState.headOpacity,
        modelScale: targetState.modelScale,
        warp: reducedMotion
          ? Math.min(targetState.warp, 0.07)
          : targetState.warp,
        headWarp: reducedMotion
          ? Math.min(targetState.headWarp, 0.006)
          : targetState.headWarp,
        chaos: reducedMotion
          ? Math.min(targetState.chaos, 0.08)
          : targetState.chaos,
        shake: reducedMotion ? 0 : targetState.shake,
        rotationRate: reducedMotion
          ? Math.min(targetState.rotationRate, 0.16)
          : targetState.rotationRate,
        spinMix: targetState.spinMix,
        colorPhase: targetState.colorPhase,
        hueCycleRate: reducedMotion ? 0 : targetState.hueCycleRate,
        glitchStrength: reducedMotion ? 0 : targetState.glitchStrength,
        glitchRate: reducedMotion ? 0 : targetState.glitchRate,
        sludge: reducedMotion
          ? Math.min(targetState.sludge, 0.18)
          : targetState.sludge,
        fieldForm: targetState.fieldForm,
        fieldOpacity: targetState.fieldOpacity,
        fieldMotion: reducedMotion ? 0 : targetState.fieldMotion,
        cameraZ: targetState.cameraZ,
        cameraFov: targetState.cameraFov,
        cameraDrift: reducedMotion ? 0 : targetState.cameraDrift,
        baseRotX: targetState.baseRotX,
        baseRotY: targetState.baseRotY,
        baseRotZ: targetState.baseRotZ,
        idlePitch: reducedMotion
          ? Math.min(targetState.idlePitch, 0.012)
          : targetState.idlePitch,
        idleYaw: reducedMotion
          ? Math.min(targetState.idleYaw, 0.025)
          : targetState.idleYaw,
        idleRoll: reducedMotion
          ? Math.min(targetState.idleRoll, 0.008)
          : targetState.idleRoll,
        keyX: targetState.keyX,
        keyY: targetState.keyY,
        keyZ: targetState.keyZ,
        keyIntensity: targetState.keyIntensity,
        fillIntensity: targetState.fillIntensity,
        rimIntensity: targetState.rimIntensity,
        lightSweep: reducedMotion ? 0 : targetState.lightSweep,
        specular: targetState.specular,
      },
      0,
    );
    timeline.to(
      root,
      {
        '--glow-opacity': reducedMotion
          ? Math.min(targetState.glowOpacity, 0.38)
          : targetState.glowOpacity,
        '--glow-scale': reducedMotion ? 1 : targetState.glowScale,
        '--grain-opacity': targetState.grainOpacity,
        '--backdrop-hue': targetState.hue,
        '--story-progress': nextIndex / (chapters.length - 1),
      },
      0,
    );
    const finalLink = next.querySelector('.shop-link');
    if (finalLink)
      timeline.fromTo(
        finalLink,
        { autoAlpha: 0, y: reducedMotion ? 0 : 16 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reducedMotion ? 0.18 : 0.42,
          ease: 'power2.out',
        },
        reducedMotion ? 0.08 : duration * 0.74,
      );
  };

  const observer = Observer.create({
    target: root,
    type: 'wheel,touch',
    tolerance: 24,
    dragMinimum: 16,
    lockAxis: true,
    preventDefault: true,
    allowClicks: true,
    ignore: '.observer-ignore',
    onDown: () => goTo(activeIndex + 1),
    onUp: () => goTo(activeIndex - 1),
  });
  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    Boolean(target.closest('a, button, input, select, textarea'));
  const burnAt = (clientX: number, clientY: number, pressure = 0.7) => {
    if (
      lastBurnPoint &&
      Math.hypot(clientX - lastBurnPoint.x, clientY - lastBurnPoint.y) < 8
    )
      return;
    lastBurnPoint = { x: clientX, y: clientY };
    burnController.add(clientX, clientY, pressure || 0.7);
  };
  const onPointerMove = (event: PointerEvent) => {
    root.style.setProperty('--cursor-x', `${event.clientX}px`);
    root.style.setProperty('--cursor-y', `${event.clientY}px`);
    root.classList.toggle(
      'is-cursor-interactive',
      isInteractiveTarget(event.target),
    );
    if (event.pointerType !== 'touch') root.classList.add('is-cursor-visible');
    if (event.pointerType === 'touch') {
      if (
        touchOrigin &&
        inspectingPointerId === null &&
        Math.hypot(
          event.clientX - touchOrigin.x,
          event.clientY - touchOrigin.y,
        ) > 12
      ) {
        window.clearTimeout(touchHoldTimer);
        touchOrigin = null;
      }
      if (inspectingPointerId === event.pointerId) {
        event.preventDefault();
        rendererController?.setPointer(
          event.clientX,
          event.clientY,
          reducedMotion,
        );
        burnAt(event.clientX, event.clientY, event.pressure);
      }
      return;
    }
    rendererController?.setPointer(event.clientX, event.clientY, reducedMotion);
    if (inspectingPointerId === event.pointerId)
      burnAt(event.clientX, event.clientY, event.pressure);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (isInteractiveTarget(event.target)) return;
    if (event.pointerType === 'touch') {
      touchOrigin = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
      window.clearTimeout(touchHoldTimer);
      touchHoldTimer = window.setTimeout(() => {
        if (!touchOrigin || touchOrigin.pointerId !== event.pointerId) return;
        inspectingPointerId = event.pointerId;
        observer?.disable();
        root.setPointerCapture?.(event.pointerId);
        rendererController?.setPointer(
          touchOrigin.x,
          touchOrigin.y,
          reducedMotion,
        );
        rendererController?.setSlowMotion(true);
        rendererController?.setBurning(true);
        root.classList.add('is-inspecting', 'is-burning');
        burnAt(touchOrigin.x, touchOrigin.y, event.pressure);
      }, 440);
      return;
    }
    if (event.button !== 0) return;
    inspectingPointerId = event.pointerId;
    root.setPointerCapture?.(event.pointerId);
    rendererController?.setPointer(event.clientX, event.clientY, reducedMotion);
    rendererController?.setSlowMotion(true);
    rendererController?.setBurning(true);
    root.classList.add('is-inspecting', 'is-burning');
    burnAt(event.clientX, event.clientY, event.pressure);
  };
  const releaseInspection = (event: PointerEvent) => {
    window.clearTimeout(touchHoldTimer);
    touchOrigin = null;
    if (
      inspectingPointerId === null ||
      (event && event.pointerId !== inspectingPointerId)
    )
      return;
    if (event && root.hasPointerCapture?.(event.pointerId))
      root.releasePointerCapture(event.pointerId);
    inspectingPointerId = null;
    lastBurnPoint = null;
    rendererController?.setSlowMotion(false);
    rendererController?.setBurning(false);
    root.classList.remove('is-inspecting', 'is-burning');
    if (!transitioning)
      cooldownTimer = window.setTimeout(
        () => observer?.enable(),
        MOMENTUM_COOLDOWN,
      );
  };
  const onPointerLeave = () => {
    root.classList.remove('is-cursor-visible');
    if (inspectingPointerId === null) rendererController?.resetPointer();
  };
  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') root.classList.add('is-cursor-visible');
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('a, button, input, select, textarea')
    )
      return;
    if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault();
      goTo(activeIndex + 1);
    } else if (['ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      goTo(activeIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo(chapters.length - 1);
    }
  };
  const onResize = () => {
    rendererController?.resize();
    overlayController.resize();
    burnController.resize();
  };
  const onScrollCueClick = () => goTo(1);
  const onProgressClick = (event: MouseEvent) => {
    if (event.currentTarget instanceof HTMLElement) {
      goTo(Number(event.currentTarget.dataset.target));
    }
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerup', releaseInspection);
  root.addEventListener('pointercancel', releaseInspection);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('pointerenter', onPointerEnter);
  scrollCue?.addEventListener('click', onScrollCueClick);
  progressMarks.forEach((mark) =>
    mark.addEventListener('click', onProgressClick),
  );
  media.add('(prefers-reduced-motion: reduce)', () => {
    reducedMotion = true;
    rendererController?.setReducedMotion(true);
    overlayController.setReducedMotion(true);
    burnController.setReducedMotion(true);
    stutterController.setReducedMotion(true);
    ambientTimelines.forEach((timeline) => {
      timeline.pause(0);
    });
    gsap.set(state, {
      warp: Math.min(state.warp, 0.07),
      headWarp: Math.min(state.headWarp, 0.006),
      chaos: Math.min(state.chaos, 0.08),
      shake: 0,
      rotationRate: Math.min(state.rotationRate, 0.16),
      hueCycleRate: 0,
      glitchStrength: 0,
      glitchRate: 0,
      sludge: Math.min(state.sludge, 0.18),
      fieldMotion: 0,
      cameraDrift: 0,
      lightSweep: 0,
      idlePitch: Math.min(state.idlePitch, 0.012),
      idleYaw: Math.min(state.idleYaw, 0.025),
      idleRoll: Math.min(state.idleRoll, 0.008),
    });
    return () => {
      reducedMotion = false;
      rendererController?.setReducedMotion(false);
      overlayController.setReducedMotion(false);
      burnController.setReducedMotion(false);
      stutterController.setReducedMotion(false);
      ambientTimelines.forEach((timeline) => {
        timeline.play();
      });
      gsap.set(state, CHAPTERS[activeIndex]);
    };
  });
  await preloadPromise;
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() => resolve()),
  );
  await bootLoader.finish();
  const destroy = () => {
    window.clearTimeout(cooldownTimer);
    window.clearTimeout(touchHoldTimer);
    observer.kill();
    media.revert();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointerup', releaseInspection);
    root.removeEventListener('pointercancel', releaseInspection);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('pointerenter', onPointerEnter);
    scrollCue?.removeEventListener('click', onScrollCueClick);
    progressMarks.forEach((mark) =>
      mark.removeEventListener('click', onProgressClick),
    );
    ambientTimelines.forEach((timeline) => {
      timeline.kill();
    });
    overlayController.destroy();
    burnController.destroy();
    stutterController.destroy();
    rendererController?.destroy();
  };
  return { goTo, resize: onResize, destroy };
};

export default createExperience;
