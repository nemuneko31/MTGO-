/* ============================================================
   MTGO Practice Client v7.9.47 consolidated client bundle
   Source-equivalent concatenation of the former inline v7.9.30-v7.9.46 blocks.
   Generated in original execution order. Do not reorder sections manually.
   ============================================================ */
"use strict";

/* ===== bundled original HTML script block 38/49 ===== */
/* ============================================================
   v7.9.30 Replacement Re-evaluation UI
   - サーバーが1件ずつ置換効果を適用し、変化後イベントを再評価
   - 適用履歴・現在イベント・必須/任意を選択画面へ表示
   - 必須置換が残る間は「元のイベント」を選べない
   - 同一置換効果の再適用と長すぎる連鎖はサーバー側で防止
   ============================================================ */
(function(){
"use strict";
const VERSION="7.9.30";
const PROTOCOL="cpt-v7.9.30-replacement-re-evaluation";
function arr(v){return Array.isArray(v)?v:[];}
function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}}
function esc30(v){try{return typeof v55Esc==="function"?v55Esc(v):typeof esc==="function"?esc(String(v??"")):String(v??"");}catch(_){return String(v??"");}}
function eventText(e){if(!e)return"不明なイベント";if(e.kind==="damage")return`${esc30(e.targetId||e.affectedRole)}へ ${Number(e.amount)||0}点のダメージ`;if(e.kind==="zoneMove")return`${esc30(e.fromZone)} → ${esc30(e.toZone)}（${esc30(e.cardId)}）`;return esc30(e.kind||"イベント");}
function candidateText(c,e){if(e?.kind==="damage"){if(c.preventAll)return"すべて軽減";if(c.setAmount!=null||c.replaceAmount!=null)return`${Number(c.setAmount??c.replaceAmount)||0}点に変更`;if(c.multiplier!=null||c.amountMultiplier!=null)return`${Number(c.multiplier??c.amountMultiplier)||1}倍`;return`${Number(c.amount)||0}点軽減`;}return`移動先: ${esc30(c.replaceZone||e?.toZone||"")}`;}
function traceRows(msg){const rows=arr(msg?.appliedTrace);if(!rows.length)return'<div class="note">まだ置換効果は適用されていません。</div>';return rows.map(x=>`<div class="ptmod-row"><b>${Number(x.iteration)||0}. ${esc30(x.label||x.selectedId)}</b><span>${eventText(x.before)} → ${eventText(x.after)}</span></div>`).join("");}
function serverSupports(){try{const s=typeof v55Runtime==="function"?v55Runtime().server:null;return !!(s&&s.serverReplacementReevaluationV7930);}catch(_){return false;}}
const openBase=typeof v55OpenReplacement==="function"?v55OpenReplacement:null;
if(openBase){
  v55OpenReplacement=function(msg){
    if(!msg||!msg.txId)return openBase(msg);
    const r=typeof v55Runtime==="function"?v55Runtime():null;if(r)r.replacement=typeof v55Clone==="function"?v55Clone(msg):clone(msg);
    const cs=arr(msg.candidates),iteration=Math.max(0,Number(msg.iteration)||0),mandatory=cs.filter(c=>c.mandatory!==false),optional=cs.length-mandatory.length;
    const buttons=cs.map(c=>`<button class="btn" data-v55rep="${esc30(c.id)}"><b>${esc30(c.label)}</b><br><small>${candidateText(c,msg.event)} ／ ${c.mandatory===false?"任意":"必須"}${c.sourceName?` ／ ${esc30(c.sourceName)}`:""}</small></button>`).join("");
    const original=msg.canUseOriginal?'<button class="btn" data-v55rep="original">残りを適用せず現在のイベントを確定</button>':"";
    const status=mandatory.length?`必須の置換効果が${mandatory.length}件あります。影響を受けるプレイヤーが1件選んでください。`:`残り${optional}件は任意です。適用せず現在のイベントを確定できます。`;
    openModal("v7.9.30 置換効果の再評価",`<div class="v55-status ${mandatory.length?"warn":"safe"}">${esc30(status)}</div><div class="v55-grid"><div><small>再評価回数</small><b>${iteration}</b></div><div><small>現在のイベント</small><b>${eventText(msg.event)}</b></div></div><h3>適用済み</h3><div class="ptmod-list">${traceRows(msg)}</div><h3>現在適用できる置換効果</h3><div class="v55-choice">${buttons||'<div class="note">候補はありません。</div>'}${original}</div><div class="note" style="font-size:10px">1件を選ぶたびにサーバーが変化後のイベントを再評価します。同じ置換効果は同じイベントへ二度適用されません。</div>`,`<button class="btn warn" data-v55repcancel="1">取消</button>`,`lg`);
    setModalHandler(e=>{const b=e.target.closest("[data-v55rep]");if(b){v55Send({type:"replacementTxCommit",baseRev:Number(online.rev)||0,actionNonce:v55Id("replacement-commit"),txId:msg.txId,candidateId:b.dataset.v55rep});return;}if(e.target.closest("[data-v55repcancel]")){v55Send({type:"replacementTxCancel",txId:msg.txId,reason:"clientCancel"});closeModal();}});
  };
}
function diagnose(){const sample={event:{kind:"damage",targetId:"B",amount:3},iteration:1,appliedTrace:[{iteration:1,label:"1点軽減",before:{kind:"damage",targetId:"B",amount:4},after:{kind:"damage",targetId:"B",amount:3}}]},tests=[{name:"dependency",ok:!!openBase},{name:"event summary",ok:/3点/.test(eventText(sample.event))},{name:"trace summary",ok:/1点軽減/.test(traceRows(sample))},{name:"candidate summary",ok:/すべて軽減/.test(candidateText({preventAll:true},sample.event))},{name:"server flag reader",ok:typeof serverSupports==="function"}];return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests,serverSupports:serverSupports()};}
globalThis.CPT_V7930_REPLACEMENT={version:VERSION,protocol:PROTOCOL,eventText,candidateText,traceRows,serverSupports,diagnose};
try{if(document?.body?.dataset)document.body.dataset.v7930="replacement-re-evaluation";}catch(_){}
})();

try{document.title="カードゲーム練習卓 v7.9.30 置換再評価";}catch(_){}

/* ===== bundled original HTML script block 39/49 ===== */
/* ============================================================
   v7.9.31 Library Workflow Helpers
   - 複数行き先への順番付き振り分け
   - サーバー権限の暗号学的無作為選択
   - 束分け後に指定プレイヤーが1束を選ぶ二段階処理
   ============================================================ */
(function(){
"use strict";
const VERSION="7.9.31";
const PROTOCOL="cpt-v7.9.31-library-workflows";
const DESTINATIONS=new Set(["top","bottom","hand","sideboard","graveyard","exile","command","battlefield","shuffle"]);
function arr(v){return Array.isArray(v)?v:[];}
function clamp(v,min,max,def=min){const n=Math.trunc(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):def;}
function role(v,def="A"){return v==="B"?"B":v==="A"?"A":def;}
function destinations(v){const out=[];for(const x of arr(v)){const d=String(x||"");if(DESTINATIONS.has(d)&&!out.includes(d))out.push(d);}return out.length?out:["top","bottom"];}
function arrangeOptions(o={}){return{destinations:destinations(o.destinations),reveal:o.reveal===true,sourceLabel:String(o.sourceLabel||"v7.9.31 順番付き振り分け"),minByDestination:o.minByDestination||{},maxByDestination:o.maxByDestination||{}};}
function randomOptions(o={}){return{pickCount:clamp(o.pickCount,1,30,1),destination:DESTINATIONS.has(String(o.destination))?String(o.destination):"hand",remainderDestination:DESTINATIONS.has(String(o.remainderDestination))?String(o.remainderDestination):"top",revealSelected:o.revealSelected===true,revealPool:o.revealPool===true,lookPool:o.lookPool===true,sourceLabel:String(o.sourceLabel||"v7.9.31 サーバー無作為選択")};}
function pileOptions(o={}){return{pileCount:clamp(o.pileCount,2,5,2),selectorRole:role(o.selectorRole,"B"),selectedDestination:DESTINATIONS.has(String(o.selectedDestination))?String(o.selectedDestination):"hand",remainderDestination:DESTINATIONS.has(String(o.remainderDestination))?String(o.remainderDestination):"graveyard",revealPiles:o.revealPiles!==false,lookPiles:o.lookPiles!==false,allowEmptyPiles:o.allowEmptyPiles===true,revealSelected:o.revealSelected===true,sourceLabel:String(o.sourceLabel||"v7.9.31 束分け")};}
function start(operation,count,options,targetRole,cb){const api=globalThis.CPT_V51;if(!api||typeof api.start!=="function")return false;return api.start(operation,clamp(count,1,30,1),options,role(targetRole,"A"),cb);}
function startArrange(count,o={},targetRole,cb){return start("arrange",count,arrangeOptions(o),targetRole,cb);}
function startRandom(count,o={},targetRole,cb){return start("random",count,randomOptions(o),targetRole,cb);}
function startPiles(count,o={},targetRole,cb){return start("piles",count,pileOptions(o),targetRole,cb);}
function serverSupports(){try{const s=globalThis.CPT_V51?.runtime?.().server;return !!(s&&s.serverLibraryArrangementV7931&&s.serverLibraryRandomSelectionV7931&&s.serverLibraryPileWorkflowV7931);}catch(_){return false;}}
function diagnose(){const a=arrangeOptions({destinations:["bottom","top","bottom","bad"]}),r=randomOptions({pickCount:99,destination:"exile",remainderDestination:"shuffle"}),p=pileOptions({pileCount:9,selectorRole:"B"});const tests=[{name:"v5.1 dependency",ok:!!globalThis.CPT_V51},{name:"arrange destinations",ok:a.destinations.join(",")==="bottom,top"},{name:"random bounds",ok:r.pickCount===30&&r.destination==="exile"&&r.remainderDestination==="shuffle"},{name:"pile bounds",ok:p.pileCount===5&&p.selectorRole==="B"},{name:"server flags",ok:typeof serverSupports==="function"}];return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests,serverSupports:serverSupports()};}
globalThis.CPT_V7931_LIBRARY={version:VERSION,protocol:PROTOCOL,destinations,arrangeOptions,randomOptions,pileOptions,startArrange,startRandom,startPiles,serverSupports,diagnose};
try{if(document?.body?.dataset)document.body.dataset.v7931="library-workflows";}catch(_){}
})();

try{document.title="カードゲーム練習卓 v7.9.31 ライブラリーワークフロー";}catch(_){}

/* ===== bundled original HTML script block 40/49 ===== */
/* ============================================================
   v7.9.32 Multi-Target Constraint Engine
   - distinct / same-controller / different-controller relations
   - per-kind and card eligibility limits
   - public-information dynamic maximum target count
   - divided-value validation and resolution-time relation recheck
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.CPT_V7932_TARGETS=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.32",PROTOCOL="cpt-v7.9.32-target-constraints",ROLES=new Set(["A","B"]);
const arr=v=>Array.isArray(v)?v:[], num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const int=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.trunc(num(v))));
const uniq=v=>[...new Set(arr(v).map(x=>String(x||"")).filter(Boolean))];
const lower=v=>String(v||"").toLowerCase();
function roleRule(v){return["any","you","opponent","A","B"].includes(v)?v:"any";}
function normalize(raw={}){
  const c=raw&&typeof raw==="object"?raw:{};
  const rel=c.relation&&typeof c.relation==="object"?c.relation:{};
  const alloc=c.allocation&&typeof c.allocation==="object"?c.allocation:null;
  const dyn=c.dynamicMax&&typeof c.dynamicMax==="object"?c.dynamicMax:null;
  return{
    enabled:c.enabled!==false,required:!!c.required,min:int(c.min??c.minTargets,0,100),max:int(c.max??c.maxTargets,0,100)||1,
    requireDistinct:c.requireDistinct!==false,
    cardMin:int(c.cardMin,0,100),cardMax:int(c.cardMax,0,100)||100,playerMin:int(c.playerMin,0,2),playerMax:int(c.playerMax,0,2)||2,zoneMin:int(c.zoneMin,0,100),zoneMax:int(c.zoneMax,0,100)||100,
    allowedKinds:uniq(c.allowedKinds).filter(x=>["card","player","zone"].includes(x)),
    cardZones:uniq(c.cardZones||c.zones),cardTypesAny:uniq(c.cardTypesAny||c.types),cardTypesAll:uniq(c.cardTypesAll),excludedCardTypes:uniq(c.excludedCardTypes),
    cardController:roleRule(c.cardController||c.controller||c.targetRelation),cardOwner:roleRule(c.cardOwner||c.owner),
    playerRule:["any","you","opponent"].includes(c.playerRule)?c.playerRule:"any",
    relation:{sameController:!!rel.sameController,differentControllers:!!rel.differentControllers,sameOwner:!!rel.sameOwner,differentOwners:!!rel.differentOwners,distinctNames:!!rel.distinctNames,sameName:!!rel.sameName},
    dynamicMax:dyn?{metric:String(dyn.metric||"xValue"),role:roleRule(dyn.role),zone:String(dyn.zone||""),multiplier:num(dyn.multiplier,1),add:num(dyn.add,0),cap:int(dyn.cap,0,100)||100}:null,
    allocation:alloc?{total:int(alloc.total,0,9999),minEach:int(alloc.minEach,0,9999),maxEach:int(alloc.maxEach,0,9999)||9999,values:alloc.values&&typeof alloc.values==="object"?{...alloc.values}:{}}:null
  };
}
function resolveRole(rule,actor){if(rule==="you")return actor;if(rule==="opponent")return actor==="A"?"B":"A";return ROLES.has(rule)?rule:"";}
function dynamicValue(d,ctx={}){if(!d)return null;let v=0;switch(d.metric){case"xValue":v=num(ctx.xValue);break;case"sourcePower":v=num(ctx.sourcePower);break;case"sourceToughness":v=num(ctx.sourceToughness);break;case"actorLife":v=num(ctx.actorLife);break;case"opponentLife":v=num(ctx.opponentLife);break;case"cardsInZone":v=num(ctx.cardsInZone);break;default:return null;}return int(v*d.multiplier+d.add,0,d.cap);}
function cardTypes(c){return uniq([c?.type,...arr(c?.types)]).map(lower);}
function validate(input={}){
  const cfg=normalize(input.config||{}),actor=ROLES.has(input.actorRole)?input.actorRole:"A",raw=input.targets||{},cards=arr(input.cards),players=arr(input.players).map(String),zones=arr(input.zoneRefs),errors=[];
  const rawCard=arr(raw.cardIds).map(String),rawPlayers=arr(raw.playerIds).map(String),rawZones=arr(raw.zoneRefs);
  if(cfg.requireDistinct&&(new Set(rawCard).size!==rawCard.length||new Set(rawPlayers).size!==rawPlayers.length))errors.push("duplicateTarget");
  const allCount=rawCard.length+rawPlayers.length+rawZones.length,dv=dynamicValue(cfg.dynamicMax,input.context||{}),effectiveMax=dv==null?cfg.max:Math.min(cfg.max,dv);
  const min=cfg.required?Math.max(1,cfg.min):cfg.min;
  if(allCount<min||allCount>effectiveMax)errors.push("targetCountInvalid");
  if(rawCard.length<cfg.cardMin||rawCard.length>cfg.cardMax)errors.push("targetCardCountInvalid");
  if(rawPlayers.length<cfg.playerMin||rawPlayers.length>cfg.playerMax)errors.push("targetPlayerCountInvalid");
  if(rawZones.length<cfg.zoneMin||rawZones.length>cfg.zoneMax)errors.push("targetZoneCountInvalid");
  if(cfg.allowedKinds.length){if(rawCard.length&&!cfg.allowedKinds.includes("card"))errors.push("cardTargetsNotAllowed");if(rawPlayers.length&&!cfg.allowedKinds.includes("player"))errors.push("playerTargetsNotAllowed");if(rawZones.length&&!cfg.allowedKinds.includes("zone"))errors.push("zoneTargetsNotAllowed");}
  const byId=new Map(cards.map(c=>[String(c.id),c]));
  for(const id of rawCard){const c=byId.get(id);if(!c){errors.push("targetCardMissing");continue;}const ts=cardTypes(c);if(cfg.cardZones.length&&!cfg.cardZones.includes(String(c.zone)))errors.push(`targetZoneMismatch:${id}`);if(cfg.cardTypesAny.length&&!cfg.cardTypesAny.some(t=>ts.includes(lower(t))))errors.push(`targetTypeMismatch:${id}`);if(cfg.cardTypesAll.length&&!cfg.cardTypesAll.every(t=>ts.includes(lower(t))))errors.push(`targetTypeAllMismatch:${id}`);if(cfg.excludedCardTypes.some(t=>ts.includes(lower(t))))errors.push(`targetTypeExcluded:${id}`);const cr=resolveRole(cfg.cardController,actor),or=resolveRole(cfg.cardOwner,actor);if(cr&&String(c.controller)!==cr)errors.push(`targetControllerMismatch:${id}`);if(or&&String(c.ownerRole)!==or)errors.push(`targetOwnerMismatch:${id}`);}
  for(const p of rawPlayers){if(!ROLES.has(p))errors.push("targetPlayerInvalid");if(cfg.playerRule==="you"&&p!==actor)errors.push(`targetPlayerMismatch:${p}`);if(cfg.playerRule==="opponent"&&p===actor)errors.push(`targetPlayerMismatch:${p}`);}
  const selected=rawCard.map(id=>byId.get(id)).filter(Boolean), controllers=new Set(selected.map(c=>String(c.controller))), owners=new Set(selected.map(c=>String(c.ownerRole))), names=selected.map(c=>String(c.name||""));
  if(selected.length>1&&cfg.relation.sameController&&controllers.size!==1)errors.push("targetsMustShareController");
  if(selected.length>1&&cfg.relation.differentControllers&&controllers.size!==selected.length)errors.push("targetsMustHaveDifferentControllers");
  if(selected.length>1&&cfg.relation.sameOwner&&owners.size!==1)errors.push("targetsMustShareOwner");
  if(selected.length>1&&cfg.relation.differentOwners&&owners.size!==selected.length)errors.push("targetsMustHaveDifferentOwners");
  if(selected.length>1&&cfg.relation.distinctNames&&new Set(names).size!==names.length)errors.push("targetsMustHaveDistinctNames");
  if(selected.length>1&&cfg.relation.sameName&&new Set(names).size!==1)errors.push("targetsMustShareName");
  if(cfg.allocation){const vals=cfg.allocation.values||{};let total=0;for(const id of [...rawCard,...rawPlayers]){const n=int(vals[id],0,9999);if(n<cfg.allocation.minEach||n>cfg.allocation.maxEach)errors.push(`allocationPerTargetInvalid:${id}`);total+=n;}if(total!==cfg.allocation.total)errors.push("allocationTotalInvalid");}
  return{ok:errors.length===0,errors:[...new Set(errors)],min,max:cfg.max,effectiveMax,count:allCount,cardCount:rawCard.length,playerCount:rawPlayers.length,zoneCount:rawZones.length,dynamicMax:dv,config:cfg};
}
function parseText(text){const s=String(text||""),c={enabled:true,relation:{}};let m;if((m=s.match(/最大\s*([XxＸｘ0-9０-９]+)\s*(?:体|個|つ|人|枚)/))){if(/[XxＸｘ]/.test(m[1])){c.dynamicMax={metric:"xValue"};c.max=100;}else c.max=Number(m[1].replace(/[０-９]/g,x=>String.fromCharCode(x.charCodeAt(0)-65248)));c.min=0;}if(/それぞれ異なる対象|異なる[^。]{0,8}を対象/.test(s))c.requireDistinct=true;if(/同じプレイヤーがコントロール/.test(s))c.relation.sameController=true;if(/異なるプレイヤーがコントロール/.test(s))c.relation.differentControllers=true;if(/あなたがコントロール/.test(s))c.cardController="you";if(/対戦相手がコントロール/.test(s))c.cardController="opponent";if(/対象のクリーチャー|クリーチャー[^。]{0,20}を対象/.test(s))c.cardTypesAny=["Creature"];if(/対象の土地|土地[^。]{0,20}を対象/.test(s))c.cardTypesAny=["Land"];return normalize(c);}
function describe(raw){const c=normalize(raw),out=[`${c.min}～${c.dynamicMax?"動的上限":c.max}個`];if(c.relation.sameController)out.push("同じコントローラー");if(c.relation.differentControllers)out.push("異なるコントローラー");if(c.cardTypesAny.length)out.push(c.cardTypesAny.join("/")+"のみ");if(c.cardController!=="any")out.push(`コントローラー:${c.cardController}`);if(c.allocation)out.push(`割り振り合計${c.allocation.total}`);return out.join(" / ");}
function diagnose(){const cards=[{id:"a",controller:"A",ownerRole:"A",zone:"creatures",name:"A",types:["Creature"]},{id:"b",controller:"A",ownerRole:"B",zone:"creatures",name:"B",types:["Creature"]}];const q=validate({targets:{cardIds:["a","b"]},cards,actorRole:"A",config:{min:2,max:2,cardTypesAny:["Creature"],relation:{sameController:true}}});const tests=[{name:"same controller",ok:q.ok},{name:"dynamic max",ok:validate({targets:{cardIds:["a"]},cards,actorRole:"A",context:{xValue:1},config:{min:0,max:9,dynamicMax:{metric:"xValue"}}}).effectiveMax===1},{name:"text parser",ok:parseText("同じプレイヤーがコントロールするクリーチャー最大X体を対象とする").relation.sameController}];return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};}
return{version:VERSION,protocol:PROTOCOL,normalize,validate,parseText,describe,dynamicValue,diagnose};
});

/* ===== bundled original HTML script block 41/49 ===== */
/* v7.9.32 Client Target Constraint Integration */
(function(){
"use strict";
if(!globalThis.CPT_V7932_TARGETS)return;
const api=globalThis.CPT_V7932_TARGETS,baseProfile=typeof v53TargetProfile==="function"?v53TargetProfile:null,baseCandidate=typeof v53CandidateInfos==="function"?v53CandidateInfos:null,baseProposal=typeof v52Proposal==="function"?v52Proposal:null;
function profile(ab){const p=baseProfile?baseProfile(ab):{},raw=ab?.targetProfile||{},parsed=api.parseText([ab?.name,ab?.memo,ab?.resolveNote,ab?.defaultTargetMemo].filter(Boolean).join("。")),c=api.normalize({...parsed,...raw,...(raw.constraints||raw.v7932||{})});return{...p,minTargets:c.min,maxTargets:c.dynamicMax?Math.min(c.max,99):c.max,constraints:c,v7932:c};}
if(baseProfile)v53TargetProfile=profile;
if(baseCandidate)v53CandidateInfos=function(p,role,sourceId){const rows=baseCandidate(p,role,sourceId);const c=api.normalize(p.constraints||p.v7932||p);return rows.filter(x=>{const f=typeof findCard==="function"?findCard(x.id):null,card=f?.card||{};const q=api.validate({targets:{cardIds:[x.id]},cards:[{id:x.id,zone:x.zone,ownerRole:x.player,controller:card.controller||x.player,name:x.name,type:card.type,types:card.types||[]}],actorRole:role,config:{...c,min:0,max:99,cardMin:0,playerMin:0,zoneMin:0,relation:{},allocation:null},context:{xValue:99}});return q.ok;});};
if(baseProposal)v52Proposal=function(flow,pay){const p=baseProposal.apply(this,arguments),raw=flow?.targetCfg||flow?.card?.targetProfile||{},parsed=api.parseText([flow?.card?.name,flow?.card?.memo,flow?.card?.rulesText].filter(Boolean).join("。")),c=api.normalize({...parsed,...raw,...(raw.constraints||raw.v7932||{})});p.targetConfig={...p.targetConfig,constraints:c,v7932:c,xValue:Number(p.cost?.X)||0};return p;};
try{document.body.dataset.v7932="multi-target-constraints";}catch(_){}
globalThis.cptV7932DescribeTargetProfile=function(ab){return api.describe(profile(ab).constraints);};
})();

