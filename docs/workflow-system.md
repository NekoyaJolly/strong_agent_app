# Agent Workflow System

## 概要

Strong Agent Appに実装されたマルチエージェント連携ワークフローシステムです。ユーザーからの要求を受けて、複数のエージェントが連携しながら自動的にプロジェクトの分析、設計、実装、テスト、デプロイまでを実行します。

## ワークフローの流れ

1. **Triage** - 要求の分類・整理
2. **Research** - 技術調査・市場調査
3. **Architecture** - システム設計
4. **Implementation** - コード実装
5. **Testing** - テスト実行
6. **Review** - コードレビュー
7. **DevOps** - デプロイ準備
8. **Documentation** - ドキュメント更新

## 主要機能

### PDCAサイクル
- テストやレビューで問題が発見された場合、自動的に実装段階に戻って修正
- 最大反復回数を設定可能（デフォルト: 3回）

### 段階的承認
- 重要な段階（設計、デプロイ等）でユーザー承認を要求
- 開発時は自動承認モードも利用可能

### エラーハンドリング
- 各段階でのエラーを記録・追跡
- 軽微なエラーは継続、重大なエラーは停止

### 進捗管理
- 各段階の実行状況をリアルタイムで追跡
- 生成物（ファイル、テスト結果等）を共有コンテキストで管理

## 使用方法

### 基本的な使用方法

```bash
# 環境変数でワークフローを有効化
export USE_WORKFLOW=true

# 実行
npm run start "Webアプリケーションを作成してください"
```

### 設定オプション

```bash
# 承認が必要な段階で停止
export REQUIRE_APPROVAL=true

# 最大反復回数を設定
export MAX_ITERATIONS=5

# 自動承認モード（開発時のみ）
export AUTO_APPROVE=true
```

### プログラマティックな使用

```typescript
import { WorkflowRunner } from './src/runners/workflowRunner.js';

const runner = new WorkflowRunner({
  project: 'my-project',
  requireApproval: true,
  maxIterations: 3,
  onStageComplete: async (stage, result) => {
    console.log(`${stage} completed:`, result);
  }
});

const result = await runner.executeWorkflow('Create a REST API');
```

## アーキテクチャ

### コンポーネント

- **ProjectContext** - ワークフロー全体の状態管理
- **WorkflowOrchestrator** - エージェント実行の制御
- **WorkflowRunner** - CLI/API インターフェース
- **ResearcherAgent** - 新規追加の調査エージェント

### 拡張性

新しいエージェントやワークフロー段階は以下の手順で追加できます：

1. `WorkflowStage` enumに新しい段階を追加
2. 対応するエージェントを実装
3. `WorkflowOrchestrator`に実行ロジックを追加
4. 必要に応じて承認フローを設定

## エラーハンドリング

### 軽微なエラー
- ログに記録して続行
- 例：フォーマッティングエラー、警告レベルのリント問題

### 重大なエラー
- ワークフロー停止
- 例：認証エラー、ファイルシステムエラー、ネットワークエラー

### 反復制御
- テスト失敗やレビューエラーは自動的に修正段階へ戻る
- 最大反復回数に達したら停止

## 設定

全ての設定は環境変数または設定ファイルで管理：

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `USE_WORKFLOW` | `false` | ワークフローシステムの有効化 |
| `REQUIRE_APPROVAL` | `false` | 段階的承認の有効化 |
| `MAX_ITERATIONS` | `3` | 最大PDCA反復回数 |
| `AUTO_APPROVE` | `false` | 自動承認モード |
| `MAX_TURNS` | `10` | エージェントあたりの最大ターン数 |

## トラブルシューティング

### よくある問題

1. **エージェントが応答しない**
   - OpenAI APIキーの確認
   - ネットワーク接続の確認

2. **無限ループに陥る**
   - `MAX_ITERATIONS`の調整
   - エラー判定ロジックの見直し

3. **承認プロセスが機能しない**
   - `ApprovalHandler`の実装確認
   - コールバック関数の動作確認
