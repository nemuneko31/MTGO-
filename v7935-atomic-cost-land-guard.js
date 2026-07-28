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
