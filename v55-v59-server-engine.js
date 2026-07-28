"use strict";

const crypto = require("crypto");

const PROTOCOLS = Object.freeze({
  TRIGGER: "cpt-v5.5",
  COMBAT: "cpt-v5.6",
  TURN: "cpt-v5.7",
  STATE: "cpt-v5.8",
  LAYER: "cpt-v5.9",
});

const AUTHORITY_FLAGS = Object.freeze({
  triggerProtocol: PROTOCOLS.TRIGGER,
  serverTriggeredAbilitiesV55: true,
  serverDelayedTriggersV55: true,
  serverAPNAPOrderingV55: true,
  serverReplacementChoicesV55: true,
  serverReplacementReevaluationV7930: true,
  serverReplacementLoopGuardV7930: true,
  combatProtocol: PROTOCOLS.COMBAT,
  serverCombatTransactionsV56: true,
  serverAttackLegalityV56: true,
  serverBlockLegalityV56: true,
  serverCombatDamageV56: true,
  turnProtocol: PROTOCOLS.TURN,
  serverTurnProgressionV57: true,
  serverPriorityPassesV57: true,
  serverAutomaticStackResolutionV57: true,
  stateProtocol: PROTOCOLS.STATE,
  serverStateBasedActionsV58: true,
  serverGameEndV58: true,
  serverExtraTurnsV58: true,
  serverStepSkippingV58: true,
  layerProtocol: PROTOCOLS.LAYER,
  serverContinuousLayersV59: true,
  serverCopyEffectsV59: true,
  serverDerivedCharacteristicsV59: true,
});

const MESSAGE_TYPES = Object.freeze([
  "triggerEventStart", "triggerBatchOrder", "triggerBatchCommit", "delayedTriggerRegister",
  "replacementTxStart", "replacementTxCommit", "replacementTxCancel",
  "combatTxStart", "combatTxCommit", "combatTxCancel",
  "turnAction", "stateAction", "layerAction",
]);

const SEATS = ["A", "B"];
const SEAT_SET = new Set(SEATS);
const BATTLEFIELD_ZONES = ["creatures", "lands", "others"];
const PUBLIC_ZONES = [...BATTLEFIELD_ZONES, "graveyard", "exile", "command"];
const TX_TTL_MS = 3 * 60 * 1000;
const MAX_NONCES = 4096;
const MAX_TRIGGER_CANDIDATES = 200;
const MAX_LAYER_PROFILES = 500;
const MAX_REPLACEMENT_CHAIN = 32;
const PHASE_COUNT = 12;

