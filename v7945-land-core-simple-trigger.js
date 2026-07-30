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
try{document.body.dataset.v7945="land-core-simple-trigger";document.title="カードゲーム練習卓 v7.9.45 土地・簡単誘発フロー";}catch(_){}
})();
