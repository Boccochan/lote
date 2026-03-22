import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import svelte from 'eslint-plugin-svelte'
import unicorn from 'eslint-plugin-unicorn'
import globals from 'globals'
import ts from 'typescript-eslint'

import svelteConfig from './svelte.config.js'

const maxLinesPerFunction = {
  max: 100,
  skipBlankLines: true,
  skipComments: true,
}

const maxLinesPerFunctionJsx = {
  max: 350,
  skipBlankLines: true,
  skipComments: true,
}

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src-tauri/target/**',
      'package-lock.json',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      unicorn,
    },
    rules: {
      'max-lines-per-function': ['error', maxLinesPerFunction],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    },
  },
  {
    files: ['**/*.{jsx,tsx,svelte}'],
    rules: {
      'max-lines-per-function': ['error', maxLinesPerFunctionJsx],
    },
  },
  {
    files: ['**/*.{ts,svelte}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig,
      },
    },
  },
)
