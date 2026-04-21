// eslint-disable-next-line no-undef
module.exports = {
  roots: [
    '<rootDir>/test'
  ],
  setupFiles: ['jest-canvas-mock'],
  testRegex: 'test/(.+)\\.spec\\.(jsx?|tsx?)$',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['packages/**/*.ts'],
  moduleNameMapper: {
    '@textbus/core': '<rootDir>/packages/core/src/index.ts',
    '@textbus/platform-browser': '<rootDir>/packages/platform-browser/src/index.ts',
    '@textbus/platform-node': '<rootDir>/packages/platform-node/src/index.ts',
    '@textbus/collaborate': '<rootDir>/packages/collaborate/src/index.ts',
    '@textbus/adapter-viewfly': '<rootDir>/packages/adapter-viewfly/src/index.ts',
    '@textbus/adapter-vue': '<rootDir>/packages/adapter-vue/src/index.ts',
    '@textbus/adapter-react': '<rootDir>/packages/adapter-react/src/index.ts',
  }
}
