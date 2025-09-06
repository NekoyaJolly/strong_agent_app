// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // ESLint推奨設定
  eslint.configs.recommended,
  
  // TypeScript-ESLint推奨設定（Type-Checked版）
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  
  // TypeScriptファイル専用設定
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript専用ルール
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      
      // コード品質
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // スタイル統一
      'prefer-const': 'error',
      'no-var': 'error',
      
      // 従来ESLintルールをOFF（TypeScriptが処理）
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  
  // テストファイル専用設定
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  
  // 設定ファイル専用設定
  {
    files: ['*.config.js', '*.config.mjs', '*.config.ts', 'vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        project: null, // 設定ファイルは型チェック不要
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  
  // グローバル除外設定（Type-Checkedルールから除外）
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'temp_tests/',
      '*.js', // ビルド成果物
      '*.mjs', // ビルド成果物（本設定ファイル除く）
      '.git/',
      '*.config.ts', // 設定ファイル群
      'vitest.config.ts',
      'vite.config.ts',
    ],
  },
]);
