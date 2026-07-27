"use strict";

const crypto = require("crypto");

const PROTOCOLS = Object.freeze({
  UNDO: "cpt-v7.0",
  CORRECTION: "cpt-v7.1",
  REPLAY: "cpt-v7.2",
  REPORT: "cpt-v7.3",
  CHAPTER: "cpt-v7.4",
});

const AUTHORITY_FLAGS = Object.freeze({
  undoProtocol: PROTOCOLS.UNDO,
  serverActionHistoryV70: true,
  serverAgreedRollbackV70: true,
  serverPrivateRollbackV70: true,
  correctionProtocol: PROTOCOLS.CORRECTION,
  serverRollbackDiffV71: true,
  serverKnowledgeWarningsV71: true,
  serverPartialRepairsV71: true,
  serverRepairProofsV71: true,
  replayProtocol: PROTOCOLS.REPLAY,
  serverReplayTimelineV72: true,
  serverSafeReplayFramesV72: true,
  serverAuditExportV72: true,
  serverAuditCommitmentsV72: true,
  reportProtocol: PROTOCOLS.REPORT,
  serverReplayPlaylistV73: true,
  serverReplayCategoryFiltersV73: true,
  serverMatchReportV73: true,
  serverReportCommitmentsV73: true,
  chapterProtocol: PROTOCOLS.CHAPTER,
  serverReplayChaptersV74: true,
  serverHighlightExtractionV74: true,
  serverShareSummaryV74: true,
  serverShareSummaryCommitmentsV74: true,
});

const MESSAGE_TYPES = Object.freeze([
  "undoHistoryRequest", "undoAgreementStart", "undoAgreementRespond", "undoAgreementCommit",
  "undoDiffRequest", "repairAgreementStart", "repairAgreementRespond", "repairAgreementCommit",
  "replayTimelineRequest", "replayFrameRequest", "replayAuditExport",
  "replayPlaylistRequest", "replayReportExport",
  "replayChapterRequest", "replayShareSummaryExport",
]);

const SEATS = Object.freeze(["A", "B"]);
const SEAT_SET = new Set(SEATS);
const PUBLIC_ZONES = Object.freeze(["creatures", "lands", "others", "graveyard", "exile", "command"]);
const ALL_ZONES = Object.freeze(["hand", "library", "sideboard", ...PUBLIC_ZONES]);
const CATEGORIES = Object.freeze(["initial", "turn", "cast", "ability", "combat", "life", "zone", "trigger", "loop", "rollback", "repair", "system", "other"]);
const MAX_NONCES = 4096;
const MAX_SNAPSHOTS = 96;
const MAX_PUBLIC_CHANGES = 200;
const MAX_REPAIR_OPTIONS = 20;
const MAX_EXPORT_HISTORY = 40;
const TX_TTL_MS = 3 * 60 * 1000;

