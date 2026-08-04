// エントリポイント：サーバーを起動するだけ（アプリ本体は app.ts）
import { serve } from "@hono/node-server";
import { app } from "./app";

const port = 8000;
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
console.log(`backend running on http://localhost:${port}`);
