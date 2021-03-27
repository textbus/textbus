module.exports = {
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "env": {
    "browser": true,
  },
  "rules": {
    "linebreak-style": 0,
    "no-console": 0,
    "no-debugger": 0,
    "no-useless-escape": "off",
    "@typescript-eslint/no-explicit-any": 0,
    "@typescript-eslint/no-empty-interface": 0,
    "@typescript-eslint/no-this-alias": 0,
    "@typescript-eslint/explicit-module-boundary-types": 0,
    "no-constant-condition": ["error", {"checkLoops": false }],

  },
  "ignorePatterns": ["index.ts"]
}
