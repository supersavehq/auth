const path = require('node:path');

module.exports = {
  extends: ['daangemist'],
  env: {
    browser: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: path.join(__dirname, './tsconfig.eslint.json'),
  },
  rules: {
    'import/no-extraneous-dependencies': 0,
  },
};
