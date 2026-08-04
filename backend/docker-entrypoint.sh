#!/bin/sh
# コンテナ起動時に毎回実行される初期化スクリプト。
set -e

# Prismaクライアントを生成（node_modules内に型付きのDB操作コードを作る）
npx prisma generate

# マイグレーションを適用（未適用のものだけ実行。本番と同じ仕組み）
npx prisma migrate deploy

# ダミーデータ投入（seed.ts側で「既にあればスキップ」する）
npx tsx prisma/seed.ts

# 開発サーバー起動（ファイル保存で自動再起動）
exec npm run dev
