module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'prettier',
  ],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',

    // Console - Allow in Node.js server
    'no-console': 'off', // Changed from 'warn' to 'off'

    // Unused variables - Allow with underscore prefix
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],

    // Allow process.exit in server files
    'no-process-exit': 'off',

    // Allow unnecessary escapes in regex
    'no-useless-escape': 'off',

    // Node.js specific - IMPORTANT FIXES
    'node/no-unsupported-features/es-syntax': [
      'error',
      {
        version: '>=14.0.0', // Changed from >=8.0.0
        ignores: ['modules', 'restSpreadProperties'],
      },
    ],
    'node/no-unsupported-features/node-builtins': [
      'error',
      {
        version: '>=14.0.0', // Changed from >=8.0.0
        ignores: [],
      },
    ],
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    'node/no-unpublished-require': 'off',
    'node/no-process-env': 'off',

    // Allow undef if using globals
    'no-undef': 'error',

    // Custom rules
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'quote-props': ['error', 'as-needed'],
  },
  globals: {
    catchAsync: 'readonly', // For fileUpload.js
  },
};