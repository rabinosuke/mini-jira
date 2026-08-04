// セッション管理（DB管理方式・cookieにはセッションIDのみ）
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { randomUUID } from "node:crypto";
import { prisma } from "../prisma";
import { SESSION_COOKIE, SESSION_DAYS, isProd } from "../env";

const MAX_AGE_SEC = SESSION_DAYS * 24 * 60 * 60;

export function getSessionId(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

// cookieのセッションIDから今のユーザーを引く（期限切れは削除してnull）
export async function getSessionUser(sid: string | undefined) {
  if (!sid) return null;
  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: sid } }).catch(() => {});
    return null;
  }
  return session.user;
}

// セッションを作成し、httpOnly cookie を発行
export async function createSession(c: Context, userId: number): Promise<void> {
  const sid = `${randomUUID()}-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + MAX_AGE_SEC * 1000);
  await prisma.session.create({ data: { id: sid, userId, expiresAt } });
  setCookie(c, SESSION_COOKIE, sid, {
    httpOnly: true, // JavaScriptから読めない（XSS対策）
    secure: isProd, // 本番はHTTPSのみ
    sameSite: "Lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

// セッションを破棄し cookie を削除
export async function clearSession(c: Context): Promise<void> {
  const sid = getSessionId(c);
  if (sid) await prisma.session.deleteMany({ where: { id: sid } });
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
