# Strong Agent App 🚀

強力なAIエージェントシステム - OpenAI Agents SDK を活用したプロダクション対応のTypeScript アプリケーション

[![CI](https://github.com/NekoyaJolly/strong_agent_app/actions/workflows/ci.yml/badge.svg)](https://github.com/NekoyaJolly/strong_agent_app/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)

## 📋 概要

Strong Agent App は、OpenAI の新しい Agents SDK を使用した、エンタープライズグレードのAIエージェントプラットフォームです。セキュリティ、スケーラビリティ、運用性を重視した設計となっています。

### 🎯 主な特徴

- **🔐 エンタープライズセキュリティ**: Helmet、CORS制御、Rate Limiting、入出力検証
- **🏗️ モジュラーアーキテクチャ**: 専門エージェント（Architect、Implementer、Reviewer等）による分業システム
- **🛠️ 多機能ツール**: 安全なファイル操作、Web検索、コードレビュー機能
- **📊 構造化ログ**: Pino によるプロダクションレディなログシステム
- **🐳 コンテナ対応**: Docker + Docker Compose での簡単デプロイ
- **🔄 CI/CD**: GitHub Actions による自動ビルド・テスト

## 🚀 クイックスタート

### 前提条件

- **Node.js**: 20.x以上
- **Docker**: 最新版（オプション）
- **OpenAI API Key**: [OpenAI Platform](https://platform.openai.com/api-keys) から取得

##```bash
# 1. イメージプル

```bash
# リポジトリクローン
git clone https://github.com/NekoyaJolly/strong_agent_app.git
cd strong_agent_app

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .envファイルを編集してOpenAI API Keyを設定
```

### 2. 環境変数設定

`.env` ファイルを編集：

```env
# OpenAI API設定
OPENAI_API_KEY=sk-your-api-key-here

# 動作モード
RUN_MODE=cli              # 'cli' または 'server'
NODE_ENV=development      # 'development' または 'production'

# サーバー設定（RUN_MODE=server時）
PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. 実行

```bash
# 開発モード（CLI）
npm run dev

# 本番モード（サーバー）
npm run build
npm start

# Docker使用
docker-compose up --build
```

## 📁 プロジェクト構造

```text
strong_agent_app/
├── src/
│   ├── agent/
│   │   ├── tools/          # エージェントツール
│   │   │   ├── readFile.ts     # 安全なファイル読み取り
│   │   │   └── writeFile.ts    # 許可リスト制御の書き込み
│   │   ├── guardrails.ts   # 入出力検証・セキュリティ
│   │   ├── triage.ts       # トリアージエージェント
│   │   ├── architect.ts    # アーキテクトエージェント
│   │   ├── implementer.ts  # 実装エージェント
│   │   └── ...            # その他専門エージェント
│   ├── runners/
│   │   └── serverRunner.ts    # Express サーバー
│   ├── utils/
│   │   ├── env.ts         # 環境変数管理
│   │   └── logger.ts      # ログシステム
│   └── index.ts           # メインエントリーポイント
├── config/                # 設定ファイル
├── .github/workflows/     # CI/CD設定
├── allowed_writes.json    # 書き込み許可パス
├── docker-compose.yml     # Docker設定
└── Dockerfile            # コンテナ設定
```

## 🤖 エージェントシステム

### 専門エージェント構成

| エージェント | 役割 | 主な機能 |
|-------------|------|----------|
| **Triage** | 一次振り分け | リクエスト解析・適切なエージェントへ転送 |
| **Architect** | 設計 | 技術選定・アーキテクチャ設計・構成提案 |
| **Implementer** | 実装 | コード生成・ファイル作成・具体的実装 |
| **Reviewer** | レビュー | コードレビュー・静的解析・品質チェック |
| **Tester** | テスト | テストケース作成・検証シナリオ提案 |
| **DevOps** | 運用 | Docker・CI/CD・デプロイ設定 |
| **Docs** | ドキュメント | README・CHANGELOG・技術文書作成 |

### ツール機能

- **🔍 Web Search**: リアルタイム情報検索
- **📁 Safe File Operations**: パストラバーサル対策済みファイル操作
- **🛡️ Security Guardrails**: API キー検知・出力サイズ制限
- **📝 Structured Logging**: リクエストID付きログ管理

## 🔒 セキュリティ機能

### 実装済みセキュリティ対策

- **🛡️ Helmet**: セキュリティヘッダー自動設定
- **🚦 Rate Limiting**: API制限（設定可能）
- **🌐 CORS制御**: 許可オリジンリスト管理
- **📊 Request Validation**: Zod による厳密な入力検証
- **🔐 Secret Management**: 環境変数・Dockerシークレット対応
- **📝 Access Control**: ファイル書き込み許可リスト制御
- **🔍 Input/Output Guardrails**: 機密情報検知・出力サイズ制限

### セキュリティ設定

```json
// allowed_writes.json - 書き込み許可パス
{
  "allow": [
    "docs/**",
    "CHANGELOG.md", 
    "README.md",
    "tmp/agent/**"
  ]
}
```

## 🐳 Docker 運用

### 開発環境

```bash
# 開発用コンテナ起動
docker-compose up --build

# ログ確認
docker-compose logs -f strong-agent
```

### 本番環境

```bash
# プロダクション設定
export NODE_ENV=production
export CORS_ORIGINS=https://yourdomain.com
export RATE_LIMIT_MAX=100

# 起動
docker-compose -f docker-compose.yml up -d
```

### 環境変数（Docker）

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `NODE_ENV` | `production` | 実行環境 |
| `PORT` | `3000` | サーバーポート |
| `CORS_ORIGINS` | `http://localhost:3000` | CORS許可オリジン |
| `RATE_LIMIT_MAX` | `60` | 分間リクエスト制限 |
| `JSON_LIMIT` | `256kb` | JSONペイロード制限 |
| `LOG_LEVEL` | `info` | ログレベル |

## 🔧 開発

### 依存関係

```json
{
  "主要依存関係": {
    "@openai/agents": "0.1.0",
    "express": "^5.1.0", 
    "helmet": "^8.1.0",
    "pino": "^9.9.0",
    "zod": "^3.25.76"
  },
  "開発依存関係": {
    "typescript": "^5.9.2",
    "tsx": "^4.20.5"
  }
}
```

### スクリプト

```bash
# 開発
npm run dev          # 開発モード実行
npm run cli          # CLI モード実行

# ビルド
npm run build        # TypeScript コンパイル

# 本番
npm start            # ビルド済み実行

# ユーティリティ
npm run bootstrap    # 初期セットアップ
```

### TypeScript設定

- **Target**: ES2022
- **Module**: NodeNext（ESM対応）
- **Strict**: 有効
- **Source Maps**: 有効（本番でのデバッグ対応）

## 📈 モニタリング・ログ

### ログ形式

```json
{
  "level": "info",
  "time": "2025-01-31T12:00:00.000Z",
  "pid": 1234,
  "hostname": "strong-agent",
  "reqId": "req-uuid-here", 
  "req": {
    "method": "POST",
    "url": "/chat",
    "userAgent": "..."
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 150,
  "msg": "request completed"
}
```

### ヘルスチェック

```bash
# アプリケーション稼働確認
curl http://localhost:3000/health

# レスポンス例
{"status":"ok","uptime":3600.123}
```

## 🚀 デプロイ

### GitHub Actions CI/CD

`.github/workflows/ci.yml` による自動化:

1. **Pull Request**: 自動ビルド・テスト
2. **Main Branch**: Docker イメージビルド・GHCR Push
3. **Release**: 自動リリースノート生成

### 本番デプロイ手順

```bash
# 1. イメージプル
docker pull ghcr.io/nekoyajolly/strong_agent_app:latest

# 2. 環境変数設定
export OPENAI_API_KEY=your-key
export NODE_ENV=production

# 3. 起動
docker run -d \
  --name strong-agent \
  -p 3000:3000 \
  -e OPENAI_API_KEY \
  -e NODE_ENV \
  ghcr.io/nekoyajolly/strong_agent_app:latest
```

## 🤝 コントリビューション

1. **Fork** このリポジトリ
2. **Feature Branch** 作成 (`git checkout -b feature/amazing-feature`)
3. **Commit** 変更 (`git commit -m 'Add: 素晴らしい機能'`)
4. **Push** ブランチ (`git push origin feature/amazing-feature`)
5. **Pull Request** 作成

### コミットメッセージ規約

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル調整
refactor: リファクタリング
perf: パフォーマンス改善
test: テスト追加・修正
chore: その他の変更
```

## 📄 ライセンス

ISC License - 詳細は [LICENSE](./LICENSE) ファイルを参照

## 🙏 謝辞

- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js) - 素晴らしいAIエージェントフレームワーク
- [Express.js](https://expressjs.com/) - 高速なWebアプリケーションフレームワーク  
- [TypeScript](https://www.typescriptlang.org/) - 型安全なJavaScript開発環境

---

## Built with ❤️ and 🤖 AI Power

最終更新: 2025年8月31日
