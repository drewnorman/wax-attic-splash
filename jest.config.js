module.exports = {
  noStackTrace: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/pages/**/*',
    '!src/constants/**/*',
  ],
  coverageDirectory: 'coverage/jest',
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
