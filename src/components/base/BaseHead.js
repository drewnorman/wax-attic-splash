import Head from 'next/head';
import { PropTypes } from 'prop-types';
import SEO from '../seo/SEO';
import site from '../../constants/site';

const BaseHead = ({ title, description }) => (
  <Head>
    <title>{title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <SEO
      title={title}
      description={description}
      url={site.url}
      image={site.image}
    />
    <link rel="icon" href="/favicon.ico" />
    <link href={site.fontUrls.base} rel="stylesheet" />
  </Head>
);

BaseHead.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

export default BaseHead;
