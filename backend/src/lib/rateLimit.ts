// 簡易レート制限（ログイン総当たり対策・IPごと・メモリ上）
import type { Context } from "hono";

const store = new Map<string, { count: number; resetAt: number }>();
const MAX = 10; // 10回まで
const WINDOW_MS = 10 * 60 * 1000; // 10分

export function getClientIp(c: Context): string {
  // 本番は nginx が X-Forwarded-For / X-Real-IP を付ける
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "local"
  );
}

export function checkRateLimit(c: Context): boolean {
  const ip = getClientIp(c);
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= MAX;
}

export function resetRateLimit(c: Context): void {
  store.delete(getClientIp(c)); // ログイン成功したらカウントをリセット
}
