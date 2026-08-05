// 入力バリデーション（Zod）
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export const taskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["task", "bug", "story", "epic"]).optional(),
  projectId: z.number().int().optional(),
  assigneeId: z.number().int().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["task", "bug", "story", "epic"]).optional(),
  assigneeId: z.number().int().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
  dueDate: z.string().nullable().optional(),
});

export const commentSchema = z.object({ body: z.string().min(1) });

export const projectCreateSchema = z.object({
  name: z.string().min(1),
  key: z.string().min(1).max(10),
});

// 管理者がユーザーを新規作成するときの入力（本人が後でログインできる）
export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["manager", "developer"]).default("developer"),
});

// プロジェクトにメンバーを追加するときの入力
export const memberAddSchema = z.object({
  userId: z.number().int(),
});