/* ===== bundled original HTML script block 42/49 ===== */
/* ============================================================
   v7.9.34 Shared Save Fallback
   - shared dictionary + decks are saved as one canonical bundle
   - startup restores newer shared data automatically
   - exact dictionary payload is preserved (automation fields included)
   - save is verified by a read-after-write round trip
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.CPT_V7934_PERSISTENCE=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.34",PROTOCOL="cpt-v7.9.34-shared-save-fallback",SCHEMA=1;
const isObj=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function canonical(v){
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function hash(v){let h=0x811c9dc5,s=canonical(v);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,"0");}
function normalizeBundle(raw){
  raw=isObj(raw)?raw:{};
  const cards=isObj(raw.cards)?clone(raw.cards):{};
  const decks=Array.isArray(raw.decks)?clone(raw.decks):[];
  return{schema:Number(raw.schema)||SCHEMA,cards,decks,savedAt:String(raw.savedAt||""),appVersion:String(raw.appVersion||VERSION)};
}
function newerOrEqual(remote,local){
  const r=Date.parse(remote&&remote.updatedAt||""),l=Date.parse(local&&local.updatedAt||"");
  if(Number.isFinite(r)&&Number.isFinite(l))return r>=l;
  if(Number.isFinite(r)&&!Number.isFinite(l))return true;
  if(!Number.isFinite(r)&&Number.isFinite(l))return false;
  return true;
}
function mergeCards(local,remote,overwrite){
  const out=overwrite?{}:clone(isObj(local)?local:{}),src=isObj(remote)?remote:{};let added=0,replaced=0,keptLocal=0;
  for(const [k,v] of Object.entries(src)){
    if(!Object.prototype.hasOwnProperty.call(out,k)){out[k]=clone(v);added++;continue;}
    if(overwrite||newerOrEqual(v,out[k])){out[k]=clone(v);replaced++;}else keptLocal++;
  }
  return{value:out,added,replaced,keptLocal};
}
function deckKey(d,i){return String(d&&d.deckId||"")||("name:"+String(d&&d.deckName||"")+":"+i);}
function mergeDecks(local,remote,overwrite){
  const out=overwrite?[]:clone(Array.isArray(local)?local:[]),index=new Map(out.map((d,i)=>[deckKey(d,i),i]));let added=0,replaced=0,keptLocal=0;
  (Array.isArray(remote)?remote:[]).forEach((d,i)=>{const k=deckKey(d,i);if(!index.has(k)){index.set(k,out.length);out.push(clone(d));added++;return;}const p=index.get(k);if(overwrite||newerOrEqual(d,out[p])){out[p]=clone(d);replaced++;}else keptLocal++;});
  return{value:out,added,replaced,keptLocal};
}
function mergeBundle(localState,bundle,opts={}){
  const b=normalizeBundle(bundle),overwrite=opts.overwrite===true;
  const c=mergeCards(localState&&localState.cardDictionary,b.cards,overwrite),d=mergeDecks(localState&&localState.decks,b.decks,overwrite);
  return{cardDictionary:c.value,decks:d.value,stats:{cardsAdded:c.added,cardsReplaced:c.replaced,cardsKeptLocal:c.keptLocal,decksAdded:d.added,decksReplaced:d.replaced,decksKeptLocal:d.keptLocal}};
}
function buildBundle(cardDictionary,decks,meta={}){return normalizeBundle({schema:SCHEMA,cards:cardDictionary||{},decks:decks||[],savedAt:meta.savedAt||new Date().toISOString(),appVersion:meta.appVersion||VERSION});}
function diagnose(){const local={cardDictionary:{A:{name:"A",updatedAt:"2026-01-01T00:00:00Z",effectStudio:{x:1}}},decks:[{deckId:"d",deckName:"old",updatedAt:"2026-01-01T00:00:00Z"}]},remote=buildBundle({A:{name:"A",updatedAt:"2026-02-01T00:00:00Z",effectStudio:{x:2}},B:{name:"B"}},[{deckId:"d",deckName:"new",updatedAt:"2026-02-01T00:00:00Z"}]);const m=mergeBundle(local,remote);const tests=[{name:"canonical hash",ok:hash({b:1,a:2})===hash({a:2,b:1})},{name:"automation preserved",ok:m.cardDictionary.A.effectStudio.x===2},{name:"card added",ok:!!m.cardDictionary.B},{name:"deck name restored",ok:m.decks[0].deckName==="new"},{name:"bundle round trip",ok:hash(normalizeBundle(remote))===hash(remote)}];return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};}
return{version:VERSION,protocol:PROTOCOL,schema:SCHEMA,clone,canonical,hash,normalizeBundle,buildBundle,mergeCards,mergeDecks,mergeBundle,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7934_PERSISTENCE)return;
const API=globalThis.CPT_V7934_PERSISTENCE,SYNC_KEY="cpt_shared_sync_v2",hadLocalAtModuleLoad=(()=>{try{return !!localStorage.getItem(LS_KEY);}catch(_){return false;}})();
function syncRead(){try{const x=JSON.parse(localStorage.getItem(SYNC_KEY)||"null");return x&&typeof x==="object"?x:{};}catch(_){return{};}}
function syncWrite(patch){const x=Object.assign(syncRead(),patch||{});try{localStorage.setItem(SYNC_KEY,JSON.stringify(x));}catch(_){}return x;}
function localSaveDetail(){
  const e=globalThis.CPT_LAST_SAVE_ERROR;
  if(e&&typeof e==="object")return String(e.message||e.name||"localStorage保存失敗");
  if(e)return String(e);
  return "localStorageへの保存に失敗しました（容量上限またはブラウザーの保存制限の可能性）";
}
function persistLocal(){
  if(typeof saveState!=="function")return{ok:true,error:""};
  try{const ok=saveState(true)!==false;return{ok,error:ok?"":localSaveDetail()};}
  catch(e){return{ok:false,error:String(e&&e.message||e||localSaveDetail())};}
}
function autoRestoreEnabled(){const x=syncRead();if(typeof x.autoRestoreEnabled==="boolean")return x.autoRestoreEnabled;return (state.settings||{}).sharedAutoRestoreEnabled!==false;}
function bundleNow(){return API.buildBundle(state.cardDictionary||{},state.decks||[],{savedAt:nowISO(),appVersion:API.version});}
function countBundle(b){b=API.normalizeBundle(b);return{cards:Object.keys(b.cards).length,decks:b.decks.length};}
async function request(path,opts){const r=await _sharedFetch(path,Object.assign({cache:"no-store"},opts||{}));return r;}
async function getBundle(){
  const b=await request("/api/shared-bundle");
  if(b.status===200&&b.json&&b.json.ok&&b.json.data)return{version:Number(b.json.version)||0,updatedAt:b.json.updatedAt||null,data:API.normalizeBundle(b.json.data),source:"bundle"};
  const [l,d]=await Promise.all([request("/api/shared-library"),request("/api/shared-decks")]);
  if(l.status!==200||d.status!==200||!l.json?.ok||!d.json?.ok)return null;
  const data=API.buildBundle(l.json.data?.cards||{},d.json.data?.decks||[],{savedAt:[l.json.updatedAt,d.json.updatedAt].filter(Boolean).sort().pop()||"",appVersion:"legacy"});
  return{version:Math.max(Number(l.json.version)||0,Number(d.json.version)||0),libraryVersion:Number(l.json.version)||0,decksVersion:Number(d.json.version)||0,updatedAt:data.savedAt||null,data,source:"legacy"};
}
async function postVerified(path,data,pw){
  const p=await request(path,{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":pw},body:JSON.stringify({data})});
  if(p.status!==200||!p.json?.ok)throw new Error((p.json&&p.json.error)||("HTTP "+p.status));
  const g=await request(path);
  if(g.status!==200||!g.json?.ok||!g.json.data)throw new Error("保存後の再読込に失敗しました");
  if(API.hash(g.json.data)!==API.hash(data))throw new Error("保存後の内容照合が一致しません");
  return{version:Number(g.json.version)||Number(p.json.version)||0,updatedAt:g.json.updatedAt||p.json.updatedAt||null};
}
function applyBundle(bundle,mode,meta={}){
  const overwrite=mode==="overwrite",m=API.mergeBundle(state,bundle,{overwrite});
  state.cardDictionary=m.cardDictionary;state.decks=m.decks;
  const local=persistLocal();
  try{render();renderLog();}catch(_){}
  const c=countBundle(bundle);syncWrite({sharedSource:meta.source||"bundle",bundleVersion:Number(meta.version)||0,bundleUpdatedAt:meta.updatedAt||null,lastAppliedAt:nowISO(),lastAppliedHash:API.hash(bundle),lastLocalSaveOk:local.ok,lastLocalSaveError:local.error||null});
  return{...m.stats,remoteCards:c.cards,remoteDecks:c.decks,localSaved:local.ok,localSaveError:local.error};
}
async function saveAllWithPassword(pw){
  if(!sharedState.enabled)throw new Error("共有機能は無効です");
  if(!pw)throw new Error("管理パスワードを入力してください");
  const local=persistLocal();
  const data=bundleNow(),v=await postVerified("/api/shared-bundle",data,pw);
  // 旧版クライアント互換用ミラー。正本は bundle で、ミラー失敗は正本成功を取り消さない。
  const mirrors=await Promise.allSettled([
    request("/api/shared-library",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":pw},body:JSON.stringify({data:{cards:data.cards}})}),
    request("/api/shared-decks",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":pw},body:JSON.stringify({data:{decks:data.decks}})})
  ]);
  const c=countBundle(data);syncWrite({bundleVersion:v.version,bundleUpdatedAt:v.updatedAt,lastSavedAt:nowISO(),lastSavedHash:API.hash(data)});
  return{...v,...c,mirrorOk:mirrors.every(x=>x.status==="fulfilled"&&x.value.status===200&&x.value.json?.ok),localSaved:local.ok,localSaveError:local.error};
}
async function sharedSaveAll(){
  if(!sharedState.enabled){toast("共有機能は無効です");return;}
  const pw=(document.getElementById("shPw")?.value)||"";if(!pw){toast("管理パスワードを入力してください");return;}
  confirmDlg("カード辞書とデッキを1つの共有データとして保存します。よろしいですか？",async()=>{
    sharedState.lastMsg="共有一括保存中...";_sharedRender();
    try{const r=await saveAllWithPassword(pw);const localNote=r.localSaved?"":` / 端末保存のみ失敗: ${r.localSaveError}`;sharedState.lastMsg=`共有一括保存・再照合完了（v${r.version} / 辞書${r.cards}件 / デッキ${r.decks}件${r.mirrorOk?"":" / 旧版ミラーのみ失敗"}${localNote}）`;toast(r.localSaved?"共有保存を確認しました":"共有サーバーへの保存は成功しました（端末保存のみ失敗）");}
    catch(e){sharedState.lastMsg="保存失敗: "+String(e.message||e);showErr(sharedState.lastMsg);} _sharedRender();
  });
}
async function loadBundleInteractive(mode){
  if(!sharedState.enabled){toast("共有機能は無効です");return;}
  try{const r=await getBundle();if(!r||!r.data){sharedState.lastMsg="共有データはまだありません";_sharedRender();return;}const c=countBundle(r.data);
    const run=()=>{try{const s=applyBundle(r.data,mode,r);const localNote=s.localSaved?"":` / 端末保存のみ失敗: ${s.localSaveError}`;sharedState.lastMsg=`共有データを${mode==="overwrite"?"上書き":"マージ"}復元（辞書${c.cards}件 / デッキ${c.decks}件${localNote}）`;toast(s.localSaved?"共有データを復元しました":"共有データを復元しました（端末保存のみ失敗）");_sharedRender();}catch(e){showErr("共有復元失敗: "+String(e.message||e));}};
    if(mode==="overwrite")confirmDlg("ローカルのカード辞書とデッキを共有データで置き換えます。よろしいですか？",run);else run();
  }catch(e){sharedState.lastMsg="読込失敗: "+String(e.message||e);_sharedRender();}
}
async function autoRestore(){
  try{
    if(!autoRestoreEnabled())return{skipped:"setting"};
    const st=await request("/api/shared-status");if(st.status!==200||!st.json?.enabled)return{skipped:"disabled"};
    sharedState.enabled=true;sharedState.reason=st.json.reason||"";sharedState.adminConfigured=!!st.json.adminConfigured;
    const r=await getBundle();if(!r||!r.data)return{skipped:"empty"};
    const sm=syncRead();if(sm.sharedSource===r.source&&Number(r.version)<=Number(sm.bundleVersion||0))return{skipped:"current"};
    const mode=!hadLocalAtModuleLoad?"overwrite":"merge",stats=applyBundle(r.data,mode,r),c=countBundle(r.data);
    const localNote=stats.localSaved?"":` / 端末保存のみ失敗: ${stats.localSaveError}`;sharedState.lastMsg=`起動時に共有データを自動復元（辞書${c.cards}件 / デッキ${c.decks}件${localNote}）`;_sharedRender();
    return{restored:true,mode,stats,version:r.version};
  }catch(e){sharedState.lastMsg="共有自動復元を保留: "+String(e.message||e);_sharedRender();return{error:String(e.message||e)};}
}
// 辞書だけ・デッキだけの旧保存ボタンでも、欠落を防ぐため常に一括保存する。
sharedSaveLibrary=sharedSaveAll;sharedSaveDecks=sharedSaveAll;
_sharedApplyLibrary=function(payload,mode){const b=API.buildBundle(payload?.cards||{},state.decks||[],{savedAt:nowISO()});const s=applyBundle(b,mode);sharedState.lastMsg=`共有辞書を${mode==="overwrite"?"上書き":"マージ"}読込: ${s.cardsAdded+s.cardsReplaced}件`;_sharedRender();};
_sharedApplyDecks=function(payload,mode){const b=API.buildBundle(state.cardDictionary||{},payload?.decks||[],{savedAt:nowISO()});const s=applyBundle(b,mode);sharedState.lastMsg=`共有デッキを${mode==="overwrite"?"上書き":"マージ"}読込: ${s.decksAdded+s.decksReplaced}件`;_sharedRender();};
sharedLoadLibrary=()=>loadBundleInteractive("merge");sharedLoadDecks=()=>loadBundleInteractive("merge");
const baseOpenSharedModal=openSharedModal;
openSharedModal=function(){
  baseOpenSharedModal();
  const row=document.getElementById("shSaveLib")?.parentElement;
  if(row){
    const load=document.getElementById("shLoadLib"),loadDeck=document.getElementById("shLoadDeck"),saveLib=document.getElementById("shSaveLib"),saveDeck=document.getElementById("shSaveDeck");
    if(load){load.textContent="共有データをマージ復元";load.onclick=()=>loadBundleInteractive("merge");}
    if(loadDeck)loadDeck.style.display="none";if(saveLib)saveLib.style.display="none";if(saveDeck)saveDeck.style.display="none";
    const over=document.createElement("button");over.className="btn warn";over.id="shRestoreOverwrite";over.textContent="共有データで上書き復元";over.onclick=()=>loadBundleInteractive("overwrite");row.appendChild(over);
    const all=document.createElement("button");all.className="btn primary";all.id="shSaveAll";all.textContent="辞書＋デッキを一括共有保存";all.onclick=sharedSaveAll;row.appendChild(all);
  }
  const pw=document.getElementById("shPw");if(pw&&!document.getElementById("shAutoRestore")){const label=document.createElement("label");label.className="field";label.style.marginTop="8px";label.innerHTML='<span><input type="checkbox" id="shAutoRestore"> 起動時に新しい共有データを自動復元する</span><span class="note" style="font-size:10px">同じID・同じカード名は更新日時が新しい側を採用し、ローカルだけの項目は残します。端末保存が容量不足でも、共有サーバーから毎回復元できます。</span>';pw.parentElement.insertAdjacentElement("afterend",label);const cb=document.getElementById("shAutoRestore");cb.checked=autoRestoreEnabled();cb.onchange=()=>{state.settings.sharedAutoRestoreEnabled=cb.checked;syncWrite({autoRestoreEnabled:cb.checked});const r=persistLocal();if(!r.ok){sharedState.lastMsg=`自動復元設定は今回の画面で有効です（端末設定保存のみ失敗: ${r.error}）`;_sharedRender();}};}
  _sharedRender();
};
const baseSharedRender=_sharedRender;
_sharedRender=function(){baseSharedRender();const dis=!sharedState.enabled||!sharedState.adminConfigured;const a=document.getElementById("shSaveAll");if(a)a.disabled=dis;const r=document.getElementById("shRestoreOverwrite");if(r)r.disabled=!sharedState.enabled;};
// 新規stateと既存stateの両方へ設定を追加。
const baseDefaultState=defaultState;defaultState=function(){const s=baseDefaultState();s.settings=Object.assign({sharedAutoRestoreEnabled:true},s.settings||{});return s;};
state.settings=Object.assign({sharedAutoRestoreEnabled:true},state.settings||{});
// タブを閉じる直前にも同期localStorageへ最後の状態を確定する。
window.addEventListener("pagehide",()=>{try{saveState(true);}catch(_){}},{capture:true});
let restoreStarted=false;function scheduleRestore(){if(restoreStarted)return;restoreStarted=true;setTimeout(autoRestore,0);}
window.addEventListener("DOMContentLoaded",scheduleRestore);if(document.readyState!=="loading")scheduleRestore();
globalThis.CPT_V7934_SHARED={version:API.version,protocol:API.protocol,getBundle,saveAllWithPassword,applyBundle,autoRestore,syncRead,syncWrite,persistLocal,autoRestoreEnabled,diagnose:API.diagnose};
try{document.body.dataset.v7934="shared-save-fallback";document.title="カードゲーム練習卓 v7.9.34 共有保存フォールバック";}catch(_){}
})();

/* ===== bundled original HTML script block 43/49 ===== */
/* ============================================================
   v7.9.35 Atomic Composite Costs & Land Play Guard
   - preflights structured ability costs before any board mutation
   - commits discard / graveyard exile / sacrifice / life / counters / mana atomically
   - restores the complete board snapshot when any commit step fails
   - hard-blocks normal land plays beyond the current per-turn limit
   - does not count lands put onto the battlefield by effects or abilities
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.CPT_V7935_ATOMIC=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.35",PROTOCOL="cpt-v7.9.35-atomic-cost-land-guard";
const BATTLEFIELD=new Set(["creatures","lands","others"]);
const asInt=(v,min=0)=>Math.max(min,Math.trunc(Number(v)||0));
const uniq=a=>[...new Set((Array.isArray(a)?a:[]).map(String))];
function landPlayDecision(raw={}){
  const method=String(raw.method||"play"),counts=raw.countsAsLandPlay!==false&&method==="play",used=asInt(raw.used),limit=Math.max(1,asInt(raw.limit,1));
  if(!counts)return{ok:true,counts:false,used,limit,remaining:Math.max(0,limit-used),reason:"not-a-land-play"};
  if(used>=limit)return{ok:false,counts:true,used,limit,remaining:0,reason:"land-play-limit"};
  return{ok:true,counts:true,used,limit,remaining:Math.max(0,limit-used-1),reason:""};
}
function cardTypeMatch(card,types){
  const need=Array.isArray(types)?types.filter(Boolean):[];
  if(!need.length)return true;
  const have=new Set([...(Array.isArray(card&&card.types)?card.types:[]),String(card&&card.type||"")].filter(Boolean).map(String));
  return need.some(t=>have.has(String(t))||String(t)==="Permanent");
}
function preflightStructured(raw={}){
  const source=raw.source||null,owner=raw.owner==="B"?"B":"A",profile=raw.profile||{},sel=raw.selections||{},cards=Array.isArray(raw.cards)?raw.cards:[],life=Number(raw.life),pool=raw.manaPool||{},pay=raw.payment||null,errors=[];
  const byId=new Map(cards.map(c=>[String(c.id),c]));
  if(!source||!source.id)errors.push("sourceMissing");
  else{
    if(!BATTLEFIELD.has(String(source.zone)))errors.push("sourceNotOnBattlefield");
    if(String(source.controller||source.ownerRole||owner)!==owner)errors.push("sourceControllerMismatch");
    if(profile.tapSource&&source.tapped)errors.push("sourceAlreadyTapped");
    if(profile.removeCounterCount&&asInt(source.counters&&source.counters[profile.removeCounterName])<asInt(profile.removeCounterCount))errors.push("counterShortage");
  }
  if(asInt(profile.payLife)>0&&(!Number.isFinite(life)||life<asInt(profile.payLife)))errors.push("lifeShortage");
  const groups={discard:uniq(sel.discard),exile:uniq(sel.exile),sacrifice:uniq(sel.sacrifice||sel.sac)};
  if(groups.discard.length!==asInt(profile.discardCount))errors.push("discardCountMismatch");
  if(groups.exile.length!==asInt(profile.exileGraveCount))errors.push("graveyardExileCountMismatch");
  if(groups.sacrifice.length!==asInt(profile.sacrificeOtherCount))errors.push("sacrificeCountMismatch");
  const all=[...groups.discard,...groups.exile,...groups.sacrifice];
  if(new Set(all).size!==all.length)errors.push("duplicateCostObject");
  for(const id of groups.discard){const c=byId.get(id);if(!c||c.zone!=="hand"||String(c.ownerRole)!==owner)errors.push(`discardInvalid:${id}`);}
  for(const id of groups.exile){const c=byId.get(id);if(!c||c.zone!=="graveyard"||String(c.ownerRole)!==owner)errors.push(`graveyardExileInvalid:${id}`);}
  for(const id of groups.sacrifice){const c=byId.get(id);if(!c||!BATTLEFIELD.has(String(c.zone))||String(c.controller||c.ownerRole)!==owner||String(c.id)===String(source&&source.id)||!cardTypeMatch(c,profile.sacrificeOtherTypes))errors.push(`sacrificeInvalid:${id}`);}
  if(pay&&pay.status==="paid"){
    const consumed=pay.consumed||{};
    for(const k of ["W","U","B","R","G","C"]){const n=asInt(consumed[k]);if(n>asInt(pool[k]))errors.push(`manaShortage:${k}`);}
    if(pay.shortage&&Object.values(pay.shortage).some(v=>Number(v)>0))errors.push("paymentHasShortage");
  }
  return{ok:errors.length===0,errors:[...new Set(errors)],groups,owner};
}
function diagnose(){
  const cards=[{id:"s",zone:"lands",ownerRole:"A",controller:"A",types:["Land"],counters:{charge:1}},{id:"d",zone:"hand",ownerRole:"A",controller:"A",types:["Card"]},{id:"g",zone:"graveyard",ownerRole:"A",controller:"A",types:["Creature"]},{id:"p",zone:"creatures",ownerRole:"A",controller:"A",types:["Creature"]}];
  const q=preflightStructured({source:cards[0],owner:"A",profile:{tapSource:true,payLife:2,discardCount:1,exileGraveCount:1,sacrificeOtherCount:1,sacrificeOtherTypes:["Creature"],removeCounterName:"charge",removeCounterCount:1},selections:{discard:["d"],exile:["g"],sacrifice:["p"]},cards,life:5,manaPool:{R:1},payment:{status:"paid",consumed:{R:1}}});
  const tests=[{name:"land first play",ok:landPlayDecision({used:0,limit:1}).ok},{name:"land second blocked",ok:!landPlayDecision({used:1,limit:1}).ok},{name:"effect put ignored",ok:landPlayDecision({used:1,limit:1,method:"put"}).ok},{name:"composite preflight",ok:q.ok}];
  return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
}
return{version:VERSION,protocol:PROTOCOL,landPlayDecision,preflightStructured,cardTypeMatch,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7935_ATOMIC)return;
const API=globalThis.CPT_V7935_ATOMIC;
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function runtime(){if(!state.v7935||typeof state.v7935!=="object"||Array.isArray(state.v7935))state.v7935={};const r=state.v7935;if(!Array.isArray(r.atomicCostHistory))r.atomicCostHistory=[];if(!Array.isArray(r.landPlayBlocks))r.landPlayBlocks=[];return r;}
function record(kind,detail){const r=runtime(),row={at:new Date().toISOString(),kind,...clone(detail||{})};const a=kind==="landPlayBlocked"?r.landPlayBlocks:r.atomicCostHistory;a.unshift(row);if(a.length>160)a.length=160;return row;}
const baseDefault=defaultState;defaultState=function(){const s=baseDefault();s.v7935={atomicCostHistory:[],landPlayBlocks:[]};s.settings=Object.assign({v7935LandPlayGuard:true,v7935AtomicCosts:true},s.settings||{});return s;};
state.settings=Object.assign({v7935LandPlayGuard:true,v7935AtomicCosts:true},state.settings||{});runtime();
function allCards35(){const out=[];for(const p of["A","B"]){const pl=state.players[p]||{};for(const z of["library","hand","creatures","lands","others","graveyard","exile","sideboard"]){for(const c of pl[z]||[])out.push({id:String(c.id),zone:z,ownerRole:p,controller:c.controller||c.owner||p,name:c.name,type:c.type,types:Array.isArray(c.types)?c.types:[],tapped:!!c.tapped,counters:clone(c.counters||{})});}}for(const c of state.stack||[])out.push({id:String(c.id),zone:"stack",ownerRole:c.owner||c.controller||"A",controller:c.controller||c.owner||"A",name:c.name,type:c.type,types:Array.isArray(c.types)?c.types:[],tapped:!!c.tapped,counters:clone(c.counters||{})});return out;}
function sourceView35(card){const f=card&&findCard(card.id);if(!f)return null;return{id:String(card.id),zone:f.zone,ownerRole:f.player||card.owner,controller:card.controller||f.player||card.owner,tapped:!!card.tapped,counters:clone(card.counters||{}),types:Array.isArray(card.types)?card.types:[],type:card.type};}
function pool35(p){const q=typeof _ensurePool==="function"?_ensurePool(p):state.players[p]?.manaPool||{};return clone(q||{});}
function preflight35(c,owner,cp,sel,pay){return API.preflightStructured({source:sourceView35(c),owner,profile:cp,selections:{discard:sel.discard||[],exile:sel.exile||[],sacrifice:sel.sac||sel.sacrifice||[]},cards:allCards35(),life:Number(state.players[owner]?.life),manaPool:pool35(owner),payment:pay});}
function rollback35(snap,undoLen){try{_boardRestore(snap);}catch(_){const o=JSON.parse(snap);state.players=o.players;state.stack=o.stack||[];state.turn=o.turn;}try{if(typeof undoStack!=="undefined"&&Number.isInteger(undoLen)&&undoStack.length>undoLen)undoStack.length=undoLen;}catch(_){} }
function costMessage35(errors){const map={sourceMissing:"発生源が見つかりません",sourceNotOnBattlefield:"発生源が戦場にありません",sourceControllerMismatch:"発生源のコントローラーが変わっています",sourceAlreadyTapped:"発生源はすでにタップされています",counterShortage:"取り除くカウンターが足りません",lifeShortage:"支払うライフが足りません",discardCountMismatch:"捨てるカードの枚数が一致しません",graveyardExileCountMismatch:"墓地から追放する枚数が一致しません",sacrificeCountMismatch:"生け贄の数が一致しません",duplicateCostObject:"同じカードを複数のコストに使えません",paymentHasShortage:"マナ不足の支払い案です"};return(errors||[]).map(x=>map[x]||(/manaShortage/.test(x)?"マナ・プールが支払い確定前に変化しました":/discardInvalid/.test(x)?"捨てるカードが手札にありません":/graveyardExileInvalid/.test(x)?"追放するカードが墓地にありません":/sacrificeInvalid/.test(x)?"生け贄にするパーマネントが条件を満たしません":x)).join(" / ");}
const baseCommit=autoCommitStructuredAbility;
autoCommitStructuredAbility=function(c,ab,owner,cp,sel,pay){
  if((state.settings||{}).v7935AtomicCosts===false)return baseCommit.apply(this,arguments);
  const q=preflight35(c,owner,cp,sel,pay);if(!q.ok){const msg=costMessage35(q.errors);record("atomicCostRejected",{sourceCardId:c&&c.id,abilityId:ab&&ab.id,errors:q.errors});toast(`起動を中止: ${msg}`);return false;}
  const snap=_boardSnap(),undoLen=(()=>{try{return typeof undoStack!=="undefined"?undoStack.length:null;}catch(_){return null;}})();let objId=null;
  try{
    const sourceBefore=findCard(c.id);if(!sourceBefore)throw new Error("source disappeared before commit");
    const obj=makeAbilityObject(c,ab,owner);
    act("複合起動コストを原子的に支払い",()=>{
      const live=findCard(c.id);if(!live)throw new Error("source disappeared during commit");const source=live.card;
      if(cp.tapSource){if(source.tapped)throw new Error("source became tapped");source.tapped=true;}
      if(cp.payLife){if(Number(state.players[owner].life)<Number(cp.payLife))throw new Error("life changed before commit");state.players[owner].life-=Number(cp.payLife);}
      if(cp.removeCounterCount){source.counters=source.counters||{};const cur=Number(source.counters[cp.removeCounterName]||0);if(cur<Number(cp.removeCounterCount))throw new Error("counter changed before commit");source.counters[cp.removeCounterName]=cur-Number(cp.removeCounterCount);if(!source.counters[cp.removeCounterName])delete source.counters[cp.removeCounterName];}
      const moveChecked=(id,zone)=>{const f=findCard(id);if(!f)throw new Error(`cost object missing: ${id}`);const moved=moveCard(id,f.card.owner,zone,null,true);if(!moved)throw new Error(`cost move failed: ${id}`);};
      for(const id of sel.discard||[])moveChecked(id,"graveyard");
      for(const id of sel.exile||[])moveChecked(id,"exile");
      for(const id of sel.sac||[])moveChecked(id,"graveyard");
      if(cp.sacrificeSource)moveChecked(c.id,"graveyard");
      if(pay&&pay.status==="paid"){
        const consumed=_normConsumed(pay.consumed);for(const k of MANA_COLORS){if(Number((_ensurePool(owner)||{})[k]||0)<Number(consumed[k]||0))throw new Error(`mana changed before commit: ${k}`);}
        obj.paymentStatus="paid";obj.consumedMana=consumed;obj.paymentShortage=pay.shortage||null;obj.paymentAutoConsumed=true;if(_consumedSum(consumed)>0)_spendMana(owner,consumed);
      }else if(pay){obj.paymentStatus=pay.status||"pending";obj.paymentNote=pay.note||"";}
      obj.costPaidSummary={tapSource:!!cp.tapSource,sacrificeSource:!!cp.sacrificeSource,payLife:Number(cp.payLife)||0,discard:(sel.discard||[]).length,exile:(sel.exile||[]).length,sacrificeOther:(sel.sac||[]).length,removeCounter:Number(cp.removeCounterCount)||0,atomic:true};
      if(ab.createsStackObject!==false){state.stack.push(obj);objId=obj.id;}
    });
    addLog(`${pname(owner)} は [${c.name}] の「${ab.name||"能力"}」の複合起動コストを一括で支払った${ab.createsStackObject!==false?"（スタックへ）":""}`);
    record("atomicCostCommitted",{sourceCardId:c.id,abilityId:ab.id||"",discard:(sel.discard||[]).length,exile:(sel.exile||[]).length,sacrifice:(sel.sac||[]).length,payLife:Number(cp.payLife)||0,mana:pay&&pay.status==="paid"?_normConsumed(pay.consumed):null});
    saveState(true);render();renderPreview();if(objId&&ab.targetRequired&&abilityPromptTargetAfterStack())setTimeout(()=>startTargetMode(objId),0);return true;
  }catch(err){rollback35(snap,undoLen);record("atomicCostRolledBack",{sourceCardId:c&&c.id,abilityId:ab&&ab.id,error:String(err&&err.message||err)});try{saveState(true);render();renderPreview();}catch(_){}toast(`複合コストをすべて巻き戻しました: ${String(err&&err.message||err)}`);return false;}
};
function blockedLand35(id,player,p){const f=typeof v45Find==="function"?v45Find(id):findCard(id),name=f&&f.card?f.card.name:"土地",used=typeof _landPlayed==="function"?_landPlayed(player):0,limit=typeof v45LandLimit==="function"?v45LandLimit(player):1;record("landPlayBlocked",{cardId:id,name,player,used,limit,permissionId:p&&p.id||""});const body=`<div class="oh-warn"><b>${esc(name)}</b> は通常の土地プレイとしては置けません。</div><div class="pvrow">このターンの土地プレイ: <b>${used}/${limit}</b></div><div class="note">フェッチランドや呪文・能力によって土地を「戦場に出す」処理は土地プレイではないため、この制限には引っかかりません。追加で土地をプレイできる効果がある場合は、v4.5の追加土地プレイ権を登録してください。</div>`;try{openModal("土地プレイ上限",body,`<button class="btn" data-v7935land="grant">追加土地プレイ権を確認</button><button class="btn primary" data-app="closem">閉じる</button>`);setModalHandler(e=>{if(e.target.closest('[data-v7935land="grant"]')){closeModal();globalThis.CPT_V45?.openHub?.();}});}catch(_){toast(`土地はこのターンすでに${used}枚プレイ済みです（上限${limit}枚）`);}return false;}
const baseLandMove=v45MoveLandToBattlefield;
v45MoveLandToBattlefield=function(id,player,p,fromHand){if((state.settings||{}).v7935LandPlayGuard!==false){const counts=!p||p.countsAsLandPlay!==false,used=_landPlayed(player),limit=v45LandLimit(player),q=API.landPlayDecision({used,limit,countsAsLandPlay:counts,method:"play"});if(!q.ok)return blockedLand35(id,player,p);}return baseLandMove.apply(this,arguments);};
const basePanel=playerPanelHTML;playerPanelHTML=function(p){let h=basePanel.apply(this,arguments);try{const used=_landPlayed(p),limit=v45LandLimit(p),tag=`<span class="badge v7935-land${used>=limit?" full":""}" title="通常の土地プレイ回数。能力で戦場に出した土地は数えません">土地 ${used}/${limit}</span>`;h=h.includes('<div class="badges">')?h.replace('<div class="badges">','<div class="badges">'+tag):h;}catch(_){}return h;};
const baseSettings=openSettings;openSettings=function(){const r=baseSettings.apply(this,arguments);setTimeout(()=>{const body=document.querySelector("#modalRoot .mbody");if(!body||body.querySelector("#v7935Settings"))return;const box=document.createElement("section");box.id="v7935Settings";box.className="spanel";box.innerHTML=`<h3>v7.9.35 土地プレイ・複合コスト</h3><label><input type="checkbox" data-v7935setting="v7935LandPlayGuard"${state.settings.v7935LandPlayGuard!==false?" checked":""}> 通常の土地プレイ上限を超えた操作を禁止</label><label><input type="checkbox" data-v7935setting="v7935AtomicCosts"${state.settings.v7935AtomicCosts!==false?" checked":""}> 複合起動コストを原子的に支払い、失敗時は全巻き戻し</label><div class="note">フェッチや能力による「土地を戦場に出す」は通常の土地プレイ回数に含みません。</div>`;body.appendChild(box);box.onchange=e=>{const x=e.target.closest("[data-v7935setting]");if(!x)return;state.settings[x.dataset.v7935setting]=x.checked;saveState(true);};},0);return r;};
const style=document.createElement("style");style.textContent='.badge.v7935-land{background:#285b45;color:#d8ffeb}.badge.v7935-land.full{background:#6a3a2d;color:#ffe0d6}#v7935Settings{display:grid;gap:7px}';document.head.appendChild(style);
globalThis.CPT_V7935_CLIENT={version:API.version,protocol:API.protocol,runtime,preflight:preflight35,diagnose:API.diagnose};
try{document.body.dataset.v7935="atomic-cost-land-guard";document.title="カードゲーム練習卓 v7.9.35 複合コスト・土地プレイ制御";}catch(_){}
})();

/* ===== bundled original HTML script block 44/49 ===== */
"use strict";

