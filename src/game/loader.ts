const TASKS = [
  'webgl',
  'head',
  'texture',
  'signals',
  'typeface',
  'video',
] as const;
type Task = (typeof TASKS)[number];
type TaskState = 'waiting' | 'ready' | 'fallback';
const MINIMUM_VISIBLE_MS = 900;
const LOAD_TIMEOUT_MS = 8000;

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

const loadImage = (source: string) =>
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

const waitForVideo = (video: HTMLVideoElement) =>
  new Promise<void>((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve();
      return;
    }
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Ambient video unavailable.'));
    };
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('error', onError, { once: true });
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Ambient video timed out.'));
    }, LOAD_TIMEOUT_MS);
    video.load();
  });

const createBootLoader = (root: HTMLElement) => {
  const overlay = document.getElementById('loadingOverlay');
  const percent = document.getElementById('loadingPercent');
  const bar = document.getElementById('loadingBarFill');
  const status = document.getElementById('loadingStatus');
  const rows = new Map(
    Array.from(root.querySelectorAll<HTMLElement>('[data-load-task]'))
      .filter((row): row is HTMLElement & { dataset: { loadTask: Task } } =>
        TASKS.includes(row.dataset.loadTask as Task),
      )
      .map((row) => [row.dataset.loadTask, row]),
  );
  const states = new Map<Task, TaskState>(
    TASKS.map((task) => [task, 'waiting']),
  );
  const startedAt = performance.now();

  const render = () => {
    const complete = Array.from(states.values()).filter(
      (value) => value !== 'waiting',
    ).length;
    const value = Math.round((complete / TASKS.length) * 100);
    if (percent) percent.textContent = `${String(value).padStart(3, '0')}%`;
    if (bar) bar.style.width = `${value}%`;
    rows.forEach((row, task) => {
      const taskState = states.get(task);
      if (!taskState) return;
      row.dataset.state = taskState;
      const label = row.querySelector<HTMLElement>('[data-task-state]');
      if (label) {
        label.dataset.taskState =
          taskState === 'waiting'
            ? 'WAIT'
            : taskState === 'ready'
              ? 'READY'
              : 'DEGRADED';
        label.textContent = label.dataset.taskState;
      }
    });
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
      watch('texture', loadImage('/images/wax-texture.png')),
      watch(
        'signals',
        Promise.all(
          [
            '/images/grunge-pressing.webp',
            '/images/grunge-lag.webp',
            '/images/grunge-darkness.webp',
            '/images/grunge-attic.webp',
            '/images/statik.gif',
          ].map(loadImage),
        ),
      ),
      watch('typeface', document.fonts?.ready ?? Promise.resolve()),
      watch(
        'video',
        Promise.all(
          Array.from(
            root.querySelectorAll<HTMLVideoElement>('.ambient-video'),
          ).map(waitForVideo),
        ),
      ),
    ]);

  const finish = async () => {
    TASKS.forEach((task) => settle(task, false));
    await delay(
      Math.max(0, MINIMUM_VISIBLE_MS - (performance.now() - startedAt)),
    );
    if (status) status.textContent = 'READY / ENTERING SYSTEM';
    overlay?.classList.add('is-ready');
    await delay(260);
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    await delay(460);
    overlay.hidden = true;
  };

  render();
  return { preload, settle, finish };
};

export default createBootLoader;
