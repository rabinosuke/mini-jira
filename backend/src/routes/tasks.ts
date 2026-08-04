// タスク / コメント / 変更履歴 エンドポイント
import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import type { AppEnv } from "../env";
import { prisma } from "../prisma";
import { taskCreateSchema, taskUpdateSchema, commentSchema } from "../lib/schemas";
import { STATUS_LABEL, PRIORITY_LABEL, TYPE_LABEL } from "../lib/labels";

export const tasks = new Hono<AppEnv>();

const withRelations = { assignee: true, reporter: true, project: true } as const;

// 一覧（projectId / assigneeId / q で絞り込み）
tasks.get("/tasks", async (c) => {
  const assigneeId = c.req.query("assigneeId");
  const q = c.req.query("q");
  const projectId = c.req.query("projectId");
  const where: Prisma.TaskWhereInput = {};
  if (projectId) where.projectId = Number(projectId);
  if (assigneeId) where.assigneeId = Number(assigneeId);
  if (q)
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  const list = await prisma.task.findMany({
    where,
    include: withRelations,
    orderBy: { createdAt: "asc" },
  });
  return c.json(list);
});

// 作成：管理者のみ
tasks.post("/tasks", async (c) => {
  const user = c.get("user");
  if (user.role !== "manager") return c.json({ error: "作成は管理者のみ可能です" }, 403);
  const parsed = taskCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "入力が不正です" }, 400);
  const body = parsed.data;
  const project = body.projectId
    ? await prisma.project.findUnique({ where: { id: body.projectId } })
    : await prisma.project.findFirst();
  if (!project) return c.json({ error: "プロジェクトが見つかりません" }, 400);
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description ?? "",
      type: body.type ?? "task",
      projectId: project.id,
      reporterId: user.id, // 作成者＝ログイン中の管理者
      assigneeId: body.assigneeId ?? null,
      priority: body.priority ?? "medium",
      status: body.status ?? "todo",
    },
    include: withRelations,
  });
  await prisma.activity.create({
    data: { taskId: task.id, userId: user.id, message: "タスクを作成しました" },
  });
  return c.json(task, 201);
});

// 更新：管理者は全部／開発者は自分の担当タスクのみ。変更点を履歴に記録。
tasks.patch("/tasks/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return c.json({ error: "タスクが見つかりません" }, 404);
  if (user.role !== "manager" && existing.assigneeId !== user.id) {
    return c.json({ error: "自分の担当タスクのみ編集できます" }, 403);
  }
  const parsed = taskUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "入力が不正です" }, 400);
  const body = parsed.data;

  const changes: string[] = [];
  if (body.status && body.status !== existing.status)
    changes.push(`ステータス: ${STATUS_LABEL[existing.status]} → ${STATUS_LABEL[body.status]}`);
  if (body.priority && body.priority !== existing.priority)
    changes.push(`優先度: ${PRIORITY_LABEL[existing.priority]} → ${PRIORITY_LABEL[body.priority]}`);
  if (body.type && body.type !== existing.type)
    changes.push(`種別: ${TYPE_LABEL[existing.type]} → ${TYPE_LABEL[body.type]}`);
  if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId) {
    const name = body.assigneeId
      ? ((await prisma.user.findUnique({ where: { id: body.assigneeId } }))?.name ?? "?")
      : "未割当";
    changes.push(`担当者を ${name} に変更`);
  }
  if (body.title !== undefined && body.title !== existing.title) changes.push("タイトルを編集");
  if (body.description !== undefined && body.description !== existing.description)
    changes.push("説明を編集");
  if (body.dueDate !== undefined) {
    const oldDue = existing.dueDate ? existing.dueDate.toISOString().slice(0, 10) : null;
    const newDue = body.dueDate || null;
    if (oldDue !== newDue) changes.push(`期限を ${newDue ?? "未設定"} に変更`);
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      status: body.status,
      assigneeId: body.assigneeId,
      priority: body.priority,
      type: body.type,
      title: body.title,
      description: body.description,
      dueDate:
        body.dueDate === undefined ? undefined : body.dueDate ? new Date(body.dueDate) : null,
    },
    include: withRelations,
  });

  if (changes.length > 0) {
    await prisma.activity.createMany({
      data: changes.map((message) => ({ taskId: id, userId: user.id, message })),
    });
  }
  return c.json(task);
});

// 削除：管理者のみ
tasks.delete("/tasks/:id", async (c) => {
  const user = c.get("user");
  if (user.role !== "manager") return c.json({ error: "削除は管理者のみ可能です" }, 403);
  const id = Number(c.req.param("id"));
  await prisma.comment.deleteMany({ where: { taskId: id } });
  await prisma.activity.deleteMany({ where: { taskId: id } });
  await prisma.task.delete({ where: { id } });
  return c.json({ ok: true });
});

// コメント（ログイン中なら誰でも閲覧・投稿できる）
tasks.get("/tasks/:id/comments", async (c) => {
  const taskId = Number(c.req.param("id"));
  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return c.json(
    comments.map((cm) => ({
      id: cm.id,
      body: cm.body,
      createdAt: cm.createdAt,
      user: { id: cm.user.id, name: cm.user.name, role: cm.user.role },
    })),
  );
});

tasks.post("/tasks/:id/comments", async (c) => {
  const user = c.get("user");
  const taskId = Number(c.req.param("id"));
  const parsed = commentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "コメントを入力してください" }, 400);
  const cm = await prisma.comment.create({
    data: { taskId, userId: user.id, body: parsed.data.body },
    include: { user: true },
  });
  return c.json(
    {
      id: cm.id,
      body: cm.body,
      createdAt: cm.createdAt,
      user: { id: cm.user.id, name: cm.user.name, role: cm.user.role },
    },
    201,
  );
});

// 変更履歴
tasks.get("/tasks/:id/activities", async (c) => {
  const taskId = Number(c.req.param("id"));
  const acts = await prisma.activity.findMany({
    where: { taskId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return c.json(
    acts.map((a) => ({
      id: a.id,
      message: a.message,
      createdAt: a.createdAt,
      user: { id: a.user.id, name: a.user.name, role: a.user.role },
    })),
  );
});
