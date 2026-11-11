/* ESLint config for MarketSage (ESLint 8, legacy config format). */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true, webextensions: true, jest: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', 'development/'],
  // Existing code predates this config: noisy rules are relaxed to warnings (or off)
  // so `npm run lint` passes without rewriting working code. Tighten over time.
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-var-requires': 'warn',
    'react/no-unescaped-entities': 'off',
    'no-case-declarations': 'warn',
    'no-prototype-builtins': 'warn',
    'no-useless-escape': 'warn',
    'prefer-const': 'warn',
  },
};
