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
