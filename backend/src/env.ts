// アプリ全体で共有する型・定数
import type { User } from "@prisma/client";

// Honoの c.set("user") / c.get("user") の型
export type AppEnv = { Variables: { user: User } };

export const isProd = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = "sessionId";
export const SESSION_DAYS = 7;
