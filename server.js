/* ============================================================
   card-practice-table 用 最小WebSocketルームサーバー（オンラインMVP第1段階の土台）
   - ローカル / 同一LAN での「練習用の盤面同期」専用
   - host authoritative + state丸ごと同期 + rev 方式（ONLINE_PLAN.md E参照）
   - 秘密情報管理・認証・不正防止・永続化・公式ルール処理は実装しない
     （state には手札等の全情報が載る前提。手札マスクはHTML側の表示補助）
   - card-practice-table.html は一切変更しない（静的配信のみ）
   起動: npm install && npm start  （既定ポート 8787 / 環境変数 PORT で変更可）
   ============================================================ */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || "0.0.0.0"; // クラウドで外部公開するため全インターフェースにbind（localhostからも到達可）。固定したい場合は環境変数HOSTで指定
const ROOT = __dirname;

/* ---------- 定数（第1段階の方針） ---------- */
const ALLOW_NON_HOST_STATE_UPDATE = false; // 非hostのstateUpdateは拒否（ONLINE_PLAN.md G）
const MAX_MESSAGE_BYTES = 8 * 1024 * 1024; // 巨大メッセージの簡易ガード（state丸ごと想定で余裕を持たせる）
const MAX_LOG = 100;                       // room.log 保持件数
const MAX_CHAT_LEN = 500;
const MAX_NAME_LEN = 24;
const MAX_ROOM_CLIENTS = 8;      // A/B/観戦込みの最大人数
const MAX_PASSWORD_LEN = 64;
const DATABASE_URL = process.env.DATABASE_URL || "";
const SHARED_ADMIN_PASSWORD = process.env.SHARED_ADMIN_PASSWORD || "";
const MAX_BODY_BYTES = 6 * 1024 * 1024; // 共有保存POSTの上限
const IMG_S3_ENDPOINT = process.env.IMG_S3_ENDPOINT || "";
const IMG_S3_BUCKET = process.env.IMG_S3_BUCKET || "";
const IMG_S3_ACCESS_KEY_ID = process.env.IMG_S3_ACCESS_KEY_ID || "";
const IMG_S3_SECRET_ACCESS_KEY = process.env.IMG_S3_SECRET_ACCESS_KEY || "";
const IMG_PUBLIC_BASE_URL = (process.env.IMG_PUBLIC_BASE_URL || "").replace(/\/+$/, ""); // 末尾スラッシュ正規化
const IMG_MAX_BYTES = 2 * 1024 * 1024; // 画像1枚の上限 2MB
const IMG_ALLOWED_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }; // SVGは不可
const EMPTY_ROOM_TTL_MS = 60 * 1000;       // 空roomの削除猶予
const HEARTBEAT_MS = 30 * 1000;

/* ============================================================
   共有ストア（任意・DATABASE_URL がある時だけ有効。無くてもアプリは起動）
   ============================================================ */
