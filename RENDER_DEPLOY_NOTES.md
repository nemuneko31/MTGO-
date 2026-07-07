# RENDER_DEPLOY_NOTES.md — 常設サーバー（Render等）デプロイ手順

対象: card-practice-table のオンライン用 WebSocket サーバー（`server.js` + `card-practice-table.html` + `package.json`）
前提: online-access-stable-20260704 以降。ゲーム機能の追加ではなくデプロイ準備のみ。

---

## クラウド対応の要点（今回の変更）
- `server.js` の待受ポートは `const PORT = Number(process.env.PORT) || 8787;`（Render等は `process.env.PORT` を自動注入・ローカルは 8787）。
- bind ホストを `const HOST = process.env.HOST || "0.0.0.0";` にし、`httpServer.listen(PORT, HOST, …)` で全インターフェース待受（クラウドで外部公開可能・localhost からも到達可）。
- HTTP と WebSocket は**同一ポート**。クライアントはページのプロトコル/ホストから接続先を自動導出（`https:`→`wss://host` / `http:`→`ws://host`）するため、Renderの公開URL（https）で開けば自動的に `wss://<あなたのサービス>.onrender.com` に繋がります。

## Render Web Service 設定値
- Service 種別: **Web Service**（Static ではなく、常駐Nodeプロセスが必要）
- Environment: **Node**
- Build Command: **`npm install`**
- Start Command: **`npm start`**（= `node server.js`）
- Instance: 最小構成で可（下記スリープ注意）
- 環境変数: 基本不要。`PORT` は Render が自動設定。任意で `HOST`（既定 `0.0.0.0`）。
- ルートディレクトリ: `server.js` / `package.json` / `card-practice-table.html` が同じ階層にあるフォルダ。

## デプロイ手順（概略）
1. 上記3ファイルを1リポジトリに置いて GitHub 等へ push。
2. Render で New → Web Service → 対象リポジトリを選択。
3. Environment=Node / Build=`npm install` / Start=`npm start` を設定して Create。
4. 発行された `https://<name>.onrender.com` を開く → オンラインモーダルの接続先が `wss://<name>.onrender.com` に自動設定される（手動入力欄で上書きも可能）。
5. ルーム作成（必要ならパスワード設定）→ 招待情報の URL/Room を相手へ共有（**パスワードは別途手動共有**）。

## package.json 確認結果（変更なし）
- `scripts.start` = `node server.js` ✓
- `dependencies.ws` = `^8.18.0` ✓（余計な依存なし。`crypto` は Node 標準で依存不要）

## ローカル互換
- 従来どおり `npm install && npm start` で `http://localhost:8787` が起動・HTMLを配信。
- `PORT=9999 npm start` で任意ポート起動可（`http://localhost:9999`）。
- `file://` で直接開いた場合の接続先既定は従来どおり `ws://localhost:8787`。

## 既知の制限
- **ルーム/パスワードはサーバーのメモリ保持**（Redis等の外部保存なし）。デプロイ・再起動・クラッシュで**全ルームが消える**。空室は60秒でTTL削除。
- **無料/低価格プランはアイドルでスリープ**し、復帰時に再起動が入るため**進行中のWebSocketが切断**される（クライアントは自動再接続ONなら再接続を試み、再joinは可能だがルーム消滅時は不可）。常時起動には有料プランや定期ping等が必要。
- `ws`（アプリ層）は非TLSだが、Render/トンネルが TLS 終端するため公開は `https/wss` になる（ページを https で開くこと。http ページからの `ws://` はブラウザがブロックするため、自動 wss 導出が前提）。
- 認証は身内向けの簡易パスワードのみ・ブルートフォース対策なし・人数上限8人固定。**state には手札/ライブラリー順など全情報が含まれる**ため、URL とパスワードは信頼できる相手にだけ共有すること。
- 本格運用（永続ルーム・複数インスタンス・水平スケール）には Redis 等の外部保存とスティッキーセッション/ルーム集約が別途必要。

## 復旧
デプロイ前状態へ戻す場合は online-access-stable-20260704 の3ファイル（html/js/json）を元の名前に戻す。今回の変更は `server.js` の PORT/HOST 対応のみで、プロトコル・password・lock・自動同期・自動追従・UI非同期・wss自動導出には影響しない。
