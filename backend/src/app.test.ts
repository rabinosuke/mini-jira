// mini-Jira バックエンドの統合テスト（Vitest）。
// app.request() でエンドポイントをメモリ内で叩く（サーバー起動なし）。
// 専用のテストDB(test.db)に対して実行する（package.json の test スクリプト参照）。
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { app, prisma } from "./app";

let managerCookie = "";
let devCookie = "";
let projectId = 0;
let ownTaskId = 0; // 開発者(dev)が担当するタスク
let otherTaskId = 0; // 別の開発者が担当するタスク

// リクエスト補助：Content-Type とログイン cookie を付けて叩く
async function req(
  path: string,
  init: { method?: string; body?: string; headers?: Record<string, string> } = {},
  cookie = "",
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  };
  if (cookie) headers.Cookie = cookie;
  return app.request(path, { method: init.method, body: init.body, headers });
}

function cookieOf(res: Response): string {
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}

beforeAll(async () => {
  // テストDBを初期化
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.session.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password", 10);
  const mgr = await prisma.user.create({
    data: { name: "Mgr", email: "m@test.com", role: "manager", passwordHash },
  });
  const dev = await prisma.user.create({
    data: { name: "Dev", email: "d@test.com", role: "developer", passwordHash },
  });
  const other = await prisma.user.create({
    data: { name: "Other", email: "o@test.com", role: "developer", passwordHash },
  });
  const p = await prisma.project.create({ data: { name: "Test", key: "TP" } });
  projectId = p.id;
  const t1 = await prisma.task.create({
    data: { title: "dev task", projectId: p.id, reporterId: mgr.id, assigneeId: dev.id },
  });
  const t2 = await prisma.task.create({
    data: { title: "other task", projectId: p.id, reporterId: mgr.id, assigneeId: other.id },
  });
  ownTaskId = t1.id;
  otherTaskId = t2.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("認証", () => {
  it("正しい資格情報でログインでき、cookieが発行される", async () => {
    const res = await req("/api/login", {
      method: "POST",
      body: JSON.stringify({ email: "m@test.com", password: "password" }),
    });
    expect(res.status).toBe(200);
    managerCookie = cookieOf(res);
    expect(managerCookie).toContain("sessionId");
  });

  it("開発者もログインできる", async () => {
    const res = await req("/api/login", {
      method: "POST",
      body: JSON.stringify({ email: "d@test.com", password: "password" }),
    });
    expect(res.status).toBe(200);
    devCookie = cookieOf(res);
  });

  it("誤ったパスワードは401", async () => {
    const res = await req("/api/login", {
      method: "POST",
      body: JSON.stringify({ email: "m@test.com", password: "wrong" }),
    });
    expect(res.status).toBe(401);
  });

  it("未ログインで /api/tasks は401", async () => {
    const res = await req("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("/api/me はログイン中のユーザーを返す", async () => {
    const res = await req("/api/me", {}, managerCookie);
    const me = (await res.json()) as { role: string } | null;
    expect(me?.role).toBe("manager");
  });
});

describe("認可（ロール別）", () => {
  it("管理者はタスクを作成できる(201)", async () => {
    const res = await req(
      "/api/tasks",
      { method: "POST", body: JSON.stringify({ title: "新規", projectId }) },
      managerCookie,
    );
    expect(res.status).toBe(201);
  });

  it("開発者はタスクを作成できない(403)", async () => {
    const res = await req(
      "/api/tasks",
      { method: "POST", body: JSON.stringify({ title: "x", projectId }) },
      devCookie,
    );
    expect(res.status).toBe(403);
  });

  it("開発者は自分の担当タスクを更新できる(200)", async () => {
    const res = await req(
      `/api/tasks/${ownTaskId}`,
      { method: "PATCH", body: JSON.stringify({ status: "in_progress" }) },
      devCookie,
    );
    expect(res.status).toBe(200);
  });

  it("開発者は他人の担当タスクを更新できない(403)", async () => {
    const res = await req(
      `/api/tasks/${otherTaskId}`,
      { method: "PATCH", body: JSON.stringify({ status: "done" }) },
      devCookie,
    );
    expect(res.status).toBe(403);
  });

  it("開発者はプロジェクトを作成できない(403)", async () => {
    const res = await req(
      "/api/projects",
      { method: "POST", body: JSON.stringify({ name: "x", key: "XX" }) },
      devCookie,
    );
    expect(res.status).toBe(403);
  });
});

describe("プロジェクトのスコープと検索", () => {
  it("projectId でタスクが絞り込まれる", async () => {
    const res = await req(`/api/tasks?projectId=${projectId}`, {}, managerCookie);
    const tasks = (await res.json()) as Array<{ projectId: number }>;
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.projectId === projectId)).toBe(true);
  });

  it("キーワードでタイトルを検索できる", async () => {
    const res = await req(`/api/tasks?projectId=${projectId}&q=dev`, {}, managerCookie);
    const tasks = (await res.json()) as Array<{ title: string }>;
    expect(tasks.some((t) => t.title.includes("dev"))).toBe(true);
  });
});

describe("コメント", () => {
  it("コメントを投稿できる(201)", async () => {
    const res = await req(
      `/api/tasks/${ownTaskId}/comments`,
      { method: "POST", body: JSON.stringify({ body: "レビューOK" }) },
      devCookie,
    );
    expect(res.status).toBe(201);
  });

  it("コメント一覧を取得できる", async () => {
    const res = await req(`/api/tasks/${ownTaskId}/comments`, {}, devCookie);
    const list = (await res.json()) as unknown[];
    expect(list.length).toBeGreaterThan(0);
  });
});

describe("変更履歴", () => {
  it("タスクを更新すると変更履歴が記録される", async () => {
    await req(
      `/api/tasks/${ownTaskId}`,
      { method: "PATCH", body: JSON.stringify({ priority: "high" }) },
      devCookie,
    );
    const res = await req(`/api/tasks/${ownTaskId}/activities`, {}, devCookie);
    const acts = (await res.json()) as unknown[];
    expect(acts.length).toBeGreaterThan(0);
  });
});

describe("セキュリティ", () => {
  it("レスポンスにセキュリティヘッダが付く", async () => {
    const res = await req("/api/health");
    expect(res.headers.get("x-frame-options")).toBeTruthy();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("/api/users に passwordHash が含まれない", async () => {
    const res = await req("/api/users", {}, managerCookie);
    const users = (await res.json()) as Array<Record<string, unknown>>;
    expect(users[0]).not.toHaveProperty("passwordHash");
  });

  it("レート制限：同一IPで11回目のログインは429", async () => {
    const xff = "203.0.113.7"; // テスト用の偽IP（他テストのIPと分離）
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await app.request("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": xff },
        body: JSON.stringify({ email: "m@test.com", password: "wrong" }),
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
