/* ============================================================
   v7.9.32 Multi-Target Constraint Engine
   - distinct / same-controller / different-controller relations
   - per-kind and card eligibility limits
   - public-information dynamic maximum target count
   - divided-value validation and resolution-time relation recheck
   ============================================================ */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.CPT_V7932_TARGETS=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="7.9.32",PROTOCOL="cpt-v7.9.32-target-constraints",ROLES=new Set(["A","B"]);
const arr=v=>Array.isArray(v)?v:[], num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const int=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.trunc(num(v))));
const uniq=v=>[...new Set(arr(v).map(x=>String(x||"")).filter(Boolean))];
const lower=v=>String(v||"").toLowerCase();
function roleRule(v){return["any","you","opponent","A","B"].includes(v)?v:"any";}
function normalize(raw={}){
  const c=raw&&typeof raw==="object"?raw:{};
  const rel=c.relation&&typeof c.relation==="object"?c.relation:{};
  const alloc=c.allocation&&typeof c.allocation==="object"?c.allocation:null;
  const dyn=c.dynamicMax&&typeof c.dynamicMax==="object"?c.dynamicMax:null;
  return{
    enabled:c.enabled!==false,required:!!c.required,min:int(c.min??c.minTargets,0,100),max:int(c.max??c.maxTargets,0,100)||1,
    requireDistinct:c.requireDistinct!==false,
    cardMin:int(c.cardMin,0,100),cardMax:int(c.cardMax,0,100)||100,playerMin:int(c.playerMin,0,2),playerMax:int(c.playerMax,0,2)||2,zoneMin:int(c.zoneMin,0,100),zoneMax:int(c.zoneMax,0,100)||100,
    allowedKinds:uniq(c.allowedKinds).filter(x=>["card","player","zone"].includes(x)),
    cardZones:uniq(c.cardZones||c.zones),cardTypesAny:uniq(c.cardTypesAny||c.types),cardTypesAll:uniq(c.cardTypesAll),excludedCardTypes:uniq(c.excludedCardTypes),
    cardController:roleRule(c.cardController||c.controller||c.targetRelation),cardOwner:roleRule(c.cardOwner||c.owner),
    playerRule:["any","you","opponent"].includes(c.playerRule)?c.playerRule:"any",
    relation:{sameController:!!rel.sameController,differentControllers:!!rel.differentControllers,sameOwner:!!rel.sameOwner,differentOwners:!!rel.differentOwners,distinctNames:!!rel.distinctNames,sameName:!!rel.sameName},
    dynamicMax:dyn?{metric:String(dyn.metric||"xValue"),role:roleRule(dyn.role),zone:String(dyn.zone||""),multiplier:num(dyn.multiplier,1),add:num(dyn.add,0),cap:int(dyn.cap,0,100)||100}:null,
    allocation:alloc?{total:int(alloc.total,0,9999),minEach:int(alloc.minEach,0,9999),maxEach:int(alloc.maxEach,0,9999)||9999,values:alloc.values&&typeof alloc.values==="object"?{...alloc.values}:{}}:null
  };
}
function resolveRole(rule,actor){if(rule==="you")return actor;if(rule==="opponent")return actor==="A"?"B":"A";return ROLES.has(rule)?rule:"";}
function dynamicValue(d,ctx={}){if(!d)return null;let v=0;switch(d.metric){case"xValue":v=num(ctx.xValue);break;case"sourcePower":v=num(ctx.sourcePower);break;case"sourceToughness":v=num(ctx.sourceToughness);break;case"actorLife":v=num(ctx.actorLife);break;case"opponentLife":v=num(ctx.opponentLife);break;case"cardsInZone":v=num(ctx.cardsInZone);break;default:return null;}return int(v*d.multiplier+d.add,0,d.cap);}
function cardTypes(c){return uniq([c?.type,...arr(c?.types)]).map(lower);}
function validate(input={}){
  const cfg=normalize(input.config||{}),actor=ROLES.has(input.actorRole)?input.actorRole:"A",raw=input.targets||{},cards=arr(input.cards),players=arr(input.players).map(String),zones=arr(input.zoneRefs),errors=[];
  const rawCard=arr(raw.cardIds).map(String),rawPlayers=arr(raw.playerIds).map(String),rawZones=arr(raw.zoneRefs);
  if(cfg.requireDistinct&&(new Set(rawCard).size!==rawCard.length||new Set(rawPlayers).size!==rawPlayers.length))errors.push("duplicateTarget");
  const allCount=rawCard.length+rawPlayers.length+rawZones.length,dv=dynamicValue(cfg.dynamicMax,input.context||{}),effectiveMax=dv==null?cfg.max:Math.min(cfg.max,dv);
  const min=cfg.required?Math.max(1,cfg.min):cfg.min;
  if(allCount<min||allCount>effectiveMax)errors.push("targetCountInvalid");
  if(rawCard.length<cfg.cardMin||rawCard.length>cfg.cardMax)errors.push("targetCardCountInvalid");
  if(rawPlayers.length<cfg.playerMin||rawPlayers.length>cfg.playerMax)errors.push("targetPlayerCountInvalid");
  if(rawZones.length<cfg.zoneMin||rawZones.length>cfg.zoneMax)errors.push("targetZoneCountInvalid");
  if(cfg.allowedKinds.length){if(rawCard.length&&!cfg.allowedKinds.includes("card"))errors.push("cardTargetsNotAllowed");if(rawPlayers.length&&!cfg.allowedKinds.includes("player"))errors.push("playerTargetsNotAllowed");if(rawZones.length&&!cfg.allowedKinds.includes("zone"))errors.push("zoneTargetsNotAllowed");}
  const byId=new Map(cards.map(c=>[String(c.id),c]));
  for(const id of rawCard){const c=byId.get(id);if(!c){errors.push("targetCardMissing");continue;}const ts=cardTypes(c);if(cfg.cardZones.length&&!cfg.cardZones.includes(String(c.zone)))errors.push(`targetZoneMismatch:${id}`);if(cfg.cardTypesAny.length&&!cfg.cardTypesAny.some(t=>ts.includes(lower(t))))errors.push(`targetTypeMismatch:${id}`);if(cfg.cardTypesAll.length&&!cfg.cardTypesAll.every(t=>ts.includes(lower(t))))errors.push(`targetTypeAllMismatch:${id}`);if(cfg.excludedCardTypes.some(t=>ts.includes(lower(t))))errors.push(`targetTypeExcluded:${id}`);const cr=resolveRole(cfg.cardController,actor),or=resolveRole(cfg.cardOwner,actor);if(cr&&String(c.controller)!==cr)errors.push(`targetControllerMismatch:${id}`);if(or&&String(c.ownerRole)!==or)errors.push(`targetOwnerMismatch:${id}`);}
  for(const p of rawPlayers){if(!ROLES.has(p))errors.push("targetPlayerInvalid");if(cfg.playerRule==="you"&&p!==actor)errors.push(`targetPlayerMismatch:${p}`);if(cfg.playerRule==="opponent"&&p===actor)errors.push(`targetPlayerMismatch:${p}`);}
  const selected=rawCard.map(id=>byId.get(id)).filter(Boolean), controllers=new Set(selected.map(c=>String(c.controller))), owners=new Set(selected.map(c=>String(c.ownerRole))), names=selected.map(c=>String(c.name||""));
  if(selected.length>1&&cfg.relation.sameController&&controllers.size!==1)errors.push("targetsMustShareController");
  if(selected.length>1&&cfg.relation.differentControllers&&controllers.size!==selected.length)errors.push("targetsMustHaveDifferentControllers");
  if(selected.length>1&&cfg.relation.sameOwner&&owners.size!==1)errors.push("targetsMustShareOwner");
  if(selected.length>1&&cfg.relation.differentOwners&&owners.size!==selected.length)errors.push("targetsMustHaveDifferentOwners");
  if(selected.length>1&&cfg.relation.distinctNames&&new Set(names).size!==names.length)errors.push("targetsMustHaveDistinctNames");
  if(selected.length>1&&cfg.relation.sameName&&new Set(names).size!==1)errors.push("targetsMustShareName");
  if(cfg.allocation){const vals=cfg.allocation.values||{};let total=0;for(const id of [...rawCard,...rawPlayers]){const n=int(vals[id],0,9999);if(n<cfg.allocation.minEach||n>cfg.allocation.maxEach)errors.push(`allocationPerTargetInvalid:${id}`);total+=n;}if(total!==cfg.allocation.total)errors.push("allocationTotalInvalid");}
  return{ok:errors.length===0,errors:[...new Set(errors)],min,max:cfg.max,effectiveMax,count:allCount,cardCount:rawCard.length,playerCount:rawPlayers.length,zoneCount:rawZones.length,dynamicMax:dv,config:cfg};
}
function parseText(text){const s=String(text||""),c={enabled:true,relation:{}};let m;if((m=s.match(/最大\s*([XxＸｘ0-9０-９]+)\s*(?:体|個|つ|人|枚)/))){if(/[XxＸｘ]/.test(m[1])){c.dynamicMax={metric:"xValue"};c.max=100;}else c.max=Number(m[1].replace(/[０-９]/g,x=>String.fromCharCode(x.charCodeAt(0)-65248)));c.min=0;}if(/それぞれ異なる対象|異なる[^。]{0,8}を対象/.test(s))c.requireDistinct=true;if(/同じプレイヤーがコントロール/.test(s))c.relation.sameController=true;if(/異なるプレイヤーがコントロール/.test(s))c.relation.differentControllers=true;if(/あなたがコントロール/.test(s))c.cardController="you";if(/対戦相手がコントロール/.test(s))c.cardController="opponent";if(/対象のクリーチャー|クリーチャー[^。]{0,20}を対象/.test(s))c.cardTypesAny=["Creature"];if(/対象の土地|土地[^。]{0,20}を対象/.test(s))c.cardTypesAny=["Land"];return normalize(c);}
function describe(raw){const c=normalize(raw),out=[`${c.min}～${c.dynamicMax?"動的上限":c.max}個`];if(c.relation.sameController)out.push("同じコントローラー");if(c.relation.differentControllers)out.push("異なるコントローラー");if(c.cardTypesAny.length)out.push(c.cardTypesAny.join("/")+"のみ");if(c.cardController!=="any")out.push(`コントローラー:${c.cardController}`);if(c.allocation)out.push(`割り振り合計${c.allocation.total}`);return out.join(" / ");}
function diagnose(){const cards=[{id:"a",controller:"A",ownerRole:"A",zone:"creatures",name:"A",types:["Creature"]},{id:"b",controller:"A",ownerRole:"B",zone:"creatures",name:"B",types:["Creature"]}];const q=validate({targets:{cardIds:["a","b"]},cards,actorRole:"A",config:{min:2,max:2,cardTypesAny:["Creature"],relation:{sameController:true}}});const tests=[{name:"same controller",ok:q.ok},{name:"dynamic max",ok:validate({targets:{cardIds:["a"]},cards,actorRole:"A",context:{xValue:1},config:{min:0,max:9,dynamicMax:{metric:"xValue"}}}).effectiveMax===1},{name:"text parser",ok:parseText("同じプレイヤーがコントロールするクリーチャー最大X体を対象とする").relation.sameController}];return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};}
return{version:VERSION,protocol:PROTOCOL,normalize,validate,parseText,describe,dynamicValue,diagnose};
});
