/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';
import { expect, it } from '@jest/globals';
import BaseHead from './BaseHead';

jest.mock('next/head', () => ({
  __esModule: true,
  // eslint-disable-next-line react/prop-types
  default: ({ children }) => <>{children}</>,
}));

describe('BaseHead', () => {
  it('should set the document title', async () => {
    const title = 'Test Title';
    render(
      <BaseHead
        title={title}
        description=""
      />,
      { container: document.head },
    );

    expect(document.title).toEqual(title);
  });
});
