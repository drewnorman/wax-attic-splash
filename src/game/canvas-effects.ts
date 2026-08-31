import * as THREE from 'three';
import type {
  ChapterState,
  AmbientState,
  BurnStamp,
  SmokeParticle,
} from './state';

export const createOverlayParticles = (
  canvas: Element | null,
  state: ChapterState,
  ambient: AmbientState,
) => {
  if (!(canvas instanceof HTMLCanvasElement))
    return { resize: () => {}, setReducedMotion: () => {}, destroy: () => {} };
  const context = canvas.getContext('2d');
  if (!context)
    return { resize: () => {}, setReducedMotion: () => {}, destroy: () => {} };
  const seeds = Array.from({ length: 190 }, (_, index) => ({
    x: (index * 0.61803398875) % 1,
    y: (index * 0.41421356237) % 1,
    speed: 0.015 + (index % 11) * 0.0035,
    size: 0.5 + (index % 7) * 0.34,
  }));
  let width = 1;
  let height = 1;
  let frameId = 0;
  let reducedMotion = false;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const render = () => {
    context.clearRect(0, 0, width, height);
    const chapter = Math.round(state.fieldForm);
    const visibleCount = [74, 112, 190, 58][chapter] ?? 74;
    const damage = [0.18, 0.42, 1, 0.14][chapter] ?? 0.18;
    const time = reducedMotion ? 0 : ambient.sceneTime;
    for (let index = 0; index < visibleCount; index += 1) {
      const seed = seeds[index];
      const x =
        ((seed.x * width + time * seed.speed * width) % (width + 30)) - 15;
      const y =
        seed.y * height +
        Math.sin(time * (0.3 + seed.speed * 4) + index) * (8 + damage * 22);
      const alpha = 0.08 + ((index * 17) % 9) * 0.018 + damage * 0.08;
      context.fillStyle =
        index % 9 === 0
          ? `rgba(255, 49, 154, ${alpha})`
          : `rgba(78, 255, 121, ${alpha})`;
      if (index % 13 === 0) {
        context.fillRect(
          x,
          y,
          seed.size * (7 + damage * 11),
          Math.max(0.6, seed.size * 0.45),
        );
      } else {
        context.fillRect(x, y, seed.size, seed.size * (1 + damage * 1.6));
      }
    }
    frameId = window.requestAnimationFrame(render);
  };

  resize();
  render();
  return {
    resize,
    setReducedMotion: (active: boolean) => {
      reducedMotion = active;
    },
    destroy: () => window.cancelAnimationFrame(frameId),
  };
};

