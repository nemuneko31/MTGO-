# SHARED_LIBRARY_STABLE_NOTES.md — 共有ライブラリ/imageUrl対応版の安定版記録

作成日: 2026-07-05
目的: カード辞書・デッキの共有保存/読込と imageUrl 表示を含む状態を、復旧可能な形で保存する。機能変更なし。

## バックアップ（本体とmd5一致・変更禁止）
- `card-practice-table.shared-library-stable-20260705.html` … md5 `f94c3b132e169827b684a86a393e8448`（996,836 bytes / appVersion 1.4.0 / dataVersion 4）
- `server.shared-library-stable-20260705.js` … md5 `0457ac61c339673dcb2c3717abf640ee`（22,819 bytes）
- `package.shared-library-stable-20260705.json` … md5 `26906ae8fad54f648b25fd22334e45dd`（依存: ws, pg）

## 直前の安定版（無変更・参照用）
- `card-practice-table.render-ready-stable-20260705.html` … `2a232d4a3c23ed19764866708635356b`
- `server.render-ready-stable-20260705.js` … `e6564e1ab1404b2aca661f7c73c480de`
- `card-practice-table.online-access-stable-20260704.html` … `e6aaf68ffbe5471bb52b2d6dddbd9812`
- `card-practice-table.online-ux-stable-20260704.html` … `ad77d7d37ff1236f674c90bea8cb4e5d`
- `card-practice-table.online-mvp-stable-20260702.html` … `b23c4cb62bfc4ad194a3f76fe16705a2`
- `card-practice-table.offline-stable-20260702.html` … `f7f889434462887b9ddcc2a529f41550`

---

## この版の内容
render-ready-stable-20260705 の全機能（クラウド対応 PORT/HOST・wss自動導出・ルームパスワード/ロック/最大8人・role別手前表示・自動同期/自動追従・ローカルUI非同期・スタック中身のみ同期 ほか）を**継承**した上で、共有ライブラリと imageUrl を追加:

- **共有カード辞書**: サーバーDBへ辞書を保存/読込（キー `card_library`）。
- **共有デッキ**: サーバーDBへデッキを保存/読込（キー `decks`）。
- **imageUrl対応**: 辞書エントリに `imageUrl`（任意）。表示優先度 ①ローカル画像(imageId) ②imageUrl ③辞書のimageUrl ④なし。http/https のみ・失敗時テキスト。
- **DATABASE_URL がある時だけ共有DB有効**。起動時に `CREATE TABLE IF NOT EXISTS shared_store(key text pk, data jsonb, version int default 1, updated_at timestamptz default now())` を試行。失敗してもアプリは落とさず共有のみ無効化。
- **DATABASE_URL 未設定時は共有機能のみ無効**（UIは「無効（DB未設定）」表示・API 503）。オフライン/オンライン対戦を含む既存機能は完全に従来どおり。
- **SHARED_ADMIN_PASSWORD で共有保存**（POSTに管理パスワード必須・誤り/未指定は401・読込は誰でも可）。パスワードはログ/レスポンスに出さない。
- **画像本体/IndexedDB画像は共有しない・imageUrl のみ共有**。
- **package.json に `pg` 追加**（DATABASE_URL がある時だけ require するため未設定/未インストールでも `npm start` 可）。**`npm install` が必要**（Renderの Build Command で実行）。

## API（同一オリジン）
- `GET /api/shared-status` → `{enabled, reason, adminConfigured}`
- `GET/POST /api/shared-library`（`{data:{cards:{…}}}`）
- `GET/POST /api/shared-decks`（`{data:{decks:[…]}}`）
- DB無効時は 503 `{ok:false, disabled:true, reason}`。POST は `x-admin-password` 必須。後勝ち保存・version++。

## UI
- ツールバー「共有」→ 共有モーダル（辞書/デッキの読込・保存、管理pw欄、状態表示）。
- 保存: 管理pw必須＋上書き確認・pwは保存しない。読込: マージ/上書き（強い確認＋自動バックアップ）/キャンセル。既存 save/render 流儀で反映し Undo/Redo を汚さない。
- 辞書編集画面に「画像URL（共有用・任意）」入力。

## 環境変数（Render等）
- `DATABASE_URL`（Postgres・未設定なら共有無効）／`SHARED_ADMIN_PASSWORD`（未設定なら保存不可・読込のみ）。既存 `PORT`（自動）/任意 `HOST`。

## 保存/Undoへの影響
- 追加保存キーなし（imageUrl は辞書エントリの一部）。共有の保存/読込・状態表示は盤面stateを変えず、読込反映も Undo/Redo を汚さない（上書き時は自動バックアップ）。

## 既知の制限
- 共有保存は身内向け。管理pwを知る人だけ保存でき**読込は誰でも可**・ブルートフォース対策なし。
- **画像本体は未対応**（imageUrl 外部URL参照のみ・CORS/ホットリンク禁止/リンク切れで非表示のことがある）。
- 後勝ち保存（マージ競合解決なし）。ルーム/オンライン状態はDBに保存しない（保存対象は辞書とデッキのみ）。
- ルーム/パスワードは従来どおりメモリ保持（再起動で消滅）。無料/低価格プランはスリープ/切断あり。ws は非TLS（Render/トンネルがTLS終端）。
- **stateには手札/ライブラリー順など全情報が含まれる**。URL/パスワードは信頼できる相手にだけ共有。本格運用にはユーザー認証・権限管理・画像ストレージが別途必要。

## 復旧手順
`card-practice-table.shared-library-stable-20260705.html` / `server.shared-library-stable-20260705.js` / `package.shared-library-stable-20260705.json` を、それぞれ `card-practice-table.html` / `server.js` / `package.json` にコピーで上書き。`npm install`（ws, pg）後に `npm start`。localStorage は dataVersion 4 のまま互換。共有機能を使わない/戻す場合は render-ready-stable-20260705 を使用（pg 依存なし）。
