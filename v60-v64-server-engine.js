"use strict";

const crypto = require("crypto");

const PROTOCOLS = Object.freeze({
  OBJECT: "cpt-v6.0",
  ATTACHMENT: "cpt-v6.1",
  PHASE: "cpt-v6.2",
  LKI: "cpt-v6.3",
  ZONE_BATCH: "cpt-v6.4",
});
const AUTHORITY_FLAGS = Object.freeze({
  objectProtocol: PROTOCOLS.OBJECT,
  serverObjectModelV60: true,
  serverDoubleFacedV60: true,
  serverFaceDownObjectsV60: true,
  serverMeldV60: true,
  serverObjectProofsV60: true,
  attachmentProtocol: PROTOCOLS.ATTACHMENT,
  serverAttachmentsV61: true,
  serverEquipFortifyV61: true,
  serverControlChangesV61: true,
  serverAttachmentLayersV61: true,
  serverAttachmentProofsV61: true,
  phaseProtocol: PROTOCOLS.PHASE,
  serverPhasingV62: true,
  serverIndirectPhasingV62: true,
  serverTemporaryExileV62: true,
  serverObjectReconstructionV62: true,
  serverPhaseProofsV62: true,
  lkiProtocol: PROTOCOLS.LKI,
  serverLastKnownInformationV63: true,
  serverZoneEventsV63: true,
  serverLkiTriggersV63: true,
  serverZoneEventProofsV63: true,
  zoneBatchProtocol: PROTOCOLS.ZONE_BATCH,
  serverSimultaneousZoneTransactionsV64: true,
  serverZoneReplacementChainsV64: true,
  serverAtomicZoneEventsV64: true,
  serverZoneBatchProofsV64: true,
});
const MESSAGE_TYPES = Object.freeze([
  "objectAction", "attachmentAction", "phaseAction", "zoneEventAction",
  "simultaneousZoneTxStart", "simultaneousZoneTxCommit", "simultaneousZoneTxCancel", "simultaneousZoneBatchAction",
]);

const SEATS = ["A", "B"];
const SEAT_SET = new Set(SEATS);
const BF_ZONES = ["creatures", "lands", "others"];
const PUBLIC_ZONES = [...BF_ZONES, "graveyard", "exile", "command"];
const TX_TTL_MS = 3 * 60 * 1000;
const MAX_NONCES = 4096;
const MAX_EVENTS = 400;
const MAX_PROOFS = 300;

function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function now() { return Date.now(); }
function uid(p = "id") { return `${p}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`; }
function sha256(v) { return crypto.createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex"); }
function text(v, max = 180) { return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, "").slice(0, max); }
function int(v, min = 0, max = Number.MAX_SAFE_INTEGER) { return Math.max(min, Math.min(max, Math.trunc(Number(v) || 0))); }
function arr(v) { return Array.isArray(v) ? v : []; }
function isSeat(v) { return SEAT_SET.has(v); }
function other(r) { return r === "A" ? "B" : "A"; }
function unique(v, max = 200) { return [...new Set(arr(v).map(x => String(x || "")).filter(Boolean))].slice(0, max); }
function cardTypes(c) { const a = c?.v59Effective?.types || c?.v60Characteristics?.types || c?.types || [c?.type]; return unique(Array.isArray(a) ? a : [a], 40); }
function controller(c, fallback = "A") { return isSeat(c?.v61EffectiveController) ? c.v61EffectiveController : (isSeat(c?.controller) ? c.controller : (isSeat(c?.owner) ? c.owner : fallback)); }
function owner(c, fallback = "A") { return isSeat(c?.owner) ? c.owner : fallback; }
function cardName(c) { return text(c?.v60Characteristics?.name || c?.name || c?.displayName || c?.id || "カード", 120); }

function ensurePublic(room) {
  room.state = room.state && typeof room.state === "object" ? room.state : { players: { A: {}, B: {} }, stack: [], turn: {} };
  room.state.players ||= {};
  for (const role of SEATS) {
    const p = room.state.players[role] ||= {};
    for (const z of [...PUBLIC_ZONES, "hand", "library", "sideboard"]) if (!Array.isArray(p[z])) p[z] = [];
  }
  if (!Array.isArray(room.state.stack)) room.state.stack = [];
  room.state.turn = room.state.turn && typeof room.state.turn === "object" ? room.state.turn : { active: "A", number: 1, phase: 0 };
  return room.state;
}
function allEntries(room, includeStack = true, includePhased = true) {
  ensurePublic(room); const out = [];
  for (const role of SEATS) for (const zone of PUBLIC_ZONES) for (const card of room.state.players[role][zone]) {
    if (!includePhased && card?.v62PhasedOut) continue;
    out.push({ card, role, zone, list: room.state.players[role][zone] });
  }
  if (includeStack) for (const card of room.state.stack) out.push({ card, role: controller(card, owner(card)), zone: "stack", list: room.state.stack });
  return out;
}
function battlefield(room, includePhased = false) { return allEntries(room, false, includePhased).filter(x => BF_ZONES.includes(x.zone)); }
function findCard(room, id, includePhased = true) { return allEntries(room, true, includePhased).find(x => String(x.card?.id || "") === String(id || "")) || null; }
function removeEntry(found) { const i = found?.list?.findIndex(x => String(x?.id || "") === String(found.card?.id || "")) ?? -1; return i < 0 ? null : found.list.splice(i, 1)[0]; }
function battlefieldZone(card) { const t = cardTypes(card); return t.includes("Land") ? "lands" : (t.includes("Creature") ? "creatures" : "others"); }
function placeCard(room, card, destination, roleHint) {
  const own = owner(card, roleHint), ctrl = controller(card, own);
  card.zone = destination;
  if (destination === "battlefield") destination = battlefieldZone(card);
  if (BF_ZONES.includes(destination)) {
    card.zone = destination; room.state.players[ctrl][destination].push(card);
  } else if (PUBLIC_ZONES.includes(destination)) room.state.players[own][destination].push(card);
  else throw new Error("destinationUnsupported");
  return { role: BF_ZONES.includes(destination) ? ctrl : own, zone: destination };
}
function mutableSnapshot(room, ensureRuntime) {
  return { state: clone(room.state), privateByRole: clone(room.privateByRole), privateRevByRole: clone(room.privateRevByRole), rev: room.rev, updatedAt: room.updatedAt, rt: serializeRuntime(ensureRuntime(room)) };
}
function serializeRuntime(r) {
  return { catalog60: clone(r.catalog60), catalog61: clone(r.catalog61), faceDownSecrets: clone(r.faceDownSecrets), objectSeq: r.objectSeq, phasedRecords: clone(r.phasedRecords), transits: clone(r.transits), zoneTx: clone(r.zoneTx), nonceKeys: [...r.nonces.keys()] };
}
function restoreSnapshot(room, snap, ensureRuntime) {
  room.state = snap.state; room.privateByRole = snap.privateByRole; room.privateRevByRole = snap.privateRevByRole; room.rev = snap.rev; room.updatedAt = snap.updatedAt;
  const r = ensureRuntime(room), x = snap.rt || {};
  r.catalog60 = x.catalog60 || {}; r.catalog61 = x.catalog61 || {}; r.faceDownSecrets = x.faceDownSecrets || {}; r.objectSeq = x.objectSeq || 0;
  r.phasedRecords = x.phasedRecords || {}; r.transits = x.transits || {}; r.zoneTx = x.zoneTx || null; r.nonces = new Map((x.nonceKeys || []).map(k => [k, now()]));
}

