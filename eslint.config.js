import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', '.generated/**', '.osp/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], eqeqeq: 'error' },
  },
  {
    files: ['*.js', 'scripts/**/*.mjs', 'tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
