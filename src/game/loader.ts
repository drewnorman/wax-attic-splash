const TASKS = ['webgl', 'head', 'texture', 'signals'] as const;
type Task = (typeof TASKS)[number];
type TaskState = 'waiting' | 'ready' | 'fallback';
const MINIMUM_VISIBLE_MS = 900;
const LOAD_TIMEOUT_MS = 8000;
const DOT_STEP_MS = 220;

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const withTimeout = <Value>(
  promise: PromiseLike<Value>,
  milliseconds = LOAD_TIMEOUT_MS,
) =>
  new Promise<Value>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('Asset load timed out.')),
      milliseconds,
    );
    void Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });

export const loadImage = (source: string) =>
  new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener(
      'error',
      () => reject(new Error(`Unable to load ${source}`)),
      {
        once: true,
      },
    );
    image.src = source;
  });

const createBootLoader = () => {
  const overlay = document.getElementById('loadingOverlay');
  const percent = document.getElementById('loadingPercent');
  const bar = document.getElementById('loadingBarFill');
  const status = document.getElementById('loadingStatus');
  const states = new Map<Task, TaskState>(
    TASKS.map((task) => [task, 'waiting']),
  );
  const startedAt = performance.now();
  let dots = 0;
  let dotTimer: number | undefined = window.setInterval(() => {
    dots = (dots + 1) % 4;
    if (status) status.textContent = `evolving${'.'.repeat(dots)}`;
  }, DOT_STEP_MS);

  const render = () => {
    const complete = Array.from(states.values()).filter(
      (value) => value !== 'waiting',
    ).length;
    const value = Math.round((complete / TASKS.length) * 100);
    if (percent) percent.textContent = `${String(value).padStart(3, '0')}%`;
    if (bar) bar.style.width = `${value}%`;
  };

  const stopDots = () => {
    window.clearInterval(dotTimer);
    dotTimer = undefined;
  };

  const settle = (task: Task, succeeded = true) => {
    if (!states.has(task) || states.get(task) !== 'waiting') return;
    states.set(task, succeeded ? 'ready' : 'fallback');
    render();
  };

  const watch = async (task: Task, promise: PromiseLike<unknown>) => {
    try {
      await withTimeout(promise);
      settle(task, true);
    } catch (error) {
      console.warn(`Boot task ${task} used its fallback.`, error);
      settle(task, false);
    }
  };

  const preload = () =>
    Promise.all([
      watch('texture', loadImage(waxTextureUrl)),
      watch('signals', loadImage(pressingUrl)),
    ]);

  const finish = async () => {
    TASKS.forEach((task) => settle(task, false));
    await delay(
      Math.max(0, MINIMUM_VISIBLE_MS - (performance.now() - startedAt)),
    );
    stopDots();
    if (status) status.textContent = 'evolving...';
    if (percent) percent.textContent = '100%';
    await delay(DOT_STEP_MS);
    overlay?.classList.add('is-ready');
    await delay(260);
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    await delay(460);
    overlay.hidden = true;
  };

  render();
  return { preload, settle, finish, destroy: stopDots };
};

export default createBootLoader;
import waxTextureUrl from '../assets/media/wax-texture.webp?url';
import pressingUrl from '../assets/media/grunge-pressing.webp?url';
