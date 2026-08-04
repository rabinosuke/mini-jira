// Prismaクライアントの単一インスタンス（アプリ全体で使い回す）
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
