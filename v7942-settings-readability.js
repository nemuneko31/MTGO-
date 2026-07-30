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
