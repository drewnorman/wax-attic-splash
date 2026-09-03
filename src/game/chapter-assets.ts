import pressingUrl from '../assets/media/grunge-pressing.webp?url';
import lagUrl from '../assets/media/grunge-lag.webp?url';
import darknessUrl from '../assets/media/grunge-darkness.webp?url';
import atticUrl from '../assets/media/grunge-attic.webp?url';
import skullBannerUrl from '../assets/media/skull-banner.mp4?url';

export type ChapterAssetState = 'idle' | 'loading' | 'ready' | 'fallback';

const SOURCES = [
  [pressingUrl],
  [lagUrl],
  [darknessUrl, skullBannerUrl],
  [atticUrl],
] as const;

const loadImage = (source: string) =>
  new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to load ${source}`));
    image.src = source;
  });

export const createChapterAssetLoader = (root: HTMLElement) => {
  const states: ChapterAssetState[] = ['idle', 'idle', 'idle', 'idle'];
  const pending = new Map<number, Promise<void>>();
  let destroyed = false;
  let activeChapter = 0;
  const warned = new Set<string>();

  const syncVideoPlayback = () => {
    root
      .querySelectorAll<HTMLVideoElement>('.ambient-video')
      .forEach((video) => {
        if (activeChapter === 2 && !document.hidden && video.readyState >= 2)
          void video.play().catch(() => {});
        else video.pause();
      });
  };

  const loadVideo = async (source: string) => {
    const videos = Array.from(
      root.querySelectorAll<HTMLVideoElement>(
        `.ambient-video[data-src="${source}"]`,
      ),
    );
    await Promise.all(
      videos.map(
        (video) =>
          new Promise<void>((resolve, reject) => {
            const ready = () => {
              cleanup();
              syncVideoPlayback();
              resolve();
            };
            const failed = () => {
              cleanup();
              reject(new Error(`Unable to load ${source}`));
            };
            const cleanup = () => {
              video.removeEventListener('loadeddata', ready);
              video.removeEventListener('error', failed);
            };
            video.addEventListener('loadeddata', ready, { once: true });
            video.addEventListener('error', failed, { once: true });
            video.src = source;
            video.load();
          }),
      ),
    );
  };

  const preloadChapter = (index: number) => {
    const existing = pending.get(index);
    if (existing) return existing;
    states[index] = 'loading';
    const promise = Promise.all(
      SOURCES[index].map((source) =>
        source.endsWith('.mp4') ? loadVideo(source) : loadImage(source),
      ),
    )
      .then(() => {
        if (destroyed) return;
        states[index] = 'ready';
        root.classList.add(`assets-chapter-${index}`);
      })
      .catch((error: unknown) => {
        if (destroyed) return;
        states[index] = 'fallback';
        const key = `chapter-${index}`;
        if (!warned.has(key)) {
          warned.add(key);
          console.warn(`Chapter ${index} assets used their fallback.`, error);
        }
      });
    pending.set(index, promise);
    return promise;
  };

  return {
    preloadCritical: () => preloadChapter(0),
    preloadChapter,
    setActiveChapter: (index: number) => {
      activeChapter = index;
      syncVideoPlayback();
    },
    syncVideoPlayback,
    getState: (index: number) => states[index] ?? 'fallback',
    destroy: () => {
      destroyed = true;
      root
        .querySelectorAll<HTMLVideoElement>('.ambient-video')
        .forEach((video) => video.pause());
    },
  };
};
