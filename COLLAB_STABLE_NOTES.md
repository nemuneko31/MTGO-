# COLLAB_STABLE_NOTES.md — 双方向同期モード対応版の安定版記録

作成日: 2026-07-05
目的: 双方向同期（collaborativeMode・共有卓モード）を含む状態を、復旧可能な形で保存する。機能変更なし。

## バックアップ（本体とmd5一致・変更禁止）
- `card-practice-table.collab-stable-20260705.html` … md5 `ae02a44079ff24bf59d367d8c8170b85`（999,694 bytes / appVersion 1.4.0 / dataVersion 4）
- `server.collab-stable-20260705.js` … md5 `26e3d6758fa8299aedb664567ea2ca9b`（23,935 bytes）
- `package.collab-stable-20260705.json` … md5 `26906ae8fad54f648b25fd22334e45dd`（依存: ws, pg）

## 直前の安定版（無変更・参照用）
- `card-practice-table.shared-library-stable-20260705.html` … `f94c3b132e169827b684a86a393e8448`
- `server.shared-library-stable-20260705.js` … `0457ac61c339673dcb2c3717abf640ee`
- `card-practice-table.render-ready-stable-20260705.html` … `2a232d4a3c23ed19764866708635356b`
- `card-practice-table.online-access-stable-20260704.html` … `e6aaf68ffbe5471bb52b2d6dddbd9812`
- `card-practice-table.online-ux-stable-20260704.html` … `ad77d7d37ff1236f674c90bea8cb4e5d`
- `card-practice-table.online-mvp-stable-20260702.html` … `b23c4cb62bfc4ad194a3f76fe16705a2`
- `card-practice-table.offline-stable-20260702.html` … `f7f889434462887b9ddcc2a529f41550`

---

## この版の内容
shared-library-stable-20260705 の全機能（クラウド対応 PORT/HOST・wss自動導出・ルームパスワード/ロック/最大8人・共有ライブラリ〔DATABASE_URL がある時だけ有効〕・imageUrl・role別手前表示・自動同期/自動追従・ローカルUI非同期・スタック中身のみ同期 ほか）を**継承**した上で、双方向同期モードを追加:

- **collaborativeMode（双方向同期モード）**: 通常はホスト操作だけがゲストへ同期されるが、ホストが許可すると信頼できる role A/B の相手の操作も全員へ同期される共有卓モード。
- **既定OFF**。room に `collaborativeMode`（既定 false）を追加し、`roomSummary` に含める。
- **ホストだけが双方向同期ON/OFF可能**: ホスト専用 `setCollaborativeMode{collaborativeMode}`（非ホストはエラー）。ON時はクライアントUIで強い確認を表示。
- **role A/B の非hostも stateUpdate 送信可能**（collaborativeMode ON 時）。クライアント側 `_olCanBroadcast()` = `isHost || (collabOn && role∈{A,B})`。
- **spectator は送信不可**（サーバーは `stateRejected(spectator)`、クライアントも送信しない）。
- **rev一致時のみ採用、staleRevは拒否**（後勝ちではない）。採用時は room.state 更新・rev++・全員へ stateSync（送信者へは state:null のACK）。
- **ホストも受信state自動適用ONなら相手操作を自動反映**（`_olMaybeAutoApply` のホスト除外を collab ON 時のみ解除。自分の送信ACKは pending 化しない・適用中は broadcast 抑制・失敗時は pending 保持で手動適用可）。
- **UI位置/スタックUI位置は同期しない**（`_olLocalUIKey` による送信sig除外＋受信preserveは従来どおり。スタックは中身のみ同期）。
- 状態バッジ/参加者バッジに「双方向同期ON」を表示。

## server.js の受け入れ条件（stateUpdate）
1. `clientId===hostId` → 常に受理（従来）。
2. 非host: `collaborativeMode` が false かつ `ALLOW_NON_HOST_STATE_UPDATE=false` → `stateRejected(nonHost)`。
3. 非host: `collaborativeMode` true でも role が A/B でない（spectator）→ `stateRejected(spectator)`。
4. rev 不一致（`msg.rev !== room.rev`）→ `stateRejected(staleRev)`＋現状返送。
5. 上記を通過 → room.state 更新・rev++・全員へ stateSync。

## クライアント自動適用条件（collab時）
`onlineAutoApplyReceivedStateEnabled` ON かつ 接続中・ルーム参加中・pendingあり・適用中でない・pendingRev>lastAutoApplyRev・形式有効。ホストは通常は自動適用しないが、**collab ON 時は他プレイヤー更新を自動適用**。自分の送信ACK（from===clientId）は pending 化しない。

## 既存モードへの影響
collab OFF（既定）は完全に従来動作（非host送信はクライアント側で送られず、届いても server が nonHost 拒否）。password/lock/共有ライブラリ/imageUrl/Render起動/自動同期/自動追従/座席/スタック中身同期・UI位置非同期は不変。追加の保存キーなし（collaborativeMode はサーバーの room 状態でありローカル保存しない）。

## 既知の制限
- **信頼相手向けの共有卓であり、完全な秘匿対戦・不正防止ではありません**（stateには手札/ライブラリー順など全情報が含まれる）。ホストが許可した A/B のみ送信可。
- **同時操作は厳密解決しません**。rev 一致更新のみ採用のため、同時に細かく操作すると片方が staleRev 拒否され、再同期/手動適用が必要（同時操作は控えめに）。
- 双方向送信は各クライアントの「ホスト操作後に自動同期」ON が前提（手動送信ボタンは従来どおりホスト専用）。
- collaborativeMode / ルーム / パスワードはサーバーのメモリ保持で、再起動時にリセット。ws は非TLS（Render/トンネルがTLS終端）。無料/低価格プランはスリープ/切断あり。
- 共有ライブラリは DATABASE_URL がある時だけ有効・画像本体は非共有（imageUrlのみ）。本格運用にはユーザー認証・権限管理・画像ストレージが別途必要。

## 復旧手順
`card-practice-table.collab-stable-20260705.html` / `server.collab-stable-20260705.js` / `package.collab-stable-20260705.json` を、それぞれ `card-practice-table.html` / `server.js` / `package.json` にコピーで上書き。`npm install`（ws, pg）後に `npm start`。localStorage は dataVersion 4 のまま互換。双方向同期を無効化して戻したい場合は shared-library-stable-20260705 を使用。
