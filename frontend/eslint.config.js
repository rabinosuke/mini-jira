// ESLint 設定（フラットコンフィグ）。React/TypeScript向けの推奨ルール。
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules", "dist"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // フックの使い方の間違い（依存配列漏れ等）を警告
      ...reactHooks.configs.recommended.rules,
      // Vite高速リロードのための制約
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  prettier, // 整形系ルールをOFF（整形はPrettierに任せる）
);
