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
