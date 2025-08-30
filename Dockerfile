# syntax=docker/dockerfile:1.7-labs
ARG NODE_VERSION=20.16-alpine

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

# 非rootユーザ（docker-compose の build args と合致）
ARG RUN_UID=1000
ARG RUN_GID=1000
RUN addgroup -g ${RUN_GID} -S app && adduser -S -D -G app -u ${RUN_UID} app

# 本番依存のみ
COPY --chown=app:app package.json package-lock.json ./
RUN npm ci --omit=dev

# 成果物だけコピー
COPY --from=build --chown=app:app /app/dist ./dist

USER app
EXPOSE 3000
CMD ["node","--enable-source-maps","dist/index.js"]