(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CPT_V7936_RULES = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  const VERSION = "7.9.36";
  const PROTOCOL = "cpt-v7.9.36-reveal-context-sorcery-timing";
  const MAIN_PHASES = new Set([3, 9, "3", "9", "Main1", "Main2", "第1メイン", "第2メイン"]);

  const arr = v => Array.isArray(v) ? v : [];
  const str = v => String(v == null ? "" : v).trim();
  const lower = v => str(v).toLowerCase();
  const uniq = xs => [...new Set(arr(xs).map(str).filter(Boolean))];
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const clone = v => { try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; } };

  function selectFace(card, faceIndex){
    const faces = arr(card && card.faces);
    const i = Number.isInteger(Number(faceIndex)) ? Number(faceIndex) : Number(card && card.activeFaceIndex);
    return faces[i] || null;
  }
  function textOf(card, face){
    return [face && face.rulesText, face && face.oracleText, face && face.memo, card && card.rulesText,
      card && card.oracleText, card && card.memo, card && card.text, card && card.typeLine,
      face && face.typeLine, face && face.type].map(str).filter(Boolean).join("\n");
  }
  function typesOf(card, face){
    const raw = [];
    for (const source of [face, card]) {
      if (!source) continue;
      raw.push(...arr(source.types), source.type, source.typeLine, source.cardType, source.supertype, source.subtype);
    }
    const joined = raw.map(str).filter(Boolean).join(" ");
    const known = ["Land","Creature","Instant","Sorcery","Artifact","Enchantment","Planeswalker","Battle","Tribal","Kindred",
      "土地","クリーチャー","インスタント","ソーサリー","アーティファクト","エンチャント","プレインズウォーカー","バトル","同族"];
    const out = [];
    for (const k of known) if (joined.toLowerCase().includes(k.toLowerCase())) out.push(k);
    return uniq(out.length ? out : raw.flatMap(x => str(x).split(/[—\-・\/\s]+/)));
  }
  function hasType(card, face, en, jp){
    const t = [typesOf(card, face).join(" "), textOf(card, face)].join(" ").toLowerCase();
    return t.includes(en.toLowerCase()) || (jp && t.includes(jp));
  }
  function keywordText(card, face){
    const ks = [];
    for (const source of [face, card]) {
      if (!source) continue;
      if (Array.isArray(source.keywords)) ks.push(...source.keywords);
      else if (source.keywords && typeof source.keywords === "object") ks.push(...Object.keys(source.keywords).filter(k => source.keywords[k]));
      ks.push(source.keyword, source.abilitiesText);
    }
    return ks.map(str).filter(Boolean).join(" ") + " " + textOf(card, face);
  }
  function hasFlash(card, face){
    if ((face && (face.flash === true || face.hasFlash === true)) || (card && (card.flash === true || card.hasFlash === true))) return true;
    const s = lower(keywordText(card, face));
    return /(^|[\s,、。・])flash($|[\s,、。・])/.test(s) || s.includes("瞬速");
  }
  function explicitlySorcerySpeed(raw){
    if (!raw) return false;
    if (raw.sorcerySpeed === true || raw.activateOnlyAsSorcery === true || raw.castOnlyAsSorcery === true || raw.onlyAsSorcery === true) return true;
    const timing = lower(raw.timing || raw.timingRestriction || raw.speed);
    if (["sorcery","sorceryspeed","sorcery-speed","mainphase","main-phase"].includes(timing)) return true;
    const s = lower([raw.rulesText, raw.oracleText, raw.memo, raw.resolveNote, raw.costText, raw.text].map(str).join(" "));
    return s.includes("activate only as a sorcery") || s.includes("cast only as a sorcery") ||
      /ソーサリー(?:・|\s*)タイミングでのみ(?:起動|唱)/.test(s) ||
      /ソーサリーとしてのみ(?:起動|唱)/.test(s) ||
      /ソーサリーを唱えられるときにのみ(?:起動|唱)/.test(s);
  }
  function spellRequiresSorcerySpeed(card, face, opts){
    if (opts && opts.timingOverride) return false;
    if (explicitlySorcerySpeed(face) || explicitlySorcerySpeed(card)) return true;
    if (hasType(card, face, "Instant", "インスタント")) return false;
    if (hasFlash(card, face)) return false;
    return true;
  }
  function abilityRequiresSorcerySpeed(card, ability){
    if (!ability) return false;
    const kind = lower(ability.kind);
    if (["triggered","static","replacement","continuous","誘発型","常在型","置換"].includes(kind)) return false;
    return explicitlySorcerySpeed(ability);
  }
  function timingSnapshot(raw){
    const turn = raw && raw.turn || {};
    return {
      actorRole: str(raw && (raw.actorRole || raw.actor || raw.role)),
      active: str(turn.active), phase: turn.phase,
      priority: str(turn.priority), stackDepth: arr(raw && raw.stack).length,
      timingOverride: !!(raw && raw.timingOverride),
    };
  }
  function sorceryWindow(raw){
    const s = timingSnapshot(raw);
    if (s.timingOverride) return { ok:true, reasons:[], ...s };
    const reasons = [];
    if (s.active && s.actorRole && s.active !== s.actorRole) reasons.push("sorceryTimingActivePlayerRequired");
    if (!MAIN_PHASES.has(s.phase)) reasons.push("sorceryTimingMainPhaseRequired");
    if (s.stackDepth !== 0) reasons.push("sorceryTimingStackEmptyRequired");
    if (s.priority && s.actorRole && s.priority !== s.actorRole) reasons.push("priorityRequired");
    return { ok: reasons.length === 0, reasons, ...s };
  }
  function validateSpellTiming(raw){
    const face = raw && (raw.face || selectFace(raw.card, raw.faceIndex));
    const override = !!(raw && raw.timingOverride);
    const priority = timingSnapshot(raw);
    if (!override && priority.priority && priority.actorRole && priority.priority !== priority.actorRole) {
      return { ok:false, reasons:["priorityRequired"], requiresSorcerySpeed:spellRequiresSorcerySpeed(raw && raw.card, face, raw), ...priority };
    }
    const slow = spellRequiresSorcerySpeed(raw && raw.card, face, raw);
    if (!slow) return { ok:true, reasons:[], requiresSorcerySpeed:false, ...priority };
    return { ...sorceryWindow(raw), requiresSorcerySpeed:true };
  }
  function validateAbilityTiming(raw){
    const slow = abilityRequiresSorcerySpeed(raw && raw.card, raw && raw.ability);
    const snap = timingSnapshot(raw);
    if (!slow) return { ok:true, reasons:[], requiresSorcerySpeed:false, ...snap };
    return { ...sorceryWindow(raw), requiresSorcerySpeed:true };
  }

  function manaValue(card){
    for (const v of [card && card.manaValue, card && card.cmc, card && card.mv, card && card.convertedManaCost]) {
      if (Number.isFinite(Number(v))) return Math.max(0, Number(v));
    }
    const cost = str(card && (card.manaCostText || card.manaCost));
    if (!cost) return 0;
    let total = 0;
    for (const token of cost.replace(/[{}]/g," ").split(/[\s/]+/).filter(Boolean)) {
      if (/^\d+$/.test(token)) total += Number(token);
      else if (/^[WUBRGCXYZ]+$/i.test(token)) total += token.toUpperCase().replace(/[XYZ]/g,"").length;
      else if (/^[WUBRGCP]\/[WUBRGCP]$/i.test(token)) total += 1;
    }
    return total;
  }
  function colorsOf(card){
    const raw = [];
    if (Array.isArray(card && card.colors)) raw.push(...card.colors);
    if (Array.isArray(card && card.colorIdentity)) raw.push(...card.colorIdentity);
    if (card && card.color) raw.push(card.color);
    const text = raw.map(str).join(" ").toUpperCase();
    const out = ["W","U","B","R","G"].filter(c => new RegExp(`(^|[^A-Z])${c}([^A-Z]|$)`).test(text) || (text.length <= 5 && text.includes(c)));
    return uniq(out);
  }
  function descriptor(card){
    const face = selectFace(card, card && card.activeFaceIndex);
    const types = typesOf(card, face);
    return {
      id: str(card && card.id), name: str((face && face.name) || (card && card.name)),
      manaValue: manaValue(face || card), colors: colorsOf(face || card), types,
      typeLine: str((face && face.typeLine) || (card && (card.typeLine || card.type))),
    };
  }
  function buildRevealContext(cards, meta){
    const ds = arr(cards).map(descriptor);
    const values = ds.map(x => num(x.manaValue));
    const colors = uniq(ds.flatMap(x => x.colors));
    const types = uniq(ds.flatMap(x => x.types));
    const names = ds.map(x => x.name).filter(Boolean);
    return {
      version: VERSION, at: new Date().toISOString(), public: meta && meta.public !== false,
      sourceCardId: str(meta && meta.sourceCardId), cards: ds, count: ds.length,
      names, uniqueNames: uniq(names), colors, types,
      maxManaValue: values.length ? Math.max(...values) : 0,
      minManaValue: values.length ? Math.min(...values) : 0,
      sumManaValue: values.reduce((a,b)=>a+b,0), distinctNameCount:uniq(names).length,
      distinctColorCount:colors.length, distinctTypeCount:types.length,
    };
  }
  const METRICS = Object.freeze({
    revealedCount:"count", count:"count", maxManaValue:"maxManaValue", minManaValue:"minManaValue",
    sumManaValue:"sumManaValue", distinctNameCount:"distinctNameCount",
    distinctColorCount:"distinctColorCount", distinctTypeCount:"distinctTypeCount",
  });
  function revealMetric(context, variable){
    const key = METRICS[str(variable)] || str(variable);
    return Number.isFinite(Number(context && context[key])) ? Number(context[key]) : null;
  }
  function materializeEffect(effect, context){
    const out = clone(effect || {}), variable = out.v7936Variable;
    if (!variable) return { changed:false, effect:out, value:null };
    const value = revealMetric(context, variable);
    if (value == null) return { changed:false, effect:out, value:null, blocked:true, reason:"revealContextUnavailable" };
    out.amountFixed = value; out.amountMode = "fixed"; out.v7936ResolvedValue = value;
    return { changed:true, effect:out, value };
  }
  function diagnose(){
    const slow = validateSpellTiming({card:{type:"Sorcery"},actorRole:"A",turn:{active:"A",phase:3,priority:"A"},stack:[]});
    const blocked = validateAbilityTiming({card:{},ability:{kind:"activated",timing:"sorcery"},actorRole:"A",turn:{active:"A",phase:4,priority:"A"},stack:[]});
    const ctx = buildRevealContext([{id:"1",name:"A",manaValue:2,colors:["U"],types:["Creature"]},{id:"2",name:"B",manaValue:5,colors:["R"],types:["Sorcery"]}],{public:true});
    const tests = [slow.ok, !blocked.ok && blocked.reasons.includes("sorceryTimingMainPhaseRequired"), ctx.count===2, ctx.maxManaValue===5, ctx.distinctColorCount===2, materializeEffect({v7936Variable:"maxManaValue"},ctx).value===5];
    return {ok:tests.every(Boolean), testsPassed:tests.filter(Boolean).length, testsTotal:tests.length, version:VERSION, protocol:PROTOCOL};
  }
  return {VERSION,PROTOCOL,MAIN_PHASES,selectFace,textOf,typesOf,hasFlash,explicitlySorcerySpeed,spellRequiresSorcerySpeed,
    abilityRequiresSorcerySpeed,timingSnapshot,sorceryWindow,validateSpellTiming,validateAbilityTiming,manaValue,colorsOf,
    descriptor,buildRevealContext,revealMetric,materializeEffect,diagnose};
});

/* ===== bundled original HTML script block 45/49 ===== */
/* ============================================================
   v7.9.36 Public Reveal Context & Sorcery Timing Guard
   - carries public revealed-card information into later automated steps
   - hard-blocks sorcery-speed spells and activated abilities outside
     the active player's main phase, with priority and an empty stack
   ============================================================ */
(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7936_RULES)return;
const API=globalThis.CPT_V7936_RULES;
const clone=v=>{try{return v==null?v:JSON.parse(JSON.stringify(v));}catch(_){return v;}};
const arr=v=>Array.isArray(v)?v:[];
function runtime(){
  if(!state.v7936||typeof state.v7936!=="object"||Array.isArray(state.v7936))state.v7936={};
  const r=state.v7936;if(!Array.isArray(r.revealHistory))r.revealHistory=[];if(!Array.isArray(r.timingBlocks))r.timingBlocks=[];return r;
}
function record(kind,detail){const r=runtime(),row={at:new Date().toISOString(),kind,...clone(detail||{})},a=kind==="revealContext"?r.revealHistory:r.timingBlocks;a.unshift(row);if(a.length>180)a.length=180;return row;}
const baseDefault=defaultState;defaultState=function(){const s=baseDefault();s.v7936={revealHistory:[],timingBlocks:[]};s.settings=Object.assign({v7936SorceryTimingGuard:true,v7936RevealVariables:true},s.settings||{});return s;};
state.settings=Object.assign({v7936SorceryTimingGuard:true,v7936RevealVariables:true},state.settings||{});runtime();
function actorOf(card){return String(card&&card.controller||card&&card.owner||online&&online.role||state.turn&&state.turn.active||"A");}
function spellFace(flow){try{const fs=typeof cardFacesList==="function"?cardFacesList(flow.card):[];return fs[Number(flow.fi)]||API.selectFace(flow.card,flow.fi)||null;}catch(_){return API.selectFace(flow&&flow.card,flow&&flow.fi)||null;}}
function timingText(reason){return({
  priorityRequired:"優先権がありません",
  sorceryTimingActivePlayerRequired:"自分のターンではありません",
  sorceryTimingMainPhaseRequired:"自分の第1または第2メインフェイズではありません",
  sorceryTimingStackEmptyRequired:"スタックが空ではありません"
})[reason]||String(reason||"タイミングが不適正です");}
function timingModal(kind,name,result){
  const reasons=(result.reasons||[]).map(timingText);
  record("timingBlocked",{kind,name,reasons:result.reasons,turn:clone(state.turn),stackDepth:(state.stack||[]).length});
  const title=kind==="ability"?"起動タイミング制限":"唱えるタイミング制限";
  const subject=kind==="ability"?"この能力はソーサリー・タイミングでしか起動できません。":"このカードはソーサリー・タイミングでしか唱えられません。";
  const body=`<div class="oh-warn"><b>${esc(name||(kind==="ability"?"能力":"カード"))}</b><br>${subject}</div><div class="pvrow">必要条件: <b>自分のメインフェイズ・優先権あり・スタックが空</b></div><div class="note">${reasons.map(esc).join(" / ")}</div>`;
  try{openModal(title,body,'<button class="btn primary" data-app="closem">閉じる</button>');}catch(_){toast(`${subject} ${reasons.join(" / ")}`);}
}
function spellTiming(flow,opts){
  const override=!!(opts&&(opts._v33Free||opts.timingOverride||opts._timingOverride||opts.castByEffect));
  return API.validateSpellTiming({card:flow.card,face:spellFace(flow),faceIndex:flow.fi,actorRole:flow.owner||actorOf(flow.card),turn:state.turn||{},stack:state.stack||[],timingOverride:override});
}
function abilityTiming(card,ability,owner){return API.validateAbilityTiming({card,ability,actorRole:owner||actorOf(card),turn:state.turn||{},stack:state.stack||[]});}
const castOpts=new Map();
const basePlace=placeOnStackFlow;
placeOnStackFlow=function(id,opts){castOpts.set(String(id),clone(opts||{}));return basePlace.apply(this,arguments);};
const baseBegin=v24BeginTargetOrPay;
v24BeginTargetOrPay=function(flow){
  if((state.settings||{}).v7936SorceryTimingGuard!==false){const opts=castOpts.get(String(flow.id))||{},q=spellTiming(flow,opts);if(!q.ok){try{v24ClearCastFlow(flow,true);}catch(_){try{_v24CastFlow=null;}catch(__){}}castOpts.delete(String(flow.id));timingModal("spell",flow.card&&flow.card.name,q);return false;}}
  return baseBegin.apply(this,arguments);
};
if(typeof v24ClearCastFlow==="function"){const b=v24ClearCastFlow;v24ClearCastFlow=function(flow){if(flow)castOpts.delete(String(flow.id));return b.apply(this,arguments);};}
if(typeof v24FinishCast==="function"){const b=v24FinishCast;v24FinishCast=function(flow){const r=b.apply(this,arguments);if(flow)castOpts.delete(String(flow.id));return r;};}
if(typeof v52Proposal==="function"){const b=v52Proposal;v52Proposal=function(flow,pay){const p=b.apply(this,arguments),o=castOpts.get(String(flow&&flow.id))||{};if(o._v33Free||o.timingOverride||o._timingOverride||o.castByEffect){p.zoneMeta=p.zoneMeta||{};p.zoneMeta.timingOverride=true;}return p;};}
const baseSmart=smartStandardAction;
smartStandardAction=function(id){
  if((state.settings||{}).v7936SorceryTimingGuard!==false){const f=findCard(id),mode=typeof smartActionMode==="function"?smartActionMode():"stackFirst",bucket=f&&typeof _smartBucket==="function"?_smartBucket(f.card):"";if(f&&mode==="simpleBattlefield"&&(bucket==="creature"||bucket==="permanent")){const q=API.validateSpellTiming({card:f.card,face:API.selectFace(f.card,f.card.activeFaceIndex),actorRole:f.player||actorOf(f.card),turn:state.turn||{},stack:state.stack||[]});if(!q.ok){timingModal("spell",f.card.name,q);return false;}}}
  return baseSmart.apply(this,arguments);
};
function findAbility(cardId,abilityId){const f=findCard(cardId),ab=f&&typeof getCardAbilities==="function"?getCardAbilities(f.card).find(a=>String(a.id)===String(abilityId)):null;return{f,ab};}
const basePut=putAbilityOnStack;
putAbilityOnStack=function(cardId,abilityId){if((state.settings||{}).v7936SorceryTimingGuard!==false){const {f,ab}=findAbility(cardId,abilityId);if(f&&ab){const q=abilityTiming(f.card,ab,f.card.controller||f.player||f.card.owner);if(!q.ok){timingModal("ability",ab.name||f.card.name,q);return false;}}}return basePut.apply(this,arguments);};
const baseCommitAbility=_commitAbility;
_commitAbility=function(c,ab,owner){if((state.settings||{}).v7936SorceryTimingGuard!==false){const q=abilityTiming(c,ab,owner);if(!q.ok){timingModal("ability",ab&&ab.name||c&&c.name,q);return false;}}return baseCommitAbility.apply(this,arguments);};
const baseStructured=autoCommitStructuredAbility;
autoCommitStructuredAbility=function(c,ab,owner){if((state.settings||{}).v7936SorceryTimingGuard!==false){const q=abilityTiming(c,ab,owner);if(!q.ok){timingModal("ability",ab&&ab.name||c&&c.name,q);return false;}}return baseStructured.apply(this,arguments);};

function captureReveal(source,cards,meta){
  if((state.settings||{}).v7936RevealVariables===false||!source||!arr(cards).length)return null;
  const ctx=API.buildRevealContext(cards,{public:meta&&meta.public!==false,sourceCardId:source.id});
  source.v7936RevealContext=clone(ctx);record("revealContext",{sourceCardId:source.id,sourceName:source.name,context:ctx});
  try{addLog(`公開情報を記録: ${ctx.count}枚 / 最大MV ${ctx.maxManaValue} / 最小MV ${ctx.minManaValue} / 異なる名前 ${ctx.distinctNameCount}`);}catch(_){}
  return ctx;
}
if(typeof autoLibCommit==="function"){const b=autoLibCommit;autoLibCommit=function(){const w=typeof _autoLibWork!=="undefined"&&_autoLibWork?{source:_autoLibWork.source,cards:arr(_autoLibWork.cards).slice(),action:clone(_autoLibWork.action)}:null;const r=b.apply(this,arguments);if(w&&w.action&&w.action.kind==="reveal")captureReveal(w.source,w.cards,{public:w.action.public!==false});return r;};}
if(typeof _zswExecute==="function"){const b=_zswExecute;_zswExecute=function(){let cap=null;try{if(_zsw&&(_zsw.publicLog||_zsw.profile&&(_zsw.profile.publicLog||_zsw.profile.revealSelection))){const src=_zsw.sourceCardId?findCard(_zsw.sourceCardId):null,cards=arr(_zsw.selected).map(id=>findCard(id)?.card).filter(Boolean);cap={source:src&&src.card,cards};}}catch(_){}const r=b.apply(this,arguments);if(cap)captureReveal(cap.source,cap.cards,{public:true});return r;};}
const normBase=typeof normalizeAutoEffect==="function"?normalizeAutoEffect:null;
if(normBase){normalizeAutoEffect=function(e){const r=normBase(e);for(const k of["v7936Variable","v7936ResolvedValue"]){if(e&&e[k]!==undefined)r[k]=clone(e[k]);}return r;};normalizeAutoEffects=a=>Array.isArray(a)?a.map(normalizeAutoEffect):[];}
const applyBase=typeof _applySourceAutoEffects==="function"?_applySourceAutoEffects:null;
if(applyBase){_applySourceAutoEffects=function(src,x,choice){const ctx=src&&src.v7936RevealContext,effects=arr(typeof _sourceAutoEffects==="function"?_sourceAutoEffects(src):src&&src.autoEffects||src&&src.castAutoEffects).map(e=>typeof normalizeAutoEffect==="function"?normalizeAutoEffect(e):clone(e));if(!ctx||!effects.some(e=>e&&e.v7936Variable))return applyBase.apply(this,arguments);const materialized=[],blocked=[];for(const e of effects){const m=API.materializeEffect(e,ctx);materialized.push(m.effect);if(m.blocked)blocked.push(String(e.id||""));}const selected=new Set(choice&&choice.stepIds||effects.map(e=>String(e.id||"")));for(const id of blocked)selected.delete(id);const use={...src,autoEffects:materialized,castAutoEffects:materialized},logs=applyBase(use,x,{...(choice||{}),stepIds:[...selected]})||[];for(const k of["targetStatus","v792EffectFlow","v797AtomicPayment","v798AtomicPayment","v7927VariableResolution","v7929XResolution"]){if(use[k]!==undefined)src[k]=clone(use[k]);}src.v7936VariableResolution={at:new Date().toISOString(),values:Object.fromEntries(materialized.filter(e=>e.v7936ResolvedValue!=null).map(e=>[String(e.id||e.label||"effect"),e.v7936ResolvedValue]))};return logs;};}
function detectVariable36(text){const s=String(text||"");if(/公開(?:した|された)カードの(?:枚数|数)/.test(s))return"revealedCount";if(/公開(?:した|された)カード[^。]{0,18}最大[^。]{0,10}マナ総量/.test(s)||/公開(?:した|された)カードの中で最大のマナ総量/.test(s))return"maxManaValue";if(/公開(?:した|された)カード[^。]{0,18}最小[^。]{0,10}マナ総量/.test(s)||/公開(?:した|された)カードの中で最小のマナ総量/.test(s))return"minManaValue";if(/公開(?:した|された)カード[^。]{0,20}マナ総量の合計/.test(s))return"sumManaValue";if(/公開(?:した|された)カード[^。]{0,20}異なる(?:カード)?名(?:の数)?/.test(s))return"distinctNameCount";if(/公開(?:した|された)カード[^。]{0,20}異なる色(?:の数)?/.test(s))return"distinctColorCount";if(/公開(?:した|された)カード[^。]{0,20}異なるカード・?タイプ(?:の数)?/.test(s))return"distinctTypeCount";return"";}
if(typeof v28ParseJapaneseRules==="function"){const b=v28ParseJapaneseRules;v28ParseJapaneseRules=function(text){const out=b.apply(this,arguments),v=detectVariable36(text);if(v){const candidates=arr(out&&out.abilities).flatMap(ab=>arr(ab.effects)).filter(e=>e&&e.kind!=="manual"&&e.kind!=="note"),target=candidates[candidates.length-1];if(target&&!target.v7936Variable)target.v7936Variable=v;out.v7936RevealVariable=v||out.v7936RevealVariable||"";}return out;};}
const baseSettings=openSettings;openSettings=function(){const r=baseSettings.apply(this,arguments);setTimeout(()=>{const body=document.querySelector("#modalRoot .mbody");if(!body||body.querySelector("#v7936Settings"))return;const box=document.createElement("section");box.id="v7936Settings";box.className="spanel";box.innerHTML=`<h3>v7.9.36 公開情報・ソーサリータイミング</h3><label><input type="checkbox" data-v7936setting="v7936SorceryTimingGuard"${state.settings.v7936SorceryTimingGuard!==false?" checked":""}> ソーサリータイミング限定の呪文・能力を厳格に制限</label><label><input type="checkbox" data-v7936setting="v7936RevealVariables"${state.settings.v7936RevealVariables!==false?" checked":""}> 公開カードの枚数・色・タイプ・マナ総量を後続処理へ渡す</label><div class="note">ソーサリータイミングは「自分の第1/第2メインフェイズ・優先権あり・スタックが空」です。瞬速や効果によるカスケード/発見などの唱える許可は別扱いです。</div>`;body.appendChild(box);box.onchange=e=>{const x=e.target.closest("[data-v7936setting]");if(!x)return;state.settings[x.dataset.v7936setting]=x.checked;saveState(true);};},0);return r;};
const style=document.createElement("style");style.textContent="#v7936Settings{display:grid;gap:7px}";document.head.appendChild(style);
globalThis.CPT_V7936_CLIENT={version:API.VERSION,protocol:API.PROTOCOL,runtime,captureReveal,spellTiming,abilityTiming,detectVariable:detectVariable36,diagnose:API.diagnose};
try{document.body.dataset.v7936="reveal-context-sorcery-timing";document.title="カードゲーム練習卓 v7.9.36 公開情報・ソーサリータイミング";}catch(_){}
})();

/* ===== bundled original HTML script block 46/49 ===== */
"use strict";

(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CPT_V7937_RULES = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  const VERSION = "7.9.37";
  const PROTOCOL = "cpt-v7.9.37-linked-delayed-serum";
  const BATTLEFIELD_ZONES = new Set(["creatures","lands","others","battlefield"]);
  const EVENT_ALIASES = Object.freeze({
    endStep:"endStep", endstep:"endStep", upkeep:"upkeep", draw:"draw", drawn:"draw",
    leavesBattlefield:"leavesBattlefield", leaveBattlefield:"leavesBattlefield", leftBattlefield:"leavesBattlefield",
    dies:"dies", died:"dies", cast:"cast", spellCast:"cast", zoneMove:"zoneMove", damage:"damage"
  });
  const SERUM_NAMES = new Set(["serum powder","血清の粉末"]);
  const arr = v => Array.isArray(v) ? v : [];
  const str = v => String(v == null ? "" : v).trim();
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const clone = v => { try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; } };
  const uniq = xs => [...new Set(arr(xs).map(str).filter(Boolean))];
  const normalizeName = v => str(v).normalize("NFKC").toLowerCase().replace(/[’'`]/g,"").replace(/[‐‑‒–—―]/g,"-").replace(/\s+/g," ").trim();
  const normEvent = v => EVENT_ALIASES[str(v)] || str(v);

  function cardNames(card, dictionaryEntry){
    const out=[];
    for(const source of [card,dictionaryEntry]){
      if(!source) continue;
      for(const key of ["name","displayName","printedName","jaName","jpName","englishName","enName","oracleName","nameJa","nameEn"]) if(source[key]) out.push(source[key]);
      out.push(...arr(source.aliases),...arr(source.otherNames),...arr(source.names));
      for(const face of arr(source.faces)) for(const key of ["name","displayName","printedName","jaName","englishName"]) if(face&&face[key]) out.push(face[key]);
    }
    return uniq(out.map(normalizeName));
  }
  function isSerumPowder(card, dictionaryEntry){ return cardNames(card,dictionaryEntry).some(x=>SERUM_NAMES.has(x)); }
  function serumPowderCount(entries, lookup){
    let count=0;
    for(const e of arr(entries)){
      let d=null; try{ d=typeof lookup==="function"?lookup(e&&e.name):null; }catch(_){}
      if(isSerumPowder(e,d)) count += Math.max(0,Math.trunc(num(e&&e.qty)||1));
    }
    return count;
  }
  function recommendOpeningMode(entries, lookup){
    const count=serumPowderCount(entries,lookup);
    return {mode:count>0?"library":"",serumPowderCount:count,reason:count>0?"serumPowderDetected":""};
  }

  function shuffled(cards, random){
    const a=arr(cards).map(clone),rnd=typeof random==="function"?random:Math.random;
    for(let i=a.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(Number(rnd())*(i+1))));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function makeOpeningState(cards, random){
    const pool=shuffled(cards,random),hand=pool.splice(0,Math.min(7,pool.length));
    return {library:pool,hand,exiled:[],bottom:[],mulliganCount:0,serumPowderCount:0,pendingBottom:0,total:pool.length+hand.length,history:["初手7枚を引いた"]};
  }
  function normalLondonMulligan(raw, random){
    const s=clone(raw||{}); if(num(s.pendingBottom)>0) return {ok:false,reason:"keepBottomPending",state:s};
    s.library=arr(s.library).concat(arr(s.hand)); s.hand=[]; s.library=shuffled(s.library,random); s.mulliganCount=Math.max(0,Math.trunc(num(s.mulliganCount)))+1; s.bottom=[]; s.pendingBottom=0;
    if(s.library.length<7)return{ok:false,reason:"libraryTooSmall",state:s};
    s.hand=s.library.splice(0,7); arr(s.history).push(`通常マリガン${s.mulliganCount}回目: 7枚を引き直した（キープ時に${s.mulliganCount}枚をボトム）`);return{ok:true,state:s};
  }
  function beginLondonKeep(raw){const s=clone(raw||{}),need=Math.max(0,Math.trunc(num(s.mulliganCount)));s.pendingBottom=need;return{ok:true,needsBottom:need>0,count:need,state:s};}
  function confirmLondonBottom(raw,indices){
    const s=clone(raw||{}),need=Math.max(0,Math.trunc(num(s.pendingBottom))),idx=uniq(arr(indices).map(x=>String(Math.trunc(num(x))))).map(Number);
    if(idx.length!==need)return{ok:false,reason:"bottomCountInvalid",state:s};if(idx.some(i=>i<0||i>=arr(s.hand).length))return{ok:false,reason:"bottomIndexInvalid",state:s};
    const set=new Set(idx),picked=idx.map(i=>s.hand[i]),kept=s.hand.filter((_,i)=>!set.has(i));s.hand=kept;s.library=arr(s.library);for(const c of picked)s.library.push(c);s.bottom=picked;s.pendingBottom=0;return{ok:true,state:s,picked,kept};
  }
  function useSerumPowder(raw, lookup){
    const s=clone(raw||{});if(num(s.pendingBottom)>0)return{ok:false,reason:"keepBottomPending",state:s};
    const has=arr(s.hand).some(c=>{let d=null;try{d=typeof lookup==="function"?lookup(c&&c.name):null;}catch(_){}return isSerumPowder(c,d);});
    if(!has)return{ok:false,reason:"serumPowderMissing",state:s};const n=arr(s.hand).length;if(arr(s.library).length<n)return{ok:false,reason:"libraryTooSmall",state:s};
    const ex=arr(s.hand);s.exiled=arr(s.exiled).concat(ex);s.hand=arr(s.library).splice(0,n);s.serumPowderCount=Math.max(0,Math.trunc(num(s.serumPowderCount)))+1;arr(s.history).push(`血清の粉末${s.serumPowderCount}回目: ${n}枚を追放して${n}枚引いた`);return{ok:true,state:s,exiled:ex,drawn:s.hand};
  }
  function openingTotalsOk(s){return arr(s&&s.library).length+arr(s&&s.hand).length+arr(s&&s.exiled).length===Math.max(0,Math.trunc(num(s&&s.total)));}

  function zoneSerial(card){return Math.max(0,Math.trunc(num(card&&(card.v796ZoneSerial??card.zoneSerial??card.objectSerial))));}
  function cardTypes(card){
    const raw=[...arr(card&&card.types),card&&card.type,card&&card.typeLine].map(str).filter(Boolean).join(" ");
    const known=["Land","Creature","Artifact","Enchantment","Planeswalker","Battle","Instant","Sorcery","Token","土地","クリーチャー","アーティファクト","エンチャント","プレインズウォーカー","バトル","インスタント","ソーサリー","トークン"];
    return uniq(known.filter(k=>raw.toLowerCase().includes(k.toLowerCase())));
  }
  function snapshot(card, location){
    if(!card)return null;const id=str(card.id),serial=zoneSerial(card),zone=str(location&&location.zone||card.zone),player=str(location&&location.player||location&&location.owner||card.controller||card.owner);
    return {id,objectKey:str(card.v797ObjectKey)||`${id}:${serial}`,zoneSerial:serial,name:str(card.name||card.displayName),owner:str(card.owner),controller:str(card.controller||card.owner),player,zone,types:cardTypes(card),colors:uniq(card.colors),manaValue:num(card.manaValue??card.cmc),power:card.power??"",toughness:card.toughness??"",counters:clone(card.counters||{}),tapped:!!card.tapped,faceDown:!!card.faceDown};
  }
  function sameObject(a,b){if(!a||!b)return false;if(a.id&&b.id)return str(a.id)===str(b.id)&&num(a.zoneSerial)===num(b.zoneSerial);if(a.objectKey&&b.objectKey)return str(a.objectKey)===str(b.objectKey);return false;}
  function moveEvents(before, after, meta){
    if(!before)return[];const from=str(meta&&meta.fromZone||before.zone),to=str(meta&&meta.toZone||after&&after.zone),base={id:`ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,turn:num(meta&&meta.turn),activeRole:str(meta&&meta.activeRole),actorRole:str(meta&&meta.actorRole),cardId:before.id,objectKey:before.objectKey,fromZone:from,toZone:to,before:clone(before),after:clone(after),lastKnown:clone(before)};
    const out=[{...base,kind:"zoneMove"}];if(BATTLEFIELD_ZONES.has(from)&&!BATTLEFIELD_ZONES.has(to))out.push({...base,kind:"leavesBattlefield"});if(BATTLEFIELD_ZONES.has(from)&&to==="graveyard"&&before.types.some(t=>["Creature","クリーチャー","Token","トークン"].includes(t)))out.push({...base,kind:"dies"});return out;
  }
  function normalizeDelayedSpec(raw){
    raw=raw||{};const triggerKind=str(raw.triggerKind||raw.kind||"nextEvent"),eventKind=normEvent(raw.eventKind||raw.event||({sourceLeavesBattlefield:"leavesBattlefield",linkedLeavesBattlefield:"leavesBattlefield",nextEndStep:"endStep"}[triggerKind]||""));
    return {id:str(raw.id)||`v7937-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,controller:str(raw.controller)==="B"?"B":"A",triggerKind,eventKind,oneShot:raw.oneShot!==false,optional:!!raw.optional,createdTurn:num(raw.createdTurn),sourceSnapshot:clone(raw.sourceSnapshot||null),linkedSnapshots:arr(raw.linkedSnapshots).map(clone),matchController:str(raw.matchController),matchPlayer:str(raw.matchPlayer),matchTypes:uniq(raw.matchTypes),sourceName:str(raw.sourceName||raw.label||"遅延誘発"),label:str(raw.label||"遅延誘発"),autoEffects:clone(arr(raw.autoEffects)),choices:clone(arr(raw.choices)),note:str(raw.note),targetMode:str(raw.targetMode||"none"),targetProfile:clone(raw.targetProfile||{}),payments:clone(arr(raw.payments)),payload:clone(raw.payload||{})};
  }
  function eventCardSnapshot(event){return event&&event.before||event&&event.lastKnown||event&&event.card||null;}
  function eventMatchesSpec(rawSpec, rawEvent){
    const spec=normalizeDelayedSpec(rawSpec),event={...(rawEvent||{}),kind:normEvent(rawEvent&&rawEvent.kind)};if(spec.eventKind&&event.kind!==spec.eventKind)return false;
    if(event.turn!=null&&spec.createdTurn&&event.kind==="endStep"&&num(event.turn)<spec.createdTurn)return false;
    const ec=eventCardSnapshot(event);
    if(spec.triggerKind==="sourceLeavesBattlefield"&&!sameObject(spec.sourceSnapshot,ec))return false;
    if(spec.triggerKind==="linkedLeavesBattlefield"&&!spec.linkedSnapshots.some(x=>sameObject(x,ec)))return false;
    if(spec.matchController&&str(event.controller||ec&&ec.controller)!==spec.matchController)return false;
    if(spec.matchPlayer&&str(event.player||event.affected||ec&&ec.player)!==spec.matchPlayer)return false;
    if(spec.matchTypes.length){const t=new Set(arr(ec&&ec.types));if(!spec.matchTypes.some(x=>t.has(x)))return false;}
    return true;
  }
  function consumeEvent(items,event){const due=[],remaining=[];for(const raw of arr(items)){const x=normalizeDelayedSpec(raw);if(eventMatchesSpec(x,event)){due.push(x);if(!x.oneShot)remaining.push(x);}else remaining.push(x);}return{due,remaining,event:clone(event)};}
  function buildLastKnownPayload(spec,event){return{source:clone(spec&&spec.sourceSnapshot),linked:clone(spec&&spec.linkedSnapshots),event:clone(event),triggeredObject:clone(eventCardSnapshot(event))};}
  function diagnose(){
    const serum={name:"Serum Powder"},st=makeOpeningState(Array.from({length:60},(_,i)=>i===0?serum:{id:String(i),name:`C${i}`}),()=>0.5),m=normalLondonMulligan(st,()=>0.5),k=beginLondonKeep(m.state);
    const c={id:"c1",name:"Bear",owner:"A",controller:"A",types:["Creature"],v796ZoneSerial:2,power:2,toughness:2},before=snapshot(c,{zone:"creatures",player:"A"}),after=snapshot({...c,v796ZoneSerial:3},{zone:"graveyard",player:"A"}),events=moveEvents(before,after,{fromZone:"creatures",toZone:"graveyard"});
    const spec=normalizeDelayedSpec({triggerKind:"sourceLeavesBattlefield",sourceSnapshot:before});
    const tests=[
      {name:"serum name",ok:isSerumPowder(serum)},
      {name:"London mulligan waits for keep",ok:m.ok&&m.state.mulliganCount===1&&m.state.pendingBottom===0&&k.count===1},
      {name:"leave event",ok:events.some(e=>e.kind==="leavesBattlefield")},
      {name:"dies event",ok:events.some(e=>e.kind==="dies")},
      {name:"object identity match",ok:eventMatchesSpec(spec,events.find(e=>e.kind==="leavesBattlefield"))},
      {name:"LKI retained",ok:buildLastKnownPayload(spec,events[1]).triggeredObject.name==="Bear"}
    ];return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
  }
  return {VERSION,PROTOCOL,normalizeName,cardNames,isSerumPowder,serumPowderCount,recommendOpeningMode,makeOpeningState,normalLondonMulligan,beginLondonKeep,confirmLondonBottom,useSerumPowder,openingTotalsOk,snapshot,sameObject,moveEvents,normalizeDelayedSpec,eventMatchesSpec,consumeEvent,buildLastKnownPayload,diagnose};
});

