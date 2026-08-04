# mini-Jira 本番デプロイ手順書（jira.coco-lab.io）

COCO LAB(myblog) が動いている VPS に、mini-jira を **jira.coco-lab.io** として相乗りさせる手順。
COCO LAB nginx を唯一のTLS窓口にして、jira.coco-lab.io を mini-jira スタックへ中継する。

```
[COCO LAB nginx] --coco-lab.io--------> Django(COCO LAB)   ※既存
   (80/443)      --jira.coco-lab.io----> mini-jira web(nginx) --> backend / postgres
                         ↑ 共有ネットワーク "shared" 経由（minijira-web）
```

---

## 0. 前提（先に済ませる）

- **DNS**: `jira.coco-lab.io` の A レコードを VPS の IP に向ける（証明書取得に必須）
  - `dig +short jira.coco-lab.io` で VPS の IP が返ることを確認
- **コードをVPSへ**: GitHub に push → VPS で clone（CI/CD は Phase 3）
  ```
  cd /home/blog        # 任意の作業ディレクトリ
  git clone <mini-jira のリポジトリURL> mini-jira
  cd mini-jira
  cp .env.production.example .env
  # .env を編集：POSTGRES_PASSWORD / DATABASE_URL / ADMIN_* を本番値に
  ```

---

## 1. 共有ネットワークを作る（VPS・初回のみ）

COCO LAB nginx と mini-jira を繋ぐネットワーク。

```
docker network create shared
```

## 2. COCO LAB(myblog) の nginx を共有ネットワークに参加させる

`myblog/docker-compose.prod.yml` の **nginx サービス**に networks を追加し、
ファイル末尾に外部ネットワーク宣言を足す：

```yaml
services:
  nginx:
    # ...既存の設定はそのまま...
    networks:
      - default
      - shared

# ファイル末尾（volumes: と同じ階層）に追加
networks:
  shared:
    external: true
```

反映（nginx を作り直して shared に参加）：

```
cd /path/to/myblog
docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
```

## 3. mini-jira スタックを起動（VPS）

```
cd /path/to/mini-jira
docker compose -f docker-compose.prod.yml up -d --build
```

初期管理者を作成（.env の ADMIN_* を使用）：

```
docker compose -f docker-compose.prod.yml exec backend npx tsx prisma/seed-prod.ts
```

疎通確認（VPS内部から）：

```
curl -I http://127.0.0.1:8081/         # web が index.html を返す
curl http://127.0.0.1:8081/api/health  # {"ok":true}
```

## 4. jira.coco-lab.io の証明書を取得

まず **HTTP(80) の server ブロックだけ**を COCO LAB nginx に追加する。
`deploy/nginx-jira.conf` の中の「HTTP(80)」ブロックを
`myblog/docker/nginx.prod.conf` の `http { ... }` の中に貼り付け、nginx をリロード：

```
cd /path/to/myblog
docker compose -f docker-compose.prod.yml exec nginx nginx -t     # 構文チェック
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

証明書を取得（myblog の certbot サービスを利用）：

```
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot -d jira.coco-lab.io
```

`/etc/letsencrypt/live/jira.coco-lab.io/` に証明書ができれば成功。
（以降の自動更新は既存の certbot コンテナが面倒を見る）

## 5. HTTPS(443) ブロックを追加して公開

`deploy/nginx-jira.conf` の「HTTPS(443)」ブロックを同じ `http { ... }` 内に貼り付け、リロード：

```
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## 6. 動作確認

```
curl -I https://jira.coco-lab.io/            # 200 + セキュリティヘッダ
curl https://jira.coco-lab.io/api/health     # {"ok":true}
```

ブラウザで https://jira.coco-lab.io を開き、初期管理者
（.env の ADMIN_EMAIL / ADMIN_PASSWORD）でログインできればデプロイ完了。

---

## 更新（2回目以降のデプロイ）

Phase 3 の GitHub Actions（`deploy.yml`）で自動化予定。手動なら：

```
cd /path/to/mini-jira
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## GitHub Secrets（deploy.yml 用）

GitHub → リポジトリ → Settings → Secrets and variables → Actions → New repository secret で登録：

| 名前 | 値 |
|------|----|
| `DEPLOY_HOST` | VPSのホスト名 or IP |
| `DEPLOY_USER` | SSHログインユーザー |
| `DEPLOY_SSH_KEY` | SSH秘密鍵（このユーザーでVPSに入れる鍵） |
| `DEPLOY_PATH` | VPS上の mini-jira ディレクトリ（例: /home/blog/mini-jira） |

- **CI（ci.yml）**: push/PRで自動実行（テスト＋lint＋build）。Secrets不要。
- **Deploy（deploy.yml）**: Actionsタブから手動実行（workflow_dispatch）。上のSecretsが必要。

## 公開前チェック

- [ ] `.env` の POSTGRES_PASSWORD / ADMIN_PASSWORD を強力な値にした
- [ ] Login.tsx の「お試し用 …」ヒントを本番では消す（ダミー垢は本番に無い）
- [ ] CSP を Report-Only で1週間監視 → 問題なければ enforce に切替
- [ ] DB(postgres)はホストにポート公開していない（compose.prod は非公開）
