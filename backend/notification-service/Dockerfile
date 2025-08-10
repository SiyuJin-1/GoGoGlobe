# notification-service/Dockerfile
FROM node:18-alpine
WORKDIR /app

# 给 Prisma 准备 openssl（警告会少一些）
RUN apk add --no-cache openssl

# 先放 package.json，再放 prisma（⚠️ 先把 schema 放进镜像）
COPY package*.json ./
COPY prisma ./prisma

# 再安装依赖（不跑 postinstall）
RUN npm install --omit=dev

# 现在 prisma 在镜像里了，手动生成 client
RUN npx prisma generate

# 最后复制源码
COPY . .

ENV NODE_ENV=production
CMD ["node", "consumer.js"]
