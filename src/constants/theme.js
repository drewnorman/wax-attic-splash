const deviceSizes = {
  xsmall: 480,
  small: 576,
  medium: 768,
  large: 992,
  xlarge: 1200,
  xxlarge: 1440,
};

export default {
  breakpoints: {
    xsmall: `(min-width: ${ deviceSizes.xsmall }px)`,
    small: `(min-width: ${ deviceSizes.small }px)`,
    medium: `(min-width: ${ deviceSizes.medium }px)`,
    large: `(min-width: ${ deviceSizes.large }px)`,
    xlarge: `(min-width: ${ deviceSizes.xlarge }px)`,
    xxlarge: `(min-width: ${ deviceSizes.xxlarge }px)`,
  },
  colors: {
    primary: '#0fed19',
    black: '#000000',
  },
  fonts: {
    largeHeading: "'Anonymous Pro', sans-serif",
    smallHeading: "'Anonymous Pro', sans-serif",
    body: "'Anonymous Pro', sans-serif",
  },
};
