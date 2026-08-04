FROM node:22-alpine

WORKDIR /app

# 依存だけ先にコピーしてインストール（キャッシュを効かせる）
COPY package*.json ./
RUN npm install

# ソース一式をコピー
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
