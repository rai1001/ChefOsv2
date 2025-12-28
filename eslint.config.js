import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '.next/',
      'out/',
      '*.log',
      '.firebase/',
      'storybook-static/',
      'test-results/',
      'playwright-report/',
      '**/*.config.js',
      '**/*.config.ts',
      '**/*.config.mjs',
      '**/*.config.cjs',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      'no-unused-vars': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-undef': 'off',
    },
  },
];