const shared = { enabled: false, pool: null, reason: "DATABASE_URL 未設定", pg: null };
async function initSharedStore() {
  if (!DATABASE_URL) { log("shared store: disabled (DATABASE_URL 未設定)"); return; }
  let Pool;
  try { Pool = require("pg").Pool; }
  catch (e) { shared.reason = "pg モジュール未インストール"; log("shared store: disabled (pg 未インストール)"); return; }
  try {
    const ssl = /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false };
    shared.pool = new Pool({ connectionString: DATABASE_URL, ssl, max: 3 });
    await shared.pool.query(
      "CREATE TABLE IF NOT EXISTS shared_store (key text PRIMARY KEY, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now())"
    );
    shared.enabled = true; shared.reason = "";
    log("shared store: enabled (Postgres)");
  } catch (e) {
    shared.enabled = false; shared.reason = "DB接続失敗";
    log("shared store: disabled (DB接続失敗: " + (e && (e.code || e.message)) + ")");
  }
}
async function sharedGet(key) {
  if (!shared.enabled) return null;
  const r = await shared.pool.query("SELECT data, version, updated_at FROM shared_store WHERE key=$1", [key]);
  if (!r.rows.length) return { ok: true, version: 0, updatedAt: null, data: null };
  const row = r.rows[0];
  return { ok: true, version: row.version, updatedAt: row.updated_at, data: row.data };
}
async function sharedPut(key, data) { // 後勝ち保存・versionはインクリメント
  if (!shared.enabled) return null;
  const r = await shared.pool.query(
    "INSERT INTO shared_store (key, data, version, updated_at) VALUES ($1,$2,1,now()) " +
    "ON CONFLICT (key) DO UPDATE SET data=EXCLUDED.data, version=shared_store.version+1, updated_at=now() " +
    "RETURNING version, updated_at", [key, data]);
  const row = r.rows[0];
  return { ok: true, version: row.version, updatedAt: row.updated_at };
}
function adminOk(req, bodyObj) {
  if (!SHARED_ADMIN_PASSWORD) return false; // 管理pw未設定なら保存は常に不可（読み取りは可）
  const h = req.headers["x-admin-password"];
  const b = bodyObj && bodyObj.adminPassword;
  const given = String(h != null ? h : (b != null ? b : ""));
  return given.length > 0 && given === SHARED_ADMIN_PASSWORD;
}
function sendJson(res, code, obj) { const s = JSON.stringify(obj); res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(s); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > MAX_BODY_BYTES) { reject(new Error("body too large")); req.destroy(); return; } chunks.push(c); });
    req.on("end", () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch (e) { reject(new Error("invalid JSON")); } });
    req.on("error", reject);
  });
}
const SHARED_KEYS = { "/api/shared-library": "card_library", "/api/shared-decks": "decks" };
async function handleSharedApi(req, res, pathname) {
  const key = SHARED_KEYS[pathname];
  if (!key) return false;
  if (!shared.enabled) { sendJson(res, 503, { ok: false, disabled: true, reason: shared.reason || "共有機能は無効です" }); return true; }
  try {
    if (req.method === "GET") { const r = await sharedGet(key); sendJson(res, 200, r); return true; }
    if (req.method === "POST") {
      const body = await readBody(req);
      if (!adminOk(req, body)) { sendJson(res, 401, { ok: false, error: "管理パスワードが必要です（または誤り）" }); return true; }
      if (body.data === undefined) { sendJson(res, 400, { ok: false, error: "data がありません" }); return true; }
      const r = await sharedPut(key, body.data); // パスワードはログにもレスポンスにも出さない
      sendJson(res, 200, r); return true;
    }
    sendJson(res, 405, { ok: false, error: "method not allowed" }); return true;
  } catch (e) { sendJson(res, 500, { ok: false, error: String((e && e.message) || e) }); return true; }
}

/* ============================================================
   画像ストア（任意・IMG_S3_* 5変数が揃った時だけ有効。無くてもアプリは起動）
   秘密値（キー/Endpoint全文）はログにもレスポンスにも出さない。
   ============================================================ */
