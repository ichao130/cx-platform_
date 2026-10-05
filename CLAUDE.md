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

## 📊 流入計測（AnalyticsPage）の集計の出どころ — 触る前に必ず読む

この画面は **同じ数字を3つの経路で出せる**ため、どれを使うかを間違えると
「タブによって数字が違う」「0件になる」事故が起きる。2026-10-03 に実際に5件起きた。

### 鉄則：ブラウザから `logs` を期間ぶん読もうとするな

- **Firestoreクライアントの `limit` は1クエリ10,000件が上限**。超えると
  `Limit value in the structured query is over the maximum value of 10000` で
  **クエリ自体が失敗する**（20,000を指定して全画面PV=0になった）。
- `startAfter` で分割すれば越えられるが、実測で
  American Needle は **14日=60,745件 / 30日=99,247件**、Premiere は 14日=40,031件。
  全部読むと **40〜80秒・47〜77MB**。実用にならない。

### 3つの出どころと使い分け

| 出どころ | 内容 | 使う場面 |
|---|---|---|
| `stats_daily` | PV/セッション/UV/新規/リピート/施策別imp・click・CV | トレンドグラフ、施策ファネル、ダッシュボードと揃えたいCV |
| `pv_daily`（サーバー集計） | PV・セッション・直帰率・ページ別・離脱・**流入元別セッション＋売上**・地域・キャンペーン・新規/リピート | 流入タブ・ページタブ・環境タブ。**期間集計はすべてここ** |
| `logs`（生ログ・ブラウザ） | 訪問者カードのPV/流入元、旧データの施策ラストタッチ帰属 | **訪問者タブと施策タブだけ**。それ以外で使うな |

`pv_daily` は `functions/src/services/pvAggregates.ts`。
日次ロールアップは `rollupPvDailyAll`（JST 4:00）。未集計の日はAPI側で最大3日ぶん即時集計する。

### やりがちな間違い（全部実際にやった）

1. **読み込み中に確定値として描画する**
   訪問者タブで生ログ取得前に描画し、購入ログだけで組まれた訪問者が
   **「0 PV / 流入元: 直接流入」**と出て不具合に見えた。読み込み中はスケルトンを出すこと。

2. **「分からない」を「直接流入」の既定値に落とす**
   購入ログは `utm_source` / `ref` / `referrer_app` を**すべて null** で記録する
   （サンクスページ・Webhookで参照元が失われる）。だから流入元は同じ vid の
   pageview から引くしかない。引けなかったときは `"(流入元不明)"` に寄せる。
   既定値を `"直接流入"` にすると**売上が全部直接流入**になる。

3. **生ログ依存の計算を全タブ共通エリアに置く**
   訪問頻度分布・リターンスパン分布・施策別CVトレンドがそれ。
   生ログを読まないタブでは無言で消えるか、タブごとに売上が変わる。
   → 生ログ依存のUIは**そのタブの中に置く**。

4. **同じ指標を2つの出どころで出す**
   新規/リピートのグラフは `stats_daily`、見出しの人数は生ログ（visitorList）で
   数えていたため、**グラフに棒が立っているのに見出しが0人**になった。
   指標ごとに出どころを1つに決めること。

5. **サーバー側で `order_id` の重複排除を忘れる**
   同じ注文が SDK と Shopify Webhook の両方から記録されることがある。
   画面側(`purchaseLogs`)は排除しているので、サーバーで排除しないと
   流入タブの売上だけ多くなる。

6. **「売上0」と「まだ集計していない」を区別しない**
   `readPvAggregatesFromDaily` は常に `revenue: 0` を返すので、値の有無では判定できない。
   `PvDailyDoc.v >= 2` を見て `revenueBySourceReady` を返し、画面はそれで切り替える。
   **`pvAggregates.ts` の保存内容を増やしたら `v` を上げて `--force` で再集計すること。**

7. **`--only functions:api` に絞ってデプロイする**
   `pvAggregates.ts` は **`api` と `rollupPvDailyAll` の両方**が使う。
   `api` だけ更新すると日次ロールアップが旧コードで走り続け、
   翌朝から `v=1` のドキュメントが積まれて `revenueBySourceReady` が false に落ちる。
   症状は「数日前までは正しいのに、最近の日が入ると売上が1か所に寄る」。
   → **`pvAggregates.ts` を変えたら `--only functions`（全関数）でデプロイする。**

8. **`resolveSource()` の既定値 `"直接流入"` を踏む**
   `resolveSource("","","")` は `"直接流入"` を返す。
   購入ログだけから作られた訪問者（`pvCount === 0`）は流入元フィールドが全部空文字なので、
   そのまま `vidSourceMap` に入れると **`|| "(流入元不明)"` のガードが効かない**
   （`undefined` ではなく `"直接流入"` が返るため）。
   → `vidSourceMap` を作るときは `pvCount === 0` の訪問者を除外する。
   「分からない」を既定値で埋める実装は、既定値が無害に見えても必ず事故になる。

### 訪問者リストは「直近◯人」であって「期間の全員」ではない

表示上限が1,000人なので、**vidが1,200人ぶん集まったら取得を打ち切る**
（新しい順に取っているので打ち切っても直近◯人として正しい）。
American Needle が1クエリ・数秒で開くのはこのため。画面に「直近◯人（◯◯以降）」と明示している。

ただし**購入者・CV者は期間の古い側にもいる**。打ち切りに入らなかった人は
`vid in [...]`（30件ずつ）で取り直して補完する（`extraJourneyLogs` → `journeyLogsAll`）。
これを忘れると購入者が「0 PV / 直接流入」で並ぶ。
複合インデックス `site_id + vid + createdAt` は定義済み。

### 既知の制約（直っていない。数字を読むときに留意）

- `pv_daily` の `visitors` / `buyers` は**日ごとのユニークの合算**。期間ユニークではない。
- 流入元の売上帰属は**購入と同じ日の初回接触**。日をまたぐ検討期間は追わない。
  同日に pageview が無い購入は `"(流入元不明)"`（American Needle で13%程度）。
- 深夜をまたぐセッションは両日で直帰扱いになりうる（日次集計の原理的な限界）。
- 流入元名が `google` と `www.google.com`、`instagram` と `ig` のように
  **utm_source と参照元ドメインで別枠になる**。正規化していない。
- `stats_daily` の新規/リピート内訳は水増し（CLAUDE.md 冒頭の節を参照）。
  `pv_daily` の `newVisitors`/`repeatVisitors` は実測で **新規+リピート = UV と完全一致**するので、
  グラフをこちらに移すとより正確になる（未着手）。

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
