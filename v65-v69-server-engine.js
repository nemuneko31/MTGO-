"use strict";

const crypto = require("crypto");

const PROTOCOLS = Object.freeze({
  TRIGGER_CHAIN: "cpt-v6.5",
  TRIGGER_GUARD: "cpt-v6.6",
  LOOP_SHORTCUT: "cpt-v6.7",
  CHOICE_LOOP: "cpt-v6.8",
  BRANCH_LOOP: "cpt-v6.9",
});

const AUTHORITY_FLAGS = Object.freeze({
  triggerChainProtocol: PROTOCOLS.TRIGGER_CHAIN,
  serverSimultaneousTriggerChainsV65: true,
  serverBatchTriggerCollectionV65: true,
  serverAPNAPWavesV65: true,
  serverTriggeredEventChainsV65: true,
  triggerGuardProtocol: PROTOCOLS.TRIGGER_GUARD,
  serverInterveningIfV66: true,
  serverResolutionConditionRecheckV66: true,
  serverTriggerLoopDetectionV66: true,
  serverTriggerChainPauseResumeV66: true,
  loopShortcutProtocol: PROTOCOLS.LOOP_SHORTCUT,
  serverOptionalLoopsV67: true,
  serverLoopIterationDeclarationV67: true,
  serverLoopStoppingConditionsV67: true,
  serverLoopInterruptionV67: true,
  serverLoopShortcutProofsV67: true,
  choiceLoopProtocol: PROTOCOLS.CHOICE_LOOP,
  serverChoiceLoopsV68: true,
  serverChoiceSchedulesV68: true,
  serverResponseReservationsV68: true,
  serverNormalPlayResumeV68: true,
  serverChoiceLoopProofsV68: true,
  branchLoopProtocol: PROTOCOLS.BRANCH_LOOP,
  serverBranchLoopsV69: true,
  serverConditionalChoicePointsV69: true,
  serverBranchLoopResumeV69: true,
  serverBranchLoopProofsV69: true,
});

const MESSAGE_TYPES = Object.freeze([
  "simultaneousTriggerChainStart", "simultaneousTriggerChainOrder", "simultaneousTriggerChainCommit", "simultaneousTriggerChainAction",
  "loopShortcutStart", "loopShortcutRespond", "loopShortcutCommit", "loopShortcutCancel",
  "choiceLoopStart", "choiceLoopRespond", "choiceLoopCommit", "choiceLoopCancel", "choiceLoopCheckpointAcknowledge",
  "branchLoopStart", "branchLoopRespond", "branchLoopCommit", "branchLoopRepropose", "branchLoopCancel",
]);

const SEATS = ["A", "B"];
const SEAT_SET = new Set(SEATS);
const PUBLIC_ZONES = ["creatures", "lands", "others", "graveyard", "exile", "command"];
const BATTLEFIELD_ZONES = new Set(["creatures", "lands", "others"]);
const TX_TTL_MS = 3 * 60 * 1000;
const MAX_NONCES = 4096;
const MAX_CHAINS = 160;
const MAX_HISTORY = 160;
const MAX_PROOFS = 240;
const MAX_AUDIT = 400;
const MAX_TRIGGER_CANDIDATES = 300;
const MAX_LOOP_STEPS = 8;
const MAX_LOOP_ITERATIONS = 1000;
const MAX_CHOICE_ITERATIONS = 500;
const MAX_CHOICE_POINTS = 6;
const MAX_OPTIONS = 4;