const imageStore = { enabled: false, client: null, PutObjectCommand: null, reason: "environment variables are not configured" };
function initImageStore() {
  if (!(IMG_S3_ENDPOINT && IMG_S3_BUCKET && IMG_S3_ACCESS_KEY_ID && IMG_S3_SECRET_ACCESS_KEY && IMG_PUBLIC_BASE_URL)) {
    log("image store: disabled (environment variables are not configured)"); return;
  }
  let sdk;
  try { sdk = require("@aws-sdk/client-s3"); }
  catch (e) { imageStore.reason = "s3 sdk not installed"; log("image store: disabled (s3 sdk not installed)"); return; }
  try {
    imageStore.client = new sdk.S3Client({
      region: "auto", endpoint: IMG_S3_ENDPOINT, forcePathStyle: true,
      credentials: { accessKeyId: IMG_S3_ACCESS_KEY_ID, secretAccessKey: IMG_S3_SECRET_ACCESS_KEY },
    });
    imageStore.PutObjectCommand = sdk.PutObjectCommand;
    imageStore.enabled = true; imageStore.reason = "";
    log("image store: enabled (R2)");
  } catch (e) { imageStore.enabled = false; imageStore.reason = "init failed"; log("image store: disabled (init failed)"); }
}
function _imgMagicOk(buf, type) { // Content-Typeを信用せずマジックバイト検査
  if (!buf || buf.length < 12) return false;
  if (type === "image/png") return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;
  if (type === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === "image/gif") return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38; // GIF8
  if (type === "image/webp") return buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP";
  return false;
}
function readRawBody(req, maxBytes) { // 生バイナリ受信。上限超過は即座に安全停止
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) { const e = new Error("too large"); e.code = "TOO_LARGE"; req.removeAllListeners("data"); req.pause(); reject(e); return; } // destroyは応答送信後に呼び出し側で行う
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
async function handleImageUpload(req, res) {
  if (!imageStore.enabled) { sendJson(res, 503, { ok: false, disabled: true, reason: imageStore.reason || "image store disabled" }); return; }
  if (req.method !== "POST") { sendJson(res, 405, { ok: false, error: "method not allowed" }); return; }
  if (!adminOk(req, null)) { sendJson(res, 401, { ok: false, error: "管理パスワードが必要です（または誤り）" }); return; }
  const ctype = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const ext = IMG_ALLOWED_TYPES[ctype];
  if (!ext) { sendJson(res, 415, { ok: false, error: "対応形式は png/jpeg/webp/gif のみです" }); return; }
  let buf;
  try { buf = await readRawBody(req, IMG_MAX_BYTES); }
  catch (e) {
    if (e && e.code === "TOO_LARGE") {
      try {
        const s = JSON.stringify({ ok: false, error: "画像は最大" + IMG_MAX_BYTES + "バイト（2MB）までです" });
        res.writeHead(413, { "Content-Type": "application/json; charset=utf-8", "Connection": "close" });
        res.end(s, () => { try { req.destroy(); } catch (_) {} }); // 413を送り切ってから受信を安全停止
      } catch (_) {}
      return;
    }
    try { sendJson(res, 400, { ok: false, error: "本文の受信に失敗しました" }); } catch (_) {} return;
  }
  if (!buf.length) { sendJson(res, 400, { ok: false, error: "本文が空です" }); return; }
  if (!_imgMagicOk(buf, ctype)) { sendJson(res, 400, { ok: false, error: "ファイル内容がContent-Typeと一致しません" }); return; }
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const key = "images/" + sha256 + "." + ext; // 内容ハッシュキー＝同一画像は同一キー（重複保存回避）
  try {
    await imageStore.client.send(new imageStore.PutObjectCommand({ Bucket: IMG_S3_BUCKET, Key: key, Body: buf, ContentType: ctype }));
    sendJson(res, 200, { ok: true, key, imageUrl: IMG_PUBLIC_BASE_URL + "/" + key, sha256, size: buf.length, contentType: ctype });
  } catch (e) {
    log("image upload failed (" + ((e && e.name) || "error") + ")"); // 詳細/秘密値はログに出さない
    sendJson(res, 500, { ok: false, error: "アップロードに失敗しました" });
  }
}

