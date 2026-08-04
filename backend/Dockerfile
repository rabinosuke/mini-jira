# Prisma は Alpine の musl/OpenSSL と相性が悪いため、Debianベースを使う
FROM node:22-slim

WORKDIR /app

# Prisma が必要とする OpenSSL を入れる
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# 依存だけ先にコピーしてインストール（キャッシュを効かせる）
COPY package*.json ./
RUN npm install

# ソース一式をコピー
COPY . .

# Prismaクライアントを生成（起動時にも再生成するが、イメージにも入れておく）
RUN npx prisma generate

EXPOSE 8000

CMD ["sh", "docker-entrypoint.sh"]
