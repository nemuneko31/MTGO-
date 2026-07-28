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
