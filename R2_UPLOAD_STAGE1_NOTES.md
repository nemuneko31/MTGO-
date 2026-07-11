# R2_UPLOAD_STAGE1_NOTES.md — 画像共有 第1段階（サーバー基盤）実装記録

作成日: 2026-07-11
対象: server.js / package.json（**card-practice-table.html は無変更**）
基準: collab-fix-stable-20260705。IMAGE_SHARING_DESIGN.md 第1段階＋R2_SETUP_NOTES.md の環境変数名に準拠。

## 概要
Render上の server.js から Cloudflare R2 へカード画像をアップロードし、公開 imageUrl を返すAPIを追加した。**IMG環境変数5つが揃った時だけ有効**で、未設定時は image store のみ無効（オンライン対戦・Postgres共有辞書/デッキ・imageUrl表示に影響なし・アプリは通常起動）。

## 環境変数（すべて揃った時のみ有効）
| Key | 内容 |
|---|---|
| `IMG_S3_ENDPOINT` | R2のS3互換エンドポイント（`https://<AccountID>.r2.cloudflarestorage.com`） |
| `IMG_S3_BUCKET` | バケット名 |
| `IMG_S3_ACCESS_KEY_ID` | APIトークンの Access Key ID |
| `IMG_S3_SECRET_ACCESS_KEY` | APIトークンの Secret Access Key |
| `IMG_PUBLIC_BASE_URL` | 公開配信ベースURL（`https://pub-xxxx.r2.dev`・末尾スラッシュは自動正規化） |
| （既存）`SHARED_ADMIN_PASSWORD` | アップロードに必須の管理パスワード |

依存追加: `@aws-sdk/client-s3`（^3.600.0）。**有効時のみ require**（pg と同方式）のため、未設定環境ではSDK未インストールでも起動する。S3Client も有効時のみ初期化。

## API仕様

### GET /api/shared-images-status
- 有効: `{"enabled":true,"provider":"R2","maxBytes":2097152,"allowedTypes":["image/png","image/jpeg","image/webp","image/gif"]}`
- 無効: `{"enabled":false,"reason":"environment variables are not configured"}`
- 秘密値・バケット名・Endpoint は返さない。

### POST /api/shared-images
- リクエスト: ヘッダ `x-admin-password`（必須）・`Content-Type: image/png|image/jpeg|image/webp|image/gif`・body=画像の生バイナリ（multipart不使用）。ファイル名はクライアントから受け取らない/信用しない。
- 成功 200: `{"ok":true,"key":"images/<sha256>.<ext>","imageUrl":"<IMG_PUBLIC_BASE_URL>/images/<sha256>.<ext>","sha256":"...","size":N,"contentType":"image/..."}`
- エラー: R2無効=503 / pw不一致・未指定=401 / 2MB超過=413（応答送信後に受信を安全停止・サーバーは落ちない）/ 非対応Content-Type（SVG含む）=415 / マジックバイト不一致・空body=400 / 保存失敗=500（詳細・秘密値は本文にもログにも出さない）。

## 保存仕様
- 画像内容の SHA-256 を計算し、キーは `images/<sha256>.<ext>`（ext: png/jpg/webp/gif）。**同一画像は同一キー＝重複保存されない**。
- `PutObjectCommand` で `ContentType` を正しく設定して保存。
- 公開URLは `IMG_PUBLIC_BASE_URL + "/" + key`（BASE_URL末尾の `/` は起動時に正規化）。

## セキュリティ制限
- アップロードは `SHARED_ADMIN_PASSWORD` 必須（既存 adminOk 再利用・未設定なら常に401）。
- 最大 2MB（`IMG_MAX_BYTES`）。超過はストリーム受信中に検知し即停止。
- 許可形式は png/jpeg/webp/gif のみ。**SVGは拒否**。Content-Type だけでなく**マジックバイト検査**（PNG署名/JPEG FFD8FF/GIF8/RIFF+WEBP）で偽装を拒否。
- 秘密値（キー・Endpoint全文・バケット名）はログ・レスポンス・エラー本文に出さない（起動ログは `image store: enabled (R2)` / `disabled (...)` の状態のみ）。

## 動作確認方法
1. **未設定時**: `npm start` → ログに `image store: disabled (environment variables are not configured)`。`/api/shared-images-status` が `enabled:false`、POSTは503。既存機能はすべて従来どおり。
2. **R2設定後（Render）**: 環境変数5つ＋`SHARED_ADMIN_PASSWORD` を投入→再デプロイ→ログに `image store: enabled (R2)`。
3. アップロード試験（手元から）:
   ```bash
   curl -X POST "https://<name>.onrender.com/api/shared-images" \
     -H "x-admin-password: <管理pw>" \
     -H "Content-Type: image/png" \
     --data-binary @card.png
   ```
   返却の `imageUrl` をブラウザで開いて画像が表示されればOK。そのURLを辞書エディタの「画像URL」欄に貼れば従来のimageUrl表示経路で全員に表示される。
4. 同じファイルを再アップロード→同じ `key` が返る（重複なし）ことを確認。

## 検証済み（fake S3/fake pg・実サーバー）
未設定起動・全disabled・既存API無傷 ／ 有効時: status（秘密値なし）・401（pwなし/誤り）・415（svg/text）・400（偽装PNG）・413（2MB超・応答後もサーバー生存）・正常PNG/JPEGで key=`images/<sha256>.<ext>`・URL正規化（末尾`///`→なし）・同一画像同一キー・PutObjectのBucket/Key/ContentType正値・共有辞書API併用OK ／ ログ/レスポンスに秘密値なし ／ オンライン回帰（pw部屋・lock・collab双方向・反射なし静止・chat・B手前）・imageUrl表示系・HTML md5 無変更。

## 次段階（第2段階・未実装）
card-practice-table.html の辞書編集画面に「画像をアップロード…」ボタンを追加し、成功時に返却 `imageUrl` を `#deImgUrl` へ自動入力する（表示側は既存チェーンのまま変更不要）。以降: 一覧/削除API（第3段階）・orphan検出（第4段階）。

## 既知の制限
- 公開URL方式のためURLを知っていれば誰でも閲覧可能（身内向け・秘匿画像や著作権のある画像は上げない）。
- 一覧・削除・orphan清掃・UIは未実装（本段階はAPIのみ。curl等での利用が前提）。
- アップロード帯域はサーバー経由（Render無料プランのスリープ/帯域の影響を受ける）。
- package-lock.json は配布物に含めていない（Renderの `npm install` が解決）。
