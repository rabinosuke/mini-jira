# mini-Jira

Reactの学習用に作る、Jiraのミニ版タスク管理アプリ。
管理者がタスクを作って担当者に割り当て、担当者はカンバンで自分のタスクを進める。

## 技術スタック

- フロント: React + TypeScript + Vite
- バック: Node.js + TypeScript + Hono
- DB操作: Prisma（ORM）
- DB: SQLite（開発）→ PostgreSQL（本番予定）
- 環境: Docker Compose で完結（Macに何もインストール不要）

## 開発の始め方

```bash
docker compose up --build
```

- フロント: http://localhost:5173
- バックのAPI: http://localhost:8000/api/health

初回起動時に自動でテーブル作成＋ダミーデータ投入まで行う。

停止:

```bash
docker compose down
```

DBを作り直したいとき（ダミーデータを入れ直す）:

```bash
docker compose down
rm backend/prisma/dev.db
docker compose up
```

## フォルダ構成

```
mini-jira/
├─ frontend/   React + Vite + TypeScript
├─ backend/    Node + Hono + Prisma + TypeScript
│  └─ prisma/schema.prisma  ← DB設計
└─ docker-compose.yml       ← 開発用
```

## DB設計（5テーブル）

- **User** … 人（manager / developer）
- **Project** … 案件の単位
- **ProjectMember** … 誰がどのPJにいるか（多対多の中間テーブル）
- **Task** … 課題本体（project / assignee / reporter に紐づく）
- **Comment** … タスクへのコメント（後のフェーズで使う）

## ロードマップ

- [x] フェーズ1: カンバン表示・タスク作成・状態変更・担当者フィルタ
- [x] 追加: タスク削除・詳細/編集モーダル（説明・期限つき）
- [x] 品質: Prettier + ESLint 導入
- [x] フェーズ3: ログイン（認証・DBセッション・ロール権限）
- [x] フェーズ2: 管理者/開発者ビューの分離（作成・削除・編集の可否）
- [x] 機能拡張: 課題タイプ / コメント / 変更履歴 / キーワード検索
- [x] 機能拡張: ドラッグ&ドロップ / ユーザー新規登録 / 複数プロジェクト
- [x] 品質: 公開前セキュリティ（レート制限 / CORS制限 / セキュリティヘッダ）
- [x] 品質: バックエンド統合テスト（Vitest・18項目）
- [ ] スプリント・期限アラート（将来）
- [ ] プロジェクトのメンバー招待・可視性制御（将来）
- [ ] 仕上げ: ログイン試行のレート制限・CORS本番限定・nginxセキュリティヘッダ
- [ ] 本番: jira.coco-lab.io に配置（COCO LAB nginx に相乗り・PostgreSQL移行）

## ログイン（開発用）

- 管理者: `manager@example.com` / `password`
- 開発者: `dev1@example.com` または `dev2@example.com` / `password`
