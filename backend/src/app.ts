// Honoアプリ本体：ミドルウェア設定 ＋ ルーターのマウント
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv } from "./env";
import { isProd } from "./env";
import { prisma } from "./prisma";
import { getSessionUser, getSessionId } from "./lib/session";
import { auth } from "./routes/auth";
import { projects } from "./routes/projects";
import { tasks } from "./routes/tasks";

const app = new Hono<AppEnv>();

// セキュリティヘッダ（X-Frame-Options / X-Content-Type-Options 等）
app.use("*", secureHeaders());

// CORSは許可オリジンを限定（本番は jira.coco-lab.io のみ）
const ALLOWED_ORIGINS = isProd ? ["https://jira.coco-lab.io"] : ["http://localhost:5173"];
app.use("/api/*", cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// 認証ミドルウェア：公開パス以外はログイン必須
const PUBLIC_PATHS = ["/api/login", "/api/register", "/api/logout", "/api/me", "/api/health"];
app.use("/api/*", async (c, next) => {
  if (PUBLIC_PATHS.includes(c.req.path)) return next();
  const user = await getSessionUser(getSessionId(c));
  if (!user) return c.json({ error: "ログインが必要です" }, 401);
  c.set("user", user);
  await next();
});

// ルーターを /api にマウント
app.route("/api", auth);
app.route("/api", projects);
app.route("/api", tasks);

export { app, prisma };
