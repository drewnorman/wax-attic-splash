/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';
import BaseLayout from './BaseLayout';

describe('BaseLayout', () => {
  it('renders without crashing', async () => {
    const content = <div>Basic Layout Content</div>;
    render(
      <BaseLayout
        title="Basic Layout Title"
        description="Basic Layout Description"
      >
        {content}
      </BaseLayout>,
    );
  });
});
