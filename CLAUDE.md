# cx-platform CLAUDE.md
開発上の仕様・設計メモ。コード変更時は必ずここを参照・更新すること。

---

## 🔔 大型案件・大口クライアント投入前の必須チェック（忘れやすい）

**大型案件／大口クライアント／アクセス急増が見込まれる時は、投入前に必ず stats 集計の cutover を行うこと。**

現状 `stats_daily` のUV/セッション集計は **dual-write（安全側）** で動作中（`STATS_LEGACY_DUAL_WRITE=true`）。この状態のままだと**レガシーの arrayUnion 方式が残り、大型トラフィックで Firestore の 1MiBドキュメント上限に当たってログ欠損する**。

**cutover手順:**
1. 新しい分散カウンタ（uv/session/new/repeat）がレガシーと概ね一致するか数日で確認
2. `functions/.env.cx-platform-v1` に `STATS_LEGACY_DUAL_WRITE=false` を追加 → `firebase deploy --only functions:api --project cx-platform-v1`
3. これで arrayUnion 停止＝1MiBリスク消滅。読み取りは自動で分散カウンタにフォールバック（無停止）

詳細は本ファイル末尾「stats集計のスケール設計」節、または実装は `functions/src/routes/v1.ts` の `STATS_LEGACY_DUAL_WRITE` / `pickStatShard()`。

---

## プロジェクト構成

| ディレクトリ | 役割 |
|---|---|
| `admin/` | React管理画面（Vite + TypeScript） |
| `functions/` | Firebase Cloud Functions（Express API） |
| `public/` | Firebase Hosting（sdk.js、shopify-connect.html等） |
| `backyard/` | 内部管理画面 |

**ビルド手順**
```bash
# adminビルド（public/に出力される）
cd admin && npm run build

# backyardビルド（public/ops/に出力される）
cd backyard && npm run build

# functionsビルド
cd functions && npm run build

# デプロイ
firebase deploy
```

**⚠️ 注意**: `backyard/` を変更した場合も必ずビルドすること。ビルドせずにデプロイすると `public/ops/index.html` が古い JS ハッシュを参照してMIMEエラーになる。

---

## Firestoreコレクション設計

### トップレベルコレクション
- `workspaces/{workspaceId}` — ワークスペース
- `sites/{siteId}` — サイト
- `scenarios/{scenarioId}` — シナリオ
- `actions/{actionId}` — アクション
- `templates/{templateId}` — テンプレート
- `logs/{logId}` — 訪問ログ（Cloud Functionsのみ書き込み）
- `stats_daily/{statId}` — 日別統計（Cloud Functionsのみ書き込み）
- `shopify_stores/{storeId}` — Shopify連携ストア情報

### 重要なフィールド
- `scenarios` は `actionRefs`（順序付きリスト）でアクションを参照。SDKへの配信時にサーバー側で展開する
- `sites.memberUids` — そのサイトにアクセスできるユーザーUIDの配列
- `workspaces.members` — `{ uid: role }` のマップ（role: owner/admin/member/viewer）

---

## アクセス制御設計

### ワークスペースのロール
| ロール | 権限 |
|---|---|
| `owner` | 全操作可能 |
| `admin` | ワークスペース削除以外全操作可能 |
| `member` | 自分のサイトのみ閲覧・編集 |
| `viewer` | 自分のサイトのみ閲覧 |

### サイトへのアクセス制御（`sites.memberUids`）
- **owner / admin** → 招待承認時にワークスペース内の全サイトの `memberUids` に自動追加される
- **member / viewer** → サイトごとに個別追加（`/v1/sites/members/add` 経由）
- 自動追加のロジック: `functions/src/routes/v1.ts` の招待承認処理（acceptInvite）内に実装済み

### フロント側クエリの注意
ページによってサイト取得クエリが異なる：
- `ScenariosPage` → `memberUids array-contains uid` で絞る
- `AnalyticsPage` / `DashboardPage` → `workspaceId` で絞る（adminは全サイト見える前提）
- `SitesPage` → owner/adminなら `workspaceId`、それ以外は `memberUids` で切り替え

### Firestoreセキュリティルール
- `sites` / `scenarios` / `logs` / `stats_daily` は「認証済みなら読み取り可」になっている
- フロント側クエリで絞ることを前提とした設計（ルール側では細かく制御していない）
- 将来的にルール側でも制御を強化する場合は、`get()` のコストに注意

---

## Shopify連携（MOKKEDA CONNECT）

### 概要
ShopifyストアにSDK（`sdk.js`）を自動インストールするためのアプリ。

### 認証フロー
1. マーチャントがShopify管理画面からアプリを開く
2. `shopify-connect.html` がApp Bridgeで `idToken()` を取得
3. `/shopify/token-exchange` でセッショントークン → オフラインアクセストークンに交換
4. トークンをFirestoreの `shopify_stores/{storeId}` に保存
5. ScriptTag（`sdk.js`）をShopifyストアに登録

### トークンの仕様
- オフラインアクセストークンは24時間で期限切れ
- **自動更新なし**。マーチャントがアプリを開いた時だけ更新される
- トークンが期限切れでも **計測・施策は継続して動く**（ScriptTagは登録済みのため）
- トークンが必要なのはScriptTagの再登録時のみ

### GDPR Webhook
`shopify.app.toml` に登録済み。エンドポイントは `functions/src/routes/shopify.ts` に実装：
- `customers/data_request` — 顧客データ開示リクエスト
- `customers/redact` — 顧客データ削除リクエスト
- `shop/redact` — ショップデータ削除リクエスト（アンインストール後48時間）

### 環境変数
`functions/.env.cx-platform-v1` に設定（gitignore済み）：
- `SHOPIFY_API_KEY` — クライアントID
- `SHOPIFY_API_SECRET` — APIシークレット
- `SHOPIFY_APP_URL` — アプリのベースURL

---

## デプロイ

```bash
# 全体デプロイ（--project 必須）
firebase deploy --project cx-platform-v1

# Hostingのみ（adminビルド後）
firebase deploy --only hosting --project cx-platform-v1

# Functionsのみ
firebase deploy --only functions:api --project cx-platform-v1
```

**⚠️ 注意**: `--project cx-platform-v1` を省略するとサイト名解決エラーになる。

**注意**: adminのビルドをせずにHostingをデプロイすると古いJSが配信される。
必ず `cd admin && npm run build` してからデプロイすること。
