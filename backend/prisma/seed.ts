// 開発用のダミーデータ投入。
// すでにデータがあれば何もしない（起動のたびに実行されても安全）。
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("seed: 既にデータがあるのでスキップ");
    return;
  }

  // ダミーユーザーのパスワードは全員 "password"
  const passwordHash = await bcrypt.hash("password", 10);

  const manager = await prisma.user.create({
    data: { name: "田中マネージャー", email: "manager@example.com", role: "manager", passwordHash },
  });
  const dev1 = await prisma.user.create({
    data: { name: "佐藤エンジニア", email: "dev1@example.com", role: "developer", passwordHash },
  });
  const dev2 = await prisma.user.create({
    data: { name: "鈴木エンジニア", email: "dev2@example.com", role: "developer", passwordHash },
  });

  const project = await prisma.project.create({
    data: { name: "社内ツール開発", key: "MJ" },
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: manager.id },
      { projectId: project.id, userId: dev1.id },
      { projectId: project.id, userId: dev2.id },
    ],
  });

  const tasks = [
    {
      title: "ログイン画面を作る",
      type: "story",
      status: "todo",
      priority: "high",
      assigneeId: dev1.id,
    },
    {
      title: "DB設計を確定する",
      type: "task",
      status: "done",
      priority: "high",
      assigneeId: dev1.id,
    },
    {
      title: "カンバンUIを実装",
      type: "story",
      status: "in_progress",
      priority: "medium",
      assigneeId: dev2.id,
    },
    {
      title: "APIのエラー処理",
      type: "bug",
      status: "in_review",
      priority: "medium",
      assigneeId: dev2.id,
    },
    { title: "READMEを書く", type: "task", status: "todo", priority: "low", assigneeId: null },
  ];

  for (const t of tasks) {
    await prisma.task.create({
      data: { ...t, projectId: project.id, reporterId: manager.id },
    });
  }

  // 2つ目のプロジェクト（複数プロジェクトのデモ用）
  const projectB = await prisma.project.create({
    data: { name: "ECサイト構築", key: "EC" },
  });
  await prisma.projectMember.createMany({
    data: [
      { projectId: projectB.id, userId: manager.id },
      { projectId: projectB.id, userId: dev1.id },
      { projectId: projectB.id, userId: dev2.id },
    ],
  });
  const tasksB = [
    {
      title: "商品一覧ページ",
      type: "story",
      status: "todo",
      priority: "high",
      assigneeId: dev2.id,
    },
    {
      title: "カート機能",
      type: "story",
      status: "in_progress",
      priority: "high",
      assigneeId: dev1.id,
    },
    {
      title: "決済のバグ修正",
      type: "bug",
      status: "todo",
      priority: "medium",
      assigneeId: dev2.id,
    },
  ];
  for (const t of tasksB) {
    await prisma.task.create({
      data: { ...t, projectId: projectB.id, reporterId: manager.id },
    });
  }

  console.log("seed: ダミーデータを投入しました");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