function createEngine(D) {
  if (!D || typeof D.send !== "function" || typeof D.broadcast !== "function") throw new Error("dependenciesMissing");

  function ensureRuntime(room) {
    if (!room.v60v64 || typeof room.v60v64 !== "object") room.v60v64 = {};
    const r = room.v60v64;
    if (!(r.nonces instanceof Map)) r.nonces = new Map();
    r.catalog60 ||= {}; r.catalog61 ||= {}; r.faceDownSecrets ||= {}; r.phasedRecords ||= {}; r.transits ||= {}; r.zoneTx ||= null; r.objectSeq = int(r.objectSeq);
    if (r.zoneTx && r.zoneTx.expiresAt <= now()) r.zoneTx = null;
    while (r.nonces.size > MAX_NONCES) r.nonces.delete(r.nonces.keys().next().value);
    ensureState(room);
    return r;
  }
  function ensureState(room) {
    ensurePublic(room);
    const s = room.state;
    s.v60 = s.v60 && typeof s.v60 === "object" ? s.v60 : { schema: 1, protocol: PROTOCOLS.OBJECT, catalogRev: 0, objectRev: 0, dayNight: null, objectsById: {}, meldGroups: {}, conflicts: [], proofs: [], audit: [] };
    s.v61 = s.v61 && typeof s.v61 === "object" ? s.v61 : { schema: 1, protocol: PROTOCOLS.ATTACHMENT, catalogRev: 0, attachmentRev: 0, controlRev: 0, catalogById: {}, attachmentsById: {}, controlEffects: [], baseControllerByObject: {}, conflicts: [], proofs: [], audit: [] };
    s.v62 = s.v62 && typeof s.v62 === "object" ? s.v62 : { schema: 1, protocol: PROTOCOLS.PHASE, phaseRev: 0, phasedById: {}, transits: [], conflicts: [], proofs: [], audit: [] };
    s.v63 = s.v63 && typeof s.v63 === "object" ? s.v63 : { schema: 1, protocol: PROTOCOLS.LKI, eventRev: 0, lkiRev: 0, events: [], proofs: [], audit: [] };
    s.v64 = s.v64 && typeof s.v64 === "object" ? s.v64 : { schema: 1, protocol: PROTOCOLS.ZONE_BATCH, batchRev: 0, sequence: 0, batches: [], proofs: [], audit: [] };
    for (const k of ["proofs", "audit"]) for (const v of [s.v60, s.v61, s.v62, s.v63, s.v64]) if (!Array.isArray(v[k])) v[k] = [];
    if (!Array.isArray(s.v63.events)) s.v63.events = [];
    if (!Array.isArray(s.v64.batches)) s.v64.batches = [];
  }
  function rememberNonce(room, n) { const r = ensureRuntime(room), k = text(n, 180); if (!k) throw new Error("nonceRequired"); if (r.nonces.has(k)) throw new Error("duplicateNonce"); r.nonces.set(k, now()); }
  function verify(client, room, msg, protocol) {
    ensureRuntime(room);
    if (!isSeat(client.role)) throw new Error("seatRequired");
    if (msg.protocol !== protocol) throw new Error("protocolMismatch");
    if (Number(msg.baseRev) !== Number(room.rev)) throw new Error("staleRev");
    rememberNonce(room, msg.actionNonce);
  }
  function proof(room, family, action, body) {
    const salt = crypto.randomBytes(24).toString("hex"), data = { id: uid(`${family}proof`), family, action, body: clone(body), rev: room.rev + 1, createdAt: new Date().toISOString() };
    const p = { ...data, salt, commitment: sha256(`${salt}|${JSON.stringify(data)}`) };
    const state = room.state[family]; state.proofs.push(p); if (state.proofs.length > MAX_PROOFS) state.proofs.splice(0, state.proofs.length - MAX_PROOFS); return p;
  }
  function audit(room, family, kind, data) { const a = room.state[family].audit; a.unshift({ at: new Date().toISOString(), kind, data: clone(data || {}) }); if (a.length > 300) a.length = 300; }
  function finalize(room) { D.finalizeRoom(room); D.refreshRoomHash(room); }
  function common(room, extra = {}) { return { rev: room.rev, state: clone(room.state), authoritySummary: authoritySummary(room), authority: D.authority(), ...extra }; }
  function reject(client, room, type, msg, reason, detail = "") { D.send(client, { type, action: text(msg?.action, 50), actionNonce: text(msg?.actionNonce, 180), txId: text(msg?.txId, 180), reason: text(reason, 180), detail: text(detail, 300), rev: Number(room?.rev) || 0, authoritySummary: room ? authoritySummary(room) : null, authority: D.authority() }); }
  function commit(room, client, committedType, syncType, family, action, summary, extra = {}) {
    const p = proof(room, family, action, summary); finalize(room);
    const payload = common(room, { type: committedType, protocol: extra.protocol, action, actionNonce: text(extra.actionNonce), txId: text(extra.txId), actorRole: client.role, summary: clone(summary), commitment: p.commitment, ...extra });
    D.send(client, payload); D.broadcast(room, { ...payload, type: syncType }, client.clientId || client.id); audit(room, family, `${action}Committed`, summary); D.pushLog(room, { kind: `${family}:${action}`, role: client.role, summary: clone(summary) }); return payload;
  }
  function objectKey(room, card, force = false) { const r = ensureRuntime(room); if (force || !card.v60ObjectKey) card.v60ObjectKey = `obj-${++r.objectSeq}-${crypto.randomBytes(4).toString("hex")}`; return card.v60ObjectKey; }
  function faceFromCatalog(cat, index) { const faces = arr(cat?.faces); return faces[index] || faces[0] || null; }
  function sanitizeFace(f, i = 0) { if (!f || typeof f !== "object") return null; return { index: int(f.index ?? i, 0, 20), id: text(f.id || `face-${i}`, 120), name: text(f.name, 160), types: unique(f.types || [f.type], 30), colors: unique(f.colors, 8), keywords: unique(f.keywords, 80), power: f.power == null || f.power === "" ? null : Number(f.power), toughness: f.toughness == null || f.toughness === "" ? null : Number(f.toughness), subtype: text(f.subtype, 160), supertype: text(f.supertype, 120), legendary: !!f.legendary, manaValue: f.manaValue == null ? null : Number(f.manaValue), imageId: text(f.imageId, 200), imageUrl: text(f.imageUrl, 1000), v54Rules: clone(f.v54Rules || {}), role: text(f.role || (i ? "back" : "front"), 40) }; }
  function sanitizeCatalog(raw) { raw = raw && typeof raw === "object" ? raw : {}; const faces = arr(raw.faces).slice(0, 8).map(sanitizeFace).filter(Boolean); return { schema: 1, layout: text(raw.layout || "normal", 30), transformable: !!raw.transformable, modal: !!raw.modal, daybound: !!raw.daybound, nightbound: !!raw.nightbound, faces, meld: { key: text(raw.meld?.key, 120), partnerName: text(raw.meld?.partnerName, 160), result: sanitizeFace(raw.meld?.result, 2) }, note: text(raw.note, 300) }; }
  function applyFace(room, card, index, reason) {
    const cat = ensureRuntime(room).catalog60[String(card.id)] || card.v60Catalog || {}; const face = faceFromCatalog(cat, index); if (!face) throw new Error("faceMissing");
    card.v60FaceIndex = int(index, 0, 20); card.faceDown = false; card.v60FaceDownKind = null; card.v60Characteristics = clone(face);
    card.name = face.name || card.name; card.types = clone(face.types); card.type = face.types?.[0] || card.type; card.colors = clone(face.colors); card.keywords = clone(face.keywords); card.power = face.power; card.toughness = face.toughness; card.subtype = face.subtype; card.legendary = !!face.legendary;
    objectKey(room, card); card.v60Object = { objectKey: card.v60ObjectKey, cardId: String(card.id), faceIndex: card.v60FaceIndex, faceDown: false, generation: int(card.v60Generation), reason: text(reason, 80) };
    room.state.v60.objectsById[String(card.id)] = clone(card.v60Object); room.state.v60.objectRev++;
  }
  function reconcileObjects(room, reason = "reconcile") {
    ensureRuntime(room); let changed = 0; const visible = allEntries(room, true, true), seen = new Set();
    for (const x of visible) {
      const c = x.card, id = String(c.id || ""); if (!id || seen.has(id)) continue; seen.add(id); if (!c.id) c.id = uid("card");
      objectKey(room, c); c.v60Generation = int(c.v60Generation);
      if (!c.faceDown) {
        const cat = ensureRuntime(room).catalog60[id]; if (cat?.faces?.length) {
          const idx = Math.min(int(c.v60FaceIndex), cat.faces.length - 1); const face = faceFromCatalog(cat, idx); if (!c.v60Characteristics || c.v60Characteristics.id !== face?.id) { applyFace(room, c, idx, reason); changed++; }
        } else if (!c.v60Characteristics) c.v60Characteristics = { name: cardName(c), types: cardTypes(c), colors: unique(c.colors, 8), keywords: unique(c.keywords, 80), power: c.power ?? null, toughness: c.toughness ?? null, subtype: text(c.subtype, 160), legendary: !!c.legendary };
      }
      c.v60Object = { objectKey: c.v60ObjectKey, cardId: id, faceIndex: int(c.v60FaceIndex), faceDown: !!c.faceDown, generation: int(c.v60Generation), zone: x.zone };
      room.state.v60.objectsById[id] = clone(c.v60Object);
    }
    for (const id of Object.keys(room.state.v60.objectsById)) if (!seen.has(id) && !room.state.v60.meldGroups[id]) delete room.state.v60.objectsById[id];
    room.state.v60.objectRev++; return { kind: "objectsReconciled", changed, objectCount: seen.size, reason };
  }
  function lkiSnapshot(found) {
    const c = found.card; return { cardId: String(c.id), objectKey: String(c.v60ObjectKey || ""), name: cardName(c), owner: owner(c, found.role), controller: controller(c, found.role), zone: found.zone, types: cardTypes(c), colors: clone(c.v59Effective?.colors || c.v60Characteristics?.colors || c.colors || []), keywords: [...new Set([...(c.v59Effective?.keywords || []), ...(c.v60Characteristics?.keywords || []), ...(c.keywords || [])])], power: c.v59Effective?.power ?? c.power ?? null, toughness: c.v59Effective?.toughness ?? c.toughness ?? null, counters: clone(c.counters || {}), damage: int(c.damage), tapped: !!c.tapped, faceDown: !!c.faceDown, faceIndex: int(c.v60FaceIndex), attachedTo: clone(c.v61AttachedTo || null), phasedOut: !!c.v62PhasedOut };
  }
  function appendZoneEvent(room, before, card, fromRole, fromZone, toRole, toZone, reason, batchMeta = {}) {
    const event = { id: uid("zoneevent"), status: "pending", kind: "zoneMove", cardId: String(card.id), cardName: before.name, owner: owner(card, fromRole), controllerBefore: before.controller, controllerAfter: controller(card, toRole), fromRole, fromZone, toRole, toZone, oldObjectKey: before.objectKey, newObjectKey: String(card.v60ObjectKey || ""), lki: before, current: { cardId: String(card.id), objectKey: String(card.v60ObjectKey || ""), zone: toZone, role: toRole }, reason: text(reason, 160), flags: { leftBattlefield: BF_ZONES.includes(fromZone), enteredBattlefield: BF_ZONES.includes(toZone), died: BF_ZONES.includes(fromZone) && toZone === "graveyard", exiled: toZone === "exile" }, turn: int(room.state.turn?.number), phase: int(room.state.turn?.phase), createdAt: new Date().toISOString(), ...clone(batchMeta) };
    event.commitment = sha256(event); room.state.v63.events.unshift(event); if (room.state.v63.events.length > MAX_EVENTS) room.state.v63.events.length = MAX_EVENTS; room.state.v63.eventRev++; room.state.v63.lkiRev++; return event;
  }
  function detachRelations(room, cardId, reason = "zoneMove") {
    const st = room.state.v61, removed = [];
    for (const [id, rel] of Object.entries(st.attachmentsById || {})) if (rel?.status === "active" && (String(rel.attachmentId) === String(cardId) || String(rel.targetCardId) === String(cardId))) { rel.status = "detached"; rel.endedReason = reason; rel.endedAt = new Date().toISOString(); const f = findCard(room, rel.attachmentId, true); if (f) { delete f.card.v61AttachedTo; f.card.v61PowerMod = 0; f.card.v61ToughnessMod = 0; f.card.v61GrantedKeywords = []; } removed.push(id); }
    if (removed.length) st.attachmentRev++;
    return removed;
  }
  function moveOne(room, found, destination, reason = "move", batchMeta = {}) {
    if (!found) throw new Error("cardNotFound");
    const c = found.card, meldGroupId = c.v60MeldGroupId;
    if (meldGroupId && room.state.v60.meldGroups[meldGroupId]?.status === "active") return splitMeldForMove(room, found, destination, reason, batchMeta);
    const before = lkiSnapshot(found), fromRole = found.role, fromZone = found.zone; detachRelations(room, c.id, "zoneMove");
    const card = removeEntry(found); if (!card) throw new Error("cardNotFound"); card.v60Generation = int(card.v60Generation) + 1; objectKey(room, card, true); card.damage = 0; card.attacking = false; card.blocking = false; card.blockingTargetId = null; card.blockingTargetIds = [];
    if (!BF_ZONES.includes(destination)) { card.tapped = false; card.controller = owner(card, fromRole); card.v61EffectiveController = card.controller; card.faceDown = false; if (ensureRuntime(room).faceDownSecrets[String(card.id)]) { const secret = ensureRuntime(room).faceDownSecrets[String(card.id)]; Object.assign(card, clone(secret.cardPublic)); delete ensureRuntime(room).faceDownSecrets[String(card.id)]; } }
    const placed = placeCard(room, card, destination, fromRole); reconcileObjects(room, `move:${reason}`); const ev = appendZoneEvent(room, before, card, fromRole, fromZone, placed.role, placed.zone, reason, batchMeta); return { card, event: ev, fromZone, toZone: placed.zone, fromRole, toRole: placed.role };
  }
  function splitMeldForMove(room, found, destination, reason, batchMeta) {
    const gid = found.card.v60MeldGroupId, group = room.state.v60.meldGroups[gid]; if (!group) throw new Error("meldGroupMissing"); const resultBefore = lkiSnapshot(found); removeEntry(found); const outputs = [];
    for (const raw of arr(group.components)) { const card = clone(raw.card); delete card.v60MeldGroupId; card.v60Generation = int(card.v60Generation) + 1; objectKey(room, card, true); const placed = placeCard(room, card, destination, raw.role); reconcileObjects(room, `meldSplit:${reason}`); const ev = appendZoneEvent(room, { ...clone(raw.lki), objectKey: raw.lki?.objectKey || resultBefore.objectKey }, card, raw.role, raw.zone, placed.role, placed.zone, `meldSplit:${reason}`, batchMeta); outputs.push({ card, event: ev }); }
    group.status = "split"; group.endedAt = new Date().toISOString(); group.destination = destination; room.state.v60.objectRev++; return { meldSplit: true, groupId: gid, outputs };
  }
  function legalAttachmentTarget(cat, attachment, target, actorRole, targetKind, targetPlayer) {
    if (targetKind === "player") return !!cat.allowPlayers && isSeat(targetPlayer);
    if (!target) return false; if (!cat.allowSelf && String(attachment.id) === String(target.card.id)) return false;
    const rel = cat.relation || "any", tc = controller(target.card, target.role); if (rel === "controller" && tc !== actorRole) return false; if (rel === "opponent" && tc === actorRole) return false;
    const tt = cardTypes(target.card); if (cat.targetTypes?.length && !cat.targetTypes.some(t => tt.includes(t))) return false; const colors = target.card.v59Effective?.colors || target.card.v60Characteristics?.colors || target.card.colors || []; if (cat.targetColors?.length && !cat.targetColors.some(c => colors.includes(c))) return false; return true;
  }
  function applyAttachmentGrant(room, rel) {
    const attachment = findCard(room, rel.attachmentId, true), target = rel.targetCardId ? findCard(room, rel.targetCardId, true) : null; if (!attachment || !target) return;
    const cat = ensureRuntime(room).catalog61[String(attachment.card.id)] || {}; target.card.v61GrantedKeywords = unique(arr(cat.grants).filter(x => x?.kind === "keyword").map(x => x.keyword), 40); target.card.v61PowerMod = arr(cat.grants).filter(x => x?.kind === "pt").reduce((n, x) => n + Number(x.power || 0), 0); target.card.v61ToughnessMod = arr(cat.grants).filter(x => x?.kind === "pt").reduce((n, x) => n + Number(x.toughness || 0), 0);
  }
  function reconcileAttachments(room, reason = "reconcile") {
    const st = room.state.v61; let detached = 0, released = 0; const turn = int(room.state.turn?.number);
    for (const rel of Object.values(st.attachmentsById || {})) if (rel?.status === "active") {
      const a = findCard(room, rel.attachmentId, true), t = rel.targetCardId ? findCard(room, rel.targetCardId, true) : null, cat = a ? ensureRuntime(room).catalog61[String(a.card.id)] || {} : {};
      if (!a || !BF_ZONES.includes(a.zone) || a.card.v62PhasedOut || (rel.targetKind === "card" && (!t || !BF_ZONES.includes(t.zone) || t.card.v62PhasedOut || !legalAttachmentTarget(cat, a.card, t, controller(a.card, a.role), "card")))) { rel.status = "detached"; rel.endedReason = reason; detached++; if (a) delete a.card.v61AttachedTo; if (t) { t.card.v61GrantedKeywords = []; t.card.v61PowerMod = 0; t.card.v61ToughnessMod = 0; } }
      else applyAttachmentGrant(room, rel);
    }
    for (const eff of arr(st.controlEffects)) if (eff?.status === "active") {
      let expire = eff.duration === "eot" && turn > int(eff.startTurn); if (eff.duration === "whileSourcePresent" && (!findCard(room, eff.sourceCardId, true) || findCard(room, eff.sourceCardId, true)?.card.v62PhasedOut)) expire = true;
      if (expire) { releaseControl(room, eff); released++; }
    }
    if (detached) st.attachmentRev++; if (released) st.controlRev++; return { kind: "attachmentsReconciled", detached, released, reason };
  }
  function moveControlCard(room, found, newRole) {
    const card = removeEntry(found); if (!card) throw new Error("cardNotFound"); card.controller = newRole; card.v61EffectiveController = newRole; const zone = battlefieldZone(card); card.zone = zone; room.state.players[newRole][zone].push(card); return card;
  }
  function releaseControl(room, eff) {
    const f = findCard(room, eff.cardId, true); if (f && BF_ZONES.includes(f.zone)) moveControlCard(room, f, eff.baseController); eff.status = "released"; eff.endedAt = new Date().toISOString(); return !!f;
  }
  function indirectAttachmentIds(room, cardId) { const ids = []; for (const rel of Object.values(room.state.v61.attachmentsById || {})) if (rel?.status === "active" && String(rel.targetCardId) === String(cardId)) ids.push(String(rel.attachmentId)); return ids; }
  function phaseOut(room, found, reason = "manual", parentId = null) {
    if (!found || !BF_ZONES.includes(found.zone)) throw new Error("battlefieldCardRequired"); if (found.card.v62PhasedOut) throw new Error("alreadyPhasedOut");
    const ids = [String(found.card.id), ...indirectAttachmentIds(room, found.card.id)]; const records = [];
    for (const id of ids) { const f = findCard(room, id, true); if (!f || f.card.v62PhasedOut) continue; f.card.v62PhasedOut = true; f.card.v62PhaseGroup = parentId || String(found.card.id); const rec = { cardId: id, objectKey: objectKey(room, f.card), roleAtPhaseOut: f.role, zoneAtPhaseOut: f.zone, controllerAtPhaseOut: controller(f.card, f.role), status: "phased", indirect: id !== String(found.card.id), parentId: parentId || String(found.card.id), reason, phasedAt: new Date().toISOString() }; ensureRuntime(room).phasedRecords[id] = rec; room.state.v62.phasedById[id] = clone(rec); records.push(rec); }
    room.state.v62.phaseRev++; return records;
  }
  function phaseIn(room, cardId, actorRole, reason = "manual") {
    const rec = ensureRuntime(room).phasedRecords[String(cardId)], f = findCard(room, cardId, true); if (!rec || rec.status !== "phased" || !f) throw new Error("phaseRecordMissing"); if (![rec.controllerAtPhaseOut, rec.roleAtPhaseOut].includes(actorRole)) throw new Error("phaseRecordNotOwned");
    const group = rec.parentId || String(cardId), rows = Object.values(ensureRuntime(room).phasedRecords).filter(x => x?.status === "phased" && x.parentId === group); for (const x of rows) { const q = findCard(room, x.cardId, true); if (q) { q.card.v62PhasedOut = false; delete q.card.v62PhaseGroup; } x.status = "in"; x.returnedAt = new Date().toISOString(); room.state.v62.phasedById[x.cardId] = clone(x); }
    room.state.v62.phaseRev++; return rows;
  }
  function zoneReplacementCandidates(room, found, destination) {
    const all = [...arr(room.state.v55?.replacementProfiles), ...arr(found.card?.v55Replacements)]; return all.map((x, i) => ({ id: text(x.id || `replacement-${i}`, 120), label: text(x.label || x.name || "置換効果", 140), replaceZone: text(x.replaceZone || x.toZone, 40), mandatory: !!x.mandatory, affectedRole: x.affectedRole, sourceCardId: text(x.sourceCardId || found.card.id, 160) })).filter(x => x.replaceZone && (!x.affectedRole || x.affectedRole === owner(found.card, found.role)) && x.replaceZone !== destination).slice(0, 30);
  }
  function authoritySummary(room) {
    if (!room?.state) {
      const rt = room?.v60v64 || {};
      return {
        objectAuthority: { protocol: PROTOCOLS.OBJECT, catalogRev: 0, objectRev: 0, objectCount: 0, dayNight: null, meldActive: 0 },
        attachmentAuthority: { protocol: PROTOCOLS.ATTACHMENT, catalogRev: 0, attachmentRev: 0, controlRev: 0, activeAttachments: 0, activeControlEffects: 0 },
        phaseAuthority: { protocol: PROTOCOLS.PHASE, phaseRev: 0, phasedCount: Object.values(rt.phasedRecords || {}).filter(x => x?.status === "phased").length, transitCount: Object.keys(rt.transits || {}).length },
        lkiAuthority: { protocol: PROTOCOLS.LKI, eventRev: 0, lkiRev: 0, eventCount: 0, pendingCount: 0 },
        zoneBatchAuthority: { protocol: PROTOCOLS.ZONE_BATCH, batchRev: 0, batchCount: 0, proofCount: 0, activeTransaction: rt.zoneTx ? { id: rt.zoneTx.id, actorRole: rt.zoneTx.actorRole, itemCount: rt.zoneTx.items?.length || 0, expiresAt: rt.zoneTx.expiresAt } : null },
      };
    }
    const r = ensureRuntime(room), s = room.state;
    return {
      objectAuthority: { protocol: PROTOCOLS.OBJECT, catalogRev: int(s.v60.catalogRev), objectRev: int(s.v60.objectRev), objectCount: Object.keys(s.v60.objectsById || {}).length, dayNight: s.v60.dayNight || null, meldActive: Object.values(s.v60.meldGroups || {}).filter(x => x?.status === "active").length },
      attachmentAuthority: { protocol: PROTOCOLS.ATTACHMENT, catalogRev: int(s.v61.catalogRev), attachmentRev: int(s.v61.attachmentRev), controlRev: int(s.v61.controlRev), activeAttachments: Object.values(s.v61.attachmentsById || {}).filter(x => x?.status === "active").length, activeControlEffects: arr(s.v61.controlEffects).filter(x => x?.status === "active").length },
      phaseAuthority: { protocol: PROTOCOLS.PHASE, phaseRev: int(s.v62.phaseRev), phasedCount: Object.values(r.phasedRecords).filter(x => x?.status === "phased").length, transitCount: Object.keys(r.transits).length },
      lkiAuthority: { protocol: PROTOCOLS.LKI, eventRev: int(s.v63.eventRev), lkiRev: int(s.v63.lkiRev), eventCount: s.v63.events.length, pendingCount: s.v63.events.filter(x => x.status === "pending").length },
      zoneBatchAuthority: { protocol: PROTOCOLS.ZONE_BATCH, batchRev: int(s.v64.batchRev), batchCount: s.v64.batches.length, proofCount: s.v64.proofs.length, activeTransaction: r.zoneTx ? { id: r.zoneTx.id, actorRole: r.zoneTx.actorRole, itemCount: r.zoneTx.items.length, expiresAt: r.zoneTx.expiresAt } : null },
    };
  }
  function anyActive(room) { return !!ensureRuntime(room).zoneTx; }
  function activeKind(room) { return anyActive(room) ? "simultaneousZoneTransactionActive" : ""; }

  function handleObject(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.OBJECT); if (anyActive(room)) throw new Error(activeKind(room)); const action = text(msg.action, 50), r = ensureRuntime(room), backup = mutableSnapshot(room, ensureRuntime); let summary;
      try {
        if (action === "syncCatalog") {
          for (const row of arr(msg.cards).slice(0, 300)) { const f = findCard(room, row.cardId, true); if (!f || controller(f.card, f.role) !== client.role) throw new Error("catalogCardNotControlled"); r.catalog60[String(row.cardId)] = sanitizeCatalog(row.catalog); }
          room.state.v60.catalogRev++; summary = reconcileObjects(room, "catalogSync"); summary.kind = "catalogSynced"; summary.catalogRev = room.state.v60.catalogRev;
        } else if (action === "reconcile") summary = reconcileObjects(room, "manual");
        else if (action === "setDayNight") {
          const value = msg.value == null ? null : text(msg.value, 20); if (![null, "day", "night"].includes(value)) throw new Error("dayNightInvalid"); room.state.v60.dayNight = value; let transformed = 0;
          if (value) for (const x of battlefield(room, true)) { const cat = r.catalog60[String(x.card.id)]; if (!cat || x.card.faceDown) continue; const desired = value === "day" && cat.daybound ? 0 : value === "night" && cat.nightbound ? Math.min(1, cat.faces.length - 1) : null; if (desired != null && desired !== int(x.card.v60FaceIndex)) { applyFace(room, x.card, desired, "dayNight"); transformed++; } }
          summary = { kind: "dayNightSet", value, transformed };
        } else if (["transform", "setFace", "turnFaceDown", "turnFaceUp"].includes(action)) {
          const f = findCard(room, msg.cardId, true); if (!f || controller(f.card, f.role) !== client.role) throw new Error("cardNotControlled"); const c = f.card, cat = r.catalog60[String(c.id)] || {};
          if (action === "transform") { if (c.faceDown) throw new Error("faceDownCannotTransform"); if (arr(cat.faces).length < 2 || !cat.transformable) throw new Error("notTransformable"); const idx = int(c.v60FaceIndex) === 0 ? 1 : 0; applyFace(room, c, idx, "transform"); summary = { kind: "transformed", cardId: String(c.id), faceIndex: idx }; }
          else if (action === "setFace") { const idx = int(msg.faceIndex, 0, 20); if (!arr(cat.faces)[idx]) throw new Error("faceMissing"); applyFace(room, c, idx, "setFace"); summary = { kind: "faceSet", cardId: String(c.id), faceIndex: idx }; }
          else if (action === "turnFaceDown") {
            if (c.faceDown) throw new Error("alreadyFaceDown"); const kind = ["generic", "morph", "manifest", "cloak", "disguise"].includes(msg.faceDownKind) ? msg.faceDownKind : "generic";
            r.faceDownSecrets[String(c.id)] = { cardPublic: clone(c), faceIndex: int(c.v60FaceIndex), objectKey: objectKey(room, c) };
            c.faceDown = true; c.v60FaceDownKind = kind; c.name = "裏向きのカード"; c.types = ["Creature"]; c.type = "Creature"; c.colors = []; c.keywords = ["cloak", "disguise"].includes(kind) ? ["ward:2"] : []; c.power = 2; c.toughness = 2; c.subtype = ""; c.legendary = false; c.v60Characteristics = { name: "", types: ["Creature"], colors: [], keywords: clone(c.keywords), power: 2, toughness: 2, subtype: "", legendary: false, faceDownKind: kind }; reconcileObjects(room, "faceDown"); summary = { kind: "turnedFaceDown", cardId: String(c.id), faceDownKind: kind };
          } else {
            const secret = r.faceDownSecrets[String(c.id)]; if (!c.faceDown || !secret) throw new Error("faceDownSecretMissing"); if (["morph", "manifest", "cloak", "disguise"].includes(c.v60FaceDownKind) && msg.costPaid !== true) throw new Error("faceUpCostNotConfirmed");
            const original = clone(secret.cardPublic); const keepId = c.id, keepKey = c.v60ObjectKey; Object.keys(c).forEach(k => delete c[k]); Object.assign(c, original); c.id = keepId; c.v60ObjectKey = keepKey; c.faceDown = false; delete r.faceDownSecrets[String(c.id)]; applyFace(room, c, secret.faceIndex, "faceUp"); summary = { kind: "turnedFaceUp", cardId: String(c.id), faceIndex: secret.faceIndex };
          }
        } else if (action === "meld") {
          const a = findCard(room, msg.cardAId, true), b = findCard(room, msg.cardBId, true); if (!a || !b || !BF_ZONES.includes(a.zone) || !BF_ZONES.includes(b.zone)) throw new Error("meldComponentsMissing"); if (controller(a.card, a.role) !== client.role || controller(b.card, b.role) !== client.role) throw new Error("meldComponentsNotControlled"); if (String(a.card.id) === String(b.card.id)) throw new Error("meldSameCard");
          const ca = r.catalog60[String(a.card.id)] || {}, cb = r.catalog60[String(b.card.id)] || {}, resultFace = ca.meld?.result || cb.meld?.result; if (!resultFace) throw new Error("meldResultMissing"); if (ca.meld?.key && cb.meld?.key && ca.meld.key !== cb.meld.key) throw new Error("meldKeyMismatch");
          const comp = [a, b].map(x => ({ card: clone(x.card), role: x.role, zone: x.zone, lki: lkiSnapshot(x) })); removeEntry(a); const b2 = findCard(room, msg.cardBId, true); if (!b2) throw new Error("meldSecondMissing"); removeEntry(b2); const gid = uid("meldgroup"), result = { id: uid("meld"), owner: owner(comp[0].card, client.role), controller: client.role, v60FaceIndex: 2, v60MeldGroupId: gid, v60Characteristics: clone(resultFace), name: resultFace.name || "合体パーマネント", types: clone(resultFace.types), type: resultFace.types?.[0] || "Creature", colors: clone(resultFace.colors), keywords: clone(resultFace.keywords), power: resultFace.power, toughness: resultFace.toughness, subtype: resultFace.subtype, legendary: !!resultFace.legendary };
          objectKey(room, result, true); const zone = battlefieldZone(result); result.zone = zone; room.state.players[client.role][zone].push(result); room.state.v60.meldGroups[gid] = { id: gid, status: "active", resultCardId: result.id, controller: client.role, components: comp, createdAt: new Date().toISOString() }; reconcileObjects(room, "meld"); summary = { kind: "melded", groupId: gid, resultCardId: result.id, componentIds: comp.map(x => x.card.id) };
        } else if (action === "unmeld") {
          const f = findCard(room, msg.resultCardId, true); if (!f || controller(f.card, f.role) !== client.role || !f.card.v60MeldGroupId) throw new Error("meldResultNotControlled"); const out = splitMeldForMove(room, f, text(msg.destination || "graveyard", 40), "manualUnmeld", {}); summary = { kind: "meldSplit", groupId: out.groupId, count: out.outputs.length };
        } else throw new Error("unknownObjectAction");
        reconcileAttachments(room, `v60:${action}`); if (D.recomputeLayers) D.recomputeLayers(room); commit(room, client, "objectActionCommitted", "objectPublicSync", "v60", action, summary, { protocol: PROTOCOLS.OBJECT, actionNonce: msg.actionNonce });
      } catch (e) { restoreSnapshot(room, backup, ensureRuntime); throw e; }
    } catch (e) { reject(client, room, "objectActionRejected", msg, e.message || e); }
  }

  function handleAttachment(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.ATTACHMENT); if (anyActive(room)) throw new Error(activeKind(room)); const action = text(msg.action, 50), r = ensureRuntime(room), backup = mutableSnapshot(room, ensureRuntime); let summary;
      try {
        if (action === "syncCatalog") {
          for (const row of arr(msg.cards).slice(0, 300)) { const f = findCard(room, row.cardId, true); if (!f || controller(f.card, f.role) !== client.role) throw new Error("catalogCardNotControlled"); const raw = row.catalog || {}; r.catalog61[String(row.cardId)] = { schema: 1, kind: ["aura", "equipment", "fortification"].includes(raw.kind) ? raw.kind : "", targetTypes: unique(raw.targetTypes, 30), targetColors: unique(raw.targetColors, 8), relation: ["any", "controller", "opponent"].includes(raw.relation) ? raw.relation : "any", allowPlayers: !!raw.allowPlayers, allowSelf: !!raw.allowSelf, equipCost: clone(raw.equipCost || {}), fortifyCost: clone(raw.fortifyCost || {}), grants: arr(raw.grants).slice(0, 50).map(clone), control: clone(raw.control || {}), note: text(raw.note, 300) }; room.state.v61.catalogById[String(row.cardId)] = clone(r.catalog61[String(row.cardId)]); }
          room.state.v61.catalogRev++; summary = reconcileAttachments(room, "catalogSync"); summary.kind = "catalogSynced";
        } else if (action === "reconcile") summary = reconcileAttachments(room, "manual");
        else if (action === "attach") {
          const a = findCard(room, msg.attachmentId, true); if (!a || !BF_ZONES.includes(a.zone) || controller(a.card, a.role) !== client.role || a.card.v62PhasedOut) throw new Error("attachmentNotControlled"); const cat = r.catalog61[String(a.card.id)] || room.state.v61.catalogById[String(a.card.id)] || {}; if (!cat.kind) throw new Error("attachmentCatalogMissing"); const mode = ["direct", "equip", "fortify"].includes(msg.mode) ? msg.mode : "direct";
          if (mode === "equip" && cat.kind !== "equipment") throw new Error("notEquipment"); if (mode === "fortify" && cat.kind !== "fortification") throw new Error("notFortification"); const targetKind = msg.targetKind === "player" ? "player" : "card", t = targetKind === "card" ? findCard(room, msg.targetCardId, true) : null;
          if (!legalAttachmentTarget(cat, a.card, t, client.role, targetKind, msg.targetPlayer)) throw new Error("attachmentTargetIllegal"); const old = room.state.v61.attachmentsById[String(a.card.id)]; if (old?.status === "active") { old.status = "detached"; old.endedReason = "reattach"; }
          const rel = { id: uid("attach"), attachmentId: String(a.card.id), attachmentObjectKey: objectKey(room, a.card), kind: cat.kind, mode, targetKind, targetCardId: t ? String(t.card.id) : null, targetObjectKey: t ? objectKey(room, t.card) : null, targetPlayer: targetKind === "player" ? msg.targetPlayer : null, controller: client.role, status: "active", createdAt: new Date().toISOString() }; room.state.v61.attachmentsById[String(a.card.id)] = rel; a.card.v61AttachedTo = targetKind === "card" ? { kind: "card", cardId: rel.targetCardId } : { kind: "player", player: rel.targetPlayer }; applyAttachmentGrant(room, rel); room.state.v61.attachmentRev++; summary = { kind: "attached", relation: clone(rel) };
        } else if (action === "detach") {
          const rel = room.state.v61.attachmentsById[String(msg.attachmentId || "")], a = findCard(room, msg.attachmentId, true); if (!rel || rel.status !== "active" || !a || controller(a.card, a.role) !== client.role) throw new Error("attachmentNotControlled"); rel.status = "detached"; rel.endedReason = "manual"; rel.endedAt = new Date().toISOString(); delete a.card.v61AttachedTo; const t = rel.targetCardId ? findCard(room, rel.targetCardId, true) : null; if (t) { t.card.v61GrantedKeywords = []; t.card.v61PowerMod = 0; t.card.v61ToughnessMod = 0; } room.state.v61.attachmentRev++; summary = { kind: "detached", attachmentId: String(msg.attachmentId) };
        } else if (action === "gainControl") {
          const f = findCard(room, msg.cardId, true); if (!f || !BF_ZONES.includes(f.zone) || f.card.v62PhasedOut) throw new Error("controlTargetMissing"); const src = msg.sourceCardId ? findCard(room, msg.sourceCardId, true) : null; if (src && controller(src.card, src.role) !== client.role) throw new Error("controlSourceNotControlled"); const base = controller(f.card, f.role); const eff = { id: uid("control"), cardId: String(f.card.id), objectKey: objectKey(room, f.card), baseController: base, newController: client.role, duration: ["permanent", "eot", "whileSourcePresent"].includes(msg.duration) ? msg.duration : "permanent", sourceCardId: src ? String(src.card.id) : null, sourceObjectKey: src ? objectKey(room, src.card) : null, startTurn: int(room.state.turn?.number), status: "active", grantHaste: !!msg.grantHaste, createdAt: new Date().toISOString() }; room.state.v61.baseControllerByObject[eff.objectKey] = base; moveControlCard(room, f, client.role); const moved = findCard(room, eff.cardId, true); if (moved) { if (msg.untap) moved.card.tapped = false; if (msg.grantHaste) moved.card.v61GrantedHaste = true; } room.state.v61.controlEffects.push(eff); room.state.v61.controlRev++; summary = { kind: "controlGained", effect: clone(eff) };
        } else if (action === "releaseControl") {
          const eff = room.state.v61.controlEffects.find(x => x.id === String(msg.effectId || "") && x.status === "active"); if (!eff) throw new Error("controlEffectMissing"); const current = findCard(room, eff.cardId, true); if (!current || controller(current.card, current.role) !== client.role) throw new Error("controlEffectNotOwned"); releaseControl(room, eff); room.state.v61.controlRev++; summary = { kind: "controlReleased", effectId: eff.id };
        } else throw new Error("unknownAttachmentAction");
        reconcileObjects(room, `v61:${action}`); if (D.recomputeLayers) D.recomputeLayers(room); commit(room, client, "attachmentActionCommitted", "attachmentPublicSync", "v61", action, summary, { protocol: PROTOCOLS.ATTACHMENT, actionNonce: msg.actionNonce });
      } catch (e) { restoreSnapshot(room, backup, ensureRuntime); throw e; }
    } catch (e) { reject(client, room, "attachmentActionRejected", msg, e.message || e); }
  }

  function handlePhase(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.PHASE); if (anyActive(room)) throw new Error(activeKind(room)); const action = text(msg.action, 50), backup = mutableSnapshot(room, ensureRuntime); let summary;
      try {
        if (action === "phaseOut") { const f = findCard(room, msg.cardId, true); if (!f || controller(f.card, f.role) !== client.role) throw new Error("cardNotControlled"); summary = { kind: "phasedOut", cards: phaseOut(room, f, "manual") }; }
        else if (action === "phaseIn") summary = { kind: "phasedIn", cards: phaseIn(room, msg.cardId, client.role, "manual") };
        else if (action === "setPhasing") { const f = findCard(room, msg.cardId, true); if (!f || controller(f.card, f.role) !== client.role) throw new Error("cardNotControlled"); f.card.v62HasPhasing = !!msg.enabled; room.state.v62.phaseRev++; summary = { kind: "phasingSet", cardId: String(f.card.id), enabled: !!msg.enabled }; }
        else if (action === "phaseAllOut") { const rows = []; for (const f of battlefield(room, true).filter(x => controller(x.card, x.role) === client.role && !x.card.v62PhasedOut)) rows.push(...phaseOut(room, f, "allOut")); summary = { kind: "allPhasedOut", count: rows.length }; }
        else if (action === "phaseAllIn") { const rows = []; for (const rec of Object.values(ensureRuntime(room).phasedRecords).filter(x => x?.status === "phased" && !x.indirect && [x.controllerAtPhaseOut, x.roleAtPhaseOut].includes(client.role))) rows.push(...phaseIn(room, rec.cardId, client.role, "allIn")); summary = { kind: "allPhasedIn", count: rows.length }; }
        else if (action === "processUntap") {
          const inRows = [], outRows = []; for (const rec of Object.values(ensureRuntime(room).phasedRecords).filter(x => x?.status === "phased" && !x.indirect && [x.controllerAtPhaseOut, x.roleAtPhaseOut].includes(client.role))) inRows.push(...phaseIn(room, rec.cardId, client.role, "untap"));
          for (const f of battlefield(room, true).filter(x => controller(x.card, x.role) === client.role && x.card.v62HasPhasing && !x.card.v62PhasedOut)) outRows.push(...phaseOut(room, f, "untap")); summary = { kind: "untapPhasingProcessed", phasedIn: inRows.length, phasedOut: outRows.length };
        } else if (action === "blink") {
          const f = findCard(room, msg.cardId, true); if (!f || controller(f.card, f.role) !== client.role || !BF_ZONES.includes(f.zone)) throw new Error("cardNotControlled"); const before = lkiSnapshot(f), card = removeEntry(f); if (!card) throw new Error("cardNotFound"); detachRelations(room, card.id, "blink"); card.v60Generation = int(card.v60Generation) + 1; objectKey(room, card, true); const transitId = uid("transit"), rec = { id: transitId, card: clone(card), owner: owner(card, f.role), previousController: controller(card, f.role), returnAt: text(msg.returnAt || "immediate", 60), controllerMode: ["previous", "owner", "actor"].includes(msg.controllerMode) ? msg.controllerMode : "previous", returnTapped: !!msg.returnTapped, actorRole: client.role, status: "transit", createdAt: new Date().toISOString(), lki: before }; ensureRuntime(room).transits[transitId] = rec; room.state.v62.transits = Object.values(ensureRuntime(room).transits).map(x => ({ id: x.id, cardId: x.card.id, cardName: cardName(x.card), returnAt: x.returnAt, status: x.status, actorRole: x.actorRole }));
          if (rec.returnAt === "immediate") { const ctrl = rec.controllerMode === "owner" ? rec.owner : (rec.controllerMode === "actor" ? client.role : rec.previousController); rec.card.controller = ctrl; rec.card.v61EffectiveController = ctrl; rec.card.tapped = rec.returnTapped; const placed = placeCard(room, rec.card, "battlefield", rec.owner); rec.status = "returned"; appendZoneEvent(room, before, rec.card, f.role, f.zone, placed.role, placed.zone, "blinkImmediate"); }
          room.state.v62.phaseRev++; reconcileObjects(room, "blink"); summary = { kind: rec.status === "returned" ? "blinkReturned" : "blinkTransit", transitId, cardId: String(card.id), returnAt: rec.returnAt };
        } else if (action === "returnTransit") {
          const rec = ensureRuntime(room).transits[String(msg.transitId || "")]; if (!rec || rec.status !== "transit") throw new Error("transitMissing"); if (![rec.actorRole, rec.owner, rec.previousController].includes(client.role)) throw new Error("transitNotOwned"); const ctrl = rec.controllerMode === "owner" ? rec.owner : (rec.controllerMode === "actor" ? rec.actorRole : rec.previousController); rec.card.controller = ctrl; rec.card.v61EffectiveController = ctrl; rec.card.tapped = rec.returnTapped; const placed = placeCard(room, rec.card, "battlefield", rec.owner); rec.status = "returned"; rec.returnedAt = new Date().toISOString(); appendZoneEvent(room, rec.lki, rec.card, rec.owner, "exile", placed.role, placed.zone, "returnTransit"); room.state.v62.transits = Object.values(ensureRuntime(room).transits).map(x => ({ id: x.id, cardId: x.card.id, cardName: cardName(x.card), returnAt: x.returnAt, status: x.status, actorRole: x.actorRole })); room.state.v62.phaseRev++; reconcileObjects(room, "returnTransit"); summary = { kind: "transitReturned", transitId: rec.id, cardId: String(rec.card.id) };
        } else if (action === "reconcile") { reconcileObjects(room, "phaseReconcile"); summary = reconcileAttachments(room, "phaseReconcile"); summary.kind = "phaseReconciled"; }
        else throw new Error("unknownPhaseAction");
        if (D.recomputeLayers) D.recomputeLayers(room); commit(room, client, "phaseActionCommitted", "phasePublicSync", "v62", action, summary, { protocol: PROTOCOLS.PHASE, actionNonce: msg.actionNonce });
      } catch (e) { restoreSnapshot(room, backup, ensureRuntime); throw e; }
    } catch (e) { reject(client, room, "phaseActionRejected", msg, e.message || e); }
  }

  function handleZoneEvent(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.LKI); if (anyActive(room)) throw new Error(activeKind(room)); const action = text(msg.action, 50), backup = mutableSnapshot(room, ensureRuntime); let summary, triggerEvent = null;
      try {
        if (action === "move") { const f = findCard(room, msg.cardId, true); if (!f || controller(f.card, f.role) !== client.role) throw new Error("cardNotControlled"); const out = moveOne(room, f, text(msg.destination, 40), "manualZoneMove"); summary = { kind: "zoneMoved", cardId: String(msg.cardId), eventId: out.event?.id, fromZone: out.fromZone, toZone: out.toZone, meldSplit: !!out.meldSplit }; }
        else if (["process", "acknowledge", "reopen"].includes(action)) { const ev = room.state.v63.events.find(x => x.id === String(msg.eventId || "")); if (!ev) throw new Error("zoneEventMissing"); if (![ev.owner, ev.controllerBefore, ev.controllerAfter].includes(client.role)) throw new Error("zoneEventNotOwned"); ev.status = action === "process" ? "processed" : (action === "acknowledge" ? "acknowledged" : "pending"); ev.updatedAt = new Date().toISOString(); room.state.v63.eventRev++; summary = { kind: `zoneEvent${action[0].toUpperCase()}${action.slice(1)}`, eventId: ev.id, status: ev.status }; if (action === "process") triggerEvent = clone(ev); }
        else if (action === "reconcile") { reconcileObjects(room, "lkiReconcile"); reconcileAttachments(room, "lkiReconcile"); summary = { kind: "zoneEventsReconciled", eventCount: room.state.v63.events.length, pendingCount: room.state.v63.events.filter(x => x.status === "pending").length }; }
        else throw new Error("unknownZoneEventAction");
        commit(room, client, "zoneEventActionCommitted", "zoneEventPublicSync", "v63", action, summary, { protocol: PROTOCOLS.LKI, actionNonce: msg.actionNonce });
        if (triggerEvent && D.startTriggerEvent) D.startTriggerEvent(room, { eventId: `zone:${triggerEvent.id}`, kind: "zoneMove", timing: "zoneMove", turn: triggerEvent.turn, phase: triggerEvent.phase, activeRole: room.state.turn?.active || client.role, actorRole: client.role, cardId: triggerEvent.cardId, sourceCardId: triggerEvent.cardId, fromZone: triggerEvent.fromZone, toZone: triggerEvent.toZone, lki: triggerEvent.lki, flags: triggerEvent.flags }, client, `zone-${triggerEvent.id}`);
      } catch (e) { restoreSnapshot(room, backup, ensureRuntime); throw e; }
    } catch (e) { reject(client, room, "zoneEventActionRejected", msg, e.message || e); }
  }

  function handleZoneStart(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.ZONE_BATCH); const r = ensureRuntime(room); if (r.zoneTx) throw new Error("simultaneousZoneTransactionActive"); const moves = arr(msg.moves).slice(0, 100); if (!moves.length) throw new Error("movesRequired"); const seen = new Set(), items = [];
      for (const raw of moves) { const id = String(raw.cardId || ""); if (!id || seen.has(id)) throw new Error("duplicateMoveCard"); seen.add(id); const f = findCard(room, id, true); if (!f || controller(f.card, f.role) !== client.role || f.card.v62PhasedOut) throw new Error("moveCardNotControlled"); const destination = text(raw.destination, 40); if (![...PUBLIC_ZONES, "battlefield"].includes(destination)) throw new Error("destinationUnsupported"); items.push({ cardId: id, cardName: cardName(f.card), fromRole: f.role, fromZone: f.zone, objectKey: objectKey(room, f.card), destination, candidates: zoneReplacementCandidates(room, f, destination) }); }
      const tx = { id: uid("zonebatchtx"), actorClientId: client.clientId || client.id, actorRole: client.role, baseRev: room.rev, items, createdAt: now(), expiresAt: now() + TX_TTL_MS }; r.zoneTx = tx;
      D.send(client, { type: "simultaneousZoneTxStarted", protocol: PROTOCOLS.ZONE_BATCH, actionNonce: text(msg.actionNonce), txId: tx.id, baseRev: tx.baseRev, items: clone(items), authoritySummary: authoritySummary(room), authority: D.authority() });
    } catch (e) { reject(client, room, "simultaneousZoneTxRejected", msg, e.message || e); }
  }
  function handleZoneCommit(client, room, msg) {
    const r = ensureRuntime(room), tx = r.zoneTx;
    try {
      verify(client, room, msg, PROTOCOLS.ZONE_BATCH); if (!tx || String(msg.txId || "") !== tx.id) throw new Error("transactionNotFound"); if (tx.actorClientId !== (client.clientId || client.id) || tx.actorRole !== client.role) throw new Error("transactionOwnerMismatch"); if (tx.baseRev !== room.rev) throw new Error("staleRev"); const backup = mutableSnapshot(room, ensureRuntime);
      try {
        const decisions = msg.decisions && typeof msg.decisions === "object" ? msg.decisions : {}, batchId = uid("zonebatch"), moved = [];
        for (let i = 0; i < tx.items.length; i++) {
          const item = tx.items[i], f = findCard(room, item.cardId, true); if (!f || objectKey(room, f.card) !== item.objectKey || f.zone !== item.fromZone) throw new Error("zoneObjectChanged"); let destination = item.destination, applied = [], selected = arr(decisions[item.cardId]).map(String); const map = new Map(item.candidates.map(x => [x.id, x]));
          for (const c of item.candidates.filter(x => x.mandatory)) if (!selected.includes(c.id)) selected.unshift(c.id); if (selected.includes("original")) selected = selected.filter(x => x !== "original"); if (selected.length > 16) throw new Error("replacementChainTooLong");
          for (const id of selected) { const c = map.get(id); if (!c) throw new Error("replacementCandidateMissing"); destination = c.replaceZone || destination; applied.push(c.id); }
          const out = moveOne(room, f, destination, "simultaneousZoneMove", { simultaneousBatchId: batchId, simultaneousIndex: i, simultaneousSize: tx.items.length, appliedReplacements: applied }); moved.push({ cardId: item.cardId, fromZone: item.fromZone, requestedDestination: item.destination, finalDestination: out.meldSplit ? destination : out.toZone, appliedReplacements: applied, eventIds: out.meldSplit ? out.outputs.map(x => x.event.id) : [out.event.id] });
        }
        const batch = { id: batchId, status: "pending", actorRole: client.role, sequence: ++room.state.v64.sequence, moves: moved, createdAt: new Date().toISOString(), commitment: sha256({ batchId, moved, baseRev: tx.baseRev }) }; room.state.v64.batches.unshift(batch); if (room.state.v64.batches.length > 200) room.state.v64.batches.length = 200; room.state.v64.batchRev++; r.zoneTx = null; reconcileAttachments(room, "zoneBatch"); reconcileObjects(room, "zoneBatch"); if (D.recomputeLayers) D.recomputeLayers(room); commit(room, client, "simultaneousZoneTxCommitted", "simultaneousZonePublicSync", "v64", "commit", { kind: "simultaneousZoneCommitted", batchId, count: moved.length }, { protocol: PROTOCOLS.ZONE_BATCH, actionNonce: msg.actionNonce, txId: tx.id, batch: clone(batch) });
      } catch (e) { restoreSnapshot(room, backup, ensureRuntime); throw e; }
    } catch (e) { if (r.zoneTx && r.zoneTx.actorClientId === (client.clientId || client.id)) r.zoneTx = null; reject(client, room, "simultaneousZoneTxRejected", msg, e.message || e); }
  }
  function handleZoneCancel(client, room, msg) { const r = ensureRuntime(room), tx = r.zoneTx; if (!tx || String(msg.txId || "") !== tx.id) return reject(client, room, "simultaneousZoneTxRejected", msg, "transactionNotFound"); if (tx.actorClientId !== (client.clientId || client.id)) return reject(client, room, "simultaneousZoneTxRejected", msg, "transactionOwnerMismatch"); r.zoneTx = null; D.send(client, { type: "simultaneousZoneTxCancelled", protocol: PROTOCOLS.ZONE_BATCH, txId: tx.id, actionNonce: text(msg.actionNonce), authoritySummary: authoritySummary(room), authority: D.authority() }); }
  function handleBatchAction(client, room, msg) {
    try { verify(client, room, msg, PROTOCOLS.ZONE_BATCH); if (anyActive(room)) throw new Error(activeKind(room)); const batch = room.state.v64.batches.find(x => x.id === String(msg.batchId || "")); if (!batch) throw new Error("batchMissing"); if (batch.actorRole !== client.role) throw new Error("batchNotOwned"); const action = text(msg.action, 40); if (action === "acknowledgeBatch") batch.status = "acknowledged"; else if (action === "reopenBatch") batch.status = "pending"; else throw new Error("batchActionInvalid"); room.state.v64.batchRev++; commit(room, client, "simultaneousZoneBatchCommitted", "simultaneousZonePublicSync", "v64", action, { kind: action, batchId: batch.id, status: batch.status }, { protocol: PROTOCOLS.ZONE_BATCH, actionNonce: msg.actionNonce, batch: clone(batch) }); }
    catch (e) { reject(client, room, "simultaneousZoneBatchRejected", msg, e.message || e); }
  }

  function cancelClientTransactions(room, id) { const r = ensureRuntime(room); if (r.zoneTx?.actorClientId === String(id || "")) r.zoneTx = null; }
  function handle(client, room, msg) {
    switch (msg.type) {
      case "objectAction": handleObject(client, room, msg); return true;
      case "attachmentAction": handleAttachment(client, room, msg); return true;
      case "phaseAction": handlePhase(client, room, msg); return true;
      case "zoneEventAction": handleZoneEvent(client, room, msg); return true;
      case "simultaneousZoneTxStart": handleZoneStart(client, room, msg); return true;
      case "simultaneousZoneTxCommit": handleZoneCommit(client, room, msg); return true;
      case "simultaneousZoneTxCancel": handleZoneCancel(client, room, msg); return true;
      case "simultaneousZoneBatchAction": handleBatchAction(client, room, msg); return true;
      default: return false;
    }
  }
  return { PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES, ensureRuntime, authoritySummary, anyActive, activeKind, cancelClientTransactions, handle, reconcileObjects, reconcileAttachments, moveOne };
}

module.exports = { PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES, createEngine };
