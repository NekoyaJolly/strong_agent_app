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
      
      // 安全性重視：?? と ?. の強制（戦略的設定）
      '@typescript-eslint/prefer-nullish-coalescing': ['error', {
        // 文字列も厳密チェック（空文字を誤って削除しない）
        ignorePrimitives: { 
          string: false,    // 空文字を保持する安全策
          number: false,    // 0を保持する安全策  
          boolean: false,   // falseを保持する安全策
          bigint: false     // 0nを保持する安全策
        },
        // 条件式内での || は許可（意図的なfalsy活用）
        ignoreConditionalTests: true,
        // 混合論理式は慎重に（&& との組み合わせ）
        ignoreMixedLogicalExpressions: false
      }],
      '@typescript-eslint/prefer-optional-chain': ['error', {
        // 戻り値型変更の自動修正は安全重視で無効
        allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing: false,
        // 各型での厳密チェック
        checkAny: true,       // any型も厳密チェック
        checkUnknown: true,   // unknown型も厳密チェック
        checkString: true,    // string型でも ?. 推奨
        checkNumber: true,    // number型でも ?. 推奨
        checkBoolean: true,   // boolean型でも ?. 推奨
        checkBigInt: true,    // bigint型でも ?. 推奨
        // null/undefined を含む型のみチェック（現実的バランス）
        requireNullish: false
      }],
      
      // コード品質（段階的厳格さ）
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn', // 段階的: error → warn
      
      // Template expression の細かい調整
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,        // 数値テンプレートを許可
        allowBoolean: true,       // boolean テンプレートを許可
        allowAny: false,          // any は禁止維持
        allowNullish: true,       // null/undefined は許可
        allowRegExp: false,       // 正規表現は禁止
      }],
      
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
      '@typescript-eslint/no-unsafe-argument': 'off', // テストでは許可
      '@typescript-eslint/restrict-template-expressions': 'off', // テストでは許可
    },
  },

  // index.ts (エントリーポイント) 専用設定
  {
    files: ['src/index.ts'],
    rules: {
      '@typescript-eslint/no-deprecated': 'warn', // エラー→警告に変更
      '@typescript-eslint/no-unsafe-argument': 'warn', // エラー→警告に変更
    },
  },

  // レガシーファイル専用設定
  {
    files: ['src/legacy/**/*.ts', 'src/utils/config.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off', // レガシーでは許可
      '@typescript-eslint/no-explicit-any': 'warn', // エラー→警告
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
