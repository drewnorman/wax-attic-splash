import { PropTypes } from 'prop-types';
import site from '../../constants/site';

const SEO = ({
  title, description, url, image,
}) => (
  <>
    <meta property="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={url} />
    <meta property="og:image" content={image} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={site.name} />
  </>
);

SEO.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
};

export default SEO;
