import { PropTypes } from 'prop-types';
import BaseHead from '../components/base/BaseHead';

const BaseLayout = ({ title, description, children }) => (
  <>
    <BaseHead
      title={title}
      description={description}
    />
    {children}
  </>
);

BaseLayout.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  children: PropTypes.element.isRequired,
};

export default BaseLayout;
