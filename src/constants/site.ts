const url = import.meta.env.PUBLIC_SITE_URL ?? 'https://waxattic.com';

export default {
  name: 'Wax Attic',
  url,
  image: `${url}/images/wax-texture.png`,
  fontUrls: {
    base: 'https://fonts.googleapis.com/css2?family=Anonymous+Pro:wght@400;700&display=swap',
  },
};
