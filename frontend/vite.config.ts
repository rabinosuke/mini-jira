import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Dockerの外（ブラウザ）からアクセスできるように
    port: 5173,
    // /api で始まるリクエストはバックエンド(Hono)に転送する。
    // これでフロントは同一オリジン扱いになり、CORSで悩まなくて済む。
    proxy: {
      "/api": "http://backend:8000",
    },
    // Docker上ではファイル変更の検知にポーリングが必要な場合がある
    watch: { usePolling: true },
  },
});