function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function now() { return Date.now(); }
function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`; }
function sha256(v) { return crypto.createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex"); }
function text(v, max = 180) { return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, "").slice(0, max); }
function int(v, min = 0, max = Number.MAX_SAFE_INTEGER) { return Math.max(min, Math.min(max, Math.trunc(Number(v) || 0))); }
function isSeat(v) { return SEAT_SET.has(v); }
function other(role) { return role === "A" ? "B" : "A"; }
function arr(v) { return Array.isArray(v) ? v : []; }
function uniqueStrings(v, max = 200) { return [...new Set(arr(v).map(x => String(x || "")).filter(Boolean))].slice(0, max); }
function cardName(c) { return text(c?.name || c?.displayName || c?.id || "カード", 120); }
function cardTypes(c) {
  const list = Array.isArray(c?.v59Effective?.types) ? c.v59Effective.types : (Array.isArray(c?.types) ? c.types : [c?.type]);
  return uniqueStrings(list, 40);
}
function keywords(c) {
  const list = Array.isArray(c?.v59Effective?.keywords) ? c.v59Effective.keywords : [
    ...arr(c?.keywords), ...arr(c?.v61GrantedKeywords), ...(c?.v61GrantedHaste ? ["haste"] : []), ...arr(c?.combatKeywords), ...arr(c?.untilEndOfTurnCombatKeywords), ...arr(c?.untilEndOfCombatCombatKeywords),
  ];
  return new Set(list.map(x => String(x || "").toLowerCase()));
}
function basePower(c) { const x = Number(c?.v59Effective?.power ?? c?.power); return Number.isFinite(x) ? x : 0; }
function baseToughness(c) { const x = Number(c?.v59Effective?.toughness ?? c?.toughness); return Number.isFinite(x) ? x : 0; }
function counterValue(c, names) {
  let n = 0;
  for (const name of names) n += Number(c?.counters?.[name] ?? c?.counters?.[name.replace(/[+-]/g, "")] ?? 0) || 0;
  return n;
}
function effectivePower(c) { return basePower(c) + counterValue(c, ["+1/+1", "plus1plus1"]) - counterValue(c, ["-1/-1", "minus1minus1"]) + Number(c?.v61PowerMod || 0) + Number(c?.untilEndOfTurnPower || 0) + Number(c?.untilEndOfCombatPower || 0); }
function effectiveToughness(c) { return baseToughness(c) + counterValue(c, ["+1/+1", "plus1plus1"]) - counterValue(c, ["-1/-1", "minus1minus1"]) + Number(c?.v61ToughnessMod || 0) + Number(c?.untilEndOfTurnToughness || 0) + Number(c?.untilEndOfCombatToughness || 0); }
function controllerOf(c, fallback) { return isSeat(c?.controller) ? c.controller : (isSeat(c?.owner) ? c.owner : fallback); }

function allPublicCards(room, includeStack = true) {
  const out = [];
  for (const role of SEATS) {
    const p = room.state?.players?.[role] || {};
    for (const zone of PUBLIC_ZONES) for (const card of arr(p[zone])) out.push({ card, role, zone, list: p[zone] });
  }
  if (includeStack) for (const card of arr(room.state?.stack)) out.push({ card, role: controllerOf(card, "A"), zone: "stack", list: room.state.stack });
  return out;
}
function battlefieldCards(room) { return allPublicCards(room, false).filter(x => BATTLEFIELD_ZONES.includes(x.zone) && !x.card?.v62PhasedOut); }
function findPublicCard(room, id) { return allPublicCards(room, true).find(x => String(x.card?.id || "") === String(id || "")) || null; }
function removeFromList(list, id) { const i = arr(list).findIndex(x => String(x?.id || "") === String(id || "")); return i < 0 ? null : list.splice(i, 1)[0]; }
function publicPlayer(room, role) {
  room.state = room.state && typeof room.state === "object" ? room.state : { players: { A: {}, B: {} }, stack: [], turn: {} };
  room.state.players = room.state.players || {};
  room.state.players[role] = room.state.players[role] || {};
  const p = room.state.players[role];
  for (const z of [...PUBLIC_ZONES, "hand", "library", "sideboard"]) if (!Array.isArray(p[z])) p[z] = [];
  p.manaPool = p.manaPool && typeof p.manaPool === "object" ? p.manaPool : { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  p.life = Number.isFinite(Number(p.life)) ? Number(p.life) : 20;
  return p;
}
function privateZones(room, role, D) {
  const s = D.rolePrivate(room, role);
  if (!s || typeof s !== "object") throw new Error("privateStateMissing");
  s.zones = s.zones && typeof s.zones === "object" ? s.zones : {};
  for (const z of ["hand", "library", "sideboard"]) if (!Array.isArray(s.zones[z])) s.zones[z] = [];
  return s.zones;
}
function hiddenStub(role, zone, index, id) {
  return { id: id || `h-${role}-${zone}-${index}-${crypto.randomBytes(3).toString("hex")}`, name: "非公開カード", owner: role, controller: role, zone, type: "Unknown", types: ["Unknown"], faceDown: true, v48Redacted: true, v48HiddenZone: zone, v48OriginPlayer: role };
}
function refreshHiddenZone(room, role, zone, D) {
  const p = publicPlayer(room, role), real = privateZones(room, role, D)[zone];
  p[zone] = real.map((c, i) => hiddenStub(role, zone, i, `h-${role}-${zone}-${i}`));
}
function movePublicCard(room, found, destination, ownerOverride) {
  const card = found?.list ? removeFromList(found.list, found.card.id) : null;
  if (!card) throw new Error("cardNotFound");
  const owner = isSeat(ownerOverride) ? ownerOverride : (isSeat(card.owner) ? card.owner : found.role);
  card.zone = destination;
  card.attacking = false; card.blocking = false; card.blockingTargetId = null; card.blockingTargetIds = [];
  if (destination === "battlefield") {
    const types = cardTypes(card), zone = types.includes("Land") ? "lands" : (types.includes("Creature") ? "creatures" : "others");
    card.zone = zone; publicPlayer(room, controllerOf(card, owner))[zone].push(card);
  } else {
    if (!PUBLIC_ZONES.includes(destination)) throw new Error("destinationUnsupported");
    publicPlayer(room, owner)[destination].push(card);
  }
  return card;
}
function snapshotMutable(room) {
  return { state: clone(room.state), privateByRole: clone(room.privateByRole), privateRevByRole: clone(room.privateRevByRole), rev: room.rev, updatedAt: room.updatedAt, runtime: cloneSerializableRuntime(room.v55v59) };
}
function cloneSerializableRuntime(rt) {
  if (!rt) return null;
  return {
    delayedTriggers: clone(rt.delayedTriggers), replacementProfiles: clone(rt.replacementProfiles),
    triggerCatalogRev: rt.triggerCatalogRev, triggerBatch: clone(rt.triggerBatch), replacementTx: clone(rt.replacementTx), combatTx: clone(rt.combatTx),
    passCount: rt.passCount, lastPassRole: rt.lastPassRole, layerCatalogByRole: clone(rt.layerCatalogByRole), copySources: clone(rt.copySources), timestampSeq: rt.timestampSeq,
  };
}
function restoreMutable(room, snap, ensureRoom) {
  room.state = snap.state; room.privateByRole = snap.privateByRole; room.privateRevByRole = snap.privateRevByRole; room.rev = snap.rev; room.updatedAt = snap.updatedAt;
  const rt = ensureRoom(room), x = snap.runtime || {};
  rt.delayedTriggers = x.delayedTriggers || []; rt.replacementProfiles = x.replacementProfiles || []; rt.triggerCatalogRev = x.triggerCatalogRev || 0;
  rt.triggerBatch = x.triggerBatch || null; rt.replacementTx = x.replacementTx || null; rt.combatTx = x.combatTx || null;
  rt.passCount = x.passCount || 0; rt.lastPassRole = x.lastPassRole || null; rt.layerCatalogByRole = x.layerCatalogByRole || { A: [], B: [] }; rt.copySources = x.copySources || {}; rt.timestampSeq = x.timestampSeq || 0;
}

function createEngine(D) {
  if (!D || typeof D.send !== "function" || typeof D.broadcast !== "function") throw new Error("dependenciesMissing");

  function ensureRoom(room) {
    if (!room.v55v59 || typeof room.v55v59 !== "object") room.v55v59 = {};
    const r = room.v55v59;
    if (!(r.nonces instanceof Map)) r.nonces = new Map();
    if (!Array.isArray(r.delayedTriggers)) r.delayedTriggers = [];
    if (!Array.isArray(r.replacementProfiles)) r.replacementProfiles = [];
    if (!r.layerCatalogByRole || typeof r.layerCatalogByRole !== "object") r.layerCatalogByRole = { A: [], B: [] };
    if (!Array.isArray(r.layerCatalogByRole.A)) r.layerCatalogByRole.A = [];
    if (!Array.isArray(r.layerCatalogByRole.B)) r.layerCatalogByRole.B = [];
    if (!r.copySources || typeof r.copySources !== "object") r.copySources = {};
    r.triggerBatch ||= null; r.replacementTx ||= null; r.combatTx ||= null; r.passCount = int(r.passCount); r.lastPassRole ||= null; r.timestampSeq = int(r.timestampSeq);
    prune(room);
    return r;
  }
  function ensureStateContainers(room) {
    room.state = room.state && typeof room.state === "object" ? room.state : { players: { A: {}, B: {} }, stack: [], turn: {} };
    room.state.players = room.state.players || { A: {}, B: {} }; publicPlayer(room, "A"); publicPlayer(room, "B");
    room.state.stack = Array.isArray(room.state.stack) ? room.state.stack : [];
    room.state.turn = room.state.turn && typeof room.state.turn === "object" ? room.state.turn : {};
    const t = room.state.turn;
    t.active = isSeat(t.active) ? t.active : "A"; t.priority = isSeat(t.priority) ? t.priority : t.active; t.phase = int(t.phase, 0, PHASE_COUNT - 1); t.number = Math.max(1, int(t.number, 1));
    t.v57 = t.v57 && typeof t.v57 === "object" ? t.v57 : { passCount: 0, cleanupRequired: 0 };
    room.state.v55 = room.state.v55 && typeof room.state.v55 === "object" ? room.state.v55 : { delayedTriggers: [], lastBatch: null, lastReplacement: null };
    room.state.v58 = room.state.v58 && typeof room.state.v58 === "object" ? room.state.v58 : { game: { status: "playing", result: null, winner: null, losers: [], reasons: [], endedAt: null, source: "" }, drawFailures: { A: null, B: null }, proofs: [], audit: [], pendingLegend: null, lastSba: null, lastTurnEvent: null, sbaPasses: 0 };
    room.state.v34 = room.state.v34 && typeof room.state.v34 === "object" ? room.state.v34 : {};
    for (const q of ["extraTurns", "turnSkips", "phaseSkips", "extraCombats"]) if (!Array.isArray(room.state.v34[q])) room.state.v34[q] = [];
    room.state.v59 = room.state.v59 && typeof room.state.v59 === "object" ? room.state.v59 : { schema: 1, protocol: PROTOCOLS.LAYER, catalogRev: 0, derivedById: {}, conflicts: [], proofs: [], audit: [] };
  }
  function prune(room) {
    const r = room.v55v59; const t = now();
    if (r.triggerBatch?.expiresAt <= t) r.triggerBatch = null;
    if (r.replacementTx?.expiresAt <= t) r.replacementTx = null;
    if (r.combatTx?.expiresAt <= t) r.combatTx = null;
    for (const [k, at] of r.nonces) if (t - at > 30 * 60 * 1000) r.nonces.delete(k);
    while (r.nonces.size > MAX_NONCES) r.nonces.delete(r.nonces.keys().next().value);
  }
  function clientId(client) { return String(client?.id || client?.clientId || ""); }
  function verify(client, room, msg, protocol, allowNoNonce = false) {
    ensureRoom(room);
    if (!isSeat(client?.role)) throw new Error("spectator");
    if (room.state == null) throw new Error("stateNotInitialized");
    ensureStateContainers(room);
    if (msg.protocol !== protocol) throw new Error("protocolMismatch");
    if (Number(msg.baseRev) !== Number(room.rev)) throw new Error("staleRev");
    if (!allowNoNonce) {
      const nonce = text(msg.actionNonce, 180); if (!nonce) throw new Error("actionNonceMissing");
      const key = `${clientId(client)}:${protocol}:${nonce}`; if (room.v55v59.nonces.has(key)) throw new Error("actionNonceReused"); room.v55v59.nonces.set(key, now());
    }
    if (room.state?.v58?.game?.status === "ended" && !["repairState", "layerAction"].includes(msg.type)) throw new Error("gameEnded");
  }
  function finalize(room, privateRoles = []) {
    for (const role of uniqueStrings(privateRoles, 2)) {
      if (!isSeat(role)) continue;
      room.privateRevByRole[role] = int(room.privateRevByRole?.[role]) + 1;
      const s = D.rolePrivate(room, role); if (s?.__cptPrivateV49) s.__cptPrivateV49.basePublicRev = Number(room.rev) + 1;
    }
    D.finalizeRoom(room); D.refreshRoomHash(room);
  }
  function record(room, kind, data) { D.pushLog(room, { kind: `v55v59:${kind}`, ...clone(data || {}) }); }
  function common(room, client, extra = {}) {
    return Object.assign({ rev: room.rev, state: clone(room.state), privateState: D.privateStateFor(room, client.role), authoritySummary: authoritySummary(room), authority: D.authority() }, extra);
  }
  function sendCommit(room, client, type, syncType, summary, extra = {}, exceptId = clientId(client)) {
    const payload = common(room, client, Object.assign({ type, summary }, extra)); D.send(client, payload);
    D.broadcast(room, Object.assign({ type: syncType, rev: room.rev, state: clone(room.state), summary, authoritySummary: authoritySummary(room), authority: D.authority() }, extra), exceptId);
  }
  function reject(client, room, type, msg, reason, detail = "") {
    D.send(client, { type, protocol: msg?.protocol || "", actionNonce: text(msg?.actionNonce), txId: text(msg?.txId), reason: text(reason, 120), detail: text(detail, 300), rev: Number(room?.rev || 0), authoritySummary: room ? authoritySummary(room) : null, authority: D.authority() });
  }
  function activeKind(room) { const r = ensureRoom(room); return r.triggerBatch ? "triggerBatchActive" : r.replacementTx ? "replacementTransactionActive" : r.combatTx ? "combatTransactionActive" : ""; }
  function anyActive(room) { return !!activeKind(room); }

  function authoritySummary(room) {
    const r = ensureRoom(room), t = room.state?.turn || { active: "A", priority: "A", phase: 0, number: 1, v57: {} }, v58 = room.state?.v58 || { game: { status: "waiting" } }, v59 = room.state?.v59 || {};
    return {
      triggerAuthority: { protocol: PROTOCOLS.TRIGGER, delayedCount: r.delayedTriggers.length, activeBatch: r.triggerBatch ? { id: r.triggerBatch.id, candidateCount: r.triggerBatch.candidates.length, ready: clone(r.triggerBatch.ready), expiresAt: r.triggerBatch.expiresAt } : null, replacementActive: !!r.replacementTx },
      combatAuthority: { protocol: PROTOCOLS.COMBAT, active: r.combatTx ? { id: r.combatTx.id, action: r.combatTx.action, actorRole: r.combatTx.actorRole, expiresAt: r.combatTx.expiresAt } : null, stage: t?.v41Combat?.stage || "idle" },
      turnAuthority: { protocol: PROTOCOLS.TURN, passCount: int(t?.v57?.passCount ?? r.passCount), priority: t.priority, active: t.active, phase: t.phase, turn: t.number, cleanupRequired: int(t?.v57?.cleanupRequired) },
      stateAuthority: { protocol: PROTOCOLS.STATE, sbaPasses: int(v58?.sbaPasses), game: clone(v58?.game), pendingLegend: clone(v58?.pendingLegend), queues: { extraTurns: room.state?.v34?.extraTurns?.length || 0, turnSkips: room.state?.v34?.turnSkips?.length || 0, phaseSkips: room.state?.v34?.phaseSkips?.length || 0, extraCombats: room.state?.v34?.extraCombats?.length || 0 } },
      layerAuthority: { protocol: PROTOCOLS.LAYER, catalogRev: int(v59?.catalogRev), cardCount: Object.keys(v59?.derivedById || {}).length, conflictCount: arr(v59?.conflicts).length, lastRecompute: clone(v59?.lastRecompute || null) },
    };
  }

  /* ---------------- v5.5 triggers / delayed / replacement ---------------- */
  function normalizeEvent(e, room, client) {
    e = e && typeof e === "object" ? clone(e) : {};
    return { eventId: text(e.eventId || uid("event")), kind: text(e.kind || "custom", 40), timing: text(e.timing, 40), keyword: text(e.keyword, 80), turn: int(e.turn ?? room.state.turn.number), phase: int(e.phase ?? room.state.turn.phase, 0, PHASE_COUNT - 1), activeRole: isSeat(e.activeRole) ? e.activeRole : room.state.turn.active, actorRole: isSeat(e.actorRole) ? e.actorRole : client.role, cardId: text(e.cardId, 160), playerRole: isSeat(e.playerRole) ? e.playerRole : "", fromZone: text(e.fromZone, 40), toZone: text(e.toZone, 40), amount: int(e.amount, 0, 100000), combat: !!e.combat };
  }
  function timingMatches(trigger, event) {
    const t = String(trigger.timing || "other").toLowerCase(), k = String(event.kind || "").toLowerCase(), et = String(event.timing || event.keyword || "").toLowerCase();
    if (t === "other" || t === "custom") return !!trigger.keyword && String(trigger.keyword).toLowerCase() === String(event.keyword).toLowerCase();
    const aliases = { dies: ["dies", "death", "zonemove"], enterbattlefield: ["enterbattlefield", "zonemove"], cast: ["cast", "spellcast"], attack: ["attack"], block: ["block"], combatdamage: ["combatdamage"], draw: ["draw"], life: ["life", "lifegain", "lifechanged"] };
    if (aliases[t]?.includes(k)) {
      if (t === "dies") return event.toZone === "graveyard";
      if (t === "enterbattlefield") return BATTLEFIELD_ZONES.includes(event.toZone) || event.toZone === "battlefield";
      return true;
    }
    return t === et || t === k;
  }
  function interveningIfOk(cond, room, source, event) {
    if (!cond || typeof cond !== "object") return true;
    if (Array.isArray(cond.all)) return cond.all.every(x => interveningIfOk(x, room, source, event));
    if (Array.isArray(cond.any)) return cond.any.some(x => interveningIfOk(x, room, source, event));
    if (cond.not) return !interveningIfOk(cond.not, room, source, event);
    const role = cond.player === "opponent" ? other(controllerOf(source, event.actorRole)) : (isSeat(cond.player) ? cond.player : controllerOf(source, event.actorRole));
    const p = publicPlayer(room, role);
    if (cond.kind === "lifeAtMost") return p.life <= Number(cond.value);
    if (cond.kind === "lifeAtLeast") return p.life >= Number(cond.value);
    if (cond.kind === "sourceTapped") return !!source?.tapped === (cond.value !== false);
    if (cond.kind === "eventAmountAtLeast") return event.amount >= Number(cond.value);
    if (cond.kind === "permanentCountAtLeast") return battlefieldCards(room).filter(x => controllerOf(x.card, x.role) === role && (!cond.type || cardTypes(x.card).includes(cond.type))).length >= Number(cond.value);
    return false;
  }
  function triggerCandidates(room, event) {
    const out = [];
    for (const x of allPublicCards(room, false)) {
      if (x.card.faceDown || x.card.v48Redacted) continue;
      for (const raw of arr(x.card.v55Triggers).slice(0, 50)) {
        if (!timingMatches(raw, event)) continue;
        if (!interveningIfOk(raw.interveningIf, room, x.card, event)) continue;
        const role = controllerOf(x.card, x.role);
        out.push({ id: uid("trigger"), abilityId: text(raw.id || uid("ability")), abilityName: text(raw.name || "誘発型能力", 120), sourceCardId: String(x.card.id), sourceCardName: cardName(x.card), controllerRole: role, optional: !!raw.optional, targetRequired: !!(raw.targetRequired || raw.targetProfile?.required), minTargets: int(raw.targetProfile?.minTargets ?? (raw.targetRequired ? 1 : 0), 0, 20), maxTargets: int(raw.targetProfile?.maxTargets ?? 1, 1, 20), targetProfile: clone(raw.targetProfile || {}), autoEffects: clone(raw.autoEffects || []), resolveChecklist: clone(raw.resolveChecklist || []), resolveNote: text(raw.resolveNote), interveningIf: clone(raw.interveningIf || null), delayed: false });
      }
    }
    const r = ensureRoom(room), keep = [];
    for (const d of r.delayedTriggers) {
      const due = int(event.turn) >= int(d.earliestTurn) && (String(d.event) === String(event.timing) || String(d.event) === String(event.kind));
      if (due) out.push({ ...clone(d.candidate), id: uid("trigger"), delayed: true, delayedId: d.id });
      if (!(due && d.oneShot)) keep.push(d);
    }
    r.delayedTriggers = keep;
    return out.slice(0, MAX_TRIGGER_CANDIDATES);
  }
  function publicBatch(batch) { return { id: batch.id, event: clone(batch.event), candidates: clone(batch.candidates), activeRole: batch.activeRole, ready: clone(batch.ready), orders: clone(batch.orders), createdAt: batch.createdAt, expiresAt: batch.expiresAt }; }
  function startExternalTriggerEvent(room, rawEvent, client, actionNonce = "") {
    ensureStateContainers(room); ensureRoom(room);
    if (anyActive(room)) return { ok: false, reason: activeKind(room) };
    const event = normalizeEvent(rawEvent, room, client), candidates = triggerCandidates(room, event);
    if (!candidates.length) { D.send(client, { type: "triggerBatchEmpty", protocol: PROTOCOLS.TRIGGER, actionNonce: text(actionNonce), event, authoritySummary: authoritySummary(room), authority: D.authority() }); return { ok: true, empty: true, event }; }
    const byRole = { A: candidates.filter(x => x.controllerRole === "A"), B: candidates.filter(x => x.controllerRole === "B") };
    const batch = { id: uid("triggerbatch"), kind: "trigger", clientId: clientId(client), event, candidates, activeRole: event.activeRole, ready: { A: byRole.A.length === 0, B: byRole.B.length === 0 }, orders: { A: [], B: [] }, createdAt: now(), expiresAt: now() + TX_TTL_MS, baseRev: room.rev };
    room.v55v59.triggerBatch = batch;
    const payload = { type: "triggerBatchStarted", protocol: PROTOCOLS.TRIGGER, txId: batch.id, actionNonce: text(actionNonce), batch: publicBatch(batch), authoritySummary: authoritySummary(room), authority: D.authority() };
    D.broadcast(room, payload); record(room, "triggerStart", { batchId: batch.id, count: candidates.length, event: event.kind });
    return { ok: true, batch: publicBatch(batch) };
  }
  function handleTriggerStart(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.TRIGGER);
      const out = startExternalTriggerEvent(room, msg.event, client, msg.actionNonce);
      if (!out.ok) throw new Error(out.reason || "triggerStartFailed");
    } catch (e) { reject(client, room, "triggerBatchRejected", msg, e.message || e); }
  }
  function handleTriggerOrder(client, room, msg) {
    const batch = ensureRoom(room).triggerBatch;
    try {
      verify(client, room, msg, PROTOCOLS.TRIGGER); if (!batch || String(msg.txId) !== batch.id) throw new Error("transactionNotFound"); if (batch.baseRev !== room.rev) throw new Error("staleRev");
      const own = batch.candidates.filter(x => x.controllerRole === client.role), map = new Map(own.map(x => [x.id, x])); const items = arr(msg.items).map(clone); const seen = new Set();
      for (const item of items) {
        const c = map.get(String(item.triggerId || "")); if (!c) throw new Error("triggerNotOwned"); if (seen.has(c.id)) throw new Error("duplicateTrigger"); seen.add(c.id);
        const targets = item.targets && typeof item.targets === "object" ? item.targets : {}; const n = uniqueStrings(targets.cardIds).length + uniqueStrings(targets.playerIds).length + uniqueStrings(targets.zoneRefs).length;
        if (c.targetRequired && (n < c.minTargets || n > c.maxTargets)) throw new Error("targetCountInvalid");
      }
      for (const c of own) if (!c.optional && !seen.has(c.id)) throw new Error("mandatoryTriggerMissing");
      batch.orders[client.role] = items.map(x => ({ triggerId: String(x.triggerId), targets: clone(x.targets || { cardIds: [], playerIds: [], zoneRefs: [] }), v54: clone(x.v54 || {}) })); batch.ready[client.role] = true;
      const payload = { type: "triggerBatchOrderAccepted", protocol: PROTOCOLS.TRIGGER, txId: batch.id, role: client.role, ready: clone(batch.ready), batch: publicBatch(batch), authoritySummary: authoritySummary(room), authority: D.authority() };
      D.broadcast(room, payload); record(room, "triggerOrder", { batchId: batch.id, role: client.role, count: items.length });
    } catch (e) { reject(client, room, "triggerBatchRejected", msg, e.message || e); }
  }
  function handleTriggerCommit(client, room, msg) {
    const r = ensureRoom(room), batch = r.triggerBatch;
    try {
      verify(client, room, msg, PROTOCOLS.TRIGGER); if (!batch || String(msg.txId) !== batch.id) throw new Error("transactionNotFound"); if (batch.baseRev !== room.rev) throw new Error("staleRev"); if (!batch.ready.A || !batch.ready.B) throw new Error("triggerOrdersIncomplete");
      const backup = snapshotMutable(room);
      try {
        const sequence = [batch.activeRole, other(batch.activeRole)], placed = [];
        for (const role of sequence) for (const item of batch.orders[role]) {
          const c = batch.candidates.find(x => x.id === item.triggerId); if (!c) throw new Error("triggerCandidateMissing");
          const source = findPublicCard(room, c.sourceCardId)?.card || null; if (c.interveningIf && !interveningIfOk(c.interveningIf, room, source, batch.event)) continue;
          const stackObject = { id: uid("stack-trigger"), name: c.abilityName, type: "Ability", types: ["Ability"], owner: role, controller: role, sourceCardId: c.sourceCardId, sourceName: c.sourceCardName, targetIds: uniqueStrings(item.targets?.cardIds), targetPlayerIds: uniqueStrings(item.targets?.playerIds, 2), targetZoneRefs: uniqueStrings(item.targets?.zoneRefs), autoEffects: clone(c.autoEffects), resolveChecklist: clone(c.resolveChecklist), resolveNote: c.resolveNote, v55Trigger: { event: clone(batch.event), delayed: c.delayed, abilityId: c.abilityId, interveningIf: clone(c.interveningIf) } };
          room.state.stack.push(stackObject); placed.push(stackObject.id);
        }
        room.state.v55.lastBatch = { id: batch.id, event: clone(batch.event), placed, at: new Date().toISOString() };
        r.triggerBatch = null; finalize(room); const summary = { kind: "triggersStacked", count: placed.length, stackObjectIds: placed, activeRole: batch.activeRole };
        sendCommit(room, client, "triggerBatchCommitted", "triggerPublicSync", summary, { protocol: PROTOCOLS.TRIGGER, txId: batch.id }); record(room, "triggerCommit", { batchId: batch.id, count: placed.length });
      } catch (e) { restoreMutable(room, backup, ensureRoom); throw e; }
    } catch (e) { reject(client, room, "triggerBatchRejected", msg, e.message || e); }
  }
  function handleDelayedRegister(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.TRIGGER); if (anyActive(room)) throw new Error(activeKind(room));
      const ability = msg.ability && typeof msg.ability === "object" ? clone(msg.ability) : {}; const d = { id: uid("delayed"), event: text(msg.event || "endstep", 40), earliestTurn: int(msg.earliestTurn ?? room.state.turn.number), oneShot: msg.oneShot !== false, sourceCardId: text(msg.sourceCardId), sourceName: text(msg.sourceName || ability.name || "遅延誘発"), ownerRole: client.role, candidate: { abilityId: text(ability.id || uid("delayed-ability")), abilityName: text(ability.name || msg.sourceName || "遅延誘発", 120), sourceCardId: text(msg.sourceCardId), sourceCardName: text(msg.sourceName || ability.name || "遅延誘発", 120), controllerRole: client.role, optional: !!ability.optional, targetRequired: !!(ability.targetRequired || ability.targetProfile?.required), minTargets: int(ability.targetProfile?.minTargets ?? (ability.targetRequired ? 1 : 0), 0, 20), maxTargets: int(ability.targetProfile?.maxTargets ?? 1, 1, 20), targetProfile: clone(ability.targetProfile || {}), autoEffects: clone(ability.autoEffects || []), resolveChecklist: clone(ability.resolveChecklist || []), resolveNote: text(ability.resolveNote), interveningIf: clone(ability.interveningIf || null) } };
      room.v55v59.delayedTriggers.push(d); room.state.v55.delayedTriggers = room.v55v59.delayedTriggers.map(x => ({ id: x.id, event: x.event, earliestTurn: x.earliestTurn, oneShot: x.oneShot, sourceName: x.sourceName, ownerRole: x.ownerRole })); finalize(room);
      D.send(client, common(room, client, { type: "delayedTriggerRegistered", protocol: PROTOCOLS.TRIGGER, actionNonce: text(msg.actionNonce), delayedTrigger: { id: d.id, event: d.event, earliestTurn: d.earliestTurn, oneShot: d.oneShot, abilityName: d.candidate.abilityName } }));
      D.broadcast(room, { type: "triggerPublicSync", protocol: PROTOCOLS.TRIGGER, rev: room.rev, state: clone(room.state), summary: { kind: "delayedRegistered", id: d.id }, authoritySummary: authoritySummary(room), authority: D.authority() }, clientId(client));
    } catch (e) { reject(client, room, "delayedTriggerRejected", msg, e.message || e); }
  }
  function replacementBaseKey(c, i = 0) {
    const id = text(c?.id || `replacement-${i}`, 120), source = text(c?.sourceCardId || c?.sourceId || "global", 160);
    return `${source}::${id}`;
  }
  function replacementKindMatches(c, event) {
    const kind = text(c?.kind || event.kind, 40);
    if (event.kind === "damage") return ["damage", "prevent"].includes(kind);
    if (event.kind === "zoneMove") return ["zoneMove", "move"].includes(kind);
    return false;
  }
  function replacementZoneFilter(c, event) {
    if (event.kind !== "zoneMove") return true;
    const from = text(c?.fromZone || c?.appliesFromZone || c?.sourceZone || "", 40);
    const to = text(c?.toZone || c?.appliesToZone || c?.destination || c?.originalToZone || "", 40);
    if (from && from !== "any" && from !== event.fromZone) return false;
    if (to && to !== "any" && to !== event.toZone) return false;
    if (c?.replaceZone && text(c.replaceZone, 40) === event.toZone) return false;
    return true;
  }
  function replacementTargetFilter(c, event) {
    if (c?.affectedRole && c.affectedRole !== event.affectedRole) return false;
    if (c?.targetId && String(c.targetId) !== String(event.targetId || event.cardId || "")) return false;
    if (c?.cardId && String(c.cardId) !== String(event.cardId || event.targetId || "")) return false;
    if (c?.sourceId && event.sourceId && String(c.sourceId) !== String(event.sourceId)) return false;
    if (c?.combatOnly && !event.combat) return false;
    return true;
  }
  function normalizeReplacementCandidate(raw, event, i) {
    const c = clone(raw || {});
    c.id = text(c.id || `replacement-${i}`, 120);
    c.label = text(c.label || c.name || "置換効果", 120);
    c.kind = text(c.kind || event.kind, 40);
    c.sourceCardId = text(c.sourceCardId || c.sourceId || "", 160);
    c.optional = c.optional === true || c.may === true || c.mandatory === false;
    c.mandatory = !c.optional;
    c.v7930Key = replacementBaseKey(c, i);
    return c;
  }
  function collectReplacementCandidates(room, event, usedKeys = []) {
    const out = [];
    for (const raw of arr(event.candidates)) out.push(clone(raw));
    for (const raw of arr(room.state?.v55?.replacementProfiles)) out.push(clone(raw));
    for (const x of battlefieldCards(room)) for (const raw of arr(x.card.v55Replacements)) out.push({ ...clone(raw), sourceCardId: x.card.id, sourceName: cardName(x.card) });
    const used = new Set(arr(usedKeys).map(String)), seen = new Map(), rows = [];
    for (let i = 0; i < out.length; i++) {
      const c = normalizeReplacementCandidate(out[i], event, i);
      if (c.enabled === false || used.has(c.v7930Key)) continue;
      if (!replacementKindMatches(c, event) || !replacementZoneFilter(c, event) || !replacementTargetFilter(c, event)) continue;
      if (event.kind === "damage" && int(event.amount) <= 0) continue;
      const n = seen.get(c.id) || 0; seen.set(c.id, n + 1);
      if (n) c.id = text(`${c.id}@${c.sourceCardId || n + 1}`, 120);
      rows.push(c);
      if (rows.length >= 100) break;
    }
    return rows;
  }
  function canUseOriginalEvent(candidates) { return !arr(candidates).some(c => c.mandatory !== false); }
  function normalizeReplacementEvent(raw, client) {
    raw = raw && typeof raw === "object" ? clone(raw) : {}; const kind = raw.kind === "damage" ? "damage" : "zoneMove";
    return { id: uid("replacement-event"), kind, affectedRole: isSeat(raw.affectedRole) ? raw.affectedRole : client.role, targetId: text(raw.targetId || raw.cardId), cardId: text(raw.cardId || raw.targetId), sourceId: text(raw.sourceId), fromZone: text(raw.fromZone || "creatures", 40), toZone: text(raw.toZone || "graveyard", 40), amount: int(raw.amount, 0, 100000), combat: !!raw.combat, candidates: clone(raw.candidates || []) };
  }
  function replacementPublicTx(room, tx, type, actionNonce = "", selectedId = "") {
    return {
      type, protocol: PROTOCOLS.TRIGGER, txId: tx.id, actionNonce: text(actionNonce),
      event: clone(tx.currentEvent), originalEvent: clone(tx.event), candidates: clone(tx.candidates),
      canUseOriginal: canUseOriginalEvent(tx.candidates), iteration: int(tx.iteration),
      selectedId: text(selectedId), appliedTrace: clone(tx.trace),
      authoritySummary: authoritySummary(room), authority: D.authority()
    };
  }
  function transformReplacementEvent(event, selected) {
    const next = clone(event);
    if (next.kind === "damage") {
      const before = int(next.amount);
      if (selected.preventAll) next.amount = 0;
      else if (selected.setAmount != null) next.amount = int(selected.setAmount, 0, 100000);
      else if (selected.replaceAmount != null) next.amount = int(selected.replaceAmount, 0, 100000);
      else if (selected.multiplier != null || selected.amountMultiplier != null) next.amount = int(before * Number(selected.multiplier ?? selected.amountMultiplier), 0, 100000);
      else next.amount = Math.max(0, before - int(selected.amount));
    } else if (selected.replaceZone) next.toZone = text(selected.replaceZone, 40);
    return next;
  }
  function handleReplacementStart(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.TRIGGER); if (anyActive(room)) throw new Error(activeKind(room)); const event = normalizeReplacementEvent(msg.event, client); if (event.affectedRole !== client.role) throw new Error("affectedPlayerMustChoose");
      const candidates = collectReplacementCandidates(room, event, []); const tx = { id: uid("replacementtx"), clientId: clientId(client), actorRole: client.role, event, currentEvent: clone(event), candidates, usedKeys: [], trace: [], iteration: 0, baseRev: room.rev, expiresAt: now() + TX_TTL_MS };
      room.v55v59.replacementTx = tx; D.send(client, replacementPublicTx(room, tx, "replacementTxStarted", msg.actionNonce));
    } catch (e) { reject(client, room, "replacementTxRejected", msg, e.message || e); }
  }
  function applyReplacementEvent(room, event) {
    if (event.kind === "damage") {
      if (isSeat(event.targetId)) publicPlayer(room, event.targetId).life -= int(event.amount);
      else { const f = findPublicCard(room, event.targetId); if (!f) throw new Error("replacementTargetMissing"); f.card.damage = int(f.card.damage) + int(event.amount); }
    } else {
      const f = findPublicCard(room, event.cardId); if (!f) throw new Error("replacementCardMissing"); movePublicCard(room, f, event.toZone);
    }
  }
  function handleReplacementCommit(client, room, msg) {
    const r = ensureRoom(room), tx = r.replacementTx;
    try {
      verify(client, room, msg, PROTOCOLS.TRIGGER); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (tx.clientId !== clientId(client)) throw new Error("transactionOwnerMismatch"); if (tx.baseRev !== room.rev) throw new Error("staleRev");
      const backup = snapshotMutable(room);
      try {
        const id = String(msg.candidateId || "original");
        if (id === "original") {
          if (!canUseOriginalEvent(tx.candidates)) throw new Error("replacementMandatoryChoiceRequired");
        } else {
          const selected = tx.candidates.find(x => x.id === id); if (!selected) throw new Error("replacementCandidateMissing");
          const before = clone(tx.currentEvent), after = transformReplacementEvent(before, selected);
          tx.usedKeys.push(selected.v7930Key); tx.iteration = int(tx.iteration) + 1;
          if (tx.iteration > MAX_REPLACEMENT_CHAIN) throw new Error("replacementChainTooLong");
          tx.trace.push({ iteration: tx.iteration, selectedId: selected.id, candidateKey: selected.v7930Key, label: selected.label, sourceCardId: selected.sourceCardId || "", before, after: clone(after) });
          tx.currentEvent = after; tx.candidates = collectReplacementCandidates(room, after, tx.usedKeys); tx.expiresAt = now() + TX_TTL_MS;
          if (tx.candidates.length) {
            D.send(client, replacementPublicTx(room, tx, "replacementTxContinued", msg.actionNonce, selected.id));
            record(room, "replacementContinue", { txId: tx.id, iteration: tx.iteration, selectedId: selected.id, remaining: tx.candidates.length, event: clone(after) });
            return;
          }
        }
        const event = clone(tx.currentEvent); applyReplacementEvent(room, event);
        room.state.v55.lastReplacement = { txId: tx.id, selectedId: id, selectedIds: tx.trace.map(x => x.selectedId), original: clone(tx.event), result: clone(event), trace: clone(tx.trace), iterations: tx.iteration, at: new Date().toISOString() };
        r.replacementTx = null; finalize(room); const result = { selectedId: id, selectedIds: tx.trace.map(x => x.selectedId), event, originalEvent: tx.event, trace: clone(tx.trace), iterations: tx.iteration, applied: true };
        sendCommit(room, client, "replacementTxCommitted", "replacementPublicSync", { kind: "replacementApplied", event, iterations: tx.iteration }, { protocol: PROTOCOLS.TRIGGER, txId: tx.id, result });
        record(room, "replacementCommit", { txId: tx.id, iterations: tx.iteration, selectedIds: result.selectedIds, event });
      } catch (e) { restoreMutable(room, backup, ensureRoom); throw e; }
    } catch (e) { reject(client, room, "replacementTxRejected", msg, e.message || e); }
  }
  function handleReplacementCancel(client, room, msg) {
    const r = ensureRoom(room), tx = r.replacementTx;
    if (!tx || String(msg.txId) !== tx.id) return reject(client, room, "replacementTxRejected", msg, "transactionNotFound");
    if (tx.clientId !== clientId(client)) return reject(client, room, "replacementTxRejected", msg, "transactionOwnerMismatch");
    r.replacementTx = null; D.send(client, { type: "replacementTxCancelled", protocol: PROTOCOLS.TRIGGER, txId: tx.id, reason: text(msg.reason), authoritySummary: authoritySummary(room), authority: D.authority() });
  }

  /* ---------------- v5.6 combat ---------------- */
  function combatSnapshot(room) { return sha256({ turn: room.state.turn, players: room.state.players, stack: room.state.stack }); }
  function canAttack(room, card, role) {
    if (!cardTypes(card).includes("Creature")) return "notCreature"; if (controllerOf(card, role) !== role) return "notController"; if (card.tapped) return "tapped";
    const kw = keywords(card); if ((card.summoningSick || card.enteredThisTurn) && !kw.has("haste") && !kw.has("速攻")) return "summoningSick"; if (card.cantAttack) return "cantAttack"; return "";
  }
  function canBlock(blocker, attacker) {
    if (!cardTypes(blocker).includes("Creature")) return "notCreature"; if (blocker.tapped) return "tapped"; if (blocker.cantBlock) return "cantBlock";
    const ak = keywords(attacker), bk = keywords(blocker);
    if ((ak.has("flying") || ak.has("飛行")) && !(bk.has("flying") || bk.has("飛行") || bk.has("reach") || bk.has("到達"))) return "flying";
    if ((ak.has("shadow") || ak.has("シャドー")) !== (bk.has("shadow") || bk.has("シャドー"))) return "shadow";
    if (ak.has("unblockable") || ak.has("ブロックされない")) return "unblockable";
    return "";
  }
  function combatPreview(room, action, msg, actorRole) {
    const active = room.state.turn.active, defending = other(active), preview = {};
    if (action === "attack") {
      if (actorRole !== active) throw new Error("onlyActivePlayerDeclaresAttackers"); const seen = new Set(); preview.attackers = [];
      for (const row of arr(msg.attackers)) { const id = String(row.cardId || ""); if (!id || seen.has(id)) throw new Error("duplicateAttacker"); seen.add(id); const f = findPublicCard(room, id); if (!f) throw new Error("attackerMissing"); const why = canAttack(room, f.card, active); if (why) throw new Error(`illegalAttacker:${why}`); const defenderId = text(row.defenderId || `player:${defending}`, 160); preview.attackers.push({ id, name: cardName(f.card), defenderId }); }
    } else if (action === "block") {
      if (actorRole !== defending) throw new Error("onlyDefendingPlayerDeclaresBlockers"); const attackers = battlefieldCards(room).filter(x => x.card.attacking); if (!attackers.length) throw new Error("noAttackers"); const attackerIds = new Set(attackers.map(x => String(x.card.id))); const used = new Set(); preview.blocks = [];
      for (const row of arr(msg.blocks)) { const blockerId = String(row.blockerId || ""), targets = uniqueStrings(row.attackerIds, 10); if (!blockerId) continue; if (used.has(blockerId)) throw new Error("duplicateBlocker"); used.add(blockerId); const bf = findPublicCard(room, blockerId); if (!bf || controllerOf(bf.card, bf.role) !== defending) throw new Error("blockerMissing"); for (const aid of targets) { if (!attackerIds.has(aid)) throw new Error("attackerMissing"); const af = findPublicCard(room, aid); const why = canBlock(bf.card, af.card); if (why) throw new Error(`illegalBlock:${why}`); } preview.blocks.push({ blockerId, attackerIds: targets }); }
      const counts = new Map(); for (const b of preview.blocks) for (const a of b.attackerIds) counts.set(a, (counts.get(a) || 0) + 1);
      for (const a of attackers) { const kw = keywords(a.card); if ((kw.has("menace") || kw.has("威迫")) && (counts.get(String(a.card.id)) || 0) === 1) throw new Error("menaceRequiresTwoBlockers"); }
    } else if (action === "order") {
      const af = findPublicCard(room, msg.attackerId); if (!af || !af.card.attacking) throw new Error("attackerMissing"); const blockers = battlefieldCards(room).filter(x => arr(x.card.blockingTargetIds).includes(String(af.card.id)) || String(x.card.blockingTargetId || "") === String(af.card.id)).map(x => String(x.card.id)); const order = uniqueStrings(msg.order, 20); if (order.length !== blockers.length || order.some(x => !blockers.includes(x))) throw new Error("blockOrderMismatch"); preview.attackerId = String(af.card.id); preview.attackerName = cardName(af.card); preview.order = order.map(id => ({ id, name: cardName(findPublicCard(room, id)?.card) }));
    } else if (action === "damage") {
      const step = msg.step === "first" ? "first" : "normal", rows = []; let totalDamage = 0, contributionCount = 0;
      for (const af of battlefieldCards(room).filter(x => x.card.attacking)) {
        const ak = keywords(af.card), participates = step === "first" ? (ak.has("first strike") || ak.has("先制攻撃") || ak.has("double strike") || ak.has("二段攻撃")) : (!(ak.has("first strike") || ak.has("先制攻撃")) || ak.has("double strike") || ak.has("二段攻撃")); if (!participates) continue;
        const blockers = battlefieldCards(room).filter(x => arr(x.card.blockingTargetIds).includes(String(af.card.id)) || String(x.card.blockingTargetId || "") === String(af.card.id)); const power = Math.max(0, effectivePower(af.card)); let remain = power, playerDamage = 0; const assignments = [];
        if (!blockers.length) playerDamage = power; else {
          const order = arr(af.card.v33BlockOrder).filter(id => blockers.some(x => String(x.card.id) === String(id))); for (const b of blockers) if (!order.includes(String(b.card.id))) order.push(String(b.card.id));
          const trample = ak.has("trample") || ak.has("トランプル");
          for (const id of order) { const b = blockers.find(x => String(x.card.id) === id); const lethal = Math.max(0, effectiveToughness(b.card) - int(b.card.damage)); const amount = Math.min(remain, trample ? lethal : remain); assignments.push({ targetId: id, amount }); remain -= amount; if (!trample) remain = 0; if (remain <= 0) break; }
          if (trample) playerDamage = remain;
        }
        const defender = String(af.card.attackDefenderId || `player:${other(room.state.turn.active)}`); rows.push({ attackerId: String(af.card.id), attackerName: cardName(af.card), power, blockers: blockers.map(x => String(x.card.id)), assignments, defenderId: defender, playerDamage }); totalDamage += power; contributionCount += 1 + blockers.length;
      }
      preview.step = step; preview.rows = rows; preview.totalDamage = totalDamage; preview.contributionCount = contributionCount;
    } else if (action === "end") preview.stage = "end"; else throw new Error("combatActionInvalid");
    return preview;
  }
  function handleCombatStart(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.COMBAT); if (anyActive(room)) throw new Error(activeKind(room)); const action = text(msg.action, 20), preview = combatPreview(room, action, msg, client.role);
      const tx = { id: uid("combattx"), clientId: clientId(client), actorRole: client.role, action, proposal: clone(msg), preview, snapshotHash: combatSnapshot(room), baseRev: room.rev, expiresAt: now() + TX_TTL_MS }; room.v55v59.combatTx = tx;
      D.send(client, { type: "combatTxStarted", protocol: PROTOCOLS.COMBAT, txId: tx.id, action, baseRev: tx.baseRev, preview: clone(preview), authoritySummary: authoritySummary(room), authority: D.authority() });
    } catch (e) { reject(client, room, "combatTxRejected", msg, e.message || e); }
  }
  function applyCombat(room, tx) {
    const action = tx.action, p = tx.preview, summary = { action };
    room.state.turn.v41Combat = room.state.turn.v41Combat && typeof room.state.turn.v41Combat === "object" ? room.state.turn.v41Combat : {};
    if (action === "attack") {
      for (const x of battlefieldCards(room)) { x.card.attacking = false; x.card.attackDefenderId = null; }
      for (const row of p.attackers) { const f = findPublicCard(room, row.id); f.card.attacking = true; f.card.attackDefenderId = row.defenderId; const kw = keywords(f.card); if (!(kw.has("vigilance") || kw.has("警戒"))) f.card.tapped = true; }
      room.state.turn.v41Combat.stage = "attackersDeclared"; summary.attackers = p.attackers.map(x => x.id);
    } else if (action === "block") {
      for (const x of battlefieldCards(room)) { x.card.blocking = false; x.card.blockingTargetId = null; x.card.blockingTargetIds = []; }
      for (const row of p.blocks) { const f = findPublicCard(room, row.blockerId); f.card.blocking = row.attackerIds.length > 0; f.card.blockingTargetIds = row.attackerIds.slice(); f.card.blockingTargetId = row.attackerIds[0] || null; }
      room.state.turn.v41Combat.stage = "blockersDeclared"; summary.blocks = clone(p.blocks);
    } else if (action === "order") {
      const f = findPublicCard(room, p.attackerId); f.card.v33BlockOrder = p.order.map(x => x.id); summary.attackerId = p.attackerId; summary.order = f.card.v33BlockOrder.slice();
    } else if (action === "damage") {
      const applied = [];
      for (const row of p.rows) {
        for (const a of row.assignments) { const f = findPublicCard(room, a.targetId); if (f && a.amount > 0) { f.card.damage = int(f.card.damage) + a.amount; applied.push({ sourceId: row.attackerId, targetId: a.targetId, amount: a.amount }); } }
        if (row.playerDamage > 0) { const role = String(row.defenderId).startsWith("player:") ? String(row.defenderId).slice(7) : other(room.state.turn.active); if (isSeat(role)) { publicPlayer(room, role).life -= row.playerDamage; applied.push({ sourceId: row.attackerId, targetPlayer: role, amount: row.playerDamage }); } }
        for (const bid of row.blockers) { const bf = findPublicCard(room, bid); const af = findPublicCard(room, row.attackerId); if (!bf || !af) continue; const bk = keywords(bf.card), participate = p.step === "first" ? (bk.has("first strike") || bk.has("先制攻撃") || bk.has("double strike") || bk.has("二段攻撃")) : (!(bk.has("first strike") || bk.has("先制攻撃")) || bk.has("double strike") || bk.has("二段攻撃")); if (participate) { const amount = Math.max(0, effectivePower(bf.card)); af.card.damage = int(af.card.damage) + amount; applied.push({ sourceId: bid, targetId: row.attackerId, amount }); } }
      }
      room.state.turn.v41Combat.stage = p.step === "first" ? "firstDamageDone" : "damageDone"; summary.step = p.step; summary.applied = applied;
    } else if (action === "end") {
      for (const x of battlefieldCards(room)) { x.card.attacking = false; x.card.blocking = false; x.card.attackDefenderId = null; x.card.blockingTargetId = null; x.card.blockingTargetIds = []; x.card.v33BlockOrder = []; delete x.card.untilEndOfCombatPower; delete x.card.untilEndOfCombatToughness; delete x.card.untilEndOfCombatCombatKeywords; delete x.card.untilEndOfCombatTypes; }
      room.state.turn.v41Combat = { stage: "idle" }; summary.kind = "combatEnded";
    }
    return summary;
  }
  function handleCombatCommit(client, room, msg) {
    const r = ensureRoom(room), tx = r.combatTx;
    try {
      verify(client, room, msg, PROTOCOLS.COMBAT); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (tx.clientId !== clientId(client)) throw new Error("transactionOwnerMismatch"); if (combatSnapshot(room) !== tx.snapshotHash) throw new Error("combatSnapshotChanged");
      const backup = snapshotMutable(room); try { const summary = applyCombat(room, tx); r.combatTx = null; finalize(room); sendCommit(room, client, "combatTxCommitted", "combatPublicSync", summary, { protocol: PROTOCOLS.COMBAT, txId: tx.id, action: tx.action }); record(room, "combatCommit", summary); } catch (e) { restoreMutable(room, backup, ensureRoom); throw e; }
    } catch (e) { reject(client, room, "combatTxRejected", msg, e.message || e); }
  }
  function handleCombatCancel(client, room, msg) { const r = ensureRoom(room), tx = r.combatTx; if (!tx || String(msg.txId) !== tx.id) return reject(client, room, "combatTxRejected", msg, "transactionNotFound"); if (tx.clientId !== clientId(client)) return reject(client, room, "combatTxRejected", msg, "transactionOwnerMismatch"); r.combatTx = null; D.send(client, { type: "combatTxCancelled", protocol: PROTOCOLS.COMBAT, txId: tx.id, action: tx.action, reason: text(msg.reason), authoritySummary: authoritySummary(room), authority: D.authority() }); }

  /* ---------------- v5.7 priority / turn ---------------- */
  function clearEot(room) {
    for (const x of battlefieldCards(room)) { for (const k of ["untilEndOfTurnPower", "untilEndOfTurnToughness", "untilEndOfTurnCombatKeywords", "untilEndOfTurnTypes"]) delete x.card[k]; x.card.damage = 0; }
  }
  function beginPhase(room, phase) {
    const t = room.state.turn, active = t.active, p = publicPlayer(room, active); t.phase = phase; t.priority = active; t.v57.passCount = 0; ensureRoom(room).passCount = 0;
    if (phase === 0) { for (const z of BATTLEFIELD_ZONES) for (const c of p[z]) c.tapped = false; }
    if (phase === 2 && !(t.number === 1 && active === "A")) {
      try { const z = privateZones(room, active, D); if (!z.library.length) room.state.v58.drawFailures[active] = { at: new Date().toISOString(), turn: t.number, phase }; else { const c = z.library.shift(); c.zone = "hand"; z.hand.push(c); refreshHiddenZone(room, active, "library", D); refreshHiddenZone(room, active, "hand", D); } } catch (_) { /* no registered private state: leave draw manual */ }
    }
    room.state.v58.lastTurnEvent = { id: uid("turnevent"), kind: "phase", active, phase, turn: t.number, at: new Date().toISOString() };
  }
  function consumeQueue(list, role, predicate = () => true) { const i = list.findIndex(x => x.player === role && predicate(x)); return i >= 0 ? list.splice(i, 1)[0] : null; }
  function advancePhase(room) {
    const t = room.state.turn; let next = t.phase + 1;
    while (next < PHASE_COUNT && consumeQueue(room.state.v34.phaseSkips, t.active, x => Number(x.phaseIndex) === next)) next++;
    if (next < PHASE_COUNT) { beginPhase(room, next); return { kind: "phaseAdvance", from: t.phase - 1, to: next, active: t.active }; }
    clearEot(room);
    let nextActive = other(t.active); const extra = room.state.v34.extraTurns.shift(); if (extra?.player && isSeat(extra.player)) nextActive = extra.player;
    while (consumeQueue(room.state.v34.turnSkips, nextActive)) nextActive = other(nextActive);
    t.number += 1; t.active = nextActive; beginPhase(room, 0); return { kind: "newTurn", active: nextActive, turn: t.number, to: 0 };
  }
  function resolveTopForTurn(room, role) {
    if (typeof D.resolveTopStack === "function") return D.resolveTopStack(room, role);
    const top = room.state.stack.pop(); if (!top) throw new Error("stackEmpty"); const owner = isSeat(top.owner) ? top.owner : role;
    if (!cardTypes(top).includes("Ability") && top.type !== "Ability") publicPlayer(room, owner).graveyard.push({ ...top, zone: "graveyard" });
    return { kind: "stackResolved", stackObjectId: top.id, stackObjectName: cardName(top), destination: top.type === "Ability" ? "cease" : "graveyard", effectHandling: "lifecycleOnly" };
  }
  function handleTurnAction(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.TURN); if (anyActive(room)) throw new Error(activeKind(room)); const action = text(msg.action, 30), t = room.state.turn, backup = snapshotMutable(room);
      try {
        let summary;
        if (action === "pass") {
          if (client.role !== t.priority) throw new Error("notPriorityPlayer"); const r = ensureRoom(room);
          if (int(t.v57.passCount) === 0) { t.v57.passCount = 1; r.passCount = 1; r.lastPassRole = client.role; t.priority = other(client.role); summary = { kind: "priorityPassed", passer: client.role, passCount: 1, priority: t.priority }; }
          else {
            t.v57.passCount = 0; r.passCount = 0; r.lastPassRole = null;
            if (room.state.stack.length) { summary = resolveTopForTurn(room, client.role); t.priority = t.active; }
            else {
              if (t.phase === 11) {
                const need = Math.max(0, privateZones(room, t.active, D).hand.length - int(publicPlayer(room, t.active).handLimit || 7, 0, 100));
                if (need > 0) {
                  t.v57.cleanupRequired = need;
                  t.priority = t.active;
                  summary = { kind: "cleanupDiscardRequired", player: t.active, count: need, priority: t.priority };
                } else summary = advancePhase(room);
              } else summary = advancePhase(room);
            }
          }
        } else if (action === "cleanupDiscard") {
          if (client.role !== t.active || t.phase !== 11) throw new Error("cleanupOnlyActivePlayer"); const need = int(t.v57.cleanupRequired); const ids = uniqueStrings(msg.cardIds, 100); if (!need || ids.length !== need) throw new Error("cleanupDiscardCountInvalid"); const z = privateZones(room, client.role, D); const chosen = ids.map(id => z.hand.find(c => String(c.id) === id)); if (chosen.some(x => !x)) throw new Error("cleanupCardMissing");
          for (const c of chosen) { removeFromList(z.hand, c.id); c.zone = "graveyard"; publicPlayer(room, client.role).graveyard.push(c); } refreshHiddenZone(room, client.role, "hand", D); t.v57.cleanupRequired = 0; summary = advancePhase(room);
        } else if (action === "repair") {
          if (clientId(client) !== String(room.hostId)) throw new Error("hostOnly"); t.number = Math.max(1, int(msg.turnNumber, 1)); t.active = isSeat(msg.active) ? msg.active : t.active; t.phase = int(msg.phase, 0, PHASE_COUNT - 1); t.priority = isSeat(msg.priority) ? msg.priority : t.active; t.v57.passCount = 0; t.v57.cleanupRequired = 0; ensureRoom(room).passCount = 0; summary = { kind: "turnRepaired", active: t.active, phase: t.phase, priority: t.priority, turn: t.number };
        } else throw new Error("turnActionInvalid");
        const privateRoles = uniqueStrings([...(arr(summary?._privateRoles)), ...(action === "cleanupDiscard" || summary?.kind === "newTurn" || (summary?.kind === "phaseAdvance" && summary.to === 2) ? [t.active] : [])], 2);
        if (summary && "_privateRoles" in summary) delete summary._privateRoles;
        finalize(room, privateRoles);
        sendCommit(room, client, "turnActionCommitted", "turnPublicSync", summary, { protocol: PROTOCOLS.TURN, action }); record(room, "turnAction", summary);
      } catch (e) { restoreMutable(room, backup, ensureRoom); throw e; }
    } catch (e) { reject(client, room, "turnActionRejected", msg, e.message || e); }
  }

  /* ---------------- v5.8 state-based actions / game / queues ---------------- */
  function legendGroups(room) {
    const groups = [];
    for (const role of SEATS) {
      const map = new Map(); for (const x of battlefieldCards(room).filter(x => controllerOf(x.card, x.role) === role && (x.card.legendary || cardTypes(x.card).includes("Legendary")))) { const n = cardName(x.card); if (!map.has(n)) map.set(n, []); map.get(n).push(String(x.card.id)); }
      for (const [name, ids] of map) if (ids.length > 1) groups.push({ id: uid("legend"), role, name, cardIds: ids, keepId: null });
    }
    return groups;
  }
  function cancelOpposingCounters(card) {
    const plusKey = Object.keys(card.counters || {}).find(k => k === "+1/+1" || k === "plus1plus1"), minusKey = Object.keys(card.counters || {}).find(k => k === "-1/-1" || k === "minus1minus1");
    if (!plusKey || !minusKey) return 0; const n = Math.min(int(card.counters[plusKey]), int(card.counters[minusKey])); if (n) { card.counters[plusKey] -= n; card.counters[minusKey] -= n; } return n;
  }
  function runSba(room, choices = null) {
    ensureRoom(room); ensureStateContainers(room);
    const events = [], removed = []; let passes = 0, changed = true;
    while (changed && passes < 20) {
      changed = false; passes++;
      for (const x of battlefieldCards(room)) if (cancelOpposingCounters(x.card)) changed = true;
      const groups = legendGroups(room);
      if (groups.length) {
        if (!choices) { room.state.v58.pendingLegend = { id: uid("legend-pending"), groups, at: new Date().toISOString() }; return { kind: "legendChoiceRequired", passes, events, pendingLegend: clone(room.state.v58.pendingLegend) }; }
        for (const g of groups) { const keep = choices[g.id] || choices[g.name]; if (!g.cardIds.includes(keep)) throw new Error("legendChoiceInvalid"); for (const id of g.cardIds) if (id !== keep) { const f = findPublicCard(room, id); if (f) { const c = movePublicCard(room, f, "graveyard"); events.push({ kind: "zoneMove", timing: "legendRule", cardId: c.id, playerRole: g.role }); removed.push(c.id); changed = true; } } }
        room.state.v58.pendingLegend = null;
      }
      for (const x of battlefieldCards(room).slice()) {
        const c = x.card, types = cardTypes(c), kw = keywords(c); let reason = "";
        if (types.includes("Creature")) { const tou = effectiveToughness(c); if (tou <= 0) reason = "toughnessZero"; else if (int(c.damage) >= tou && !(kw.has("indestructible") || kw.has("破壊不能"))) reason = "lethalDamage"; }
        if (types.includes("Planeswalker") && Number(c.loyalty ?? c.counters?.loyalty ?? 0) <= 0) reason = "loyaltyZero";
        if (types.includes("Battle") && Number(c.defense ?? c.counters?.defense ?? c.counters?.defence ?? 0) <= 0) reason = "defenseZero";
        if (reason) { const id = c.id, role = isSeat(c.owner) ? c.owner : x.role; if (c.token) removeFromList(x.list, id); else movePublicCard(room, x, "graveyard", role); events.push({ kind: "zoneMove", timing: reason === "lethalDamage" ? "dies" : reason, cardId: id, playerRole: role }); removed.push(id); changed = true; }
      }
      for (const x of battlefieldCards(room).slice()) {
        const c = x.card, types = cardTypes(c), attached = c.attachedTo || c.enchantTargetId || c.equippedTo || c.fortifiedTo;
        if (!attached) continue; const target = findPublicCard(room, attached);
        if ((types.includes("Aura") || types.includes("Enchantment") && c.isAura) && !target) { movePublicCard(room, x, "graveyard"); events.push({ kind: "zoneMove", timing: "illegalAura", cardId: c.id, playerRole: x.role }); changed = true; }
        else if ((types.includes("Equipment") || c.isEquipment) && (!target || !cardTypes(target.card).includes("Creature"))) { c.attachedTo = null; c.equippedTo = null; changed = true; }
        else if ((types.includes("Fortification") || c.isFortification) && (!target || !cardTypes(target.card).includes("Land"))) { c.attachedTo = null; c.fortifiedTo = null; changed = true; }
      }
      for (const role of SEATS) for (const zone of ["graveyard", "exile", "command"]) { const list = publicPlayer(room, role)[zone]; for (let i = list.length - 1; i >= 0; i--) if (list[i]?.token) { list.splice(i, 1); changed = true; } }
    }
    const game = evaluateGame(room);
    const result = { id: uid("sba"), kind: game.status === "ended" ? "gameEnded" : "sbaComplete", passes, removed, events, game: clone(game), at: new Date().toISOString() };
    room.state.v58.sbaPasses = int(room.state.v58.sbaPasses) + passes; room.state.v58.lastSba = result; return result;
  }
  function evaluateGame(room) {
    const losers = [], reasons = [];
    for (const role of SEATS) { const p = publicPlayer(room, role); if (p.life <= 0) { losers.push(role); reasons.push(`${role}:life`); } if (int(p.poison) >= 10) { if (!losers.includes(role)) losers.push(role); reasons.push(`${role}:poison`); } if (room.state.v58.drawFailures?.[role]) { if (!losers.includes(role)) losers.push(role); reasons.push(`${role}:drawFailure`); } }
    const g = room.state.v58.game;
    if (losers.length) { g.status = "ended"; g.losers = losers; g.reasons = reasons; g.winner = losers.length === 1 ? other(losers[0]) : null; g.result = losers.length === 1 ? "win" : "draw"; g.endedAt = new Date().toISOString(); g.source = "stateBasedActions"; }
    return g;
  }
  function scheduleEntry(room, queue, player, count, phaseIndex, source) {
    if (!isSeat(player)) throw new Error("playerInvalid"); count = int(count || 1, 1, 20); const out = [];
    for (let i = 0; i < count; i++) { const e = { id: uid(queue), player, source: text(source || "v5.8", 120), createdAt: new Date().toISOString() }; if (phaseIndex != null) e.phaseIndex = int(phaseIndex, 0, PHASE_COUNT - 1); room.state.v34[queue].push(e); out.push(e.id); }
    return out;
  }
  function handleStateAction(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.STATE); if (anyActive(room)) throw new Error(activeKind(room)); const action = text(msg.action, 40), backup = snapshotMutable(room);
      try {
        let summary;
        if (action === "runSba") summary = runSba(room);
        else if (action === "legendChoice") { const pending = room.state.v58.pendingLegend; if (!pending) throw new Error("legendChoiceNotPending"); const choices = msg.choices || {}; const mapped = {}; for (const g of pending.groups) { const keep = choices[g.id]; if (!g.cardIds.includes(keep)) throw new Error("legendChoiceInvalid"); mapped[g.id] = keep; mapped[g.name] = keep; } summary = runSba(room, mapped); }
        else if (action === "concede") { const g = room.state.v58.game; g.status = "ended"; g.result = "win"; g.winner = other(client.role); g.losers = [client.role]; g.reasons = [`${client.role}:concede`]; g.endedAt = new Date().toISOString(); g.source = "concede"; summary = { kind: "gameEnded", game: clone(g) }; }
        else if (["scheduleExtraTurn", "scheduleTurnSkip", "schedulePhaseSkip", "scheduleExtraCombat"].includes(action)) { if (clientId(client) !== String(room.hostId)) throw new Error("hostOnly"); const q = { scheduleExtraTurn: "extraTurns", scheduleTurnSkip: "turnSkips", schedulePhaseSkip: "phaseSkips", scheduleExtraCombat: "extraCombats" }[action]; const ids = scheduleEntry(room, q, msg.player, msg.count, action === "schedulePhaseSkip" ? msg.phaseIndex : null, msg.source); summary = { kind: action, ids, player: msg.player, phaseIndex: msg.phaseIndex ?? null }; }
        else if (action === "cancelSchedule") { if (clientId(client) !== String(room.hostId)) throw new Error("hostOnly"); let found = false; for (const q of ["extraTurns", "turnSkips", "phaseSkips", "extraCombats"]) { const i = room.state.v34[q].findIndex(x => x.id === msg.queueId); if (i >= 0) { room.state.v34[q].splice(i, 1); found = true; break; } } if (!found) throw new Error("scheduleNotFound"); summary = { kind: "scheduleCancelled", queueId: msg.queueId }; }
        else if (action === "repairState") { if (clientId(client) !== String(room.hostId)) throw new Error("hostOnly"); publicPlayer(room, "A").life = Number(msg.lifeA); publicPlayer(room, "B").life = Number(msg.lifeB); publicPlayer(room, "A").poison = int(msg.poisonA); publicPlayer(room, "B").poison = int(msg.poisonB); room.state.v58.game = { status: "playing", result: null, winner: null, losers: [], reasons: [], endedAt: null, source: "repair" }; room.state.v58.drawFailures = { A: null, B: null }; summary = runSba(room); summary.kind = "stateRepaired"; }
        else throw new Error("stateActionInvalid");
        finalize(room); sendCommit(room, client, "stateActionCommitted", "statePublicSync", summary, { protocol: PROTOCOLS.STATE, action }); record(room, "stateAction", summary);
      } catch (e) { restoreMutable(room, backup, ensureRoom); throw e; }
    } catch (e) { reject(client, room, "stateActionRejected", msg, e.message || e); }
  }

  /* ---------------- v5.9 continuous layers / copy ---------------- */
  function battlefieldMap(room) { return new Map(battlefieldCards(room).map(x => [String(x.card.id), x])); }
  function characteristicBase(card) { return { name: cardName(card), types: cardTypes(card), colors: uniqueStrings(card.colors, 10), keywords: [...keywords(card)], basePower: Number.isFinite(Number(card.power)) ? Number(card.power) : null, baseToughness: Number.isFinite(Number(card.toughness)) ? Number(card.toughness) : null, power: Number.isFinite(Number(card.power)) ? Number(card.power) : null, toughness: Number.isFinite(Number(card.toughness)) ? Number(card.toughness) : null, subtype: text(card.subtype, 120), supertype: text(card.supertype, 120), legendary: !!card.legendary, copyApplied: false, copySourceCardId: null, applied: [], warnings: [] }; }
  function profileApplies(profile, target, source, role) {
    if (profile.enabled === false) return false; if (profile.targetCardId && String(profile.targetCardId) !== String(target.card.id)) return false;
    const rel = profile.relation || profile.controllerRelation || profile.appliesTo;
    const tc = controllerOf(target.card, target.role), sc = controllerOf(source.card, source.role);
    if (["controller", "you", "your", "selfController"].includes(rel) && tc !== sc) return false; if (["opponent", "opponents"].includes(rel) && tc === sc) return false; if (rel === "self" && String(target.card.id) !== String(source.card.id)) return false;
    const types = uniqueStrings(profile.types || profile.targetTypes, 20); if (types.length && !types.some(t => cardTypes(target.card).includes(t))) return false;
    return true;
  }
  function applyProfile(e, profile, source, target, conflicts) {
    const kind = text(profile.kind, 40); const applied = { kind, sourceCardId: String(source.card.id), sourceName: cardName(source.card), profileId: text(profile.id || uid("profile")), timestamp: int(profile.timestamp) };
    if (kind === "setType") e.types = uniqueStrings(profile.types || profile.value, 30);
    else if (kind === "addType") e.types = uniqueStrings([...e.types, ...uniqueStrings(profile.types || profile.value, 30)], 30);
    else if (kind === "setColor") e.colors = uniqueStrings(profile.colors || profile.value, 10);
    else if (kind === "grantKeyword") e.keywords = uniqueStrings([...e.keywords, profile.keyword || profile.value], 50);
    else if (kind === "removeKeyword") e.keywords = e.keywords.filter(x => x !== String(profile.keyword || profile.value).toLowerCase());
    else if (kind === "setPT") { e.basePower = Number(profile.power ?? profile.p); e.baseToughness = Number(profile.toughness ?? profile.t); e.power = e.basePower; e.toughness = e.baseToughness; }
    else if (kind === "modifyPT") { e.power = Number(e.power || 0) + Number(profile.power ?? profile.p ?? 0); e.toughness = Number(e.toughness || 0) + Number(profile.toughness ?? profile.t ?? 0); }
    else if (kind === "switchPT") { const q = e.power; e.power = e.toughness; e.toughness = q; }
    else if (kind === "copyValues") { /* handled before ordinary layers */ }
    else { conflicts.push({ kind: "unsupportedProfile", cardId: String(target.card.id), profileId: applied.profileId, message: `未対応レイヤー: ${kind}` }); return; }
    e.applied.push(applied);
  }
  function recomputeLayers(room) {
    ensureRoom(room); ensureStateContainers(room);
    const r = ensureRoom(room), map = battlefieldMap(room), derived = {}, conflicts = [], resolving = new Set(), resolved = new Set();
    const copyCache = {}, copyResolving = new Set();
    const layerOrder = { copyValues: 1, setType: 4, addType: 4, setColor: 5, grantKeyword: 6, removeKeyword: 6, setPT: 72, modifyPT: 73, switchPT: 75 };
    function profilesFor(target) {
      const profiles = [];
      for (const role of SEATS) for (const row of r.layerCatalogByRole[role]) {
        const source = map.get(String(row.cardId)); if (!source) continue;
        for (const raw of arr(row.profiles)) {
          const p = clone(raw); p.timestamp = int(p.timestamp || row.timestamp);
          if (profileApplies(p, target, source, role)) profiles.push({ p, source });
        }
      }
      profiles.sort((a, b) => (layerOrder[a.p.kind] || 999) - (layerOrder[b.p.kind] || 999) || int(a.p.timestamp) - int(b.p.timestamp));
      return profiles;
    }
    function assignCopyable(dst, src, sourceCardId, profileId, timestamp, sourceName) {
      if (!src) return dst;
      dst.name = src.name || dst.name;
      dst.types = clone(src.types || dst.types);
      dst.colors = clone(src.colors || dst.colors);
      dst.keywords = clone(src.keywords || dst.keywords);
      dst.basePower = src.basePower ?? src.power ?? dst.basePower;
      dst.baseToughness = src.baseToughness ?? src.toughness ?? dst.baseToughness;
      dst.power = dst.basePower;
      dst.toughness = dst.baseToughness;
      dst.subtype = src.subtype || dst.subtype;
      dst.supertype = src.supertype || dst.supertype;
      dst.legendary = !!src.legendary;
      dst.copyApplied = true;
      dst.copySourceCardId = sourceCardId || null;
      dst.applied.push({ kind: "copyValues", sourceCardId: sourceCardId || null, sourceName: sourceName || src.name || "copy source", profileId, timestamp: int(timestamp) });
      return dst;
    }
    /* Copyable values are evaluated only in layer 1.  Later type/color/ability/PT
       effects on the source are intentionally excluded. */
    function copyable(id) {
      id = String(id);
      if (copyCache[id]) return clone(copyCache[id]);
      if (copyResolving.has(id)) { conflicts.push({ kind: "copyCycle", cardId: id, message: "コピー循環を検出" }); return null; }
      const target = map.get(id); if (!target) return null;
      copyResolving.add(id);
      let e = characteristicBase(target.card);
      const manualSourceId = r.copySources[id] ? String(r.copySources[id]) : "";
      if (manualSourceId) {
        const src = copyable(manualSourceId);
        if (src) assignCopyable(e, src, manualSourceId, "manual-copy", 0, src.name);
        else conflicts.push({ kind: "copySourceMissing", cardId: id, sourceCardId: manualSourceId, message: "コピー元を解決できません" });
      }
      for (const x of profilesFor(target)) {
        if (x.p.kind !== "copyValues") continue;
        const sourceCardId = String(x.p.copySourceCardId || "");
        const src = sourceCardId ? copyable(sourceCardId) : x.p.copyBase;
        if (src) assignCopyable(e, src, sourceCardId || String(x.source.card.id), text(x.p.id || "copy"), x.p.timestamp, src.name || cardName(x.source.card));
        else conflicts.push({ kind: "copySourceMissing", cardId: id, profileId: x.p.id, message: "コピー元がありません" });
      }
      copyResolving.delete(id);
      copyCache[id] = clone(e);
      return clone(e);
    }
    function compute(id) {
      id = String(id);
      if (resolved.has(id)) return derived[id];
      if (resolving.has(id)) { conflicts.push({ kind: "copyCycle", cardId: id, message: "コピー循環を検出" }); return null; }
      const target = map.get(id); if (!target) return null;
      resolving.add(id);
      let e = copyable(id) || characteristicBase(target.card);
      const profiles = profilesFor(target);
      for (const x of profiles) if (x.p.kind !== "copyValues") applyProfile(e, x.p, x.source, target, conflicts);
      e.hash = sha256(e); target.card.v59Effective = clone(e); derived[id] = e; resolving.delete(id); resolved.add(id); return e;
    }
    for (const id of map.keys()) compute(id);
    room.state.v59.schema = 1; room.state.v59.protocol = PROTOCOLS.LAYER; room.state.v59.derivedById = derived; room.state.v59.conflicts = conflicts; room.state.v59.lastRecompute = { at: new Date().toISOString(), hash: sha256(derived), cardCount: Object.keys(derived).length, conflictCount: conflicts.length };
    return { kind: "layersRecomputed", cardCount: Object.keys(derived).length, conflictCount: conflicts.length, hash: room.state.v59.lastRecompute.hash };
  }
  function handleLayerAction(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.LAYER); if (anyActive(room)) throw new Error(activeKind(room)); const action = text(msg.action, 40), r = ensureRoom(room), backup = snapshotMutable(room);
      try {
        let summary;
        if (action === "syncCatalog") {
          const rows = arr(msg.cards).slice(0, 200).map(row => ({ cardId: text(row.cardId, 160), profiles: arr(row.profiles).slice(0, MAX_LAYER_PROFILES).map(p => ({ ...clone(p), timestamp: ++r.timestampSeq })), timestamp: r.timestampSeq }));
          const map = battlefieldMap(room); for (const row of rows) { const f = map.get(row.cardId); if (!f || controllerOf(f.card, f.role) !== client.role) throw new Error("catalogCardNotControlled"); }
          r.layerCatalogByRole[client.role] = rows; room.state.v59.catalogRev = int(room.state.v59.catalogRev) + 1; summary = recomputeLayers(room); summary.kind = "catalogSynced"; summary.catalogRev = room.state.v59.catalogRev;
        } else if (action === "clearCatalog") { r.layerCatalogByRole[client.role] = []; room.state.v59.catalogRev = int(room.state.v59.catalogRev) + 1; summary = recomputeLayers(room); summary.kind = "catalogCleared"; }
        else if (action === "setCopySource") { const source = findPublicCard(room, msg.sourceCardId), target = findPublicCard(room, msg.targetCardId); if (!source || !target) throw new Error("copyCardMissing"); if (controllerOf(source.card, source.role) !== client.role) throw new Error("copyCardNotControlled"); if (String(source.card.id) === String(target.card.id)) throw new Error("copySelfCycle"); r.copySources[String(source.card.id)] = String(target.card.id); summary = recomputeLayers(room); summary.kind = "copySourceSet"; summary.sourceCardId = String(source.card.id); summary.targetCardId = String(target.card.id); }
        else if (action === "clearCopySource") { const source = findPublicCard(room, msg.sourceCardId); if (!source || controllerOf(source.card, source.role) !== client.role) throw new Error("copyCardNotControlled"); delete r.copySources[String(source.card.id)]; summary = recomputeLayers(room); summary.kind = "copySourceCleared"; summary.sourceCardId = String(source.card.id); }
        else if (action === "recompute") summary = recomputeLayers(room);
        else throw new Error("layerActionInvalid");
        finalize(room); sendCommit(room, client, "layerActionCommitted", "layerPublicSync", summary, { protocol: PROTOCOLS.LAYER, action }); record(room, "layerAction", summary);
      } catch (e) { restoreMutable(room, backup, ensureRoom); throw e; }
    } catch (e) { reject(client, room, "layerActionRejected", msg, e.message || e); }
  }

  function cancelClientTransactions(room, id) {
    const r = ensureRoom(room), cid = String(id || ""); if (r.triggerBatch?.clientId === cid) r.triggerBatch = null; if (r.replacementTx?.clientId === cid) r.replacementTx = null; if (r.combatTx?.clientId === cid) r.combatTx = null;
  }
  function handle(client, room, msg) {
    switch (msg.type) {
      case "triggerEventStart": handleTriggerStart(client, room, msg); return true;
      case "triggerBatchOrder": handleTriggerOrder(client, room, msg); return true;
      case "triggerBatchCommit": handleTriggerCommit(client, room, msg); return true;
      case "delayedTriggerRegister": handleDelayedRegister(client, room, msg); return true;
      case "replacementTxStart": handleReplacementStart(client, room, msg); return true;
      case "replacementTxCommit": handleReplacementCommit(client, room, msg); return true;
      case "replacementTxCancel": handleReplacementCancel(client, room, msg); return true;
      case "combatTxStart": handleCombatStart(client, room, msg); return true;
      case "combatTxCommit": handleCombatCommit(client, room, msg); return true;
      case "combatTxCancel": handleCombatCancel(client, room, msg); return true;
      case "turnAction": handleTurnAction(client, room, msg); return true;
      case "stateAction": handleStateAction(client, room, msg); return true;
      case "layerAction": handleLayerAction(client, room, msg); return true;
      default: return false;
    }
  }

  return { PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES, ensureRoom, anyActive, activeKind, authoritySummary, cancelClientTransactions, handle, recomputeLayers, runSba, startExternalTriggerEvent };
}

module.exports = { PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES, createEngine };
