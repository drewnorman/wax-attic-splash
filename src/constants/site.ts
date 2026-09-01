const configuredUrl: unknown = import.meta.env.PUBLIC_SITE_URL;
const url =
  typeof configuredUrl === 'string'
    ? configuredUrl
    : 'https://shop.waxattic.com';

export default {
  name: 'Wax Attic',
  url,
  image: new URL(waxTextureUrl, url).href,
};
import waxTextureUrl from '../assets/media/wax-texture.webp?url';
