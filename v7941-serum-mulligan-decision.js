"use strict";

(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CPT_V7941_OPENING=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const VERSION="7.9.41";
  const PROTOCOL="cpt-v7.9.41-serum-mulligan-decision";
  const arr=v=>Array.isArray(v)?v:[];
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const clone=v=>JSON.parse(JSON.stringify(v));
  function shuffled(cards,random){
    const out=arr(cards).map(clone),rnd=typeof random==="function"?random:Math.random;
    for(let i=out.length-1;i>0;i--){
      const j=Math.max(0,Math.min(i,Math.floor(Number(rnd())*(i+1))));
      [out[i],out[j]]=[out[j],out[i]];
    }
    return out;
  }
  function makeState(cards,random){
    const library=shuffled(cards,random),hand=library.splice(0,Math.min(7,library.length));
    return{library,hand,exiled:[],bottom:[],mulliganCount:0,serumPowderCount:0,pendingBottom:0,total:library.length+hand.length,history:["初手7枚を引いた"]};
  }
  function normalMulligan(raw,random){
    const s=clone(raw||{});
    if(num(s.pendingBottom)>0)return{ok:false,reason:"bottomPending",state:s};
    s.library=arr(s.library).concat(arr(s.hand));
    s.hand=[];
    s.library=shuffled(s.library,random);
    s.mulliganCount=Math.max(0,Math.trunc(num(s.mulliganCount)))+1;
    s.bottom=[];
    if(s.library.length<7)return{ok:false,reason:"libraryTooSmall",state:s};
    s.hand=s.library.splice(0,7);
    s.pendingBottom=Math.min(s.mulliganCount,s.hand.length);
    arr(s.history).push(`通常マリガン${s.mulliganCount}回目: 7枚を引き、${s.pendingBottom}枚のボトム選択へ`);
    return{ok:true,state:s,pendingBottom:s.pendingBottom};
  }
  function uniqueIndices(indices){
    return[...new Set(arr(indices).map(x=>Math.trunc(num(x))))];
  }
  function confirmBottom(raw,indices){
    const s=clone(raw||{}),need=Math.max(0,Math.trunc(num(s.pendingBottom))),idx=uniqueIndices(indices);
    if(need<=0)return{ok:false,reason:"bottomNotPending",state:s};
    if(idx.length!==need)return{ok:false,reason:"bottomCountInvalid",state:s};
    if(idx.some(i=>i<0||i>=arr(s.hand).length))return{ok:false,reason:"bottomIndexInvalid",state:s};
    const set=new Set(idx),picked=idx.map(i=>s.hand[i]),kept=s.hand.filter((_,i)=>!set.has(i));
    s.hand=kept;
    s.library=arr(s.library);
    for(const c of picked)s.library.push(c);
    s.bottom=picked;
    s.pendingBottom=0;
    arr(s.history).push(`${picked.length}枚をライブラリー下へ置き、手札${kept.length}枚で次の判断へ`);
    return{ok:true,state:s,picked,kept};
  }
  function useSerumPowder(raw,isSerum){
    const s=clone(raw||{});
    if(num(s.pendingBottom)>0)return{ok:false,reason:"bottomPending",state:s};
    const test=typeof isSerum==="function"?isSerum:c=>String(c&&c.name||"").trim().toLowerCase()==="serum powder"||String(c&&c.name||"").trim()==="血清の粉末";
    if(!arr(s.hand).some(test))return{ok:false,reason:"serumPowderMissing",state:s};
    const n=arr(s.hand).length;
    if(arr(s.library).length<n)return{ok:false,reason:"libraryTooSmall",state:s};
    const ex=arr(s.hand);
    s.exiled=arr(s.exiled).concat(ex);
    s.hand=arr(s.library).splice(0,n);
    s.serumPowderCount=Math.max(0,Math.trunc(num(s.serumPowderCount)))+1;
    arr(s.history).push(`血清の粉末${s.serumPowderCount}回目: 手札${n}枚を追放し${n}枚引いた`);
    return{ok:true,state:s,exiled:ex,drawn:s.hand};
  }
  function decisionModel(raw,isSerum){
    const s=raw||{},pending=Math.max(0,Math.trunc(num(s.pendingBottom))),handCount=arr(s.hand).length,mulls=Math.max(0,Math.trunc(num(s.mulliganCount)));
    const test=typeof isSerum==="function"?isSerum:c=>String(c&&c.name||"").trim().toLowerCase()==="serum powder"||String(c&&c.name||"").trim()==="血清の粉末";
    const hasSerum=arr(s.hand).some(test),canSerum=pending===0&&hasSerum&&arr(s.library).length>=handCount;
    return{stage:pending>0?"bottom":"decision",handCount,mulliganCount:mulls,pendingBottom:pending,nextMulliganCount:mulls+1,hasSerum,canSerum,serumDrawCount:canSerum?handCount:0,keepLabel:`この${handCount}枚をキープ`,mulliganLabel:`通常マリガン（${mulls+1}回目）`,serumLabel:"《血清の粉末》を使用"};
  }
  function totalsOk(s){return arr(s&&s.library).length+arr(s&&s.hand).length+arr(s&&s.exiled).length===Math.max(0,Math.trunc(num(s&&s.total)));}
  function diagnose(){
    const cards=Array.from({length:60},(_,i)=>({id:String(i),name:i===0?"Serum Powder":`C${i}`}));
    const initial=makeState(cards,()=>0.25),m1=normalMulligan(initial,()=>0.75),b1=confirmBottom(m1.state,[0]);
    const withPowder={...b1.state,hand:[{id:"sp",name:"Serum Powder"},...b1.state.hand.slice(1)]};
    const powder=useSerumPowder(withPowder);
    const tests=[
      {name:"first mulligan draws seven",ok:m1.ok&&m1.state.hand.length===7},
      {name:"first mulligan immediately requires one bottom",ok:m1.state.pendingBottom===1},
      {name:"bottom leaves six",ok:b1.ok&&b1.state.hand.length===6&&b1.state.pendingBottom===0},
      {name:"powder after first mulligan exiles six",ok:powder.ok&&powder.exiled.length===6&&powder.state.hand.length===6},
      {name:"powder does not add mulligan",ok:powder.state.mulliganCount===1},
      {name:"decision stage is explicit",ok:decisionModel(b1.state).stage==="decision"},
      {name:"totals remain valid",ok:totalsOk(powder.state)}
    ];
    return{version:VERSION,protocol:PROTOCOL,ok:tests.every(x=>x.ok),tests};
  }
  return{VERSION,PROTOCOL,makeState,normalMulligan,confirmBottom,useSerumPowder,decisionModel,totalsOk,diagnose};
});

(function(){
  "use strict";
  if(typeof window==="undefined"||typeof document==="undefined"||!globalThis.CPT_V7941_OPENING)return;
  try{
    document.body.dataset.v7941="serum-mulligan-decision-ui";
    document.title="カードゲーム練習卓 v7.9.41 血清の粉末・初手判断UI";
  }catch(_){ }
  globalThis.CPT_V7941_CLIENT={
    version:globalThis.CPT_V7941_OPENING.VERSION,
    protocol:globalThis.CPT_V7941_OPENING.PROTOCOL,
    diagnose:globalThis.CPT_V7941_OPENING.diagnose
  };
})();
