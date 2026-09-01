const configuredUrl: unknown = import.meta.env.PUBLIC_SITE_URL;
const url =
  typeof configuredUrl === 'string'
    ? configuredUrl
    : 'https://shop.waxattic.com';

export default {
  name: 'Wax Attic',
  url,
  image: `${url}/images/wax-texture.png`,
  fontUrls: {
    base: 'https://fonts.googleapis.com/css2?family=Anonymous+Pro:wght@400;700&display=swap',
  },
};
