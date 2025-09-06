# GitHub環境変数設定ガイド

このファイルは、GitHub Actions で使用される環境変数の設定ガイドです。

## 必要な環境変数

### Secrets（リポジトリ設定 > Secrets and variables > Actions で設定）

#### OpenAI API (必須)

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### その他のAPI（オプション）

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_API_KEY=AIxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### デプロイ用（本番環境で必要）

```bash
DOCKER_REGISTRY_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEPLOY_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
DEPLOY_HOST=your-production-server.com
DEPLOY_USER=deploy
```

### Variables（リポジトリ設定 > Secrets and variables > Actions で設定）

#### 基本設定

```bash
NODE_ENV=production
DEFAULT_MODEL=gpt-4o
LOG_LEVEL=info
SERVER_PORT=3000
```

#### Docker設定

```bash
DOCKER_REGISTRY=ghcr.io
DOCKER_IMAGE_NAME=strong_agent_app
```

## 環境別設定

### Development

- `NODE_ENV=development`
- `LOG_LEVEL=debug`
- より詳細なエラー情報

### Staging

- `NODE_ENV=staging`
- `LOG_LEVEL=info`
- 本番環境と同等の設定

### Production

- `NODE_ENV=production`
- `LOG_LEVEL=warn`
- 最適化された設定

## 設定手順

1. GitHub リポジトリページに移動
2. Settings > Secrets and variables > Actions を開く
3. 上記の環境変数を設定
4. Actions タブでワークフローが正常に動作することを確認

## セキュリティ注意事項

- APIキーは絶対にコードにハードコーディングしない
- 本番環境のCredentialsは最小権限の原則に従って設定
- 定期的にAPIキーをローテーションする
- ログにSecrets情報が出力されないよう注意