function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function now() { return Date.now(); }
function uid(prefix = "id") { return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`; }
function sha256(v) { return crypto.createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex"); }
function text(v, max = 180) { return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, "").slice(0, max); }
function int(v, min = 0, max = Number.MAX_SAFE_INTEGER) { return Math.max(min, Math.min(max, Math.trunc(Number(v) || 0))); }
function arr(v) { return Array.isArray(v) ? v : []; }
function isSeat(v) { return SEAT_SET.has(v); }
function other(role) { return role === "A" ? "B" : "A"; }
function unique(v, max = 300) { return [...new Set(arr(v).map(x => String(x || "")).filter(Boolean))].slice(0, max); }
function clientId(client) { return String(client?.id || client?.clientId || ""); }
function controller(card, fallback = "A") { return isSeat(card?.v61EffectiveController) ? card.v61EffectiveController : (isSeat(card?.controller) ? card.controller : (isSeat(card?.owner) ? card.owner : fallback)); }
function owner(card, fallback = "A") { return isSeat(card?.owner) ? card.owner : fallback; }
function cardName(card) { return text(card?.v60Characteristics?.name || card?.name || card?.displayName || card?.id || "カード", 140); }
function cardTypes(card) { const a = card?.v59Effective?.types || card?.v60Characteristics?.types || card?.types || [card?.type]; return unique(Array.isArray(a) ? a : [a], 40); }
function seatClientId(room, role) { const c = [...(room?.clients?.values?.() || [])].find(x => x?.role === role); return String(c?.clientId || c?.id || ""); }

function ensurePublic(room) {
  room.state = room.state && typeof room.state === "object" ? room.state : { players: { A: {}, B: {} }, stack: [], turn: {} };
  room.state.players ||= {};
  for (const role of SEATS) {
    const p = room.state.players[role] ||= {};
    p.life = Number.isFinite(Number(p.life)) ? Number(p.life) : 20;
    p.poison = int(p.poison);
    p.manaPool = p.manaPool && typeof p.manaPool === "object" ? p.manaPool : {};
    for (const k of ["W", "U", "B", "R", "G", "C"]) p.manaPool[k] = int(p.manaPool[k]);
    for (const z of [...PUBLIC_ZONES, "hand", "library", "sideboard"]) if (!Array.isArray(p[z])) p[z] = [];
  }
  if (!Array.isArray(room.state.stack)) room.state.stack = [];
  room.state.turn = room.state.turn && typeof room.state.turn === "object" ? room.state.turn : {};
  room.state.turn.active = isSeat(room.state.turn.active) ? room.state.turn.active : "A";
  room.state.turn.priority = isSeat(room.state.turn.priority) ? room.state.turn.priority : room.state.turn.active;
  room.state.turn.number = Math.max(1, int(room.state.turn.number, 1));
  room.state.turn.phase = int(room.state.turn.phase, 0, 20);
  return room.state;
}
function allEntries(room) {
  ensurePublic(room); const out = [];
  for (const role of SEATS) for (const zone of PUBLIC_ZONES) for (const card of room.state.players[role][zone]) out.push({ card, role, zone, list: room.state.players[role][zone] });
  for (const card of room.state.stack) out.push({ card, role: controller(card, owner(card)), zone: "stack", list: room.state.stack });
  return out;
}
function battlefield(room) { return allEntries(room).filter(x => BATTLEFIELD_ZONES.has(x.zone) && !x.card?.v62PhasedOut); }
function findCard(room, id) { return allEntries(room).find(x => String(x.card?.id || "") === String(id || "")) || null; }
function publicPlayer(room, role) { ensurePublic(room); return room.state.players[isSeat(role) ? role : "A"]; }

function cloneRuntime(rt) {
  if (!rt) return null;
  return {
    triggerTx: clone(rt.triggerTx), loopTx: clone(rt.loopTx), choiceTx: clone(rt.choiceTx), branchTx: clone(rt.branchTx),
    nonceKeys: [...(rt.nonces instanceof Map ? rt.nonces.keys() : [])], chainSeq: int(rt.chainSeq),
  };
}
function snapshot(room) {
  return { state: clone(room.state), privateByRole: clone(room.privateByRole), privateRevByRole: clone(room.privateRevByRole), rev: room.rev, updatedAt: room.updatedAt, runtime: cloneRuntime(room.v65v69) };
}
function restore(room, snap, ensureRuntime) {
  room.state = snap.state; room.privateByRole = snap.privateByRole; room.privateRevByRole = snap.privateRevByRole; room.rev = snap.rev; room.updatedAt = snap.updatedAt;
  const r = ensureRuntime(room), x = snap.runtime || {};
  r.triggerTx = x.triggerTx || null; r.loopTx = x.loopTx || null; r.choiceTx = x.choiceTx || null; r.branchTx = x.branchTx || null; r.chainSeq = int(x.chainSeq);
  r.nonces = new Map((x.nonceKeys || []).map(k => [k, now()]));
}

function createEngine(D) {
  if (!D || typeof D.send !== "function" || typeof D.broadcast !== "function") throw new Error("dependenciesMissing");

  function ensureState(room) {
    ensurePublic(room);
    room.state.v65 = room.state.v65 && typeof room.state.v65 === "object" ? room.state.v65 : { schema: 1, protocol: PROTOCOLS.TRIGGER_CHAIN, chainRev: 0, sequence: 0, chains: [], proofs: [], audit: [] };
    room.state.v66 = room.state.v66 && typeof room.state.v66 === "object" ? room.state.v66 : { schema: 1, protocol: PROTOCOLS.TRIGGER_GUARD, guardRev: 0, incidents: [], proofs: [], audit: [], resolutionChecks: [], settings: { repeatLimit: 3, maxWaves: 24, maxChainObjects: 160 } };
    room.state.v67 = room.state.v67 && typeof room.state.v67 === "object" ? room.state.v67 : { schema: 1, protocol: PROTOCOLS.LOOP_SHORTCUT, shortcutRev: 0, history: [], proofs: [], audit: [], settings: { maxIterations: MAX_LOOP_ITERATIONS, maxSteps: MAX_LOOP_STEPS } };
    room.state.v68 = room.state.v68 && typeof room.state.v68 === "object" ? room.state.v68 : { schema: 1, protocol: PROTOCOLS.CHOICE_LOOP, shortcutRev: 0, history: [], proofs: [], audit: [], resumeCheckpoint: null, settings: { maxIterations: MAX_CHOICE_ITERATIONS, maxChoicePoints: MAX_CHOICE_POINTS, maxOptions: MAX_OPTIONS } };
    room.state.v69 = room.state.v69 && typeof room.state.v69 === "object" ? room.state.v69 : { schema: 1, protocol: PROTOCOLS.BRANCH_LOOP, rev: 0, history: [], resumeRecipe: null, proofs: [], audit: [] };
    for (const [obj, keys] of [[room.state.v65, ["chains", "proofs", "audit"]], [room.state.v66, ["incidents", "proofs", "audit", "resolutionChecks"]], [room.state.v67, ["history", "proofs", "audit"]], [room.state.v68, ["history", "proofs", "audit"]], [room.state.v69, ["history", "proofs", "audit"]]]) for (const k of keys) if (!Array.isArray(obj[k])) obj[k] = [];
    room.state.v66.settings = { repeatLimit: 3, maxWaves: 24, maxChainObjects: 160, ...(room.state.v66.settings || {}) };
    return room.state;
  }
  function ensureRuntime(room) {
    if (!room.v65v69 || typeof room.v65v69 !== "object") room.v65v69 = {};
    const r = room.v65v69;
    if (!(r.nonces instanceof Map)) r.nonces = new Map();
    r.triggerTx ||= null; r.loopTx ||= null; r.choiceTx ||= null; r.branchTx ||= null; r.chainSeq = int(r.chainSeq);
    const t = now();
    for (const key of ["triggerTx", "loopTx", "choiceTx", "branchTx"]) if (r[key]?.expiresAt <= t) r[key] = null;
    for (const [k, at] of r.nonces) if (t - at > 30 * 60 * 1000) r.nonces.delete(k);
    while (r.nonces.size > MAX_NONCES) r.nonces.delete(r.nonces.keys().next().value);
    return r;
  }
  function anyActive(room) { const r = ensureRuntime(room); return !!(r.triggerTx || r.loopTx || r.choiceTx || r.branchTx); }
  function activeKind(room) { const r = ensureRuntime(room); return r.triggerTx ? "simultaneousTriggerChainActive" : r.loopTx ? "loopShortcutActive" : r.choiceTx ? "choiceLoopActive" : r.branchTx ? "branchLoopActive" : ""; }
  function rememberNonce(room, client, protocol, nonce) {
    const n = text(nonce, 180); if (!n) throw new Error("actionNonceMissing");
    const key = `${clientId(client)}:${protocol}:${n}`, r = ensureRuntime(room); if (r.nonces.has(key)) throw new Error("actionNonceReused"); r.nonces.set(key, now());
  }
  function verify(client, room, msg, protocol) {
    ensureRuntime(room); ensureState(room);
    if (!isSeat(client?.role)) throw new Error("spectator");
    if (msg.protocol !== protocol) throw new Error("protocolMismatch");
    if (Number(msg.baseRev) !== Number(room.rev)) throw new Error("staleRev");
    rememberNonce(room, client, protocol, msg.actionNonce);
  }
  function finalize(room) { D.finalizeRoom(room); D.refreshRoomHash(room); }
  function audit(room, family, kind, data) {
    const target = room.state[family]; if (!target) return;
    target.audit.unshift({ at: new Date().toISOString(), kind, data: clone(data || {}) }); if (target.audit.length > MAX_AUDIT) target.audit.length = MAX_AUDIT;
  }
  function proof(room, family, action, payload) {
    const p = { id: uid("proof"), at: new Date().toISOString(), family, action, rev: Number(room.rev) + 1, commitment: sha256({ family, action, payload, state: room.state }) };
    const target = room.state[family]; if (target?.proofs) { target.proofs.unshift(p); if (target.proofs.length > MAX_PROOFS) target.proofs.length = MAX_PROOFS; }
    return p;
  }
  function log(room, kind, data) { D.pushLog(room, { kind: `v65v69:${kind}`, ...clone(data || {}) }); }
  function common(room, extra = {}) { return { rev: room.rev, state: clone(room.state), authority: D.authority(), authoritySummary: authoritySummary(room), ...extra }; }
  function sendClient(client, payload) { D.send(client && client.ws ? client.ws : client, payload); }
  function sendCommit(room, client, committedType, syncType, extra = {}) {
    const payload = common(room, extra); sendClient(client, { type: committedType, ...payload }); D.broadcast(room, { type: syncType, ...payload }, clientId(client)); return payload;
  }
  function reject(client, room, type, msg, reason, detail = "") {
    sendClient(client, { type, protocol: msg?.protocol || "", actionNonce: text(msg?.actionNonce), txId: text(msg?.txId), reason: text(reason, 140), detail: text(detail, 300), rev: Number(room?.rev || 0), authority: D.authority(), authoritySummary: room ? authoritySummary(room) : null });
  }
  function authoritySummary(room) {
    const r = ensureRuntime(room), s = room.state;
    if (!s?.v65 || !s?.v66 || !s?.v67 || !s?.v68 || !s?.v69) return {
      triggerChainAuthority: { protocol: PROTOCOLS.TRIGGER_CHAIN, chainRev: 0, chainCount: 0, pendingCount: 0, proofCount: 0, active: r.triggerTx ? publicTriggerTx(r.triggerTx) : null },
      triggerGuardAuthority: { protocol: PROTOCOLS.TRIGGER_GUARD, guardRev: 0, pausedChainCount: 0, incidentCount: 0, resolutionCheckCount: 0 },
      loopShortcutAuthority: { protocol: PROTOCOLS.LOOP_SHORTCUT, shortcutRev: 0, historyCount: 0, proofCount: 0, active: r.loopTx ? publicLoopTx(r.loopTx) : null },
      choiceLoopAuthority: { protocol: PROTOCOLS.CHOICE_LOOP, shortcutRev: 0, historyCount: 0, proofCount: 0, active: r.choiceTx ? publicChoiceTx(r.choiceTx) : null, resumeCheckpoint: null },
      branchLoopAuthority: { protocol: PROTOCOLS.BRANCH_LOOP, rev: 0, historyCount: 0, proofCount: 0, active: r.branchTx ? publicBranchTx(r.branchTx) : null, resumeRecipe: null },
    };
    const paused = s.v65.chains.filter(x => x.status === "loopPaused").length;
    return {
      triggerChainAuthority: { protocol: PROTOCOLS.TRIGGER_CHAIN, chainRev: int(s.v65.chainRev), chainCount: s.v65.chains.length, pendingCount: s.v65.chains.filter(x => !["completed", "aborted"].includes(x.status)).length, proofCount: s.v65.proofs.length, active: r.triggerTx ? publicTriggerTx(r.triggerTx) : null },
      triggerGuardAuthority: { protocol: PROTOCOLS.TRIGGER_GUARD, guardRev: int(s.v66.guardRev), pausedChainCount: paused, incidentCount: s.v66.incidents.length, resolutionCheckCount: s.v66.resolutionChecks.length },
      loopShortcutAuthority: { protocol: PROTOCOLS.LOOP_SHORTCUT, shortcutRev: int(s.v67.shortcutRev), historyCount: s.v67.history.length, proofCount: s.v67.proofs.length, active: r.loopTx ? publicLoopTx(r.loopTx) : null },
      choiceLoopAuthority: { protocol: PROTOCOLS.CHOICE_LOOP, shortcutRev: int(s.v68.shortcutRev), historyCount: s.v68.history.length, proofCount: s.v68.proofs.length, active: r.choiceTx ? publicChoiceTx(r.choiceTx) : null, resumeCheckpoint: clone(s.v68.resumeCheckpoint) },
      branchLoopAuthority: { protocol: PROTOCOLS.BRANCH_LOOP, rev: int(s.v69.rev), historyCount: s.v69.history.length, proofCount: s.v69.proofs.length, active: r.branchTx ? publicBranchTx(r.branchTx) : null, resumeRecipe: clone(s.v69.resumeRecipe) },
    };
  }

  /* ---------- v6.6 condition evaluator ---------- */
  function evaluateCondition(cond, room, source, event, controllerRole) {
    if (!cond || typeof cond !== "object") return { known: true, value: true, reason: "none" };
    if (Array.isArray(cond.all)) { const rows = cond.all.map(x => evaluateCondition(x, room, source, event, controllerRole)); if (rows.some(x => !x.known)) return { known: false, value: false, reason: "conditionUnknown" }; return { known: true, value: rows.every(x => x.value), reason: "all" }; }
    if (Array.isArray(cond.any)) { const rows = cond.any.map(x => evaluateCondition(x, room, source, event, controllerRole)); if (rows.some(x => x.known && x.value)) return { known: true, value: true, reason: "any" }; if (rows.every(x => x.known)) return { known: true, value: false, reason: "any" }; return { known: false, value: false, reason: "conditionUnknown" }; }
    if (cond.not) { const x = evaluateCondition(cond.not, room, source, event, controllerRole); return x.known ? { known: true, value: !x.value, reason: "not" } : x; }
    const type = text(cond.type || cond.kind, 80), ctrl = isSeat(controllerRole) ? controllerRole : controller(source, event?.actorRole || "A"), opp = other(ctrl), value = Number(cond.value ?? cond.amount ?? 0);
    const playerPermanentCount = (role, cardType = "") => battlefield(room).filter(x => controller(x.card, x.role) === role && (!cardType || cardTypes(x.card).includes(cardType))).length;
    const sourceEntry = source?.id ? findCard(room, source.id) : null;
    switch (type) {
      case "controllerLifeAtMost": case "lifeAtMost": return { known: true, value: publicPlayer(room, ctrl).life <= value, reason: type };
      case "controllerLifeAtLeast": case "lifeAtLeast": return { known: true, value: publicPlayer(room, ctrl).life >= value, reason: type };
      case "opponentLifeAtMost": return { known: true, value: publicPlayer(room, opp).life <= value, reason: type };
      case "opponentLifeAtLeast": return { known: true, value: publicPlayer(room, opp).life >= value, reason: type };
      case "sourceTapped": return { known: true, value: !!sourceEntry?.card?.tapped === (cond.value !== false), reason: type };
      case "sourceUntapped": return { known: true, value: !!sourceEntry && !sourceEntry.card.tapped, reason: type };
      case "sourceExists": return { known: true, value: !!sourceEntry, reason: type };
      case "sourceOnBattlefield": return { known: true, value: !!sourceEntry && BATTLEFIELD_ZONES.has(sourceEntry.zone), reason: type };
      case "controllerControlsAtLeast": return { known: true, value: playerPermanentCount(ctrl) >= value, reason: type };
      case "controllerControlsTypeAtLeast": case "permanentCountAtLeast": return { known: true, value: playerPermanentCount(ctrl, text(cond.cardType || cond.typeName || cond.permanentType, 80)) >= value, reason: type };
      case "opponentControlsTypeAtLeast": return { known: true, value: playerPermanentCount(opp, text(cond.cardType || cond.typeName || cond.permanentType, 80)) >= value, reason: type };
      case "eventAmountAtLeast": return { known: true, value: Number(event?.amount || 0) >= value, reason: type };
      case "playerPoisonAtLeast": return { known: true, value: publicPlayer(room, isSeat(cond.role) ? cond.role : ctrl).poison >= value, reason: type };
      case "playerPoisonAtMost": return { known: true, value: publicPlayer(room, isSeat(cond.role) ? cond.role : ctrl).poison <= value, reason: type };
      case "manual": return { known: false, value: false, reason: "manualCondition" };
      default: return { known: false, value: false, reason: `unsupportedCondition:${type || "unknown"}` };
    }
  }
  function preResolveStackObject(room, top) {
    ensureRuntime(room); ensureState(room);
    const cond = top?.v55Trigger?.interveningIf;
    if (!cond) return { apply: true };
    const source = findCard(room, top.sourceCardId)?.card || { id: top.sourceCardId, controller: top.controller, owner: top.owner };
    const result = evaluateCondition(cond, room, source, top.v55Trigger?.event || {}, top.controller);
    const row = { id: uid("ifcheck"), at: new Date().toISOString(), stackObjectId: String(top.id || ""), sourceCardId: String(top.sourceCardId || ""), known: result.known, value: result.value, reason: result.reason };
    room.state.v66.resolutionChecks.unshift(row); if (room.state.v66.resolutionChecks.length > 200) room.state.v66.resolutionChecks.length = 200; room.state.v66.guardRev++;
    if (!result.known) throw new Error("interveningIfManualRequired");
    return result.value ? { apply: true, check: row } : { apply: false, reason: "interveningIfFalse", check: row };
  }

  /* ---------- v6.5 trigger chains ---------- */
  function timingMatches(trigger, event) {
    const t = String(trigger?.timing || "other").toLowerCase(), kind = String(event?.kind || "").toLowerCase(), timing = String(event?.timing || "").toLowerCase();
    const aliases = { dies: ["dies", "death", "zonemove"], enterbattlefield: ["enterbattlefield", "zonemove"], leavesbattlefield: ["leavesbattlefield", "zonemove"], cast: ["cast", "spellcast"], attack: ["attack"], block: ["block"], combatdamage: ["combatdamage"], draw: ["draw"], life: ["life", "lifegain", "lifechanged"] };
    if (t === "other" || t === "custom") return !!trigger?.keyword && String(trigger.keyword).toLowerCase() === String(event?.keyword || "").toLowerCase();
    if (aliases[t]?.includes(kind)) {
      if (t === "dies") return event.toZone === "graveyard" && BATTLEFIELD_ZONES.has(event.fromZone);
      if (t === "enterbattlefield") return BATTLEFIELD_ZONES.has(event.toZone) || event.toZone === "battlefield";
      if (t === "leavesbattlefield") return BATTLEFIELD_ZONES.has(event.fromZone) && !BATTLEFIELD_ZONES.has(event.toZone);
      return true;
    }
    return t === kind || t === timing;
  }
  function scopeMatches(trigger, sourceEntry, event) {
    const scope = text(trigger.triggerScope || "self", 20), sourceRole = controller(sourceEntry.card, sourceEntry.role), eventRole = isSeat(event.controllerBefore) ? event.controllerBefore : (isSeat(event.actorRole) ? event.actorRole : sourceRole);
    if (scope === "self") return String(sourceEntry.card.id) === String(event.cardId || event.sourceCardId || "");
    if (scope === "you") return sourceRole === eventRole;
    if (scope === "opponent") return sourceRole !== eventRole;
    return true;
  }
  function filterMatches(trigger, event) {
    const f = text(trigger.triggerFilter, 120); if (!f) return true;
    const types = arr(event?.lki?.types || event?.types || []); return types.some(x => String(x).toLowerCase().includes(f.toLowerCase())) || String(event?.cardName || event?.lki?.name || "").toLowerCase().includes(f.toLowerCase());
  }
  function normalizeEvent(raw, index = 0) {
    raw = raw && typeof raw === "object" ? clone(raw) : {};
    return { id: text(raw.id || raw.eventId || `event-${index}`, 160), eventId: text(raw.eventId || raw.id || `event-${index}`, 160), sequence: int(raw.simultaneousIndex ?? raw.sequence ?? index), kind: text(raw.kind || "zoneMove", 60), timing: text(raw.timing || raw.kind || "zoneMove", 60), keyword: text(raw.keyword, 100), activeRole: isSeat(raw.activeRole) ? raw.activeRole : "A", actorRole: isSeat(raw.actorRole) ? raw.actorRole : "A", cardId: text(raw.cardId, 160), cardName: text(raw.cardName || raw.lki?.name, 160), fromZone: text(raw.fromZone, 40), toZone: text(raw.toZone, 40), amount: Number(raw.amount || 0), lki: clone(raw.lki || null), flags: clone(raw.flags || {}) };
  }
  function eventsForBatch(room, batch) {
    const ids = unique(arr(batch?.moves).flatMap(m => arr(m.eventIds)), 400), rows = [];
    for (const id of ids) { const e = arr(room.state?.v63?.events).find(x => String(x.id) === String(id)); if (e) rows.push(normalizeEvent(e, rows.length)); }
    return rows;
  }
  function collectUnclaimedEvents(room, chain) {
    const claimed = new Set(arr(room.state.v65.chains).flatMap(c => arr(c.eventIds)));
    const rows = arr(room.state?.v63?.events).filter(e => !claimed.has(String(e.id)) && ["pending", "processed"].includes(String(e.status || "pending"))).map((e, i) => normalizeEvent(e, i));
    if (chain) for (const e of rows) { chain.eventIds.push(e.id); const raw = room.state.v63.events.find(x => String(x.id) === e.id); if (raw) raw.v65ChainId = chain.id; }
    return rows;
  }
  function triggerCandidate(room, sourceEntry, raw, event) {
    if (!timingMatches(raw, event) || !scopeMatches(raw, sourceEntry, event) || !filterMatches(raw, event)) return null;
    const role = controller(sourceEntry.card, sourceEntry.role), condition = evaluateCondition(raw.interveningIf, room, sourceEntry.card, event, role);
    if (!condition.known) return { manualCondition: true, reason: condition.reason };
    if (!condition.value) return null;
    return { id: uid("trigger"), abilityId: text(raw.id || uid("ability")), abilityName: text(raw.name || "誘発型能力", 140), sourceCardId: String(sourceEntry.card.id), sourceCardName: cardName(sourceEntry.card), controller: role, controllerRole: role, optional: !!raw.optional, targetRequired: !!(raw.targetRequired || raw.targetProfile?.required), minTargets: int(raw.targetProfile?.minTargets ?? (raw.targetRequired ? 1 : 0), 0, 20), maxTargets: int(raw.targetProfile?.maxTargets ?? 1, 1, 20), targetProfile: clone(raw.targetProfile || {}), autoEffects: clone(raw.autoEffects || []), resolveChecklist: clone(raw.resolveChecklist || []), resolveNote: text(raw.resolveNote, 300), interveningIf: clone(raw.interveningIf || null), triggerScope: text(raw.triggerScope || "self", 20), triggerFilter: text(raw.triggerFilter, 120), eventId: event.id, eventSequence: event.sequence, eventCardId: event.cardId, eventCardName: event.cardName, event: clone(event), ability: clone(raw) };
  }
  function collectCandidates(room, events) {
    const candidates = [], manual = [];
    for (const event of events) for (const source of allEntries(room).filter(x => x.zone !== "stack" && !x.card?.faceDown && !x.card?.v48Redacted)) for (const raw of arr(source.card?.v55Triggers).slice(0, 50)) {
      const c = triggerCandidate(room, source, raw, event); if (c?.manualCondition) manual.push({ sourceCardId: source.card.id, abilityId: raw.id, eventId: event.id, reason: c.reason }); else if (c) candidates.push(c);
      if (candidates.length >= MAX_TRIGGER_CANDIDATES) break;
    }
    if (manual.length) throw new Error("interveningIfManualRequired");
    return candidates.slice(0, MAX_TRIGGER_CANDIDATES);
  }
  function chainById(room, id) { return room.state.v65.chains.find(x => String(x.id) === String(id || "")) || null; }
  function publicChain(chain) { return clone(chain); }
  function publicTriggerTx(tx) { return tx ? { id: tx.id, chainId: tx.chainId, waveIndex: tx.waveIndex, activeRole: tx.activeRole, eventIds: clone(tx.eventIds), candidates: clone(tx.candidates), ready: clone(tx.ready), orders: clone(tx.orders), createdAt: tx.createdAt, expiresAt: tx.expiresAt } : null; }
  function triggerSignature(tx) { return sha256({ candidates: tx.candidates.map(c => ({ a: c.abilityId, s: c.sourceCardId, r: c.controllerRole, k: c.event?.kind || "", t: c.event?.timing || "", f: c.event?.fromZone || "", z: c.event?.toZone || "", n: c.event?.cardName || "" })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) }); }
  function startTriggerWave(client, room, msg) {
    verify(client, room, msg, PROTOCOLS.TRIGGER_CHAIN); if (anyActive(room)) throw new Error(activeKind(room));
    let chain, events = [];
    if (msg.batchId) {
      const batch = arr(room.state?.v64?.batches).find(x => String(x.id) === String(msg.batchId)); if (!batch) throw new Error("batchMissing");
      if (room.state.v65.chains.some(x => String(x.sourceBatchId) === String(batch.id))) throw new Error("batchAlreadyCollected");
      events = eventsForBatch(room, batch); if (!events.length) throw new Error("batchEventsMissing");
      chain = { id: uid("triggerchain"), sourceBatchId: batch.id, actorRole: client.role, status: "pendingWave", createdAt: new Date().toISOString(), eventIds: events.map(x => x.id), pendingEventIds: events.map(x => x.id), processedEventIds: [], waves: [], v66Guard: { signatures: [], repeatCount: 0, totalObjects: 0, reason: "", lastSignature: "" } };
      room.state.v65.chains.unshift(chain); if (room.state.v65.chains.length > MAX_CHAINS) room.state.v65.chains.length = MAX_CHAINS;
      for (const e of events) { const raw = room.state.v63.events.find(x => String(x.id) === e.id); if (raw) { raw.v65ChainId = chain.id; raw.v65WaveIndex = 1; } }
    } else if (msg.chainId) {
      chain = chainById(room, msg.chainId); if (!chain) throw new Error("chainMissing"); if (["completed", "aborted"].includes(chain.status)) throw new Error("chainClosed"); if (chain.status === "loopPaused" && !chain.v66Guard?.resumeOneWave) throw new Error("triggerLoopPaused");
      const added = collectUnclaimedEvents(room, chain); const pending = new Set(arr(chain.pendingEventIds)); for (const e of added) pending.add(e.id); chain.pendingEventIds = [...pending];
      events = chain.pendingEventIds.map(id => normalizeEvent(arr(room.state?.v63?.events).find(x => String(x.id) === String(id)) || { id }, 0));
      if (!events.length) { chain.status = "completed"; chain.completedAt = new Date().toISOString(); room.state.v65.chainRev++; finalize(room); const p = proof(room, "v65", "empty", { chainId: chain.id }); sendCommit(room, client, "simultaneousTriggerChainEmpty", "simultaneousTriggerChainPublicSync", { protocol: PROTOCOLS.TRIGGER_CHAIN, actionNonce: msg.actionNonce, chain: publicChain(chain), summary: { chainId: chain.id, waveIndex: chain.waves.length + 1, count: 0 }, commitment: p.commitment }); return null; }
    } else throw new Error("batchIdOrChainIdRequired");
    const candidates = collectCandidates(room, events), waveIndex = chain.waves.length + 1;
    if (!candidates.length) {
      chain.processedEventIds.push(...events.map(x => x.id)); chain.pendingEventIds = chain.pendingEventIds.filter(x => !events.some(e => e.id === x)); chain.status = chain.pendingEventIds.length ? "awaitingNextWave" : "completed"; chain.waves.push({ index: waveIndex, status: "empty", selectedCount: 0, eventIds: events.map(x => x.id), at: new Date().toISOString() }); room.state.v65.chainRev++; finalize(room); const p = proof(room, "v65", "empty", { chainId: chain.id, waveIndex }); sendCommit(room, client, "simultaneousTriggerChainEmpty", "simultaneousTriggerChainPublicSync", { protocol: PROTOCOLS.TRIGGER_CHAIN, actionNonce: msg.actionNonce, chain: publicChain(chain), summary: { chainId: chain.id, waveIndex, count: 0 }, commitment: p.commitment }); return null;
    }
    const byRole = { A: candidates.filter(x => x.controllerRole === "A"), B: candidates.filter(x => x.controllerRole === "B") };
    const tx = { id: uid("triggerchaintx"), chainId: chain.id, waveIndex, actorClientId: clientId(client), participantClientIds: { A: seatClientId(room, "A"), B: seatClientId(room, "B") }, actorRole: client.role, activeRole: isSeat(room.state.turn?.active) ? room.state.turn.active : "A", eventIds: events.map(x => x.id), candidates, ready: { A: byRole.A.length === 0, B: byRole.B.length === 0 }, orders: { A: [], B: [] }, baseRev: room.rev, createdAt: now(), expiresAt: now() + TX_TTL_MS };
    ensureRuntime(room).triggerTx = tx; chain.status = "ordering"; chain.currentWave = waveIndex; room.state.v65.chainRev++;
    const payload = { type: "simultaneousTriggerChainStarted", protocol: PROTOCOLS.TRIGGER_CHAIN, actionNonce: text(msg.actionNonce), txId: tx.id, batch: publicTriggerTx(tx), chain: publicChain(chain), authority: D.authority(), authoritySummary: authoritySummary(room) };
    D.broadcast(room, payload); log(room, "triggerChainStart", { chainId: chain.id, waveIndex, candidateCount: candidates.length }); return tx;
  }
  function handleTriggerStart(client, room, msg) { const before = snapshot(room); try { startTriggerWave(client, room, msg); } catch (e) { restore(room, before, ensureRuntime); reject(client, room, "simultaneousTriggerChainRejected", msg, e.message || e); } }
  function handleTriggerOrder(client, room, msg) {
    const tx = ensureRuntime(room).triggerTx;
    try {
      verify(client, room, msg, PROTOCOLS.TRIGGER_CHAIN); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (tx.baseRev !== room.rev) throw new Error("staleRev");
      const own = tx.candidates.filter(x => x.controllerRole === client.role), map = new Map(own.map(x => [x.id, x])), items = arr(msg.items).map(clone), seen = new Set();
      for (const item of items) { const c = map.get(String(item.triggerId || "")); if (!c) throw new Error("triggerNotOwned"); if (seen.has(c.id)) throw new Error("duplicateTrigger"); seen.add(c.id); const t = item.targets || {}, count = unique(t.cardIds).length + unique(t.playerIds, 2).length + unique(t.zoneRefs).length; if (c.targetRequired && (count < c.minTargets || count > c.maxTargets)) throw new Error("targetCountInvalid"); }
      for (const c of own) if (!c.optional && !seen.has(c.id)) throw new Error("mandatoryTriggerMissing");
      tx.orders[client.role] = items.map(x => ({ triggerId: String(x.triggerId), targets: clone(x.targets || { cardIds: [], playerIds: [], zoneRefs: [] }), v54: clone(x.v54 || {}) })); tx.ready[client.role] = true;
      const payload = { type: "simultaneousTriggerChainOrderAccepted", protocol: PROTOCOLS.TRIGGER_CHAIN, txId: tx.id, role: client.role, batch: publicTriggerTx(tx), authority: D.authority(), authoritySummary: authoritySummary(room) }; D.broadcast(room, payload); log(room, "triggerChainOrder", { txId: tx.id, role: client.role, count: items.length });
    } catch (e) { reject(client, room, "simultaneousTriggerChainRejected", msg, e.message || e); }
  }
  function applyGuard(room, chain, tx, placedCount) {
    const settings = room.state.v66.settings, sig = triggerSignature(tx), guard = chain.v66Guard ||= { signatures: [], repeatCount: 0, totalObjects: 0, reason: "" };
    guard.repeatCount = guard.lastSignature === sig ? int(guard.repeatCount) + 1 : 1; guard.lastSignature = sig; guard.signatures.push(sig); if (guard.signatures.length > 64) guard.signatures.shift(); guard.totalObjects = int(guard.totalObjects) + placedCount;
    let reason = "";
    if (guard.repeatCount >= int(settings.repeatLimit, 2, 20)) reason = "repeatSignatureLimit";
    else if (chain.waves.length >= int(settings.maxWaves, 2, 100)) reason = "maxWaves";
    else if (guard.totalObjects >= int(settings.maxChainObjects, 10, 1000)) reason = "maxChainObjects";
    if (guard.resumeOneWave) { delete guard.resumeOneWave; reason = "manualSingleWavePause"; }
    if (reason) {
      guard.reason = reason; chain.status = "loopPaused"; const incident = { id: uid("guard"), chainId: chain.id, waveIndex: tx.waveIndex, reason, signature: sig, repeatCount: guard.repeatCount, totalObjects: guard.totalObjects, at: new Date().toISOString() };
      room.state.v66.incidents.unshift(incident); if (room.state.v66.incidents.length > 200) room.state.v66.incidents.length = 200; room.state.v66.guardRev++; return incident;
    }
    return null;
  }
  function handleTriggerCommit(client, room, msg) {
    const r = ensureRuntime(room), tx = r.triggerTx;
    try {
      verify(client, room, msg, PROTOCOLS.TRIGGER_CHAIN); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (tx.baseRev !== room.rev) throw new Error("staleRev"); if (!tx.ready.A || !tx.ready.B) throw new Error("triggerOrdersIncomplete");
      const chain = chainById(room, tx.chainId); if (!chain) throw new Error("chainMissing"); const backup = snapshot(room);
      try {
        const placed = [], sequence = [tx.activeRole, other(tx.activeRole)];
        for (const role of sequence) for (const item of tx.orders[role]) {
          const c = tx.candidates.find(x => x.id === item.triggerId); if (!c) throw new Error("triggerCandidateMissing");
          const source = findCard(room, c.sourceCardId)?.card || { id: c.sourceCardId, controller: role, owner: role }, condition = evaluateCondition(c.interveningIf, room, source, c.event, role);
          if (!condition.known) throw new Error("interveningIfManualRequired"); if (!condition.value) continue;
          const stackObject = { id: uid("stack-trigger"), name: c.abilityName, type: "Ability", types: ["Ability"], owner: role, controller: role, sourceCardId: c.sourceCardId, sourceName: c.sourceCardName, targetIds: unique(item.targets?.cardIds), targetPlayerIds: unique(item.targets?.playerIds, 2), targetZoneRefs: unique(item.targets?.zoneRefs), autoEffects: clone(c.autoEffects), resolveChecklist: clone(c.resolveChecklist), resolveNote: c.resolveNote, v55Trigger: { event: clone(c.event), delayed: false, abilityId: c.abilityId, interveningIf: clone(c.interveningIf), v65ChainId: chain.id, v65WaveIndex: tx.waveIndex } };
          room.state.stack.push(stackObject); placed.push(stackObject.id);
        }
        chain.processedEventIds.push(...tx.eventIds); chain.processedEventIds = unique(chain.processedEventIds, 1000); chain.pendingEventIds = chain.pendingEventIds.filter(x => !tx.eventIds.includes(x));
        const wave = { index: tx.waveIndex, status: "stacked", selectedCount: placed.length, eventIds: clone(tx.eventIds), stackObjectIds: clone(placed), v66Signature: triggerSignature(tx), at: new Date().toISOString() }; chain.waves.push(wave); chain.status = "awaitingNextWave";
        const incident = applyGuard(room, chain, tx, placed.length); r.triggerTx = null; room.state.v65.chainRev++; const p = proof(room, "v65", "commit", { chainId: chain.id, wave, incident }); finalize(room);
        const summary = { chainId: chain.id, waveIndex: tx.waveIndex, count: placed.length, stackObjectIds: placed, activeRole: tx.activeRole };
        sendCommit(room, client, "simultaneousTriggerChainCommitted", "simultaneousTriggerChainPublicSync", { protocol: PROTOCOLS.TRIGGER_CHAIN, actionNonce: msg.actionNonce, txId: tx.id, chain: publicChain(chain), summary, commitment: p.commitment });
        if (incident) D.broadcast(room, { type: "triggerChainGuardAlert", protocol: PROTOCOLS.TRIGGER_GUARD, rev: room.rev, state: clone(room.state), chain: publicChain(chain), incident: clone(incident), authority: D.authority(), authoritySummary: authoritySummary(room) });
        log(room, "triggerChainCommit", { chainId: chain.id, waveIndex: tx.waveIndex, count: placed.length, paused: !!incident });
      } catch (e) { restore(room, backup, ensureRuntime); throw e; }
    } catch (e) { reject(client, room, "simultaneousTriggerChainRejected", msg, e.message || e); }
  }
  function handleTriggerAction(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.TRIGGER_CHAIN); if (ensureRuntime(room).triggerTx) throw new Error("simultaneousTriggerChainActive"); const chain = chainById(room, msg.chainId); if (!chain) throw new Error("chainMissing"); if (![chain.actorRole, room.state.turn?.active].includes(client.role)) throw new Error("chainNotOwned");
      const action = text(msg.action, 40);
      if (action === "complete") { chain.status = "completed"; chain.completedAt = new Date().toISOString(); }
      else if (action === "pause") { chain.status = "loopPaused"; chain.v66Guard ||= {}; chain.v66Guard.reason = "manualPause"; }
      else if (action === "resume") { if (chain.status !== "loopPaused") throw new Error("chainNotPaused"); chain.status = "awaitingNextWave"; chain.v66Guard ||= {}; chain.v66Guard.resumeOneWave = true; }
      else if (action === "abort") { chain.status = "aborted"; chain.abortedAt = new Date().toISOString(); }
      else if (action === "resetGuard") { chain.v66Guard = { signatures: [], repeatCount: 0, totalObjects: 0, reason: "" }; if (chain.status === "loopPaused") chain.status = "awaitingNextWave"; }
      else throw new Error("chainActionInvalid");
      room.state.v65.chainRev++; room.state.v66.guardRev++; const p = proof(room, "v65", action, { chainId: chain.id }); finalize(room);
      sendCommit(room, client, "simultaneousTriggerChainActionCommitted", "simultaneousTriggerChainPublicSync", { protocol: PROTOCOLS.TRIGGER_CHAIN, action, actionNonce: msg.actionNonce, chain: publicChain(chain), commitment: p.commitment });
    } catch (e) { reject(client, room, "simultaneousTriggerChainRejected", msg, e.message || e); }
  }

  /* ---------- shared loop primitives ---------- */
  function normalizeStep(raw) {
    raw = raw && typeof raw === "object" ? raw : {}; const kind = text(raw.kind, 40), role = isSeat(raw.role) ? raw.role : "A", amount = Math.trunc(Number(raw.amount) || 0);
    if (!["lifeDelta", "poisonDelta", "manaDelta", "counterDelta"].includes(kind)) throw new Error("loopStepUnsupported");
    const out = { kind, role, amount };
    if (kind === "manaDelta") { out.color = ["W", "U", "B", "R", "G", "C"].includes(raw.color) ? raw.color : "C"; }
    if (kind === "counterDelta") { out.cardId = text(raw.cardId, 160); out.counter = text(raw.counter || "counter", 80); if (!out.cardId) throw new Error("counterCardRequired"); }
    return out;
  }
  function applyStep(room, step) {
    const p = publicPlayer(room, step.role);
    if (step.kind === "lifeDelta") p.life = Number(p.life) + step.amount;
    else if (step.kind === "poisonDelta") p.poison = Math.max(0, int(p.poison) + step.amount);
    else if (step.kind === "manaDelta") { const next = int(p.manaPool[step.color]) + step.amount; if (next < 0) throw new Error("manaWouldBecomeNegative"); p.manaPool[step.color] = next; }
    else if (step.kind === "counterDelta") { const f = findCard(room, step.cardId); if (!f) throw new Error("counterCardMissing"); f.card.counters ||= {}; const next = int(f.card.counters[step.counter]) + step.amount; if (next < 0) throw new Error("counterWouldBecomeNegative"); f.card.counters[step.counter] = next; }
  }
  function stopReached(room, cond) {
    cond = cond && typeof cond === "object" ? cond : { kind: "fixed" }; const kind = text(cond.kind || "fixed", 60); if (kind === "fixed") return false;
    const role = isSeat(cond.role) ? cond.role : "A", p = publicPlayer(room, role), value = Number(cond.value || 0);
    if (kind === "playerLifeAtMost") return p.life <= value;
    if (kind === "playerLifeAtLeast") return p.life >= value;
    if (kind === "playerPoisonAtLeast") return p.poison >= value;
    if (kind === "playerPoisonAtMost") return p.poison <= value;
    if (kind === "cardCounterAtLeast" || kind === "cardCounterAtMost") { const f = findCard(room, cond.cardId); if (!f) return false; const n = int(f.card.counters?.[text(cond.counter || "counter", 80)]); return kind.endsWith("AtLeast") ? n >= value : n <= value; }
    if (kind === "gameEnded") return room.state?.v58?.game?.status === "ended";
    return false;
  }
  function validatePlanBase(raw, maxIterations) {
    const iterations = int(raw.iterations, 1, maxIterations); if (!iterations) throw new Error("iterationsInvalid");
    return { label: text(raw.label || "ループ", 160), iterations, preSteps: arr(raw.preSteps).slice(0, MAX_LOOP_STEPS).map(normalizeStep), postSteps: arr(raw.postSteps).slice(0, MAX_LOOP_STEPS).map(normalizeStep), stopCondition: clone(raw.stopCondition || { kind: "fixed" }) };
  }
  function publicLoopTx(tx) { return tx ? { id: tx.id, label: tx.label, proposerRole: tx.proposerRole, responderRole: tx.responderRole, iterations: tx.iterations, approvedIterations: tx.approvedIterations, steps: clone(tx.steps), stopCondition: clone(tx.stopCondition), chainId: tx.chainId, finishChain: tx.finishChain, status: tx.status, createdAt: tx.createdAt, expiresAt: tx.expiresAt } : null; }
  function publicChoiceTx(tx) { return tx ? { id: tx.id, label: tx.label, proposerRole: tx.proposerRole, responderRole: tx.responderRole, iterations: tx.iterations, preSteps: clone(tx.preSteps), postSteps: clone(tx.postSteps), choicePoints: clone(tx.choicePoints), stopCondition: clone(tx.stopCondition), reservation: clone(tx.reservation), status: tx.status, createdAt: tx.createdAt, expiresAt: tx.expiresAt } : null; }
  function publicBranchTx(tx) { return tx ? { id: tx.id, label: tx.label, proposerRole: tx.proposerRole, responderRole: tx.responderRole, iterations: tx.iterations, preSteps: clone(tx.preSteps), postSteps: clone(tx.postSteps), choicePoints: clone(tx.choicePoints), stopCondition: clone(tx.stopCondition), reservation: clone(tx.reservation), status: tx.status, resumeOf: tx.resumeOf || null, createdAt: tx.createdAt, expiresAt: tx.expiresAt } : null; }

  /* ---------- v6.7 optional loop shortcuts ---------- */
  function handleLoopStart(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.LOOP_SHORTCUT); if (anyActive(room)) throw new Error(activeKind(room)); const base = validatePlanBase(msg, MAX_LOOP_ITERATIONS), steps = arr(msg.steps).slice(0, MAX_LOOP_STEPS).map(normalizeStep); if (!steps.length) throw new Error("loopStepsRequired");
      const tx = { id: uid("loopshortcut"), ...base, steps, proposerRole: client.role, proposerClientId: clientId(client), responderRole: other(client.role), responderClientId: seatClientId(room, other(client.role)), approvedIterations: 0, chainId: text(msg.chainId, 160), finishChain: msg.finishChain !== false, status: "awaitingResponse", baseRev: room.rev, createdAt: now(), expiresAt: now() + TX_TTL_MS };
      ensureRuntime(room).loopTx = tx; D.broadcast(room, { type: "loopShortcutProposed", protocol: PROTOCOLS.LOOP_SHORTCUT, proposal: publicLoopTx(tx), authority: D.authority(), authoritySummary: authoritySummary(room) }); log(room, "loopStart", { txId: tx.id, iterations: tx.iterations });
    } catch (e) { reject(client, room, "loopShortcutRejected", msg, e.message || e); }
  }
  function handleLoopRespond(client, room, msg) {
    const tx = ensureRuntime(room).loopTx;
    try {
      verify(client, room, msg, PROTOCOLS.LOOP_SHORTCUT); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (client.role !== tx.responderRole) throw new Error("responderRoleRequired"); if (tx.status !== "awaitingResponse") throw new Error("transactionStateInvalid");
      if (!msg.approve) { ensureRuntime(room).loopTx = null; D.broadcast(room, { type: "loopShortcutDeclined", protocol: PROTOCOLS.LOOP_SHORTCUT, txId: tx.id, reason: text(msg.reason, 160), authority: D.authority(), authoritySummary: authoritySummary(room) }); return; }
      const interrupt = Math.max(0, Math.min(tx.iterations, Math.trunc(Number(msg.interruptAfter) || tx.iterations))); tx.approvedIterations = interrupt || tx.iterations; tx.status = "approved";
      D.broadcast(room, { type: "loopShortcutResponseAccepted", protocol: PROTOCOLS.LOOP_SHORTCUT, proposal: publicLoopTx(tx), authority: D.authority(), authoritySummary: authoritySummary(room) });
    } catch (e) { reject(client, room, "loopShortcutRejected", msg, e.message || e); }
  }
  function handleLoopCommit(client, room, msg) {
    const r = ensureRuntime(room), tx = r.loopTx;
    try {
      verify(client, room, msg, PROTOCOLS.LOOP_SHORTCUT); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (client.role !== tx.proposerRole) throw new Error("proposerRoleRequired"); if (tx.status !== "approved") throw new Error("transactionNotApproved"); const backup = snapshot(room);
      try {
        let applied = 0, stopReason = "requestedIterations"; const limit = Math.min(tx.iterations, tx.approvedIterations || tx.iterations);
        for (let i = 0; i < limit; i++) { for (const step of tx.steps) applyStep(room, step); applied++; if (D.runSba) D.runSba(room); if (stopReached(room, tx.stopCondition)) { stopReason = "stopCondition"; break; } }
        if (tx.chainId && tx.finishChain && applied === tx.iterations) { const chain = chainById(room, tx.chainId); if (chain) { chain.status = "completed"; chain.completedAt = new Date().toISOString(); room.state.v65.chainRev++; } }
        const history = { id: tx.id, label: tx.label, requestedIterations: tx.iterations, appliedIterations: applied, status: applied < tx.iterations ? "interrupted" : "completed", stopReason, proposerRole: tx.proposerRole, responderRole: tx.responderRole, steps: clone(tx.steps), stopCondition: clone(tx.stopCondition), at: new Date().toISOString() };
        const p = proof(room, "v67", "commit", history); history.commitment = p.commitment; room.state.v67.history.unshift(history); if (room.state.v67.history.length > MAX_HISTORY) room.state.v67.history.length = MAX_HISTORY; room.state.v67.shortcutRev++; r.loopTx = null; if (D.recomputeLayers) D.recomputeLayers(room); finalize(room);
        sendCommit(room, client, "loopShortcutCommitted", "loopShortcutPublicSync", { protocol: PROTOCOLS.LOOP_SHORTCUT, txId: tx.id, actionNonce: msg.actionNonce, result: clone(history), commitment: p.commitment }); log(room, "loopCommit", { txId: tx.id, applied });
      } catch (e) { restore(room, backup, ensureRuntime); throw e; }
    } catch (e) { reject(client, room, "loopShortcutRejected", msg, e.message || e); }
  }
  function handleLoopCancel(client, room, msg) {
    const r = ensureRuntime(room), tx = r.loopTx;
    try { verify(client, room, msg, PROTOCOLS.LOOP_SHORTCUT); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (client.role !== tx.proposerRole) throw new Error("proposerRoleRequired"); r.loopTx = null; D.broadcast(room, { type: "loopShortcutCancelled", protocol: PROTOCOLS.LOOP_SHORTCUT, txId: tx.id, reason: text(msg.reason, 160), authority: D.authority(), authoritySummary: authoritySummary(room) }); }
    catch (e) { reject(client, room, "loopShortcutRejected", msg, e.message || e); }
  }

  /* ---------- v6.8 choice loops ---------- */
  function normalizeChoicePoint(raw, iterations, allowCondition = false) {
    raw = raw && typeof raw === "object" ? raw : {}; const id = text(raw.id || uid("choice"), 100), controllerRole = isSeat(raw.controllerRole) ? raw.controllerRole : "A";
    const normalizedOptions = arr(raw.options).slice(0, MAX_OPTIONS).map((o, i) => ({ id: text(o?.id || `option-${i}`, 100), label: text(o?.label || `選択肢${i}`, 140), steps: arr(o?.steps).slice(0, MAX_LOOP_STEPS).map(normalizeStep) }));
    if (normalizedOptions.length < 2) throw new Error("choiceOptionsInsufficient");
    const schedule = Array.isArray(raw.schedule) ? normalizeSchedule(raw.schedule, iterations, normalizedOptions.length) : null;
    const out = { id, label: text(raw.label || id, 140), controllerRole, options: normalizedOptions, schedule };
    if (allowCondition && raw.enabledWhen) out.enabledWhen = { pointId: text(raw.enabledWhen.pointId, 100), optionId: text(raw.enabledWhen.optionId, 100) };
    return out;
  }
  function normalizeSchedule(raw, iterations, optionCount) { const a = arr(raw).map(x => Math.trunc(Number(x))); if (!a.length) throw new Error("choiceScheduleMissing"); while (a.length < iterations) a.push(a[a.length - 1] ?? 0); return a.slice(0, iterations).map(x => { if (!Number.isFinite(x) || x < 0 || x >= optionCount) throw new Error("choiceScheduleInvalid"); return x; }); }
  function normalizeReservation(raw, iterations, pointIds) {
    raw = raw && typeof raw === "object" ? raw : { kind: "none" }; if (raw.kind === "none" || !raw.kind) return { kind: "none" };
    const checkpoint = ["beforeIteration", "afterChoice", "afterIteration"].includes(raw.checkpoint) ? raw.checkpoint : "afterIteration", iteration = int(raw.iteration, 1, iterations), choicePointId = checkpoint === "afterChoice" ? text(raw.choicePointId, 100) : "";
    if (checkpoint === "afterChoice" && !pointIds.includes(choicePointId)) throw new Error("reservationChoicePointInvalid"); return { kind: "response", iteration, checkpoint, choicePointId };
  }
  function prepareChoiceTx(client, room, msg, branch = false, resume = null) {
    const base = validatePlanBase(msg, MAX_CHOICE_ITERATIONS), points = arr(msg.choicePoints).slice(0, MAX_CHOICE_POINTS).map(x => normalizeChoicePoint(x, base.iterations, branch)); if (!points.length) throw new Error("choicePointsRequired");
    const ids = points.map(x => x.id); if (new Set(ids).size !== ids.length) throw new Error("choicePointDuplicate");
    if (branch) for (let i = 0; i < points.length; i++) if (points[i].enabledWhen) { const j = points.findIndex(x => x.id === points[i].enabledWhen.pointId); if (j < 0) throw new Error("branchDependencyMissing"); if (j >= i) throw new Error("branchDependencyMustPrecede"); if (!points[j].options.some(x => x.id === points[i].enabledWhen.optionId)) throw new Error("branchDependencyOptionMissing"); }
    return { id: uid(branch ? "branchloop" : "choiceloop"), ...base, choicePoints: points, proposerRole: client.role, proposerClientId: clientId(client), responderRole: other(client.role), responderClientId: seatClientId(room, other(client.role)), reservation: { kind: "none" }, status: "awaitingResponse", baseRev: room.rev, createdAt: now(), expiresAt: now() + TX_TTL_MS, resumeOf: resume?.id || null };
  }
  function handleChoiceStart(client, room, msg) {
    try { verify(client, room, msg, PROTOCOLS.CHOICE_LOOP); if (anyActive(room)) throw new Error(activeKind(room)); const tx = prepareChoiceTx(client, room, msg, false); ensureRuntime(room).choiceTx = tx; D.broadcast(room, { type: "choiceLoopProposed", protocol: PROTOCOLS.CHOICE_LOOP, proposal: publicChoiceTx(tx), authority: D.authority(), authoritySummary: authoritySummary(room) }); }
    catch (e) { reject(client, room, "choiceLoopRejected", msg, e.message || e); }
  }
  function mergeSchedules(tx, role, schedules) {
    schedules = schedules && typeof schedules === "object" ? schedules : {};
    for (const p of tx.choicePoints) if (p.controllerRole === role) p.schedule = normalizeSchedule(schedules[p.id], tx.iterations, p.options.length);
    for (const p of tx.choicePoints) if (!p.schedule) throw new Error(`choiceScheduleMissing:${p.id}`);
  }
  function handleChoiceRespond(client, room, msg) {
    const tx = ensureRuntime(room).choiceTx;
    try {
      verify(client, room, msg, PROTOCOLS.CHOICE_LOOP); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (client.role !== tx.responderRole) throw new Error("responderRoleRequired"); if (!msg.approve) { ensureRuntime(room).choiceTx = null; D.broadcast(room, { type: "choiceLoopDeclined", protocol: PROTOCOLS.CHOICE_LOOP, txId: tx.id, reason: text(msg.reason, 160), authority: D.authority(), authoritySummary: authoritySummary(room) }); return; }
      mergeSchedules(tx, client.role, msg.choiceSchedules); tx.reservation = normalizeReservation(msg.reservation, tx.iterations, tx.choicePoints.map(x => x.id)); tx.status = "approved"; D.broadcast(room, { type: "choiceLoopResponseAccepted", protocol: PROTOCOLS.CHOICE_LOOP, proposal: publicChoiceTx(tx), authority: D.authority(), authoritySummary: authoritySummary(room) });
    } catch (e) { reject(client, room, "choiceLoopRejected", msg, e.message || e); }
  }
  function reservationHit(reservation, iteration, checkpoint, pointId = "") { return reservation?.kind === "response" && reservation.iteration === iteration && reservation.checkpoint === checkpoint && (checkpoint !== "afterChoice" || reservation.choicePointId === pointId); }
  function executeChoiceLoop(room, tx, branch = false) {
    let completed = 0, interrupted = false, stopReason = "requestedIterations"; const transcript = [], choicesByIteration = [];
    outer: for (let i = 0; i < tx.iterations; i++) {
      const iteration = i + 1, chosen = {};
      if (reservationHit(tx.reservation, iteration, "beforeIteration")) { interrupted = true; stopReason = "responseReservation"; break; }
      for (const s of tx.preSteps) applyStep(room, s);
      for (const point of tx.choicePoints) {
        if (branch && point.enabledWhen && chosen[point.enabledWhen.pointId] !== point.enabledWhen.optionId) continue;
        const idx = point.schedule[i], option = point.options[idx]; if (!option) throw new Error("choiceOptionMissing"); chosen[point.id] = option.id; for (const s of option.steps) applyStep(room, s); transcript.push({ iteration, pointId: point.id, optionId: option.id, optionIndex: idx, controllerRole: point.controllerRole });
        if (reservationHit(tx.reservation, iteration, "afterChoice", point.id)) { interrupted = true; stopReason = "responseReservation"; choicesByIteration.push(chosen); break outer; }
      }
      for (const s of tx.postSteps) applyStep(room, s); completed++; choicesByIteration.push(chosen); if (D.runSba) D.runSba(room); if (stopReached(room, tx.stopCondition)) { stopReason = "stopCondition"; break; }
      if (reservationHit(tx.reservation, iteration, "afterIteration")) { interrupted = true; stopReason = "responseReservation"; break; }
    }
    return { completedIterations: completed, requestedIterations: tx.iterations, interrupted, stopReason, choiceTranscript: transcript, choicesByIteration };
  }
  function handleChoiceCommit(client, room, msg) {
    const r = ensureRuntime(room), tx = r.choiceTx;
    try {
      verify(client, room, msg, PROTOCOLS.CHOICE_LOOP); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (client.role !== tx.proposerRole) throw new Error("proposerRoleRequired"); if (tx.status !== "approved") throw new Error("transactionNotApproved"); mergeSchedules(tx, tx.proposerRole, Object.fromEntries(tx.choicePoints.filter(p => p.controllerRole === tx.proposerRole).map(p => [p.id, p.schedule]))); const backup = snapshot(room);
      try {
        const result = executeChoiceLoop(room, tx, false), history = { id: tx.id, label: tx.label, proposerRole: tx.proposerRole, responderRole: tx.responderRole, ...result, status: result.interrupted ? "interrupted" : "completed", reservation: clone(tx.reservation), at: new Date().toISOString() };
        const p = proof(room, "v68", "commit", history); history.commitment = p.commitment; room.state.v68.history.unshift(history); if (room.state.v68.history.length > MAX_HISTORY) room.state.v68.history.length = MAX_HISTORY; room.state.v68.shortcutRev++;
        let checkpoint = null; if (result.interrupted) { checkpoint = { id: uid("checkpoint"), label: tx.label, priorityRole: tx.responderRole, completedIterations: result.completedIterations, remainingIterations: Math.max(0, tx.iterations - result.completedIterations), reservation: clone(tx.reservation), createdAt: new Date().toISOString() }; room.state.v68.resumeCheckpoint = checkpoint; room.state.turn.priority = tx.responderRole; }
        r.choiceTx = null; if (D.recomputeLayers) D.recomputeLayers(room); finalize(room); sendCommit(room, client, "choiceLoopCommitted", "choiceLoopPublicSync", { protocol: PROTOCOLS.CHOICE_LOOP, txId: tx.id, actionNonce: msg.actionNonce, result: history, checkpoint, commitment: p.commitment });
      } catch (e) { restore(room, backup, ensureRuntime); throw e; }
    } catch (e) { reject(client, room, "choiceLoopRejected", msg, e.message || e); }
  }
  function handleChoiceCancel(client, room, msg) { const r = ensureRuntime(room), tx = r.choiceTx; try { verify(client, room, msg, PROTOCOLS.CHOICE_LOOP); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (client.role !== tx.proposerRole) throw new Error("proposerRoleRequired"); r.choiceTx = null; D.broadcast(room, { type: "choiceLoopCancelled", protocol: PROTOCOLS.CHOICE_LOOP, txId: tx.id, reason: text(msg.reason, 160), authority: D.authority(), authoritySummary: authoritySummary(room) }); } catch (e) { reject(client, room, "choiceLoopRejected", msg, e.message || e); } }
  function handleCheckpointAck(client, room, msg) {
    try { verify(client, room, msg, PROTOCOLS.CHOICE_LOOP); const cp = room.state.v68.resumeCheckpoint; if (!cp || String(msg.checkpointId) !== cp.id) throw new Error("checkpointMissing"); if (client.role !== cp.priorityRole) throw new Error("checkpointRoleMismatch"); room.state.v68.resumeCheckpoint = null; room.state.v68.shortcutRev++; finalize(room); sendCommit(room, client, "choiceLoopCheckpointAcknowledged", "choiceLoopPublicSync", { protocol: PROTOCOLS.CHOICE_LOOP, checkpointId: cp.id, actionNonce: msg.actionNonce }); } catch (e) { reject(client, room, "choiceLoopRejected", msg, e.message || e); }
  }

  /* ---------- v6.9 branching loops ---------- */
  function handleBranchStart(client, room, msg) { try { verify(client, room, msg, PROTOCOLS.BRANCH_LOOP); if (anyActive(room)) throw new Error(activeKind(room)); const tx = prepareChoiceTx(client, room, msg, true); ensureRuntime(room).branchTx = tx; D.broadcast(room, { type: "branchLoopProposed", protocol: PROTOCOLS.BRANCH_LOOP, proposal: publicBranchTx(tx), authority: D.authority(), authoritySummary: authoritySummary(room) }); } catch (e) { reject(client, room, "branchLoopRejected", msg, e.message || e); } }
  function handleBranchRespond(client, room, msg) {
    const tx = ensureRuntime(room).branchTx;
    try { verify(client, room, msg, PROTOCOLS.BRANCH_LOOP); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (client.role !== tx.responderRole) throw new Error("responderRoleRequired"); if (!msg.approve) { ensureRuntime(room).branchTx = null; D.broadcast(room, { type: "branchLoopDeclined", protocol: PROTOCOLS.BRANCH_LOOP, txId: tx.id, reason: text(msg.reason, 160), authority: D.authority(), authoritySummary: authoritySummary(room) }); return; } mergeSchedules(tx, client.role, msg.choiceSchedules); tx.reservation = normalizeReservation(msg.reservation || { kind: "none" }, tx.iterations, tx.choicePoints.map(x => x.id)); if (tx.reservation.checkpoint === "afterChoice") throw new Error("branchMidIterationReservationUnsupported"); tx.status = "approved"; D.broadcast(room, { type: "branchLoopAccepted", protocol: PROTOCOLS.BRANCH_LOOP, proposal: publicBranchTx(tx), authority: D.authority(), authoritySummary: authoritySummary(room) }); } catch (e) { reject(client, room, "branchLoopRejected", msg, e.message || e); }
  }
  function handleBranchCommit(client, room, msg) {
    const r = ensureRuntime(room), tx = r.branchTx;
    try {
      verify(client, room, msg, PROTOCOLS.BRANCH_LOOP); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (client.role !== tx.proposerRole) throw new Error("proposerRoleRequired"); if (tx.status !== "approved") throw new Error("transactionNotApproved"); for (const p of tx.choicePoints) if (!p.schedule) throw new Error(`choiceScheduleMissing:${p.id}`); const backup = snapshot(room);
      try {
        const result = executeChoiceLoop(room, tx, true), history = { id: tx.id, label: tx.label, proposerRole: tx.proposerRole, responderRole: tx.responderRole, ...result, status: result.interrupted ? "interrupted" : "completed", reservation: clone(tx.reservation), at: new Date().toISOString() };
        const p = proof(room, "v69", "commit", history); history.commitment = p.commitment; room.state.v69.history.unshift(history); if (room.state.v69.history.length > MAX_HISTORY) room.state.v69.history.length = MAX_HISTORY; room.state.v69.rev++;
        if (result.interrupted || result.completedIterations < tx.iterations) { const remaining = Math.max(0, tx.iterations - result.completedIterations); room.state.v69.resumeRecipe = remaining ? { id: uid("resume"), sourceTxId: tx.id, label: tx.label, remainingIterations: remaining, proposerRole: tx.proposerRole, responderRole: tx.responderRole, preSteps: clone(tx.preSteps), postSteps: clone(tx.postSteps), choicePoints: clone(tx.choicePoints).map(p => ({ ...p, schedule: p.schedule.slice(result.completedIterations) })), stopCondition: clone(tx.stopCondition), createdAt: new Date().toISOString() } : null; } else room.state.v69.resumeRecipe = null;
        r.branchTx = null; if (D.recomputeLayers) D.recomputeLayers(room); finalize(room); sendCommit(room, client, "branchLoopCommitted", "branchLoopPublicSync", { protocol: PROTOCOLS.BRANCH_LOOP, txId: tx.id, actionNonce: msg.actionNonce, result: history, commitment: p.commitment });
      } catch (e) { restore(room, backup, ensureRuntime); throw e; }
    } catch (e) { reject(client, room, "branchLoopRejected", msg, e.message || e); }
  }
  function handleBranchRepropose(client, room, msg) {
    try {
      verify(client, room, msg, PROTOCOLS.BRANCH_LOOP); if (anyActive(room)) throw new Error(activeKind(room)); const rec = room.state.v69.resumeRecipe; if (!rec) throw new Error("resumeRecipeMissing"); if (client.role !== rec.proposerRole) throw new Error("proposerRoleRequired"); const iterations = int(msg.iterations || rec.remainingIterations, 1, rec.remainingIterations); const tx = { id: uid("branchloop"), label: rec.label, iterations, preSteps: clone(rec.preSteps), postSteps: clone(rec.postSteps), choicePoints: clone(rec.choicePoints).map(p => ({ ...p, schedule: arr(p.schedule).slice(0, iterations) })), stopCondition: clone(rec.stopCondition), proposerRole: rec.proposerRole, proposerClientId: clientId(client), responderRole: rec.responderRole, responderClientId: seatClientId(room, rec.responderRole), reservation: { kind: "none" }, status: "awaitingResponse", baseRev: room.rev, createdAt: now(), expiresAt: now() + TX_TTL_MS, resumeOf: rec.id };
      ensureRuntime(room).branchTx = tx; D.broadcast(room, { type: "branchLoopProposed", protocol: PROTOCOLS.BRANCH_LOOP, proposal: publicBranchTx(tx), authority: D.authority(), authoritySummary: authoritySummary(room) });
    } catch (e) { reject(client, room, "branchLoopRejected", msg, e.message || e); }
  }
  function handleBranchCancel(client, room, msg) { const r = ensureRuntime(room), tx = r.branchTx; try { verify(client, room, msg, PROTOCOLS.BRANCH_LOOP); if (!tx || String(msg.txId) !== tx.id) throw new Error("transactionNotFound"); if (client.role !== tx.proposerRole) throw new Error("proposerRoleRequired"); r.branchTx = null; D.broadcast(room, { type: "branchLoopCancelled", protocol: PROTOCOLS.BRANCH_LOOP, txId: tx.id, authority: D.authority(), authoritySummary: authoritySummary(room) }); } catch (e) { reject(client, room, "branchLoopRejected", msg, e.message || e); } }

  function cancelClientTransactions(room, id) {
    const r = ensureRuntime(room), cid = String(id || "");
    for (const key of ["triggerTx", "loopTx", "choiceTx", "branchTx"]) { const tx = r[key]; if (tx && (tx.actorClientId === cid || tx.proposerClientId === cid || tx.responderClientId === cid || Object.values(tx.participantClientIds || {}).includes(cid))) r[key] = null; }
  }
  function handle(client, room, msg) {
    switch (msg.type) {
      case "simultaneousTriggerChainStart": handleTriggerStart(client, room, msg); return true;
      case "simultaneousTriggerChainOrder": handleTriggerOrder(client, room, msg); return true;
      case "simultaneousTriggerChainCommit": handleTriggerCommit(client, room, msg); return true;
      case "simultaneousTriggerChainAction": handleTriggerAction(client, room, msg); return true;
      case "loopShortcutStart": handleLoopStart(client, room, msg); return true;
      case "loopShortcutRespond": handleLoopRespond(client, room, msg); return true;
      case "loopShortcutCommit": handleLoopCommit(client, room, msg); return true;
      case "loopShortcutCancel": handleLoopCancel(client, room, msg); return true;
      case "choiceLoopStart": handleChoiceStart(client, room, msg); return true;
      case "choiceLoopRespond": handleChoiceRespond(client, room, msg); return true;
      case "choiceLoopCommit": handleChoiceCommit(client, room, msg); return true;
      case "choiceLoopCancel": handleChoiceCancel(client, room, msg); return true;
      case "choiceLoopCheckpointAcknowledge": handleCheckpointAck(client, room, msg); return true;
      case "branchLoopStart": handleBranchStart(client, room, msg); return true;
      case "branchLoopRespond": handleBranchRespond(client, room, msg); return true;
      case "branchLoopCommit": handleBranchCommit(client, room, msg); return true;
      case "branchLoopRepropose": handleBranchRepropose(client, room, msg); return true;
      case "branchLoopCancel": handleBranchCancel(client, room, msg); return true;
      default: return false;
    }
  }

  return { PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES, ensureRoom(room) { ensureRuntime(room); return room.state?.v65 ? ensureState(room) : room.v65v69; }, ensureState, anyActive, activeKind, authoritySummary, cancelClientTransactions, handle, preResolveStackObject, evaluateCondition, applyStep, stopReached };
}

module.exports = { PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES, createEngine };
