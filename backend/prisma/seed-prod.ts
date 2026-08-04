// 本番用の初期管理者作成スクリプト（ダミーデータは入れない）。
// 実行: docker compose -f docker-compose.prod.yml exec backend npx tsx prisma/seed-prod.ts
// 環境変数 ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME を読む。
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "管理者";

  if (!email || !password) {
    console.error("ADMIN_EMAIL と ADMIN_PASSWORD を環境変数で指定してください");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`管理者は既に存在します: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { name, email, role: "manager", passwordHash },
  });

  // プロジェクトが1つも無ければ、最初のプロジェクトを作る
  const projectCount = await prisma.project.count();
  if (projectCount === 0) {
    const project = await prisma.project.create({
      data: { name: "はじめてのプロジェクト", key: "FIRST" },
    });
    await prisma.projectMember.create({ data: { projectId: project.id, userId: admin.id } });
  }

  console.log(`管理者を作成しました: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
