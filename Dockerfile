# syntax=docker/dockerfile:1.7-labs
ARG NODE_VERSION=20.16-bookworm-slim

# 1) deps + build（dev依存を含めてビルド）
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 2) runtime（本番最小）
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production
WORKDIR /app

# 既存のnodeユーザーを使用（bookworm-slimには既にnode:1000が存在）
# ARG RUN_UID=1000
# ARG RUN_GID=1000
# ユーザー作成不要 - 既存のnodeユーザー(uid=1000, gid=1000)を使用

# 本番依存のみ
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev

# 成果物だけコピー
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","--enable-source-maps","dist/index.js"]
