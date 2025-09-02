# 設定管理システムの使用方法

## 概要

このプロジェクトでは統合設定管理システムを採用しており、以下の階層で設定を管理しています：

1. **デフォルト設定**: コード内で定義された初期値
2. **JSON設定ファイル**: `config/agent.config.json`
3. **環境変数**: 実行時の環境変数で上書き

## 設定の優先順位

環境変数 > JSON設定ファイル > デフォルト設定

## 主要な設定項目

### エージェント設定
- `MODEL_PROVIDER`: モデルプロバイダー (`openai`, `anthropic`, `local`)
- `MODEL_NAME`: 使用するモデル名 (`gpt-4`, `gpt-3.5-turbo`, など)
- `MODEL_TEMPERATURE`: 温度パラメータ (0.0-2.0)
- `OPENAI_API_KEY`: OpenAI API キー

### サーバー設定
- `SERVER_ENABLED`: サーバーを有効にするか (`true`/`false`)
- `PORT`: サーバーポート番号
- `CORS_ORIGINS`: CORS許可オリジン (カンマ区切り)
- `LOG_LEVEL`: ログレベル (`error`, `warn`, `info`, `debug`)

### 制限設定
- `RATE_LIMIT_WINDOW_MS`: レート制限のウィンドウ時間 (ミリ秒)
- `RATE_LIMIT_MAX`: ウィンドウ内の最大リクエスト数
- `MAX_TURNS`: エージェントの最大ターン数
- `JSON_LIMIT`: JSONペイロードの最大サイズ

## 使用例

### 基本的な使用方法

```typescript
import { getConfig } from './utils/config.js';

async function main() {
  // 設定を読み込み
  const config = await getConfig();
  
  // 設定を使用
  console.log(`Agent: ${config.agent.name} v${config.agent.version}`);
  console.log(`Model: ${config.agent.model.provider}/${config.agent.model.model}`);
  
  if (config.env.openaiApiKey) {
    setDefaultOpenAIKey(config.env.openaiApiKey);
  }
}
```

### プロジェクト固有の設定

```typescript
import { getConfig } from './utils/config.js';

async function runForProject(projectName: string) {
  // プロジェクト固有の.envファイルも読み込む
  const config = await getConfig(projectName);
  
  // プロジェクト固有の設定で実行
  const result = await run(agent, task, {
    maxTurns: config.env.maxTurns
  });
}
```

### 設定の検証

設定はZodスキーマで自動検証されます。不正な値が設定されている場合、アプリケーション起動時にエラーが発生します：

```typescript
// 自動的に検証される
const config = await getConfig();
// 型安全な設定オブジェクトが返される
```

## 環境変数の設定例

### 開発環境 (.env)
```bash
# モデル設定
MODEL_PROVIDER=openai
MODEL_NAME=gpt-4
MODEL_TEMPERATURE=0.7
OPENAI_API_KEY=sk-...

# ログ設定
LOG_LEVEL=debug

# サーバー設定
SERVER_ENABLED=true
PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 本番環境
```bash
# セキュリティ強化
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
JSON_LIMIT=256kb

# プロダクション固有
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com
```

## 設定ファイルの例 (config/agent.config.json)

```json
{
  "agent": {
    "name": "StrongAgent",
    "version": "1.0.0",
    "model": {
      "provider": "openai",
      "model": "gpt-4",
      "temperature": 0.7
    }
  },
  "tools": {
    "readFile": {
      "enabled": true,
      "maxFileSize": 1048576
    },
    "writeFile": {
      "enabled": true,
      "requireApproval": true
    },
    "gitTool": {
      "enabled": true,
      "allowedCommands": ["status", "add", "commit", "push", "branch"]
    },
    "deployTool": {
      "enabled": false,
      "requireApproval": true,
      "allowedEnvironments": ["development", "staging"]
    }
  },
  "guardrails": {
    "level": "moderate",
    "approvalRequired": {
      "fileOperations": true,
      "deployments": true,
      "systemCommands": true
    },
    "blockedOperations": ["format", "rm -rf", "dd if=", "sudo"]
  },
  "server": {
    "enabled": false,
    "port": 3000,
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:3000"]
    }
  }
}
```

## 移行ガイド

既存の`env.ts`の関数は非推奨となりました。以下のように移行してください：

### Before (非推奨)
```typescript
import { loadEnvForProject } from './utils/env.js';

loadEnvForProject('my-project');
```

### After (推奨)
```typescript
import { getConfig } from './utils/config.js';

const config = await getConfig('my-project');
```

## テスト

設定システムは包括的なテストでカバーされています：

```bash
npm test tests/config.test.ts
```

## トラブルシューティング

### 設定が読み込まれない
1. `config/agent.config.json`ファイルが正しい場所にあるか確認
2. JSON構文が正しいか確認
3. 環境変数名が正しいか確認

### 型エラーが発生する
設定スキーマに従って値を設定してください。許可されている値はZodスキーマで定義されています。

### パフォーマンスの考慮事項
- 設定は初回読み込み時にキャッシュされます
- 頻繁に`getConfig()`を呼び出してもパフォーマンスに影響はありません
- テストでは`configManager.reset()`でキャッシュをクリアできます
