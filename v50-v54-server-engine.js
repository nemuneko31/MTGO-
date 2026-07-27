"use strict";

const crypto = require("crypto");

const PROTOCOLS = Object.freeze({
  RULE: "cpt-v5.0",
  LIBRARY: "cpt-v5.1",
  CAST: "cpt-v5.2",
  ABILITY: "cpt-v5.3",
  EFFECT: "cpt-v5.4",
});

const AUTHORITY_FLAGS = Object.freeze({
  ruleProtocol: PROTOCOLS.RULE,
  actionProtocol: PROTOCOLS.RULE,
  serverRulesV50: true,
  secureRandom: "node:crypto.randomInt",
  authoritativeShuffleDraw: true,
  shuffleCommitments: true,
  libraryProtocol: PROTOCOLS.LIBRARY,
  serverLibraryTransactionsV51: true,
  transactionConsent: true,
  transactionProofs: true,
  castProtocol: PROTOCOLS.CAST,
  serverCastTransactionsV52: true,
  serverPaymentValidation: true,
  serverTargetSnapshotValidation: true,
  abilityProtocol: PROTOCOLS.ABILITY,
  serverAbilityTransactionsV53: true,
  serverAbilityCostValidation: true,
  serverStackLifecycleV53: true,
  effectProtocol: PROTOCOLS.EFFECT,
  serverStructuredEffectsV54: true,
  serverTargetLegalityV54: true,
  serverResolutionRevalidationV54: true,
  wardAcknowledgementV54: true,
});

const MESSAGE_TYPES = Object.freeze([
  "requestRuleAuthority", "ruleRegister", "ruleAction", "ruleRevealProofs",
  "libraryTxStart", "libraryTxApprove", "libraryTxCommit", "libraryTxCancel",
  "castTxStart", "castTxCommit", "castTxCancel",
  "abilityTxStart", "abilityTxCommit", "abilityTxCancel",
  "stackTxStart", "stackTxCommit", "stackTxCancel",
]);

