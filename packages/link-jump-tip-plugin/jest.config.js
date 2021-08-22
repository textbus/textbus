module.exports = {
  roots: [
    "<rootDir>/test"
  ],
  testRegex: 'test/(.+)\\.spec\\.(jsx?|tsx?)$',
  transform: {
    "^.+\\.js$": "babel-jest",
    "^.+\\.tsx?$": "ts-jest"
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/(?!(@tanbo/\.*))"],
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '@textbus/link-jump-tip-plugin': '<rootDir>/src/public-api.ts',
    '@textbus/link-jump-tip-plugin/(.*)': '<rootDir>/src/$1'
  }
};
