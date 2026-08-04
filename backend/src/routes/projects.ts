// ユーザー / プロジェクト エンドポイント
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { prisma } from "../prisma";
import { projectCreateSchema } from "../lib/schemas";

export const projects = new Hono<AppEnv>();

projects.get("/users", async (c) => {
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  // パスワードハッシュは絶対に返さない
  return c.json(users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
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
