/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';
import { expect, it } from '@jest/globals';
import SEO from './SEO';

const getMetaTagValue = function getMetaTagValue(name) {
  const found = Array.from(document.getElementsByTagName('meta'))
    .find((meta) => meta.getAttribute('property') === name);
  if (found === undefined) return '';
  return found.getAttribute('content');
};

describe('SEO', () => {
  it('should render the right meta tags', async () => {
    const {
      title, description, image, url,
    } = {
      title: 'Test Title',
      description: 'Test Description',
      image: 'https://www.test-url.com/images/test-image.jpg',
      url: 'https://www.test-url.com/',
    };
    render(
      <SEO
        title={title}
        description={description}
        image={image}
        url={url}
      />,
      { container: document.head },
    );

    expect(getMetaTagValue('description')).toBe(description);
    expect(getMetaTagValue('og:title')).toBe(title);
    expect(getMetaTagValue('og:description')).toBe(description);
    expect(getMetaTagValue('og:url')).toBe(url);
    expect(getMetaTagValue('og:image')).toBe(image);
  });
});
