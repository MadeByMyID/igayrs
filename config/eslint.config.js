const js = require('@eslint/js');
const globals = require('globals');
const reactHooks = require('eslint-plugin-react-hooks');
const tseslint = require('typescript-eslint');

const tsFiles = ['src/**/*.{ts,tsx}', 'config/*.ts'];

module.exports = tseslint.config(
  {
    ignores: [
      'dist',
      'assets',
      'node_modules',
      'artifacts',
      'coverage',
      'public/assets/data/json/*.json'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: tsFiles
  })),
  {
    files: tsFiles,
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      'react-hooks/set-state-in-effect': 'off'
    }
  },
  {
    files: ['config/*.config.js', 'ops/scripts/**/*.js', 'scripts/**/*.js', 'src/tests/**/*.js', 'ops/worker/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        fetch: 'readonly'
      }
    }
  }
);