/* ============================================================
   HTTPサーバー（静的配信・最低限）
   ============================================================ */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md":   "text/plain; charset=utf-8",
  ".txt":  "text/plain; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml"
};
const httpServer = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/api/shared-images-status") {
      if (imageStore.enabled) sendJson(res, 200, { enabled: true, provider: "R2", maxBytes: IMG_MAX_BYTES, allowedTypes: Object.keys(IMG_ALLOWED_TYPES) });
      else sendJson(res, 200, { enabled: false, reason: imageStore.reason || "environment variables are not configured" });
      return;
    }
    if (urlPath === "/api/shared-images") { handleImageUpload(req, res).catch(() => { try { sendJson(res, 500, { ok: false, error: "internal" }); } catch (_) {} }); return; }
    if (urlPath === "/api/shared-status") { sendJson(res, 200, { ok: true, enabled: shared.enabled, reason: shared.reason, adminConfigured: !!SHARED_ADMIN_PASSWORD }); return; }
    if (SHARED_KEYS[urlPath] !== undefined) { handleSharedApi(req, res, urlPath).catch(() => { try { sendJson(res, 500, { ok: false, error: "internal" }); } catch (_) {} }); return; }
    if (urlPath === "/") urlPath = "/card-practice-table.html";
    // パストラバーサル防止: ROOT 配下に正規化されるファイルのみ
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("Forbidden"); return; }
    const ext = path.extname(filePath).toLowerCase();
    if (!MIME[ext]) { res.writeHead(404); res.end("Not Found"); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Not Found"); return; }
      res.writeHead(200, { "Content-Type": MIME[ext] });
      res.end(data);
    });
  } catch (e) {
    try { res.writeHead(500); res.end("Server Error"); } catch (_) {}
  }
});

/* ============================================================
   rooms 管理
   room: { roomCode, createdAt, updatedAt, hostId, clients:Map<clientId,client>, state, rev, log:[], _deleteTimer }
   client: { clientId, ws, roomCode, role:"A"|"B"|"spectator", name, joinedAt, lastSeen }
   （host は room.hostId で識別。role とは独立）
   ============================================================ */
const rooms = new Map();
let _seq = 0;
function uid(prefix) { return prefix + Date.now().toString(36) + (_seq++).toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい I/O/0/1 を除外
function genRoomCode() {
  for (let tries = 0; tries < 50; tries++) {
    let c = "";
    for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
  return uid("R").slice(0, 6).toUpperCase();
}
function now() { return Date.now(); }
function sanitizeName(n) { return String(n == null ? "" : n).replace(/[\r\n<>]/g, "").slice(0, MAX_NAME_LEN) || "guest"; }
function normRole(r) { return (r === "A" || r === "B" || r === "spectator") ? r : null; }

function roomSummary(room) {
  return {
    roomCode: room.roomCode, rev: room.rev, hostId: room.hostId,
    createdAt: room.createdAt, updatedAt: room.updatedAt, hasState: room.state != null,
    passwordProtected: !!room.passwordHash, locked: !!room.locked, collaborativeMode: !!room.collaborativeMode, maxClients: MAX_ROOM_CLIENTS,
    clientCount: room.clients.size,
    clients: [...room.clients.values()].map(c => ({ clientId: c.clientId, role: c.role, name: c.name, isHost: c.clientId === room.hostId }))
  };
}
function pushRoomLog(room, entry) {
  room.log.push(Object.assign({ at: now() }, entry));
  if (room.log.length > MAX_LOG) room.log.splice(0, room.log.length - MAX_LOG);
}
/* A/B が空いていれば希望role、埋まっていれば spectator（重複は安全側で spectator） */
function assignRole(room, wanted) {
  const w = normRole(wanted) || "spectator";
  if (w === "spectator") return "spectator";
  const taken = new Set([...room.clients.values()].map(c => c.role));
  return taken.has(w) ? "spectator" : w;
}
function scheduleRoomCleanup(room) {
  clearTimeout(room._deleteTimer);
  room._deleteTimer = setTimeout(() => {
    if (room.clients.size === 0) { rooms.delete(room.roomCode); log(`room ${room.roomCode} deleted (empty)`); }
  }, EMPTY_ROOM_TTL_MS);
}
function log(msg) { console.log(`[server] ${new Date().toISOString()} ${msg}`); }
/* 簡易入室制限用: パスワードは平文保持せず sha256 ハッシュ+乱数ソルトで保持（身内向け・完全な認証ではない） */
function hashPassword(pw, salt) { return crypto.createHash("sha256").update(String(salt) + ":" + String(pw)).digest("hex"); }
function setRoomPassword(room, pw) {
  const p = String(pw == null ? "" : pw).slice(0, MAX_PASSWORD_LEN);
  if (!p) { room.passwordSalt = null; room.passwordHash = null; }
  else { room.passwordSalt = crypto.randomBytes(8).toString("hex"); room.passwordHash = hashPassword(p, room.passwordSalt); }
}
function checkRoomPassword(room, pw) {
  if (!room.passwordHash) return true; // 鍵なしは誰でも可
  const p = String(pw == null ? "" : pw).slice(0, MAX_PASSWORD_LEN);
  if (!p) return false;
  return hashPassword(p, room.passwordSalt) === room.passwordHash;
}

/* ============================================================
   WebSocket
   ============================================================ */
const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_MESSAGE_BYTES });
const clientsById = new Map();