function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function now() { return Date.now(); }
function uid(prefix = "id") { return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(7).toString("hex")}`; }
function text(v, max = 240) { return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, "").slice(0, max); }
function int(v, min = 0, max = Number.MAX_SAFE_INTEGER) { return Math.max(min, Math.min(max, Math.trunc(Number(v) || 0))); }
function isSeat(v) { return SEAT_SET.has(v); }
function other(role) { return role === "A" ? "B" : "A"; }
function clientId(client) { return String(client?.id || client?.clientId || ""); }
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (!v || typeof v !== "object") return v;
  const out = {};
  for (const k of Object.keys(v).sort()) out[k] = stable(v[k]);
  return out;
}
function stableString(v) { return JSON.stringify(stable(v)); }
function sha256(v) { return crypto.createHash("sha256").update(typeof v === "string" ? v : stableString(v)).digest("hex"); }
function fnv1a32(v) {
  const s = typeof v === "string" ? v : stableString(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return (`00000000${h.toString(16)}`).slice(-8);
}
function arr(v) { return Array.isArray(v) ? v : []; }
function same(a, b) { return stableString(a) === stableString(b); }
function cardId(c) { return String(c?.id || c?.objectId || c?.v60ObjectKey || ""); }
function cardName(c) { return text(c?.v60Characteristics?.name || c?.name || c?.displayName || (c?.faceDown ? "裏向きのカード" : "カード"), 120); }
function effectiveTypes(c) {
  const x = c?.v59Effective?.types || c?.v60Characteristics?.types || c?.types || [c?.type];
  return [...new Set((Array.isArray(x) ? x : [x]).map(String).filter(Boolean))].slice(0, 30);
}

function stripAuthorityState(state) {
  const x = clone(state && typeof state === "object" ? state : {});
  for (const k of ["v70", "v71", "v72", "v73", "v74"]) delete x[k];
  return x;
}
function preserveAuthorityState(state) {
  const out = {};
  for (const k of ["v70", "v71", "v72", "v73", "v74"]) if (state?.[k] !== undefined) out[k] = clone(state[k]);
  return out;
}
function applyAuthorityState(state, saved) { for (const [k, v] of Object.entries(saved || {})) state[k] = clone(v); }

function ensureBase(room) {
  room.state = room.state && typeof room.state === "object" ? room.state : { players: { A: {}, B: {} }, stack: [], turn: {} };
  room.state.players ||= {};
  for (const role of SEATS) {
    const p = room.state.players[role] ||= {};
    p.life = Number.isFinite(Number(p.life)) ? Number(p.life) : 20;
    p.poison = int(p.poison);
    p.manaPool = p.manaPool && typeof p.manaPool === "object" ? p.manaPool : {};
    for (const c of ["W", "U", "B", "R", "G", "C"]) p.manaPool[c] = int(p.manaPool[c]);
    for (const z of ALL_ZONES) if (!Array.isArray(p[z])) p[z] = [];
  }
  if (!Array.isArray(room.state.stack)) room.state.stack = [];
  room.state.turn = room.state.turn && typeof room.state.turn === "object" ? room.state.turn : {};
  room.state.turn.active = isSeat(room.state.turn.active) ? room.state.turn.active : "A";
  room.state.turn.priority = isSeat(room.state.turn.priority) ? room.state.turn.priority : room.state.turn.active;
  room.state.turn.number = Math.max(1, int(room.state.turn.number, 1));
  room.state.turn.phase = int(room.state.turn.phase, 0, 30);
  room.privateByRole = room.privateByRole && typeof room.privateByRole === "object" ? room.privateByRole : { A: null, B: null };
  room.privateRevByRole = room.privateRevByRole && typeof room.privateRevByRole === "object" ? room.privateRevByRole : { A: 0, B: 0 };
  return room.state;
}

function ensureAuthorityState(room) {
  ensureBase(room);
  const s = room.state;
  s.v70 = s.v70 && typeof s.v70 === "object" ? s.v70 : {};
  Object.assign(s.v70, {
    schema: 1, protocol: PROTOCOLS.UNDO,
    rev: int(s.v70.rev), currentSnapshotId: text(s.v70.currentSnapshotId, 100),
    history: Array.isArray(s.v70.history) ? s.v70.history : [],
    lastRollback: s.v70.lastRollback && typeof s.v70.lastRollback === "object" ? s.v70.lastRollback : null,
    settings: { maxSnapshots: 48, requireOpponentConsent: true, warnKnowledgeChanges: true, ...(s.v70.settings || {}) },
  });
  s.v71 = s.v71 && typeof s.v71 === "object" ? s.v71 : {};
  Object.assign(s.v71, {
    schema: 1, protocol: PROTOCOLS.CORRECTION,
    rev: int(s.v71.rev), lastPreview: s.v71.lastPreview && typeof s.v71.lastPreview === "object" ? s.v71.lastPreview : null,
    lastRepair: s.v71.lastRepair && typeof s.v71.lastRepair === "object" ? s.v71.lastRepair : null,
    history: Array.isArray(s.v71.history) ? s.v71.history : [],
    settings: { requireOpponentConsent: true, requireKnowledgeAcknowledgement: true, allowPrivateRepairs: false, maxRepairFields: 20, ...(s.v71.settings || {}) },
  });
  s.v72 = s.v72 && typeof s.v72 === "object" ? s.v72 : {};
  Object.assign(s.v72, {
    schema: 1, protocol: PROTOCOLS.REPLAY, rev: int(s.v72.rev),
    timeline: Array.isArray(s.v72.timeline) ? s.v72.timeline : [],
    lastFrame: s.v72.lastFrame && typeof s.v72.lastFrame === "object" ? s.v72.lastFrame : null,
    lastExport: s.v72.lastExport && typeof s.v72.lastExport === "object" ? s.v72.lastExport : null,
    exportHistory: Array.isArray(s.v72.exportHistory) ? s.v72.exportHistory : [],
    settings: { maxFrames: 48, includeOwnPrivateSummary: true, auditPublicOnly: true, ...(s.v72.settings || {}) },
  });
  s.v73 = s.v73 && typeof s.v73 === "object" ? s.v73 : {};
  Object.assign(s.v73, {
    schema: 1, protocol: PROTOCOLS.REPORT, rev: int(s.v73.rev),
    settings: { speedMs: 900, categories: CATEGORIES.slice(), ...(s.v73.settings || {}) },
    lastReport: s.v73.lastReport && typeof s.v73.lastReport === "object" ? s.v73.lastReport : null,
    reportHistory: Array.isArray(s.v73.reportHistory) ? s.v73.reportHistory : [],
  });
  s.v74 = s.v74 && typeof s.v74 === "object" ? s.v74 : {};
  Object.assign(s.v74, {
    schema: 1, protocol: PROTOCOLS.CHAPTER, rev: int(s.v74.rev),
    settings: { categories: CATEGORIES.slice(), minHighlightScore: 15, chapterMode: "turn", ...(s.v74.settings || {}) },
    lastShare: s.v74.lastShare && typeof s.v74.lastShare === "object" ? s.v74.lastShare : null,
    shareHistory: Array.isArray(s.v74.shareHistory) ? s.v74.shareHistory : [],
  });
  return s;
}

function clonePrivateEntry(entry) {
  if (!entry) return null;
  return { state: clone(entry.state || null), rev: int(entry.rev), updatedAt: Number(entry.updatedAt) || 0, clientId: "", hash: text(entry.hash, 128), sha256: text(entry.sha256, 128) };
}
function privateStateHash(entry) { return sha256(entry?.state || null); }
function privateSnapshot(room) { return { A: clonePrivateEntry(room.privateByRole?.A), B: clonePrivateEntry(room.privateByRole?.B) }; }

function getPath(obj, path) {
  let cur = obj;
  for (const p of path) { if (cur == null) return undefined; cur = cur[p]; }
  return cur;
}
function setPath(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = typeof path[i + 1] === "number" ? [] : {};
    cur = cur[p];
  }
  cur[path[path.length - 1]] = clone(value);
}
function primitive(v) { return v == null || ["string", "number", "boolean"].includes(typeof v); }
function shortValue(v) {
  if (primitive(v)) return v;
  if (Array.isArray(v)) return { count: v.length };
  if (v && typeof v === "object") return { keys: Object.keys(v).slice(0, 12), count: Object.keys(v).length };
  return String(v);
}

function publicDiff(current, target, limit = MAX_PUBLIC_CHANGES) {
  const changes = [];
  function add(kind, label, path, a, b, repairable = false) {
    if (changes.length >= limit || same(a, b)) return;
    changes.push({ kind, label, path: path.join("."), pathArray: path.slice(), current: shortValue(a), target: shortValue(b), rawCurrent: clone(a), rawTarget: clone(b), repairable });
  }
  const cp = current?.players || {}, tp = target?.players || {};
  for (const role of SEATS) {
    for (const key of ["life", "poison"]) add(key, `${role}の${key === "life" ? "ライフ" : "毒カウンター"}`, ["players", role, key], cp?.[role]?.[key], tp?.[role]?.[key], true);
    for (const color of ["W", "U", "B", "R", "G", "C"]) add("mana", `${role}の${color}マナ`, ["players", role, "manaPool", color], cp?.[role]?.manaPool?.[color] || 0, tp?.[role]?.manaPool?.[color] || 0, true);
    for (const zone of PUBLIC_ZONES) {
      const a = arr(cp?.[role]?.[zone]), b = arr(tp?.[role]?.[zone]);
      const aid = a.map(cardId), bid = b.map(cardId);
      if (!same(aid, bid)) add("zone", `${role}.${zone}`, ["players", role, zone], aid, bid, false);
      const mapA = new Map(a.map(c => [cardId(c), c]));
      const mapB = new Map(b.map(c => [cardId(c), c]));
      for (const id of new Set([...mapA.keys(), ...mapB.keys()])) {
        const ca = mapA.get(id), cb = mapB.get(id);
        if (!ca || !cb) continue;
        for (const [key, jp] of [["tapped", "タップ"], ["damage", "ダメージ"], ["faceDown", "裏向き"], ["v62PhasedOut", "フェイズ・アウト"]]) add("card", `${cardName(cb || ca)}の${jp}`, ["players", role, zone, a.indexOf(ca), key], ca?.[key], cb?.[key], false);
        if (!same(ca?.counters || {}, cb?.counters || {})) add("card", `${cardName(cb || ca)}のカウンター`, ["players", role, zone, a.indexOf(ca), "counters"], ca?.counters || {}, cb?.counters || {}, false);
      }
    }
  }
  for (const [key, label, repairable] of [["active", "アクティブプレイヤー", true], ["priority", "優先権", true], ["number", "ターン番号", true], ["phase", "フェイズ", true]]) add("turn", label, ["turn", key], current?.turn?.[key], target?.turn?.[key], repairable);
  const sa = arr(current?.stack).map(cardId), sb = arr(target?.stack).map(cardId);
  if (!same(sa, sb)) add("stack", "スタック", ["stack"], sa, sb, false);
  return { changes, summary: { totalChanges: changes.length, repairableChanges: changes.filter(x => x.repairable).length } };
}

function privateZoneInfo(entry) {
  const s = entry?.state || null;
  if (!s) return { hand: [], library: [], sideboard: [], faceDown: {} };
  const z = s.zones || s.players || {};
  const hand = arr(z.hand || z?.A?.hand || z?.B?.hand);
  const library = arr(z.library || z?.A?.library || z?.B?.library);
  const sideboard = arr(z.sideboard || z?.A?.sideboard || z?.B?.sideboard);
  return {
    hand: hand.map(c => ({ id: cardId(c), name: cardName(c) })),
    library: library.map(c => ({ id: cardId(c), name: cardName(c) })),
    sideboard: sideboard.map(c => ({ id: cardId(c), name: cardName(c) })),
    faceDown: clone(s.faceDown || {}),
  };
}
function privateSummary(entry, includeNames = true) {
  const z = privateZoneInfo(entry);
  const conv = list => includeNames ? list : list.map(x => ({ id: x.id ? sha256(x.id).slice(0, 12) : "", name: "非公開" }));
  return {
    hand: conv(z.hand), libraryTop: conv(z.library.slice(0, 5)), libraryCount: z.library.length,
    sideboard: conv(z.sideboard), faceDownCounts: Object.fromEntries(Object.entries(z.faceDown || {}).map(([k, v]) => [k, arr(v).length])),
  };
}
function knowledgeExposure(currentPrivate, targetPrivate, requesterRole) {
  let risk = "none"; const warnings = []; let hiddenChanged = false;
  for (const role of SEATS) {
    const c = privateZoneInfo(currentPrivate?.[role]), t = privateZoneInfo(targetPrivate?.[role]);
    const ids = x => x.map(v => v.id || v.name);
    const handChanged = !same(ids(c.hand), ids(t.hand));
    const libraryOrderChanged = !same(ids(c.library), ids(t.library));
    const sideChanged = !same(ids(c.sideboard), ids(t.sideboard));
    const facedChanged = !same(c.faceDown, t.faceDown);
    if (handChanged || libraryOrderChanged || sideChanged || facedChanged) hiddenChanged = true;
    if (libraryOrderChanged) { risk = "high"; warnings.push(`${role}のライブラリー順または既知の上部情報が変わります`); }
    if (handChanged) { risk = "high"; warnings.push(`${role}の手札内容が変わります`); }
    if ((sideChanged || facedChanged) && risk !== "high") risk = "medium";
    if (sideChanged) warnings.push(`${role}のサイドボード秘密情報が変わります`);
    if (facedChanged) warnings.push(`${role}の裏向き秘密情報が変わります`);
  }
  return {
    riskLevel: risk, hiddenChanged, warnings: [...new Set(warnings)].slice(0, 20),
    requiresAcknowledgement: risk !== "none",
    requesterPrivate: isSeat(requesterRole) ? { role: requesterRole, current: privateSummary(currentPrivate?.[requesterRole], true), target: privateSummary(targetPrivate?.[requesterRole], true) } : null,
  };
}

function inferCategory(meta, previousGame, gameState) {
  const explicit = String(meta?.category || "").toLowerCase();
  if (CATEGORIES.includes(explicit)) return explicit;
  const label = `${meta?.label || ""} ${meta?.action || ""} ${meta?.kind || ""}`.toLowerCase();
  if (/rollback|巻き戻/.test(label)) return "rollback";
  if (/repair|修正|訂正/.test(label)) return "repair";
  if (/combat|attack|block|戦闘|攻撃|ブロック/.test(label)) return "combat";
  if (/cast|spell|唱え|呪文/.test(label)) return "cast";
  if (/ability|能力/.test(label)) return "ability";
  if (/trigger|誘発/.test(label)) return "trigger";
  if (/loop|ループ/.test(label)) return "loop";
  if (/turn|phase|priority|ターン|フェイズ|優先権/.test(label)) return "turn";
  if (/life|ライフ|poison|毒/.test(label)) return "life";
  if (/zone|graveyard|exile|draw|shuffle|領域|墓地|追放|ドロー|シャッフル/.test(label)) return "zone";
  if (previousGame) {
    if (!same(previousGame.turn, gameState.turn)) return "turn";
    for (const r of SEATS) if (previousGame.players?.[r]?.life !== gameState.players?.[r]?.life || previousGame.players?.[r]?.poison !== gameState.players?.[r]?.poison) return "life";
    if (!same(previousGame.stack, gameState.stack)) return "cast";
  }
  return meta?.initial ? "initial" : "other";
}
function inferLabel(meta, category) {
  if (meta?.label) return text(meta.label, 160);
  if (meta?.action) return text(meta.action, 160);
  const labels = { initial: "対戦開始", turn: "ターン進行", cast: "呪文／スタック操作", ability: "能力処理", combat: "戦闘処理", life: "ライフ／毒変更", zone: "領域移動", trigger: "誘発処理", loop: "ループ処理", rollback: "合意巻き戻し", repair: "部分修正", system: "システム処理", other: "ゲーム操作" };
  return labels[category] || "ゲーム操作";
}

function publicCardRows(game) {
  const cards = [];
  for (const role of SEATS) {
    for (const zone of PUBLIC_ZONES) for (const c of arr(game?.players?.[role]?.[zone])) {
      const hidden = !!(c?.faceDown || c?.v48Redacted);
      cards.push({
        id: hidden ? sha256(cardId(c) || `${role}-${zone}-${cards.length}`).slice(0, 16) : cardId(c),
        name: hidden ? "裏向きのカード" : cardName(c), role, zone,
        types: hidden ? ["Creature"] : effectiveTypes(c),
        tapped: !!c?.tapped, damage: Number(c?.damage) || 0,
        faceDown: hidden, phasedOut: !!c?.v62PhasedOut,
      });
    }
  }
  for (const c of arr(game?.stack)) {
    const hidden = !!(c?.faceDown || c?.v48Redacted);
    cards.push({ id: hidden ? sha256(cardId(c) || `stack-${cards.length}`).slice(0, 16) : cardId(c), name: hidden ? "裏向きのカード" : cardName(c), role: isSeat(c?.controller) ? c.controller : "A", zone: "stack", types: hidden ? ["Unknown"] : effectiveTypes(c), tapped: false, damage: 0, faceDown: hidden, phasedOut: false });
  }
  return cards;
}
function boardView(game) {
  const players = {};
  for (const role of SEATS) {
    const p = game?.players?.[role] || {};
    players[role] = {
      life: Number(p.life) || 0, poison: int(p.poison), manaPool: clone(p.manaPool || {}),
      zones: Object.fromEntries(ALL_ZONES.map(z => [z, arr(p[z]).length])),
    };
  }
  return { players, stackCount: arr(game?.stack).length, turn: clone(game?.turn || {}), cards: publicCardRows(game) };
}

function htmlEsc(s) { return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
function categoryCounts(rows) { const out = Object.fromEntries(CATEGORIES.map(c => [c, 0])); for (const r of rows) out[CATEGORIES.includes(r.category) ? r.category : "other"]++; return out; }
function scoreHighlight(row) {
  const c = row.category; let score = 0;
  const n = int(row.diffSummary?.totalChanges);
  score += Math.min(35, n * 4);
  if (c === "combat") score += 28;
  if (c === "rollback" || c === "repair") score += 35;
  if (c === "cast" || c === "trigger" || c === "loop") score += 18;
  if (row.meta?.hiddenChanged || row.meta?.knowledgeRisk) score += 18;
  const lifeDelta = Math.abs(Number(row.diffSummary?.lifeDeltaA || 0)) + Math.abs(Number(row.diffSummary?.lifeDeltaB || 0));
  score += Math.min(30, lifeDelta * 5);
  return Math.max(0, Math.min(100, score));
}

function createEngine(D) {
  if (!D || typeof D.send !== "function" || typeof D.broadcast !== "function") throw new Error("dependenciesMissing");

  function ensureRuntime(room) {
    if (!room.v70v74 || typeof room.v70v74 !== "object") room.v70v74 = {};
    const r = room.v70v74;
    if (!Array.isArray(r.snapshots)) r.snapshots = [];
    if (!(r.snapshotById instanceof Map)) r.snapshotById = new Map(r.snapshots.map(s => [s.id, s]));
    if (!(r.nonces instanceof Map)) r.nonces = new Map();
    r.undoTx ||= null; r.repairTx ||= null;
    const t = now();
    if (r.undoTx?.expiresAt <= t) r.undoTx = null;
    if (r.repairTx?.expiresAt <= t) r.repairTx = null;
    for (const [k, at] of r.nonces) if (t - at > 30 * 60 * 1000) r.nonces.delete(k);
    while (r.nonces.size > MAX_NONCES) r.nonces.delete(r.nonces.keys().next().value);
    return r;
  }
  function ensureState(room) { ensureAuthorityState(room); ensureRuntime(room); return room.state; }
  function anyActive(room) { const r = ensureRuntime(room); return !!(r.undoTx || r.repairTx); }
  function activeKind(room) { const r = ensureRuntime(room); return r.undoTx ? "undoAgreementActive" : r.repairTx ? "repairAgreementActive" : ""; }

  function nonceKey(client, msg) { return `${clientId(client)}:${String(msg?.actionNonce || "")}`; }
  function validateBase(client, room, msg, protocol, allowSpectator = false) {
    ensureState(room);
    if (String(msg?.protocol || "") !== protocol) throw new Error("protocolMismatch");
    if (!allowSpectator && !isSeat(client?.role)) throw new Error("seatRequired");
    if (typeof msg?.baseRev !== "number" || msg.baseRev !== room.rev) throw new Error("staleRev");
    const nonce = String(msg?.actionNonce || "");
    if (!nonce || nonce.length > 180) throw new Error("actionNonceRequired");
    const r = ensureRuntime(room), key = nonceKey(client, msg);
    if (r.nonces.has(key)) throw new Error("actionNonceReused");
    r.nonces.set(key, now());
  }
  function seatConnected(room, role) { return [...(room.clients?.values?.() || [])].some(c => c?.role === role); }

  function trimSnapshots(room) {
    const r = ensureRuntime(room), configured = Number(room.state?.v70?.settings?.maxSnapshots);
    const max = Number.isFinite(configured) ? Math.max(8, Math.min(MAX_SNAPSHOTS, Math.trunc(configured))) : 48;
    if (r.snapshots.length > max) r.snapshots.splice(0, r.snapshots.length - max);
    r.snapshotById = new Map(r.snapshots.map(s => [s.id, s]));
  }
  function snapshotMeta(room, gameState, previous, meta, hiddenChanged, exposure) {
    const category = inferCategory(meta, previous?.gameState, gameState);
    const diff = previous ? publicDiff(previous.gameState, gameState) : { changes: [], summary: { totalChanges: 0, repairableChanges: 0 } };
    const lifeA0 = Number(previous?.gameState?.players?.A?.life) || Number(gameState?.players?.A?.life) || 0;
    const lifeB0 = Number(previous?.gameState?.players?.B?.life) || Number(gameState?.players?.B?.life) || 0;
    const lifeA = Number(gameState?.players?.A?.life) || 0, lifeB = Number(gameState?.players?.B?.life) || 0;
    return {
      label: inferLabel(meta, category), action: text(meta?.action || meta?.kind || category, 100), category,
      rev: Number(room.rev) || 0, at: new Date().toISOString(), turnNumber: int(gameState?.turn?.number, 1), phase: int(gameState?.turn?.phase),
      priority: isSeat(gameState?.turn?.priority) ? gameState.turn.priority : "", active: isSeat(gameState?.turn?.active) ? gameState.turn.active : "",
      life: { A: lifeA, B: lifeB }, poison: { A: int(gameState?.players?.A?.poison), B: int(gameState?.players?.B?.poison) },
      stackCount: arr(gameState?.stack).length, hiddenChanged: !!hiddenChanged, knowledgeRisk: exposure?.riskLevel || "none",
      publicCommitment: sha256(gameState), privateCommitments: { A: privateStateHash(room.privateByRole?.A), B: privateStateHash(room.privateByRole?.B) },
      detail: text(meta?.detail || meta?.reason || "", 240),
      diffSummary: { ...diff.summary, lifeDeltaA: lifeA - lifeA0, lifeDeltaB: lifeB - lifeB0 },
    };
  }

  function recordSnapshot(room, meta = {}) {
    ensureState(room); const r = ensureRuntime(room);
    const gameState = stripAuthorityState(room.state), privateByRole = privateSnapshot(room), previous = r.snapshots[r.snapshots.length - 1] || null;
    const hiddenChanged = previous ? !same(previous.privateByRole, privateByRole) : !!(privateByRole.A || privateByRole.B);
    const exposure = previous ? knowledgeExposure(privateByRole, previous.privateByRole, null) : { riskLevel: hiddenChanged ? "medium" : "none" };
    const unchanged = previous && same(previous.gameState, gameState) && same(previous.privateByRole, privateByRole);
    if (unchanged && !meta.force) return previous;
    const m = snapshotMeta(room, gameState, previous, meta, hiddenChanged, exposure);
    const id = uid("snap");
    const diff = previous ? publicDiff(previous.gameState, gameState) : { changes: [], summary: { totalChanges: 0, repairableChanges: 0 } };
    const snap = {
      id, gameState, privateByRole, privateRevByRole: clone(room.privateRevByRole || { A: 0, B: 0 }),
      roomRev: Number(room.rev) || 0, createdAt: m.at, meta: m,
      publicChanges: diff.changes.map(x => ({ kind: x.kind, label: x.label, path: x.path, current: x.current, target: x.target })),
      diffSummary: clone(m.diffSummary),
      publicCommitment: m.publicCommitment,
      privateCommitments: clone(m.privateCommitments),
    };
    r.snapshots.push(snap); r.snapshotById.set(id, snap); trimSnapshots(room);
    const historyEntry = { id, ...clone(m), diffSummary: clone(m.diffSummary) };
    room.state.v70.currentSnapshotId = id;
    room.state.v70.rev = int(room.state.v70.rev) + 1;
    room.state.v70.history = r.snapshots.map(x => ({ id: x.id, ...clone(x.meta), diffSummary: clone(x.diffSummary) }));
    room.state.v72.rev = int(room.state.v72.rev) + 1;
    room.state.v72.timeline = room.state.v70.history.map(x => ({ id: x.id, meta: clone(x), diffSummary: clone(x.diffSummary) }));
    D.pushLog?.(room, { kind: "v70Snapshot", snapshotId: id, category: m.category, label: m.label, hiddenChanged });
    return snap;
  }

  function currentSnapshot(room) { const r = ensureRuntime(room); return r.snapshots[r.snapshots.length - 1] || null; }
  function snapshotById(room, id) { const r = ensureRuntime(room); return r.snapshotById.get(String(id || "")) || null; }
  function snapshotIndex(room, id) { return ensureRuntime(room).snapshots.findIndex(s => s.id === id); }

  function undoAuthority(room) {
    ensureState(room); const r = ensureRuntime(room);
    return { protocol: PROTOCOLS.UNDO, rev: int(room.state.v70.rev), currentSnapshotId: room.state.v70.currentSnapshotId, history: clone(room.state.v70.history), lastRollback: clone(room.state.v70.lastRollback), settings: clone(room.state.v70.settings), active: r.undoTx ? publicProposal(r.undoTx) : null };
  }
  function correctionAuthority(room) {
    ensureState(room); const r = ensureRuntime(room);
    return { protocol: PROTOCOLS.CORRECTION, rev: int(room.state.v71.rev), lastPreview: clone(room.state.v71.lastPreview), lastRepair: clone(room.state.v71.lastRepair), history: clone(room.state.v71.history), settings: clone(room.state.v71.settings), active: r.repairTx ? publicProposal(r.repairTx) : null };
  }
  function replayAuthority(room) { ensureState(room); return { protocol: PROTOCOLS.REPLAY, rev: int(room.state.v72.rev), currentSnapshotId: room.state.v70.currentSnapshotId, frameCount: ensureRuntime(room).snapshots.length, lastExport: clone(room.state.v72.lastExport), exportHistory: clone(room.state.v72.exportHistory), settings: clone(room.state.v72.settings) }; }
  function reportAuthority(room) { ensureState(room); return { protocol: PROTOCOLS.REPORT, rev: int(room.state.v73.rev), frameCount: ensureRuntime(room).snapshots.length, lastReport: clone(room.state.v73.lastReport), reportHistory: clone(room.state.v73.reportHistory), settings: clone(room.state.v73.settings) }; }
  function chapterAuthority(room) { ensureState(room); return { protocol: PROTOCOLS.CHAPTER, rev: int(room.state.v74.rev), lastShare: clone(room.state.v74.lastShare), shareHistory: clone(room.state.v74.shareHistory), settings: clone(room.state.v74.settings) }; }
  function authoritySummary(room) { return { undoAuthority: undoAuthority(room), correctionAuthority: correctionAuthority(room), replayAuthority: replayAuthority(room), reportAuthority: reportAuthority(room), chapterAuthority: chapterAuthority(room) }; }
  function publicProposal(tx) { if (!tx) return null; const x = clone(tx); delete x.snapshot; delete x.beforeSnapshot; delete x.previewInternal; return x; }

  function previewFor(room, target, requesterRole) {
    const current = currentSnapshot(room); if (!current || !target) throw new Error("snapshotMissing");
    const d = publicDiff(current.gameState, target.gameState);
    const exposure = knowledgeExposure(current.privateByRole, target.privateByRole, requesterRole);
    const repairOptions = d.changes.filter(x => x.repairable && primitive(x.rawTarget)).slice(0, MAX_REPAIR_OPTIONS).map((x, i) => ({ id: `repair-${i}-${sha256(x.path).slice(0, 8)}`, kind: x.kind, label: x.label, path: x.path, pathArray: x.pathArray, current: clone(x.rawCurrent), target: clone(x.rawTarget) }));
    return {
      targetSnapshotId: target.id, currentSnapshotId: current.id,
      actionsToUndo: Math.max(0, snapshotIndex(room, current.id) - snapshotIndex(room, target.id)),
      target: { id: target.id, ...clone(target.meta) }, current: { id: current.id, ...clone(current.meta) },
      publicSummary: d.summary,
      publicChanges: d.changes.map(x => ({ kind: x.kind, label: x.label, path: x.path, current: x.current, target: x.target })),
      repairOptions,
      exposure,
      generatedAt: new Date().toISOString(),
      currentCommitment: current.publicCommitment, targetCommitment: target.publicCommitment,
    };
  }

  function clearAllTransactions(room) { D.cancelAllTransactions?.(room); const r = ensureRuntime(room); r.undoTx = null; r.repairTx = null; }
  function restoreSnapshot(room, target, meta) {
    const authority = preserveAuthorityState(room.state);
    const previousRev = Number(room.rev) || 0;
    room.state = clone(target.gameState);
    applyAuthorityState(room.state, authority);
    room.privateByRole = { A: clonePrivateEntry(target.privateByRole?.A), B: clonePrivateEntry(target.privateByRole?.B) };
    room.privateRevByRole = clone(target.privateRevByRole || { A: 0, B: 0 });
    clearAllTransactions(room);
    room.rev = previousRev + 1; room.updatedAt = now();
    ensureState(room);
    D.refreshRoomHash?.(room);
    return recordSnapshot(room, { ...meta, force: true });
  }

  function safeSend(client, value) { D.send(client?.ws || client, value); }
  function reject(client, room, msg, family, reason, detail = "") {
    const type = family === "undo" ? "undoAgreementRejected" : family === "repair" ? "repairAgreementRejected" : family === "chapter" ? "replayChapterRejected" : family === "report" ? "replayReportRejected" : "replayAuditRejected";
    safeSend(client, { type, protocol: msg?.protocol || "", actionNonce: String(msg?.actionNonce || ""), txId: String(msg?.txId || ""), reason: String(reason || "rejected"), detail: text(detail, 240), rev: Number(room?.rev) || 0, authoritySummary: room ? authoritySummary(room) : null });
  }

  function handleHistoryRequest(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.UNDO, true);
    safeSend(client, { type: "undoHistorySync", protocol: PROTOCOLS.UNDO, actionNonce: msg.actionNonce, rev: room.rev, undoAuthority: undoAuthority(room), authoritySummary: authoritySummary(room) });
  }
  function startUndo(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.UNDO);
    const r = ensureRuntime(room); if (anyActive(room)) throw new Error(activeKind(room));
    const target = snapshotById(room, msg.targetSnapshotId), current = currentSnapshot(room);
    if (!target) throw new Error("targetSnapshotMissing");
    if (!current || target.id === current.id) throw new Error("alreadyCurrentSnapshot");
    const ti = snapshotIndex(room, target.id), ci = snapshotIndex(room, current.id); if (ti < 0 || ti >= ci) throw new Error("targetMustBeEarlier");
    const responderRole = other(client.role); if (!seatConnected(room, responderRole)) throw new Error("opponentUnavailable");
    const preview = previewFor(room, target, client.role);
    const tx = {
      id: uid("undo"), kind: "undo", status: "awaitingResponse", proposerRole: client.role, responderRole,
      proposerClientId: clientId(client), responderClientId: "", baseRev: room.rev, targetSnapshotId: target.id,
      target: { id: target.id, ...clone(target.meta) }, actionsToUndo: preview.actionsToUndo,
      reason: text(msg.reason || "操作ミスを訂正したい", 400),
      knowledgeRisk: preview.exposure.riskLevel, hiddenChanged: preview.exposure.hiddenChanged,
      warnings: clone(preview.exposure.warnings), createdAt: now(), expiresAt: now() + TX_TTL_MS,
    };
    r.undoTx = tx;
    D.broadcast(room, { type: "undoAgreementProposed", protocol: PROTOCOLS.UNDO, proposal: publicProposal(tx), undoAuthority: undoAuthority(room), authoritySummary: authoritySummary(room) });
    D.pushLog?.(room, { kind: "undoAgreementProposed", txId: tx.id, proposerRole: tx.proposerRole, targetSnapshotId: target.id });
  }
  function respondUndo(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.UNDO);
    const r = ensureRuntime(room), tx = r.undoTx;
    if (!tx || tx.id !== String(msg.txId || "")) throw new Error("undoTransactionMissing");
    if (client.role !== tx.responderRole) throw new Error("responderOnly");
    if (!msg.approve) {
      r.undoTx = null;
      D.broadcast(room, { type: "undoAgreementDeclined", protocol: PROTOCOLS.UNDO, proposal: publicProposal(tx), reason: text(msg.reason || "拒否", 240), undoAuthority: undoAuthority(room), authoritySummary: authoritySummary(room) });
      return;
    }
    if (msg.acknowledgeRollback !== true) throw new Error("rollbackAcknowledgementRequired");
    if (tx.hiddenChanged && msg.acknowledgeKnowledge !== true) throw new Error("knowledgeAcknowledgementRequired");
    tx.status = "accepted"; tx.responderClientId = clientId(client); tx.respondedAt = now();
    D.broadcast(room, { type: "undoAgreementAccepted", protocol: PROTOCOLS.UNDO, proposal: publicProposal(tx), undoAuthority: undoAuthority(room), authoritySummary: authoritySummary(room) });
  }
  function commitUndo(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.UNDO);
    const r = ensureRuntime(room), tx = r.undoTx;
    if (!tx || tx.id !== String(msg.txId || "")) throw new Error("undoTransactionMissing");
    if (client.role !== tx.proposerRole) throw new Error("proposerOnly");
    if (tx.status !== "accepted") throw new Error("undoNotAccepted");
    if (room.rev !== tx.baseRev) throw new Error("staleAgreement");
    const target = snapshotById(room, tx.targetSnapshotId); if (!target) throw new Error("targetSnapshotMissing");
    const before = currentSnapshot(room), oldRev = room.rev;
    const restored = restoreSnapshot(room, target, { category: "rollback", label: `合意巻き戻し: ${tx.target.label || "過去状態"}`, reason: tx.reason, detail: `${tx.actionsToUndo}操作を巻き戻し` });
    ensureState(room);
    const result = { id: uid("rollback-result"), txId: tx.id, fromSnapshotId: before?.id || "", targetSnapshotId: target.id, restoredSnapshotId: restored.id, actionsUndone: tx.actionsToUndo, knowledgeRisk: tx.knowledgeRisk, hiddenChanged: tx.hiddenChanged, oldRev, rev: room.rev, committedAt: new Date().toISOString(), publicCommitment: restored.publicCommitment, privateCommitments: clone(restored.privateCommitments) };
    room.state.v70.lastRollback = clone(result); room.state.v70.rev = int(room.state.v70.rev) + 1;
    r.undoTx = null;
    D.refreshRoomHash?.(room);
    for (const c of room.clients.values()) safeSend(c, { type: "undoAgreementCommitted", protocol: PROTOCOLS.UNDO, rev: room.rev, state: room.state, privateState: D.privateStateFor?.(room, c.role) || null, result, undoAuthority: undoAuthority(room), correctionAuthority: correctionAuthority(room), replayAuthority: replayAuthority(room), authoritySummary: authoritySummary(room) });
    D.pushLog?.(room, { kind: "undoAgreementCommitted", txId: tx.id, actionsUndone: tx.actionsToUndo, rev: room.rev });
  }

  function handleDiffRequest(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.CORRECTION);
    const target = snapshotById(room, msg.targetSnapshotId); if (!target) throw new Error("targetSnapshotMissing");
    const preview = previewFor(room, target, client.role);
    room.state.v71.lastPreview = { targetSnapshotId: target.id, generatedAt: preview.generatedAt, publicSummary: clone(preview.publicSummary), exposure: { riskLevel: preview.exposure.riskLevel, hiddenChanged: preview.exposure.hiddenChanged, warnings: clone(preview.exposure.warnings) } };
    room.state.v71.rev = int(room.state.v71.rev) + 1;
    safeSend(client, { type: "undoDiffPreview", protocol: PROTOCOLS.CORRECTION, actionNonce: msg.actionNonce, rev: room.rev, preview, correctionAuthority: correctionAuthority(room), authoritySummary: authoritySummary(room) });
  }
  function startRepair(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.CORRECTION);
    const r = ensureRuntime(room); if (anyActive(room)) throw new Error(activeKind(room));
    const target = snapshotById(room, msg.targetSnapshotId); if (!target) throw new Error("targetSnapshotMissing");
    const preview = previewFor(room, target, client.role);
    const wanted = new Set(arr(msg.optionIds).map(String));
    const selected = preview.repairOptions.filter(o => wanted.has(o.id)).slice(0, MAX_REPAIR_OPTIONS);
    if (!selected.length) throw new Error("repairOptionsRequired");
    const responderRole = other(client.role); if (!seatConnected(room, responderRole)) throw new Error("opponentUnavailable");
    const tx = {
      id: uid("repair"), kind: "repair", status: "awaitingResponse", proposerRole: client.role, responderRole,
      proposerClientId: clientId(client), baseRev: room.rev, targetSnapshotId: target.id,
      reason: text(msg.reason || "公開情報の誤りを修正", 400), selectedOptions: clone(selected),
      exposure: { riskLevel: preview.exposure.riskLevel, hiddenChanged: preview.exposure.hiddenChanged, warnings: clone(preview.exposure.warnings), requiresAcknowledgement: preview.exposure.riskLevel !== "none" },
      createdAt: now(), expiresAt: now() + TX_TTL_MS,
    };
    r.repairTx = tx;
    D.broadcast(room, { type: "repairAgreementProposed", protocol: PROTOCOLS.CORRECTION, proposal: publicProposal(tx), correctionAuthority: correctionAuthority(room), authoritySummary: authoritySummary(room) });
  }
  function respondRepair(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.CORRECTION);
    const r = ensureRuntime(room), tx = r.repairTx;
    if (!tx || tx.id !== String(msg.txId || "")) throw new Error("repairTransactionMissing");
    if (client.role !== tx.responderRole) throw new Error("responderOnly");
    if (!msg.approve) {
      r.repairTx = null;
      D.broadcast(room, { type: "repairAgreementDeclined", protocol: PROTOCOLS.CORRECTION, proposal: publicProposal(tx), reason: text(msg.reason || "拒否", 240), correctionAuthority: correctionAuthority(room), authoritySummary: authoritySummary(room) });
      return;
    }
    if (msg.acknowledgeRepair !== true) throw new Error("repairAcknowledgementRequired");
    if (tx.exposure.requiresAcknowledgement && msg.acknowledgeKnowledge !== true) throw new Error("knowledgeAcknowledgementRequired");
    tx.status = "accepted"; tx.responderClientId = clientId(client); tx.respondedAt = now();
    D.broadcast(room, { type: "repairAgreementAccepted", protocol: PROTOCOLS.CORRECTION, proposal: publicProposal(tx), correctionAuthority: correctionAuthority(room), authoritySummary: authoritySummary(room) });
  }
  function commitRepair(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.CORRECTION);
    const r = ensureRuntime(room), tx = r.repairTx;
    if (!tx || tx.id !== String(msg.txId || "")) throw new Error("repairTransactionMissing");
    if (client.role !== tx.proposerRole) throw new Error("proposerOnly");
    if (tx.status !== "accepted") throw new Error("repairNotAccepted");
    if (room.rev !== tx.baseRev) throw new Error("staleAgreement");
    const beforeState = clone(room.state), beforePrivate = clone(room.privateByRole), beforeRev = room.rev;
    try {
      for (const o of tx.selectedOptions) {
        if (!Array.isArray(o.pathArray) || !o.pathArray.length || o.pathArray.some(x => ["v70", "v71", "v72", "v73", "v74"].includes(String(x)))) throw new Error("unsafeRepairPath");
        if (!primitive(o.target)) throw new Error("nonPrimitiveRepair");
        setPath(room.state, o.pathArray, o.target);
      }
      room.rev = beforeRev + 1; room.updatedAt = now();
      ensureState(room); D.refreshRoomHash?.(room);
      const snap = recordSnapshot(room, { category: "repair", label: `合意部分修正 (${tx.selectedOptions.length}項目)`, reason: tx.reason, detail: tx.selectedOptions.map(x => x.label).join(" / "), force: true });
      const result = { id: uid("repair-result"), txId: tx.id, applied: tx.selectedOptions.map(x => ({ id: x.id, label: x.label, path: x.path, target: clone(x.target) })), rev: room.rev, snapshotId: snap.id, committedAt: new Date().toISOString(), proof: sha256({ txId: tx.id, applied: tx.selectedOptions, rev: room.rev, snapshotId: snap.id }) };
      room.state.v71.lastRepair = clone(result); room.state.v71.history.unshift(clone(result)); room.state.v71.history = room.state.v71.history.slice(0, 80); room.state.v71.rev = int(room.state.v71.rev) + 1;
      r.repairTx = null; D.refreshRoomHash?.(room);
      for (const c of room.clients.values()) safeSend(c, { type: "repairAgreementCommitted", protocol: PROTOCOLS.CORRECTION, rev: room.rev, state: room.state, privateState: D.privateStateFor?.(room, c.role) || null, result, correctionAuthority: correctionAuthority(room), undoAuthority: undoAuthority(room), replayAuthority: replayAuthority(room), authoritySummary: authoritySummary(room) });
    } catch (e) {
      room.state = beforeState; room.privateByRole = beforePrivate; room.rev = beforeRev; D.refreshRoomHash?.(room); throw e;
    }
  }

  function timeline(room, categories = null) {
    const allowed = categories ? new Set(categories.filter(c => CATEGORIES.includes(c))) : null;
    return ensureRuntime(room).snapshots.filter(s => !allowed || allowed.has(s.meta.category)).map(s => ({ id: s.id, meta: clone(s.meta), diffSummary: clone(s.diffSummary), category: s.meta.category }));
  }
  function frameFor(room, snap, role) {
    const r = ensureRuntime(room), idx = r.snapshots.indexOf(snap), prev = idx > 0 ? r.snapshots[idx - 1] : null;
    const d = prev ? publicDiff(prev.gameState, snap.gameState) : { changes: [], summary: { totalChanges: 0, repairableChanges: 0 } };
    return {
      id: snap.id, index: idx, total: r.snapshots.length,
      previousSnapshotId: idx > 0 ? r.snapshots[idx - 1].id : "", nextSnapshotId: idx + 1 < r.snapshots.length ? r.snapshots[idx + 1].id : "",
      meta: clone(snap.meta), board: boardView(snap.gameState),
      diffFromPrevious: { summary: d.summary, changes: d.changes.map(x => ({ kind: x.kind, label: x.label, current: x.current, target: x.target })) },
      ownPrivate: isSeat(role) ? privateSummary(snap.privateByRole?.[role], true) : null,
      privacy: { publicOnlyBoard: true, opponentPrivateOmitted: true, snapshotPayloadOmitted: true },
      integrity: { publicCommitment: snap.publicCommitment, frameCommitment: sha256({ id: snap.id, meta: snap.meta, board: boardView(snap.gameState), diff: d.summary }) },
    };
  }
  function handleTimeline(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.REPLAY, true);
    safeSend(client, { type: "replayTimelineSync", protocol: PROTOCOLS.REPLAY, actionNonce: msg.actionNonce, rev: room.rev, timeline: timeline(room), replayAuthority: replayAuthority(room), authoritySummary: authoritySummary(room) });
  }
  function handleFrame(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.REPLAY, true);
    const snap = snapshotById(room, msg.snapshotId); if (!snap) throw new Error("snapshotMissing");
    safeSend(client, { type: "replayFrameSync", protocol: PROTOCOLS.REPLAY, actionNonce: msg.actionNonce, rev: room.rev, frame: frameFor(room, snap, client.role), replayAuthority: replayAuthority(room), authoritySummary: authoritySummary(room) });
  }
  function auditContent(room) {
    const rows = timeline(room).map((x, index) => ({ index, id: x.id, meta: x.meta, diffSummary: x.diffSummary }));
    return { schema: 1, protocol: PROTOCOLS.REPLAY, generatedAt: new Date().toISOString(), summary: { frameCount: rows.length, currentRev: room.rev, turnCount: new Set(rows.map(x => x.meta.turnNumber)).size }, timeline: rows, categoryCounts: categoryCounts(rows.map(x => ({ category: x.meta.category }))), privacy: { publicOnly: true, excludesPrivateState: true, excludesRoomCode: true, excludesClientIds: true } };
  }
  function handleAuditExport(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.REPLAY, true);
    const content = auditContent(room), commitment = sha256(content), auditExport = { schema: 1, protocol: PROTOCOLS.REPLAY, content, integrity: { algorithm: "SHA-256", contentCommitment: commitment } };
    const meta = { id: uid("audit"), createdAt: new Date().toISOString(), commitment, frameCount: content.summary.frameCount };
    room.state.v72.lastExport = clone(meta); room.state.v72.exportHistory.unshift(clone(meta)); room.state.v72.exportHistory = room.state.v72.exportHistory.slice(0, MAX_EXPORT_HISTORY); room.state.v72.rev = int(room.state.v72.rev) + 1;
    safeSend(client, { type: "replayAuditExportReady", protocol: PROTOCOLS.REPLAY, actionNonce: msg.actionNonce, rev: room.rev, auditExport, exportMeta: meta, replayAuthority: replayAuthority(room), authoritySummary: authoritySummary(room) });
  }

  function playlist(room, categories) {
    const cats = arr(categories).filter(c => CATEGORIES.includes(c));
    const rows = timeline(room, cats.length ? cats : CATEGORIES);
    return rows.map((x, index) => ({ id: x.id, index, category: x.meta.category, meta: clone(x.meta), diffSummary: clone(x.diffSummary) }));
  }
  function handlePlaylist(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.REPORT, true);
    const rows = playlist(room, msg.categories), counts = categoryCounts(timeline(room).map(x => ({ category: x.meta.category })));
    safeSend(client, { type: "replayPlaylistSync", protocol: PROTOCOLS.REPORT, actionNonce: msg.actionNonce, rev: room.rev, playlist: rows, categoryCounts: counts, reportAuthority: reportAuthority(room), authoritySummary: authoritySummary(room) });
  }
  function reportContent(room, categories) {
    const rows = playlist(room, categories), counts = categoryCounts(rows);
    const turns = new Set(rows.map(x => x.meta.turnNumber)).size;
    const highlights = rows.map(x => ({ ...x, score: scoreHighlight(x) })).filter(x => x.score >= 15).sort((a, b) => b.score - a.score).slice(0, 24).map(x => ({ index: x.index, snapshotId: x.id, category: x.category, label: x.meta.label, detail: x.meta.detail || `${x.diffSummary.totalChanges}件の公開差分`, turnNumber: x.meta.turnNumber, score: x.score }));
    return { summary: { frameCount: rows.length, turns, lifeChangeCount: rows.filter(x => x.category === "life").length, totalPublicChanges: rows.reduce((n, x) => n + int(x.diffSummary.totalChanges), 0) }, categoryCounts: counts, highlights, frames: rows.map(x => ({ id: x.id, category: x.category, meta: x.meta, diffSummary: x.diffSummary })), privacy: { publicOnly: true, secretStateExcluded: true, roomCodeExcluded: true, clientIdsExcluded: true } };
  }
  function reportHtml(report) {
    const c = report.content, rows = c.highlights.map(h => `<tr><td>${h.index + 1}</td><td>${htmlEsc(h.category)}</td><td>${htmlEsc(h.label)}</td><td>${htmlEsc(h.detail)}</td><td>${h.score}</td></tr>`).join("");
    return `<!doctype html><html lang="ja"><meta charset="utf-8"><title>MTGO風 対戦ログレポート</title><style>body{font-family:sans-serif;max-width:1000px;margin:30px auto;padding:0 18px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:6px;text-align:left}.note{background:#f5f5f5;padding:10px}</style><h1>MTGO風 対戦ログレポート</h1><p>フレーム ${c.summary.frameCount} / ターン ${c.summary.turns} / 公開差分 ${c.summary.totalPublicChanges}</p><table><thead><tr><th>#</th><th>カテゴリ</th><th>操作</th><th>詳細</th><th>注目度</th></tr></thead><tbody>${rows}</tbody></table><p class="note">秘密state、秘密カード名、部屋コード、接続者IDは含まれません。</p><p>SHA-256: ${report.integrity.contentCommitment}</p></html>`;
  }
  function handleReportExport(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.REPORT, true);
    const content = reportContent(room, msg.categories), commitment = sha256(content), report = { schema: 1, protocol: PROTOCOLS.REPORT, content, integrity: { algorithm: "SHA-256", contentCommitment: commitment } };
    const format = msg.format === "html" ? "html" : "json";
    const output = format === "html" ? reportHtml(report) : JSON.stringify(report, null, 2);
    const meta = { id: uid("report"), createdAt: new Date().toISOString(), commitment, format, frameCount: content.summary.frameCount };
    room.state.v73.lastReport = clone(meta); room.state.v73.reportHistory.unshift(clone(meta)); room.state.v73.reportHistory = room.state.v73.reportHistory.slice(0, MAX_EXPORT_HISTORY); room.state.v73.rev = int(room.state.v73.rev) + 1;
    safeSend(client, { type: "replayReportReady", protocol: PROTOCOLS.REPORT, actionNonce: msg.actionNonce, rev: room.rev, report, format, output, reportMeta: meta, reportAuthority: reportAuthority(room), authoritySummary: authoritySummary(room) });
  }

  function chapterAnalysis(room, categories, minScore) {
    const rows = playlist(room, categories), counts = categoryCounts(rows), groups = new Map();
    for (const row of rows) {
      const key = `turn-${row.meta.turnNumber || 0}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const allHighlights = rows.map(x => ({ ...x, score: scoreHighlight(x) })).filter(x => x.score >= minScore).sort((a, b) => b.score - a.score);
    const highlights = allHighlights.slice(0, 60).map(x => ({ snapshotId: x.id, score: x.score, severity: x.score >= 60 ? "critical" : x.score >= 30 ? "major" : "notable", label: x.meta.label, detail: x.meta.detail || `${x.diffSummary.totalChanges}件の公開差分`, turnNumber: x.meta.turnNumber, category: x.category }));
    const highlightById = new Map(highlights.map(x => [x.snapshotId, x]));
    const chapters = [...groups.entries()].map(([id, list]) => ({ id, label: `ターン ${list[0]?.meta?.turnNumber || 0}`, turnNumber: list[0]?.meta?.turnNumber || 0, frameIds: list.map(x => x.id), frameCount: list.length, publicChanges: list.reduce((n, x) => n + int(x.diffSummary.totalChanges), 0), highlightCount: list.filter(x => highlightById.has(x.id)).length, firstLabel: list[0]?.meta?.label || "", lastLabel: list[list.length - 1]?.meta?.label || "" }));
    return { summary: { frameCount: rows.length, chapterCount: chapters.length, highlightCount: highlights.length, turnCount: groups.size }, categoryCounts: counts, chapters, highlights, playlist: rows, privacy: { publicOnly: true, secretStateExcluded: true } };
  }
  function handleChapter(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.CHAPTER, true);
    const threshold = int(msg.minHighlightScore, 0, 100) || 15, analysis = chapterAnalysis(room, msg.categories, threshold);
    safeSend(client, { type: "replayChapterSync", protocol: PROTOCOLS.CHAPTER, actionNonce: msg.actionNonce, rev: room.rev, analysis, chapterAuthority: chapterAuthority(room), authoritySummary: authoritySummary(room) });
  }
  function shareHtml(share, title) {
    const c = share.content, chapterRows = c.chapters.map(x => `<section><h2>${htmlEsc(x.label)}</h2><p>フレーム ${x.frameCount} / 公開差分 ${x.publicChanges} / 注目局面 ${x.highlightCount}</p><p>${htmlEsc(x.firstLabel)} → ${htmlEsc(x.lastLabel)}</p></section>`).join("");
    const highRows = c.highlights.map(x => `<li><b>${x.score} ${htmlEsc(x.label)}</b> — ${htmlEsc(x.detail)}</li>`).join("");
    return `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${htmlEsc(title)}</title><style>body{font-family:sans-serif;max-width:1000px;margin:30px auto;padding:0 18px}section{border:1px solid #ccc;padding:8px;margin:8px 0}.note{background:#f5f5f5;padding:10px}</style><h1>${htmlEsc(title)}</h1><p>ターン ${c.summary.turnCount} / チャプター ${c.summary.chapterCount} / 注目局面 ${c.summary.highlightCount}</p>${chapterRows}<h2>注目局面</h2><ol>${highRows}</ol><p class="note">秘密state、秘密カード名、山札順、部屋コード、接続者IDは含まれません。</p><p>SHA-256: ${share.integrity.contentCommitment}</p></html>`;
  }
  function handleShare(client, room, msg) {
    validateBase(client, room, msg, PROTOCOLS.CHAPTER, true);
    const threshold = int(msg.minHighlightScore, 0, 100) || 15, analysis = chapterAnalysis(room, msg.categories, threshold);
    const content = { summary: analysis.summary, categoryCounts: analysis.categoryCounts, chapters: analysis.chapters.map(({ frameIds, ...x }) => x), highlights: analysis.highlights, privacy: { publicOnly: true, secretStateExcluded: true, libraryOrderExcluded: true, roomCodeExcluded: true, clientIdsExcluded: true } };
    const commitment = sha256(content), share = { schema: 1, protocol: PROTOCOLS.CHAPTER, title: text(msg.title || "MTGO風 対戦サマリー", 200), content, integrity: { algorithm: "SHA-256", contentCommitment: commitment } };
    const format = msg.format === "html" ? "html" : "json", output = format === "html" ? shareHtml(share, share.title) : JSON.stringify(share, null, 2);
    const meta = { id: uid("share"), createdAt: new Date().toISOString(), commitment, format, title: share.title, frameCount: content.summary.frameCount };
    room.state.v74.lastShare = clone(meta); room.state.v74.shareHistory.unshift(clone(meta)); room.state.v74.shareHistory = room.state.v74.shareHistory.slice(0, MAX_EXPORT_HISTORY); room.state.v74.rev = int(room.state.v74.rev) + 1;
    safeSend(client, { type: "replayShareSummaryReady", protocol: PROTOCOLS.CHAPTER, actionNonce: msg.actionNonce, rev: room.rev, share, format, output, shareMeta: meta, chapterAuthority: chapterAuthority(room), authoritySummary: authoritySummary(room) });
  }

  function handle(client, room, msg) {
    try {
      switch (msg.type) {
        case "undoHistoryRequest": return handleHistoryRequest(client, room, msg);
        case "undoAgreementStart": return startUndo(client, room, msg);
        case "undoAgreementRespond": return respondUndo(client, room, msg);
        case "undoAgreementCommit": return commitUndo(client, room, msg);
        case "undoDiffRequest": return handleDiffRequest(client, room, msg);
        case "repairAgreementStart": return startRepair(client, room, msg);
        case "repairAgreementRespond": return respondRepair(client, room, msg);
        case "repairAgreementCommit": return commitRepair(client, room, msg);
        case "replayTimelineRequest": return handleTimeline(client, room, msg);
        case "replayFrameRequest": return handleFrame(client, room, msg);
        case "replayAuditExport": return handleAuditExport(client, room, msg);
        case "replayPlaylistRequest": return handlePlaylist(client, room, msg);
        case "replayReportExport": return handleReportExport(client, room, msg);
        case "replayChapterRequest": return handleChapter(client, room, msg);
        case "replayShareSummaryExport": return handleShare(client, room, msg);
        default: throw new Error("unknownStage6Message");
      }
    } catch (e) {
      const family = msg.type.startsWith("undo") ? "undo" : msg.type.startsWith("repair") ? "repair" : msg.type.startsWith("replayChapter") || msg.type.startsWith("replayShare") ? "chapter" : msg.type.startsWith("replayPlaylist") || msg.type.startsWith("replayReport") ? "report" : "replay";
      reject(client, room, msg, family, e?.message || e);
    }
  }

  function cancelClientTransactions(room, id) {
    const r = ensureRuntime(room), cid = String(id || "");
    if (r.undoTx && [r.undoTx.proposerClientId, r.undoTx.responderClientId].includes(cid)) {
      const tx = r.undoTx; r.undoTx = null; D.broadcast(room, { type: "undoAgreementCancelled", protocol: PROTOCOLS.UNDO, proposal: publicProposal(tx), reason: "participantDisconnected", undoAuthority: undoAuthority(room), authoritySummary: authoritySummary(room) });
    }
    if (r.repairTx && [r.repairTx.proposerClientId, r.repairTx.responderClientId].includes(cid)) {
      const tx = r.repairTx; r.repairTx = null; D.broadcast(room, { type: "repairAgreementCancelled", protocol: PROTOCOLS.CORRECTION, proposal: publicProposal(tx), reason: "participantDisconnected", correctionAuthority: correctionAuthority(room), authoritySummary: authoritySummary(room) });
    }
  }

  function snapshotForPersistence(room) {
    const r = ensureRuntime(room);
    return { snapshots: clone(r.snapshots), nonceKeys: [...r.nonces.keys()] };
  }
  function restorePersistence(room, data) {
    ensureState(room); const r = ensureRuntime(room);
    r.snapshots = arr(data?.snapshots).slice(-MAX_SNAPSHOTS).map(clone); r.snapshotById = new Map(r.snapshots.map(s => [s.id, s]));
    r.nonces = new Map(arr(data?.nonceKeys).map(k => [String(k), now()])); r.undoTx = null; r.repairTx = null;
    room.state.v70.history = r.snapshots.map(x => ({ id: x.id, ...clone(x.meta), diffSummary: clone(x.diffSummary) })); room.state.v70.currentSnapshotId = r.snapshots[r.snapshots.length - 1]?.id || "";
  }

  return {
    PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES,
    ensureRoom(room) { ensureState(room); if (!currentSnapshot(room)) recordSnapshot(room, { initial: true, category: "initial", label: "対戦開始", force: true }); return authoritySummary(room); },
    ensureState, ensureRuntime, anyActive, activeKind, authoritySummary, undoAuthority, correctionAuthority, replayAuthority, reportAuthority, chapterAuthority,
    recordSnapshot, currentSnapshot, snapshotById, previewFor, frameFor, timeline, reportContent, chapterAnalysis,
    handle, cancelClientTransactions, snapshotForPersistence, restorePersistence,
    captureAuthorityState(room) { ensureState(room); return preserveAuthorityState(room.state); },
    restoreAuthorityState(room, saved) { ensureBase(room); applyAuthorityState(room.state, saved); ensureAuthorityState(room); },
  };
}

module.exports = { PROTOCOLS, AUTHORITY_FLAGS, MESSAGE_TYPES, CATEGORIES, createEngine, stable, sha256, publicDiff, knowledgeExposure };
