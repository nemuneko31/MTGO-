"use strict";

const crypto = require("crypto");
const { EventEmitter } = require("events");

const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

function makeFrame(opcode, data) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data == null ? "" : String(data));
  let head;
  if (payload.length < 126) {
    head = Buffer.alloc(2);
    head[1] = payload.length;
  } else if (payload.length <= 0xffff) {
    head = Buffer.alloc(4);
    head[1] = 126;
    head.writeUInt16BE(payload.length, 2);
  } else {
    head = Buffer.alloc(10);
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  head[0] = 0x80 | (opcode & 0x0f);
  return Buffer.concat([head, payload]);
}

class MiniWebSocket extends EventEmitter {
  constructor(socket, maxPayload) {
    super();
    this._socket = socket;
    this._maxPayload = Number(maxPayload) || 8 * 1024 * 1024;
    this._buffer = Buffer.alloc(0);
    this._fragOpcode = null;
    this._fragChunks = [];
    this._fragBytes = 0;
    this.readyState = OPEN;
    this.isAlive = true;

    socket.on("data", chunk => this._onData(chunk));
    socket.on("error", err => this.emit("error", err));
    socket.on("close", () => this._finishClose());
    socket.on("end", () => this._finishClose());
  }

  send(data) {
    if (this.readyState !== OPEN) return;
    const opcode = Buffer.isBuffer(data) ? 0x2 : 0x1;
    try { this._socket.write(makeFrame(opcode, data)); }
    catch (err) { this.emit("error", err); }
  }

  ping(data = Buffer.alloc(0)) {
    if (this.readyState !== OPEN) return;
    try { this._socket.write(makeFrame(0x9, data)); }
    catch (err) { this.emit("error", err); }
  }

  close(code = 1000, reason = "") {
    if (this.readyState !== OPEN) return;
    this.readyState = CLOSING;
    const text = Buffer.from(String(reason).slice(0, 120));
    const payload = Buffer.alloc(2 + text.length);
    payload.writeUInt16BE(code, 0);
    text.copy(payload, 2);
    try { this._socket.end(makeFrame(0x8, payload)); }
    catch (_) { this._socket.destroy(); }
  }

  terminate() {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    try { this._socket.destroy(); } catch (_) {}
  }

  _finishClose() {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    this.emit("close");
  }

  _protocolError(message) {
    const err = new Error(message || "WebSocket protocol error");
    this.emit("error", err);
    this.close(1002, "protocol error");
  }

  _emitMessage(opcode, payload) {
    if (payload.length > this._maxPayload) {
      this.close(1009, "message too large");
      return;
    }
    this.emit("message", payload, opcode === 0x2);
  }

  _onData(chunk) {
    if (this.readyState === CLOSED) return;
    this._buffer = Buffer.concat([this._buffer, chunk]);
    while (this._buffer.length >= 2) {
      const b0 = this._buffer[0], b1 = this._buffer[1];
      const fin = !!(b0 & 0x80), opcode = b0 & 0x0f;
      const masked = !!(b1 & 0x80);
      let len = b1 & 0x7f, offset = 2;
      if (!masked) return this._protocolError("client frame must be masked");
      if (len === 126) {
        if (this._buffer.length < 4) return;
        len = this._buffer.readUInt16BE(2); offset = 4;
      } else if (len === 127) {
        if (this._buffer.length < 10) return;
        const big = this._buffer.readBigUInt64BE(2);
        if (big > BigInt(Number.MAX_SAFE_INTEGER)) return this._protocolError("payload too large");
        len = Number(big); offset = 10;
      }
      if (len > this._maxPayload) { this.close(1009, "message too large"); return; }
      if (this._buffer.length < offset + 4 + len) return;
      const mask = this._buffer.subarray(offset, offset + 4); offset += 4;
      const payload = Buffer.from(this._buffer.subarray(offset, offset + len));
      this._buffer = this._buffer.subarray(offset + len);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];

      if (opcode === 0x8) {
        if (this.readyState === OPEN) {
          this.readyState = CLOSING;
          try { this._socket.end(makeFrame(0x8, payload)); } catch (_) { this._socket.destroy(); }
        }
        continue;
      }
      if (opcode === 0x9) {
        if (this.readyState === OPEN) this._socket.write(makeFrame(0xA, payload));
        continue;
      }
      if (opcode === 0xA) { this.emit("pong", payload); continue; }
      if (opcode === 0x0) {
        if (this._fragOpcode == null) return this._protocolError("unexpected continuation");
        this._fragChunks.push(payload); this._fragBytes += payload.length;
        if (this._fragBytes > this._maxPayload) { this.close(1009, "message too large"); return; }
        if (fin) {
          const full = Buffer.concat(this._fragChunks, this._fragBytes), op = this._fragOpcode;
          this._fragOpcode = null; this._fragChunks = []; this._fragBytes = 0;
          this._emitMessage(op, full);
        }
        continue;
      }
      if (opcode !== 0x1 && opcode !== 0x2) return this._protocolError("unsupported opcode");
      if (this._fragOpcode != null) return this._protocolError("new data frame during fragmented message");
      if (fin) this._emitMessage(opcode, payload);
      else { this._fragOpcode = opcode; this._fragChunks = [payload]; this._fragBytes = payload.length; }
    }
  }
}

class WebSocketServer extends EventEmitter {
  constructor(options = {}) {
    super();
    if (!options.server) throw new Error("server is required");
    this.clients = new Set();
    this.maxPayload = Number(options.maxPayload) || 8 * 1024 * 1024;
    this._server = options.server;
    this._upgrade = (req, socket) => {
      const key = req.headers["sec-websocket-key"];
      const version = req.headers["sec-websocket-version"];
      const upgrade = String(req.headers.upgrade || "").toLowerCase();
      if (!key || version !== "13" || upgrade !== "websocket") {
        socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
        socket.destroy(); return;
      }
      const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
      );
      const ws = new MiniWebSocket(socket, this.maxPayload);
      this.clients.add(ws);
      ws.once("close", () => this.clients.delete(ws));
      this.emit("connection", ws, req);
    };
    this._server.on("upgrade", this._upgrade);
  }

  close(callback) {
    this._server.off("upgrade", this._upgrade);
    for (const ws of this.clients) ws.terminate();
    this.clients.clear();
    this.emit("close");
    if (callback) callback();
  }
}

module.exports = { WebSocketServer, WebSocket: MiniWebSocket };