function send(ws, obj) { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch (_) {} }
function sendError(ws, message) { send(ws, { type: "error", message: String(message) }); }
function broadcast(room, obj, exceptId) {
  for (const c of room.clients.values()) { if (c.clientId !== exceptId) send(c.ws, obj); }
}
function getRoomOf(client) { return client && client.roomCode ? rooms.get(client.roomCode) : null; }

function leaveCurrentRoom(client, silent) {
  const room = getRoomOf(client);
  if (!room) { client.roomCode = null; return; }
  room.clients.delete(client.clientId);
  client.roomCode = null;
  pushRoomLog(room, { kind: "leave", clientId: client.clientId, name: client.name });
  if (room.clients.size === 0) { scheduleRoomCleanup(room); }
  else {
    // host が抜けたら最古参加者へ host を委譲（練習用の簡易措置）
    if (room.hostId === client.clientId) {
      const next = [...room.clients.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = next.clientId;
      pushRoomLog(room, { kind: "hostChanged", clientId: next.clientId });
      log(`room ${room.roomCode} host -> ${next.clientId}`);
    }
    if (!silent) broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room) });
  }
}

/* ---------- メッセージハンドラ ---------- */
const handlers = {
  ping(client) { send(client.ws, { type: "pong", at: now() }); },

  createRoom(client, msg) {
    leaveCurrentRoom(client);
    const room = {
      roomCode: genRoomCode(), createdAt: now(), updatedAt: now(),
      hostId: client.clientId, clients: new Map(), state: null, rev: 0, log: [], _deleteTimer: null,
      passwordSalt: null, passwordHash: null, locked: false, collaborativeMode: false
    };
    setRoomPassword(room, msg.password); // 空なら鍵なし。ハッシュのみ保持しクライアントへは配信しない
    client.name = sanitizeName(msg.name != null ? msg.name : client.name);
    client.role = assignRole(room, msg.role || "A"); // 作成者は既定でA希望
    client.roomCode = room.roomCode;
    room.clients.set(client.clientId, client);
    rooms.set(room.roomCode, room);
    pushRoomLog(room, { kind: "create", clientId: client.clientId, name: client.name });
    log(`room ${room.roomCode} created by ${client.clientId} (${client.name})`);
    log(`room ${room.roomCode} password=${room.passwordHash ? "on" : "off"}`);
    send(client.ws, { type: "roomCreated", roomCode: room.roomCode, clientId: client.clientId, role: client.role, roomSummary: roomSummary(room) });
  },

  joinRoom(client, msg) {
    const code = String(msg.roomCode || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) { sendError(client.ws, "roomCode が見つかりません: " + code); return; }
    const alreadyIn = room.clients.has(client.clientId);
    if (!alreadyIn) {
      if (!checkRoomPassword(room, msg.password)) { send(client.ws, { type: "joinRejected", reason: "password", roomCode: code, message: "パスワードが違います" }); return; }
      if (room.locked) { send(client.ws, { type: "joinRejected", reason: "locked", roomCode: code, message: "このルームは新規参加がロックされています" }); return; }
      if (room.clients.size >= MAX_ROOM_CLIENTS) { send(client.ws, { type: "joinRejected", reason: "full", roomCode: code, message: "満員です（最大" + MAX_ROOM_CLIENTS + "人）" }); return; }
    }
    leaveCurrentRoom(client);
    clearTimeout(room._deleteTimer);
    client.name = sanitizeName(msg.name != null ? msg.name : client.name);
    client.role = assignRole(room, msg.role);
    client.roomCode = room.roomCode;
    client.joinedAt = now();
    room.clients.set(client.clientId, client);
    pushRoomLog(room, { kind: "join", clientId: client.clientId, name: client.name, role: client.role });
    log(`room ${room.roomCode} join ${client.clientId} (${client.name}/${client.role})`);
    // 再接続/途中参加でも現在の state/rev をそのまま返す（再同期）
    send(client.ws, {
      type: "roomJoined", roomCode: room.roomCode, clientId: client.clientId, role: client.role,
      roomSummary: roomSummary(room), state: room.state, rev: room.rev, log: room.log.slice(-20)
    });
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room) }, client.clientId);
  },

  leaveRoom(client) { leaveCurrentRoom(client); send(client.ws, { type: "roomUpdate", roomSummary: null }); },

  setLock(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (client.clientId !== room.hostId) { sendError(client.ws, "ロックはホストのみ操作できます"); return; }
    room.locked = !!msg.locked;
    pushRoomLog(room, { kind: "setLock", locked: room.locked });
    log(`room ${room.roomCode} locked=${room.locked}`);
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room) });
    send(client.ws, { type: "roomUpdate", roomSummary: roomSummary(room) });
  },

  setCollaborativeMode(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (client.clientId !== room.hostId) { sendError(client.ws, "双方向同期の切替はホストのみ可能です"); return; }
    room.collaborativeMode = !!msg.collaborativeMode;
    pushRoomLog(room, { kind: "setCollaborativeMode", on: room.collaborativeMode });
    log(`room ${room.roomCode} collaborativeMode=${room.collaborativeMode}`);
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room) });
    send(client.ws, { type: "roomUpdate", roomSummary: roomSummary(room) });
  },

  setPassword(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    if (client.clientId !== room.hostId) { sendError(client.ws, "パスワード変更はホストのみ可能です"); return; }
    setRoomPassword(room, msg.password);
    pushRoomLog(room, { kind: "setPassword", protected: !!room.passwordHash }); // 値は残さない
    log(`room ${room.roomCode} password ${room.passwordHash ? "set" : "cleared"}`);
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room) });
    send(client.ws, { type: "roomUpdate", roomSummary: roomSummary(room) });
  },

  setRole(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    const wanted = normRole(msg.role);
    if (!wanted) { sendError(client.ws, "role は A / B / spectator です"); return; }
    client.role = (wanted === "spectator") ? "spectator" : assignRole(room, wanted);
    pushRoomLog(room, { kind: "setRole", clientId: client.clientId, role: client.role });
    broadcast(room, { type: "roomUpdate", roomSummary: roomSummary(room) });
    send(client.ws, { type: "roomUpdate", roomSummary: roomSummary(room) });
  },

  stateUpdate(client, msg) {
    const room = getRoomOf(client);
    if (!room || (msg.roomCode && String(msg.roomCode).toUpperCase() !== room.roomCode)) {
      sendError(client.ws, "roomに参加していません / roomCode不一致"); return;
    }
    // host authoritative が既定。ただし collaborativeMode ON のときは role A/B の非hostも受け付ける（spectator不可）
    if (client.clientId !== room.hostId) {
      if (!ALLOW_NON_HOST_STATE_UPDATE && !room.collaborativeMode) {
        send(client.ws, { type: "stateRejected", reason: "nonHost", serverRev: room.rev, state: room.state });
        return;
      }
      if (room.collaborativeMode && client.role !== "A" && client.role !== "B") { // spectatorは送信不可
        send(client.ws, { type: "stateRejected", reason: "spectator", serverRev: room.rev, state: room.state });
        return;
      }
    }
    // rev 検証: クライアントは「自分が知っている現在の rev」を送る。古い/不正なら拒否＋現状を返す
    if (typeof msg.rev !== "number" || msg.rev !== room.rev) {
      send(client.ws, { type: "stateRejected", reason: "staleRev", serverRev: room.rev, state: room.state });
      return;
    }
    if (msg.state == null || typeof msg.state !== "object") { sendError(client.ws, "state がありません"); return; }
    room.state = msg.state;
    room.rev += 1;
    room.updatedAt = now();
    if (Array.isArray(msg.logDelta)) {
      for (const l of msg.logDelta.slice(0, 50)) pushRoomLog(room, { kind: "game", line: String(l).slice(0, 300) });
    }
    // 全員（送信者含む）へ stateSync — 送信者は rev 確定通知として受け取る
    broadcast(room, { type: "stateSync", state: room.state, rev: room.rev, from: client.clientId });
    send(client.ws, { type: "stateSync", state: null, rev: room.rev, from: client.clientId }); // 送信者へは rev のみ（帯域節約）
  },

  requestState(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    send(client.ws, { type: "stateSync", state: room.state, rev: room.rev, from: "server" });
  },

  chat(client, msg) {
    const room = getRoomOf(client);
    if (!room) { sendError(client.ws, "roomに参加していません"); return; }
    const text = String(msg.text || "").slice(0, MAX_CHAT_LEN);
    if (!text) return;
    const entry = { type: "chat", from: client.clientId, name: client.name, role: client.role, text, createdAt: now() };
    pushRoomLog(room, { kind: "chat", clientId: client.clientId, text });
    broadcast(room, entry);
    send(client.ws, entry);
  }
};

