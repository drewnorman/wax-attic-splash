import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import createBootLoader from './loader';
import { CHAPTERS } from './state';
import type { Point, TouchOrigin } from './state';
import { createOverlayParticles, createBurnLayer } from './canvas-effects';
import { createRenderer } from './renderer';
import { createChapterAssetLoader } from './chapter-assets';
import { QUALITY_TIERS, selectInitialQuality } from './quality';
import {
  createTextFlicker,
  createTitleMutations,
  createSceneStutter,
  createShopReveal,
} from './dom-effects';

gsap.registerPlugin(Observer);

const TRANSITION_DURATION = 1.3;

const MOMENTUM_COOLDOWN = 180;
const TOUCH_DIRECTION_THRESHOLD = 12;

const createExperience = async () => {
  const root = document.getElementById('experience');
  const canvas = document.getElementById('scene');
  const overlayCanvas = document.getElementById('overlayParticles');
  const burnCanvas = document.getElementById('burnCanvas');
  const smokeCanvas = document.getElementById('smokeCanvas');
  if (!(root instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement))
    return null;
  const bootLoader = createBootLoader();
  const chapterAssets = createChapterAssetLoader(root);
  const preloadPromise = Promise.all([
    bootLoader.preload(),
    chapterAssets.preloadCritical(),
  ]);
  const chapters = Array.from(root.querySelectorAll<HTMLElement>('.chapter'));
  const progressNav = root.querySelector('.progress');
  const progressMarks = Array.from(
    root.querySelectorAll<HTMLButtonElement>('.progress__mark'),
  );
  const shopReveal = createShopReveal(
    root.querySelector<HTMLAnchorElement>('.shop-link'),
  );
  const scrollCue = document.getElementById('scrollCue');
  const state = { ...CHAPTERS[0] };
  const ambient = { timeScale: 1, sceneTime: 0 };
  const ambientTimelines = createTextFlicker(chapters);
  const titleMutations = createTitleMutations(chapters);
  const overlayController = createOverlayParticles(
    overlayCanvas,
    state,
    ambient,
  );
  const burnController = createBurnLayer(burnCanvas, smokeCanvas, root);
  const stutterController = createSceneStutter(root);
  const media = gsap.matchMedia();
  let reducedMotion = false;
  let quality = selectInitialQuality(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  root.dataset.quality = quality.name;
  let activeIndex = 0;
  let transitioning = false;
  let inspectingPointerId: number | null = null;
  let touchOrigin: TouchOrigin | null = null;
  let touchIntent: 'pending' | 'navigation' | 'burning' | null = null;
  let lastBurnPoint: Point | null = null;
  let cooldownTimer: number | undefined;
  let pointerFrame = 0;
  let latestPointer: PointerEvent | null = null;
  const burnReactive = Array.from(
    root.querySelectorAll<HTMLElement>('.burn-reactive'),
  );
  const burnReleaseTimers = new Map<HTMLElement, number>();
  let rendererController: Awaited<ReturnType<typeof createRenderer>> | null =
    null;
  const observers: Observer[] = [];
  const disableObservers = () => {
    observers.forEach((observer) => observer.disable());
  };
  const enableObservers = () => {
    observers.forEach((observer) => observer.enable());
  };
  try {
    rendererController = await createRenderer(
      canvas,
      state,
      root,
      ambient,
      ambientTimelines,
      (nextQuality) => {
        quality = nextQuality;
        root.dataset.quality = nextQuality.name;
        overlayController.setQuality(nextQuality);
        burnController.setQuality(nextQuality);
      },
    );
    rendererController.setQuality(quality);
    overlayController.setQuality(quality);
    burnController.setQuality(quality);
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
    if (progressNav instanceof HTMLElement) {
      const hidden = index === 0;
      progressNav.setAttribute('aria-hidden', String(hidden));
      progressNav.inert = hidden;
    }
  };

  const clearBurnHits = () => {
    burnReleaseTimers.forEach((timer) => window.clearTimeout(timer));
    burnReleaseTimers.clear();
    burnReactive.forEach((element) => element.classList.remove('is-burn-hit'));
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
    clearBurnHits();
    shopReveal.reset();
    disableObservers();
    window.clearTimeout(cooldownTimer);
    const previous = chapters[activeIndex];
    const next = chapters[nextIndex];
    const duration = reducedMotion ? 0.24 : TRANSITION_DURATION;
    const targetState = CHAPTERS[nextIndex];
    root.dataset.chapter = String(nextIndex);
    if (nextIndex > 0 && progressNav instanceof HTMLElement) {
      progressNav.removeAttribute('inert');
      progressNav.setAttribute('aria-hidden', 'false');
    }
    rendererController?.setChapter(nextIndex);
    if (nextIndex >= 1) void rendererController?.preloadFinale();
    void chapterAssets.preloadChapter(
      Math.min(chapters.length - 1, nextIndex + 1),
    );
    overlayController.invalidate();
    next.classList.add('is-active');
    next.removeAttribute('inert');
    next.setAttribute('aria-hidden', 'false');
    const previousCopy =
      activeIndex === 0
        ? previous.querySelector('.scroll-cue')
        : previous.querySelector(
            '.chapter__title-block, .chapter__final-copy, h2',
          );
    const nextCopy =
      nextIndex === 0
        ? next.querySelector('.scroll-cue')
        : next.querySelector('.chapter__title-block, .chapter__final-copy, h2');
    gsap.set(next, { autoAlpha: 1, yPercent: 0 });
    if (nextCopy) {
      if (nextIndex === 0)
        gsap.set(nextCopy, {
          autoAlpha: reducedMotion ? 1 : 0,
          y: reducedMotion ? 0 : 18,
          scale: reducedMotion ? 1 : 0.9,
          clipPath: reducedMotion ? 'none' : 'inset(0 100% 0 0)',
        });
      else
        gsap.set(nextCopy, {
          autoAlpha: reducedMotion ? 1 : 0,
          xPercent: reducedMotion ? 0 : -115,
          y: 0,
          scale: 1,
          clipPath: 'none',
        });
    }
    const timeline = gsap.timeline({
      defaults: {
        duration,
        ease: reducedMotion ? 'power1.out' : 'power3.inOut',
      },
      onComplete: () => {
        activeIndex = nextIndex;
        gsap.set(previous, { autoAlpha: 0, yPercent: 0 });
        if (previousCopy)
          gsap.set(previousCopy, {
            clearProps: 'opacity,visibility,xPercent,y,scale,clipPath',
          });
        if (nextCopy)
          gsap.set(nextCopy, {
            clearProps: 'opacity,visibility,xPercent,y,scale,clipPath',
          });
        setAccessibilityState(activeIndex);
        transitioning = false;
        if (activeIndex === 3) shopReveal.activate();
        cooldownTimer = window.setTimeout(enableObservers, MOMENTUM_COOLDOWN);
      },
    });
    if (previousCopy) {
      if (activeIndex === 0)
        timeline.to(
          previousCopy,
          {
            autoAlpha: 0,
            y: reducedMotion ? 0 : 16,
            scale: reducedMotion ? 1 : 0.86,
            clipPath: reducedMotion ? 'none' : 'inset(0 0 0 100%)',
            duration: reducedMotion ? 0.12 : 0.42,
          },
          0,
        );
      else
        timeline.to(
          previousCopy,
          {
            autoAlpha: 0,
            xPercent: reducedMotion ? 0 : -115,
            duration: reducedMotion ? 0.12 : 0.48,
            ease: reducedMotion ? 'power1.out' : 'power3.in',
          },
          0,
        );
    }
    if (nextCopy) {
      if (nextIndex === 0)
        timeline.to(
          nextCopy,
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            clipPath: 'inset(0 0% 0 0)',
            duration: reducedMotion ? 0.12 : 0.58,
          },
          reducedMotion ? 0.12 : 0.5,
        );
      else
        timeline.to(
          nextCopy,
          {
            autoAlpha: 1,
            xPercent: 0,
            duration: reducedMotion ? 0.12 : 0.6,
            ease: reducedMotion ? 'power1.out' : 'power3.out',
          },
          reducedMotion ? 0.12 : 0.5,
        );
    }
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
      },
      0,
    );
    const progress = nextIndex === 0 ? 0 : nextIndex / (chapters.length - 1);
    timeline.to(
      root,
      {
        '--story-progress': progress,
        '--story-clip': `${progress * 100}%`,
        '--story-meniscus': `${progress * 100}%`,
        duration: reducedMotion ? 0.12 : 0.72,
        ease: 'power2.inOut',
      },
      nextIndex > 0 && activeIndex === 0 ? 0.28 : 0,
    );
  };

  const observerOptions = {
    target: root,
    tolerance: 24,
    dragMinimum: 16,
    lockAxis: true,
    preventDefault: true,
    allowClicks: true,
    ignore: '.observer-ignore',
  } satisfies Observer.ObserverVars;
  observers.push(
    Observer.create({
      ...observerOptions,
      type: 'wheel',
      onDown: () => goTo(activeIndex + 1),
      onUp: () => goTo(activeIndex - 1),
    }),
    Observer.create({
      ...observerOptions,
      type: 'touch',
      onUp: () => goTo(activeIndex + 1),
      onDown: () => goTo(activeIndex - 1),
    }),
  );
  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    Boolean(target.closest('a, button, input, select, textarea'));
  const burnAt = (clientX: number, clientY: number, pressure = 0.7) => {
    if (
      lastBurnPoint &&
      Math.hypot(clientX - lastBurnPoint.x, clientY - lastBurnPoint.y) < 4
    )
      return;
    lastBurnPoint = { x: clientX, y: clientY };
    burnController.add(clientX, clientY, pressure || 0.7);
    rendererController?.setBurnPoint(clientX, clientY);
    burnReactive.forEach((element) => {
      if (!element.closest('.is-active, .foreground-motifs, .progress')) return;
      const rect = element.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      )
        return;
      element.classList.add('is-burn-hit');
      const existing = burnReleaseTimers.get(element);
      if (existing) window.clearTimeout(existing);
      const duration = element.dataset.burnTarget === 'progress' ? 3200 : 620;
      burnReleaseTimers.set(
        element,
        window.setTimeout(() => {
          element.classList.remove('is-burn-hit');
          burnReleaseTimers.delete(element);
        }, duration),
      );
    });
  };
  const startTouchBurn = (event: PointerEvent) => {
    if (!touchOrigin || touchOrigin.pointerId !== event.pointerId) return;
    touchIntent = 'burning';
    inspectingPointerId = event.pointerId;
    disableObservers();
    root.setPointerCapture?.(event.pointerId);
    rendererController?.setPointer(event.clientX, event.clientY, reducedMotion);
    rendererController?.setSlowMotion(true);
    rendererController?.setBurning(true, event.pressure || 0.7);
    root.classList.add('is-inspecting', 'is-burning');
    burnAt(touchOrigin.x, touchOrigin.y, event.pressure);
  };
  const applyPointerMove = () => {
    pointerFrame = 0;
    const event = latestPointer;
    if (!event) return;
    root.style.setProperty('--cursor-x', `${event.clientX}px`);
    root.style.setProperty('--cursor-y', `${event.clientY}px`);
    root.classList.toggle(
      'is-cursor-interactive',
      isInteractiveTarget(event.target),
    );
    if (event.pointerType !== 'touch') root.classList.add('is-cursor-visible');
    if (event.pointerType === 'touch') {
      if (touchOrigin && touchIntent === 'pending') {
        const deltaX = event.clientX - touchOrigin.x;
        const deltaY = event.clientY - touchOrigin.y;
        if (Math.hypot(deltaX, deltaY) >= TOUCH_DIRECTION_THRESHOLD) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) startTouchBurn(event);
          else {
            touchIntent = 'navigation';
            touchOrigin = null;
          }
        }
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
  const onPointerMove = (event: PointerEvent) => {
    if (
      event.pointerType === 'touch' &&
      inspectingPointerId === event.pointerId
    )
      event.preventDefault();
    latestPointer = event;
    if (!pointerFrame)
      pointerFrame = window.requestAnimationFrame(applyPointerMove);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (isInteractiveTarget(event.target)) return;
    if (event.pointerType === 'touch') {
      touchOrigin = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
      touchIntent = 'pending';
      return;
    }
    if (event.button !== 0) return;
    inspectingPointerId = event.pointerId;
    root.setPointerCapture?.(event.pointerId);
    rendererController?.setPointer(event.clientX, event.clientY, reducedMotion);
    rendererController?.setSlowMotion(true);
    rendererController?.setBurning(true, event.pressure || 0.7);
    root.classList.add('is-inspecting', 'is-burning');
    burnAt(event.clientX, event.clientY, event.pressure);
  };
  const releaseInspection = (event: PointerEvent) => {
    touchOrigin = null;
    touchIntent = null;
    if (inspectingPointerId === null || event.pointerId !== inspectingPointerId)
      return;
    if (root.hasPointerCapture?.(event.pointerId))
      root.releasePointerCapture(event.pointerId);
    inspectingPointerId = null;
    lastBurnPoint = null;
    rendererController?.setSlowMotion(false);
    rendererController?.setBurning(false);
    root.classList.remove('is-inspecting', 'is-burning');
    if (!transitioning)
      cooldownTimer = window.setTimeout(enableObservers, MOMENTUM_COOLDOWN);
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
  const preventNativeDrag = (event: Event) => event.preventDefault();
  const onResize = () => {
    rendererController?.resize();
    overlayController.resize();
    burnController.resize();
  };
  const onVisibilityChange = () => {
    if (document.hidden) {
      overlayController.pause();
      burnController.pause();
      ambientTimelines.forEach((timeline) => {
        timeline.pause();
      });
    } else {
      overlayController.start();
      burnController.start();
      if (!reducedMotion)
        ambientTimelines.forEach((timeline) => {
          timeline.play();
        });
    }
  };
  const onScrollCueClick = () => goTo(1);
  const onProgressClick = (event: MouseEvent) => {
    if (event.currentTarget instanceof HTMLElement)
      goTo(Number(event.currentTarget.dataset.target));
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerup', releaseInspection);
  root.addEventListener('pointercancel', releaseInspection);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('selectstart', preventNativeDrag);
  root.addEventListener('dragstart', preventNativeDrag);
  scrollCue?.addEventListener('click', onScrollCueClick);
  progressMarks.forEach((mark) =>
    mark.addEventListener('click', onProgressClick),
  );
  media.add('(prefers-reduced-motion: reduce)', () => {
    reducedMotion = true;
    quality = QUALITY_TIERS.low;
    root.dataset.quality = quality.name;
    rendererController?.setQuality(quality);
    overlayController.setQuality(quality);
    burnController.setQuality(quality);
    shopReveal.setReducedMotion(true);
    rendererController?.setReducedMotion(true);
    overlayController.setReducedMotion(true);
    burnController.setReducedMotion(true);
    stutterController.setReducedMotion(true);
    titleMutations.setReducedMotion(true);
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
      quality = selectInitialQuality(false);
      root.dataset.quality = quality.name;
      rendererController?.setQuality(quality);
      overlayController.setQuality(quality);
      burnController.setQuality(quality);
      shopReveal.setReducedMotion(false);
      rendererController?.setReducedMotion(false);
      overlayController.setReducedMotion(false);
      burnController.setReducedMotion(false);
      stutterController.setReducedMotion(false);
      titleMutations.setReducedMotion(false);
      ambientTimelines.forEach((timeline) => {
        timeline.play();
      });
      gsap.set(state, CHAPTERS[activeIndex]);
    };
  });
  await preloadPromise;
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
  await bootLoader.finish();
  root.classList.add('is-introduced');
  void chapterAssets.preloadChapter(1);
  const destroy = () => {
    window.clearTimeout(cooldownTimer);
    window.cancelAnimationFrame(pointerFrame);
    observers.forEach((observer) => observer.kill());
    media.revert();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointerup', releaseInspection);
    root.removeEventListener('pointercancel', releaseInspection);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('pointerenter', onPointerEnter);
    root.removeEventListener('selectstart', preventNativeDrag);
    root.removeEventListener('dragstart', preventNativeDrag);
    scrollCue?.removeEventListener('click', onScrollCueClick);
    progressMarks.forEach((mark) =>
      mark.removeEventListener('click', onProgressClick),
    );
    ambientTimelines.forEach((timeline) => {
      timeline.kill();
    });
    titleMutations.destroy();
    overlayController.destroy();
    burnController.destroy();
    stutterController.destroy();
    shopReveal.destroy();
    clearBurnHits();
    bootLoader.destroy();
    chapterAssets.destroy();
    rendererController?.destroy();
  };
  return { goTo, resize: onResize, destroy };
};

export default createExperience;
