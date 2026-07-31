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
