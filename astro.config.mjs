import { defineConfig } from 'astro/config';

const site = process.env.PUBLIC_SITE_URL ?? 'https://waxattic.com';
const forceHttpDev = process.env.LOCAL_DEV_HTTP === '1';

export default defineConfig({
  site,
  output: 'static',
  vite: forceHttpDev
    ? {
        server: {
          https: false,
          hmr: {
            protocol: 'ws',
          },
        },
      }
    : undefined,
});
