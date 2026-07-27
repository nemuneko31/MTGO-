"use strict";

const crypto = require("crypto");

const PROTOCOLS = Object.freeze({
  COLLAB: "cpt-v7.5",
  REVIEW: "cpt-v7.6",
  NOTIFICATION: "cpt-v7.7",
  SETTINGS: "cpt-v7.8",
  RULE: "cpt-v7.9",
});
const AUTHORITY_FLAGS = Object.freeze({
  collabProtocol: PROTOCOLS.COLLAB,
  serverReplayAnnotationsV75: true,
  serverPrivateFavoritesV75: true,
  serverAnonymousSharePackagesV75: true,
  serverAnonymousPackageCommitmentsV75: true,
  reviewProtocol: PROTOCOLS.REVIEW,
  serverAnnotationThreadsV76: true,
  serverCollaborativeReviewV76: true,
  serverAnonymousPackageImportV76: true,
  serverPackageImportCommitmentsV76: true,
  notificationProtocol: PROTOCOLS.NOTIFICATION,
  serverUnreadThreadsV77: true,
  serverMentionsV77: true,
  serverReviewNotificationsV77: true,
  serverAnonymousPackageComparisonV77: true,
  notificationSettingsProtocol: PROTOCOLS.SETTINGS,
  serverNotificationFiltersV78: true,
  serverThreadMuteV78: true,
  serverRenotifyV78: true,
  serverPackageCompareReportV78: true,
  notificationRuleProtocol: PROTOCOLS.RULE,
  serverNotificationPresetsV79: true,
  serverThreadImportanceV79: true,
  serverComparisonReportImportV79: true,
  serverComparisonReportShareV79: true,
});
const MESSAGE_TYPES = Object.freeze([
  "replayCollabSyncRequest", "replayAnnotationUpsert", "replayAnnotationDelete", "replayFavoriteToggle", "replayAnonymousPackageExport",
  "replayReviewSyncRequest", "replayAnnotationReplyUpsert", "replayAnnotationReplyDelete", "replayAnnotationReviewSet", "replayAnnotationReviewAckToggle", "replayAnonymousPackageValidate",
  "replayNotificationSyncRequest", "replayNotificationMarkRead", "replayNotificationMarkAll",
  "replayNotificationSettingsSyncRequest", "replayNotificationThreadMute", "replayNotificationThreadUnmute", "replayNotificationThreadRenotify",
  "replayNotificationRuleSyncRequest", "replayNotificationPresetSet", "replayNotificationCustomRulesSet", "replayNotificationThreadImportanceSet",
  "replayComparisonReportValidate", "replayComparisonReportShareExport",
]);
const SEATS = Object.freeze(["A", "B"]);
const SEAT_SET = new Set(SEATS);
const REVIEW_STATUS = new Set(["open", "in_review", "resolved"]);
const IMPORTANCE = Object.freeze(["low", "normal", "high", "critical"]);
const IMPORTANCE_RANK = Object.freeze({ low: 0, normal: 1, high: 2, critical: 3 });
const PRESETS = new Set(["all", "important", "review", "quiet", "custom"]);
const NOTIFICATION_KINDS = new Set(["reply", "mention", "review_request", "review_update", "reminder"]);
const MAX_NONCES = 8192, MAX_ANNOTATIONS = 500, MAX_REPLIES = 3000, MAX_NOTIFICATIONS = 4000, MAX_HISTORY = 80;

