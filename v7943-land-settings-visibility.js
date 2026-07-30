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
