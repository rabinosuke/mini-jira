#!/bin/sh
# 本番用の起動スクリプト（ダミーseedは実行しない・watchなし）。
set -e

npx prisma generate
npx prisma migrate deploy   # 未適用のマイグレーションを適用

exec npx tsx src/index.ts
