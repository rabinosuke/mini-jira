// 認証エンドポイント（health / login / register / logout / me）
import { Hono } from "hono";
import bcrypt from "bcryptjs";
import type { AppEnv } from "../env";
import { prisma } from "../prisma";
import { loginSchema, registerSchema } from "../lib/schemas";
import { checkRateLimit, resetRateLimit } from "../lib/rateLimit";
import { createSession, clearSession, getSessionUser, getSessionId } from "../lib/session";

export const auth = new Hono<AppEnv>();

auth.get("/health", (c) => c.json({ ok: true }));

auth.post("/login", async (c) => {
  if (!checkRateLimit(c)) {
    return c.json({ error: "試行回数が多すぎます。しばらく待ってから再度お試しください" }, 429);
  }
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "入力が不正です" }, 400);
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ error: "メールアドレスまたはパスワードが違います" }, 401);
  }
  resetRateLimit(c);
  await createSession(c, user.id);
  return c.json({ id: user.id, name: user.name, role: user.role });
});

auth.post("/register", async (c) => {
  if (!checkRateLimit(c)) {
    return c.json({ error: "試行回数が多すぎます。しばらく待ってから再度お試しください" }, 429);
  }
  const parsed = registerSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "入力が不正です（パスワードは6文字以上）" }, 400);
  }
  const { name, email, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return c.json({ error: "このメールアドレスは既に登録されています" }, 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, role: "developer", passwordHash }, // 新規登録は開発者ロール
  });
  // 最初のプロジェクトにメンバーとして追加（存在すれば）
  const project = await prisma.project.findFirst();
  if (project) {
    await prisma.projectMember.create({ data: { projectId: project.id, userId: user.id } });
  }
  resetRateLimit(c);
  await createSession(c, user.id); // そのままログイン状態にする
  return c.json({ id: user.id, name: user.name, role: user.role }, 201);
});

auth.post("/logout", async (c) => {
  await clearSession(c);
  return c.json({ ok: true });
});

auth.get("/me", async (c) => {
  const user = await getSessionUser(getSessionId(c));
  if (!user) return c.json(null);
  return c.json({ id: user.id, name: user.name, role: user.role });
});
