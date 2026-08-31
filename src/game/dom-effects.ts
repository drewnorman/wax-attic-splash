import { gsap } from 'gsap';

export const createTextFlicker = (chapters: HTMLElement[]) =>
  chapters.map((chapter, index) => {
    const targets = Array.from(
      chapter.querySelectorAll(
        '.chapter__sigil-strip, h1:not(.visually-hidden), h2',
      ),
    );
    const strength = [0.35, 0.58, 1, 0.22][index];
    const leadIn = [3.4, 2.7, 1.35, 5.8][index];
    const repeatDelay = [2.6, 2.1, 0.75, 4.8][index];
    const timeline = gsap.timeline({ repeat: -1, repeatDelay });
    timeline.to({}, { duration: leadIn });
    timeline.to(targets, {
      duration: 0.035,
      opacity: 0.22 + (1 - strength) * 0.38,
      x: -3 * strength,
      skewX: 4 * strength,
      filter: `drop-shadow(${4 * strength}px 0 #ff319a) drop-shadow(${-4 * strength}px 0 #31ff73)`,
      ease: 'steps(1)',
    });
    timeline.to(targets, {
      duration: 0.045,
      opacity: 1,
      x: 3.5 * strength,
      skewX: -2 * strength,
      filter: 'none',
      ease: 'steps(1)',
    });
    if (index === 2) {
      timeline.to(targets, {
        duration: 0.028,
        opacity: 0.12,
        x: -7,
        scaleY: 0.94,
        ease: 'steps(1)',
      });
      timeline.to(targets, {
        duration: 0.05,
        opacity: 1,
        x: 0,
        scaleY: 1,
        skewX: 0,
        filter: 'none',
        ease: 'steps(1)',
      });
    } else {
      timeline.to(targets, {
        duration: 0.055,
        x: 0,
        skewX: 0,
        filter: 'none',
        ease: 'steps(1)',
      });
    }
    return timeline;
  });

export const createSceneStutter = (root: HTMLElement) => {
  let reducedMotion = false;
  let delayedCall: ReturnType<typeof gsap.delayedCall> | undefined;
  let releaseTimer: number | undefined;
  const schedule = () => {
    delayedCall = gsap.delayedCall(1.2 + Math.random() * 3.2, () => {
      if (!reducedMotion) {
        root.classList.add('is-stuttering');
        releaseTimer = window.setTimeout(
          () => root.classList.remove('is-stuttering'),
          34 + Math.random() * 48,
        );
      }
      schedule();
    });
  };
  schedule();
  return {
    setReducedMotion: (active: boolean) => {
      reducedMotion = active;
      if (active) root.classList.remove('is-stuttering');
    },
    destroy: () => {
      delayedCall?.kill();
      window.clearTimeout(releaseTimer);
      root.classList.remove('is-stuttering');
    },
  };
};

export const createShopReveal = (link: HTMLAnchorElement | null) => {
  let timer: number | undefined;
  let reducedMotion = false;
  const reset = () => {
    window.clearTimeout(timer);
    timer = undefined;
    link?.classList.remove('is-revealing', 'is-revealed');
    link?.setAttribute('aria-hidden', 'true');
    link?.setAttribute('tabindex', '-1');
  };
  const reveal = () => {
    if (!link) return;
    link.setAttribute('aria-hidden', 'false');
    link.removeAttribute('tabindex');
    if (reducedMotion) link.classList.add('is-revealed');
    else link.classList.add('is-revealing');
  };
  const activate = () => {
    reset();
    if (reducedMotion) reveal();
    else timer = window.setTimeout(reveal, 1900);
  };
  const onAnimationEnd = (event: AnimationEvent) => {
    if (event.animationName !== 'shop-signal-lock') return;
    link?.classList.remove('is-revealing');
    link?.classList.add('is-revealed');
  };
  link?.addEventListener('animationend', onAnimationEnd);
  reset();
  return {
    activate,
    reset,
    setReducedMotion: (active: boolean) => {
      reducedMotion = active;
    },
    destroy: () => {
      reset();
      link?.removeEventListener('animationend', onAnimationEnd);
    },
  };
};
