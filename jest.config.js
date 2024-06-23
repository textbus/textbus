// eslint-disable-next-line no-undef
module.exports = {
  roots: [
    '<rootDir>/test'
  ],
  setupFiles: ['jest-canvas-mock'],
  testRegex: 'test/(.+)\\.spec\\.(jsx?|tsx?)$',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest'
  },
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['packages/**/*.ts'],
  moduleNameMapper: {
    '@textbus/core': '<rootDir>/packages/core/src/public-api.ts',
    '@textbus/platform-browser': '<rootDir>/packages/platform-browser/src/public-api.ts',
    '@textbus/platform-node': '<rootDir>/packages/platform-node/src/public-api.ts',
    '@textbus/collaborate': '<rootDir>/packages/collaborate/src/public-api.ts',
    '@textbus/adapter-viewfly': '<rootDir>/packages/adapter-viewfly/src/public-api.ts',
    '@textbus/adapter-vue': '<rootDir>/packages/adapter-vue/src/public-api.ts',
    '@textbus/adapter-react': '<rootDir>/packages/adapter-react/src/public-api.ts',
  }
}
