// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    files: ['*.config.js', 'plugins/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: { globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' } },
  },
  {
    ignores: ['dist/*', 'android/*', 'packages/*', '.expo/*'],
  },
])
