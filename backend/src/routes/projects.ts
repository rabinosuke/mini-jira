// ユーザー / プロジェクト / メンバー エンドポイント
import { Hono } from "hono";
import bcrypt from "bcryptjs";
import type { AppEnv } from "../env";
import { prisma } from "../prisma";
import { projectCreateSchema, userCreateSchema, memberAddSchema } from "../lib/schemas";

export const projects = new Hono<AppEnv>();

// パスワードハッシュを除いた公開用のユーザー形
type PublicUser = { id: number; name: string; email: string; role: string };
function toPublicUser(u: { id: number; name: string; email: string; role: string }): PublicUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

// 全ユーザー一覧（担当者候補・メンバー追加候補などに使う）
projects.get("/users", async (c) => {
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  // パスワードハッシュは絶対に返さない
  return c.json(users.map(toPublicUser));
});

// ユーザー新規作成：管理者のみ（作成された本人は初期パスワードでログインできる）
projects.post("/users", async (c) => {
  const me = c.get("user");
  if (me.role !== "manager") {
    return c.json({ error: "ユーザー作成は管理者のみ可能です" }, 403);
  }
  const parsed = userCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "入力が不正です（パスワードは6文字以上）" }, 400);
  }
  const { name, email, password, role } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return c.json({ error: "このメールアドレスは既に登録されています" }, 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, role, passwordHash } });
  return c.json(toPublicUser(user), 201);
});

projects.get("/projects", async (c) => {
  const list = await prisma.project.findMany({ orderBy: { id: "asc" } });
  return c.json(list);
});

// プロジェクト作成：管理者のみ
projects.post("/projects", async (c) => {
  const user = c.get("user");
  if (user.role !== "manager") {
    return c.json({ error: "プロジェクト作成は管理者のみ可能です" }, 403);
  }
  const parsed = projectCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "入力が不正です" }, 400);
  const { name, key } = parsed.data;
  const exists = await prisma.project.findUnique({ where: { key } });
  if (exists) return c.json({ error: "そのキーは既に使われています" }, 409);
  const project = await prisma.project.create({ data: { name, key } });
  await prisma.projectMember.create({ data: { projectId: project.id, userId: user.id } });
  return c.json(project, 201);
});

// プロジェクトのメンバー一覧（ログイン中なら誰でも参照可：担当者候補に使う）
projects.get("/projects/:id/members", async (c) => {
  const projectId = Number(c.req.param("id"));
  if (!Number.isInteger(projectId)) return c.json({ error: "不正なプロジェクトIDです" }, 400);
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: true },
    orderBy: { id: "asc" },
  });
  return c.json(members.map((m) => toPublicUser(m.user)));
});

// メンバー追加：管理者のみ
projects.post("/projects/:id/members", async (c) => {
  const me = c.get("user");
  if (me.role !== "manager") {
    return c.json({ error: "メンバー管理は管理者のみ可能です" }, 403);
  }
  const projectId = Number(c.req.param("id"));
  if (!Number.isInteger(projectId)) return c.json({ error: "不正なプロジェクトIDです" }, 400);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return c.json({ error: "プロジェクトが見つかりません" }, 404);

  const parsed = memberAddSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "入力が不正です" }, 400);
  const { userId } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return c.json({ error: "ユーザーが見つかりません" }, 404);

  const already = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (already) return c.json({ error: "このユーザーは既にメンバーです" }, 409);

  await prisma.projectMember.create({ data: { projectId, userId } });
  return c.json(toPublicUser(user), 201);
});

// メンバー削除：管理者のみ
projects.delete("/projects/:id/members/:userId", async (c) => {
  const me = c.get("user");
  if (me.role !== "manager") {
    return c.json({ error: "メンバー管理は管理者のみ可能です" }, 403);
  }
  const projectId = Number(c.req.param("id"));
  const userId = Number(c.req.param("userId"));
  if (!Number.isInteger(projectId) || !Number.isInteger(userId)) {
    return c.json({ error: "不正なIDです" }, 400);
  }
  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  return c.json({ ok: true });
});
