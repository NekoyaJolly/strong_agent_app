#!/bin/bash

# Bootstrap Script
# 初回セットアップ（依存インストール、ベクターストア登録補助）

set -e

echo "🚀 Strong Agent App Bootstrap Script"
echo "====================================="

# Node.js バージョンチェック
check_nodejs() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js がインストールされていません"
        echo "   Node.js v18 以上をインストールしてください"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | sed 's/v//')
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then 
        echo "✅ Node.js $NODE_VERSION が見つかりました"
    else
        echo "❌ Node.js v18 以上が必要です（現在: v$NODE_VERSION）"
        exit 1
    fi
}

# 依存関係のインストール
install_dependencies() {
    echo ""
    echo "📦 依存関係をインストール中..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    # 開発依存関係の追加インストール
    echo "📦 開発依存関係をインストール中..."
    npm install --save-dev @types/node typescript ts-node
    
    echo "✅ 依存関係のインストールが完了しました"
}

# 環境設定ファイルのセットアップ
setup_env() {
    echo ""
    echo "⚙️ 環境設定をセットアップ中..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo "✅ .env ファイルを作成しました（.env.example からコピー）"
            echo "   必要に応じて .env ファイルを編集してください"
        else
            cat > .env << EOL
# Strong Agent App Configuration
NODE_ENV=development
LOG_LEVEL=INFO
LOG_FORMAT=text

# API Keys (set your actual keys here)
OPENAI_API_KEY=your_openai_api_key_here
WEB_SEARCH_API_KEY=your_web_search_api_key_here

# Server Configuration
SERVER_PORT=3000

# Vector Store Configuration
VECTOR_STORE_TYPE=local
VECTOR_STORE_PATH=./data/vector_index_cache

# Permissions
WORKSPACE_PATH=./workspace
PROJECTS_PATH=./projects
EOL
            echo "✅ デフォルトの .env ファイルを作成しました"
            echo "   API キーなどの設定を行ってください"
        fi
    else
        echo "⚠️ .env ファイルは既に存在します"
    fi
}

# ディレクトリ構造の確認・作成
setup_directories() {
    echo ""
    echo "📁 ディレクトリ構造をセットアップ中..."
    
    # 必要なディレクトリの配列
    directories=(
        "workspace"
        "projects"
        "data"
        "data/vector_index_cache"
        "scripts"
        "tests"
        "docs"
        "config"
        "src/templates"
        "src/agent/workflows"
        "src/integrators"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            echo "  📂 Created: $dir"
        fi
    done
    
    echo "✅ ディレクトリ構造のセットアップが完了しました"
}

# VS Code 設定の作成
setup_vscode() {
    echo ""
    echo "🔧 VS Code 設定をセットアップ中..."
    
    mkdir -p .vscode
    
    # launch.json の作成
    if [ ! -f ".vscode/launch.json" ]; then
        cat > .vscode/launch.json << 'EOL'
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch Strong Agent",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/src/index.ts",
            "outFiles": ["${workspaceFolder}/dist/**/*.js"],
            "runtimeArgs": ["-r", "ts-node/register"],
            "env": {
                "NODE_ENV": "development"
            }
        },
        {
            "name": "Debug Tests",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/node_modules/.bin/jest",
            "args": ["--runInBand"],
            "console": "integratedTerminal"
        }
    ]
}
EOL
        echo "  📄 Created: .vscode/launch.json"
    fi
    
    # settings.json の作成
    if [ ! -f ".vscode/settings.json" ]; then
        cat > .vscode/settings.json << 'EOL'
{
    "typescript.preferences.importModuleSpecifier": "relative",
    "typescript.suggest.autoImports": true,
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    },
    "files.exclude": {
        "**/node_modules": true,
        "**/dist": true,
        "**/.env": true
    }
}
EOL
        echo "  📄 Created: .vscode/settings.json"
    fi
    
    echo "✅ VS Code 設定のセットアップが完了しました"
}

# TypeScript ビルドのテスト
test_build() {
    echo ""
    echo "🔨 TypeScript ビルドをテスト中..."
    
    if npm run build; then
        echo "✅ TypeScript ビルドが成功しました"
    else
        echo "❌ TypeScript ビルドでエラーが発生しました"
        echo "   依存関係を確認してください"
    fi
}

# 完了メッセージ
show_completion_message() {
    echo ""
    echo "🎉 セットアップが完了しました！"
    echo "================================"
    echo ""
    echo "次のステップ:"
    echo "1. .env ファイルを編集してAPI キーを設定"
    echo "2. npm run dev でアプリケーションを起動"
    echo "3. VS Code でプロジェクトを開く"
    echo ""
    echo "利用可能なコマンド:"
    echo "  npm run dev    - 開発モードで起動"
    echo "  npm run build  - プロダクション用ビルド"
    echo "  npm run test   - テストを実行"
    echo ""
}

# メイン実行
main() {
    check_nodejs
    install_dependencies
    setup_env
    setup_directories
    setup_vscode
    test_build
    show_completion_message
}

# スクリプト実行
main "$@"
