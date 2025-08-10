# 安装依赖（含 dev，确保有 prisma CLI）
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 生成 Prisma Client
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 有 schema.prisma 时会成功；没有也没关系
RUN npx prisma generate || true

# 生产运行镜像（去掉 dev 依赖，瘦身）
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
# 可选：再裁掉 dev 依赖
RUN npm prune --omit=dev || true
EXPOSE 3001
CMD ["node", "server.js"] 
