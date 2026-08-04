// ESLint 設定（フラットコンフィグ形式）。バグの匂いや危険な書き方を警告する。
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules", "dist", "prisma/dev.db"] },
  js.configs.recommended, // JavaScriptの推奨ルール
  ...tseslint.configs.recommended, // TypeScriptの推奨ルール
  prettier, // Prettierと衝突する整形系ルールをOFF（整形はPrettierに任せる）
);
