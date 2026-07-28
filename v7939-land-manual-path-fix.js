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
