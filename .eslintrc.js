module.exports = {
  env: {
    // do we need?
    // browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  globals: {
    __dirname: 'readonly',
    process: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'sort-destructure-keys'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    'import/default': 'error',
    'import/named': 'error',
    'import/order': [
      'error',
      {
        alphabetize: { caseInsensitive: false, order: 'asc' },
        'newlines-between': 'always',
      },
    ],
    'sort-destructure-keys/sort-destructure-keys': 'error',
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    'sort-keys': 'error',
  },
};
