"use strict";

const crypto = require("crypto");
const PROTOCOL = "cpt-v7.9.12-effects";
const MAX_OPS = 64;
const TX_TTL_MS = 30 * 1000;
const PUBLIC_ZONES = ["creatures", "lands", "others", "graveyard", "exile", "command", "stack"];
const BATTLEFIELD = new Set(["creatures", "lands", "others"]);
const FACE_KINDS = new Set(["generic", "morph", "manifest", "cloak", "disguise"]);

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function role(value) { return value === "B" ? "B" : value === "A" ? "A" : null; }
function other(value) { return value === "A" ? "B" : "A"; }
function finiteInt(value, min, max) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function text(value, max = 180) { return String(value == null ? "" : value).replace(/[<>\r\n]/g, " ").trim().slice(0, max); }
function id(prefix = "v7912") { return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`; }
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

function ensureRoom(room) {
  room.v7912 = room.v7912 && typeof room.v7912 === "object" ? room.v7912 : {};
  const r = room.v7912;
  if (!r.txByRole || typeof r.txByRole !== "object") r.txByRole = { A: null, B: null };
  if (!Array.isArray(r.choices)) r.choices = [];
  if (!r.faceDownSecrets || typeof r.faceDownSecrets !== "object") r.faceDownSecrets = {};
  if (!Array.isArray(r.proofs)) r.proofs = [];
  if (!Array.isArray(r.audit)) r.audit = [];
  const t = Date.now();
  for (const p of ["A", "B"]) if (r.txByRole[p] && t - Number(r.txByRole[p].createdAt || 0) > TX_TTL_MS) r.txByRole[p] = null;
  return r;
}
function audit(room, kind, detail) {
  const r = ensureRoom(room);
  r.audit.unshift({ at: new Date().toISOString(), kind, detail: clone(detail) });
  if (r.audit.length > 240) r.audit.length = 240;
}
function proof(room, kind, payload) {
  const r = ensureRoom(room);
  const p = { id: id("proof"), at: new Date().toISOString(), kind, rev: Number(room.rev) || 0, commitment: hash(payload) };
  r.proofs.unshift(p);
  if (r.proofs.length > 200) r.proofs.length = 200;
  return p;
}
function actorAllowed(room, client, controller) {
  if (!client || !role(client.role)) return false;
  return client.role === controller || !!room.collaborativeMode;
}
function publicPlayers(room) { return room.state && room.state.players ? room.state.players : null; }
function findPublic(room, cardId) {
  const players = publicPlayers(room);
  if (!players) return null;
  for (const p of ["A", "B"]) {
    for (const zone of PUBLIC_ZONES) {
      const arr = zone === "stack" ? room.state.stack : players[p] && players[p][zone];
      if (!Array.isArray(arr)) continue;
      const index = arr.findIndex(c => String(c && c.id) === String(cardId));
      if (index >= 0) return { role: p, zone, arr, index, card: arr[index] };
    }
  }
  return null;
}
function privateEntry(room, p) { return room.privateByRole && room.privateByRole[p] ? room.privateByRole[p] : null; }
function privateZones(room, p) {
  const entry = privateEntry(room, p);
  return entry && entry.state && entry.state.zones ? entry.state.zones : null;
}
function safeCounterObject(input) {
  const out = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [k, v] of Object.entries(input)) {
    const key = text(k, 40); const n = finiteInt(v, 0, 1000000);
    if (key && n != null) out[key] = n;
  }
  return out;
}
function hiddenCard(original, publicId, kind) {
  return {
    id: publicId,
    name: "裏向きのカード",
    owner: role(original && original.owner) || "A",
    controller: role(original && original.controller) || role(original && original.owner) || "A",
    zone: "creatures",
    types: ["Creature"], type: "Creature", colors: [], power: "2", toughness: "2",
    faceDown: true, hidden: true, tapped: !!(original && original.tapped), damage: finiteInt(original && original.damage, 0, 1000000) || 0,
    counters: safeCounterObject(original && original.counters),
    v7911FaceDown: { kind, owner: role(original && original.owner) || "A", controller: role(original && original.controller) || role(original && original.owner) || "A", serverAuthority: true, objectKey: `${publicId}:server`, createdAt: new Date().toISOString() },
  };
}
function faceDown(room, client, op) {
  const f = findPublic(room, op.cardId);
  if (!f || !BATTLEFIELD.has(f.zone)) throw new Error("battlefieldCardNotFound");
  const controller = role(f.card.controller) || role(f.card.owner) || f.role;
  if (!actorAllowed(room, client, controller)) throw new Error("notController");
  if (f.card.faceDown) throw new Error("alreadyFaceDown");
  const kind = FACE_KINDS.has(op.faceKind) ? op.faceKind : "generic";
  const r = ensureRoom(room);
  r.faceDownSecrets[String(f.card.id)] = { card: clone(f.card), owner: role(f.card.owner) || f.role, controller, kind, source: "battlefield", storedAt: new Date().toISOString() };
  const redacted = hiddenCard(f.card, String(f.card.id), kind);
  redacted.zone = f.zone;
  f.arr[f.index] = redacted;
  return { kind: "turnFaceDown", cardId: redacted.id, faceKind: kind };
}
function faceUp(room, client, op) {
  const f = findPublic(room, op.cardId), r = ensureRoom(room), secret = r.faceDownSecrets[String(op.cardId)];
  if (!f || !secret) throw new Error("faceDownSecretNotFound");
  const currentController = role(f.card.controller) || secret.controller;
  if (!actorAllowed(room, client, currentController)) throw new Error("notController");
  if (["morph", "manifest", "cloak", "disguise"].includes(secret.kind) && op.costPaid !== true) throw new Error("faceUpCostConfirmationRequired");
  const types = Array.isArray(secret.card.types) ? secret.card.types : [secret.card.type].filter(Boolean);
  if (["manifest", "cloak"].includes(secret.kind) && !types.includes("Creature")) throw new Error("manifestNonCreatureCannotTurnFaceUp");
  const restored = clone(secret.card);
  restored.id = String(op.cardId);
  restored.zone = f.zone;
  restored.controller = currentController;
  restored.tapped = !!f.card.tapped;
  restored.damage = finiteInt(f.card.damage, 0, 1000000) || 0;
  restored.counters = safeCounterObject(f.card.counters);
  restored.faceDown = false;
  delete restored.v7911FaceDown; delete restored.hidden;
  f.arr[f.index] = restored;
  delete r.faceDownSecrets[String(op.cardId)];
  return { kind: "turnFaceUp", cardId: restored.id, faceKind: secret.kind };
}
function popPublicLibraryPlaceholder(room, p) {
  const arr = room.state && room.state.players && room.state.players[p] && room.state.players[p].library;
  if (Array.isArray(arr) && arr.length) arr.pop();
}
function pushPublicHandPlaceholder(room, p, original) {
  const arr = room.state && room.state.players && room.state.players[p] && room.state.players[p].hand;
  if (Array.isArray(arr)) arr.push({ id: `hidden-${id("hand")}`, owner: p, controller: p, zone: "hand", hidden: true, name: "非公開カード" });
}
function manifestTop(room, client, op) {
  const p = role(op.player) || client.role;
  if (client.role !== p && !room.collaborativeMode) throw new Error("seatMismatch");
  const zones = privateZones(room, p);
  if (!zones || !Array.isArray(zones.library)) throw new Error("privateLibraryNotRegistered");
  if (!zones.library.length) throw new Error("libraryEmpty");
  const original = zones.library.pop();
  popPublicLibraryPlaceholder(room, p);
  const publicId = id("fd");
  original.owner = role(original.owner) || p; original.controller = p;
  const kind = op.kind === "cloak" ? "cloak" : "manifest";
  const r = ensureRoom(room);
  r.faceDownSecrets[publicId] = { card: clone(original), owner: original.owner, controller: p, kind, source: "library", storedAt: new Date().toISOString() };
  const pub = hiddenCard(original, publicId, kind);
  const creatures = room.state && room.state.players && room.state.players[p] && room.state.players[p].creatures;
  if (!Array.isArray(creatures)) throw new Error("publicBattlefieldMissing");
  creatures.push(pub);
  return { kind: kind === "cloak" ? "cloakTop" : "manifestTop", cardId: publicId, player: p };
}
function normalizeOption(raw, index) {
  if (typeof raw === "string") return { id: `opt${index + 1}`, label: text(raw, 100), value: text(raw, 100), action: null };
  raw = raw && typeof raw === "object" ? raw : {};
  const action = raw.action && typeof raw.action === "object" ? clone(raw.action) : null;
  if (action) throw new Error("choiceActionRequiresVerifiedEffect");
  let value = raw.value == null ? (raw.id || index) : raw.value;
  if (typeof value === "number") value = Number.isFinite(value) ? Math.max(-1000000, Math.min(1000000, value)) : 0;
  else if (typeof value !== "boolean") value = text(value, 100);
  return { id: text(raw.id || `opt${index + 1}`, 60), label: text(raw.label || raw.id || `選択肢${index + 1}`, 100), value, action: null };
}
function choiceOrder(room, mode, custom) {
  const active = room.state && room.state.turn && room.state.turn.active === "B" ? "B" : "A";
  const nap = other(active);
  if (mode === "NAPAP") return [nap, active];
  if (mode === "custom" && Array.isArray(custom)) {
    const out = [...new Set(custom.map(role).filter(Boolean))];
    if (out.length) return out;
  }
  return [active, nap];
}
function startChoice(room, client, op) {
  const sourceId = text(op.sourceCardId, 100), source = sourceId ? findPublic(room, sourceId) : null;
  // Card-effect choices validate the public source and its controller.
  // The v7.9.12 client API also exposes source-less sequential choices for
  // generic game decisions and diagnostics; those are seat-authorized and
  // cannot carry arbitrary actions (normalizeOption rejects them).
  if (sourceId && !source) throw new Error("choiceSourceMissing");
  const controller = source ? (role(source.card.controller) || role(source.card.owner) || source.role) : role(client && client.role);
  if (!controller || !actorAllowed(room, client, controller)) throw new Error("choiceSourceNotControlled");
  const options = (Array.isArray(op.options) ? op.options : []).slice(0, 20).map(normalizeOption);
  if (!options.length) throw new Error("choiceOptionsMissing");
  if (new Set(options.map(x => x.id)).size !== options.length) throw new Error("choiceOptionIdDuplicate");
  const min = finiteInt(op.min == null ? 1 : op.min, 0, options.length), max = finiteInt(op.max == null ? 1 : op.max, 0, options.length);
  if (min == null || max == null || max < min) throw new Error("choiceRangeInvalid");
  const players = choiceOrder(room, op.order, op.players);
  if (op.distinctAcrossPlayers && options.length < players.length * min) throw new Error("choiceDistinctRangeImpossible");
  const seq = {
    id: id("choice"), label: text(op.label || "順次選択", 120), prompt: text(op.prompt || "選択してください", 240),
    players, index: 0, options, min, max,
    secret: !!op.secret, distinctAcrossPlayers: !!op.distinctAcrossPlayers, status: "pending", answers: {},
    createdAt: new Date().toISOString(), sourceCardId: text(op.sourceCardId, 100), actorRole: client.role,
  };
  ensureRoom(room).choices.unshift(seq);
  if (ensureRoom(room).choices.length > 120) ensureRoom(room).choices.length = 120;
  return { kind: "choiceStart", choiceId: seq.id, players: seq.players.slice() };
}
function applyChoiceAction(room, p, action) {
  if (!action) return;
  const player = room.state && room.state.players && room.state.players[p];
  if (!player) throw new Error("playerStateMissing");
  const amount = finiteInt(action.amount, 0, 20) || 0;
  if (action.kind === "gainLife") player.life = Number(player.life || 0) + amount;
  else if (action.kind === "loseLife") player.life = Number(player.life || 0) - amount;
  else if (action.kind === "draw") {
    const zones = privateZones(room, p);
    if (!zones || !Array.isArray(zones.library) || !Array.isArray(zones.hand)) throw new Error("privateDrawStateMissing");
    for (let i = 0; i < amount; i++) {
      const card = zones.library.pop(); if (!card) break;
      card.zone = "hand"; zones.hand.push(card); popPublicLibraryPlaceholder(room, p); pushPublicHandPlaceholder(room, p, card);
    }
  }
}
function respondChoice(room, client, msg) {
  const r = ensureRoom(room), seq = r.choices.find(x => x.id === String(msg.choiceId));
  if (!seq || seq.status !== "pending") throw new Error("choiceNotFound");
  const current = seq.players[seq.index];
  if (client.role !== current) throw new Error("choiceWrongSeat");
  const ids = [...new Set((Array.isArray(msg.optionIds) ? msg.optionIds : [msg.optionIds]).map(String))];
  if (ids.length < seq.min || ids.length > seq.max) throw new Error("choiceCountInvalid");
  const used = new Set();
  if (seq.distinctAcrossPlayers) for (const [p, list] of Object.entries(seq.answers)) if (p !== current) for (const x of list || []) used.add(String(x));
  const allowed = new Set(seq.options.filter(o => !used.has(String(o.id))).map(o => String(o.id)));
  if (ids.some(x => !allowed.has(x))) throw new Error("choiceOptionIllegal");
  const before = cloneRoomMutable(room);
  try {
    seq.answers[current] = ids; seq.index++;
    if (seq.index >= seq.players.length) {
      seq.status = "complete"; seq.completedAt = new Date().toISOString();
    }
    audit(room, "choiceResponse", { choiceId: seq.id, role: current, count: ids.length, complete: seq.status === "complete" });
    return seq;
  } catch (error) {
    restoreRoomMutable(room, before);
    throw error;
  }
}
function publicChoice(seq) {
  const out = clone(seq);
  if (out.secret && out.status !== "complete") {
    const hidden = {};
    for (const p of out.players) if (out.answers[p]) hidden[p] = { submitted: true, count: out.answers[p].length };
    out.answers = hidden;
  }
  return out;
}
function pruneFaceDownSecrets(room) {
  const r = ensureRoom(room);
  for (const publicId of Object.keys(r.faceDownSecrets)) {
    const found = findPublic(room, publicId);
    if (!found || !found.card || found.card.faceDown !== true) delete r.faceDownSecrets[publicId];
    else r.faceDownSecrets[publicId].controller = role(found.card.controller) || r.faceDownSecrets[publicId].controller;
  }
  return r;
}
function publicRuntime(room) {
  const r = pruneFaceDownSecrets(room);
  const tx = p => r.txByRole[p] ? { id: r.txByRole[p].id, role: p, createdAt: r.txByRole[p].createdAt } : null;
  return { protocol: PROTOCOL, activeTransactions: { A: tx("A"), B: tx("B") }, choices: r.choices.slice(0, 40).map(publicChoice), proofCount: r.proofs.length, lastProof: clone(r.proofs[0] || null) };
}
function privatePayload(room, p) {
  const r = pruneFaceDownSecrets(room), out = [];
  for (const [publicId, entry] of Object.entries(r.faceDownSecrets)) {
    const found = findPublic(room, publicId), currentController = role(found?.card?.controller) || entry.controller;
    if (entry.owner === p || currentController === p) out.push({ publicId, kind: entry.kind, card: clone(entry.card) });
  }
  return { protocol: PROTOCOL, faceDownReveals: out };
}
function normalizeOperation(raw) {
  raw = raw && typeof raw === "object" ? raw : {};
  const kind = String(raw.kind || "");
  if (!["turnFaceDown", "turnFaceUp", "manifestTop", "cloakTop", "choiceStart"].includes(kind)) throw new Error("effectOperationUnsupported");
  return { ...clone(raw), kind };
}
function validatePlan(room, client, rawPlan) {
  if (!role(client && client.role)) throw new Error("seatRequired");
  const plan = rawPlan && typeof rawPlan === "object" ? rawPlan : {};
  const operations = (Array.isArray(plan.operations) ? plan.operations : []).map(normalizeOperation);
  if (!operations.length || operations.length > MAX_OPS) throw new Error("operationCountInvalid");
  return { label: text(plan.label || "効果処理", 120), sourceCardId: text(plan.sourceCardId, 100), operations };
}
function snapshotState(room) {
  const r = ensureRoom(room);
  return clone({ schema: 1, choices: r.choices, faceDownSecrets: r.faceDownSecrets, proofs: r.proofs, audit: r.audit });
}
function restoreSnapshotState(room, payload) {
  const src = payload && typeof payload === "object" ? clone(payload) : {};
  room.v7912 = {
    txByRole: { A: null, B: null },
    choices: Array.isArray(src.choices) ? src.choices : [],
    faceDownSecrets: src.faceDownSecrets && typeof src.faceDownSecrets === "object" ? src.faceDownSecrets : {},
    proofs: Array.isArray(src.proofs) ? src.proofs : [],
    audit: Array.isArray(src.audit) ? src.audit : [],
  };
  return ensureRoom(room);
}
function privateDigestPayload(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const secretChoices = (Array.isArray(src.choices) ? src.choices : [])
    .filter(x => x && x.secret)
    .map(x => ({ id: String(x.id || ""), status: String(x.status || ""), index: Number(x.index || 0), answers: clone(x.answers || {}) }));
  return { faceDownSecrets: clone(src.faceDownSecrets || {}), secretChoices };
}
function cloneRoomMutable(room) {
  return { state: clone(room.state), privateByRole: clone(room.privateByRole), v7912: clone(ensureRoom(room)), rev: room.rev, updatedAt: room.updatedAt };
}
function restoreRoomMutable(room, snapshot) {
  room.state = snapshot.state; room.privateByRole = snapshot.privateByRole; room.v7912 = snapshot.v7912; room.rev = snapshot.rev; room.updatedAt = snapshot.updatedAt;
}
function stage(room, client, msg) {
  const r = ensureRoom(room), p = client.role;
  if (!role(p)) throw new Error("seatRequired");
  if (msg.protocol !== PROTOCOL) throw new Error("protocolMismatch");
  if (!text(msg.actionNonce, 120)) throw new Error("actionNonceRequired");
  if (Number(msg.baseRev) !== Number(room.rev)) throw new Error("staleRev");
  if (r.txByRole[p]) throw new Error("effectTransactionActive");
  const plan = validatePlan(room, client, msg.plan);
  const tx = { id: id("effecttx"), actionNonce: text(msg.actionNonce, 120), role: p, clientId: client.id, baseRev: Number(room.rev), plan, status: "started", createdAt: Date.now(), planCommitment: hash(plan) };
  r.txByRole[p] = tx;
  audit(room, "effectTxStarted", { txId: tx.id, role: p, operations: plan.operations.length, commitment: tx.planCommitment });
  return clone(tx);
}
function commit(room, client, msg, hooks = {}) {
  const r = ensureRoom(room), tx = r.txByRole[client.role];
  if (!tx || tx.id !== String(msg.txId)) throw new Error("effectTransactionNotFound");
  if (tx.clientId !== client.id) throw new Error("transactionOwnerMismatch");
  if (msg.protocol !== PROTOCOL) throw new Error("protocolMismatch");
  if (Number(msg.baseRev) !== Number(room.rev) || tx.baseRev !== Number(room.rev)) throw new Error("staleRev");
  const snapshot = cloneRoomMutable(room), summaries = [];
  try {
    for (const op of tx.plan.operations) {
      if (op.kind === "turnFaceDown") summaries.push(faceDown(room, client, op));
      else if (op.kind === "turnFaceUp") summaries.push(faceUp(room, client, op));
      else if (op.kind === "manifestTop" || op.kind === "cloakTop") summaries.push(manifestTop(room, client, { ...op, kind: op.kind === "cloakTop" ? "cloak" : "manifest" }));
      else if (op.kind === "choiceStart") summaries.push(startChoice(room, client, op));
    }
    r.txByRole[client.role] = null;
    if (typeof hooks.finalize === "function") hooks.finalize(room, client.role, summaries, tx);
    else { room.rev = Number(room.rev || 0) + 1; room.updatedAt = Date.now(); }
    const p = proof(room, "effectTxCommit", { txId: tx.id, role: client.role, baseRev: tx.baseRev, newRev: room.rev, planCommitment: tx.planCommitment, summaries });
    audit(room, "effectTxCommitted", { txId: tx.id, role: client.role, rev: room.rev, summaries, proof: p.commitment });
    return { txId: tx.id, actionNonce: tx.actionNonce, summaries, proof: p };
  } catch (error) { restoreRoomMutable(room, snapshot); throw error; }
}
function cancel(room, client, msg) {
  const r = ensureRoom(room), tx = r.txByRole[client.role];
  if (!tx || (msg.txId && tx.id !== String(msg.txId))) return null;
  if (tx.clientId !== client.id && !room.collaborativeMode) throw new Error("transactionOwnerMismatch");
  r.txByRole[client.role] = null;
  audit(room, "effectTxCancelled", { txId: tx.id, role: client.role, reason: text(msg.reason, 160) });
  return clone(tx);
}

function cancelClientTransactions(room, clientId) {
  const r = ensureRoom(room); let count = 0;
  for (const p of ["A", "B"]) if (r.txByRole[p]?.clientId === clientId) { r.txByRole[p] = null; count++; }
  if (count) audit(room, "effectTxDisconnected", { clientId: text(clientId, 100), count });
  return count;
}
module.exports = { PROTOCOL, ensureRoom, stage, commit, cancel, cancelClientTransactions, respondChoice, publicRuntime, privatePayload, publicChoice, validatePlan, cloneRoomMutable, restoreRoomMutable, snapshotState, restoreSnapshotState, privateDigestPayload };