export const createBurnLayer = (
  scarCanvas: Element | null,
  smokeCanvas: Element | null,
) => {
  if (
    !(scarCanvas instanceof HTMLCanvasElement) ||
    !(smokeCanvas instanceof HTMLCanvasElement)
  ) {
    return {
      resize: () => {},
      add: () => {},
      setReducedMotion: () => {},
      destroy: () => {},
    };
  }
  const scarContext = scarCanvas.getContext('2d');
  const smokeContext = smokeCanvas.getContext('2d');
  if (!scarContext || !smokeContext)
    return {
      resize: () => {},
      add: () => {},
      setReducedMotion: () => {},
      destroy: () => {},
    };
  const stamps: BurnStamp[] = [];
  const smoke: SmokeParticle[] = [];
  let width = 1;
  let height = 1;
  let ratio = 1;
  let reducedMotion = false;
  let frameId = 0;
  let lastTime = performance.now();
  const stampLifetime = 1350;

  const drawStamp = (stamp: BurnStamp, age = 0) => {
    const x = stamp.x * width;
    const y = stamp.y * height;
    const radius = stamp.radius;
    const progress = THREE.MathUtils.clamp(age / stampLifetime, 0, 1);
    const frame = reducedMotion ? 0 : Math.floor(age / 92);
    const pixel = Math.max(2, Math.round(radius * 0.13));
    scarContext.save();
    scarContext.globalAlpha = (1 - progress) ** 0.72;
    scarContext.globalCompositeOperation = 'screen';
    scarContext.translate(x, y);
    scarContext.rotate(stamp.rotation * 0.12);
    const shrinkingRadius = radius * (1 - progress * 0.46);
    const palette = ['#ff3212', '#ff7417', '#ffc928', '#fff39a'];
    for (let tongue = 0; tongue < 5; tongue += 1) {
      const tongueSeed = stamp.seed + tongue * 7.31;
      const baseX = (tongue - 2) * shrinkingRadius * 0.29;
      const height =
        shrinkingRadius * (0.9 + (Math.sin(tongueSeed) * 0.5 + 0.5) * 0.95);
      const bands = Math.max(3, Math.round(height / pixel));
      for (let band = 0; band < bands; band += 1) {
        const level = band / Math.max(1, bands - 1);
        const stutter =
          Math.round(Math.sin(frame * 2.17 + tongueSeed + band * 1.9) * 1.4) *
          pixel;
        const bandWidth = Math.max(
          pixel,
          Math.round((shrinkingRadius * 0.45 * (1 - level * 0.78)) / pixel) *
            pixel,
        );
        const bandX =
          Math.round((baseX + stutter - bandWidth * 0.5) / pixel) * pixel;
        const bandY =
          Math.round((-band * pixel + shrinkingRadius * 0.36) / pixel) * pixel;
        const heat = THREE.MathUtils.clamp(
          Math.floor((1 - level) * palette.length),
          0,
          palette.length - 1,
        );
        scarContext.fillStyle = palette[heat];
        scarContext.fillRect(bandX, bandY, bandWidth, pixel + 1);
      }
    }
    scarContext.fillStyle = '#fff7bd';
    scarContext.fillRect(
      -shrinkingRadius * 0.42,
      shrinkingRadius * 0.18,
      shrinkingRadius * 0.84,
      pixel * 1.35,
    );
    scarContext.restore();
  };

  const redrawScars = (now = performance.now()) => {
    scarContext.clearRect(0, 0, width, height);
    for (let index = stamps.length - 1; index >= 0; index -= 1) {
      const age = now - stamps[index].createdAt;
      if (age >= stampLifetime) {
        stamps.splice(index, 1);
        continue;
      }
      drawStamp(stamps[index], age);
    }
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    [scarCanvas, smokeCanvas].forEach((canvas) => {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    });
    scarContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    smokeContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    redrawScars();
  };

  const add = (clientX: number, clientY: number, pressure = 0.7) => {
    const stamp = {
      x: THREE.MathUtils.clamp(clientX / width, 0, 1),
      y: THREE.MathUtils.clamp(clientY / height, 0, 1),
      radius: 13 + pressure * 17 + Math.random() * 7,
      rotation: Math.random() * Math.PI,
      seed: Math.random() * 20,
      createdAt: performance.now(),
    };
    stamps.push(stamp);
    if (stamps.length > 700) stamps.shift();
    drawStamp(stamp, 0);
    if (!reducedMotion) {
      for (let index = 0; index < 3 && smoke.length < 140; index += 1) {
        smoke.push({
          x: clientX + (Math.random() - 0.5) * stamp.radius,
          y: clientY + (Math.random() - 0.5) * stamp.radius * 0.4,
          vx: (Math.random() - 0.5) * 12,
          vy: -18 - Math.random() * 34,
          life: 0.7 + Math.random() * 0.75,
          age: 0,
          size: 8 + Math.random() * 18,
        });
      }
    }
  };

  const renderSmoke = (now: number) => {
    const elapsed = Math.max(0, (now - lastTime) / 1000);
    const delta = Math.min(elapsed, 0.05);
    lastTime = now;
    redrawScars(now);
    smokeContext.clearRect(0, 0, width, height);
    for (let index = smoke.length - 1; index >= 0; index -= 1) {
      const particle = smoke[index];
      particle.age += delta;
      if (particle.age >= particle.life) {
        smoke.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx += Math.sin(particle.age * 7 + index) * delta * 4;
      const progress = particle.age / particle.life;
      const gradient = smokeContext.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * (1 + progress),
      );
      gradient.addColorStop(0, `rgb(112 119 105 / ${(1 - progress) * 0.18})`);
      gradient.addColorStop(0.45, `rgb(34 39 34 / ${(1 - progress) * 0.14})`);
      gradient.addColorStop(1, 'rgb(0 0 0 / 0%)');
      smokeContext.fillStyle = gradient;
      smokeContext.beginPath();
      smokeContext.arc(
        particle.x,
        particle.y,
        particle.size * (1 + progress),
        0,
        Math.PI * 2,
      );
      smokeContext.fill();
    }
    frameId = window.requestAnimationFrame(renderSmoke);
  };

  resize();
  frameId = window.requestAnimationFrame(renderSmoke);
  return {
    resize,
    add,
    setReducedMotion: (active: boolean) => {
      reducedMotion = active;
      if (active) smoke.splice(0);
    },
    destroy: () => window.cancelAnimationFrame(frameId),
  };
};
