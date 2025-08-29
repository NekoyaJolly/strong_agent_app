# Dockerfile
# Build stage
FROM node:20-alpine AS builder

# install build deps
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# 依存を先にコピーしてキャッシュを効かせる（package-lock.json を使って reproducible install）
COPY package.json package-lock.json ./
RUN npm ci --no-optional --cache /tmp/npm-cache && npm cache clean --force

# ソースをコピーしてビルド（TypeScript 等あればここで tsc を実行）
COPY . .
RUN npm run build

# Runtime stage（最小イメージ）
FROM node:20-alpine AS runtime
WORKDIR /app

# 少数のランタイム依存のみインストール（production only）
COPY package.json package-lock.json ./
RUN npm ci --production --no-optional --cache /tmp/npm-cache && npm cache clean --force

# 実行ユーザー（非 root）を作成。ホストの UID:GID と合わせたい場合、--build-arg で上書き可
ARG RUN_UID=1000
ARG RUN_GID=1000
RUN addgroup -g ${RUN_GID} agentgrp \
  && adduser -D -u ${RUN_UID} -G agentgrp agentuser

# ビルドアーティファクトのみコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# ワークスペースやプロジェクトのマウントポイントを指定（外部マウントで運用）
VOLUME ["/projects", "/workspace", "/data"]

ENV NODE_ENV=production
ENV AGENT_WORKDIR=/app
ENV AGENT_WORKSPACE_PATH=/workspace

# 非 root ユーザーで実行
USER agentuser

# ヘルスチェック（例：HTTP サーバがある場合の生存確認。API 無いなら簡易コマンド変更）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD [ "sh", "-c", "node -e \"(async()=>{try{const r=await fetch('http://localhost:3000/health').catch(()=>null); process.exit(r && r.status===200?0:1)}catch(e){process.exit(1)}})\"" ]

EXPOSE 3000
CMD ["node", "dist/index.js"]
