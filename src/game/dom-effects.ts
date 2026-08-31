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

export const createTitleMutations = (chapters: HTMLElement[]) => {
  const glyphs = [
    '⌁',
    '⟁',
    '⊗',
    '⧖',
    '⟡',
    'Ж',
    'Ȣ',
    'ϟ',
    '∆',
    '░',
    '▓',
    '※',
    '⸸',
  ];
  const titles = chapters
    .map((chapter) => chapter.querySelector<HTMLElement>('h2'))
    .filter((title): title is HTMLElement => title !== null);
  const releaseTimers = new Set<number>();
  let delayedCall: ReturnType<typeof gsap.delayedCall> | undefined;
  let reducedMotion = false;
  let destroyed = false;

  titles.forEach((title) => {
    const lines = [''];
    Array.from(title.childNodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'BR')
        lines.push('');
      else lines[lines.length - 1] += node.textContent || '';
    });
    title.setAttribute('aria-label', lines.join(' '));
    title.textContent = '';
    const visual = document.createElement('span');
    visual.className = 'title-visual';
    visual.setAttribute('aria-hidden', 'true');
    lines.forEach((line) => {
      const lineElement = document.createElement('span');
      lineElement.className = 'title-line';
      Array.from(line).forEach((character) => {
        const span = document.createElement('span');
        span.className = character === ' ' ? 'title-space' : 'title-char';
        if (character !== ' ') span.dataset.original = character.toLowerCase();
        span.textContent =
          character === ' ' ? '\u00a0' : character.toLowerCase();
        lineElement.append(span);
      });
      visual.append(lineElement);
    });
    title.append(visual);
  });

  const restore = () => {
    releaseTimers.forEach((timer) => window.clearTimeout(timer));
    releaseTimers.clear();
    titles.forEach((title) => {
      title.classList.remove('is-title-italic');
      title
        .querySelectorAll<HTMLElement>('.title-char')
        .forEach((character) => {
          const original = character.dataset.original || '';
          character.textContent = original === ' ' ? '\u00a0' : original;
          character.classList.remove('is-title-char-italic');
        });
    });
  };

  const schedule = () => {
    if (destroyed || reducedMotion) return;
    const activeChapter = chapters.find((chapter) =>
      chapter.classList.contains('is-active'),
    );
    const stage = Number(activeChapter?.dataset.index || 0);
    const waits: Record<number, [number, number]> = {
      1: [2.4, 2.2],
      2: [1.15, 1.55],
      3: [3.1, 2.3],
    };
    const [base, spread] = waits[stage] || [1.2, 0.8];
    delayedCall = gsap.delayedCall(base + Math.random() * spread, mutate);
  };

  const mutate = () => {
    if (destroyed || reducedMotion) return;
    const title = titles.find((candidate) =>
      candidate
        .closest<HTMLElement>('.chapter')
        ?.classList.contains('is-active'),
    );
    if (!title) {
      schedule();
      return;
    }
    restore();
    const stage = Number(
      title.closest<HTMLElement>('.chapter')?.dataset.index || 1,
    );
    const characters = Array.from(
      title.querySelectorAll<HTMLElement>('.title-char'),
    ).filter((character) => /[A-Z]/i.test(character.dataset.original || ''));
    const count = Math.min(
      characters.length,
      1 + Math.floor(Math.random() * (stage === 2 ? 3 : 2)),
    );
    const selected = [...characters]
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    const symbolChance = stage === 2 ? 0.72 : stage === 3 ? 0.52 : 0.34;
    selected.forEach((character) => {
      const original = character.dataset.original || '';
      if (Math.random() < symbolChance)
        character.textContent =
          glyphs[Math.floor(Math.random() * glyphs.length)];
      else character.textContent = original.toUpperCase();
      character.classList.toggle('is-title-char-italic', Math.random() < 0.62);
    });
    title.classList.toggle(
      'is-title-italic',
      Math.random() < (stage === 3 ? 0.58 : 0.3),
    );
    const timer = window.setTimeout(
      () => {
        releaseTimers.delete(timer);
        restore();
        schedule();
      },
      70 + Math.random() * 90,
    );
    releaseTimers.add(timer);
  };

  schedule();
  return {
    setReducedMotion: (active: boolean) => {
      reducedMotion = active;
      delayedCall?.kill();
      restore();
      if (!active) schedule();
    },
    destroy: () => {
      destroyed = true;
      delayedCall?.kill();
      restore();
    },
  };
};

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
    else timer = window.setTimeout(reveal, 600);
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