const ROLE_SET = new Set(["A", "B"]);
const PRIVATE_ZONES = new Set(["hand", "library", "sideboard"]);
const PUBLIC_ZONES = new Set(["creatures", "lands", "others", "graveyard", "exile", "command"]);
const LIBRARY_OPS = new Set(["scry", "surveil", "mill", "reorder", "look", "reveal", "search"]);
const TX_TTL_MS = 3 * 60 * 1000;
const MAX_NONCES = 2048;
const MAX_DRAW = 20;
const MAX_LIBRARY_COUNT = 30;
const MAX_SEARCH_RESULTS = 1000;
const MANA_SYMBOLS = ["W", "U", "B", "R", "G", "C"];
const SUPPORTED_EFFECTS = new Set(["life", "damage", "draw", "counter", "tap", "untap", "move", "token", "pt", "keyword", "type"]);

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function now() { return Date.now(); }
function sha256(value) { return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex"); }
function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`; }
function int(value, min = 0, max = Number.MAX_SAFE_INTEGER) { return Math.max(min, Math.min(max, Math.trunc(Number(value) || 0))); }
function text(value, max = 160) { return String(value == null ? "" : value).replace(/[\u0000-\u001f]/g, "").slice(0, max); }
function ids(value, max = 100) { return [...new Set((Array.isArray(value) ? value : []).map(x => String(x || "")).filter(Boolean))].slice(0, max); }
function isSeat(role) { return ROLE_SET.has(role); }
function otherRole(role) { return role === "A" ? "B" : "A"; }
function totalMana(cost) { return MANA_SYMBOLS.reduce((n, k) => n + int(cost?.[k]), int(cost?.generic) + int(cost?.X)); }
function manaConsumed(payment) { return MANA_SYMBOLS.reduce((n, k) => n + int(payment?.consumed?.[k]), 0); }
function cardName(card) { return text(card?.name || card?.displayName || "カード", 120); }
function cardTypes(card) {
  const out = Array.isArray(card?.types) ? card.types.map(String) : [];
  if (card?.type && !out.includes(String(card.type))) out.push(String(card.type));
  return out;
}
function isPermanent(card) { return cardTypes(card).some(t => ["Creature", "Artifact", "Enchantment", "Planeswalker", "Battle", "Land", "Token"].includes(t)); }
function normalizeManaPool(player) {
  player.manaPool = player.manaPool && typeof player.manaPool === "object" ? player.manaPool : {};
  for (const k of MANA_SYMBOLS) player.manaPool[k] = int(player.manaPool[k]);
  return player.manaPool;
}
function secureShuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function orderCommitment(cards, salt) { return sha256({ salt, ids: cards.map(c => String(c?.id || "")), names: cards.map(cardName) }); }
function ensureCardId(card, prefix = "card") { if (!card.id) card.id = uid(prefix); return String(card.id); }
function sourceController(card, fallback) { return isSeat(card?.controller) ? card.controller : (isSeat(card?.owner) ? card.owner : fallback); }

function createEngine(deps = {}) {
  const D = {
    send: deps.send || (() => {}),
    broadcast: deps.broadcast || (() => {}),
    pushLog: deps.pushLog || (() => {}),
    refreshRoomHash: deps.refreshRoomHash || (() => {}),
    privateStateFor: deps.privateStateFor || ((room, role) => room.privateByRole?.[role]?.state || null),
    rolePrivate: deps.rolePrivate || ((room, role) => room.privateByRole?.[role] || null),
    validatePrivateState: deps.validatePrivateState || ((client, room, msg) => clone(msg.privateState)),
    finalizeRoom: deps.finalizeRoom || ((room) => { room.rev = Number(room.rev || 0) + 1; room.updatedAt = now(); }),
    authority: deps.authority || (() => AUTHORITY_FLAGS),
    effectAuthority: deps.effectAuthority || (() => null),
    preResolveStackObject: deps.preResolveStackObject || null,
  };

  function send(client, value) { D.send(client?.ws || client, value); }
  function broadcast(room, value, exceptId = "") { D.broadcast(room, value, exceptId); }
  function clientId(client) { return String(client?.id || client?.clientId || ""); }

  function ensureRoom(room) {
    if (!room.v50v54 || typeof room.v50v54 !== "object") {
      room.v50v54 = {
        seats: { A: null, B: null },
        proofs: [], nonces: new Set(),
        libraryTx: null, libraryRequest: null,
        castTx: null, abilityTx: null, stackTx: null,
        audit: [],
      };
    }
    const r = room.v50v54;
    if (!(r.nonces instanceof Set)) r.nonces = new Set(Array.isArray(r.nonces) ? r.nonces : []);
    if (!Array.isArray(r.proofs)) r.proofs = [];
    if (!Array.isArray(r.audit)) r.audit = [];
    if (!r.seats) r.seats = { A: null, B: null };
    return r;
  }

  function prune(room) {
    const r = ensureRoom(room), t = now();
    for (const key of ["libraryTx", "castTx", "abilityTx", "stackTx"]) {
      const tx = r[key];
      if (tx && Number(tx.expiresAt) <= t) r[key] = null;
    }
    if (r.libraryRequest && Number(r.libraryRequest.expiresAt) <= t) r.libraryRequest = null;
  }

  function anyActive(room) {
    prune(room); const r = ensureRoom(room);
    return !!(r.libraryTx || r.libraryRequest || r.castTx || r.abilityTx || r.stackTx);
  }
  function activeKind(room) {
    prune(room); const r = ensureRoom(room);
    if (r.libraryTx || r.libraryRequest) return "libraryTransactionActive";
    if (r.castTx) return "castTransactionActive";
    if (r.abilityTx) return "abilityTransactionActive";
    if (r.stackTx) return "stackTransactionActive";
    return "";
  }

  function rememberNonce(room, nonce) {
    nonce = text(nonce, 200);
    if (!nonce) return false;
    const r = ensureRoom(room);
    if (r.nonces.has(nonce)) return false;
    r.nonces.add(nonce);
    while (r.nonces.size > MAX_NONCES) r.nonces.delete(r.nonces.values().next().value);
    return true;
  }

  function authoritySummary(room) {
    const r = ensureRoom(room);
    const seat = role => {
      const p = privateState(room, role), z = p?.zones || {};
      return {
        registered: !!r.seats[role],
        hand: Array.isArray(z.hand) ? z.hand.length : 0,
        library: Array.isArray(z.library) ? z.library.length : 0,
        sideboard: Array.isArray(z.sideboard) ? z.sideboard.length : 0,
        commitment: r.seats[role]?.commitment || "",
        shuffleCount: int(r.seats[role]?.shuffleCount),
        drawCount: int(r.seats[role]?.drawCount),
      };
    };
    return {
      protocol: PROTOCOLS.RULE,
      seats: { A: seat("A"), B: seat("B") },
      active: activeKind(room) || null,
      libraryTx: r.libraryTx ? publicLibraryTx(r.libraryTx) : null,
      castTx: r.castTx ? publicCastTx(r.castTx) : null,
      abilityTx: r.abilityTx ? publicAbilityTx(r.abilityTx) : null,
      stackTx: r.stackTx ? publicStackTx(r.stackTx) : null,
      proofCount: r.proofs.length,
    };
  }

  function record(room, kind, data = {}) {
    const r = ensureRoom(room), entry = { at: new Date().toISOString(), kind, ...clone(data) };
    r.audit.unshift(entry); if (r.audit.length > 240) r.audit.length = 240;
    D.pushLog(room, { kind: `v50v54:${kind}`, ...clone(data) });
    return entry;
  }

  function privateState(room, role) {
    const p = D.privateStateFor(room, role);
    return p && typeof p === "object" ? p : null;
  }
  function privateZones(room, role) {
    const p = privateState(room, role);
    if (!p?.zones) throw new Error("privateStateRequired");
    for (const z of ["hand", "library", "sideboard"]) if (!Array.isArray(p.zones[z])) p.zones[z] = [];
    return p.zones;
  }
  function publicPlayer(room, role) {
    const p = room.state?.players?.[role];
    if (!p || typeof p !== "object") throw new Error("publicPlayerMissing");
    for (const z of ["hand", "library", "sideboard", "creatures", "lands", "others", "graveyard", "exile", "command"]) if (!Array.isArray(p[z])) p[z] = [];
    normalizeManaPool(p);
    return p;
  }
  function opaqueId(role, zone, card, index) { return `hidden-${role}-${zone}-${sha256(String(card?.id || index)).slice(0, 14)}`; }
  function hiddenStub(role, zone, card, index) {
    return {
      id: opaqueId(role, zone, card, index), name: "非公開カード", owner: role, controller: role,
      zone, type: "Unknown", types: ["Unknown"], subtype: "", power: "", toughness: "",
      tapped: false, countersPlus: 0, damage: 0, counters: {}, attacking: false,
      blocking: false, blockingTargetId: null, blockingTargetIds: [], faceDown: true,
      imageId: null, imageUrl: null, memo: "", v48Redacted: true,
      v48HiddenZone: zone, v48OriginPlayer: role,
    };
  }
  function syncPublicHidden(room, role) {
    if (!room.state) return;
    const pub = publicPlayer(room, role), zones = privateZones(room, role);
    for (const z of ["hand", "library", "sideboard"]) pub[z] = zones[z].map((c, i) => hiddenStub(role, z, c, i));
    const m = room.state.__cptOnlineV48;
    if (m?.hidden?.[role]) {
      m.hidden[role].hand = zones.hand.length;
      m.hidden[role].library = zones.library.length;
      m.hidden[role].sideboard = zones.sideboard.length;
    }
  }
  function touchPrivate(room, role) {
    const entry = D.rolePrivate(room, role), p = privateState(room, role);
    if (!entry || !p) return;
    entry.rev = int(entry.rev) + 1;
    room.privateRevByRole = room.privateRevByRole || { A: 0, B: 0 };
    room.privateRevByRole[role] = entry.rev;
    entry.updatedAt = now();
    if (p.__cptPrivateV49) {
      p.__cptPrivateV49.basePublicRev = Number(room.rev || 0) + 1;
      p.__cptPrivateV49.privateRev = entry.rev;
      p.__cptPrivateV49.storedAt = new Date().toISOString();
      p.__cptPrivateV49.privateHash = "";
      p.__cptPrivateV49.privateHash = fnvPrivateHash(p);
      entry.hash = p.__cptPrivateV49.privateHash;
    } else entry.hash = sha256(p);
    entry.sha256 = sha256(p);
  }
  function fnv1a(textValue) {
    let h = 0x811c9dc5; const s = String(textValue);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return (`00000000${h.toString(16)}`).slice(-8);
  }
  function fnvPrivateHash(p) { const x = clone(p); if (x?.__cptPrivateV49) x.__cptPrivateV49.privateHash = ""; return fnv1a(JSON.stringify(x)); }

  function snapshotMutable(room) {
    return {
      state: clone(room.state), rev: room.rev,
      privateA: clone(privateState(room, "A")), privateB: clone(privateState(room, "B")),
      entryA: cloneEntry(D.rolePrivate(room, "A")), entryB: cloneEntry(D.rolePrivate(room, "B")),
    };
  }
  function cloneEntry(entry) {
    if (!entry) return null;
    const out = { ...entry, state: undefined };
    delete out.state; return clone(out);
  }
  function restoreMutable(room, snap) {
    room.state = clone(snap.state); room.rev = snap.rev;
    for (const role of ["A", "B"]) {
      const entry = D.rolePrivate(room, role), st = role === "A" ? snap.privateA : snap.privateB, meta = role === "A" ? snap.entryA : snap.entryB;
      if (entry) { Object.assign(entry, meta || {}); entry.state = clone(st); }
    }
    D.refreshRoomHash(room);
  }
  function finalize(room, affectedRoles = [], label = "") {
    for (const role of [...new Set(affectedRoles.filter(isSeat))]) { syncPublicHidden(room, role); touchPrivate(room, role); }
    D.finalizeRoom(room, affectedRoles, label);
    if (room.state?.__cptOnlineV48) {
      room.state.__cptOnlineV48.baseRev = room.rev;
      room.state.__cptOnlineV48.senderRole = "server";
      room.state.__cptOnlineV48.senderClientId = "server";
      room.state.__cptOnlineV48.sentAt = new Date().toISOString();
      room.state.__cptOnlineV48.nonce = uid("server");
    }
    D.refreshRoomHash(room);
  }

  function privatePayload(room, role) { return isSeat(role) ? clone(privateState(room, role)) : null; }
  function commonPayload(room, client, extra = {}) {
    return {
      ...extra, rev: room.rev, state: room.state,
      privateState: privatePayload(room, client?.role),
      authoritySummary: authoritySummary(room), authority: D.authority(),
      effectAuthority: D.effectAuthority(room),
    };
  }
  function broadcastPublic(room, type, extra = {}, exceptId = "") {
    for (const c of room.clients.values()) {
      if (clientId(c) === exceptId) continue;
      send(c, commonPayload(room, c, { type, ...extra }));
    }
  }
  function reject(client, room, type, msg, reason, detail = "") {
    send(client, {
      type, protocol: msg?.protocol || "", actionNonce: text(msg?.actionNonce, 200),
      txId: text(msg?.txId, 200), reason: text(reason, 180), detail: text(detail, 300),
      rev: Number(room?.rev || 0), authoritySummary: room ? authoritySummary(room) : null,
      authority: D.authority(),
    });
  }

  function verifySeatBase(client, room, msg, protocol, nonceRequired = true) {
    if (!isSeat(client?.role)) throw new Error("seatRequired");
    if (msg.protocol !== protocol) throw new Error("protocolMismatch");
    if (Number(msg.baseRev) !== Number(room.rev)) throw new Error("staleRev");
    if (nonceRequired && !rememberNonce(room, msg.actionNonce)) throw new Error("duplicateNonce");
  }
  function ensureIdle(room) { const k = activeKind(room); if (k) throw new Error(k); }
  function findClientByRole(room, role) { return [...room.clients.values()].find(c => c.role === role) || null; }

  function makeProof(room, kind, data) {
    const salt = crypto.randomBytes(18).toString("hex");
    const body = { id: uid("proof"), kind, at: new Date().toISOString(), rev: Number(room.rev || 0), data: clone(data), salt };
    body.commitment = sha256(body);
    ensureRoom(room).proofs.unshift(body);
    if (ensureRoom(room).proofs.length > 320) ensureRoom(room).proofs.length = 320;
    return body;
  }
  function publicProof(proof) { return { id: proof.id, kind: proof.kind, at: proof.at, rev: proof.rev, commitment: proof.commitment }; }

  function seatCommitment(room, role) {
    const library = privateZones(room, role).library;
    const salt = crypto.randomBytes(18).toString("hex");
    return { commitment: orderCommitment(library, salt), salt, libraryIds: library.map(c => String(c?.id || "")) };
  }
  function updateSeatCommitment(room, role, action) {
    const r = ensureRoom(room), prior = r.seats[role] || {};
    const c = seatCommitment(room, role);
    r.seats[role] = {
      registeredAt: prior.registeredAt || new Date().toISOString(),
      commitment: c.commitment, commitmentSalt: c.salt, libraryIds: c.libraryIds,
      shuffleCount: int(prior.shuffleCount) + (action === "shuffle" || action === "mulligan" || action === "registerShuffle" ? 1 : 0),
      drawCount: int(prior.drawCount) + (action === "draw" ? 1 : 0),
      lastAction: action, updatedAt: new Date().toISOString(),
    };
    return r.seats[role];
  }

  function handleRuleRegister(client, room, msg) {
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.RULE);
      ensureIdle(room);
      const normalized = D.validatePrivateState(client, room, { ...msg, protocol: "cpt-v4.9", publicRev: room.rev });
      if (!normalized || typeof normalized !== "object") throw new Error("privateStateInvalid");
      let entry = D.rolePrivate(room, client.role);
      if (!entry) {
        room.privateByRole = room.privateByRole || { A: null, B: null };
        room.privateByRole[client.role] = { state: null, rev: 0, updatedAt: now(), clientId: clientId(client), hash: "", sha256: "" };
        entry = room.privateByRole[client.role];
      }
      const backup = snapshotMutable(room);
      try {
        entry.state = clone(normalized);
        const privateNonce = text(entry.state?.__cptPrivateV49?.nonce, 200);
        room.privateSeenNonces = room.privateSeenNonces || { A: new Set(), B: new Set() };
        if (privateNonce) {
          room.privateSeenNonces[client.role].add(privateNonce);
          while (room.privateSeenNonces[client.role].size > 300) room.privateSeenNonces[client.role].delete(room.privateSeenNonces[client.role].values().next().value);
        }
        const zones = privateZones(room, client.role);
        for (const z of ["hand", "library", "sideboard"]) for (const c of zones[z]) ensureCardId(c, `${client.role}-${z}`);
        let action = "register";
        if (msg.shuffleNow) { zones.library = secureShuffle(zones.library); entry.state.zones.library = zones.library; action = "registerShuffle"; }
        const seat = updateSeatCommitment(room, client.role, action);
        finalize(room, [client.role], action);
        const proof = makeProof(room, action, { role: client.role, libraryCount: zones.library.length, commitment: seat.commitment });
        record(room, action, { role: client.role, rev: room.rev });
        const payload = commonPayload(room, client, { type: "ruleActionResult", protocol: PROTOCOLS.RULE, actionNonce: text(msg.actionNonce), action: "register", drawn: 0, commitment: proof.commitment });
        send(client, payload); broadcastPublic(room, "rulePublicSync", { protocol: PROTOCOLS.RULE, action: "register", actorRole: client.role, commitment: proof.commitment }, clientId(client));
        broadcastRuleSummary(room);
      } catch (e) { restoreMutable(room, backup); throw e; }
    } catch (e) { reject(client, room, "ruleActionRejected", msg, e.message || e); }
  }

  function handleRuleAction(client, room, msg) {
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.RULE);
      ensureIdle(room);
      const r = ensureRoom(room), role = client.role, seat = r.seats[role];
      if (!seat) throw new Error("ruleSeatNotRegistered");
      const action = text(msg.action, 30), count = int(msg.count, 0, MAX_DRAW), backup = snapshotMutable(room);
      try {
        const z = privateZones(room, role), pub = publicPlayer(room, role);
        let drawn = 0, failedDraws = 0;
        if (action === "shuffle") z.library = secureShuffle(z.library);
        else if (action === "draw") {
          for (let i = 0; i < count; i++) {
            const c = z.library.shift();
            if (!c) { failedDraws++; continue; }
            c.zone = "hand"; c.owner = isSeat(c.owner) ? c.owner : role; c.controller = role;
            z.hand.push(c); drawn++;
          }
          pub.drawFailed = failedDraws > 0;
          if (room.state?.turn?.drawsThisTurn) room.state.turn.drawsThisTurn[role] = int(room.state.turn.drawsThisTurn[role]) + drawn;
        } else if (action === "mulligan") {
          const oldHand = z.hand.splice(0);
          for (const c of oldHand) { c.zone = "library"; z.library.push(c); }
          z.library = secureShuffle(z.library);
          const n = count || Math.max(0, 7 - int(pub.mulligans));
          for (let i = 0; i < n; i++) { const c = z.library.shift(); if (!c) break; c.zone = "hand"; z.hand.push(c); drawn++; }
          pub.mulligans = int(pub.mulligans) + 1;
        } else throw new Error("unsupportedRuleAction");
        D.rolePrivate(room, role).state.zones = z;
        const seat2 = updateSeatCommitment(room, role, action);
        finalize(room, [role], action);
        const proof = makeProof(room, action, { role, count, drawn, failedDraws, libraryCommitment: seat2.commitment });
        record(room, action, { role, count, drawn, rev: room.rev });
        send(client, commonPayload(room, client, { type: "ruleActionResult", protocol: PROTOCOLS.RULE, actionNonce: text(msg.actionNonce), action, drawn, failedDraws, commitment: proof.commitment }));
        broadcastPublic(room, "rulePublicSync", { protocol: PROTOCOLS.RULE, action, actorRole: role, drawn, failedDraws, commitment: proof.commitment }, clientId(client));
        broadcastRuleSummary(room);
      } catch (e) { restoreMutable(room, backup); throw e; }
    } catch (e) { reject(client, room, "ruleActionRejected", msg, e.message || e); }
  }

  function handleProofReveal(client, room, msg) {
    if (!isSeat(client.role)) return reject(client, room, "ruleActionRejected", msg, "seatRequired");
    if (msg.protocol !== PROTOCOLS.RULE) return reject(client, room, "ruleActionRejected", msg, "protocolMismatch");
    if (String(msg.confirm || "") !== "END_GAME") return reject(client, room, "ruleActionRejected", msg, "confirmationRequired");
    send(client, { type: "ruleProofReveal", protocol: PROTOCOLS.RULE, proofs: clone(ensureRoom(room).proofs), authoritySummary: authoritySummary(room), authority: D.authority() });
  }
  function broadcastRuleSummary(room) { broadcast(room, { type: "ruleAuthorityUpdate", authoritySummary: authoritySummary(room), authority: D.authority() }); }

  function filterSearchCards(cards, filter = {}) {
    const q = text(filter.query, 120).toLowerCase(), type = text(filter.type, 50), color = text(filter.color, 4), landMode = text(filter.landMode, 20);
    return cards.filter(c => {
      if (q && !`${cardName(c)} ${c?.oracleText || ""} ${c?.memo || ""}`.toLowerCase().includes(q)) return false;
      const ts = cardTypes(c);
      if (type && !ts.includes(type)) return false;
      const colors = Array.isArray(c?.colors) ? c.colors.map(String) : [];
      if (color && !colors.includes(color)) return false;
      if (landMode === "land" && !ts.includes("Land")) return false;
      if (landMode === "nonland" && ts.includes("Land")) return false;
      return true;
    });
  }
  function libraryCardsFor(room, targetRole, operation, count, options) {
    const lib = privateZones(room, targetRole).library;
    if (operation === "search") return filterSearchCards(lib, options?.filter || {}).slice(0, MAX_SEARCH_RESULTS).map(clone);
    return lib.slice(0, count).map(clone);
  }
  function publicLibraryTx(tx) {
    return tx ? { id: tx.id, operation: tx.operation, actorRole: tx.actorRole, targetRole: tx.targetRole, baseRev: tx.baseRev, expiresAt: tx.expiresAt, approvalRequired: !!tx.approvalRequired } : null;
  }
  function sendLibraryStarted(room, tx) {
    const actor = room.clients.get(tx.clientId) || [...room.clients.values()].find(c => clientId(c) === tx.clientId);
    if (!actor) return;
    send(actor, {
      type: "libraryTxStarted", protocol: PROTOCOLS.LIBRARY, txId: tx.id, actionNonce: tx.actionNonce,
      baseRev: tx.baseRev, operation: tx.operation, targetRole: tx.targetRole,
      cards: clone(tx.cards), options: clone(tx.options), snapshotCommitment: tx.snapshotHash,
      authoritySummary: authoritySummary(room), authority: D.authority(),
    });
  }
  function handleLibraryStart(client, room, msg) {
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.LIBRARY);
      ensureIdle(room);
      const op = text(msg.operation, 30); if (!LIBRARY_OPS.has(op)) throw new Error("unsupportedLibraryOperation");
      const targetRole = isSeat(msg.targetRole) ? msg.targetRole : client.role;
      if (!ensureRoom(room).seats[targetRole]) throw new Error("targetSeatNotRegistered");
      const count = int(msg.count, 1, MAX_LIBRARY_COUNT), options = clone(msg.options || {}), cards = libraryCardsFor(room, targetRole, op, count, options);
      const lib = privateZones(room, targetRole).library;
      const tx = {
        id: uid("libtx"), kind: "library", actionNonce: text(msg.actionNonce), clientId: clientId(client), actorRole: client.role,
        targetRole, operation: op, count, options, cards, baseRev: room.rev,
        snapshotHash: sha256(lib.map(c => String(c?.id || ""))), expiresAt: now() + TX_TTL_MS,
        approvalRequired: targetRole !== client.role,
      };
      const r = ensureRoom(room);
      if (tx.approvalRequired) {
        const targetClient = findClientByRole(room, targetRole); if (!targetClient) throw new Error("targetSeatOffline");
        const request = { id: uid("libreq"), tx, expiresAt: now() + 60_000 };
        r.libraryRequest = request;
        send(client, { type: "libraryTxRequestPending", protocol: PROTOCOLS.LIBRARY, requestId: request.id, operation: op, targetRole, authoritySummary: authoritySummary(room), authority: D.authority() });
        send(targetClient, { type: "libraryTxApprovalRequested", protocol: PROTOCOLS.LIBRARY, requestId: request.id, actorRole: client.role, operation: op, count, options: clone(options), authoritySummary: authoritySummary(room), authority: D.authority() });
      } else { r.libraryTx = tx; sendLibraryStarted(room, tx); }
      record(room, "libraryStart", { txId: tx.id, operation: op, actorRole: client.role, targetRole });
      broadcastRuleSummary(room);
    } catch (e) { reject(client, room, "libraryTxRejected", msg, e.message || e); }
  }
  function handleLibraryApprove(client, room, msg) {
    const r = ensureRoom(room), req = r.libraryRequest;
    if (!req || String(msg.requestId || "") !== req.id) return reject(client, room, "libraryTxRejected", msg, "requestNotFound");
    if (client.role !== req.tx.targetRole) return reject(client, room, "libraryTxRejected", msg, "approvalRoleMismatch");
    const actor = room.clients.get(req.tx.clientId) || [...room.clients.values()].find(c => clientId(c) === req.tx.clientId);
    if (!msg.approve) {
      r.libraryRequest = null;
      if (actor) send(actor, { type: "libraryTxRequestResolved", protocol: PROTOCOLS.LIBRARY, requestId: req.id, approved: false, reason: text(msg.reason, 160), authoritySummary: authoritySummary(room), authority: D.authority() });
      send(client, { type: "libraryTxRequestResolved", protocol: PROTOCOLS.LIBRARY, requestId: req.id, approved: false, authoritySummary: authoritySummary(room), authority: D.authority() });
      broadcastRuleSummary(room); return;
    }
    r.libraryRequest = null; r.libraryTx = req.tx;
    if (actor) { send(actor, { type: "libraryTxRequestResolved", protocol: PROTOCOLS.LIBRARY, requestId: req.id, approved: true, authoritySummary: authoritySummary(room), authority: D.authority() }); sendLibraryStarted(room, req.tx); }
    send(client, { type: "libraryTxRequestResolved", protocol: PROTOCOLS.LIBRARY, requestId: req.id, approved: true, authoritySummary: authoritySummary(room), authority: D.authority() });
    broadcastRuleSummary(room);
  }
  function exactPartition(allIds, groups) {
    const flat = groups.flat();
    return flat.length === allIds.length && new Set(flat).size === allIds.length && flat.every(x => allIds.includes(x));
  }
  function movePublicCard(room, role, card, destination) {
    const p = publicPlayer(room, role); card.zone = destination; card.owner = isSeat(card.owner) ? card.owner : role; card.controller = role;
    if (destination === "battlefield") {
      const ts = cardTypes(card); if (ts.includes("Land")) { card.zone = "lands"; p.lands.push(card); }
      else if (ts.includes("Creature")) { card.zone = "creatures"; p.creatures.push(card); }
      else { card.zone = "others"; p.others.push(card); }
    } else {
      const z = PUBLIC_ZONES.has(destination) ? destination : "graveyard";
      card.zone = z; p[z].push(card);
    }
  }
  function handleLibraryCommit(client, room, msg) {
    const r = ensureRoom(room), tx = r.libraryTx;
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.LIBRARY);
      if (!tx || String(msg.txId || "") !== tx.id) throw new Error("transactionNotFound");
      if (tx.clientId !== clientId(client)) throw new Error("transactionOwnerMismatch");
      const lib = privateZones(room, tx.targetRole).library;
      if (sha256(lib.map(c => String(c?.id || ""))) !== tx.snapshotHash) throw new Error("librarySnapshotChanged");
      const backup = snapshotMutable(room), plan = msg.plan || {};
      try {
        const cardsById = new Map(lib.map(c => [String(c?.id || ""), c]));
        const txIds = tx.cards.map(c => String(c?.id || ""));
        let revealed = [], moved = [];
        if (tx.operation === "look" || tx.operation === "reveal") {
          if (tx.operation === "reveal") revealed = tx.cards.map(cardName);
        } else if (tx.operation === "reorder") {
          const order = ids(plan.orderIds, MAX_LIBRARY_COUNT); if (!exactPartition(txIds, [order])) throw new Error("invalidReorderPlan");
          const remaining = lib.filter(c => !txIds.includes(String(c?.id || ""))); D.rolePrivate(room, tx.targetRole).state.zones.library = [...order.map(id => cardsById.get(id)), ...remaining];
        } else if (tx.operation === "mill") {
          const order = ids(plan.graveyardOrderIds, MAX_LIBRARY_COUNT); if (!exactPartition(txIds, [order])) throw new Error("invalidMillPlan");
          D.rolePrivate(room, tx.targetRole).state.zones.library = lib.filter(c => !txIds.includes(String(c?.id || "")));
          for (const id of order) { const c = cardsById.get(id); movePublicCard(room, tx.targetRole, c, "graveyard"); moved.push(id); }
        } else if (tx.operation === "scry" || tx.operation === "surveil") {
          const top = ids(plan.topIds, MAX_LIBRARY_COUNT), other = ids(tx.operation === "scry" ? plan.bottomIds : plan.graveyardIds, MAX_LIBRARY_COUNT);
          if (!exactPartition(txIds, [top, other])) throw new Error("invalidPartitionPlan");
          const remaining = lib.filter(c => !txIds.includes(String(c?.id || "")));
          if (tx.operation === "scry") D.rolePrivate(room, tx.targetRole).state.zones.library = [...top.map(id => cardsById.get(id)), ...remaining, ...other.map(id => cardsById.get(id))];
          else {
            D.rolePrivate(room, tx.targetRole).state.zones.library = [...top.map(id => cardsById.get(id)), ...remaining];
            for (const id of other) { const c = cardsById.get(id); movePublicCard(room, tx.targetRole, c, "graveyard"); moved.push(id); }
          }
        } else if (tx.operation === "search") {
          const selected = ids(plan.selectedIds, MAX_LIBRARY_COUNT), min = int(tx.options.minPicks, 0, 30), max = int(tx.options.maxPicks, 0, 30) || 30;
          if (selected.length < min || selected.length > max || selected.some(id => !txIds.includes(id))) throw new Error("invalidSearchSelection");
          let nextLib = lib.filter(c => !selected.includes(String(c?.id || "")));
          const dest = text(tx.options.destination || "hand", 30);
          for (const id of selected) {
            const c = cardsById.get(id); moved.push(id);
            if (dest === "hand") { c.zone = "hand"; privateZones(room, tx.targetRole).hand.push(c); }
            else if (dest === "top") { c.zone = "library"; nextLib.unshift(c); }
            else if (dest === "bottom") { c.zone = "library"; nextLib.push(c); }
            else movePublicCard(room, tx.targetRole, c, dest);
          }
          if (tx.options.shuffleAfter) nextLib = secureShuffle(nextLib);
          D.rolePrivate(room, tx.targetRole).state.zones.library = nextLib;
          if (tx.options.reveal) revealed = selected.map(id => cardName(cardsById.get(id)));
        }
        const seat = updateSeatCommitment(room, tx.targetRole, tx.options.shuffleAfter ? "shuffle" : "libraryTx");
        finalize(room, [tx.targetRole], `library:${tx.operation}`);
        const proof = makeProof(room, `library:${tx.operation}`, { txId: tx.id, actorRole: tx.actorRole, targetRole: tx.targetRole, moved, revealed, commitment: seat.commitment });
        r.libraryTx = null;
        record(room, "libraryCommit", { txId: tx.id, operation: tx.operation, rev: room.rev });
        send(client, commonPayload(room, client, { type: "libraryTxCommitted", protocol: PROTOCOLS.LIBRARY, txId: tx.id, actionNonce: text(msg.actionNonce), operation: tx.operation, targetRole: tx.targetRole, summary: { moved: moved.length, revealed, commitment: proof.commitment }, commitment: proof.commitment }));
        broadcastPublic(room, "libraryPublicSync", { protocol: PROTOCOLS.LIBRARY, txId: tx.id, operation: tx.operation, actorRole: tx.actorRole, targetRole: tx.targetRole, summary: { moved: moved.length, revealed }, commitment: proof.commitment }, clientId(client));
        const owner = findClientByRole(room, tx.targetRole); if (owner && clientId(owner) !== clientId(client)) send(owner, commonPayload(room, owner, { type: "libraryTxOwnerNotice", protocol: PROTOCOLS.LIBRARY, txId: tx.id, operation: tx.operation, actorRole: tx.actorRole, summary: { moved: moved.length, revealed } }));
        broadcastRuleSummary(room);
      } catch (e) { restoreMutable(room, backup); throw e; }
    } catch (e) { reject(client, room, "libraryTxRejected", msg, e.message || e); }
  }
  function handleLibraryCancel(client, room, msg) {
    const r = ensureRoom(room), tx = r.libraryTx;
    if (!tx || String(msg.txId || "") !== tx.id) return reject(client, room, "libraryTxRejected", msg, "transactionNotFound");
    if (tx.clientId !== clientId(client) && client.role !== tx.targetRole) return reject(client, room, "libraryTxRejected", msg, "transactionOwnerMismatch");
    r.libraryTx = null;
    send(client, { type: "libraryTxCancelled", protocol: PROTOCOLS.LIBRARY, txId: tx.id, reason: text(msg.reason, 120), authoritySummary: authoritySummary(room), authority: D.authority() }); broadcastRuleSummary(room);
  }

  function findPrivateCard(room, role, zone, cardId) {
    if (!PRIVATE_ZONES.has(zone)) return null;
    const arr = privateZones(room, role)[zone], index = arr.findIndex(c => String(c?.id || "") === String(cardId));
    return index >= 0 ? { card: arr[index], arr, index, zone, private: true, ownerRole: role } : null;
  }
  function findPublicCard(room, cardId) {
    if (!room.state) return null;
    for (const role of ["A", "B"]) {
      const p = publicPlayer(room, role);
      for (const zone of PUBLIC_ZONES) {
        const arr = p[zone], index = arr.findIndex(c => String(c?.id || "") === String(cardId));
        if (index >= 0) return { card: arr[index], arr, index, zone, private: false, ownerRole: role };
      }
    }
    const stack = Array.isArray(room.state.stack) ? room.state.stack : [];
    const i = stack.findIndex(c => String(c?.id || "") === String(cardId));
    return i >= 0 ? { card: stack[i], arr: stack, index: i, zone: "stack", private: false, ownerRole: sourceController(stack[i], "A") } : null;
  }
  function findSource(room, role, zone, cardId) { return PRIVATE_ZONES.has(zone) ? findPrivateCard(room, role, zone, cardId) : findPublicCard(room, cardId); }
  function targetSnapshot(room, targets) {
    const out = { cards: {}, players: {} };
    for (const id of ids(targets?.cardIds)) { const f = findPublicCard(room, id); if (f) out.cards[id] = { zone: f.zone, ownerRole: f.ownerRole, controller: sourceController(f.card, f.ownerRole), hash: sha256(f.card) }; }
    for (const role of ids(targets?.playerIds, 2)) if (isSeat(role)) out.players[role] = { life: int(room.state?.players?.[role]?.life) };
    return out;
  }
  function targetCount(targets) { return ids(targets?.cardIds).length + ids(targets?.playerIds, 2).length + ids(targets?.zoneRefs).length; }
  function validateTargetReferences(room, targets) {
    for (const id of ids(targets?.cardIds)) if (!findPublicCard(room, id)) throw new Error("targetCardMissing");
    for (const role of ids(targets?.playerIds, 2)) if (!isSeat(role)) throw new Error("targetPlayerInvalid");
    for (const ref of Array.isArray(targets?.zoneRefs) ? targets.zoneRefs : []) {
      if (!ref || typeof ref !== "object" || !isSeat(ref.role || ref.player) || !text(ref.zone, 30)) throw new Error("targetZoneInvalid");
    }
  }
  function validateTargetLimits(msg) {
    const n = targetCount(msg.targets), cfg = msg.targetConfig || {}, min = cfg.required ? Math.max(1, int(cfg.min)) : int(cfg.min), max = Math.max(min, int(cfg.max, 1, 100));
    if (n < min || n > max) throw new Error("targetCountInvalid");
    return { min, max, count: n };
  }
  function validatePayment(room, role, cost, payment) {
    const total = totalMana(cost), paid = manaConsumed(payment);
    if (total > 0 && payment?.status !== "paid") throw new Error("paymentNotConfirmed");
    if (paid < total) throw new Error("paymentInsufficient");
    const pool = normalizeManaPool(publicPlayer(room, role));
    for (const k of MANA_SYMBOLS) {
      const used = int(payment?.consumed?.[k]);
      if (used > int(pool[k])) throw new Error(`manaPoolInsufficient:${k}`);
      if (used < int(cost?.[k])) throw new Error(`coloredManaInsufficient:${k}`);
    }
    return { totalCost: total, paid, consumed: Object.fromEntries(MANA_SYMBOLS.map(k => [k, int(payment?.consumed?.[k])])), status: total ? "paid" : "free", costText: text(payment?.costText, 120) };
  }
  function applyManaPayment(room, role, payment) { const pool = normalizeManaPool(publicPlayer(room, role)); for (const k of MANA_SYMBOLS) pool[k] -= int(payment?.consumed?.[k]); }
  function applySpecialCost(room, role, special = {}) {
    const kind = text(special.kind, 40), idsList = ids(special.cardIds || special.ids, 50), p = publicPlayer(room, role);
    if (int(special.life) > 0) { if (int(p.life) < int(special.life)) throw new Error("lifeCostInsufficient"); p.life -= int(special.life); }
    if (!kind) return { label: "", kind: "", count: 0, life: int(special.life) };
    if (kind === "discard") {
      const hand = privateZones(room, role).hand;
      if (idsList.length !== int(special.count, idsList.length, 50)) throw new Error("discardCountMismatch");
      for (const id of idsList) { const i = hand.findIndex(c => String(c?.id || "") === id); if (i < 0) throw new Error("discardCardMissing"); const [c] = hand.splice(i, 1); movePublicCard(room, role, c, "graveyard"); }
    } else if (kind === "exileGraveyard") {
      for (const id of idsList) { const f = findPublicCard(room, id); if (!f || f.ownerRole !== role || f.zone !== "graveyard") throw new Error("graveyardCostCardMissing"); const [c] = f.arr.splice(f.index, 1); movePublicCard(room, role, c, "exile"); }
    } else if (kind === "sacrifice") {
      for (const id of idsList) { const f = findPublicCard(room, id); if (!f || f.ownerRole !== role || !["creatures", "lands", "others"].includes(f.zone)) throw new Error("sacrificeCardMissing"); const [c] = f.arr.splice(f.index, 1); movePublicCard(room, role, c, "graveyard"); }
    } else if (!["alternate", "additional", "none"].includes(kind)) throw new Error("unsupportedSpecialCost");
    return { label: text(special.label, 80), kind, count: idsList.length || int(special.count), life: int(special.life) };
  }
  function castStackCard(sourceCard, role, msg, targetInfo, paymentInfo, specialInfo) {
    const c = clone(sourceCard); ensureCardId(c, "spell");
    c.zone = "stack"; c.owner = isSeat(c.owner) ? c.owner : role; c.controller = role;
    c.castFrom = text(msg.sourceZone, 30); c.castFaceIndex = int(msg.faceIndex); c.castPart = clone(msg.part || null);
    c.targetIds = ids(msg.targets?.cardIds); c.targetPlayerIds = ids(msg.targets?.playerIds, 2); c.targetZoneRefs = clone(msg.targets?.zoneRefs || []);
    c.targetRequired = !!msg.targetConfig?.required; c.targetStatus = targetInfo.count ? "selected" : (c.targetRequired ? "needed" : "none");
    c.castContext = clone(msg.castContext || null); c.castAutoEffects = clone(msg.autoEffects || []); c.castAutoEffectConfig = clone(msg.autoEffectConfig || {});
    c.abilityCatalog = clone(msg.abilityCatalog || []); c.paymentInfo = clone(paymentInfo); c.specialCostInfo = clone(specialInfo);
    c.v54 = normalizeV54(msg.v54); c.v54Targeting = { checked: true, results: clone(targetInfo.snapshot), ward: clone(c.v54.wardPayments || {}) };
    return c;
  }
  function publicCastTx(tx) { return tx ? { id: tx.id, cardId: tx.cardId, cardName: tx.cardName, actorRole: tx.actorRole, sourceZone: tx.sourceZone, baseRev: tx.baseRev, expiresAt: tx.expiresAt } : null; }
  function handleCastStart(client, room, msg) {
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.CAST); ensureIdle(room);
      const sourceZone = text(msg.sourceZone, 30), sourceOwnerRole = isSeat(msg.sourceOwnerRole) ? msg.sourceOwnerRole : client.role;
      if (sourceOwnerRole !== client.role) throw new Error("sourceOwnerMismatch");
      if (!["hand", "library", "graveyard", "exile"].includes(sourceZone)) throw new Error("sourceZoneInvalid");
      const f = findSource(room, client.role, sourceZone, msg.cardId); if (!f || f.zone !== sourceZone) throw new Error("sourceCardMissing");
      if (sourceController(f.card, client.role) !== client.role && sourceZone !== "hand" && sourceZone !== "library") throw new Error("sourceControlMismatch");
      const permission = msg.zoneMeta || {};
      if (sourceZone !== "hand" && !(permission.permissionId || permission.kind || msg.castContext)) throw new Error("zoneCastPermissionRequired");
      const priority = room.state?.turn?.priority;
      if (isSeat(priority) && priority !== client.role && !permission.timingOverride) throw new Error("priorityRequired");
      validateTargetReferences(room, msg.targets || {});
      const targetLimits = validateTargetLimits(msg), payment = validatePayment(room, client.role, msg.cost || {}, msg.payment || {}), snapshot = targetSnapshot(room, msg.targets || {});
      const tx = {
        id: uid("casttx"), kind: "cast", actionNonce: text(msg.actionNonce), clientId: clientId(client), actorRole: client.role,
        baseRev: room.rev, cardId: String(msg.cardId), cardName: cardName(f.card), sourceZone, sourceOwnerRole,
        sourceSnapshotHash: sha256(f.card), sourceIndex: f.index, sourcePrivate: f.private,
        proposal: clone(msg), targetLimits, targetSnapshot: snapshot, payment,
        expiresAt: now() + TX_TTL_MS,
      };
      ensureRoom(room).castTx = tx;
      send(client, { type: "castTxStarted", protocol: PROTOCOLS.CAST, txId: tx.id, actionNonce: tx.actionNonce, baseRev: tx.baseRev, card: clone(f.card), sourceZone, payment, special: clone(msg.special || {}), targets: clone(msg.targets || {}), targetLimits, timingOverride: !!msg.zoneMeta?.timingOverride, authoritySummary: authoritySummary(room), authority: D.authority() });
      record(room, "castStart", { txId: tx.id, role: client.role, cardId: tx.cardId }); broadcastRuleSummary(room);
    } catch (e) { reject(client, room, "castTxRejected", msg, e.message || e); }
  }
  function handleCastCommit(client, room, msg) {
    const r = ensureRoom(room), tx = r.castTx;
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.CAST);
      if (!tx || String(msg.txId || "") !== tx.id) throw new Error("transactionNotFound");
      if (tx.clientId !== clientId(client)) throw new Error("transactionOwnerMismatch");
      const f = findSource(room, tx.actorRole, tx.sourceZone, tx.cardId); if (!f || sha256(f.card) !== tx.sourceSnapshotHash) throw new Error("sourceSnapshotChanged");
      if (sha256(targetSnapshot(room, tx.proposal.targets || {})) !== sha256(tx.targetSnapshot)) throw new Error("targetSnapshotChanged");
      const backup = snapshotMutable(room);
      try {
        const [source] = f.arr.splice(f.index, 1);
        applyManaPayment(room, tx.actorRole, tx.proposal.payment || {});
        const special = applySpecialCost(room, tx.actorRole, tx.proposal.special || {});
        const stackCard = castStackCard(source, tx.actorRole, tx.proposal, { ...tx.targetLimits, snapshot: tx.targetSnapshot }, tx.payment, special);
        room.state.stack = Array.isArray(room.state.stack) ? room.state.stack : []; room.state.stack.push(stackCard);
        finalize(room, f.private ? [tx.actorRole] : [], "cast");
        const proof = makeProof(room, "cast", { txId: tx.id, role: tx.actorRole, cardId: tx.cardId, targetSnapshot: tx.targetSnapshot, payment: tx.payment });
        r.castTx = null; record(room, "castCommit", { txId: tx.id, role: tx.actorRole, rev: room.rev });
        const summary = { cardId: tx.cardId, cardName: tx.cardName, sourceZone: tx.sourceZone, targetCount: tx.targetLimits.count, totalCost: tx.payment.totalCost, special, stackObjectId: stackCard.id };
        send(client, commonPayload(room, client, { type: "castTxCommitted", protocol: PROTOCOLS.CAST, txId: tx.id, actionNonce: text(msg.actionNonce), summary, commitment: proof.commitment }));
        broadcastPublic(room, "castPublicSync", { protocol: PROTOCOLS.CAST, txId: tx.id, actorRole: tx.actorRole, summary, commitment: proof.commitment }, clientId(client)); broadcastRuleSummary(room);
      } catch (e) { restoreMutable(room, backup); throw e; }
    } catch (e) { reject(client, room, "castTxRejected", msg, e.message || e); }
  }
  function handleCastCancel(client, room, msg) {
    const r = ensureRoom(room), tx = r.castTx;
    if (!tx || String(msg.txId || "") !== tx.id) return reject(client, room, "castTxRejected", msg, "transactionNotFound");
    if (tx.clientId !== clientId(client)) return reject(client, room, "castTxRejected", msg, "transactionOwnerMismatch");
    r.castTx = null; send(client, { type: "castTxCancelled", protocol: PROTOCOLS.CAST, txId: tx.id, reason: text(msg.reason, 120), authoritySummary: authoritySummary(room), authority: D.authority() }); broadcastRuleSummary(room);
  }

  function normalizeAbility(msg) {
    const a = clone(msg.ability || {});
    return {
      id: text(a.id || uid("ability"), 160), name: text(a.name || "起動型能力", 120), kind: text(a.kind || "activated", 30),
      timing: text(a.timing, 40), zoneHint: text(a.zoneHint, 40), costText: text(a.costText, 160), manaCost: clone(a.manaCost || {}),
      createsStackObject: a.createsStackObject !== false, targetRequired: !!a.targetRequired,
      targetKinds: clone(a.targetKinds || []), memo: text(a.memo, 300), resolveNote: text(a.resolveNote, 300),
      resolveChecklist: clone(a.resolveChecklist || []), autoEffects: clone(a.autoEffects || []), autoEffectConfig: clone(a.autoEffectConfig || {}),
      costProfile: clone(a.costProfile || {}), targetProfile: clone(a.targetProfile || {}),
    };
  }
  function validateAbilityCosts(room, role, source, cost = {}, payment = {}) {
    const p = publicPlayer(room, role);
    if (cost.tapSource && source.card.tapped) throw new Error("sourceAlreadyTapped");
    if (int(cost.payLife) > int(p.life)) throw new Error("lifeCostInsufficient");
    const mana = validatePayment(room, role, cost.manaCost || {}, payment || {});
    const hand = privateZones(room, role).hand, grave = p.graveyard;
    const discardIds = ids(cost.discardIds, 50), exileIds = ids(cost.exileGraveIds, 50), sacIds = ids(cost.sacrificeOtherIds, 50);
    if (discardIds.length !== int(cost.discardCount, discardIds.length, 50)) throw new Error("discardCountMismatch");
    if (exileIds.length !== int(cost.exileGraveCount, exileIds.length, 50)) throw new Error("exileCountMismatch");
    if (sacIds.length !== int(cost.sacrificeOtherCount, sacIds.length, 50)) throw new Error("sacrificeCountMismatch");
    if (discardIds.some(id => !hand.some(c => String(c?.id || "") === id))) throw new Error("discardCardMissing");
    if (exileIds.some(id => !grave.some(c => String(c?.id || "") === id))) throw new Error("graveyardCostCardMissing");
    for (const id of sacIds) { const f = findPublicCard(room, id); if (!f || f.ownerRole !== role || !["creatures", "lands", "others"].includes(f.zone) || String(source.card.id) === id) throw new Error("sacrificeCardMissing"); }
    if (cost.removeCounterName && int(cost.removeCounterCount) > int(source.card.counters?.[cost.removeCounterName])) throw new Error("counterCostInsufficient");
    return { mana, discardIds, exileIds, sacIds };
  }
  function applyAbilityCosts(room, role, source, cost, payment, checked) {
    const p = publicPlayer(room, role), hand = privateZones(room, role).hand;
    applyManaPayment(room, role, payment || {});
    if (cost.tapSource) source.card.tapped = true;
    if (int(cost.payLife)) p.life -= int(cost.payLife);
    for (const id of checked.discardIds) { const i = hand.findIndex(c => String(c?.id || "") === id); const [c] = hand.splice(i, 1); movePublicCard(room, role, c, "graveyard"); }
    for (const id of checked.exileIds) { const f = findPublicCard(room, id); const [c] = f.arr.splice(f.index, 1); movePublicCard(room, role, c, "exile"); }
    for (const id of checked.sacIds) { const f = findPublicCard(room, id); const [c] = f.arr.splice(f.index, 1); movePublicCard(room, role, c, "graveyard"); }
    if (cost.removeCounterName && int(cost.removeCounterCount)) source.card.counters[cost.removeCounterName] = int(source.card.counters[cost.removeCounterName]) - int(cost.removeCounterCount);
    if (cost.sacrificeSource) { const current = findPublicCard(room, source.card.id); if (!current) throw new Error("sourceMovedDuringCost"); const [c] = current.arr.splice(current.index, 1); movePublicCard(room, role, c, "graveyard"); }
  }
  function publicAbilityTx(tx) { return tx ? { id: tx.id, actorRole: tx.actorRole, sourceCardId: tx.sourceCardId, abilityName: tx.ability.name, baseRev: tx.baseRev, expiresAt: tx.expiresAt } : null; }
  function abilityObject(room, source, role, ability, msg) {
    return {
      id: uid("ability-stack"), name: ability.name, owner: role, controller: role, zone: "stack", type: "Ability", types: ["Ability"],
      sourceCardId: String(source.card.id), sourceName: cardName(source.card), abilityId: ability.id,
      targetIds: ids(msg.targets?.cardIds), targetPlayerIds: ids(msg.targets?.playerIds, 2), targetZoneRefs: clone(msg.targets?.zoneRefs || []),
      targetRequired: ability.targetRequired, targetStatus: targetCount(msg.targets) ? "selected" : (ability.targetRequired ? "needed" : "none"),
      autoEffects: clone(ability.autoEffects || []), autoEffectConfig: clone(ability.autoEffectConfig || {}), resolveNote: ability.resolveNote, resolveChecklist: clone(ability.resolveChecklist),
      v54: normalizeV54(msg.v54), v54Targeting: { checked: true, results: targetSnapshot(room, msg.targets || {}), ward: clone(msg.v54?.wardPayments || {}) },
      createdAt: new Date().toISOString(),
    };
  }
  function handleAbilityStart(client, room, msg) {
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.ABILITY); ensureIdle(room);
      const sourceZone = text(msg.sourceZone, 30), source = findSource(room, client.role, sourceZone, msg.sourceCardId);
      if (!source || sourceController(source.card, client.role) !== client.role) throw new Error("abilitySourceMissing");
      const ability = normalizeAbility(msg), targetConfig = { required: ability.targetRequired, min: ability.targetRequired ? 1 : 0, max: Math.max(1, int(ability.targetProfile?.max, 1, 100)) };
      validateTargetReferences(room, msg.targets || {});
      const targetLimits = validateTargetLimits({ targets: msg.targets || {}, targetConfig }), checkedCosts = validateAbilityCosts(room, client.role, source, msg.cost || {}, msg.payment || {});
      const tx = { id: uid("abilitytx"), kind: "ability", clientId: clientId(client), actorRole: client.role, actionNonce: text(msg.actionNonce), baseRev: room.rev, sourceCardId: String(msg.sourceCardId), sourceZone, sourceSnapshotHash: sha256(source.card), ability, proposal: clone(msg), targetLimits, targetSnapshot: targetSnapshot(room, msg.targets || {}), checkedCosts, expiresAt: now() + TX_TTL_MS };
      ensureRoom(room).abilityTx = tx;
      send(client, { type: "abilityTxStarted", protocol: PROTOCOLS.ABILITY, txId: tx.id, actionNonce: tx.actionNonce, baseRev: tx.baseRev, sourceCard: clone(source.card), ability: clone(ability), targets: clone(msg.targets || {}), cost: clone(msg.cost || {}), payment: checkedCosts.mana, targetLimits, authoritySummary: authoritySummary(room), authority: D.authority() });
      record(room, "abilityStart", { txId: tx.id, role: client.role, sourceCardId: tx.sourceCardId }); broadcastRuleSummary(room);
    } catch (e) { reject(client, room, "abilityTxRejected", msg, e.message || e); }
  }
  function handleAbilityCommit(client, room, msg) {
    const r = ensureRoom(room), tx = r.abilityTx;
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.ABILITY);
      if (!tx || String(msg.txId || "") !== tx.id) throw new Error("transactionNotFound");
      if (tx.clientId !== clientId(client)) throw new Error("transactionOwnerMismatch");
      const source = findSource(room, tx.actorRole, tx.sourceZone, tx.sourceCardId); if (!source || sha256(source.card) !== tx.sourceSnapshotHash) throw new Error("sourceSnapshotChanged");
      if (sha256(targetSnapshot(room, tx.proposal.targets || {})) !== sha256(tx.targetSnapshot)) throw new Error("targetSnapshotChanged");
      const backup = snapshotMutable(room);
      try {
        applyAbilityCosts(room, tx.actorRole, source, tx.proposal.cost || {}, tx.proposal.payment || {}, tx.checkedCosts);
        let stackObject = null, resolvedMana = null;
        const output = tx.proposal.manaOutput || {}, isMana = tx.ability.kind === "mana" || tx.ability.createsStackObject === false || Object.keys(output).some(k => MANA_SYMBOLS.includes(k) && int(output[k]) > 0);
        if (isMana) {
          const pool = normalizeManaPool(publicPlayer(room, tx.actorRole)); resolvedMana = {};
          for (const k of MANA_SYMBOLS) { const n = int(output[k]); if (n) { pool[k] += n; resolvedMana[k] = n; } }
        } else {
          stackObject = abilityObject(room, source, tx.actorRole, tx.ability, tx.proposal); room.state.stack = Array.isArray(room.state.stack) ? room.state.stack : []; room.state.stack.push(stackObject);
        }
        finalize(room, [tx.actorRole], "ability");
        const proof = makeProof(room, "ability", { txId: tx.id, role: tx.actorRole, sourceCardId: tx.sourceCardId, abilityId: tx.ability.id, stackObjectId: stackObject?.id || null, resolvedMana });
        r.abilityTx = null; record(room, "abilityCommit", { txId: tx.id, rev: room.rev });
        const summary = { sourceCardId: tx.sourceCardId, sourceName: cardName(source.card), abilityName: tx.ability.name, stackObjectId: stackObject?.id || null, manaOutput: resolvedMana, resolvedImmediately: !!isMana };
        send(client, commonPayload(room, client, { type: "abilityTxCommitted", protocol: PROTOCOLS.ABILITY, txId: tx.id, actionNonce: text(msg.actionNonce), summary, commitment: proof.commitment }));
        broadcastPublic(room, "abilityPublicSync", { protocol: PROTOCOLS.ABILITY, txId: tx.id, actorRole: tx.actorRole, summary, commitment: proof.commitment }, clientId(client)); broadcastRuleSummary(room);
      } catch (e) { restoreMutable(room, backup); throw e; }
    } catch (e) { reject(client, room, "abilityTxRejected", msg, e.message || e); }
  }
  function handleAbilityCancel(client, room, msg) {
    const r = ensureRoom(room), tx = r.abilityTx;
    if (!tx || String(msg.txId || "") !== tx.id) return reject(client, room, "abilityTxRejected", msg, "transactionNotFound");
    if (tx.clientId !== clientId(client)) return reject(client, room, "abilityTxRejected", msg, "transactionOwnerMismatch");
    r.abilityTx = null; send(client, { type: "abilityTxCancelled", protocol: PROTOCOLS.ABILITY, txId: tx.id, reason: text(msg.reason, 120), authoritySummary: authoritySummary(room), authority: D.authority() }); broadcastRuleSummary(room);
  }

  function normalizeV54(v) {
    const x = clone(v || {});
    return { protocol: PROTOCOLS.EFFECT, sourceRules: clone(x.sourceRules || {}), targetRules: clone(x.targetRules || {}), wardPayments: clone(x.wardPayments || {}), effects: clone(x.effects || []) };
  }
  function ruleKeywords(rule) { return rule?.keywords || rule?.rule?.keywords || {}; }
  function targetLegality(top, id) {
    const target = findPublicCard(top._room, id); if (!target) return { legal: false, reason: "targetMissing" };
    const meta = top.v54?.targetRules?.[id] || target.card.v54Rules || {}, k = ruleKeywords(meta), sourceColors = top.v54?.sourceRules?.colors || [];
    if (k.shroud) return { legal: false, reason: "shroud" };
    if (k.hexproof && sourceController(target.card, target.ownerRole) !== top.controller) return { legal: false, reason: "hexproof" };
    const protection = Array.isArray(k.protectionColors) ? k.protectionColors : [];
    if (sourceColors.some(c => protection.includes(c))) return { legal: false, reason: "protection" };
    const ward = text(k.wardCost, 80); if (ward && !["paid", "acknowledged"].includes(String(top.v54?.wardPayments?.[id] || ""))) return { legal: false, reason: "wardUnpaid", wardCost: ward };
    return { legal: true, target };
  }
  function effectList(top) { return Array.isArray(top?.v54?.effects) && top.v54.effects.length ? top.v54.effects : (Array.isArray(top?.autoEffects) ? top.autoEffects : (Array.isArray(top?.castAutoEffects) ? top.castAutoEffects : [])); }
  function makeEffectPlan(room, top) {
    top._room = room;
    const targetIds = ids(top.targetIds), legal = [], illegal = [];
    for (const id of targetIds) { const q = targetLegality(top, id); if (q.legal) legal.push(id); else illegal.push({ id, reason: q.reason, wardCost: q.wardCost || "" }); }
    delete top._room;
    const effects = effectList(top), steps = effects.map((e, i) => {
      const kind = text(e.kind || e.type, 40), mode = SUPPORTED_EFFECTS.has(kind) ? "server" : "manual";
      return { id: text(e.id || `effect-${i + 1}`, 120), kind, mode, reason: mode === "server" ? "" : "unsupportedEffect", effect: clone(e), summary: text(e.label || kind, 120), targetCardIds: legal.slice() };
    });
    return { protocol: PROTOCOLS.EFFECT, apply: targetIds.length === 0 || legal.length > 0, legalTargetCount: legal.length, illegalTargetCount: illegal.length, illegalTargets: illegal, allTargetsIllegal: targetIds.length > 0 && legal.length === 0, serverStepCount: steps.filter(s => s.mode === "server").length, manualStepCount: steps.filter(s => s.mode === "manual").length, steps };
  }
  function applyEffect(room, top, step, affectedPrivate) {
    const e = step.effect || {}, targets = step.targetCardIds.length ? step.targetCardIds : ids(top.targetIds), logs = [];
    const actor = isSeat(top.controller) ? top.controller : "A";
    const playerTargets = ids(top.targetPlayerIds, 2);
    const amount = int(e.amount ?? e.value ?? e.count, 0, 9999);
    if (step.kind === "life") { for (const role of playerTargets.length ? playerTargets : [actor]) if (isSeat(role)) { const p = publicPlayer(room, role); p.life = int(p.life) + (String(e.mode || e.operation) === "lose" ? -amount : amount); logs.push(`life:${role}:${amount}`); } }
    else if (step.kind === "damage") { for (const role of playerTargets) if (isSeat(role)) { publicPlayer(room, role).life -= amount; logs.push(`damage:${role}:${amount}`); } for (const id of targets) { const f = findPublicCard(room, id); if (f) { f.card.damage = int(f.card.damage) + amount; logs.push(`damage:${id}:${amount}`); } } }
    else if (step.kind === "draw") { const role = isSeat(e.player) ? e.player : actor, z = privateZones(room, role); for (let i = 0; i < amount; i++) { const c = z.library.shift(); if (!c) break; c.zone = "hand"; z.hand.push(c); } affectedPrivate.add(role); logs.push(`draw:${role}:${amount}`); }
    else if (step.kind === "counter") { const name = text(e.counterName || e.name || "+1/+1", 60); for (const id of targets) { const f = findPublicCard(room, id); if (f) { f.card.counters = f.card.counters || {}; f.card.counters[name] = int(f.card.counters[name]) + amount; logs.push(`counter:${id}:${name}:${amount}`); } } }
    else if (step.kind === "tap" || step.kind === "untap") { for (const id of targets) { const f = findPublicCard(room, id); if (f) { f.card.tapped = step.kind === "tap"; logs.push(`${step.kind}:${id}`); } } }
    else if (step.kind === "move") { const dest = text(e.destination || "graveyard", 30); for (const id of targets) { const f = findPublicCard(room, id); if (!f) continue; const [c] = f.arr.splice(f.index, 1); if (PRIVATE_ZONES.has(dest)) { privateZones(room, f.ownerRole)[dest].push(c); affectedPrivate.add(f.ownerRole); } else movePublicCard(room, f.ownerRole, c, dest); logs.push(`move:${id}:${dest}`); } }
    else if (step.kind === "token") { const role = isSeat(e.player) ? e.player : actor, n = Math.max(1, amount || 1); for (let i = 0; i < n; i++) { const c = { id: uid("token"), name: text(e.name || "トークン", 100), owner: role, controller: role, zone: "creatures", type: "Token", types: ["Creature", "Token"], power: String(e.power ?? 1), toughness: String(e.toughness ?? 1), colors: clone(e.colors || []), counters: {}, damage: 0, tapped: !!e.tapped, token: true }; publicPlayer(room, role).creatures.push(c); } logs.push(`token:${role}:${n}`); }
    else if (step.kind === "pt") { for (const id of targets) { const f = findPublicCard(room, id); if (f) { f.card.untilEndOfTurnPower = int(f.card.untilEndOfTurnPower) + int(e.power ?? e.p); f.card.untilEndOfTurnToughness = int(f.card.untilEndOfTurnToughness) + int(e.toughness ?? e.t); logs.push(`pt:${id}`); } } }
    else if (step.kind === "keyword") { const kw = text(e.keyword, 60); for (const id of targets) { const f = findPublicCard(room, id); if (f && kw) { f.card.untilEndOfTurnCombatKeywords = ids([...(f.card.untilEndOfTurnCombatKeywords || []), kw], 40); logs.push(`keyword:${id}:${kw}`); } } }
    else if (step.kind === "type") { const ty = text(e.addedType || e.typeName, 60); for (const id of targets) { const f = findPublicCard(room, id); if (f && ty) { f.card.untilEndOfTurnTypes = ids([...(f.card.untilEndOfTurnTypes || []), ty], 30); logs.push(`type:${id}:${ty}`); } } }
    return logs;
  }
  function publicStackTx(tx) { return tx ? { id: tx.id, actorRole: tx.actorRole, stackObjectId: tx.stackObjectId, action: tx.action, destination: tx.destination, baseRev: tx.baseRev, expiresAt: tx.expiresAt } : null; }
  function destinationFor(top, requested, action) {
    if (requested && requested !== "auto") return requested;
    if (cardTypes(top).includes("Ability") || top?.type === "Ability") return "cease";
    if (action === "counter") return "graveyard";
    return isPermanent(top) ? "battlefield" : "graveyard";
  }
  function handleStackStart(client, room, msg) {
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.ABILITY); ensureIdle(room);
      const stack = room.state?.stack; if (!Array.isArray(stack) || !stack.length) throw new Error("stackEmpty");
      const top = stack[stack.length - 1]; if (String(top?.id || "") !== String(msg.stackObjectId || "")) throw new Error("stackTopMismatch");
      const action = text(msg.action || "resolve", 20); if (!["resolve", "move", "counter"].includes(action)) throw new Error("stackActionInvalid");
      if (action === "counter" && (top.uncounterable || top.cantBeCountered)) throw new Error("stackObjectUncounterable");
      const destination = destinationFor(top, text(msg.destination, 30), action), plan = makeEffectPlan(room, top);
      const tx = { id: uid("stacktx"), kind: "stack", clientId: clientId(client), actorRole: client.role, actionNonce: text(msg.actionNonce), baseRev: room.rev, stackObjectId: String(top.id), stackLength: stack.length, stackSnapshotHash: sha256(top), action, destination, effectChoice: clone(msg.effectChoice || null), effectPlan: plan, expiresAt: now() + TX_TTL_MS };
      ensureRoom(room).stackTx = tx;
      send(client, { type: "stackTxStarted", protocol: PROTOCOLS.ABILITY, txId: tx.id, actionNonce: tx.actionNonce, baseRev: tx.baseRev, stackObject: clone(top), action, destination, effectHandling: plan.serverStepCount ? (plan.manualStepCount ? "partialServer" : "serverApplied") : "manualAfterLifecycle", effectPlan: publicEffectPlan(plan), authoritySummary: authoritySummary(room), authority: D.authority() });
      record(room, "stackStart", { txId: tx.id, stackObjectId: tx.stackObjectId, action }); broadcastRuleSummary(room);
    } catch (e) { reject(client, room, "stackTxRejected", msg, e.message || e); }
  }
  function publicEffectPlan(plan) { return { protocol: plan.protocol, apply: plan.apply, legalTargetCount: plan.legalTargetCount, illegalTargetCount: plan.illegalTargetCount, illegalTargets: clone(plan.illegalTargets), allTargetsIllegal: plan.allTargetsIllegal, serverStepCount: plan.serverStepCount, manualStepCount: plan.manualStepCount, steps: plan.steps.map(s => ({ id: s.id, kind: s.kind, mode: s.mode, reason: s.reason, summary: s.summary })) }; }
  function handleStackCommit(client, room, msg) {
    const r = ensureRoom(room), tx = r.stackTx;
    try {
      verifySeatBase(client, room, msg, PROTOCOLS.ABILITY);
      if (!tx || String(msg.txId || "") !== tx.id) throw new Error("transactionNotFound");
      if (tx.clientId !== clientId(client)) throw new Error("transactionOwnerMismatch");
      const stack = room.state?.stack, top = stack?.[stack.length - 1];
      if (!top || String(top.id) !== tx.stackObjectId || stack.length !== tx.stackLength || sha256(top) !== tx.stackSnapshotHash) throw new Error("stackSnapshotChanged");
      const backup = snapshotMutable(room);
      try {
        const currentPlan = makeEffectPlan(room, top), affectedPrivate = new Set(), logs = [];
        const preResolve = tx.action === "resolve" && typeof D.preResolveStackObject === "function" ? D.preResolveStackObject(room, top) : { apply: true };
        const resolutionAllowed = !preResolve || preResolve.apply !== false;
        if (tx.action === "resolve" && resolutionAllowed && currentPlan.apply && !currentPlan.allTargetsIllegal) for (const step of currentPlan.steps) if (step.mode === "server") logs.push(...applyEffect(room, top, step, affectedPrivate));
        stack.pop();
        if (tx.action === "resolve" || tx.action === "move" || tx.action === "counter") {
          const owner = isSeat(top.owner) ? top.owner : (isSeat(top.controller) ? top.controller : tx.actorRole), dest = tx.destination;
          if (dest === "cease") { /* ability object ceases to exist */ }
          else if (dest === "battlefield") movePublicCard(room, owner, top, "battlefield");
          else if (PRIVATE_ZONES.has(dest)) { top.zone = dest; privateZones(room, owner)[dest].push(top); affectedPrivate.add(owner); }
          else movePublicCard(room, owner, top, dest);
        }
        finalize(room, [...affectedPrivate], "stack");
        const proof = makeProof(room, "stack", { txId: tx.id, stackObjectId: tx.stackObjectId, action: tx.action, destination: tx.destination, plan: publicEffectPlan(currentPlan), logs });
        r.stackTx = null; record(room, "stackCommit", { txId: tx.id, rev: room.rev, action: tx.action });
        const summary = { stackObjectId: tx.stackObjectId, stackObjectName: cardName(top), action: tx.action, destination: tx.destination, effectHandling: !resolutionAllowed ? "skippedByResolutionCondition" : currentPlan.serverStepCount ? (currentPlan.manualStepCount ? "partialServer" : "serverApplied") : "manualAfterLifecycle", appliedEffects: resolutionAllowed ? currentPlan.steps.filter(s => s.mode === "server").length : 0, manualEffects: resolutionAllowed ? currentPlan.manualStepCount : 0, illegalTargets: clone(currentPlan.illegalTargets), allTargetsIllegal: currentPlan.allTargetsIllegal, skippedReason: !resolutionAllowed ? String(preResolve?.reason || "resolutionConditionFalse") : "", effectLogs: logs };
        send(client, commonPayload(room, client, { type: "stackTxCommitted", protocol: PROTOCOLS.ABILITY, txId: tx.id, actionNonce: text(msg.actionNonce), summary, commitment: proof.commitment }));
        broadcastPublic(room, "stackPublicSync", { protocol: PROTOCOLS.ABILITY, txId: tx.id, actorRole: tx.actorRole, summary, commitment: proof.commitment }, clientId(client)); broadcastRuleSummary(room);
      } catch (e) { restoreMutable(room, backup); throw e; }
    } catch (e) { reject(client, room, "stackTxRejected", msg, e.message || e); }
  }
  function handleStackCancel(client, room, msg) {
    const r = ensureRoom(room), tx = r.stackTx;
    if (!tx || String(msg.txId || "") !== tx.id) return reject(client, room, "stackTxRejected", msg, "transactionNotFound");
    if (tx.clientId !== clientId(client)) return reject(client, room, "stackTxRejected", msg, "transactionOwnerMismatch");
    r.stackTx = null; send(client, { type: "stackTxCancelled", protocol: PROTOCOLS.ABILITY, txId: tx.id, reason: text(msg.reason, 120), authoritySummary: authoritySummary(room), authority: D.authority() }); broadcastRuleSummary(room);
  }

  function resolveTopForTurn(room, actorRole) {
    const stack = room.state?.stack;
    if (!Array.isArray(stack) || !stack.length) throw new Error("stackEmpty");
    const top = stack[stack.length - 1];
    const backup = snapshotMutable(room);
    try {
      const currentPlan = makeEffectPlan(room, top), affectedPrivate = new Set(), logs = [];
      const preResolve = typeof D.preResolveStackObject === "function" ? D.preResolveStackObject(room, top) : { apply: true };
      const resolutionAllowed = !preResolve || preResolve.apply !== false;
      if (resolutionAllowed && currentPlan.apply && !currentPlan.allTargetsIllegal) {
        for (const step of currentPlan.steps) if (step.mode === "server") logs.push(...applyEffect(room, top, step, affectedPrivate));
      }
      stack.pop();
      const owner = isSeat(top.owner) ? top.owner : (isSeat(top.controller) ? top.controller : (isSeat(actorRole) ? actorRole : "A"));
      const destination = destinationFor(top, "auto", "resolve");
      if (destination === "cease") { /* ability object ceases */ }
      else if (destination === "battlefield") movePublicCard(room, owner, top, "battlefield");
      else if (PRIVATE_ZONES.has(destination)) { top.zone = destination; privateZones(room, owner)[destination].push(top); affectedPrivate.add(owner); }
      else movePublicCard(room, owner, top, destination);
      return {
        kind: "stackResolved", stackObjectId: String(top.id || ""), stackObjectName: cardName(top),
        destination, effectHandling: !resolutionAllowed ? "skippedByResolutionCondition" : currentPlan.serverStepCount ? (currentPlan.manualStepCount ? "partialServer" : "serverApplied") : "manualAfterLifecycle",
        appliedEffects: resolutionAllowed ? currentPlan.steps.filter(s => s.mode === "server").length : 0, manualEffects: resolutionAllowed ? currentPlan.manualStepCount : 0,
        illegalTargets: clone(currentPlan.illegalTargets), allTargetsIllegal: currentPlan.allTargetsIllegal, skippedReason: !resolutionAllowed ? String(preResolve?.reason || "resolutionConditionFalse") : "", effectLogs: logs,
        _privateRoles: [...affectedPrivate]
      };
    } catch (e) { restoreMutable(room, backup); throw e; }
  }

  function cancelClientTransactions(room, id) {
    const r = ensureRoom(room), cid = String(id || "");
    for (const key of ["libraryTx", "castTx", "abilityTx", "stackTx"]) if (r[key]?.clientId === cid) r[key] = null;
    if (r.libraryRequest?.tx?.clientId === cid) r.libraryRequest = null;
  }

  function handle(client, room, msg) {
    switch (msg.type) {
      case "requestRuleAuthority": send(client, { type: "ruleAuthorityUpdate", authoritySummary: authoritySummary(room), authority: D.authority() }); return true;
      case "ruleRegister": handleRuleRegister(client, room, msg); return true;
      case "ruleAction": handleRuleAction(client, room, msg); return true;
      case "ruleRevealProofs": handleProofReveal(client, room, msg); return true;
      case "libraryTxStart": handleLibraryStart(client, room, msg); return true;
      case "libraryTxApprove": handleLibraryApprove(client, room, msg); return true;
      case "libraryTxCommit": handleLibraryCommit(client, room, msg); return true;
      case "libraryTxCancel": handleLibraryCancel(client, room, msg); return true;
      case "castTxStart": handleCastStart(client, room, msg); return true;
      case "castTxCommit": handleCastCommit(client, room, msg); return true;
      case "castTxCancel": handleCastCancel(client, room, msg); return true;
      case "abilityTxStart": handleAbilityStart(client, room, msg); return true;
      case "abilityTxCommit": handleAbilityCommit(client, room, msg); return true;
      case "abilityTxCancel": handleAbilityCancel(client, room, msg); return true;
      case "stackTxStart": handleStackStart(client, room, msg); return true;
      case "stackTxCommit": handleStackCommit(client, room, msg); return true;
      case "stackTxCancel": handleStackCancel(client, room, msg); return true;
      default: return false;
    }
  }

  return { PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES, ensureRoom, anyActive, activeKind, authoritySummary, cancelClientTransactions, handle, publicEffectPlan, resolveTopForTurn };
}

module.exports = { PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES, createEngine };
