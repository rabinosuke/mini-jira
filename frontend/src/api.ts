// バックエンド(Hono)との通信をまとめた関数群。
// 画面側はここの関数を呼ぶだけ。失敗時は ApiError を投げる。
import type { Task, User, Comment, Activity, Project } from "./types";

const base = "/api"; // Viteのproxyでバックエンドに転送される

// APIエラー（HTTPステータスとサーバーのメッセージを持つ）
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// 401（セッション切れ等）を検知したときに呼ぶハンドラ。App側でログイン画面に戻す。
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  unauthorizedHandler = fn;
}

// 共通のfetchラッパー：res.ok を確認し、失敗なら ApiError を投げる
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, init);
  if (res.status === 401) unauthorizedHandler?.(); // セッション切れ→ログインへ
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, err.error ?? `エラーが発生しました (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// ---------- 認証 ----------
// /me は未ログインでも 200 で null を返すので request を通さない
export async function getMe(): Promise<User | null> {
  const res = await fetch(`${base}/me`);
  return res.json();
}

export function login(email: string, password: string): Promise<User> {
  return request<User>("/login", jsonInit("POST", { email, password }));
}

export function register(name: string, email: string, password: string): Promise<User> {
  return request<User>("/register", jsonInit("POST", { name, email, password }));
}

export async function logout(): Promise<void> {
  await fetch(`${base}/logout`, { method: "POST" });
}

// ---------- ユーザー ----------
export function getUsers(): Promise<User[]> {
  return request<User[]>("/users");
}

// ---------- プロジェクト ----------
export function getProjects(): Promise<Project[]> {
  return request<Project[]>("/projects");
}

export function createProject(name: string, key: string): Promise<Project> {
  return request<Project>("/projects", jsonInit("POST", { name, key }));
}

// ---------- タスク ----------
export function getTasks(
  opts: { projectId?: number; assigneeId?: number; q?: string } = {},
): Promise<Task[]> {
  const params = new URLSearchParams();
  if (opts.projectId) params.set("projectId", String(opts.projectId));
  if (opts.assigneeId) params.set("assigneeId", String(opts.assigneeId));
  if (opts.q) params.set("q", opts.q);
  const qs = params.toString();
  return request<Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
}

export function createTask(data: {
  title: string;
  assigneeId: number | null;
  priority: string;
  type: string;
  projectId: number;
}): Promise<Task> {
  return request<Task>("/tasks", jsonInit("POST", data));
}

export function updateTaskStatus(id: number, status: string): Promise<Task> {
  return request<Task>(`/tasks/${id}`, jsonInit("PATCH", { status }));
}

export async function deleteTask(id: number): Promise<void> {
  await request<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" });
}

// 詳細モーダルからの「まとめて編集」用。全項目を送る。
export function updateTask(
  id: number,
  data: {
    title: string;
    description: string;
    type: string;
    assigneeId: number | null;
    priority: string;
    status: string;
    dueDate: string | null;
  },
): Promise<Task> {
  return request<Task>(`/tasks/${id}`, jsonInit("PATCH", data));
}

// ---------- コメント ----------
export function getComments(taskId: number): Promise<Comment[]> {
  return request<Comment[]>(`/tasks/${taskId}/comments`);
}

export function addComment(taskId: number, body: string): Promise<Comment> {
  return request<Comment>(`/tasks/${taskId}/comments`, jsonInit("POST", { body }));
}

// ---------- 変更履歴 ----------
export function getActivities(taskId: number): Promise<Activity[]> {
  return request<Activity[]>(`/tasks/${taskId}/activities`);
}
