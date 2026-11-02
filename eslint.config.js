import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'mochawesome-report/', 'coverage/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.mocha } },
  },
  {
    files: ['.mocharc.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
];