function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function now() { return Date.now(); }
function iso(t = now()) { return new Date(t).toISOString(); }
function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(7).toString("hex")}`; }
function text(v, max = 500) { return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max); }
function arr(v) { return Array.isArray(v) ? v : []; }
function int(v, min = 0, max = Number.MAX_SAFE_INTEGER) { return Math.max(min, Math.min(max, Math.trunc(Number(v) || 0))); }
function isSeat(v) { return SEAT_SET.has(v); }
function other(role) { return role === "A" ? "B" : "A"; }
function clientId(client) { return String(client?.id || client?.clientId || ""); }
function stable(v) { if (Array.isArray(v)) return v.map(stable); if (!v || typeof v !== "object") return v; const o = {}; for (const k of Object.keys(v).sort()) o[k] = stable(v[k]); return o; }
function sha256(v) { return crypto.createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(stable(v))).digest("hex"); }
function htmlEsc(v) { return text(v, 100000).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]); }
function tags(v) { return [...new Set(arr(v).map(x => text(x, 40).trim()).filter(Boolean))].slice(0, 12); }
function safeRoleLabel(role) { return role === "A" ? "Player 1" : role === "B" ? "Player 2" : "Viewer"; }

function defaultRules() {
  return { preset: "all", custom: { allowedKinds: [...NOTIFICATION_KINDS], minImportance: "low", allowCriticalBypass: true }, filteredCount: 0, lastFilteredAt: "", updatedAt: "" };
}
function ensureRoom(room) {
  const r = room.v75v79 = room.v75v79 && typeof room.v75v79 === "object" ? room.v75v79 : {};
  r.rev = int(r.rev);
  r.annotations = arr(r.annotations);
  r.favorites = r.favorites && typeof r.favorites === "object" ? r.favorites : { A: [], B: [] };
  r.favorites.A = arr(r.favorites.A); r.favorites.B = arr(r.favorites.B);
  r.replies = arr(r.replies); r.reviews = arr(r.reviews); r.notifications = arr(r.notifications);
  r.threadPreferences = r.threadPreferences && typeof r.threadPreferences === "object" ? r.threadPreferences : { A: [], B: [] };
  r.threadPreferences.A = arr(r.threadPreferences.A); r.threadPreferences.B = arr(r.threadPreferences.B);
  r.rules = r.rules && typeof r.rules === "object" ? r.rules : { A: defaultRules(), B: defaultRules() };
  r.rules.A = { ...defaultRules(), ...(r.rules.A || {}), custom: { ...defaultRules().custom, ...(r.rules.A?.custom || {}) } };
  r.rules.B = { ...defaultRules(), ...(r.rules.B || {}), custom: { ...defaultRules().custom, ...(r.rules.B?.custom || {}) } };
  r.threadImportance = arr(r.threadImportance);
  r.packageHistory = arr(r.packageHistory).slice(-MAX_HISTORY);
  r.validationHistory = arr(r.validationHistory).slice(-MAX_HISTORY);
  r.reportHistory = arr(r.reportHistory).slice(-MAX_HISTORY);
  r.nonces = r.nonces instanceof Map ? r.nonces : new Map(arr(r.nonceKeys).map(k => [String(k), now()]));
  r.lastActivity = r.lastActivity && typeof r.lastActivity === "object" ? r.lastActivity : null;
  return r;
}
function rememberNonce(room, client, msg) {
  const r = ensureRoom(room), n = text(msg.actionNonce, 160); if (!n) throw new Error("actionNonceRequired");
  const key = `${clientId(client)}:${n}`; if (r.nonces.has(key)) throw new Error("actionNonceReused");
  r.nonces.set(key, now()); while (r.nonces.size > MAX_NONCES) r.nonces.delete(r.nonces.keys().next().value); return key;
}
function validateBase(client, room, msg, protocol, seatRequired = false) {
  if (msg.protocol !== protocol) throw new Error("protocolMismatch");
  if (Number(msg.baseRev) !== Number(room.rev)) throw new Error("staleRev");
  if (seatRequired && !isSeat(client.role)) throw new Error("seatRequired");
  rememberNonce(room, client, msg);
}
function publicAnnotation(n, viewerRole) {
  if (n.visibility === "private" && n.authorRole !== viewerRole) return null;
  return clone(n);
}
function visibleAnnotations(room, role) { return ensureRoom(room).annotations.map(x => publicAnnotation(x, role)).filter(Boolean); }
function visibleReplies(room, role) {
  const visible = new Set(visibleAnnotations(room, role).map(x => x.id));
  return ensureRoom(room).replies.filter(x => visible.has(x.annotationId)).map(clone);
}
function visibleReviews(room, role) {
  const visible = new Set(visibleAnnotations(room, role).map(x => x.id));
  return ensureRoom(room).reviews.filter(x => visible.has(x.annotationId)).map(clone);
}
function annotationById(room, id) { return ensureRoom(room).annotations.find(x => x.id === String(id || "")) || null; }
function replyById(room, id) { return ensureRoom(room).replies.find(x => x.id === String(id || "")) || null; }
function reviewFor(room, annotationId) { return ensureRoom(room).reviews.find(x => x.annotationId === annotationId) || null; }
function prefFor(room, role, annotationId) { return ensureRoom(room).threadPreferences[role].find(x => x.annotationId === annotationId) || null; }
function importanceFor(room, annotationId) { return ensureRoom(room).threadImportance.find(x => x.annotationId === annotationId)?.importance || "normal"; }
function touch(room, kind, role, annotationId = "") { const r = ensureRoom(room); r.rev++; r.lastActivity = { kind, role, annotationId, at: iso() }; }

function authoritySummary(room) {
  const r = ensureRoom(room), shared = r.annotations.filter(x => x.visibility === "shared");
  const collabAuthority = { protocol: PROTOCOLS.COLLAB, rev: r.rev, sharedAnnotationCount: shared.length, lastPackage: clone(r.packageHistory.at(-1) || null), packageHistory: clone(r.packageHistory.slice(-20)) };
  const reviewAuthority = { protocol: PROTOCOLS.REVIEW, rev: r.rev, replyCount: r.replies.length, openReviewCount: r.reviews.filter(x => x.status !== "resolved").length, lastValidation: clone(r.validationHistory.at(-1) || null), validationHistory: clone(r.validationHistory.slice(-20)) };
  const notificationAuthority = { protocol: PROTOCOLS.NOTIFICATION, rev: r.rev, notificationCount: r.notifications.length, mentionCount: r.notifications.filter(x => x.kind === "mention").length, lastActivity: clone(r.lastActivity) };
  const mutedThreadCount = SEATS.reduce((n, role) => n + r.threadPreferences[role].filter(x => x.mode === "muted" && (!x.mutedUntil || x.mutedUntil > now())).length, 0);
  const notificationSettingsAuthority = { protocol: PROTOCOLS.SETTINGS, rev: r.rev, mutedThreadCount, suppressedCount: SEATS.reduce((n, role) => n + int(r.rules[role].filteredCount), 0), lastActivity: clone(r.lastActivity) };
  const notificationRuleAuthority = { protocol: PROTOCOLS.RULE, rev: r.rev, filteredCount: SEATS.reduce((n, role) => n + int(r.rules[role].filteredCount), 0), customPresetCount: SEATS.filter(role => r.rules[role].preset === "custom").length, importantThreadCount: r.threadImportance.filter(x => IMPORTANCE_RANK[x.importance] >= IMPORTANCE_RANK.high).length, lastActivity: clone(r.lastActivity) };
  return { collabAuthority, reviewAuthority, notificationAuthority, notificationSettingsAuthority, notificationRuleAuthority };
}
function authorityFor(room) { return { ...authoritySummary(room) }; }

function parseMentions(value) {
  const s = String(value || ""); const out = [];
  if (/@(?:Player\s*1|プレイヤー\s*1|P1|A)(?!\w)/i.test(s)) out.push("A");
  if (/@(?:Player\s*2|プレイヤー\s*2|P2|B)(?!\w)/i.test(s)) out.push("B");
  return [...new Set(out)];
}
function pushNotification(room, { annotationId, kind, actorRole, targetRoles, summary }) {
  if (!NOTIFICATION_KINDS.has(kind)) return null;
  const roles = [...new Set(arr(targetRoles).filter(isSeat).filter(x => x !== actorRole))]; if (!roles.length) return null;
  const r = ensureRoom(room), n = { id: uid("notice"), annotationId, kind, actorRole, targetRoles: roles, summary: text(summary, 240), createdAt: iso(), readAt: {} };
  r.notifications.push(n); if (r.notifications.length > MAX_NOTIFICATIONS) r.notifications.splice(0, r.notifications.length - MAX_NOTIFICATIONS); return n;
}
function notificationImportance(room, n) { return importanceFor(room, n.annotationId); }
function mutedFor(room, role, n) {
  if (n.kind === "mention" || n.kind === "review_request" || n.kind === "reminder") return false;
  const p = prefFor(room, role, n.annotationId); if (!p || p.mode !== "muted") return false;
  return !p.mutedUntil || p.mutedUntil > now();
}
function passesRules(room, role, n) {
  const rules = ensureRoom(room).rules[role] || defaultRules(), imp = notificationImportance(room, n), rank = IMPORTANCE_RANK[imp] ?? 1;
  let allowedKinds = [...NOTIFICATION_KINDS], min = "low", bypass = true;
  if (rules.preset === "important") min = "high";
  else if (rules.preset === "review") allowedKinds = ["mention", "review_request", "review_update", "reminder"];
  else if (rules.preset === "quiet") { allowedKinds = ["mention", "review_request"]; min = "high"; }
  else if (rules.preset === "custom") { allowedKinds = arr(rules.custom?.allowedKinds).filter(x => NOTIFICATION_KINDS.has(x)); min = IMPORTANCE_RANK[rules.custom?.minImportance] == null ? "low" : rules.custom.minImportance; bypass = rules.custom?.allowCriticalBypass !== false; }
  const criticalBypass = bypass && imp === "critical";
  return criticalBypass || (allowedKinds.includes(n.kind) && rank >= (IMPORTANCE_RANK[min] ?? 0));
}
function notificationsFor(room, role) {
  if (!isSeat(role)) return [];
  const r = ensureRoom(room), out = []; let filtered = 0;
  for (const n of r.notifications) {
    if (!n.targetRoles.includes(role)) continue;
    if (mutedFor(room, role, n) || !passesRules(room, role, n)) { filtered++; continue; }
    out.push(clone(n));
  }
  r.rules[role].filteredCount = filtered;
  if (filtered) r.rules[role].lastFilteredAt = iso();
  return out;
}
function notificationPayload(room, role) {
  const notifications = notificationsFor(room, role), unreadByAnnotation = {};
  for (const n of notifications) if (!n.readAt?.[role]) unreadByAnnotation[n.annotationId] = (unreadByAnnotation[n.annotationId] || 0) + 1;
  return { notifications, unreadCount: Object.values(unreadByAnnotation).reduce((a,b)=>a+b,0), unreadByAnnotation };
}

function forbiddenPath(value, path = "$") {
  if (value == null) return "";
  if (Array.isArray(value)) { for (let i=0;i<value.length;i++) { const z=forbiddenPath(value[i], `${path}[${i}]`); if (z) return z; } return ""; }
  if (typeof value !== "object") return "";
  const deny = /^(privateState|privateByRole|privateAnnotations|privateCardNames|packedSnapshot|packedSnapshots|libraryOrder|roomCode|clientId|clientIdentifiers|reconnectToken|reconnectTokens|playerName|playerNames)$/i;
  for (const [k,v] of Object.entries(value)) { const q=`${path}.${k}`; if (path !== "$.content.privacy" && deny.test(k)) return q; const z=forbiddenPath(v,q); if (z) return z; }
  return "";
}
function validatePrivacyDeclaration(p) {
  const excluded = ["privateState","privateAnnotations","privateCardNames","libraryOrder","roomCode","clientIdentifiers","playerNames","reconnectTokens","packedSnapshots"];
  for (const k of excluded) if (p?.[k] !== "excluded") throw new Error(`privacyDeclaration:${k}`);
  if (p?.anonymous !== true || p?.publicOnly !== true) throw new Error("privacyDeclarationUnsafe");
}
function sanitizePackage(pkg) {
  if (!pkg?.content || !pkg?.integrity || JSON.stringify(pkg).length > 2*1024*1024) throw new Error("packageInvalid");
  const c=pkg.content; if (c.schema !== 1 || !["card-practice-table-anonymous-package-v7.5","card-practice-table-anonymous-package-v7.6"].includes(c.format)) throw new Error("packageUnsupported");
  validatePrivacyDeclaration(c.privacy || {}); const forbidden=forbiddenPath({content:c}); if (forbidden) throw new Error(`forbiddenField:${forbidden}`);
  if (!pkg.integrity.contentCommitment || sha256(c) !== String(pkg.integrity.contentCommitment)) throw new Error("commitmentMismatch");
  const safe={schema:1,format:c.format,serverVersion:text(c.serverVersion,32),protocol:text(c.protocol,32),generatedAt:text(c.generatedAt,40),title:text(c.title||"匿名対戦パッケージ",120),privacy:clone(c.privacy),summary:clone(c.summary||{}),categoryCounts:clone(c.categoryCounts||{}),chapters:clone(arr(c.chapters).slice(0,160)),highlights:clone(arr(c.highlights).slice(0,240)),narrative:clone(arr(c.narrative).slice(0,24)),annotations:clone(arr(c.annotations).slice(0,180)),curatorSelections:clone(arr(c.curatorSelections).slice(0,120))};
  return { schema:1, kind:"cpt-anonymous-package", content:safe, integrity:{algorithm:"SHA-256",contentCommitment:sha256(safe)} };
}
function validateReport(report) {
  if (!report?.content || !report?.integrity || report.schema !== 1 || report.kind !== "cpt-anonymous-package-comparison-report") throw new Error("reportInvalid");
  const c=report.content; if (c.schema!==1 || c.kind!=="cpt-anonymous-package-comparison") throw new Error("reportContentInvalid");
  if (!c.privacy || c.privacy.publicOnly!==true || c.privacy.anonymous!==true || c.privacy.containsPrivateState!==false || c.privacy.containsRoomIdentifiers!==false) throw new Error("reportPrivacyUnsafe");
  const forbidden=forbiddenPath({content:c}); if(forbidden) throw new Error(`forbiddenField:${forbidden}`);
  if (!report.integrity.contentCommitment || sha256(c)!==String(report.integrity.contentCommitment)) throw new Error("commitmentMismatch");
  return clone(report);
}

function createEngine(deps = {}) {
  const D = { send(){}, broadcast(){}, pushLog(){}, authority(){return{};}, chapterAnalysis(){return{summary:{},categoryCounts:{},chapters:[],highlights:[]};}, reportContent(){return{summary:{},categoryCounts:{},narrative:[]};}, ...deps };
  function send(client,obj){D.send(client?.ws||client,obj);}
  function reject(client,room,msg,family,reason,detail="") { send(client,{type:family,protocol:msg.protocol||"",actionNonce:text(msg.actionNonce,160),reason:text(reason,120),detail:text(detail,240),rev:room.rev,authoritySummary:authoritySummary(room),...authorityFor(room)}); }
  function syncCollab(client,room){send(client,{type:"replayCollabSync",protocol:PROTOCOLS.COLLAB,rev:room.rev,annotations:visibleAnnotations(room,client.role),favorites:isSeat(client.role)?clone(ensureRoom(room).favorites[client.role]):[],authoritySummary:authoritySummary(room),...authorityFor(room)});}
  function syncReview(client,room){send(client,{type:"replayReviewSync",protocol:PROTOCOLS.REVIEW,rev:room.rev,annotations:visibleAnnotations(room,client.role),favorites:isSeat(client.role)?clone(ensureRoom(room).favorites[client.role]):[],replies:visibleReplies(room,client.role),reviews:visibleReviews(room,client.role),authoritySummary:authoritySummary(room),...authorityFor(room)});}
  function syncNotification(client,room){send(client,{type:"replayNotificationSync",protocol:PROTOCOLS.NOTIFICATION,rev:room.rev,...notificationPayload(room,client.role),authoritySummary:authoritySummary(room),...authorityFor(room)});}
  function syncSettings(client,room){send(client,{type:"replayNotificationSettingsSync",protocol:PROTOCOLS.SETTINGS,rev:room.rev,threadPreferences:isSeat(client.role)?clone(ensureRoom(room).threadPreferences[client.role]):[],authoritySummary:authoritySummary(room),...authorityFor(room)});}
  function syncRules(client,room){send(client,{type:"replayNotificationRuleSync",protocol:PROTOCOLS.RULE,rev:room.rev,rules:isSeat(client.role)?clone(ensureRoom(room).rules[client.role]):defaultRules(),threadImportance:clone(ensureRoom(room).threadImportance),authoritySummary:authoritySummary(room),...authorityFor(room)});}
  function broadcastReview(room){for(const c of room.clients.values()){syncReview(c,room);if(isSeat(c.role)){syncNotification(c,room);syncSettings(c,room);syncRules(c,room);}}}
  function targetLabel(room,type,id){const a=D.chapterAnalysis(room)||{};if(type==="chapter")return arr(a.chapters).find(x=>x.id===id)?.label||id;if(type==="highlight")return arr(a.highlights).find(x=>x.snapshotId===id||x.id===id)?.label||id;return id;}
  function upsertAnnotation(client,room,msg){validateBase(client,room,msg,PROTOCOLS.COLLAB,true);const r=ensureRoom(room),id=text(msg.id,120);let n=id?annotationById(room,id):null;if(n&&n.authorRole!==client.role)throw new Error("annotationOwnerRequired");const visibility=msg.visibility==="private"?"private":"shared";if(!n){if(r.annotations.length>=MAX_ANNOTATIONS)throw new Error("annotationLimit");n={id:uid("note"),authorRole:client.role,createdAt:iso()};r.annotations.push(n);}Object.assign(n,{targetType:["chapter","highlight"].includes(msg.targetType)?msg.targetType:"chapter",targetId:text(msg.targetId,160),targetLabel:targetLabel(room,msg.targetType,text(msg.targetId,160)),title:text(msg.title||"注釈",120),text:text(msg.text,4000),tags:tags(msg.tags),visibility,shareable:visibility==="shared"&&msg.shareable!==false,updatedAt:iso()});touch(room,"annotation_upsert",client.role,n.id);D.pushLog(room,{kind:"reviewAnnotation",role:client.role,annotationId:n.id});broadcastReview(room);}
  function deleteAnnotation(client,room,msg){validateBase(client,room,msg,PROTOCOLS.COLLAB,true);const r=ensureRoom(room),n=annotationById(room,msg.id);if(!n)throw new Error("annotationMissing");if(n.authorRole!==client.role)throw new Error("annotationOwnerRequired");r.annotations=r.annotations.filter(x=>x.id!==n.id);r.replies=r.replies.filter(x=>x.annotationId!==n.id);r.reviews=r.reviews.filter(x=>x.annotationId!==n.id);r.notifications=r.notifications.filter(x=>x.annotationId!==n.id);r.threadImportance=r.threadImportance.filter(x=>x.annotationId!==n.id);for(const role of SEATS){r.threadPreferences[role]=r.threadPreferences[role].filter(x=>x.annotationId!==n.id);r.favorites[role]=r.favorites[role].filter(x=>!(x.targetType===n.targetType&&x.targetId===n.targetId));}touch(room,"annotation_delete",client.role,n.id);broadcastReview(room);}
  function favoriteToggle(client,room,msg){validateBase(client,room,msg,PROTOCOLS.COLLAB,true);const r=ensureRoom(room),type=["chapter","highlight"].includes(msg.targetType)?msg.targetType:"chapter",id=text(msg.targetId,160),list=r.favorites[client.role],i=list.findIndex(x=>x.targetType===type&&x.targetId===id);if(i>=0)list.splice(i,1);else list.push({targetType:type,targetId:id,label:targetLabel(room,type,id),createdAt:iso()});touch(room,"favorite_toggle",client.role,id);syncCollab(client,room);}
  function upsertReply(client,room,msg){validateBase(client,room,msg,PROTOCOLS.REVIEW,true);const r=ensureRoom(room),n=annotationById(room,msg.annotationId);if(!n)throw new Error("annotationMissing");if(n.visibility==="private"&&n.authorRole!==client.role)throw new Error("annotationPrivate");let x=text(msg.id,120)?replyById(room,msg.id):null;if(x&&x.authorRole!==client.role)throw new Error("replyOwnerRequired");if(!x){if(r.replies.length>=MAX_REPLIES)throw new Error("replyLimit");x={id:uid("reply"),annotationId:n.id,authorRole:client.role,createdAt:iso()};r.replies.push(x);}x.text=text(msg.text,3000);if(!x.text.trim())throw new Error("replyTextRequired");x.mentions=parseMentions(x.text);x.updatedAt=iso();const targets=[other(client.role)];pushNotification(room,{annotationId:n.id,kind:"reply",actorRole:client.role,targetRoles:targets,summary:x.text});for(const role of x.mentions)pushNotification(room,{annotationId:n.id,kind:"mention",actorRole:client.role,targetRoles:[role],summary:x.text});touch(room,"reply_upsert",client.role,n.id);broadcastReview(room);}
  function deleteReply(client,room,msg){validateBase(client,room,msg,PROTOCOLS.REVIEW,true);const r=ensureRoom(room),x=replyById(room,msg.id);if(!x)throw new Error("replyMissing");if(x.authorRole!==client.role)throw new Error("replyOwnerRequired");r.replies=r.replies.filter(q=>q.id!==x.id);touch(room,"reply_delete",client.role,x.annotationId);broadcastReview(room);}
  function setReview(client,room,msg){validateBase(client,room,msg,PROTOCOLS.REVIEW,true);const r=ensureRoom(room),n=annotationById(room,msg.annotationId);if(!n||n.visibility!=="shared")throw new Error("sharedAnnotationRequired");let rv=reviewFor(room,n.id);if(!rv){rv={annotationId:n.id,createdAt:iso(),acknowledgedBy:{A:false,B:false}};r.reviews.push(rv);}const oldAssignee=rv.assigneeRole;rv.status=REVIEW_STATUS.has(msg.status)?msg.status:"open";rv.assigneeRole=isSeat(msg.assigneeRole)?msg.assigneeRole:"";rv.updatedByRole=client.role;rv.updatedAt=iso();const kind=rv.assigneeRole&&rv.assigneeRole!==client.role&&rv.assigneeRole!==oldAssignee?"review_request":"review_update";pushNotification(room,{annotationId:n.id,kind,actorRole:client.role,targetRoles:kind==="review_request"?[rv.assigneeRole]:[other(client.role)],summary:`${n.title}: ${rv.status}`});touch(room,"review_set",client.role,n.id);broadcastReview(room);}
  function toggleAck(client,room,msg){validateBase(client,room,msg,PROTOCOLS.REVIEW,true);const rv=reviewFor(room,text(msg.annotationId,120));if(!rv)throw new Error("reviewMissing");rv.acknowledgedBy ||= {A:false,B:false};rv.acknowledgedBy[client.role]=!rv.acknowledgedBy[client.role];rv.updatedAt=iso();touch(room,"review_ack",client.role,rv.annotationId);broadcastReview(room);}
  function markRead(client,room,msg){validateBase(client,room,msg,PROTOCOLS.NOTIFICATION,true);const id=text(msg.annotationId,120),r=ensureRoom(room);for(const n of r.notifications)if(n.annotationId===id&&n.targetRoles.includes(client.role))n.readAt[client.role]=iso();touch(room,"notification_read",client.role,id);syncNotification(client,room);}
  function markAll(client,room,msg){validateBase(client,room,msg,PROTOCOLS.NOTIFICATION,true);const r=ensureRoom(room);for(const n of r.notifications)if(n.targetRoles.includes(client.role))n.readAt[client.role]=iso();touch(room,"notification_read_all",client.role);syncNotification(client,room);}
  function setMute(client,room,msg){validateBase(client,room,msg,PROTOCOLS.SETTINGS,true);const r=ensureRoom(room),id=text(msg.annotationId,120);if(!annotationById(room,id))throw new Error("annotationMissing");const minutes=int(msg.minutes,0,60*24*365),list=r.threadPreferences[client.role];let p=list.find(x=>x.annotationId===id);if(!p){p={annotationId:id};list.push(p);}p.mode="muted";p.mutedUntil=minutes?now()+minutes*60000:0;p.updatedAt=iso();touch(room,"thread_mute",client.role,id);syncSettings(client,room);syncNotification(client,room);}
  function unmute(client,room,msg){validateBase(client,room,msg,PROTOCOLS.SETTINGS,true);const r=ensureRoom(room),id=text(msg.annotationId,120);r.threadPreferences[client.role]=r.threadPreferences[client.role].filter(x=>x.annotationId!==id);touch(room,"thread_unmute",client.role,id);syncSettings(client,room);syncNotification(client,room);}
  function renotify(client,room,msg){validateBase(client,room,msg,PROTOCOLS.SETTINGS,true);const id=text(msg.annotationId,120),n=annotationById(room,id);if(!n)throw new Error("annotationMissing");pushNotification(room,{annotationId:id,kind:"reminder",actorRole:other(client.role),targetRoles:[client.role],summary:`再通知: ${n.title}`});touch(room,"thread_renotify",client.role,id);syncNotification(client,room);}
  function presetSet(client,room,msg){validateBase(client,room,msg,PROTOCOLS.RULE,true);const p=PRESETS.has(msg.preset)?msg.preset:"all",r=ensureRoom(room);r.rules[client.role].preset=p;r.rules[client.role].updatedAt=iso();touch(room,"notification_preset",client.role);syncRules(client,room);syncNotification(client,room);}
  function customSet(client,room,msg){validateBase(client,room,msg,PROTOCOLS.RULE,true);const r=ensureRoom(room),allowed=[...new Set(arr(msg.allowedKinds).filter(x=>NOTIFICATION_KINDS.has(x)))],min=IMPORTANCE_RANK[msg.minImportance]==null?"low":msg.minImportance;r.rules[client.role]={...r.rules[client.role],preset:"custom",custom:{allowedKinds:allowed,minImportance:min,allowCriticalBypass:msg.allowCriticalBypass!==false},updatedAt:iso()};touch(room,"notification_custom",client.role);syncRules(client,room);syncNotification(client,room);}
  function importanceSet(client,room,msg){validateBase(client,room,msg,PROTOCOLS.RULE,true);const r=ensureRoom(room),id=text(msg.annotationId,120),n=annotationById(room,id);if(!n||n.visibility!=="shared")throw new Error("sharedAnnotationRequired");const importance=IMPORTANCE_RANK[msg.importance]==null?"normal":msg.importance;let x=r.threadImportance.find(q=>q.annotationId===id);if(!x){x={annotationId:id};r.threadImportance.push(x);}Object.assign(x,{importance,updatedByRole:client.role,updatedAt:iso()});touch(room,"thread_importance",client.role,id);for(const c of room.clients.values())if(isSeat(c.role)){syncRules(c,room);syncNotification(c,room);}}
  function packageContent(room,client,msg){const analysis=D.chapterAnalysis(room,msg.categories,int(msg.minHighlightScore,0,100)||15)||{},report=D.reportContent(room,msg.categories)||{},r=ensureRoom(room);const shared=r.annotations.filter(x=>x.visibility==="shared"&&x.shareable!==false).slice(0,180);const annotations=shared.map(n=>({id:n.id,targetType:n.targetType,targetId:n.targetId,targetLabel:n.targetLabel,title:n.title,text:n.text,tags:clone(n.tags),createdAt:n.createdAt,updatedAt:n.updatedAt,author:"Player",replies:r.replies.filter(x=>x.annotationId===n.id).slice(0,80).map(x=>({text:x.text,author:"Player",createdAt:x.createdAt,updatedAt:x.updatedAt})),review:clone(reviewFor(room,n.id))}));const fav=isSeat(client.role)&&msg.includeMyFavorites?r.favorites[client.role]:[];return{schema:1,format:"card-practice-table-anonymous-package-v7.6",serverVersion:"7.9.19",protocol:PROTOCOLS.RULE,generatedAt:iso(),title:text(msg.title||"MTGO風 匿名対戦パッケージ",120),privacy:{anonymous:true,publicOnly:true,privateState:"excluded",privateAnnotations:"excluded",privateCardNames:"excluded",libraryOrder:"excluded",roomCode:"excluded",clientIdentifiers:"excluded",playerNames:"excluded",reconnectTokens:"excluded",packedSnapshots:"excluded"},summary:clone(analysis.summary||report.summary||{}),categoryCounts:clone(analysis.categoryCounts||report.categoryCounts||{}),chapters:clone(arr(analysis.chapters).map(({frameIds,...x})=>x).slice(0,160)),highlights:clone(arr(analysis.highlights).slice(0,240)),narrative:clone(arr(report.narrative).slice(0,24)),annotations,curatorSelections:clone(fav.slice(0,120).map(x=>({targetType:x.targetType,targetId:x.targetId,label:x.label})))};}
  function packageHtml(pkg){const c=pkg.content;return`<!doctype html><html lang="ja"><meta charset="utf-8"><title>${htmlEsc(c.title)}</title><style>body{font-family:system-ui,sans-serif;max-width:960px;margin:30px auto;padding:0 18px}.note{border:1px solid #ccc;padding:8px;margin:8px 0}.meta{color:#666;font-size:12px}</style><h1>${htmlEsc(c.title)}</h1><p>ターン ${int(c.summary?.turnCount)} / チャプター ${c.chapters.length} / 注釈 ${c.annotations.length}</p>${c.annotations.map(n=>`<article class="note"><b>${htmlEsc(n.title)}</b><p>${htmlEsc(n.text)}</p><span class="meta">${htmlEsc(n.targetLabel)}</span></article>`).join("")}<p class="meta">秘密state、カード名、山札順、部屋コード、接続者ID、プレイヤー名は含まれません。</p><p>SHA-256: ${pkg.integrity.contentCommitment}</p></html>`;}
  function exportPackage(client,room,msg){validateBase(client,room,msg,PROTOCOLS.COLLAB,false);const content=packageContent(room,client,msg),pkg={schema:1,kind:"cpt-anonymous-package",content,integrity:{algorithm:"SHA-256",contentCommitment:sha256(content)}};const format=msg.format==="html"?"html":"json",output=format==="html"?packageHtml(pkg):JSON.stringify(pkg,null,2),meta={id:uid("package"),createdAt:iso(),format,title:content.title,commitment:pkg.integrity.contentCommitment};const r=ensureRoom(room);r.packageHistory.push(meta);r.packageHistory=r.packageHistory.slice(-MAX_HISTORY);touch(room,"package_export",client.role||"spectator");send(client,{type:"replayAnonymousPackageReady",protocol:PROTOCOLS.COLLAB,rev:room.rev,package:pkg,format,output,packageMeta:meta,authoritySummary:authoritySummary(room),...authorityFor(room)});}
  function validatePackageHandler(client,room,msg){validateBase(client,room,msg,PROTOCOLS.REVIEW,false);const pkg=sanitizePackage(msg.package),validation={id:uid("validation"),validatedAt:iso(),contentCommitment:pkg.integrity.contentCommitment,safe:true};const r=ensureRoom(room);r.validationHistory.push(validation);r.validationHistory=r.validationHistory.slice(-MAX_HISTORY);touch(room,"package_validate",client.role||"spectator");send(client,{type:"replayAnonymousPackageValidated",protocol:PROTOCOLS.REVIEW,rev:room.rev,package:pkg,validation,authoritySummary:authoritySummary(room),...authorityFor(room)});}
  function validateReportHandler(client,room,msg){validateBase(client,room,msg,PROTOCOLS.RULE,false);const report=validateReport(msg.report),validation={id:uid("reportval"),validatedAt:iso(),contentCommitment:report.integrity.contentCommitment,safe:true};const r=ensureRoom(room);r.reportHistory.push(validation);r.reportHistory=r.reportHistory.slice(-MAX_HISTORY);touch(room,"report_validate",client.role||"spectator");send(client,{type:"replayComparisonReportValidated",protocol:PROTOCOLS.RULE,rev:room.rev,report,validation,authoritySummary:authoritySummary(room),...authorityFor(room)});}
  function reportHtml(report){const c=report.content,m=c.metrics||{};return`<!doctype html><html lang="ja"><meta charset="utf-8"><title>匿名パッケージ比較</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:32px auto;padding:0 16px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ccc;padding:7px;text-align:left}</style><h1>匿名パッケージ比較レポート</h1><table><tr><th>項目</th><th>A</th><th>B</th></tr>${["turns","chapters","highlights","annotations","replies","resolved"].map(k=>`<tr><th>${k}</th><td>${int(m.A?.[k])}</td><td>${int(m.B?.[k])}</td></tr>`).join("")}</table><p>SHA-256: ${htmlEsc(report.integrity.contentCommitment)}</p></html>`;}
  function shareReport(client,room,msg){validateBase(client,room,msg,PROTOCOLS.RULE,false);const report=validateReport(msg.report),format=msg.format==="html"?"html":"json",output=format==="html"?reportHtml(report):JSON.stringify(report,null,2);touch(room,"report_share",client.role||"spectator");send(client,{type:"replayComparisonReportShareReady",protocol:PROTOCOLS.RULE,rev:room.rev,report,format,output,authoritySummary:authoritySummary(room),...authorityFor(room)});}

  function handle(client,room,msg){
    try{
      switch(msg.type){
        case "replayCollabSyncRequest": validateBase(client,room,msg,PROTOCOLS.COLLAB,false); return syncCollab(client,room);
        case "replayAnnotationUpsert": return upsertAnnotation(client,room,msg);
        case "replayAnnotationDelete": return deleteAnnotation(client,room,msg);
        case "replayFavoriteToggle": return favoriteToggle(client,room,msg);
        case "replayAnonymousPackageExport": return exportPackage(client,room,msg);
        case "replayReviewSyncRequest": validateBase(client,room,msg,PROTOCOLS.REVIEW,false); return syncReview(client,room);
        case "replayAnnotationReplyUpsert": return upsertReply(client,room,msg);
        case "replayAnnotationReplyDelete": return deleteReply(client,room,msg);
        case "replayAnnotationReviewSet": return setReview(client,room,msg);
        case "replayAnnotationReviewAckToggle": return toggleAck(client,room,msg);
        case "replayAnonymousPackageValidate": return validatePackageHandler(client,room,msg);
        case "replayNotificationSyncRequest": validateBase(client,room,msg,PROTOCOLS.NOTIFICATION,false); return syncNotification(client,room);
        case "replayNotificationMarkRead": return markRead(client,room,msg);
        case "replayNotificationMarkAll": return markAll(client,room,msg);
        case "replayNotificationSettingsSyncRequest": validateBase(client,room,msg,PROTOCOLS.SETTINGS,false); return syncSettings(client,room);
        case "replayNotificationThreadMute": return setMute(client,room,msg);
        case "replayNotificationThreadUnmute": return unmute(client,room,msg);
        case "replayNotificationThreadRenotify": return renotify(client,room,msg);
        case "replayNotificationRuleSyncRequest": validateBase(client,room,msg,PROTOCOLS.RULE,false); return syncRules(client,room);
        case "replayNotificationPresetSet": return presetSet(client,room,msg);
        case "replayNotificationCustomRulesSet": return customSet(client,room,msg);
        case "replayNotificationThreadImportanceSet": return importanceSet(client,room,msg);
        case "replayComparisonReportValidate": return validateReportHandler(client,room,msg);
        case "replayComparisonReportShareExport": return shareReport(client,room,msg);
        default: throw new Error("unknownStage7Message");
      }
    }catch(e){
      const type=msg.type||""; const family=msg.protocol===PROTOCOLS.RULE?"replayNotificationRuleRejected":msg.protocol===PROTOCOLS.SETTINGS?"replayNotificationSettingsRejected":msg.protocol===PROTOCOLS.NOTIFICATION?"replayNotificationRejected":msg.protocol===PROTOCOLS.REVIEW?"replayReviewRejected":"replayCollabRejected";
      reject(client,room,msg,family,e?.message||e);
    }
  }
  function cancelClientTransactions(){ /* Stage 7 mutations are atomic and have no open transaction. */ }
  function snapshotForPersistence(room){const r=ensureRoom(room);return clone({...r,nonces:undefined,nonceKeys:[...r.nonces.keys()]});}
  function restorePersistence(room,data){room.v75v79=clone(data||{});const r=ensureRoom(room);r.nonces=new Map(arr(data?.nonceKeys).map(k=>[String(k),now()]));}
  return {PROTOCOLS,AUTHORITY_FLAGS,MESSAGE_TYPES,ensureRoom,authoritySummary,handle,cancelClientTransactions,snapshotForPersistence,restorePersistence,visibleAnnotations,notificationsFor,validatePackage:sanitizePackage,validateReport,sha256};
}
module.exports={PROTOCOLS,AUTHORITY_FLAGS,MESSAGE_TYPES,createEngine,sha256,stable,forbiddenPath};