/* ===== bundled original HTML script block 47/49 ===== */
/* ============================================================
   v7.9.37 Linked Delayed Events & Serum Powder Opening Practice
   - correct London mulligan sequence and repeatable Serum Powder replacement
   - automatic Serum Powder deck detection / mode recommendation
   - one-shot delayed triggers for source/linked leaves-battlefield and next matching public event
   - last-known information retained after the tracked object changes zones
   ============================================================ */
(function(){
"use strict";
const V7937_VERSION="7.9.37";
const R=globalThis.CPT_V7937_RULES;
if(!R)throw new Error("v7.9.37 core module is unavailable");
const clone37=x=>{try{return JSON.parse(JSON.stringify(x));}catch(_){return x;}};
const id37=p=>`${p||"v7937"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const bf37=z=>["creatures","lands","others","battlefield"].includes(String(z||""));
function rt37(){
  if(!state.v7937||typeof state.v7937!=="object"||Array.isArray(state.v7937))state.v7937={};
  const r=state.v7937;if(!Array.isArray(r.eventDelayedTriggers))r.eventDelayedTriggers=[];if(!Array.isArray(r.history))r.history=[];if(!Array.isArray(r.eventQueue))r.eventQueue=[];if(!Array.isArray(r.recentKeys))r.recentKeys=[];return r;
}
function hist37(kind,detail){const r=rt37();r.history.unshift({id:id37("hist"),at:new Date().toISOString(),kind,detail:clone37(detail)});if(r.history.length>150)r.history.length=150;}
function loc37(id){try{const f=findCard(id);return f?{card:f.card,zone:f.zone,player:f.player}:null;}catch(_){return null;}}
function snap37(idOrCard,location){const f=typeof idOrCard==="string"?loc37(idOrCard):null,card=f?f.card:idOrCard,loc=location||f||{};return R.snapshot(card,{zone:loc.zone,player:loc.player});}
function normalizeEffects37(xs){try{return normalizeAutoEffects(xs||[]);}catch(_){return clone37(xs||[]);}}
function register37(spec){
  spec=spec||{};const source=spec.sourceSnapshot||snap37(spec.sourceCardId),linked=(spec.linkedSnapshots||[]).length?spec.linkedSnapshots:(spec.linkedCardIds||[]).map(x=>snap37(x)).filter(Boolean);
  const item=R.normalizeDelayedSpec({...spec,id:spec.id||id37("delay"),createdTurn:Number(state.turn?.number)||0,sourceSnapshot:source,linkedSnapshots:linked,autoEffects:normalizeEffects37(spec.autoEffects),choices:clone37(spec.choices||[])});
  rt37().eventDelayedTriggers.push(item);hist37("registered",item);
  try{addLog(`${pname(item.controller)}: 「${item.label}」を${item.triggerKind==="sourceLeavesBattlefield"?"発生源が戦場を離れたとき":item.triggerKind==="linkedLeavesBattlefield"?"関連カードが戦場を離れたとき":`次の${item.eventKind}`}に予約`);saveState(true);}catch(_){}
  return item;
}
function build37(spec,event){
  const linkedId=String(event?.cardId||event?.before?.id||"");
  const legacy={...spec,timing:"endStep",linkedCardIds:[],linkedObjects:[],targetMode:spec.targetMode||"none",autoEffects:normalizeEffects37(spec.autoEffects||[]),choices:clone37(spec.choices||[]),payments:clone37(spec.payments||[])};
  let a;
  try{a=v794BuildDelayedAbility(legacy);}catch(_){a={id:id37("ability"),kind:"ability",type:"Ability",abilityKind:"triggered",name:`${spec.label} — ${spec.sourceName}`,owner:spec.controller,controller:spec.controller,zone:"stack",sourceCardName:spec.sourceName,sourceCardId:spec.sourceSnapshot?.id||"",autoEffects:legacy.autoEffects,castAutoEffects:legacy.autoEffects,resolveChecklist:[]};}
  a.isV7937Delayed=true;a.v7937DelayedId=spec.id;a.v7937Event=clone37(event);a.v7937LastKnown=R.buildLastKnownPayload(spec,event);a.v7937TriggerKind=spec.triggerKind;
  if(linkedId){a.v795LinkedNonTarget=true;a.v795LinkedCardIds=[linkedId];a.v7937TriggeredCardId=linkedId;}
  a.resolveChecklist=[...(a.resolveChecklist||[]),`v7.9.37: ${spec.eventKind}を1回検出`,event?.lastKnown?`最終情報を保持: ${event.lastKnown.name||event.lastKnown.id||"カード"} / ${event.fromZone||"?"}→${event.toZone||"?"}`:"公開イベント情報を保持"];
  if(!(a.autoEffects||[]).length)a.resolveChecklist.push(spec.note||"効果本文は安全のため手動確認");
  return a;
}
function process37(event){
  if(!event||state.settings?.v7937DelayedEvents===false)return 0;
  if(typeof online!=="undefined"&&online.connected&&online.roomCode){hist37("onlineManual",event);return 0;}
  const r=rt37(),out=R.consumeEvent(r.eventDelayedTriggers,event);if(!out.due.length)return 0;r.eventDelayedTriggers=out.remaining;
  const commit=()=>{for(const x of out.due){state.stack.push(build37(x,event));hist37("triggered",{spec:x,event});}try{addLog(`関連遅延誘発${out.due.length}件をスタックへ置いた`);}catch(_){}};
  try{if(typeof act==="function")act("関連遅延誘発をスタックへ",commit);else commit();}catch(_){commit();}
  state.turn.priority=out.due[out.due.length-1].controller;try{saveState(true);render();}catch(_){}return out.due.length;
}
let flushing37=false;
function eventKey37(e){return [e.kind,e.cardId,e.objectKey,e.player,e.turn,e.fromZone,e.toZone,e.count,Date.now()>>4].join(":");}
function queue37(event){if(!event)return 0;const r=rt37(),key=eventKey37(event);if(r.recentKeys.includes(key))return 0;r.recentKeys.push(key);if(r.recentKeys.length>80)r.recentKeys.splice(0,r.recentKeys.length-80);r.eventQueue.push(clone37(event));if(!flushing37){flushing37=true;setTimeout(()=>{try{while(rt37().eventQueue.length)process37(rt37().eventQueue.shift());}finally{flushing37=false;}},0);}return 1;}

/* Object-zone event bridge. The event uses the pre-move snapshot as LKI. */
if(typeof moveCard==="function"){
  const moveBase37=moveCard;
  moveCard=function(id,destPlayer,destZone,pos,skipUndo){const beforeLoc=loc37(id),before=beforeLoc?snap37(beforeLoc.card,beforeLoc):null,r=moveBase37.apply(this,arguments),afterLoc=loc37(id),after=afterLoc?snap37(afterLoc.card,afterLoc):null;if(r&&before&&beforeLoc.zone!==destZone){for(const e of R.moveEvents(before,after,{fromZone:beforeLoc.zone,toZone:destZone,turn:Number(state.turn?.number)||0,activeRole:state.turn?.active||"",actorRole:r.controller||r.owner||destPlayer}))queue37(e);}return r;};
}
if(typeof v25EmitTriggerEvent==="function"){
  const emitBase37=v25EmitTriggerEvent;
  v25EmitTriggerEvent=function(eventType,subject,meta){const r=emitBase37.apply(this,arguments),map={draw:"draw",cast:"cast",combatDamage:"damage",lifeChanged:"lifeChanged",endCombat:"endCombat",landfall:"landfall"},kind=map[String(eventType||"")];if(kind){const c=subject?snap37(subject,{zone:subject.zone,player:subject.controller||subject.owner}):null;queue37({id:id37("event"),kind,turn:Number(state.turn?.number)||0,activeRole:state.turn?.active||"",player:meta?.player||c?.controller||"",controller:c?.controller||meta?.player||"",count:Number(meta?.count)||0,amount:Number(meta?.amount)||0,cardId:c?.id||"",objectKey:c?.objectKey||"",before:c,lastKnown:c,meta:clone37(meta||{})});}return r;};
}

/* Preserve event metadata through Easy Effect Studio. */
if(typeof eesNormalizeEffect==="function"){
  const normBase37=eesNormalizeEffect;
  eesNormalizeEffect=function(e){e=e||{};const q=normBase37(e);q.v7937TriggerKind=String(e.v7937TriggerKind||q.v7937TriggerKind||"");q.v7937EventKind=String(e.v7937EventKind||q.v7937EventKind||"");q.v7937MatchTypes=Array.isArray(e.v7937MatchTypes)?e.v7937MatchTypes.map(String):Array.isArray(q.v7937MatchTypes)?q.v7937MatchTypes:[];q.v7937MatchController=String(e.v7937MatchController||q.v7937MatchController||"");return q;};
}
if(typeof eesAutoEffect==="function"){
  const autoBase37=eesAutoEffect;
  eesAutoEffect=function(e,a){const q=autoBase37(e,a);if(q&&e&&e.effectId==="delayedTrigger"&&e.v7937TriggerKind)return normalizeAutoEffect({...q,v7937TriggerKind:e.v7937TriggerKind,v7937EventKind:e.v7937EventKind,v7937MatchTypes:e.v7937MatchTypes,v7937MatchController:e.v7937MatchController});return q;};
}
if(typeof v794RegisterDelayedTrigger==="function"){
  const registerBase37=v794RegisterDelayedTrigger;
  v794RegisterDelayedTrigger=function(spec){if(spec&&spec.v7937TriggerKind&&!["nextEndStep","endStep","upkeep"].includes(spec.v7937TriggerKind))return register37({controller:spec.controller,triggerKind:spec.v7937TriggerKind,eventKind:spec.v7937EventKind,matchTypes:spec.v7937MatchTypes,matchController:spec.v7937MatchController,oneShot:spec.oneShot,optional:spec.optional,sourceCardId:spec.sourceCardId,sourceName:spec.sourceName,label:spec.label,autoEffects:spec.autoEffects,choices:spec.choices,note:spec.note,targetMode:spec.targetMode,targetProfile:spec.targetProfile,payments:spec.payments,linkedCardIds:spec.linkedCardIds});return registerBase37.apply(this,arguments);};
}

/* Conservative rule-text extension. It automates the trigger occurrence; ambiguous effect bodies remain checklist items. */
if(typeof v28ParseJapaneseRules==="function"){
  const parseBase37=v28ParseJapaneseRules;
  function nested37(body){try{return (parseBase37(String(body||"")).abilities||[]).flatMap(a=>a.effects||[]).filter(e=>e.effectId!=="customManual").map(eesNormalizeEffect);}catch(_){return[];}}
  function detect37(src){
    let m,kind="",event="",types=[],controller="",body="";
    if((m=src.match(/(?:それら|それ|そのカード|そのパーマネント)が戦場を離れたとき[、,]\s*(.+)$/))){kind="linkedLeavesBattlefield";event="leavesBattlefield";body=m[1];}
    else if((m=src.match(/(?:これ|このパーマネント|このクリーチャー)が戦場を離れたとき[、,]\s*(.+)$/))){kind="sourceLeavesBattlefield";event="leavesBattlefield";body=m[1];}
    else if((m=src.match(/次に(あなた|対戦相手|いずれかのプレイヤー)?が?カードを(?:[一1]枚)?引いたとき[、,]\s*(.+)$/))){kind="nextEvent";event="draw";controller=m[1]==="あなた"?"controller":m[1]==="対戦相手"?"opponent":"";body=m[2];}
    else if((m=src.match(/次に(あなた|対戦相手)?が?呪文を唱えたとき[、,]\s*(.+)$/))){kind="nextEvent";event="cast";controller=m[1]==="あなた"?"controller":m[1]==="対戦相手"?"opponent":"";body=m[2];}
    else if((m=src.match(/次に(?:いずれかの)?(クリーチャー|アーティファクト|パーマネント)(?:が|を)[^。]{0,30}死亡したとき[、,]\s*(.+)$/))){kind="nextEvent";event="dies";types=m[1]==="クリーチャー"?["Creature"]:m[1]==="アーティファクト"?["Artifact"]:["Permanent"];body=m[2];}
    if(!kind)return null;return{kind,event,types,controller,body:String(body||"").replace(/[。]+$/g,"").trim()};
  }
  v28ParseJapaneseRules=function(text){const out=parseBase37.apply(this,arguments),src=String(text||""),d=detect37(src);if(!d)return out;const fx=nested37(d.body),e=eesNormalizeEffect({id:id37("ees-delay"),effectId:"delayedTrigger",optional:false,note:d.body,delayedController:"controller",delayedOneShot:true,delayedEffects:fx,delayedChoices:[],delayedTargetMode:d.kind==="linkedLeavesBattlefield"?"linked":"none",v7937TriggerKind:d.kind,v7937EventKind:d.event,v7937MatchTypes:d.types,v7937MatchController:d.controller});let a=(out.abilities||[]).find(x=>x.kind==="spell")||(out.abilities||[])[0];if(!a){a=eesNewAbility("spell");out.abilities=[a];}a.effects=(a.effects||[]).filter(x=>!(x.effectId==="customManual"&&String(x.note||x.parserSource||"").includes(d.body)));a.effects.push(e);out.matched=(out.matched||0)+1;out.notes=[...(out.notes||[]),`v7.9.37: ${d.event}の次回イベントを追跡`];return out;};
}

function diag37(){
  const d=R.diagnose(),tests=[...d.tests];tests.push({name:"runtime",ok:!!rt37()});tests.push({name:"registration",ok:typeof register37==="function"});tests.push({name:"event queue",ok:typeof queue37==="function"});
  try{const p=v28ParseJapaneseRules("それが戦場を離れたとき、カードを1枚引く。");tests.push({name:"leaves parser",ok:(p.abilities||[]).some(a=>(a.effects||[]).some(e=>e.v7937TriggerKind==="linkedLeavesBattlefield"))});}catch(_){tests.push({name:"leaves parser",ok:false});}
  return{version:V7937_VERSION,protocol:R.PROTOCOL,ok:tests.every(x=>x.ok),tests,delayed:rt37().eventDelayedTriggers.length,history:rt37().history.length};
}
function manager37(){const r=rt37(),rows=r.eventDelayedTriggers.map(x=>`<div class="v794-order-row"><b>${esc(x.label)}</b><span>${esc(x.eventKind)} / ${esc(x.triggerKind)}</span><button class="btn tiny" data-v7937del="${esc(x.id)}">削除</button></div>`).join("")||'<div class="note">予約なし</div>';openModal("v7.9.37 関連遅延誘発",`<div class="note">発生源・関連カードが戦場を離れたとき、または次の公開イベントを1回追跡します。領域変更前の最終情報をスタック上の能力へ保持します。</div>${rows}<div class="menu-grid"><button class="btn primary" data-v7937diag="1">自己診断</button></div>`,`<button class="btn" data-app="closem">閉じる</button>`);setModalHandler(e=>{const d=e.target.closest("[data-v7937del]");if(d){r.eventDelayedTriggers=r.eventDelayedTriggers.filter(x=>x.id!==d.dataset.v7937del);saveState(true);manager37();return;}if(e.target.closest("[data-v7937diag]")){const q=diag37();openModal("v7.9.37 診断",`<pre class="v791-diag">${esc(JSON.stringify(q,null,2))}</pre>`,`<button class="btn" data-app="closem">閉じる</button>`,`lg`);}});}
if(typeof openRuleSuite==="function"){const ruleBase37=openRuleSuite;openRuleSuite=function(){const q=ruleBase37.apply(this,arguments);setTimeout(()=>{const g=document.querySelector("#modalRoot .menu-grid");if(g&&!g.querySelector("[data-v7937hub]")){const b=document.createElement("button");b.className="btn primary";b.dataset.v7937hub="1";b.textContent="関連遅延誘発・最終情報";b.onclick=manager37;g.appendChild(b);}},0);return q;};}
if(typeof openSettings==="function"){const settingsBase37=openSettings;openSettings=function(){const q=settingsBase37.apply(this,arguments);setTimeout(()=>{const body=document.querySelector("#modalRoot .mbody");if(!body||body.querySelector("#v7937Settings"))return;const box=document.createElement("section");box.id="v7937Settings";box.className="spanel";box.innerHTML=`<h3>v7.9.37 遅延誘発・初手練習</h3><label><input type="checkbox" data-v7937setting="v7937DelayedEvents"${state.settings.v7937DelayedEvents!==false?" checked":""}> 関連カードの領域変更と次の公開イベントを自動追跡</label><label><input type="checkbox" data-v7937setting="v7937SerumAutoMode"${state.settings.v7937SerumAutoMode!==false?" checked":""}> 血清の粉末入りデッキでロンドン厳密方式を自動選択</label><div class="note">オンライン対戦中の新しい関連イベント遅延誘発は、重複防止のため自動スタック化せず監査履歴へ残します。初手練習はローカル機能です。</div>`;body.appendChild(box);box.onchange=e=>{const x=e.target.closest("[data-v7937setting]");if(!x)return;state.settings[x.dataset.v7937setting]=x.checked;saveState(true);};},0);return q;};}
try{const d=defaultState();if(d.settings){if(d.settings.v7937DelayedEvents==null)d.settings.v7937DelayedEvents=true;if(d.settings.v7937SerumAutoMode==null)d.settings.v7937SerumAutoMode=true;}}catch(_){}
if(state.settings.v7937DelayedEvents==null)state.settings.v7937DelayedEvents=true;if(state.settings.v7937SerumAutoMode==null)state.settings.v7937SerumAutoMode=true;
globalThis.CPT_V7937_CLIENT={version:V7937_VERSION,runtime:rt37,register:register37,process:process37,queue:queue37,snapshot:snap37,diagnose:diag37,openManager:manager37};
try{document.body.dataset.v7937="linked-delayed-serum";document.title="カードゲーム練習卓 v7.9.37 関連遅延誘発・血清の粉末";}catch(_){}
})();


/* ============================================================
   v7.9.38 Strict Land-Play Timing Guard
   - normal land plays are allowed only during the acting player's
     own first or second main phase, with priority and an empty stack
   - additional land-play permissions only increase the numeric limit;
     they do not bypass timing
   - effects and abilities that put a land onto the battlefield are
     not land plays and remain outside this guard
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7938_LAND_TIMING=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.38",PROTOCOL="cpt-v7.9.38-land-timing-guard",MAIN_PHASES=new Set([3,9]);
const arr=v=>Array.isArray(v)?v:[];
const str=v=>String(v==null?"":v);
function landTimingDecision(raw={}){
  const method=str(raw.method||"play").toLowerCase();
  const isLandPlay=raw.isLandPlay!==false&&method==="play";
  const turn=raw.turn&&typeof raw.turn==="object"?raw.turn:{};
  const actorRole=str(raw.actorRole||raw.player||raw.actor);
  const active=str(turn.active),priority=str(turn.priority);
  const phase=Number(turn.phase),stackDepth=Array.isArray(raw.stack)?raw.stack.length:Math.max(0,Math.trunc(Number(raw.stackDepth)||0));
  const base={actorRole,active,priority,phase,stackDepth,method,isLandPlay,timingOverride:raw.timingOverride===true};
  if(!isLandPlay)return{ok:true,reasons:[],reason:"not-a-land-play",...base};
  if(raw.timingOverride===true)return{ok:true,reasons:[],reason:"timing-override",...base};
  const reasons=[];
  if(!actorRole||active!==actorRole)reasons.push("landPlayActivePlayerRequired");
  if(!MAIN_PHASES.has(phase))reasons.push("landPlayMainPhaseRequired");
  if(stackDepth!==0)reasons.push("landPlayStackEmptyRequired");
  if(!actorRole||priority!==actorRole)reasons.push("landPlayPriorityRequired");
  return{ok:reasons.length===0,reasons,reason:reasons[0]||"",...base};
}
function reasonText(reason){
  return ({
    landPlayActivePlayerRequired:"土地は自分のターンにしかプレイできません",
    landPlayMainPhaseRequired:"土地は第1または第2メインフェイズにしかプレイできません",
    landPlayStackEmptyRequired:"スタックに呪文や能力がある間は土地をプレイできません",
    landPlayPriorityRequired:"自分が優先権を持っているときだけ土地をプレイできます",
  })[reason]||str(reason);
}
function describe(decision){return arr(decision&&decision.reasons).map(reasonText);}
function diagnose(){
  const base={actorRole:"A",turn:{active:"A",phase:3,priority:"A"},stack:[]};
  const tests=[
    {name:"first main allowed",ok:landTimingDecision(base).ok},
    {name:"second main allowed",ok:landTimingDecision({...base,turn:{...base.turn,phase:9}}).ok},
    {name:"opponent turn blocked",ok:landTimingDecision({...base,turn:{...base.turn,active:"B"}}).reasons.includes("landPlayActivePlayerRequired")},
    {name:"combat blocked",ok:landTimingDecision({...base,turn:{...base.turn,phase:4}}).reasons.includes("landPlayMainPhaseRequired")},
    {name:"stack blocked",ok:landTimingDecision({...base,stack:[{}]}).reasons.includes("landPlayStackEmptyRequired")},
    {name:"priority blocked",ok:landTimingDecision({...base,turn:{...base.turn,priority:"B"}}).reasons.includes("landPlayPriorityRequired")},
    {name:"put effect exempt",ok:landTimingDecision({...base,method:"put",stack:[{}]}).ok},
  ];
  return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
}
return{version:VERSION,protocol:PROTOCOL,MAIN_PHASES,landTimingDecision,reasonText,describe,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7938_LAND_TIMING)return;
if(typeof defaultState!=="function"||typeof v45MoveLandToBattlefield!=="function"||typeof _playLandFromHandFlow!=="function"||typeof v45UsePermission!=="function"||typeof openSettings!=="function")return;
const API=globalThis.CPT_V7938_LAND_TIMING;
function clone(v){try{return v==null?v:JSON.parse(JSON.stringify(v));}catch(_){return v;}}
function runtime38(){
  if(!state.v7938||typeof state.v7938!=="object"||Array.isArray(state.v7938))state.v7938={landTimingBlocks:[]};
  if(!Array.isArray(state.v7938.landTimingBlocks))state.v7938.landTimingBlocks=[];
  return state.v7938;
}
function record38(detail){const a=runtime38().landTimingBlocks,row={at:new Date().toISOString(),kind:"landTimingBlocked",...clone(detail||{})};a.unshift(row);if(a.length>160)a.length=160;try{const old=state.v7935&&state.v7935.landPlayBlocks;if(Array.isArray(old)){old.unshift(clone(row));if(old.length>160)old.length=160;}}catch(_){}return row;}
function turnSnapshot38(player,permission){return{actorRole:player,turn:state.turn||{},stack:state.stack||[],method:"play",isLandPlay:true,timingOverride:!!(permission&&permission.timingOverride===true)};}
function timing38(player,permission){return API.landTimingDecision(turnSnapshot38(player,permission));}
function phaseName38(n){try{return Array.isArray(PHASES)&&PHASES[n]?PHASES[n]:`フェイズ${n}`;}catch(_){return`フェイズ${n}`;}}
function showBlocked38(id,player,permission,q){
  const f=typeof v45Find==="function"?v45Find(id):(typeof findCard==="function"?findCard(id):null),name=f&&f.card?f.card.name:"土地",reasons=API.describe(q);
  record38({cardId:String(id||""),name,player,permissionId:permission&&permission.id||"",reasons:q.reasons,turnNumber:Number(state.turn&&state.turn.number)||0,active:q.active,phase:q.phase,priority:q.priority,stackDepth:q.stackDepth});
  const list=reasons.map(x=>`<li>${typeof esc==="function"?esc(x):x}</li>`).join("");
  const body=`<div class="oh-warn"><b>${typeof esc==="function"?esc(name):name}</b> は現在プレイできません。</div><ul class="v7938-reasons">${list}</ul><div class="pvrow">現在: ${typeof esc==="function"?esc(phaseName38(q.phase)):phaseName38(q.phase)} / 優先権 ${typeof esc==="function"?esc(q.priority||"なし"):q.priority||"なし"} / スタック ${q.stackDepth}</div><div class="note">追加の土地プレイ権は回数だけを増やします。フェッチランドや呪文・能力によって土地を「戦場に出す」処理は通常の土地プレイではないため、この制限の対象外です。</div>`;
  try{openModal("土地をプレイできるタイミングではありません",body,'<button class="btn primary" data-app="closem">閉じる</button>');}
  catch(_){try{toast(reasons.join(" / "));}catch(__){}}
  return false;
}
function allow38(id,player,permission){
  if((state.settings||{}).v7938LandTimingGuard===false)return true;
  const q=timing38(player,permission);return q.ok?true:showBlocked38(id,player,permission,q);
}
const defaultBase38=defaultState;
defaultState=function(){const s=defaultBase38();s.v7938={landTimingBlocks:[]};s.settings=Object.assign({v7938LandTimingGuard:true},s.settings||{});return s;};
state.settings=Object.assign({v7938LandTimingGuard:true},state.settings||{});runtime38();

/* Final guard around every normal land-play commit path. moveCard itself is not wrapped,
   so fetch/search/reanimation effects that put lands onto the battlefield remain exempt. */
const landMoveBase38=v45MoveLandToBattlefield;
v45MoveLandToBattlefield=function(id,player,permission,fromHand){if(!allow38(id,player,permission))return false;return landMoveBase38.apply(this,arguments);};

/* Bypass the old warning-with-continue flow for ordinary hand plays. */
_playLandFromHandFlow=function(id){const f=typeof v45Find==="function"?v45Find(id):findCard(id);if(!f||f.zone!=="hand"||!(typeof v45IsLand==="function"?v45IsLand(f.card):cardHasType(f.card,"Land")))return false;return v45MoveLandToBattlefield(id,f.player||f.card.owner,null,true);};

/* The primary smart-play button and hand double-click route through this function.
   Lands must use the guarded land-play flow instead of a raw moveCard call. */
if(typeof smartStandardAction==="function"){
  const smartActionBase38=smartStandardAction;
  smartStandardAction=function(id){const f=typeof v45Find==="function"?v45Find(id):findCard(id);if(f&&f.zone==="hand"&&(typeof v45IsLand==="function"?v45IsLand(f.card):cardHasType(f.card,"Land")))return _playLandFromHandFlow(id);return smartActionBase38.apply(this,arguments);};
}

/* Do the same for explicit permissions to play a land from another zone. */
const usePermissionBase38=v45UsePermission;
v45UsePermission=function(cardId,permissionId){
  const f=typeof v45Find==="function"?v45Find(cardId):findCard(cardId),isLand=!!(f&&(typeof v45IsLand==="function"?v45IsLand(f.card):cardHasType(f.card,"Land")));
  if(!isLand)return usePermissionBase38.apply(this,arguments);
  const p=typeof v45Runtime==="function"?v45Runtime().permissions.find(x=>x.id===permissionId):null;
  if(!p||!f){try{toast("使用権またはカードが見つかりません");}catch(_){}return false;}
  if(typeof v45PermissionsFor==="function"&&!v45PermissionsFor(f.card,p.player).some(x=>x.id===p.id)){try{toast("現在はこの使用権を使えません");}catch(_){}return false;}
  return v45MoveLandToBattlefield(cardId,p.player,p,false);
};

const settingsBase38=openSettings;
openSettings=function(){const r=settingsBase38.apply(this,arguments);setTimeout(()=>{const body=document.querySelector("#modalRoot .mbody");if(!body||body.querySelector("#v7938Settings"))return;const box=document.createElement("section");box.id="v7938Settings";box.className="spanel";box.innerHTML=`<h3>v7.9.38 土地プレイのタイミング</h3><label><input type="checkbox" data-v7938setting="v7938LandTimingGuard"${state.settings.v7938LandTimingGuard!==false?" checked":""}> 通常の土地プレイを自分のメインフェイズ・優先権あり・スタック空に限定</label><div class="note">追加土地プレイ権は回数のみ増加します。能力で土地を戦場に出す処理には適用しません。</div>`;body.appendChild(box);box.onchange=e=>{const x=e.target.closest("[data-v7938setting]");if(!x)return;state.settings[x.dataset.v7938setting]=x.checked;saveState(true);};},0);return r;};
const style38=document.createElement("style");style38.textContent="#v7938Settings{display:grid;gap:7px}.v7938-reasons{margin:10px 0 10px 22px;display:grid;gap:5px}";document.head.appendChild(style38);
globalThis.CPT_V7938_CLIENT={version:API.version,protocol:API.protocol,runtime:runtime38,timing:timing38,allow:allow38,diagnose:API.diagnose};
try{document.body.dataset.v7938="strict-land-timing";document.title="カードゲーム練習卓 v7.9.38 土地プレイ・タイミング制御";}catch(_){}
})();



/* ============================================================
   v7.9.39 Manual Land-Play Path Fix
   - card-menu / unknown-card "move to land area" from hand is a
     normal land play and must use the same timing and count guards
   - movement from non-hand zones remains a manual effect placement
   - an explicit effect-placement button is provided for rare effects
     that put a land from hand onto the battlefield without playing it
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7939_LAND_PATH=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.39",PROTOCOL="cpt-v7.9.39-land-manual-path-fix";
function shouldGuardManualMove(raw={}){
  const from=String(raw.fromZone||""),dest=String(raw.destZone||"");
  const explicitEffect=raw.explicitEffect===true||raw.method==="put";
  return !explicitEffect&&from==="hand"&&dest==="lands";
}
function diagnose(){
  const tests=[
    {name:"hand to lands is play",ok:shouldGuardManualMove({fromZone:"hand",destZone:"lands"})},
    {name:"graveyard to lands is effect move",ok:!shouldGuardManualMove({fromZone:"graveyard",destZone:"lands"})},
    {name:"library to lands is effect move",ok:!shouldGuardManualMove({fromZone:"library",destZone:"lands"})},
    {name:"explicit hand effect is exempt",ok:!shouldGuardManualMove({fromZone:"hand",destZone:"lands",explicitEffect:true})},
    {name:"hand to other zone ignored",ok:!shouldGuardManualMove({fromZone:"hand",destZone:"others"})},
  ];
  return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
}
return{version:VERSION,protocol:PROTOCOL,shouldGuardManualMove,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7939_LAND_PATH)return;
if(typeof findCard!=="function"||typeof moveCard!=="function"||typeof openCardMenu!=="function"||typeof openUnknownPlayMenu!=="function")return;
const API=globalThis.CPT_V7939_LAND_PATH;
let menuCardId39="";
function clone39(v){try{return v==null?v:JSON.parse(JSON.stringify(v));}catch(_){return v;}}
function runtime39(){
  if(!state.v7939||typeof state.v7939!=="object"||Array.isArray(state.v7939))state.v7939={blocks:[],plays:[],effectPuts:[]};
  for(const k of["blocks","plays","effectPuts"]){if(!Array.isArray(state.v7939[k]))state.v7939[k]=[];}
  return state.v7939;
}
function record39(kind,detail){const r=runtime39(),row={at:new Date().toISOString(),kind,...clone39(detail||{})},a=kind==="block"?r.blocks:kind==="effectPut"?r.effectPuts:r.plays;a.unshift(row);if(a.length>160)a.length=160;return row;}
const defaultBase39=defaultState;
defaultState=function(){const s=defaultBase39();s.v7939={blocks:[],plays:[],effectPuts:[]};s.settings=Object.assign({v7939ManualLandPathGuard:true},s.settings||{});return s;};
state.settings=Object.assign({v7939ManualLandPathGuard:true},state.settings||{});runtime39();
function player39(f){return f&&((f.player==="A"||f.player==="B")?f.player:(f.card&&((f.card.controller==="B"||f.card.owner==="B")?"B":"A")))||"A";}
function showCountBlock39(id,p){
  const f=findCard(id),used=typeof _landPlayed==="function"?_landPlayed(p):0,limit=typeof v45LandLimit==="function"?v45LandLimit(p):1,name=f&&f.card?f.card.name:"土地";
  record39("block",{cardId:id,name,player:p,reason:"land-play-limit",used,limit});
  const body=`<div class="oh-warn"><b>${typeof esc==="function"?esc(name):name}</b> はこのターンの土地プレイ上限を超えています。</div><div class="pvrow">土地プレイ: <b>${used}/${limit}</b></div><div class="note">追加で土地をプレイできる能力がある場合は、追加土地プレイ権を登録してください。</div>`;
  try{openModal("土地プレイ上限",body,'<button class="btn primary" data-app="closem">閉じる</button>');}catch(_){try{toast(`土地プレイ上限です（${used}/${limit}）`);}catch(__){}}
  return false;
}
function strictPlay39(id){
  const f=findCard(id);if(!f||f.zone!=="hand")return false;const p=player39(f);
  if((state.settings||{}).v7939ManualLandPathGuard!==false){
    if(globalThis.CPT_V7938_CLIENT&&typeof CPT_V7938_CLIENT.allow==="function"&&!CPT_V7938_CLIENT.allow(id,p,null)){record39("block",{cardId:id,name:f.card.name,player:p,reason:"timing"});return false;}
    const used=typeof _landPlayed==="function"?_landPlayed(p):0,limit=typeof v45LandLimit==="function"?v45LandLimit(p):1;
    if(globalThis.CPT_V7935_ATOMIC&&typeof CPT_V7935_ATOMIC.landPlayDecision==="function"&&!CPT_V7935_ATOMIC.landPlayDecision({used,limit,method:"play"}).ok)return showCountBlock39(id,p);
    if(used>=limit)return showCountBlock39(id,p);
  }
  try{if(typeof pushUndo==="function")pushUndo("土地プレイ");}catch(_){}
  const cur=findCard(id);if(!cur||cur.zone!=="hand")return false;cur.arr.splice(cur.index,1);const c=cur.card;c.zone="lands";c.controller=p;c.tapped=false;c.attacking=false;c.blocking=false;c.faceDown=false;state.players[p].lands.push(c);
  if(typeof _landPlayMap==="function"&&typeof _landPlayed==="function")_landPlayMap()[p]=_landPlayed(p)+1;
  record39("play",{cardId:id,name:c.name,player:p,from:"hand",used:typeof _landPlayed==="function"?_landPlayed(p):null,limit:typeof v45LandLimit==="function"?v45LandLimit(p):null,path:"manual-land-area"});
  try{addLog(`${typeof pname==="function"?pname(p):p} が 土地 [${c.name}] を手札からプレイした`);}catch(_){}
  try{saveState(true);render();if(typeof renderPreview==="function")renderPreview();}catch(_){}
  return c;
}
function effectPut39(id){
  const f=findCard(id);if(!f||f.zone!=="hand")return false;const p=player39(f),name=f.card.name;
  const go=()=>{try{if(typeof act==="function")act("効果で土地を戦場に出す",()=>moveCard(id,p,"lands",null,true));else moveCard(id,p,"lands",null,true);record39("effectPut",{cardId:id,name,player:p,from:"hand"});addLog(`[${name}] を効果によって土地エリアへ出した（土地プレイ回数には数えない）`);saveState(true);render();if(typeof renderPreview==="function")renderPreview();}catch(err){try{toast(`移動失敗: ${err&&err.message||err}`);}catch(_){}}};
  try{confirmDlg(`[${name}] を「土地のプレイ」ではなく、呪文・能力の効果で戦場に出しますか？\n土地プレイ回数とタイミング制限には数えません。`,go);}catch(_){go();}
  return true;
}
const menuBase39=openCardMenu;
openCardMenu=function(id){menuCardId39=String(id||"");const r=menuBase39.apply(this,arguments);setTimeout(()=>{const f=findCard(id),body=document.querySelector("#modalRoot .mbody .menu-grid");if(!f||f.zone!=="hand"||!body||body.querySelector("[data-v7939-effect-put]"))return;const b=document.createElement("button");b.className="btn warn";b.dataset.v7939EffectPut="1";b.textContent="効果で土地を戦場に出す（プレイではない）";body.appendChild(b);},0);return r;};
const unknownBase39=openUnknownPlayMenu;
openUnknownPlayMenu=function(id){menuCardId39=String(id||"");return unknownBase39.apply(this,arguments);};
document.addEventListener("click",function(e){
  const effect=e.target.closest("[data-v7939-effect-put]");if(effect){e.preventDefault();e.stopImmediatePropagation();const id=menuCardId39||selectedCardId;try{closeModal();}catch(_){}effectPut39(id);return;}
  const b=e.target.closest('[data-cm="lands"],[data-up="lands"]');if(!b)return;const id=menuCardId39||selectedCardId,f=findCard(id);if(!f||!API.shouldGuardManualMove({fromZone:f.zone,destZone:"lands"}))return;
  e.preventDefault();e.stopImmediatePropagation();try{closeModal();}catch(_){}strictPlay39(id);
},true);
const settingsBase39=openSettings;
openSettings=function(){const r=settingsBase39.apply(this,arguments);setTimeout(()=>{const body=document.querySelector("#modalRoot .mbody");if(!body||body.querySelector("#v7939Settings"))return;const box=document.createElement("section");box.id="v7939Settings";box.className="spanel";box.innerHTML=`<h3>v7.9.39 土地の手動移動経路</h3><label><input type="checkbox" data-v7939setting="v7939ManualLandPathGuard"${state.settings.v7939ManualLandPathGuard!==false?" checked":""}> 手札から「土地エリアへ」を通常の土地プレイとして判定</label><div class="note">墓地・ライブラリー・追放領域から土地エリアへ移す手動処理は、能力による配置として制限外です。手札から効果で出す場合は専用ボタンを使用します。</div>`;body.appendChild(box);box.onchange=e=>{const x=e.target.closest("[data-v7939setting]");if(!x)return;state.settings[x.dataset.v7939setting]=x.checked;saveState(true);};},0);return r;};
const style39=document.createElement("style");style39.textContent="#v7939Settings{display:grid;gap:7px}";document.head.appendChild(style39);
globalThis.CPT_V7939_CLIENT={version:API.version,protocol:API.protocol,runtime:runtime39,strictPlay:strictPlay39,effectPut:effectPut39,diagnose:API.diagnose};
try{document.body.dataset.v7939="land-manual-path-fix";document.title="カードゲーム練習卓 v7.9.39 土地手動経路修正";}catch(_){}
})();


/* ============================================================
   v7.9.40 IndexedDB Storage Migration
   - full state and automatic backups move from localStorage to IndexedDB
   - legacy data is copied and read-back verified before localStorage is slimmed
   - localStorage keeps only a small bootstrap marker and lightweight settings
   - newest automatic backups are retained (default: 3)
   - IndexedDB failure never deletes unverified legacy data
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7940_INDEXEDDB=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.40";
const PROTOCOL="cpt-v7.9.40-indexeddb-storage";
const DB_NAME="cpt_mtgo_storage_v1";
const DB_VERSION=1;
const STATE_KEY="canonical-state";
const META_KEY="storage-meta";
const MARKER_KIND="cpt-indexeddb-bootstrap";
const DEFAULT_RETENTION=3;
const isObj=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function canonical(v){
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function hashText(text){let h=0x811c9dc5,s=String(text==null?"":text);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,"0");}
function hash(v){return hashText(canonical(v));}
function bytes(text){try{return new Blob([String(text||"")]).size;}catch(_){return String(text||"").length;}}
function safeParse(raw,fallback=null){try{return JSON.parse(String(raw||""));}catch(_){return fallback;}}
function stateSavedAt(raw){const x=safeParse(raw,{});return String(x&&x.meta&&x.meta.lastSaved||x&&x.savedAt||"");}
function isMarkerObject(v){return isObj(v)&&v.__kind===MARKER_KIND&&Number(v.schema)===1;}
function isMarkerRaw(raw){return isMarkerObject(safeParse(raw,null));}
function makeMarker(meta={}){
  return{
    __kind:MARKER_KIND,
    schema:1,
    appVersion:String(meta.appVersion||VERSION),
    dataVersion:Number(meta.dataVersion)||0,
    savedAt:String(meta.savedAt||""),
    stateHash:String(meta.stateHash||""),
    stateBytes:Math.max(0,Number(meta.stateBytes)||0),
    backupCount:Math.max(0,Number(meta.backupCount)||0),
    backupBytes:Math.max(0,Number(meta.backupBytes)||0),
    status:String(meta.status||"ready")
  };
}
function makeStateRecord(raw,meta={}){
  raw=String(raw||"");
  return{key:STATE_KEY,raw,hash:hashText(raw),bytes:bytes(raw),savedAt:String(meta.savedAt||stateSavedAt(raw)||new Date().toISOString()),appVersion:String(meta.appVersion||VERSION),dataVersion:Number(meta.dataVersion)||0};
}
function verifyStateRecord(record){return!!(record&&record.key===STATE_KEY&&typeof record.raw==="string"&&record.hash===hashText(record.raw)&&Number(record.bytes)===bytes(record.raw));}
function backupId(row,i=0){return String(row&&row.id||"")||`bk-${String(row&&row.at||Date.now()).replace(/[^0-9A-Za-z_-]/g,"")}-${i}-${hashText(row&&row.data||"")}`;}
function normalizeBackup(row,i=0){row=isObj(row)?row:{};const data=String(row.data||"");return{id:backupId(row,i),at:String(row.at||new Date().toISOString()),reason:String(row.reason||"自動"),size:Math.max(0,Number(row.size)||bytes(data)),data,summary:isObj(row.summary)?clone(row.summary):null,hash:hashText(data)};}
function backupValid(row){return!!(row&&typeof row.data==="string"&&row.hash===hashText(row.data));}
function clampRetention(n){n=Math.trunc(Number(n)||DEFAULT_RETENTION);return Math.max(1,Math.min(10,n));}
function trimBackups(rows,limit=DEFAULT_RETENTION){return(Array.isArray(rows)?rows:[]).map(normalizeBackup).filter(backupValid).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,clampRetention(limit));}
function backupBytes(rows){return trimBackups(rows,10).reduce((n,x)=>n+bytes(x.data),0);}
function migrationPlan(input={}){
  const legacyRaw=String(input.legacyStateRaw||"");
  const existing=input.existingStateRecord;
  const legacyBackups=Array.isArray(input.legacyBackups)?input.legacyBackups:[];
  const existingBackups=Array.isArray(input.existingBackups)?input.existingBackups:[];
  const stateAction=verifyStateRecord(existing)?"keep-indexeddb":(legacyRaw&&!isMarkerRaw(legacyRaw)?"migrate-legacy":"missing");
  const backupAction=existingBackups.length?"keep-indexeddb":(legacyBackups.length?"migrate-legacy":"empty");
  return{stateAction,backupAction,retention:clampRetention(input.retention),canSlimLocalStorage:stateAction!=="missing"};
}
function newerRaw(a,b){const ta=Date.parse(stateSavedAt(a)),tb=Date.parse(stateSavedAt(b));if(Number.isFinite(ta)&&Number.isFinite(tb))return ta>=tb?a:b;if(Number.isFinite(ta))return a;if(Number.isFinite(tb))return b;return String(a||"").length>=String(b||"").length?a:b;}
function createMemoryAdapter(seed={}){
  let stateRecord=seed.stateRecord?clone(seed.stateRecord):null;
  let backups=trimBackups(seed.backups||[],10);
  let meta=clone(seed.meta||{});
  return{
    async getState(){return clone(stateRecord);},
    async putState(record){stateRecord=clone(record);return clone(stateRecord);},
    async getBackups(){return clone(backups);},
    async replaceBackups(rows){backups=trimBackups(rows,10);return clone(backups);},
    async getMeta(){return clone(meta);},
    async putMeta(next){meta=clone(next||{});return clone(meta);},
    snapshot(){return{stateRecord:clone(stateRecord),backups:clone(backups),meta:clone(meta)}}
  };
}
function requestPromise(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("IndexedDB request failed"));});}
function transactionDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error("IndexedDB transaction failed"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB transaction aborted"));});}
async function openBrowserAdapter(idb){
  if(!idb||typeof idb.open!=="function")throw new Error("IndexedDBを利用できません");
  const req=idb.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("records"))db.createObjectStore("records",{keyPath:"key"});if(!db.objectStoreNames.contains("backups")){const s=db.createObjectStore("backups",{keyPath:"id"});s.createIndex("at","at",{unique:false});}};
  const db=await requestPromise(req);
  return{
    async getState(){const tx=db.transaction("records","readonly"),done=transactionDone(tx),r=await requestPromise(tx.objectStore("records").get(STATE_KEY));await done;return r||null;},
    async putState(record){const tx=db.transaction("records","readwrite"),done=transactionDone(tx);tx.objectStore("records").put(record);await done;return record;},
    async getBackups(){const tx=db.transaction("backups","readonly"),done=transactionDone(tx),rows=await requestPromise(tx.objectStore("backups").getAll());await done;return trimBackups(rows||[],10);},
    async replaceBackups(rows){const tx=db.transaction("backups","readwrite"),done=transactionDone(tx),s=tx.objectStore("backups");s.clear();for(const row of trimBackups(rows,10))s.put(row);await done;return trimBackups(rows,10);},
    async getMeta(){const tx=db.transaction("records","readonly"),done=transactionDone(tx),r=await requestPromise(tx.objectStore("records").get(META_KEY));await done;return r&&r.value||{};},
    async putMeta(value){const tx=db.transaction("records","readwrite"),done=transactionDone(tx);tx.objectStore("records").put({key:META_KEY,value:clone(value||{})});await done;return value;},
    close(){try{db.close();}catch(_){}}
  };
}
function diagnose(){
  const raw=JSON.stringify({meta:{lastSaved:"2026-07-29T00:00:00Z"},cardDictionary:{A:{name:"A"}},decks:[{deckName:"D"}]});
  const rec=makeStateRecord(raw),rows=trimBackups([{at:"2026-01-01",data:"a"},{at:"2026-03-01",data:"c"},{at:"2026-02-01",data:"b"},{at:"2026-04-01",data:"d"}],3);
  const marker=makeMarker({stateHash:rec.hash,stateBytes:rec.bytes});
  const tests=[
    {name:"state record verifies",ok:verifyStateRecord(rec)},
    {name:"marker recognized",ok:isMarkerObject(marker)&&isMarkerRaw(JSON.stringify(marker))},
    {name:"marker is not state",ok:!isMarkerRaw(raw)},
    {name:"retention is three",ok:rows.length===3},
    {name:"newest retained",ok:rows[0].data==="d"&&rows[2].data==="b"},
    {name:"legacy migration planned",ok:migrationPlan({legacyStateRaw:raw}).stateAction==="migrate-legacy"},
    {name:"indexeddb preferred",ok:migrationPlan({legacyStateRaw:raw,existingStateRecord:rec}).stateAction==="keep-indexeddb"},
    {name:"newer timestamp selected",ok:newerRaw(raw,JSON.stringify({meta:{lastSaved:"2026-01-01T00:00:00Z"}}))===raw}
  ];
  return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
}
return{VERSION,PROTOCOL,DB_NAME,DB_VERSION,STATE_KEY,META_KEY,MARKER_KIND,DEFAULT_RETENTION,clone,canonical,hash,hashText,bytes,safeParse,stateSavedAt,isMarkerObject,isMarkerRaw,makeMarker,makeStateRecord,verifyStateRecord,normalizeBackup,backupValid,clampRetention,trimBackups,backupBytes,migrationPlan,newerRaw,createMemoryAdapter,openBrowserAdapter,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7940_INDEXEDDB)return;
if(typeof saveState!=="function"||typeof loadState!=="function"||typeof serialize!=="function"||typeof LS_KEY==="undefined")return;
const API=globalThis.CPT_V7940_INDEXEDDB;
const baseSave=saveState,baseLoad=loadState;
const baseGetBackups=typeof cptGetBackups==="function"?cptGetBackups:()=>[];
const baseSaveBackups=typeof cptSaveBackups==="function"?cptSaveBackups:()=>false;
const baseLSUsage=typeof cptLSUsage==="function"?cptLSUsage:()=>({state:0,backups:0});
const baseCapHTML=typeof cptCapHTML==="function"?cptCapHTML:()=>"";
const baseOpenBackup=typeof openBackup==="function"?openBackup:null;
const baseOpenSettings=typeof openSettings==="function"?openSettings:null;
const LEGACY_BACKUP_KEY=typeof LS_BACKUP_KEY!=="undefined"?LS_BACKUP_KEY:"cpt_backups_v1";
const initialLocalRaw=(()=>{try{return localStorage.getItem(LS_KEY)||"";}catch(_){return"";}})();
const initialBackupRaw=(()=>{try{return localStorage.getItem(LEGACY_BACKUP_KEY)||"";}catch(_){return"";}})();
let adapter=null,ready=false,applying=false,mode="opening",cachedRaw="",backupCache=[],pendingRaw="",pendingBackupRows=null,saveLoop=null,backupLoop=null,lastError="",statusNote="IndexedDBを準備中",persisted=null;
let metrics={stateBytes:0,backupBytes:0,backupCount:0,localStateBytes:API.bytes(initialLocalRaw),localBackupBytes:API.bytes(initialBackupRaw),lastSavedAt:"",migratedState:false,migratedBackups:false};
function now(){try{return typeof nowISO==="function"?nowISO():new Date().toISOString();}catch(_){return new Date().toISOString();}}
function human(n){try{return typeof cptHuman==="function"?cptHuman(n):(n<1048576?(n/1024).toFixed(1)+" KB":(n/1048576).toFixed(2)+" MB");}catch(_){return String(n)+" B";}}
function retention(){try{return API.clampRetention(state&&state.settings&&state.settings.v7940BackupRetention);}catch(_){return API.DEFAULT_RETENTION;}}
function markerFor(raw,status="ready"){
  return API.makeMarker({appVersion:API.VERSION,dataVersion:state&&state.dataVersion,savedAt:API.stateSavedAt(raw)||now(),stateHash:API.hashText(raw),stateBytes:API.bytes(raw),backupCount:metrics.backupCount,backupBytes:metrics.backupBytes,status});
}
function writeMarker(raw,status){try{const m=markerFor(raw,status);localStorage.setItem(LS_KEY,JSON.stringify(m));localStorage.removeItem(LEGACY_BACKUP_KEY);metrics.localStateBytes=API.bytes(JSON.stringify(m));metrics.localBackupBytes=0;return true;}catch(e){lastError=String(e&&e.message||e);return false;}}
function localRawIsReal(){try{const raw=localStorage.getItem(LS_KEY)||"";return!!raw&&!API.isMarkerRaw(raw);}catch(_){return false;}}
function preserveCurrentCollections(){try{return{cards:JSON.parse(JSON.stringify(state.cardDictionary||{})),decks:JSON.parse(JSON.stringify(state.decks||[]))};}catch(_){return{cards:{},decks:[]};}}
function mergeCurrentCollections(cur){
  try{
    if(!cur||(Object.keys(cur.cards||{}).length===0&&(!cur.decks||cur.decks.length===0)))return;
    const P=globalThis.CPT_V7934_PERSISTENCE||globalThis.CPT_V7933_PERSISTENCE;
    if(P&&typeof P.buildBundle==="function"&&typeof P.mergeBundle==="function"){
      const m=P.mergeBundle(state,P.buildBundle(cur.cards||{},cur.decks||[],{savedAt:now()}),{overwrite:false});state.cardDictionary=m.cardDictionary;state.decks=m.decks;
    }
  }catch(_){ }
}
function applyRaw(raw,opts={}){
  if(!raw||API.isMarkerRaw(raw))return false;
  const current=opts.mergeCurrent===true?preserveCurrentCollections():null,prev=(()=>{try{return localStorage.getItem(LS_KEY);}catch(_){return null;}})();
  applying=true;
  try{
    localStorage.setItem(LS_KEY,raw);
    const ok=baseLoad(true);
    if(!ok)throw new Error("IndexedDB保存データの既存ロード処理が失敗しました");
    if(current)mergeCurrentCollections(current);
    cachedRaw=serialize();
    return true;
  }finally{
    applying=false;
    try{if(prev==null)localStorage.removeItem(LS_KEY);else localStorage.setItem(LS_KEY,prev);}catch(_){ }
  }
}
async function saveRecord(raw){
  const rec=API.makeStateRecord(raw,{appVersion:API.VERSION,dataVersion:state&&state.dataVersion,savedAt:API.stateSavedAt(raw)||now()});
  await adapter.putState(rec);const verify=await adapter.getState();if(!API.verifyStateRecord(verify)||verify.raw!==raw)throw new Error("IndexedDB保存後の内容照合が一致しません");
  metrics.stateBytes=rec.bytes;metrics.lastSavedAt=rec.savedAt;cachedRaw=raw;writeMarker(raw,"ready");
  await adapter.putMeta({version:API.VERSION,protocol:API.PROTOCOL,migratedAt:now(),stateHash:rec.hash,stateBytes:rec.bytes,backupCount:metrics.backupCount,backupBytes:metrics.backupBytes});
  globalThis.CPT_LAST_SAVE_ERROR=null;lastError="";statusNote="IndexedDBへ保存済み";return rec;
}
function queueStateSave(raw,notify){
  pendingRaw=String(raw||"");
  if(!saveLoop){saveLoop=(async()=>{while(pendingRaw){const next=pendingRaw;pendingRaw="";try{await saveRecord(next);if(notify&&typeof toast==="function")toast("IndexedDBへ保存しました");}catch(e){lastError=String(e&&e.message||e);globalThis.CPT_LAST_SAVE_ERROR={name:String(e&&e.name||"IndexedDBError"),message:lastError,estimatedBytes:API.bytes(next),at:now()};statusNote="IndexedDB保存失敗";try{localStorage.setItem(LS_KEY,next);if(localStorage.getItem(LS_KEY)!==next)throw new Error("localStorage fallback mismatch");mode="fallback-localStorage";statusNote="IndexedDB失敗のためlocalStorageへ退避";}catch(f){mode="recovery-required";statusNote="保存領域エラー（共有保存またはJSON DLを確認）";if(notify&&typeof showErr==="function")showErr("保存失敗: "+lastError+" / 旧保存への退避も失敗: "+String(f&&f.message||f));}}}saveLoop=null;})();}
  return saveLoop;
}
function queueBackupSave(rows){
  pendingBackupRows=API.trimBackups(rows,retention());backupCache=pendingBackupRows;metrics.backupCount=backupCache.length;metrics.backupBytes=API.backupBytes(backupCache);
  if(mode!=="indexeddb"||!adapter){return Promise.resolve(false);}
  if(!backupLoop){backupLoop=(async()=>{let allOk=true;try{while(pendingBackupRows){const next=pendingBackupRows;pendingBackupRows=null;await adapter.replaceBackups(next);const v=await adapter.getBackups();const normalized=API.trimBackups(v,retention());if(normalized.length!==next.length||API.hash(normalized)!==API.hash(next))throw new Error("IndexedDBバックアップ照合が一致しません");backupCache=normalized;metrics.backupCount=normalized.length;metrics.backupBytes=API.backupBytes(normalized);}writeMarker(cachedRaw||serialize(),"ready");return allOk;}catch(e){allOk=false;lastError=String(e&&e.message||e);statusNote="IndexedDBバックアップ保存失敗";return false;}finally{backupLoop=null;}})();}
  return backupLoop;
}
function runSaveSideEffects(){try{if(typeof cptSaveLightCheck==="function")cptSaveLightCheck();}catch(_){}try{if(typeof maybeScheduleOnlineBroadcast==="function")maybeScheduleOnlineBroadcast();}catch(_){}try{if(typeof v49SchedulePrivate==="function")v49SchedulePrivate();}catch(_){} }
saveState=function(silent){
  if(applying)return true;
  try{if(typeof v40EnsureState==="function")v40EnsureState();}catch(_){}
  try{if(state.meta)state.meta.lastSaved=now();const raw=serialize();cachedRaw=raw;runSaveSideEffects();
    if(!ready){pendingRaw=raw;return true;}
    if(mode==="indexeddb"){writeMarker(raw,"pending");queueStateSave(raw,!silent);if(!silent&&typeof toast==="function")toast("IndexedDBへ保存中…");return true;}
    if(mode==="recovery-required"){
      const meaningful=Object.keys(state.cardDictionary||{}).length>0||(Array.isArray(state.decks)&&state.decks.length>0);
      if(adapter&&meaningful){mode="indexeddb";statusNote="共有・JSON復元データからIndexedDBを再作成中";writeMarker(raw,"pending");queueStateSave(raw,!silent);return true;}
      if(!silent&&typeof showErr==="function")showErr("IndexedDB保存データを読み込めません。共有復元または全データJSONを利用してください。");return false;
    }
    return baseSave(silent);
  }catch(e){lastError=String(e&&e.message||e);globalThis.CPT_LAST_SAVE_ERROR={name:String(e&&e.name||"Error"),message:lastError,estimatedBytes:0,at:now()};if(!silent&&typeof showErr==="function")showErr("保存失敗: "+lastError);return false;}
};
loadState=function(silent){
  try{
    const raw=localStorage.getItem(LS_KEY)||"";
    if(raw&&!API.isMarkerRaw(raw))return baseLoad(silent);
    if(cachedRaw){const ok=applyRaw(cachedRaw,{mergeCurrent:false});if(!ok&&!silent&&typeof toast==="function")toast("IndexedDB保存データがありません");return ok;}
    if(!ready&&API.isMarkerRaw(raw))return true;
    if(mode==="recovery-required"){if(!silent&&typeof showErr==="function")showErr("IndexedDB保存データを読み込めません");return false;}
    return baseLoad(silent);
  }catch(e){lastError=String(e&&e.message||e);if(!silent&&typeof showErr==="function")showErr("読込失敗: "+lastError);return false;}
};
if(typeof cptGetBackups==="function")cptGetBackups=function(){return backupCache.map(x=>API.clone(x));};
if(typeof cptSaveBackups==="function")cptSaveBackups=function(arr){
  if(!ready||mode!=="indexeddb")return baseSaveBackups(arr);
  backupCache=API.trimBackups(arr,retention());metrics.backupCount=backupCache.length;metrics.backupBytes=API.backupBytes(backupCache);queueBackupSave(backupCache);try{localStorage.removeItem(LEGACY_BACKUP_KEY);}catch(_){}return true;
};
if(typeof cptLSUsage==="function")cptLSUsage=function(){
  let raw="",bk="";try{raw=localStorage.getItem(LS_KEY)||"";bk=localStorage.getItem(LEGACY_BACKUP_KEY)||"";}catch(_){}
  return{state:API.bytes(raw),backups:API.bytes(bk),indexedState:metrics.stateBytes,indexedBackups:metrics.backupBytes,indexedBackupCount:metrics.backupCount,mode};
};
if(typeof cptCapHTML==="function")cptCapHTML=function(){
  const u=cptLSUsage();if(mode==="indexeddb")return`<span style="color:#6bbf7a">IndexedDB: 本体 ${human(u.indexedState)} / 自動BU ${human(u.indexedBackups)}（${u.indexedBackupCount}件）</span><span class="note" style="font-size:9px"> / localStorageは起動情報 ${human(u.state+u.backups)}のみ</span>`;
  if(mode==="recovery-required")return`<span style="color:#e06a6a">保存領域の復旧確認が必要です</span>`;
  return baseCapHTML();
};
function updatePersistenceStatus(){
  try{if(navigator.storage&&typeof navigator.storage.persisted==="function")navigator.storage.persisted().then(v=>{persisted=!!v;});}catch(_){}
  try{if(navigator.storage&&typeof navigator.storage.estimate==="function")navigator.storage.estimate().then(e=>{metrics.quota=Math.max(0,Number(e&&e.quota)||0);metrics.usage=Math.max(0,Number(e&&e.usage)||0);});}catch(_){}
}
async function requestPersistence(){
  try{if(!navigator.storage||typeof navigator.storage.persist!=="function")throw new Error("このブラウザーは永続化要求に対応していません");persisted=!!(await navigator.storage.persist());statusNote=persisted?"ブラウザーへ保存領域の永続化を許可済み":"永続化は許可されませんでした（IndexedDB保存自体は利用可能）";if(typeof toast==="function")toast(statusNote);return persisted;}catch(e){lastError=String(e&&e.message||e);if(typeof showErr==="function")showErr(lastError);return false;}
}
async function verifyAndSaveNow(){
  if(!adapter){if(typeof toast==="function")toast("IndexedDBが有効ではありません");return false;}
  try{if(mode!=="indexeddb")mode="indexeddb";await saveRecord(serialize());await queueBackupSave(backupCache);if(typeof toast==="function")toast("IndexedDBの保存・再照合が完了しました");return true;}catch(e){lastError=String(e&&e.message||e);if(typeof showErr==="function")showErr("IndexedDB再照合失敗: "+lastError);return false;}
}
function status(){return{version:API.VERSION,protocol:API.PROTOCOL,ready,mode,statusNote,lastError,persisted,retention:retention(),metrics:{...metrics},marker:(()=>{try{return API.safeParse(localStorage.getItem(LS_KEY),null);}catch(_){return null;}})()};}
async function bootstrap(){
  try{
    adapter=globalThis.CPT_V7940_TEST_ADAPTER||await API.openBrowserAdapter(globalThis.indexedDB);
    let rec=await adapter.getState(),rows=await adapter.getBackups();
    const legacyRows=(()=>{const x=API.safeParse(initialBackupRaw,[]);return Array.isArray(x)?x:[];})();
    const plan=API.migrationPlan({legacyStateRaw:initialLocalRaw,legacyBackups:legacyRows,existingStateRecord:rec,existingBackups:rows,retention:retention()});
    if(plan.stateAction==="migrate-legacy"){
      const next=API.makeStateRecord(initialLocalRaw,{appVersion:API.VERSION});await adapter.putState(next);rec=await adapter.getState();if(!API.verifyStateRecord(rec)||rec.raw!==initialLocalRaw)throw new Error("旧保存データのIndexedDB移行照合に失敗しました");metrics.migratedState=true;
    }
    if(plan.backupAction==="migrate-legacy"){
      const next=API.trimBackups(legacyRows,retention());await adapter.replaceBackups(next);rows=await adapter.getBackups();if(API.hash(API.trimBackups(rows,retention()))!==API.hash(next))throw new Error("旧バックアップのIndexedDB移行照合に失敗しました");metrics.migratedBackups=true;
    }
    if(!API.verifyStateRecord(rec)){
      if(API.isMarkerRaw(initialLocalRaw)){mode="recovery-required";statusNote="IndexedDB本体が見つかりません。共有復元またはJSON復元が必要です";ready=true;return status();}
      const current=serialize(),next=API.makeStateRecord(current,{appVersion:API.VERSION});await adapter.putState(next);rec=await adapter.getState();if(!API.verifyStateRecord(rec))throw new Error("初期IndexedDB保存に失敗しました");
    }
    cachedRaw=rec.raw;metrics.stateBytes=rec.bytes;metrics.lastSavedAt=rec.savedAt;
    backupCache=API.trimBackups(rows,retention());metrics.backupCount=backupCache.length;metrics.backupBytes=API.backupBytes(backupCache);
    applyRaw(cachedRaw,{mergeCurrent:true});
    mode="indexeddb";ready=true;statusNote=metrics.migratedState||metrics.migratedBackups?"旧保存データをIndexedDBへ移行・照合済み":"IndexedDBから復元済み";
    writeMarker(cachedRaw,"ready");
    await adapter.replaceBackups(backupCache);await adapter.putMeta({version:API.VERSION,protocol:API.PROTOCOL,migratedAt:now(),stateHash:API.hashText(cachedRaw),stateBytes:metrics.stateBytes,backupCount:metrics.backupCount,backupBytes:metrics.backupBytes});
    updatePersistenceStatus();
    const queued=pendingRaw;pendingRaw="";if(queued&&API.hashText(queued)!==API.hashText(cachedRaw)){const newer=API.newerRaw(queued,cachedRaw);if(newer===queued){cachedRaw=queued;await saveRecord(queued);}}
    try{if(typeof render==="function")render();if(typeof renderLog==="function")renderLog();}catch(_){}
    return status();
  }catch(e){
    lastError=String(e&&e.message||e);ready=true;
    if(initialLocalRaw&&!API.isMarkerRaw(initialLocalRaw)){mode="fallback-localStorage";statusNote="IndexedDBを利用できないため従来保存を維持";try{baseLoad(true);}catch(_){}backupCache=baseGetBackups();}
    else{mode="recovery-required";statusNote="IndexedDB読込失敗。既存データを上書きせず停止";}
    return status();
  }
}
if(baseOpenBackup){openBackup=function(){const r=baseOpenBackup.apply(this,arguments);setTimeout(()=>{try{const body=document.querySelector("#modalRoot .mbody");if(!body||body.querySelector("#v7940StorageStatus"))return;const box=document.createElement("div");box.id="v7940StorageStatus";box.className="note";box.style.cssText="border:1px solid var(--line);border-radius:8px;padding:8px;margin:6px 0";const s=status();box.innerHTML=`<b>保存先: ${s.mode==="indexeddb"?"IndexedDB":"従来保存／要確認"}</b><br>${typeof esc==="function"?esc(s.statusNote):s.statusNote}<br>本体 ${human(s.metrics.stateBytes)} / 自動BU ${human(s.metrics.backupBytes)}（最大${s.retention}件）<div class="row-inline" style="gap:6px;margin-top:6px"><button class="btn sm" id="v7940Verify">IndexedDBを保存・再照合</button><button class="btn sm" id="v7940Persist">保存領域の永続化を要求</button></div>`;body.prepend(box);document.getElementById("v7940Verify").onclick=verifyAndSaveNow;document.getElementById("v7940Persist").onclick=requestPersistence;body.querySelectorAll(".bk-sec").forEach(x=>{if(x.textContent.includes("自動バックアップ"))x.textContent=`自動バックアップ（IndexedDB・最大${retention()}件）`;});}catch(_){}},0);return r;};}
if(baseOpenSettings){openSettings=function(){const r=baseOpenSettings.apply(this,arguments);setTimeout(()=>{try{const body=document.querySelector("#modalRoot .mbody");if(!body||body.querySelector("#v7940Settings"))return;const box=document.createElement("section");box.id="v7940Settings";box.className="spanel";const s=status();box.innerHTML=`<h3>v7.9.40 IndexedDB保存</h3><div class="note">${typeof esc==="function"?esc(s.statusNote):s.statusNote}<br>カード辞書・デッキ・自動バックアップはIndexedDB、localStorageは小さな起動情報だけにします。</div><label>自動バックアップ保持数 <select id="v7940Retention">${[1,2,3,4,5].map(n=>`<option value="${n}"${retention()===n?" selected":""}>${n}件</option>`).join("")}</select></label><div class="row-inline" style="gap:6px"><button class="btn sm" id="v7940VerifySetting">保存・再照合</button><button class="btn sm" id="v7940PersistSetting">永続化を要求</button></div>`;body.appendChild(box);document.getElementById("v7940Retention").onchange=e=>{state.settings.v7940BackupRetention=API.clampRetention(e.target.value);backupCache=API.trimBackups(backupCache,retention());queueBackupSave(backupCache);saveState(true);};document.getElementById("v7940VerifySetting").onclick=verifyAndSaveNow;document.getElementById("v7940PersistSetting").onclick=requestPersistence;}catch(_){}},0);return r;};}
const defaultBase=defaultState;defaultState=function(){const s=defaultBase();s.settings=Object.assign({v7940BackupRetention:API.DEFAULT_RETENTION},s.settings||{});return s;};
try{state.settings=Object.assign({v7940BackupRetention:API.DEFAULT_RETENTION},state.settings||{});}catch(_){}
const readyPromise=bootstrap();
window.addEventListener("pagehide",()=>{try{saveState(true);}catch(_){}},{capture:true});
globalThis.CPT_V7940_CLIENT={version:API.VERSION,protocol:API.PROTOCOL,ready:readyPromise,status,flush:async()=>{if(saveLoop)await saveLoop;if(backupLoop)await backupLoop;return status();},verifyAndSaveNow,requestPersistence,getBackups:()=>backupCache.map(x=>API.clone(x)),diagnose:API.diagnose};
try{document.body.dataset.v7940="indexeddb-storage";document.title="カードゲーム練習卓 v7.9.40 IndexedDB保存";}catch(_){}
})();

/* ===== bundled original HTML script block 48/49 ===== */
"use strict";

(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7941_OPENING=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const VERSION="7.9.41";
  const PROTOCOL="cpt-v7.9.41-serum-mulligan-decision";
  const arr=v=>Array.isArray(v)?v:[];
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const clone=v=>JSON.parse(JSON.stringify(v));
  function shuffled(cards,random){
    const out=arr(cards).map(clone),rnd=typeof random==="function"?random:Math.random;
    for(let i=out.length-1;i>0;i--){
      const j=Math.max(0,Math.min(i,Math.floor(Number(rnd())*(i+1))));
      [out[i],out[j]]=[out[j],out[i]];
    }
    return out;
  }
  function makeState(cards,random){
    const library=shuffled(cards,random),hand=library.splice(0,Math.min(7,library.length));
    return{library,hand,exiled:[],bottom:[],mulliganCount:0,serumPowderCount:0,pendingBottom:0,total:library.length+hand.length,history:["初手7枚を引いた"]};
  }
  function normalMulligan(raw,random){
    const s=clone(raw||{});
    if(num(s.pendingBottom)>0)return{ok:false,reason:"bottomPending",state:s};
    s.library=arr(s.library).concat(arr(s.hand));
    s.hand=[];
    s.library=shuffled(s.library,random);
    s.mulliganCount=Math.max(0,Math.trunc(num(s.mulliganCount)))+1;
    s.bottom=[];
    if(s.library.length<7)return{ok:false,reason:"libraryTooSmall",state:s};
    s.hand=s.library.splice(0,7);
    s.pendingBottom=Math.min(s.mulliganCount,s.hand.length);
    arr(s.history).push(`通常マリガン${s.mulliganCount}回目: 7枚を引き、${s.pendingBottom}枚のボトム選択へ`);
    return{ok:true,state:s,pendingBottom:s.pendingBottom};
  }
  function uniqueIndices(indices){
    return[...new Set(arr(indices).map(x=>Math.trunc(num(x))))];
  }
  function confirmBottom(raw,indices){
    const s=clone(raw||{}),need=Math.max(0,Math.trunc(num(s.pendingBottom))),idx=uniqueIndices(indices);
    if(need<=0)return{ok:false,reason:"bottomNotPending",state:s};
    if(idx.length!==need)return{ok:false,reason:"bottomCountInvalid",state:s};
    if(idx.some(i=>i<0||i>=arr(s.hand).length))return{ok:false,reason:"bottomIndexInvalid",state:s};
    const set=new Set(idx),picked=idx.map(i=>s.hand[i]),kept=s.hand.filter((_,i)=>!set.has(i));
    s.hand=kept;
    s.library=arr(s.library);
    for(const c of picked)s.library.push(c);
    s.bottom=picked;
    s.pendingBottom=0;
    arr(s.history).push(`${picked.length}枚をライブラリー下へ置き、手札${kept.length}枚で次の判断へ`);
    return{ok:true,state:s,picked,kept};
  }
  function useSerumPowder(raw,isSerum){
    const s=clone(raw||{});
    if(num(s.pendingBottom)>0)return{ok:false,reason:"bottomPending",state:s};
    const test=typeof isSerum==="function"?isSerum:c=>String(c&&c.name||"").trim().toLowerCase()==="serum powder"||String(c&&c.name||"").trim()==="血清の粉末";
    if(!arr(s.hand).some(test))return{ok:false,reason:"serumPowderMissing",state:s};
    const n=arr(s.hand).length;
    if(arr(s.library).length<n)return{ok:false,reason:"libraryTooSmall",state:s};
    const ex=arr(s.hand);
    s.exiled=arr(s.exiled).concat(ex);
    s.hand=arr(s.library).splice(0,n);
    s.serumPowderCount=Math.max(0,Math.trunc(num(s.serumPowderCount)))+1;
    arr(s.history).push(`血清の粉末${s.serumPowderCount}回目: 手札${n}枚を追放し${n}枚引いた`);
    return{ok:true,state:s,exiled:ex,drawn:s.hand};
  }
  function decisionModel(raw,isSerum){
    const s=raw||{},pending=Math.max(0,Math.trunc(num(s.pendingBottom))),handCount=arr(s.hand).length,mulls=Math.max(0,Math.trunc(num(s.mulliganCount)));
    const test=typeof isSerum==="function"?isSerum:c=>String(c&&c.name||"").trim().toLowerCase()==="serum powder"||String(c&&c.name||"").trim()==="血清の粉末";
    const hasSerum=arr(s.hand).some(test),canSerum=pending===0&&hasSerum&&arr(s.library).length>=handCount;
    return{stage:pending>0?"bottom":"decision",handCount,mulliganCount:mulls,pendingBottom:pending,nextMulliganCount:mulls+1,hasSerum,canSerum,serumDrawCount:canSerum?handCount:0,keepLabel:`この${handCount}枚をキープ`,mulliganLabel:`通常マリガン（${mulls+1}回目）`,serumLabel:"《血清の粉末》を使用"};
  }
  function totalsOk(s){return arr(s&&s.library).length+arr(s&&s.hand).length+arr(s&&s.exiled).length===Math.max(0,Math.trunc(num(s&&s.total)));}
  function diagnose(){
    const cards=Array.from({length:60},(_,i)=>({id:String(i),name:i===0?"Serum Powder":`C${i}`}));
    const initial=makeState(cards,()=>0.25),m1=normalMulligan(initial,()=>0.75),b1=confirmBottom(m1.state,[0]);
    const withPowder={...b1.state,hand:[{id:"sp",name:"Serum Powder"},...b1.state.hand.slice(1)]};
    const powder=useSerumPowder(withPowder);
    const tests=[
      {name:"first mulligan draws seven",ok:m1.ok&&m1.state.hand.length===7},
      {name:"first mulligan immediately requires one bottom",ok:m1.state.pendingBottom===1},
      {name:"bottom leaves six",ok:b1.ok&&b1.state.hand.length===6&&b1.state.pendingBottom===0},
      {name:"powder after first mulligan exiles six",ok:powder.ok&&powder.exiled.length===6&&powder.state.hand.length===6},
      {name:"powder does not add mulligan",ok:powder.state.mulliganCount===1},
      {name:"decision stage is explicit",ok:decisionModel(b1.state).stage==="decision"},
      {name:"totals remain valid",ok:totalsOk(powder.state)}
    ];
    return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
  }
  return{VERSION,PROTOCOL,makeState,normalMulligan,confirmBottom,useSerumPowder,decisionModel,totalsOk,diagnose};
});

(function(){
  "use strict";
  if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7941_OPENING)return;
  try{
    document.body.dataset.v7941="serum-mulligan-decision-ui";
    document.title="カードゲーム練習卓 v7.9.41 血清の粉末・初手判断UI";
  }catch(_){ }
  globalThis.CPT_V7941_CLIENT={
    version:globalThis.CPT_V7941_OPENING.VERSION,
    protocol:globalThis.CPT_V7941_OPENING.PROTOCOL,
    diagnose:globalThis.CPT_V7941_OPENING.diagnose
  };
})();

/* ===== bundled original HTML script block 49/49 ===== */
/* ============================================================
   v7.9.42 Settings Readability
   - reorganizes the accumulated settings into readable categories
   - adds search, category filters, important-status shortcuts
   - preserves all original controls and event handlers
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7942_SETTINGS=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.42";
const PROTOCOL="cpt-v7.9.42-settings-readability";
const CATEGORIES=[
  {id:"basic",label:"基本",hint:"プレイモードと日常操作"},
  {id:"rules",label:"ゲーム進行・ルール",hint:"ターン、戦闘、土地、優先権"},
  {id:"automation",label:"自動化・補助",hint:"自動処理と各種ウィザード"},
  {id:"display",label:"表示・操作",hint:"盤面、画像、ログ、カード表示"},
  {id:"storage",label:"保存・バックアップ",hint:"自動保存、共有、IndexedDB"},
  {id:"advanced",label:"詳細・高度",hint:"追加エンジンと監査設定"}
];
const normalize=v=>String(v==null?"":v).replace(/\s+/g," ").trim().toLowerCase();
function categoryForText(text,meta={}){
  const t=normalize(text),id=normalize(meta.id),tag=normalize(meta.tag);
  const x=`${id} ${t}`;
  if(/indexeddb|localstorage|保存|バックアップ|共有|復元|永続化/.test(x))return"storage";
  if(/戦闘表示|盤面|カード色|画像|レイアウト|回転|コンパクト|ログ|ショートカット|表示視点|公開設定/.test(x))return"display";
  if(/土地|ソーサリー|タイミング|ターン|フェイズ|優先権|スタック|戦闘|アンタップ|ドロー|マリガン|誘発|置換|軽減|コスト|対象|ルール|ダメージ|ライフ|カウンター/.test(x))return"rules";
  if(/自動|ウィザード|チェックリスト|エンジン|監査|補助|サーチ|コピー|トークン|手札操作|非公開領域|特殊キャスト|ゾーン使用権|ライブラリー|登録効果/.test(x))return"automation";
  if(/プレイモード|1人テスト|基本/.test(x))return"basic";
  if(tag==="details"||/^v\d/.test(t)||/完成版|拡張|高度/.test(x))return"advanced";
  return meta.current||"basic";
}
function matchesQuery(text,query){const q=normalize(query);return !q||normalize(text).includes(q);}
function groupPlan(items){
  let current="basic";
  return (Array.isArray(items)?items:[]).map((item,i)=>{
    const text=String(item&&item.text||""),meta=item&&item.meta||{};
    const blank=!normalize(text);
    const category=blank?current:categoryForText(text,{...meta,current});
    if(!blank)current=category;
    return{index:i,category,text};
  });
}
function diagnose(){
  const tests=[
    {name:"storage category",ok:categoryForText("v7.9.40 IndexedDB保存")==="storage"},
    {name:"land category",ok:categoryForText("土地プレイのタイミング")==="rules"},
    {name:"display category",ok:categoryForText("戦闘表示 / 盤面")==="display"},
    {name:"automation category",ok:categoryForText("解決チェックリストを有効化")==="automation"},
    {name:"basic category",ok:categoryForText("プレイモード")==="basic"},
    {name:"query normalization",ok:matchesQuery("  土地 プレイ  ","土地 プレイ")},
    {name:"blank inherits",ok:groupPlan([{text:"土地"},{text:""}])[1].category==="rules"}
  ];
  return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
}
return{VERSION,PROTOCOL,CATEGORIES,normalize,categoryForText,matchesQuery,groupPlan,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7942_SETTINGS)return;
const API=globalThis.CPT_V7942_SETTINGS;
const categoryMap=Object.fromEntries(API.CATEGORIES.map(x=>[x.id,x]));
function esc42(v){
  if(typeof esc==="function")return esc(String(v==null?"":v));
  return String(v==null?"":v).replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
}
function directChildren(body){return Array.from(body.children).filter(x=>x.id!=="v7942SettingsShell");}
function currentChecked(selector){const x=document.querySelector(selector);return x&&"checked" in x?!!x.checked:null;}
function statusText(selector){const v=currentChecked(selector);return v==null?"確認":""+(v?"ON":"OFF");}
function statusClass(selector){const v=currentChecked(selector);return v==null?"neutral":v?"on":"off";}
function openAndFocus(shell,selector){
  const target=document.querySelector(selector);
  if(!target)return;
  const group=target.closest(".v7942-group");
  if(group){group.hidden=false;group.open=true;}
  const item=target.closest(".v7942-item")||target;
  try{item.scrollIntoView({behavior:"smooth",block:"center"});}catch(_){item.scrollIntoView();}
  setTimeout(()=>{try{target.focus({preventScroll:true});}catch(_){}},180);
}
function importantCards(){
  return[
    {label:"自動保存",selector:'[data-toggle="autosave"]',category:"storage",desc:"変更内容を自動で保存"},
    {label:"土地プレイ制限",selector:'[data-v7938setting="v7938LandTimingGuard"]',category:"rules",desc:"メイン・優先権・空スタック"},
    {label:"手札からの土地経路",selector:'[data-v7939setting="v7939ManualLandPathGuard"]',category:"rules",desc:"手動移動の抜け道を防止"},
    {label:"ソーサリータイミング",selector:'[data-v7936setting="v7936SorceryTimingGuard"]',category:"rules",desc:"呪文・能力の使用時機"},
    {label:"血清の粉末",selector:'[data-v7937setting="v7937SerumAutoMode"]',category:"rules",desc:"初手練習で自動案内"},
    {label:"IndexedDB",selector:'#v7940VerifySetting',category:"storage",desc:"大容量の端末内保存",action:true}
  ];
}
function renderImportant(shell){
  const host=shell.querySelector(".v7942-important-grid");
  if(!host)return;
  host.innerHTML=importantCards().map((x,i)=>{
    const cls=x.action?"neutral":statusClass(x.selector),st=x.action?"開く":statusText(x.selector);
    return`<button type="button" class="v7942-status-card ${cls}" data-v7942-focus="${i}"><span class="v7942-status-head"><b>${esc42(x.label)}</b><span class="v7942-status">${esc42(st)}</span></span><small>${esc42(x.desc)}</small></button>`;
  }).join("");
}
function classifyElement(el,current){
  const text=String(el.textContent||"");
  const tag=String(el.tagName||"").toLowerCase();
  if(!API.normalize(text))return current;
  return API.categoryForText(text,{id:el.id||"",tag,current});
}
function enhanceSettings(){
  const body=document.querySelector("#modalRoot .mbody");
  const modal=body&&body.closest(".modal");
  if(!body||!modal||body.querySelector("#v7942SettingsShell"))return false;
  const title=modal.querySelector(".mhead h2");
  if(!title||!/設定/.test(title.textContent||""))return false;
  title.textContent="設定";
  modal.classList.add("v7942-settings-modal");
  const nodes=directChildren(body);
  const shell=document.createElement("div");
  shell.id="v7942SettingsShell";
  shell.innerHTML=`
    <section class="v7942-overview" aria-label="重要設定">
      <div class="v7942-overview-title"><div><b>重要設定</b><small>よく確認する項目を上にまとめました</small></div><span class="v7942-version">v${API.VERSION}</span></div>
      <div class="v7942-important-grid"></div>
    </section>
    <div class="v7942-toolbar">
      <label class="v7942-search-label"><span>設定を検索</span><div class="v7942-search-row"><input id="v7942Search" type="search" placeholder="例: 土地、保存、戦闘"><button type="button" class="btn sm" id="v7942Clear">クリア</button></div></label>
      <div class="v7942-filter-row" role="group" aria-label="設定カテゴリ"><button type="button" class="btn sm primary" data-v7942-cat="all">すべて</button>${API.CATEGORIES.map(x=>`<button type="button" class="btn sm" data-v7942-cat="${x.id}">${esc42(x.label)}</button>`).join("")}</div>
      <div class="v7942-toolbar-actions"><span id="v7942Result" class="note"></span><button type="button" class="btn sm" id="v7942OpenAll">すべて開く</button><button type="button" class="btn sm" id="v7942CloseAll">すべて閉じる</button></div>
    </div>
    <div class="v7942-groups"></div>`;
  body.appendChild(shell);
  const groupsHost=shell.querySelector(".v7942-groups");
  const groupEls={};
  API.CATEGORIES.forEach((cat,i)=>{
    const d=document.createElement("details");
    d.className="v7942-group";
    d.dataset.category=cat.id;
    d.open=i<2;
    d.innerHTML=`<summary><span><b>${esc42(cat.label)}</b><small>${esc42(cat.hint)}</small></span><span class="v7942-count">0項目</span></summary><div class="v7942-group-body"></div>`;
    groupsHost.appendChild(d);groupEls[cat.id]=d;
  });
  let current="basic";
  for(const el of nodes){
    const category=classifyElement(el,current);current=category;
    el.classList.add("v7942-item");
    el.dataset.v7942Category=category;
    groupEls[category].querySelector(".v7942-group-body").appendChild(el);
  }
  Object.values(groupEls).forEach(g=>{
    const n=g.querySelectorAll(":scope > .v7942-group-body > .v7942-item").length;
    g.querySelector(".v7942-count").textContent=`${n}項目`;
    if(!n)g.hidden=true;
  });
  renderImportant(shell);
  let activeCategory="all";
  const search=shell.querySelector("#v7942Search"),result=shell.querySelector("#v7942Result");
  function applyFilter(){
    const q=search.value||"";let visibleItems=0,visibleGroups=0;
    Object.values(groupEls).forEach(g=>{
      const category=g.dataset.category,catOk=activeCategory==="all"||activeCategory===category;let n=0;
      g.querySelectorAll(":scope > .v7942-group-body > .v7942-item").forEach(item=>{
        const ok=catOk&&API.matchesQuery(item.textContent,q);item.hidden=!ok;if(ok)n++;
      });
      g.hidden=n===0;g.querySelector(".v7942-count").textContent=`${n}項目`;
      if(n){visibleGroups++;visibleItems+=n;if(q)g.open=true;}
    });
    result.textContent=q?`${visibleItems}項目が一致`:`${visibleGroups}カテゴリ / ${visibleItems}項目`;
  }
  search.addEventListener("input",applyFilter);
  shell.querySelector("#v7942Clear").addEventListener("click",()=>{search.value="";search.focus();applyFilter();});
  shell.querySelectorAll("[data-v7942-cat]").forEach(b=>b.addEventListener("click",()=>{
    activeCategory=b.dataset.v7942Cat;
    shell.querySelectorAll("[data-v7942-cat]").forEach(x=>x.classList.toggle("primary",x===b));
    applyFilter();
  }));
  shell.querySelector("#v7942OpenAll").addEventListener("click",()=>Object.values(groupEls).forEach(g=>{if(!g.hidden)g.open=true;}));
  shell.querySelector("#v7942CloseAll").addEventListener("click",()=>Object.values(groupEls).forEach(g=>g.open=false));
  shell.addEventListener("click",e=>{
    const b=e.target.closest("[data-v7942-focus]");if(!b)return;
    const spec=importantCards()[Number(b.dataset.v7942Focus)];if(!spec)return;
    const catBtn=shell.querySelector(`[data-v7942-cat="${spec.category}"]`);if(catBtn)catBtn.click();
    openAndFocus(shell,spec.selector);
  });
  body.addEventListener("change",()=>setTimeout(()=>renderImportant(shell),0));
  applyFilter();
  return true;
}
const oldOpenSettings=typeof openSettings==="function"?openSettings:null;
if(oldOpenSettings){
  openSettings=function(){
    const r=oldOpenSettings.apply(this,arguments);
    setTimeout(()=>{try{enhanceSettings();}catch(e){console.error("v7.9.42 settings enhancement failed",e);}},30);
    return r;
  };
}
const css=document.createElement("style");
css.textContent=`
.v7942-settings-modal{max-width:1120px;height:min(920px,94dvh);display:flex;flex-direction:column;overflow:hidden}
.v7942-settings-modal .mhead,.v7942-settings-modal .mfoot{flex:0 0 auto}
.v7942-settings-modal .mbody{flex:1 1 auto;min-height:0;max-height:none;padding:12px;gap:0;background:var(--bg)}
#v7942SettingsShell{display:flex;flex-direction:column;gap:12px}
.v7942-overview{border:1px solid var(--line2);border-radius:12px;background:var(--panel);padding:12px}
.v7942-overview-title{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:9px}.v7942-overview-title>div{display:grid;gap:2px}.v7942-overview-title small,.v7942-group summary small,.v7942-status-card small{color:var(--muted);font-size:11px}.v7942-version{font-size:11px;color:var(--accent);border:1px solid var(--line);border-radius:999px;padding:3px 8px;white-space:nowrap}
.v7942-important-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.v7942-status-card{appearance:none;text-align:left;border:1px solid var(--line);border-radius:9px;background:var(--bg2);color:var(--text);padding:9px 10px;display:grid;gap:4px;cursor:pointer;min-height:58px}.v7942-status-card:hover{border-color:var(--accent)}.v7942-status-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.v7942-status{font-size:10px;border-radius:999px;padding:2px 7px;background:rgba(128,128,128,.16)}.v7942-status-card.on .v7942-status{color:#8ee29a;background:rgba(80,180,100,.15)}.v7942-status-card.off .v7942-status{color:#ffb0a8;background:rgba(210,80,70,.14)}
.v7942-toolbar{position:sticky;top:-12px;z-index:5;display:grid;gap:8px;padding:10px 0 9px;background:linear-gradient(var(--bg) 85%,transparent)}.v7942-search-label{display:grid;gap:5px;font-weight:700}.v7942-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}.v7942-search-row input{width:100%;min-width:0;padding:9px 11px;border:1px solid var(--line2);border-radius:9px;background:var(--panel);color:var(--text);font-size:14px}.v7942-filter-row,.v7942-toolbar-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.v7942-toolbar-actions{justify-content:flex-end}.v7942-toolbar-actions .note{margin-right:auto}
.v7942-groups{display:grid;gap:9px;padding-bottom:8px}.v7942-group{border:1px solid var(--line2);border-radius:11px;background:var(--panel);overflow:hidden}.v7942-group>summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 12px;background:var(--bg2)}.v7942-group>summary::-webkit-details-marker{display:none}.v7942-group>summary>span:first-child{display:grid;gap:2px}.v7942-group[open]>summary{border-bottom:1px solid var(--line)}.v7942-count{font-size:11px;color:var(--muted);white-space:nowrap}.v7942-group-body{display:grid;gap:7px;padding:10px}.v7942-item{margin:0!important}.v7942-group-body>label,.v7942-group-body>.field{border:1px solid var(--line);border-radius:8px;background:var(--bg2);padding:8px 9px}.v7942-group-body>.note{padding:7px 9px;border-radius:7px;background:rgba(128,128,128,.06)}.v7942-group-body>details,.v7942-group-body>.spanel,.v7942-group-body>section{border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--bg2)}.v7942-group-body h3{font-size:14px;margin:0 0 7px}.v7942-item[hidden],.v7942-group[hidden]{display:none!important}
@media(max-width:760px){.v7942-settings-modal{width:100vw;height:100dvh;max-height:none;border-radius:0}.v7942-settings-modal .mbody{padding:8px}.v7942-important-grid{grid-template-columns:1fr 1fr}.v7942-filter-row{flex-wrap:nowrap;overflow-x:auto;padding-bottom:3px}.v7942-filter-row .btn{flex:0 0 auto}.v7942-toolbar-actions{justify-content:flex-start}.v7942-toolbar-actions .note{width:100%;margin:0}.v7942-status-card{min-height:64px}}
@media(max-width:430px){.v7942-important-grid{grid-template-columns:1fr}.v7942-search-row{grid-template-columns:1fr}.v7942-search-row .btn{width:100%}}
`;
document.head.appendChild(css);
try{document.body.dataset.v7942="settings-readability";document.title="カードゲーム練習卓 v7.9.42 見やすい設定画面";}catch(_){ }
globalThis.CPT_V7942_CLIENT={version:API.VERSION,protocol:API.PROTOCOL,enhanceSettings,diagnose:API.diagnose};
})();


/* ============================================================
   v7.9.43 Land / Sorcery Settings Visibility Fix
   - adds always-visible quick controls for land and sorcery timing
   - absorbs settings sections that are appended after v7.9.42 grouped them
   - retries enhancement so slower browsers cannot lose late settings
   - keeps original detailed settings and quick controls synchronized
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7943_SETTINGS_FIX=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.43";
const PROTOCOL="cpt-v7.9.43-land-settings-visibility-fix";
const SPECS=Object.freeze([
  Object.freeze({key:"v7935LandPlayGuard",label:"1ターンの土地プレイ可能回数を厳格に制限",group:"land",sourceAttr:"v7935setting"}),
  Object.freeze({key:"v7938LandTimingGuard",label:"土地は自分のメインフェイズ・優先権あり・スタック空のときだけプレイ",group:"land",sourceAttr:"v7938setting"}),
  Object.freeze({key:"v7939ManualLandPathGuard",label:"手札から土地エリアへ置く全操作を通常の土地プレイとして判定",group:"land",sourceAttr:"v7939setting"}),
  Object.freeze({key:"v7936SorceryTimingGuard",label:"ソーサリータイミング限定の呪文・能力を厳格に制限",group:"sorcery",sourceAttr:"v7936setting"})
]);
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function normalizeSettings(raw={}){
  const out=raw&&typeof raw==="object"&&!Array.isArray(raw)?clone(raw):{};
  for(const spec of SPECS)if(typeof out[spec.key]!=="boolean")out[spec.key]=true;
  return out;
}
function enabledCount(raw={}){const s=normalizeSettings(raw);return SPECS.reduce((n,x)=>n+(s[x.key]!==false?1:0),0);}
function settingKeyFromDataset(raw={}){
  const d=raw&&typeof raw==="object"?raw:{};
  const candidates=[d.v7943Setting,d.v7935setting,d.v7936setting,d.v7938setting,d.v7939setting];
  return candidates.find(k=>SPECS.some(x=>x.key===k))||"";
}
function categoryForLateText(text){
  const x=String(text||"");
  if(/土地|ソーサリー|タイミング|優先権|スタック|フェイズ|ターン/.test(x))return"rules";
  if(/IndexedDB|保存|バックアップ|復元|容量/.test(x))return"storage";
  if(/表示|画像|拡大|操作|ドラッグ|ログ/.test(x))return"display";
  if(/自動|補助|解析|監査|誘発|置換/.test(x))return"automation";
  if(/詳細|高度|開発|診断/.test(x))return"advanced";
  return"basic";
}
function panelModel(raw={}){
  const s=normalizeSettings(raw);
  return{
    enabled:enabledCount(s),
    total:SPECS.length,
    land:SPECS.filter(x=>x.group==="land").map(x=>({...x,checked:s[x.key]!==false})),
    sorcery:SPECS.filter(x=>x.group==="sorcery").map(x=>({...x,checked:s[x.key]!==false}))
  };
}
function diagnose(){
  const normalized=normalizeSettings({v7938LandTimingGuard:false});
  const tests=[
    {name:"version",ok:VERSION==="7.9.43"},
    {name:"four quick settings",ok:SPECS.length===4},
    {name:"defaults enabled",ok:enabledCount({})===4},
    {name:"explicit false preserved",ok:normalized.v7938LandTimingGuard===false},
    {name:"other defaults restored",ok:normalized.v7939ManualLandPathGuard===true},
    {name:"legacy dataset resolved",ok:settingKeyFromDataset({v7938setting:"v7938LandTimingGuard"})==="v7938LandTimingGuard"},
    {name:"quick dataset resolved",ok:settingKeyFromDataset({v7943Setting:"v7936SorceryTimingGuard"})==="v7936SorceryTimingGuard"},
    {name:"land classified as rules",ok:categoryForLateText("土地プレイのタイミング")==="rules"},
    {name:"storage classified",ok:categoryForLateText("IndexedDB保存")==="storage"}
  ];
  return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
}
return{VERSION,PROTOCOL,SPECS,clone,normalizeSettings,enabledCount,settingKeyFromDataset,categoryForLateText,panelModel,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7943_SETTINGS_FIX)return;
if(typeof openSettings!=="function"||typeof state!=="object")return;
const API=globalThis.CPT_V7943_SETTINGS_FIX;
let observer=null,observedBody=null,scheduled=false;
function esc43(v){
  if(typeof esc==="function")return esc(String(v==null?"":v));
  return String(v==null?"":v).replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
}
function ensureDefaults(){state.settings=API.normalizeSettings(state.settings||{});}
function keyFromInput(input){return API.settingKeyFromDataset(input&&input.dataset||{});}
function selectorFor(key){return `input[data-v7943-setting="${key}"],input[data-v7935setting="${key}"],input[data-v7936setting="${key}"],input[data-v7938setting="${key}"],input[data-v7939setting="${key}"]`;}
function syncInputs(key,value,except){
  document.querySelectorAll(selectorFor(key)).forEach(x=>{if(x!==except)x.checked=!!value;});
}
function saveOne(key,value,source){
  if(!API.SPECS.some(x=>x.key===key))return false;
  ensureDefaults();state.settings[key]=!!value;syncInputs(key,!!value,source);
  try{if(typeof saveState==="function")saveState(true);}catch(_){}
  updatePanelStatus();return true;
}
function panelHTML(){
  const m=API.panelModel(state.settings||{});
  const rows=arr=>arr.map(x=>`<label class="v7943-rule-row"><input type="checkbox" data-v7943-setting="${esc43(x.key)}"${x.checked?" checked":""}><span>${esc43(x.label)}</span><b class="v7943-inline-state">${x.checked?"ON":"OFF"}</b></label>`).join("");
  return`<div class="v7943-rule-head"><div><b>土地・ソーサリーの使用タイミング</b><small>MTGの通常ルールに合わせる場合は、すべてONにしてください</small></div><span class="v7943-rule-summary">${m.enabled}/${m.total} ON</span></div><div class="v7943-rule-grid"><div><h4>土地プレイ</h4>${rows(m.land)}<div class="note">フェッチランドや呪文・能力によって土地を「戦場に出す」処理は、土地のプレイではないため制限しません。</div></div><div><h4>ソーサリータイミング</h4>${rows(m.sorcery)}<div class="note">自分の第1・第2メインフェイズ、優先権あり、スタックが空のときだけ許可します。</div></div></div>`;
}
function updatePanelStatus(){
  const panel=document.querySelector("#v7943RuleSettings");if(!panel)return;
  const m=API.panelModel(state.settings||{}),badge=panel.querySelector(".v7943-rule-summary");if(badge)badge.textContent=`${m.enabled}/${m.total} ON`;
  panel.querySelectorAll("input[data-v7943-setting]").forEach(x=>{const key=x.dataset.v7943Setting;x.checked=state.settings[key]!==false;const b=x.closest("label")&&x.closest("label").querySelector(".v7943-inline-state");if(b)b.textContent=x.checked?"ON":"OFF";});
}
function ensurePanel(){
  ensureDefaults();
  const body=document.querySelector("#modalRoot .mbody"),modal=body&&body.closest(".modal"),title=modal&&modal.querySelector(".mhead h2");
  if(!body||!modal||!title||!/設定/.test(title.textContent||""))return false;
  try{if(globalThis.CPT_V7942_CLIENT&&typeof CPT_V7942_CLIENT.enhanceSettings==="function")CPT_V7942_CLIENT.enhanceSettings();}catch(_){}
  let panel=body.querySelector("#v7943RuleSettings");
  if(!panel){
    panel=document.createElement("section");panel.id="v7943RuleSettings";panel.className="v7943-rule-settings";panel.innerHTML=panelHTML();
    const overview=body.querySelector("#v7942SettingsShell .v7942-overview");
    if(overview){const grid=overview.querySelector(".v7942-important-grid");overview.insertBefore(panel,grid||null);}
    else body.prepend(panel);
    panel.addEventListener("change",e=>{const x=e.target.closest("input[data-v7943-setting]");if(!x)return;saveOne(x.dataset.v7943Setting,x.checked,x);});
  }else updatePanelStatus();
  absorbLateNodes(body);
  watchBody(body);
  return true;
}
function targetGroup(shell,category){return shell.querySelector(`.v7942-group[data-category="${category}"] .v7942-group-body`)||shell.querySelector('.v7942-group[data-category="basic"] .v7942-group-body');}
function updateGroupCounts(shell){
  shell.querySelectorAll(".v7942-group").forEach(g=>{const n=g.querySelectorAll(":scope > .v7942-group-body > .v7942-item").length,c=g.querySelector(".v7942-count");if(c)c.textContent=`${n}項目`;g.hidden=n===0;});
}
function absorbLateNodes(body){
  const shell=body.querySelector("#v7942SettingsShell");if(!shell)return false;
  let moved=0;
  Array.from(body.children).forEach(el=>{
    if(el===shell||el.id==="v7943RuleSettings")return;
    const text=String(el.textContent||"");
    const cat=globalThis.CPT_V7942_SETTINGS&&typeof CPT_V7942_SETTINGS.categoryForText==="function"?CPT_V7942_SETTINGS.categoryForText(text,{id:el.id||"",tag:String(el.tagName||"").toLowerCase(),current:"basic"}):API.categoryForLateText(text);
    const host=targetGroup(shell,cat);if(!host)return;
    el.classList.add("v7942-item");el.dataset.v7942Category=cat;host.appendChild(el);moved++;
  });
  if(moved)updateGroupCounts(shell);
  return moved>0;
}
function scheduleEnsure(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;try{ensurePanel();}catch(e){console.error("v7.9.43 settings fix failed",e);}},0);}
function watchBody(body){
  if(observedBody===body&&observer)return;
  if(observer)try{observer.disconnect();}catch(_){}
  observedBody=body;
  if(typeof MutationObserver!=="function")return;
  observer=new MutationObserver(mutations=>{if(mutations.some(m=>m.addedNodes&&m.addedNodes.length))scheduleEnsure();});
  observer.observe(body,{childList:true});
  body.addEventListener("change",e=>{const x=e.target.closest("input");if(!x)return;const key=keyFromInput(x);if(key)saveOne(key,x.checked,x);});
}
const oldOpenSettings=openSettings;
openSettings=function(){
  const r=oldOpenSettings.apply(this,arguments);
  [0,25,80,180,400].forEach(ms=>setTimeout(()=>{try{ensurePanel();}catch(e){console.error("v7.9.43 settings retry failed",e);}},ms));
  return r;
};
const css=document.createElement("style");
css.textContent=`
.v7943-rule-settings{border:1px solid var(--accent);border-radius:10px;background:var(--accent-soft,rgba(90,130,210,.09));padding:10px;margin:10px 0;display:grid;gap:9px}
.v7943-rule-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.v7943-rule-head>div{display:grid;gap:2px}.v7943-rule-head small{color:var(--muted);font-size:11px}.v7943-rule-summary{border:1px solid var(--line);border-radius:999px;padding:3px 8px;white-space:nowrap;font-size:11px;color:var(--accent)}
.v7943-rule-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.v7943-rule-grid>div{display:grid;gap:6px;border:1px solid var(--line);border-radius:8px;background:var(--bg2);padding:8px}.v7943-rule-grid h4{margin:0;font-size:13px}
.v7943-rule-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:start;border:1px solid var(--line);border-radius:7px;padding:7px;background:var(--panel)}.v7943-rule-row input{margin-top:2px}.v7943-inline-state{font-size:10px;color:var(--accent);font-weight:700}
@media(max-width:760px){.v7943-rule-grid{grid-template-columns:1fr}.v7943-rule-head{align-items:center}}
`;
document.head.appendChild(css);
ensureDefaults();
try{document.body.dataset.v7943="land-settings-visibility-fix";document.title="カードゲーム練習卓 v7.9.43 土地設定表示修正";}catch(_){}
globalThis.CPT_V7943_CLIENT={version:API.VERSION,protocol:API.PROTOCOL,ensurePanel,absorbLateNodes,status:()=>API.panelModel(state.settings||{}),diagnose:API.diagnose};
})();




/* ============================================================
   v7.9.44 Authoritative Land Commit Guard
   - every ordinary hand -> land-zone commit is checked at the final
     movement boundary, not only at UI buttons
   - own main phase, priority, empty stack, and land-play count are
     enforced through one decision function
   - effects that put a land onto the battlefield remain exempt when
     they use the existing transactional/effect move path (skipUndo)
   - legacy land-guard settings are re-enabled after persisted state is
     restored so an older OFF value cannot silently bypass the rule
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7944_LAND_COMMIT=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.44";
const PROTOCOL="cpt-v7.9.44-land-commit-guard";
const MAIN_PHASES=new Set([3,9]);
const str=v=>String(v==null?"":v);
function strictEnabled(settings={}){return settings.v7944StrictLandRules!==false;}
function isOrdinaryHandToLandMove(raw={}){
  return str(raw.fromZone)==="hand"&&str(raw.destZone)==="lands"&&raw.effectMove!==true&&raw.skipUndo!==true;
}
function decision(raw={}){
  const actor=str(raw.actorRole||raw.player);
  const active=str(raw.activeRole||raw.active);
  const priority=str(raw.priorityRole||raw.priority);
  const phase=Number(raw.phase);
  const stackDepth=Array.isArray(raw.stack)?raw.stack.length:Math.max(0,Math.trunc(Number(raw.stackDepth)||0));
  const used=Math.max(0,Math.trunc(Number(raw.used)||0));
  const limit=Math.max(0,Math.trunc(Number(raw.limit)||0));
  const countsAsLandPlay=raw.countsAsLandPlay!==false;
  const timingOverride=raw.timingOverride===true;
  const reasons=[];
  if(!timingOverride){
    if(!actor||actor!==active)reasons.push("activePlayerRequired");
    if(!MAIN_PHASES.has(phase))reasons.push("mainPhaseRequired");
    if(stackDepth!==0)reasons.push("emptyStackRequired");
    if(!actor||actor!==priority)reasons.push("priorityRequired");
  }
  if(countsAsLandPlay&&used>=limit)reasons.push("landPlayLimitReached");
  return{ok:reasons.length===0,reasons,actor,active,priority,phase,stackDepth,used,limit,countsAsLandPlay,timingOverride};
}
function reasonText(reason){return({
  activePlayerRequired:"土地は自分のターンにしかプレイできません",
  mainPhaseRequired:"土地は第1または第2メインフェイズにしかプレイできません",
  emptyStackRequired:"スタックに呪文や能力がある間は土地をプレイできません",
  priorityRequired:"自分が優先権を持っているときだけ土地をプレイできます",
  landPlayLimitReached:"このターンの土地プレイ可能回数を使い切っています"
})[reason]||str(reason);}
function diagnose(){
  const base={actorRole:"A",activeRole:"A",priorityRole:"A",phase:3,stackDepth:0,used:0,limit:1};
  const tests=[
    {name:"first main legal",ok:decision(base).ok},
    {name:"second main legal",ok:decision({...base,phase:9}).ok},
    {name:"combat blocked",ok:decision({...base,phase:5}).reasons.includes("mainPhaseRequired")},
    {name:"opponent turn blocked",ok:decision({...base,activeRole:"B"}).reasons.includes("activePlayerRequired")},
    {name:"priority blocked",ok:decision({...base,priorityRole:"B"}).reasons.includes("priorityRequired")},
    {name:"stack blocked",ok:decision({...base,stackDepth:1}).reasons.includes("emptyStackRequired")},
    {name:"second land blocked",ok:decision({...base,used:1}).reasons.includes("landPlayLimitReached")},
    {name:"additional right works",ok:decision({...base,used:1,limit:2}).ok},
    {name:"effect move exempt classifier",ok:!isOrdinaryHandToLandMove({fromZone:"hand",destZone:"lands",skipUndo:true})},
    {name:"ordinary manual move classified",ok:isOrdinaryHandToLandMove({fromZone:"hand",destZone:"lands"})},
    {name:"legacy missing defaults strict",ok:strictEnabled({})},
  ];
  return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
}
return{VERSION,PROTOCOL,MAIN_PHASES,strictEnabled,isOrdinaryHandToLandMove,decision,reasonText,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7944_LAND_COMMIT)return;
if(typeof state!=="object"||typeof findCard!=="function"||typeof moveCard!=="function")return;
const API=globalThis.CPT_V7944_LAND_COMMIT;
let bypassDepth=0;
function clone(v){try{return v==null?v:JSON.parse(JSON.stringify(v));}catch(_){return v;}}
function now(){try{return typeof nowISO==="function"?nowISO():new Date().toISOString();}catch(_){return new Date().toISOString();}}
function settings(){if(!state.settings||typeof state.settings!=="object")state.settings={};return state.settings;}
function enforceLegacyFlags(){
  const s=settings();
  if(typeof s.v7944StrictLandRules!=="boolean")s.v7944StrictLandRules=true;
  if(s.v7944StrictLandRules!==false){s.v7935LandPlayGuard=true;s.v7938LandTimingGuard=true;s.v7939ManualLandPathGuard=true;}
  return s.v7944StrictLandRules!==false;
}
function runtime(){
  if(!state.v7944||typeof state.v7944!=="object"||Array.isArray(state.v7944))state.v7944={blocks:[],commits:[],effectMoves:[]};
  for(const k of["blocks","commits","effectMoves"])if(!Array.isArray(state.v7944[k]))state.v7944[k]=[];
  return state.v7944;
}
function record(kind,detail){const r=runtime(),row={at:now(),kind,...clone(detail||{})},a=kind==="blocked"?r.blocks:kind==="effectMove"?r.effectMoves:r.commits;a.unshift(row);if(a.length>200)a.length=200;return row;}
function playerOf(f,destPlayer){if(destPlayer==="A"||destPlayer==="B")return destPlayer;if(f&&f.player)return f.player;const c=f&&f.card;return c&&((c.controller==="B"||c.owner==="B")?"B":"A")||"A";}
function usedOf(p){try{return typeof _landPlayed==="function"?Number(_landPlayed(p))||0:Number(state.turn&&state.turn.landPlaysUsed&&state.turn.landPlaysUsed[p])||0;}catch(_){return 0;}}
function limitOf(p){try{if(typeof v45LandLimit==="function")return Math.max(0,Number(v45LandLimit(p))||0);if(typeof _landPlayLimit==="function")return Math.max(0,Number(_landPlayLimit())||0);}catch(_){}return 1;}
function increment(p){
  try{if(typeof _landPlayMap==="function"){const m=_landPlayMap();m[p]=usedOf(p)+1;return m[p];}}
  catch(_){}
  if(!state.turn)state.turn={};if(!state.turn.landPlaysUsed)state.turn.landPlaysUsed={A:0,B:0};state.turn.landPlaysUsed[p]=usedOf(p)+1;return state.turn.landPlaysUsed[p];
}
function snapshot(p,extra={}){const t=state.turn||{};return API.decision({actorRole:p,activeRole:t.active,priorityRole:t.priority,phase:t.phase,stack:state.stack||[],used:usedOf(p),limit:limitOf(p),...extra});}
function showBlock(id,p,q,path){
  const f=findCard(id),name=f&&f.card?f.card.name:"土地",reasons=q.reasons.map(API.reasonText);
  record("blocked",{cardId:String(id||""),name,player:p,path:path||"",reasons:q.reasons,phase:q.phase,active:q.active,priority:q.priority,stackDepth:q.stackDepth,used:q.used,limit:q.limit});
  const items=reasons.map(x=>`<li>${typeof esc==="function"?esc(x):x}</li>`).join("");
  const body=`<div class="oh-warn"><b>${typeof esc==="function"?esc(name):name}</b> は土地としてプレイできません。</div><ul class="v7944-reasons">${items}</ul><div class="pvrow">土地プレイ <b>${q.used}/${q.limit}</b> ／ フェイズ ${q.phase} ／ 優先権 ${typeof esc==="function"?esc(q.priority||"なし"):q.priority||"なし"} ／ スタック ${q.stackDepth}</div><div class="note">フェッチランドや呪文・能力で土地を戦場に出す場合は、「効果で土地を戦場に出す」または効果処理を使用してください。</div>`;
  try{openModal("土地プレイを停止しました",body,'<button class="btn primary" data-app="closem">閉じる</button>');}
  catch(_){try{toast(reasons.join(" / "));}catch(__){}}
  return false;
}
function strict(){return enforceLegacyFlags();}
function withEffectMove(fn){bypassDepth++;try{return fn();}finally{bypassDepth=Math.max(0,bypassDepth-1);}}
const rawMove=moveCard;
function commitRawHandMove(id,destPlayer,destZone,pos,skipUndo){
  const f=findCard(id);if(!f)return rawMove.apply(this,arguments);
  const p=playerOf(f,destPlayer),q=snapshot(p,{countsAsLandPlay:true});
  if(!q.ok)return showBlock(id,p,q,"moveCard-final-boundary");
  const moved=withEffectMove(()=>rawMove.call(this,id,p,destZone,pos,skipUndo));
  if(!moved)return moved;
  const after=increment(p);record("commit",{cardId:String(id),name:moved.name||f.card.name,player:p,path:"moveCard-final-boundary",used:after,limit:q.limit});
  return moved;
}
moveCard=function(id,destPlayer,destZone,pos,skipUndo){
  const f=findCard(id);
  const effectMove=bypassDepth>0||skipUndo===true;
  if(strict()&&f&&API.isOrdinaryHandToLandMove({fromZone:f.zone,destZone,effectMove,skipUndo}))return commitRawHandMove.call(this,id,destPlayer,destZone,pos,skipUndo);
  if(f&&f.zone==="hand"&&destZone==="lands"&&effectMove)record("effectMove",{cardId:String(id),name:f.card&&f.card.name||"",player:playerOf(f,destPlayer),path:skipUndo===true?"transactional-effect":"explicit-effect"});
  return rawMove.apply(this,arguments);
};

/* Final preflight for the normal land-play engine. Existing engines perform
   the actual movement and count increment; this wrapper prevents both timing
   and count bypasses even if older persisted switches were OFF. */
if(typeof v45MoveLandToBattlefield==="function"){
  const baseV45=v45MoveLandToBattlefield;
  v45MoveLandToBattlefield=function(id,player,permission,fromHand){
    if(strict()){
      const counts=!permission||permission.countsAsLandPlay!==false;
      const q=snapshot(player,{countsAsLandPlay:counts,timingOverride:!!(permission&&permission.timingOverride===true)});
      if(!q.ok)return showBlock(id,player,q,"v45-final-preflight");
    }
    return baseV45.apply(this,arguments);
  };
}
if(typeof _playLandFromHandFlow==="function"&&typeof v45MoveLandToBattlefield==="function"){
  _playLandFromHandFlow=function(id){
    enforceLegacyFlags();const f=findCard(id);if(!f||f.zone!=="hand")return false;
    const isLand=typeof v45IsLand==="function"?v45IsLand(f.card):(typeof cardHasType==="function"?cardHasType(f.card,"Land"):true);
    if(!isLand)return false;return v45MoveLandToBattlefield(id,f.player||f.card.owner,null,true);
  };
}

/* Re-enable the legacy capture guard before menus open. This matters after
   IndexedDB restores an older state whose old diagnostic switches were OFF. */
for(const name of["openCardMenu","openUnknownPlayMenu","smartStandardAction"]){
  if(typeof globalThis[name]!=="function")continue;
  const base=globalThis[name];globalThis[name]=function(){enforceLegacyFlags();return base.apply(this,arguments);};
}
if(typeof render==="function"){const base=render;render=function(){enforceLegacyFlags();return base.apply(this,arguments);};}
if(typeof loadState==="function"){const base=loadState;loadState=function(){const r=base.apply(this,arguments);enforceLegacyFlags();return r;};}

/* Explicitly expose a bypass for future effect engines. Existing transactional
   effect paths already pass skipUndo=true and are therefore exempt. */
function addSettings(){
  const body=document.querySelector("#modalRoot .mbody");if(!body||body.querySelector("#v7944StrictLandPanel"))return;
  const modal=body.closest(".modal"),title=modal&&modal.querySelector(".mhead h2");if(!title||!/設定/.test(title.textContent||""))return;
  const box=document.createElement("section");box.id="v7944StrictLandPanel";box.className="v7944-strict-panel";
  box.innerHTML=`<div><b>土地プレイ最終ガード</b><span class="viz-badge">v7.9.44</span></div><label><input type="checkbox" id="v7944StrictLandRules"${strict()?" checked":""}> MTG標準の土地プレイルールを最終移動地点で強制する（推奨）</label><div class="note">ONでは、手札→土地エリアの全経路を、自分のメイン・優先権・空スタック・残り回数で判定します。効果による配置は除外します。</div>`;
  const target=body.querySelector("#v7943RuleSettings")||body.firstElementChild;target?target.insertAdjacentElement("afterend",box):body.prepend(box);
  box.addEventListener("change",e=>{if(e.target.id!=="v7944StrictLandRules")return;settings().v7944StrictLandRules=e.target.checked;if(e.target.checked)enforceLegacyFlags();try{saveState(true);}catch(_){};});
}
if(typeof openSettings==="function"){const base=openSettings;openSettings=function(){const r=base.apply(this,arguments);[0,30,100,300].forEach(ms=>setTimeout(addSettings,ms));return r;};}
const style=document.createElement("style");style.textContent="#v7944StrictLandPanel{display:grid;gap:7px;border:1px solid var(--accent);border-radius:10px;padding:10px;margin:8px 0;background:rgba(80,130,210,.08)}#v7944StrictLandPanel>div:first-child{display:flex;justify-content:space-between;gap:8px}.v7944-reasons{margin:10px 0 10px 22px;display:grid;gap:5px}";document.head.appendChild(style);
const defaultBase=typeof defaultState==="function"?defaultState:null;
if(defaultBase){defaultState=function(){const s=defaultBase();s.settings=Object.assign({v7944StrictLandRules:true,v7935LandPlayGuard:true,v7938LandTimingGuard:true,v7939ManualLandPathGuard:true},s.settings||{});s.v7944={blocks:[],commits:[],effectMoves:[]};return s;};}
[0,50,200,800,1600].forEach(ms=>setTimeout(enforceLegacyFlags,ms));
enforceLegacyFlags();runtime();
globalThis.CPT_V7944_CLIENT={version:API.VERSION,protocol:API.PROTOCOL,strictEnabled:strict,enforceLegacyFlags,decisionFor:(p,x)=>snapshot(p,x||{}),withEffectMove,rawMove,commitRawHandMove,runtime,diagnose:API.diagnose};
try{document.body.dataset.v7944="authoritative-land-commit-guard";document.title="カードゲーム練習卓 v7.9.44 土地プレイ最終ガード";}catch(_){}
})();



/* ============================================================
   v7.9.45 Core Land Play + Simple Trigger Resolution Flow
   - ordinary land plays are committed by one authoritative function
     instead of relying on menu interception or optional diagnostics
   - hand/card-menu/unknown-card/standard-action routes can all call
     the same function; effects that put lands onto the battlefield
     remain a separate explicit path
   - simple registered trigger effects are chained through resolution
   - scry/surveil 1 use a compact two-choice top-card dialog
   - legacy checklist-only scry/surveil/mill entries are inferred so
     existing cards normally do not need to be re-registered
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7945_CORE=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.45";
const PROTOCOL="cpt-v7.9.45-land-core-simple-trigger";
const MAIN_PHASES=new Set([3,9]);
const jpDigits={"０":"0","１":"1","２":"2","３":"3","４":"4","５":"5","６":"6","７":"7","８":"8","９":"9"};
const jpNums={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
const str=v=>String(v==null?"":v);
function numberOf(v,def=1){
  const s=str(v).replace(/[０-９]/g,c=>jpDigits[c]||c).trim();
  if(/^\d+$/.test(s))return Math.max(0,Number(s));
  if(jpNums[s]!=null)return jpNums[s];
  if(/^十[一二三四五六七八九]$/.test(s))return 10+jpNums[s[1]];
  if(/^[二三四五六七八九]十$/.test(s))return jpNums[s[0]]*10;
  return def;
}
function landDecision(raw={}){
  const actor=str(raw.actorRole||raw.player),active=str(raw.activeRole||raw.active),priority=str(raw.priorityRole||raw.priority);
  const phase=Number(raw.phase),stackDepth=Array.isArray(raw.stack)?raw.stack.length:Math.max(0,Math.trunc(Number(raw.stackDepth)||0));
  const used=Math.max(0,Math.trunc(Number(raw.used)||0)),limit=Math.max(0,Math.trunc(Number(raw.limit)||0));
  const timingOverride=raw.timingOverride===true,countsAsLandPlay=raw.countsAsLandPlay!==false,reasons=[];
  if(!timingOverride){
    if(!actor||actor!==active)reasons.push("activePlayerRequired");
    if(!MAIN_PHASES.has(phase))reasons.push("mainPhaseRequired");
    if(stackDepth!==0)reasons.push("emptyStackRequired");
    if(!actor||actor!==priority)reasons.push("priorityRequired");
  }
  if(countsAsLandPlay&&used>=limit)reasons.push("landPlayLimitReached");
  return{ok:reasons.length===0,reasons,actor,active,priority,phase,stackDepth,used,limit,timingOverride,countsAsLandPlay};
}
function reasonText(x){return({
  activePlayerRequired:"土地は自分のターンにしかプレイできません",
  mainPhaseRequired:"土地は第1または第2メインフェイズにしかプレイできません",
  emptyStackRequired:"スタックに呪文や能力がある間は土地をプレイできません",
  priorityRequired:"自分が優先権を持っているときだけ土地をプレイできます",
  landPlayLimitReached:"このターンの土地プレイ可能回数を使い切っています"
})[x]||str(x);}
function textParts(obj={}){
  const out=[];for(const k of["name","abilityName","sourceCardName","memo","resolveNote","rulesText","oracleText","printedText"]){if(obj[k])out.push(str(obj[k]));}
  for(const it of Array.isArray(obj.resolveChecklist)?obj.resolveChecklist:[]){out.push(str(it&&it.label),str(it&&it.memo));}
  return out.filter(Boolean).join("\n");
}
function parseSimpleLibraryActions(text){
  const s=str(text),out=[],seen=new Set();
  const add=(kind,n,label)=>{n=Math.max(1,numberOf(n,1));const key=`${kind}:${n}`;if(seen.has(key))return;seen.add(key);out.push({kind,amount:n,amountX:0,targetMode:"controller",enabled:true,label:label||({scry:"占術",surveil:"諜報",mill:"切削"}[kind]+n),inferred:true});};
  let m;const patterns=[
    ["surveil",/諜報\s*([XxＸｘ0-9０-９一二三四五六七八九十]+)/g,"諜報"],
    ["scry",/占術\s*([XxＸｘ0-9０-９一二三四五六七八九十]+)/g,"占術"],
    ["mill",/(?:切削|ライブラリーの一番上から)\s*([0-9０-９一二三四五六七八九十]+)\s*枚/g,"切削"],
    ["surveil",/surveil\s+(\d+)/ig,"Surveil"],
    ["scry",/scry\s+(\d+)/ig,"Scry"],
    ["mill",/mill(?:s)?\s+(\d+)/ig,"Mill"]
  ];
  for(const[k,re,label]of patterns){while((m=re.exec(s)))add(k,m[1],`${label}${numberOf(m[1],1)}`);}
  return out;
}
function inferSimpleLibraryActions(obj={},ability={}){
  const explicit=[];
  for(const src of[obj,ability])for(const a of Array.isArray(src&&src.libraryActions)?src.libraryActions:[]){if(a&&a.enabled!==false&&["scry","surveil","mill"].includes(a.kind))explicit.push({...a,inferred:false});}
  if(explicit.length)return explicit;
  return parseSimpleLibraryActions(textParts(obj)+"\n"+textParts(ability));
}
function checklistMatchesAction(item,action){const s=[item&&item.label,item&&item.memo].filter(Boolean).join(" ");return action.kind==="surveil"?/諜報|surveil/i.test(s):action.kind==="scry"?/占術|scry/i.test(s):/切削|mill/i.test(s);}
function diagnose(){
  const base={actorRole:"A",activeRole:"A",priorityRole:"A",phase:3,stackDepth:0,used:0,limit:1};
  const tests=[
    {name:"legal main",ok:landDecision(base).ok},
    {name:"combat blocked",ok:landDecision({...base,phase:5}).reasons.includes("mainPhaseRequired")},
    {name:"second land blocked",ok:landDecision({...base,used:1}).reasons.includes("landPlayLimitReached")},
    {name:"extra land works",ok:landDecision({...base,used:1,limit:2}).ok},
    {name:"surveil jp parsed",ok:parseSimpleLibraryActions("諜報1を行う")[0]?.kind==="surveil"},
    {name:"scry english parsed",ok:parseSimpleLibraryActions("Scry 2.")[0]?.amount===2},
    {name:"mill parsed",ok:parseSimpleLibraryActions("切削3枚")[0]?.kind==="mill"},
    {name:"ability explicit preferred",ok:inferSimpleLibraryActions({resolveChecklist:[{label:"諜報1"}]},{libraryActions:[{kind:"scry",amount:1,enabled:true}]}).some(x=>x.kind==="scry")}
  ];
  return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
}
return{VERSION,PROTOCOL,MAIN_PHASES,numberOf,landDecision,reasonText,textParts,parseSimpleLibraryActions,inferSimpleLibraryActions,checklistMatchesAction,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7945_CORE)return;
if(typeof state!=="object"||typeof findCard!=="function")return;
const API=globalThis.CPT_V7945_CORE;
let resolvingSimple=false;
function esc45(x){try{return typeof esc==="function"?esc(String(x==null?"":x)):String(x==null?"":x);}catch(_){return String(x==null?"":x);}}
function now45(){try{return typeof nowISO==="function"?nowISO():new Date().toISOString();}catch(_){return new Date().toISOString();}}
function playerOf45(f,p){if(p==="A"||p==="B")return p;if(f&&f.player)return f.player;return f&&f.card&&((f.card.controller==="B"||f.card.owner==="B")?"B":"A")||"A";}
function used45(p){try{return typeof _landPlayed==="function"?Math.max(0,Number(_landPlayed(p))||0):Math.max(0,Number(state.turn?.landPlaysUsed?.[p])||0);}catch(_){return 0;}}
function limit45(p){try{if(typeof v45LandLimit==="function")return Math.max(1,Number(v45LandLimit(p))||1);if(typeof _landPlayLimit==="function")return Math.max(1,Number(_landPlayLimit())||1);}catch(_){}return 1;}
function setUsed45(p,n){try{if(typeof _landPlayMap==="function"){_landPlayMap()[p]=n;return;}}catch(_){}if(!state.turn)state.turn={};if(!state.turn.landPlaysUsed)state.turn.landPlaysUsed={A:0,B:0};state.turn.landPlaysUsed[p]=n;}
function landSnapshot45(p,opts={}){const t=state.turn||{};return API.landDecision({actorRole:p,activeRole:t.active,priorityRole:t.priority,phase:t.phase,stack:state.stack||[],used:used45(p),limit:limit45(p),countsAsLandPlay:opts.countsAsLandPlay!==false,timingOverride:opts.timingOverride===true});}
function runtime45(){if(!state.v7945||typeof state.v7945!=="object"||Array.isArray(state.v7945))state.v7945={landBlocks:[],landCommits:[],simpleResolutions:[]};for(const k of["landBlocks","landCommits","simpleResolutions"])if(!Array.isArray(state.v7945[k]))state.v7945[k]=[];return state.v7945;}
function record45(k,row){const r=runtime45(),a=r[k];a.unshift({at:now45(),...row});if(a.length>240)a.length=240;}
function blockLand45(id,p,q,path){const f=findCard(id),name=f?.card?.name||"土地";record45("landBlocks",{cardId:String(id||""),name,player:p,path,reasons:q.reasons,phase:q.phase,used:q.used,limit:q.limit});const list=q.reasons.map(x=>`<li>${esc45(API.reasonText(x))}</li>`).join("");const body=`<div class="oh-warn"><b>${esc45(name)}</b> は土地としてプレイできません。</div><ul class="v7945-reasons">${list}</ul><div class="pvrow">土地プレイ <b>${q.used}/${q.limit}</b> ／ フェイズ ${q.phase} ／ 優先権 ${esc45(q.priority||"なし")} ／ スタック ${q.stackDepth}</div><div class="note">フェッチや呪文・能力で土地を戦場に出す処理は「土地のプレイ」ではないため別経路です。</div>`;try{openModal("土地プレイを停止しました",body,'<button class="btn primary" data-app="closem">閉じる</button>');}catch(_){try{toast(q.reasons.map(API.reasonText).join(" / "));}catch(__){}}return false;}
function playLand45(id,opts={}){
  const f=findCard(id);if(!f)return false;const p=playerOf45(f,opts.player),q=landSnapshot45(p,opts);if(!q.ok)return blockLand45(id,p,q,opts.path||"v7945-core");
  const source=f.zone,counts=opts.countsAsLandPlay!==false;
  let moved=null;
  const commit=()=>{const cur=findCard(id);if(!cur)return;cur.arr.splice(cur.index,1);const c=cur.card;c.zone="lands";c.controller=p;c.tapped=!!opts.enterTapped;c.attacking=false;c.blocking=false;c.blockingTargetId=null;c.blockingTargetIds=[];c.faceDown=false;state.players[p].lands.push(c);if(counts)setUsed45(p,used45(p)+1);moved=c;};
  try{if(typeof act==="function")act("土地プレイ",commit);else commit();}catch(e){try{toast(`土地プレイ失敗: ${e?.message||e}`);}catch(_){}return false;}
  if(!moved)return false;record45("landCommits",{cardId:String(id),name:moved.name,player:p,from:source,used:used45(p),limit:q.limit,path:opts.path||"v7945-core"});try{addLog(`${typeof pname==="function"?pname(p):p} が 土地 [${moved.name}] を${source==="hand"?"手札":source}からプレイした（土地プレイ ${used45(p)}/${q.limit}）`);}catch(_){}try{closeModal();}catch(_){}try{saveState(true);render();if(typeof renderPreview==="function")renderPreview();}catch(_){}return moved;
}
function sourceAbility45(obj){try{if(!obj||!obj.sourceCardName)return{};const e=dictGet(obj.sourceCardName)||{};const a=(Array.isArray(e.abilities)?e.abilities:[]).find(x=>String(x.id||"")===String(obj.abilityId||""));return a||{};}catch(_){return{};}}
function markChecklist45(obj,actions){try{if(!obj)return;const list=typeof getResolveChecklist==="function"?getResolveChecklist(obj):(obj.resolveChecklist||[]);if(!obj.resolveChecklistState||typeof obj.resolveChecklistState!=="object")obj.resolveChecklistState={};for(const it of list||[])if(actions.some(a=>API.checklistMatchesAction(it,a)))obj.resolveChecklistState[it.id]=true;}catch(_){} }
function topCard45(p){const a=state.players?.[p]?.library;return Array.isArray(a)&&a.length?a[a.length-1]:null;}
function compactLibraryOne45(src,a,cb){
  const p=typeof autoLibraryPlayer==="function"?autoLibraryPlayer(src,a):(src.controller||src.owner||state.turn.active||"A"),c=topCard45(p);if(!c){try{toast("ライブラリーにカードがありません");}catch(_){}if(cb)cb(false);return;}
  const kind=a.kind,name=typeof getCardDisplayInfo==="function"?getCardDisplayInfo(c).name:c.name,type=typeof typeText==="function"?typeText(c,true):c.type||"";
  const other=kind==="surveil"?"墓地へ置く":"ライブラリーの下へ置く";
  const body=`<div class="v7945-simple-head"><span class="viz-badge">${kind==="surveil"?"諜報1":"占術1"}</span><b>${esc45(src.sourceCardName||src.name||a.label||"")}</b></div><div class="v7945-top-card"><b>${esc45(name)}</b><span>${esc45(type)}</span></div><div class="note">この選択を確定すると、そのまま誘発・呪文の解決を完了します。</div>`;
  openModal(`${kind==="surveil"?"諜報1":"占術1"} — 一番上を確認`,body,`<button class="btn primary" data-v7945lib="top">そのまま一番上に残す</button><button class="btn warn" data-v7945lib="other">${other}</button><button class="btn" data-app="closem">保留</button>`);
  setModalHandler(function(e){const b=e.target.closest("[data-v7945lib]");if(!b)return;const choice=b.dataset.v7945lib;try{if(choice==="other"){if(typeof act==="function")act(kind==="surveil"?"諜報1":"占術1",()=>{const pl=state.players[p],top=pl.library.pop();if(!top)return;if(kind==="surveil"){top.zone="graveyard";top.controller=top.owner;pl.graveyard.push(top);}else{top.zone="library";pl.library.unshift(top);}});else{const pl=state.players[p],top=pl.library.pop();if(top){if(kind==="surveil"){top.zone="graveyard";pl.graveyard.push(top);}else pl.library.unshift(top);}}}addLog(`${typeof pname==="function"?pname(p):p} が${kind==="surveil"?"諜報1":"占術1"}を処理（${choice==="top"?"一番上に残す":other}）`);record45("simpleResolutions",{kind,amount:1,player:p,choice,source:src.sourceCardName||src.name||""});closeModal();saveState(true);render();if(cb)cb(true);}catch(err){try{toast(`処理失敗: ${err?.message||err}`);}catch(_){}if(cb)cb(false);}});
}
/* Replace the actual ordinary land-play entry points, regardless of old saved flags. */
_playLandFromHandFlow=function(id){return playLand45(id,{path:"hand-standard"});};
if(typeof v45MoveLandToBattlefield==="function"){
  const base45=v45MoveLandToBattlefield;
  v45MoveLandToBattlefield=function(id,p,permission,fromHand){const f=findCard(id),ordinary=!!f&&(!permission||permission.countsAsLandPlay!==false)&&!(permission&&permission.timingOverride===true);if(ordinary)return playLand45(id,{player:p,countsAsLandPlay:true,path:fromHand?"v45-hand":"v45-permission"});return base45.apply(this,arguments);};
}
if(typeof smartStandardAction==="function"){
  const smartBase45=smartStandardAction;smartStandardAction=function(id){const f=findCard(id);if(f&&f.zone==="hand"&&((typeof cardHasType==="function"&&cardHasType(f.card,"Land"))||String(f.card.type||"")==="Land"))return playLand45(id,{path:"smart-standard"});return smartBase45.apply(this,arguments);};
}
/* Compact scry/surveil 1 even when a proper libraryAction already exists. */
if(typeof runLibraryAction==="function"){
  const libBase45=runLibraryAction;runLibraryAction=function(src,a,cb){let n=0,p="";try{a=typeof normalizeLibraryAction==="function"?normalizeLibraryAction(a):a;n=typeof autoLibraryAmount==="function"?autoLibraryAmount(src,a):Number(a.amount)||1;p=typeof autoLibraryPlayer==="function"?autoLibraryPlayer(src,a):"";}catch(_){}const onlineNow=!!(globalThis.online&&online.connected&&online.roomCode);if(!onlineNow&&n===1&&a&&["scry","surveil"].includes(a.kind))return compactLibraryOne45(src,a,cb);return libBase45.apply(this,arguments);};
}
/* Infer checklist-only simple library effects from old card registrations. */
if(typeof resolveTop==="function"){
  const resolveBase45=resolveTop;resolveTop=function(forceDest,autoChoice){const top=state.stack?.[state.stack.length-1];if(!top||forceDest||autoChoice!=null||resolvingSimple||top._v7945SimpleHandled||state.settings?.v7945SimpleTriggerFlow===false)return resolveBase45.apply(this,arguments);const explicit=typeof autoLibraryActionsForSource==="function"?autoLibraryActionsForSource(top):[];if(explicit&&explicit.length)return resolveBase45.apply(this,arguments);const ability=sourceAbility45(top),actions=API.inferSimpleLibraryActions(top,ability);if(!actions.length)return resolveBase45.apply(this,arguments);top._v7945SimpleHandled=true;const finish=ok=>{if(!ok){top._v7945SimpleHandled=false;return;}markChecklist45(top,actions);resolvingSimple=true;try{resolveTop(forceDest,autoChoice);}finally{resolvingSimple=false;}};try{if(typeof runLibraryActionSequence==="function")runLibraryActionSequence(top,actions,finish);else finish(false);}catch(e){top._v7945SimpleHandled=false;try{toast(`簡単誘発処理を開始できません: ${e?.message||e}`);}catch(_){}}return;};
}
/* Settings are informational; standard land rules are authoritative. */
if(typeof defaultState==="function"){const dbase45=defaultState;defaultState=function(){const s=dbase45();s.settings=Object.assign({v7945SimpleTriggerFlow:true},s.settings||{});s.v7945={landBlocks:[],landCommits:[],simpleResolutions:[]};return s;};}
try{if(!state.settings)state.settings={};if(typeof state.settings.v7945SimpleTriggerFlow!=="boolean")state.settings.v7945SimpleTriggerFlow=true;}catch(_){}
if(typeof openSettings==="function"){const settingsBase45=openSettings;openSettings=function(){const r=settingsBase45.apply(this,arguments);setTimeout(()=>{const body=document.querySelector("#modalRoot .mbody");if(!body||body.querySelector("#v7945CorePanel"))return;const box=document.createElement("section");box.id="v7945CorePanel";box.className="v7945-core-panel";box.innerHTML=`<div><b>土地プレイ・簡単誘発の実行制御</b><span class="viz-badge">v7.9.45</span></div><div class="note">通常の土地プレイは設定に関係なく、メインフェイズ・優先権・空スタック・残り回数を最終確定時に検査します。</div><label><input type="checkbox" id="v7945SimpleTriggerFlow"${state.settings.v7945SimpleTriggerFlow!==false?" checked":""}> 諜報・占術・切削などの簡単な登録済み誘発を解決操作へ接続</label>`;body.prepend(box);box.addEventListener("change",e=>{if(e.target.id!=="v7945SimpleTriggerFlow")return;state.settings.v7945SimpleTriggerFlow=e.target.checked;try{saveState(true);}catch(_){}});},0);return r;};}
const st=document.createElement("style");st.textContent="#v7945CorePanel{display:grid;gap:7px;border:1px solid var(--accent);border-radius:10px;padding:10px;margin:8px 0;background:rgba(80,130,210,.08)}#v7945CorePanel>div:first-child,.v7945-simple-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.v7945-reasons{margin:10px 0 10px 22px;display:grid;gap:5px}.v7945-top-card{display:grid;gap:4px;border:1px solid var(--line);border-radius:10px;padding:12px;margin:10px 0;background:var(--panel2)}";document.head.appendChild(st);
runtime45();
globalThis.CPT_V7945_CLIENT={version:API.VERSION,protocol:API.PROTOCOL,playLand:playLand45,landDecisionFor:(p,x)=>landSnapshot45(p,x||{}),inferSimpleLibraryActions:API.inferSimpleLibraryActions,compactLibraryOne:compactLibraryOne45,runtime:runtime45,diagnose:API.diagnose};
try{document.body.dataset.v7945="land-core-simple-trigger";document.title="カードゲーム練習卓 v7.9.46 土地ルート最終ロック";}catch(_){}
})();




/* ============================================================
   v7.9.46 Land Route Lock
   - every generic/manual move from a non-battlefield zone to the land
     zone is treated as a land play, regardless of the source zone
   - only the explicit effect-placement API bypasses timing/count rules
   - capture-phase menu interception and the final moveCard boundary
     both fail closed
   - a visible runtime badge confirms that the guard is actually loaded
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7946_ROUTE_LOCK=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.46";
const PROTOCOL="cpt-v7.9.46-land-route-lock";
const MAIN_PHASES=new Set([3,9]);
const FIELD_ZONES=new Set(["lands","creatures","others"]);
const str=v=>String(v==null?"":v);
function isBattlefieldZone(z){return FIELD_ZONES.has(str(z));}
function isGenericLandRoute(raw={}){
  const from=str(raw.fromZone),dest=str(raw.destZone);
  return dest==="lands"&&!isBattlefieldZone(from)&&raw.explicitEffect!==true&&raw.effectScope!==true;
}
function decision(raw={}){
  const actor=str(raw.actorRole||raw.player),active=str(raw.activeRole||raw.active),priority=str(raw.priorityRole||raw.priority);
  const phase=Number(raw.phase),stackDepth=Array.isArray(raw.stack)?raw.stack.length:Math.max(0,Math.trunc(Number(raw.stackDepth)||0));
  const used=Math.max(0,Math.trunc(Number(raw.used)||0)),limit=Math.max(0,Math.trunc(Number(raw.limit)||0));
  const countsAsLandPlay=raw.countsAsLandPlay!==false,timingOverride=raw.timingOverride===true,reasons=[];
  if(!timingOverride){
    if(!actor||actor!==active)reasons.push("activePlayerRequired");
    if(!MAIN_PHASES.has(phase))reasons.push("mainPhaseRequired");
    if(stackDepth!==0)reasons.push("emptyStackRequired");
    if(!actor||actor!==priority)reasons.push("priorityRequired");
  }
  if(countsAsLandPlay&&used>=limit)reasons.push("landPlayLimitReached");
  return{ok:reasons.length===0,reasons,actor,active,priority,phase,stackDepth,used,limit,countsAsLandPlay,timingOverride};
}
function reasonText(reason){return({
  activePlayerRequired:"土地は自分のターンにしかプレイできません",
  mainPhaseRequired:"土地は第1または第2メインフェイズにしかプレイできません",
  emptyStackRequired:"スタックに呪文や能力がある間は土地をプレイできません",
  priorityRequired:"自分が優先権を持っているときだけ土地をプレイできます",
  landPlayLimitReached:"このターンの土地プレイ可能回数を使い切っています"
})[reason]||str(reason);}
function diagnose(){
  const base={actorRole:"A",activeRole:"A",priorityRole:"A",phase:3,stackDepth:0,used:0,limit:1};
  const tests=[
    {name:"hand route guarded",ok:isGenericLandRoute({fromZone:"hand",destZone:"lands"})},
    {name:"graveyard manual route guarded",ok:isGenericLandRoute({fromZone:"graveyard",destZone:"lands"})},
    {name:"exile manual route guarded",ok:isGenericLandRoute({fromZone:"exile",destZone:"lands"})},
    {name:"battlefield relabel exempt",ok:!isGenericLandRoute({fromZone:"creatures",destZone:"lands"})},
    {name:"explicit effect exempt",ok:!isGenericLandRoute({fromZone:"hand",destZone:"lands",explicitEffect:true})},
    {name:"main allowed",ok:decision(base).ok},
    {name:"combat blocked",ok:decision({...base,phase:5}).reasons.includes("mainPhaseRequired")},
    {name:"second land blocked",ok:decision({...base,used:1}).reasons.includes("landPlayLimitReached")}
  ];
  return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
}
return{VERSION,PROTOCOL,MAIN_PHASES,FIELD_ZONES,isBattlefieldZone,isGenericLandRoute,decision,reasonText,diagnose};
});

(function(){
"use strict";
if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7946_ROUTE_LOCK)return;
if(typeof state!=="object"||typeof findCard!=="function"||typeof moveCard!=="function")return;
const API=globalThis.CPT_V7946_ROUTE_LOCK;
let effectDepth=0,menuCardId="";
const priorMove=moveCard;
function esc46(x){try{return typeof esc==="function"?esc(String(x==null?"":x)):String(x==null?"":x);}catch(_){return String(x==null?"":x);}}
function now46(){try{return typeof nowISO==="function"?nowISO():new Date().toISOString();}catch(_){return new Date().toISOString();}}
function playerOf(f,p){if(p==="A"||p==="B")return p;if(f&&f.player)return f.player;const c=f&&f.card;return c&&((c.controller==="B"||c.owner==="B")?"B":"A")||"A";}
function usedOf(p){try{return typeof _landPlayed==="function"?Math.max(0,Number(_landPlayed(p))||0):Math.max(0,Number(state.turn?.landPlaysUsed?.[p])||0);}catch(_){return 0;}}
function limitOf(p){try{if(typeof v45LandLimit==="function")return Math.max(1,Number(v45LandLimit(p))||1);if(typeof _landPlayLimit==="function")return Math.max(1,Number(_landPlayLimit())||1);}catch(_){}return 1;}
function setUsed(p,n){try{if(typeof _landPlayMap==="function"){_landPlayMap()[p]=n;return;}}catch(_){}if(!state.turn)state.turn={};if(!state.turn.landPlaysUsed)state.turn.landPlaysUsed={A:0,B:0};state.turn.landPlaysUsed[p]=n;}
function snapshot(p,opts={}){const t=state.turn||{};return API.decision({actorRole:p,activeRole:t.active,priorityRole:t.priority,phase:t.phase,stack:state.stack||[],used:usedOf(p),limit:limitOf(p),countsAsLandPlay:opts.countsAsLandPlay!==false,timingOverride:opts.timingOverride===true});}
function runtime(){if(!state.v7946||typeof state.v7946!=="object"||Array.isArray(state.v7946))state.v7946={blocks:[],commits:[],effectPuts:[]};for(const k of["blocks","commits","effectPuts"])if(!Array.isArray(state.v7946[k]))state.v7946[k]=[];return state.v7946;}
function record(kind,row){const r=runtime(),a=kind==="blocked"?r.blocks:kind==="effectPut"?r.effectPuts:r.commits;a.unshift({at:now46(),kind,...row});if(a.length>240)a.length=240;}
function showBlock(id,p,q,path){const f=findCard(id),name=f?.card?.name||"土地";record("blocked",{cardId:String(id||""),name,player:p,path,reasons:q.reasons,phase:q.phase,active:q.active,priority:q.priority,stackDepth:q.stackDepth,used:q.used,limit:q.limit});const list=q.reasons.map(x=>`<li>${esc46(API.reasonText(x))}</li>`).join("");const body=`<div class="oh-warn"><b>${esc46(name)}</b> は土地としてプレイできません。</div><ul class="v7946-reasons">${list}</ul><div class="pvrow">土地プレイ <b>${q.used}/${q.limit}</b> ／ フェイズ ${q.phase} ／ 優先権 ${esc46(q.priority||"なし")} ／ スタック ${q.stackDepth}</div><div class="note">汎用の「土地エリアへ」は必ず土地のプレイとして判定します。能力で出す場合だけ専用の「効果で土地を戦場に出す」を使います。</div>`;try{openModal("土地プレイを停止しました",body,'<button class="btn primary" data-app="closem">閉じる</button>');}catch(_){try{toast(q.reasons.map(API.reasonText).join(" / "));}catch(__){}}return false;}
function withEffectScope(fn){effectDepth++;try{return fn();}finally{effectDepth=Math.max(0,effectDepth-1);}}
function playLand(id,opts={}){
  const f=findCard(id);if(!f)return false;
  if(API.isBattlefieldZone(f.zone))return priorMove.call(this,id,opts.player||playerOf(f),"lands",opts.pos,opts.skipUndo===true);
  const p=playerOf(f,opts.player),q=snapshot(p,opts);if(!q.ok)return showBlock(id,p,q,opts.path||"v7946-route-lock");
  if(opts.manageUndo!==false&&typeof pushUndo==="function")try{pushUndo("土地プレイ");}catch(_){}
  const source=f.zone;
  const moved=withEffectScope(()=>priorMove.call(this,id,p,"lands",opts.pos,true));
  if(!moved)return false;
  moved.controller=p;moved.tapped=!!opts.enterTapped;moved.attacking=false;moved.blocking=false;moved.blockingTargetId=null;moved.blockingTargetIds=[];
  if(opts.countsAsLandPlay!==false)setUsed(p,usedOf(p)+1);
  record("commit",{cardId:String(id),name:moved.name||f.card.name,player:p,from:source,path:opts.path||"v7946-route-lock",used:usedOf(p),limit:q.limit});
  try{addLog(`${typeof pname==="function"?pname(p):p} が 土地 [${moved.name}] を${source==="hand"?"手札":source}からプレイした（土地プレイ ${usedOf(p)}/${q.limit}）`);}catch(_){}
  try{closeModal();saveState(true);render();if(typeof renderPreview==="function")renderPreview();}catch(_){}
  return moved;
}
function putByEffect(id,opts={}){
  const f=findCard(id);if(!f)return false;const p=playerOf(f,opts.player),source=f.zone;
  if(opts.manageUndo!==false&&typeof pushUndo==="function")try{pushUndo("効果で土地を戦場に出す");}catch(_){}
  const moved=withEffectScope(()=>priorMove.call(this,id,p,"lands",opts.pos,true));
  if(!moved)return false;moved.controller=p;moved.tapped=!!opts.enterTapped;
  record("effectPut",{cardId:String(id),name:moved.name||f.card.name,player:p,from:source,path:opts.path||"explicit-effect"});
  try{addLog(`[${moved.name}] を効果によって土地エリアへ出した（土地プレイ回数には数えない）`);saveState(true);render();if(typeof renderPreview==="function")renderPreview();}catch(_){}
  return moved;
}
/* Absolute final route lock. Generic/manual movement can no longer silently
   fall back to raw movement. Existing effect engines use skipUndo=true and
   remain exempt; the dedicated effect API is preferred for UI operations. */
moveCard=function(id,destPlayer,destZone,pos,skipUndo){
  const f=findCard(id),effectScope=effectDepth>0||skipUndo===true;
  if(f&&API.isGenericLandRoute({fromZone:f.zone,destZone,effectScope})){return playLand(id,{player:destPlayer,pos,path:"moveCard-absolute-boundary",manageUndo:skipUndo!==true});}
  return priorMove.apply(this,arguments);
};
_playLandFromHandFlow=function(id){return playLand(id,{path:"hand-flow"});};
if(typeof smartStandardAction==="function"){
  const baseSmart=smartStandardAction;smartStandardAction=function(id){const f=findCard(id);if(f&&!API.isBattlefieldZone(f.zone)&&((typeof cardHasType==="function"&&cardHasType(f.card,"Land"))||/Land|土地/i.test(String(f.card.type||""))))return playLand(id,{path:"smart-standard"});return baseSmart.apply(this,arguments);};
}
if(typeof v45MoveLandToBattlefield==="function"){
  const baseV45=v45MoveLandToBattlefield;v45MoveLandToBattlefield=function(id,p,permission,fromHand){const f=findCard(id),isEffect=!!(permission&&(permission.countsAsLandPlay===false||permission.method==="put"||permission.explicitEffect===true));if(f&&!API.isBattlefieldZone(f.zone)&&!isEffect)return playLand(id,{player:p,path:fromHand?"v45-hand":"v45-permission",timingOverride:!!permission?.timingOverride});return baseV45.apply(this,arguments);};
}
/* Capture the real menu buttons before old handlers can perform raw moves. */
document.addEventListener("click",function(e){
  const b=e.target&&e.target.closest&&e.target.closest('[data-cm="lands"],[data-up="lands"]');if(!b)return;
  const id=menuCardId||globalThis.selectedCardId||"",f=findCard(id);if(!f||API.isBattlefieldZone(f.zone))return;
  e.preventDefault();e.stopImmediatePropagation();try{closeModal();}catch(_){}playLand(id,{player:f.player,path:b.hasAttribute("data-up")?"unknown-menu-capture":"card-menu-capture"});
},true);
if(typeof openCardMenu==="function"){const base=openCardMenu;openCardMenu=function(id){menuCardId=String(id||"");const r=base.apply(this,arguments);setTimeout(()=>{try{const f=findCard(id),grid=document.querySelector("#modalRoot .mbody .menu-grid");if(!f||API.isBattlefieldZone(f.zone)||!grid||grid.querySelector("[data-v7946-effect-put]"))return;const b=document.createElement("button");b.className="btn warn";b.dataset.v7946EffectPut="1";b.textContent="効果で土地を戦場に出す（プレイではない）";grid.appendChild(b);}catch(_){}},0);return r;};}
if(typeof openUnknownPlayMenu==="function"){const base=openUnknownPlayMenu;openUnknownPlayMenu=function(id){menuCardId=String(id||"");return base.apply(this,arguments);};}
document.addEventListener("click",function(e){const b=e.target&&e.target.closest&&e.target.closest("[data-v7946-effect-put]");if(!b)return;e.preventDefault();e.stopImmediatePropagation();const id=menuCardId||globalThis.selectedCardId||"",f=findCard(id);if(!f)return;const go=()=>{try{closeModal();}catch(_){}putByEffect(id,{player:f.player,path:"explicit-menu-effect"});};try{confirmDlg(`[${f.card.name}] を土地のプレイではなく、呪文・能力の効果で戦場に出しますか？`,go);}catch(_){go();}},true);
function statusModel(){const t=state.turn||{},p=t.priority==="B"?"B":"A",q=snapshot(p);return{version:API.VERSION,loaded:true,phase:t.phase,active:t.active,priority:t.priority,stackDepth:Array.isArray(state.stack)?state.stack.length:0,usedA:usedOf("A"),usedB:usedOf("B"),limitA:limitOf("A"),limitB:limitOf("B"),priorityDecision:q};}
function openStatus(){const s=statusModel(),phaseName=typeof PHASES!=="undefined"?PHASES[s.phase]:String(s.phase);openModal("土地ルール稼働確認",`<div class="v7946-status-ok"><b>v${API.VERSION} 土地ルート最終ロック: 稼働中</b></div><div class="pvrow">手番 ${esc46(s.active)} ／ ${esc46(phaseName)} ／ 優先権 ${esc46(s.priority)} ／ スタック ${s.stackDepth}</div><div class="pvrow">土地プレイ A ${s.usedA}/${s.limitA} ／ B ${s.usedB}/${s.limitB}</div><div class="note">この表示が出れば最新版の土地ガードが読み込まれています。汎用「土地エリアへ」は全領域から土地プレイ扱い、効果配置だけ専用ボタンで例外です。</div>`,`<button class="btn" data-app="closem">閉じる</button>`);}
function installBadge(){if(document.getElementById("v7946LandStatus"))return;const host=document.querySelector("header .toolbar")||document.querySelector("header");if(!host)return;const b=document.createElement("button");b.id="v7946LandStatus";b.type="button";b.className="btn tiny v7946-land-status";b.textContent="土地ルール v7.9.46 有効";b.addEventListener("click",openStatus);host.appendChild(b);}
const defaultBase=typeof defaultState==="function"?defaultState:null;if(defaultBase){defaultState=function(){const s=defaultBase();s.v7946={blocks:[],commits:[],effectPuts:[]};return s;};}
const style=document.createElement("style");style.textContent=".v7946-land-status{border-color:#4d9a68!important;color:#bff3cd!important}.v7946-reasons{margin:10px 0 10px 22px;display:grid;gap:5px}.v7946-status-ok{border:1px solid #4d9a68;border-radius:8px;padding:9px;background:rgba(77,154,104,.12);margin-bottom:8px}";document.head.appendChild(style);
runtime();[0,50,200,800].forEach(ms=>setTimeout(installBadge,ms));
globalThis.CPT_V7946_CLIENT={version:API.VERSION,protocol:API.PROTOCOL,playLand,putLandByEffect:putByEffect,withEffectScope,decisionFor:(p,o)=>snapshot(p,o||{}),status:statusModel,openStatus,runtime,diagnose:API.diagnose};
try{document.body.dataset.v7946="land-route-lock";document.title="カードゲーム練習卓 v7.9.46 土地ルート最終ロック";}catch(_){}
})();

/* ===== v7.9.47 Client Bundle Consolidation Marker ===== */
(function(){
  "use strict";
  const VERSION="7.9.47";
  const PROTOCOL="cpt-v7.9.47-client-bundle";
  function install(){
    try{
      document.body.dataset.v7947="client-bundle";
      document.title="カードゲーム練習卓 v7.9.47 統合bundle版";
      const host=document.querySelector("header .toolbar")||document.querySelector("header");
      if(host&&!document.getElementById("v7947BundleStatus")){
        const b=document.createElement("span");
        b.id="v7947BundleStatus";
        b.className="badge";
        b.textContent="統合bundle v7.9.47";
        b.title="v7.9.30～v7.9.46のクライアント拡張を1ファイルで読み込み中";
        host.appendChild(b);
      }
    }catch(_){ }
  }
  [0,50,200,800].forEach(ms=>setTimeout(install,ms));
  globalThis.CPT_V7947_CLIENT_BUNDLE={version:VERSION,protocol:PROTOCOL,loaded:true};
})();