wss.on("connection", (ws) => {
  const client = { clientId: uid("c"), ws, roomCode: null, role: "spectator", name: "guest", joinedAt: now(), lastSeen: now() };
  clientsById.set(client.clientId, client);
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; client.lastSeen = now(); });
  log(`connect ${client.clientId} (total ${clientsById.size})`);
  send(ws, { type: "hello", clientId: client.clientId, server: "card-practice-table-server", note: "練習用同期サーバー: 秘密情報は保護されません" });

  ws.on("message", (data) => {
    try {
      if (data && data.length > MAX_MESSAGE_BYTES) { sendError(ws, "message too large"); return; }
      let msg;
      try { msg = JSON.parse(data.toString()); } catch (_) { sendError(ws, "invalid JSON"); return; }
      if (!msg || typeof msg !== "object" || typeof msg.type !== "string") { sendError(ws, "invalid message"); return; }
      client.lastSeen = now();
      const h = handlers[msg.type];
      if (!h) { sendError(ws, "unknown type: " + msg.type); return; }
      h(client, msg);
    } catch (e) {
      // ハンドラ内の想定外エラーでも接続/サーバーは落とさない
      log(`handler error: ${e && e.message}`);
      try { sendError(ws, "server error"); } catch (_) {}
    }
  });

  ws.on("close", () => {
    leaveCurrentRoom(client);
    clientsById.delete(client.clientId);
    log(`disconnect ${client.clientId} (total ${clientsById.size})`);
  });
  ws.on("error", (e) => { log(`ws error ${client.clientId}: ${e && e.message}`); });
});

/* heartbeat: 応答のない接続を切断 */
const hb = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { try { ws.terminate(); } catch (_) {} continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  }
}, HEARTBEAT_MS);
wss.on("close", () => clearInterval(hb));

process.on("uncaughtException", (e) => { log(`uncaughtException: ${e && e.message}`); });
process.on("unhandledRejection", (e) => { log(`unhandledRejection: ${e && (e.message || e)}`); });

initSharedStore().catch((e) => log("shared store init error: " + (e && e.message)));
initImageStore();
httpServer.listen(PORT, HOST, () => {
  const shown = (HOST === "0.0.0.0" || HOST === "::") ? "localhost" : HOST;
  log(`listening on http://${shown}:${PORT}/ (bind ${HOST} / WebSocket 同ポート)`);
  log(`serving ${path.join(ROOT, "card-practice-table.html")}`);
});
