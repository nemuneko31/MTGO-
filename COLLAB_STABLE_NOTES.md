# COLLAB_FIX_STABLE_NOTES.md — 双方向同期・反射ループ修正版の安定版記録

作成日: 2026-07-05
目的: 双方向同期モードの反射ループ（同期ログが1秒ごとに増え続ける問題）を修正した状態を、復旧可能な形で保存する。機能変更なし（バックアップとメモ作成のみ）。

## バックアップ（本体とmd5一致・変更禁止）
- `card-practice-table.collab-fix-stable-20260705.html` … md5 `59924d60f1afef8213a393807b3be9a2`（1,001,312 bytes / appVersion 1.4.0 / dataVersion 4）
- `server.collab-fix-stable-20260705.js` … md5 `26e3d6758fa8299aedb664567ea2ca9b`（23,935 bytes・collab版から無変更）
- `package.collab-fix-stable-20260705.json` … md5 `26906ae8fad54f648b25fd22334e45dd`（依存: ws, pg・無変更）

## 直前の安定版（無変更・参照用）
- `card-practice-table.collab-stable-20260705.html` … `ae02a44079ff24bf59d367d8c8170b85`
- `server.collab-stable-20260705.js` … `26e3d6758fa8299aedb664567ea2ca9b`
- `card-practice-table.shared-library-stable-20260705.html` … `f94c3b132e169827b684a86a393e8448`
- `card-practice-table.render-ready-stable-20260705.html` … `2a232d4a3c23ed19764866708635356b`
- `card-practice-table.online-access-stable-20260704.html` … `e6aaf68ffbe5471bb52b2d6dddbd9812`
- `card-practice-table.online-ux-stable-20260704.html` … `ad77d7d37ff1236f674c90bea8cb4e5d`
- `card-practice-table.online-mvp-stable-20260702.html` … `b23c4cb62bfc4ad194a3f76fe16705a2`
- `card-practice-table.offline-stable-20260702.html` … `f7f889434462887b9ddcc2a529f41550`

---

## この版の内容
collab-stable-20260705 の全機能（双方向同期モード・共有ライブラリ・imageUrl・ルームパスワード/ロック/最大8人・クラウド対応・wss自動導出 ほか）を**継承**した上で、反射ループを修正:

- **双方向同期の反射ループ修正**: 原因は (1) 適用処理が送信スキップ用sigを記録した後に `addLog` を実行して state.log が変わり「新内容」として再送信される、(2) 適用内の `pushUndo` が `suppressBroadcast=true` より前に走り送信を予約する、の複合。A送信→B適用→B再送信→A適用…のループを解消。
- **同一state受信時はno-op**: `_olSetPending` 先頭で受信stateと現在stateを `_olSigOfState`（ローカルUI設定＋保存メタ除外）で比較。同一なら適用しない・ログを出さない・Undoを積まない・lastBroadcastSig を合わせて送り返しも封じ・pendingを安全にクリア。
- **自動適用後に同一stateを再broadcastしない**: 適用処理を「suppress → 予約済み送信タイマー破棄 → pushUndo → 適用 → （手動時のみ addLog）→ **全変更後に** lastBroadcastSig 記録 → suppress解除」の順に修正。自動適用後は state が受信内容と完全一致し sig 一致でスキップ。実操作だけが新sigとなり送信される。
- **自動適用成功ログはオンラインログのみ**: 自動適用は `_olog` のみに記録。
- **メイン処理履歴には自動適用ログを追加しない**（state を変えない＝ループ根絶）。手動適用は従来どおり処理履歴に残る。
- **staleRev連続時の再同期表示**: `online.staleRevStreak` を追加。staleRev拒否でインクリメント、自分送信のACK/適用成功/no-opでリセット。2回以上連続かつ実際に乖離している（＝自動適用OFFで未適用）場合のみバッジに「再同期が必要（state問い合わせ→適用）」を表示。
- **deploy-render の HTML / server.js / package.json は本修正版と同期済み**（md5一致確認済み）。

## 挙動メモ
- no-op判定は state 全体（log含む）のsig比較。手動適用のログ行は1往復だけ同期されて収束する（ループにはならない）。
- 「再同期が必要」は同一内容なら表示しない（不要なため）。自動適用ONなら拒否応答のサーバーstateが即適用され自動復帰する。
- 切断時のバッジ表示・自動再接続・切断中の送信停止は既存ガードで機能。

## 既知の制限
- 同時操作の厳密解決なし（サーバーrev一致のみ採用・不一致は staleRev 拒否→再同期/手動適用）。同時に細かく操作しすぎない。
- 信頼相手向けの共有卓であり秘匿対戦・不正防止ではない（stateには手札/ライブラリー順など全情報が含まれる）。
- collab/ルーム/パスワードはメモリ保持で再起動リセット。ws は非TLS（Render/トンネルがTLS終端）。無料プランはスリープ/切断あり。
- 共有ライブラリは DATABASE_URL がある時だけ有効・画像本体は非共有（imageUrlのみ）。

## 復旧手順
`card-practice-table.collab-fix-stable-20260705.html` / `server.collab-fix-stable-20260705.js` / `package.collab-fix-stable-20260705.json` を、それぞれ `card-practice-table.html` / `server.js` / `package.json` にコピーで上書き。`npm install`（ws, pg）後に `npm start`。localStorage は dataVersion 4 のまま互換。ループ修正前に戻す場合は collab-stable-20260705 を使用（非推奨・反射ループあり）。
