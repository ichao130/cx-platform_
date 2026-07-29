# cx-platform CLAUDE.md
開発上の仕様・設計メモ。コード変更時は必ずここを参照・更新すること。

---

## 🔔 stats集計の cutover は「まだやるな」（2026-07-29 検証済み）

**⛔ 今 `STATS_LEGACY_DUAL_WRITE=false` にしてはいけない。UVが約17%消える。**

以前ここには「大型案件前に必ず cutover せよ」と書いてあったが、**2026-07-29 に実データで検証した結果、その手順は危険だと判明した**ので方針を反転した。

### 検証でわかったこと

`logs` から真値（distinct vid）を実測し、レガシー／分散カウンタと三者比較した結果（プルミエール 2026-07-17）:

| 指標 | 真値(logs) | レガシー(arrayUnion) | 分散カウンタ |
|---|---|---|---|
| UV | 588 | **588 ✅ 完全一致** | 486（**-17%**） |
| セッション | 700 | **700 ✅ 完全一致** | 593（-15%） |

- **レガシーは真値と1件の狂いもなく正確**。今の「レガシー優先」の読み取りは正しい。
- **分散カウンタは systematically 過少**（全サイト・全日でマイナス方向）。原因未特定。
  `uv_first`（SDKのlocalStorageマーカー）依存の数え方に穴があるとみられる。
- レガシーの **新規/リピート内訳だけは水増し**。同一vidが初回PVで `is_new=true`、
  後のPVで `is_new=false` となり両方の配列に入るため（重複を除くとUVと一致）。
  → 内訳の絶対数は信用しすぎない。合計（＝UV）は正しい。

### 1MiB上限までの余裕（急ぐ必要はない）

| 項目 | 実測 |
|---|---|
| 過去最大のUVドキュメント | 1,077 vids ＝ 33KB（1vid≈31 bytes） |
| 1MiB上限までの収容量 | **約30,000 vids/日** |
| 現在の使用率 | **3.5%（余裕28倍）** |
| 危険水域に入る規模 | **月100万セッション/サイト** |

**着手ライン: 1サイトで日次UVが1万を超えたら**（＝上限の1/3、月30万セッション規模）。
現状の約10倍なので、大口案件の話が出た時点で対応すれば間に合う。

### 将来やるときの正しい順序

1. **読み取り側を先に**「シャード合算＋新旧フォーマット両対応」に修正してデプロイ
   （`admin/src/pages/AnalyticsPage.tsx` の `uvLegacy` は現在 `= r.vids.length` の**代入**。
   シャード分割すると最後の1シャードだけ反映され**UVが約1/10に激減する**）
2. **書き込みのシャードは `hash(vid) % N` の決定的方式にする**
   （`pickStatShard()` は**ランダム**。arrayUnion をランダム分散すると同一vidが複数シャードに入り、
   長さの単純合計が**重複カウント**になる）
3. 分散カウンタの -17% の原因を特定・修正し、数日並走で一致を確認
4. 一致してから初めて `STATS_LEGACY_DUAL_WRITE=false`

実装は `functions/src/routes/v1.ts` の `STATS_LEGACY_DUAL_WRITE` / `pickStatShard()`、
読み取りは `admin/src/pages/AnalyticsPage.tsx`（レガシー優先→分散カウンタ→logsの3段フォールバック）。

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
