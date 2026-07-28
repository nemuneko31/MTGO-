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
