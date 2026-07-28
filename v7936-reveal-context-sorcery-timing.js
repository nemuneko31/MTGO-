"use strict";

(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CPT_V7936_RULES = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  const VERSION = "7.9.36";
  const PROTOCOL = "cpt-v7.9.36-reveal-context-sorcery-timing";
  const MAIN_PHASES = new Set([3, 9, "3", "9", "Main1", "Main2", "第1メイン", "第2メイン"]);

  const arr = v => Array.isArray(v) ? v : [];
  const str = v => String(v == null ? "" : v).trim();
  const lower = v => str(v).toLowerCase();
  const uniq = xs => [...new Set(arr(xs).map(str).filter(Boolean))];
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const clone = v => { try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; } };

  function selectFace(card, faceIndex){
    const faces = arr(card && card.faces);
    const i = Number.isInteger(Number(faceIndex)) ? Number(faceIndex) : Number(card && card.activeFaceIndex);
    return faces[i] || null;
  }
  function textOf(card, face){
    return [face && face.rulesText, face && face.oracleText, face && face.memo, card && card.rulesText,
      card && card.oracleText, card && card.memo, card && card.text, card && card.typeLine,
      face && face.typeLine, face && face.type].map(str).filter(Boolean).join("\n");
  }
  function typesOf(card, face){
    const raw = [];
    for (const source of [face, card]) {
      if (!source) continue;
      raw.push(...arr(source.types), source.type, source.typeLine, source.cardType, source.supertype, source.subtype);
    }
    const joined = raw.map(str).filter(Boolean).join(" ");
    const known = ["Land","Creature","Instant","Sorcery","Artifact","Enchantment","Planeswalker","Battle","Tribal","Kindred",
      "土地","クリーチャー","インスタント","ソーサリー","アーティファクト","エンチャント","プレインズウォーカー","バトル","同族"];
    const out = [];
    for (const k of known) if (joined.toLowerCase().includes(k.toLowerCase())) out.push(k);
    return uniq(out.length ? out : raw.flatMap(x => str(x).split(/[—\-・\/\s]+/)));
  }
  function hasType(card, face, en, jp){
    const t = [typesOf(card, face).join(" "), textOf(card, face)].join(" ").toLowerCase();
    return t.includes(en.toLowerCase()) || (jp && t.includes(jp));
  }
  function keywordText(card, face){
    const ks = [];
    for (const source of [face, card]) {
      if (!source) continue;
      if (Array.isArray(source.keywords)) ks.push(...source.keywords);
      else if (source.keywords && typeof source.keywords === "object") ks.push(...Object.keys(source.keywords).filter(k => source.keywords[k]));
      ks.push(source.keyword, source.abilitiesText);
    }
    return ks.map(str).filter(Boolean).join(" ") + " " + textOf(card, face);
  }
  function hasFlash(card, face){
    if ((face && (face.flash === true || face.hasFlash === true)) || (card && (card.flash === true || card.hasFlash === true))) return true;
    const s = lower(keywordText(card, face));
    return /(^|[\s,、。・])flash($|[\s,、。・])/.test(s) || s.includes("瞬速");
  }
  function explicitlySorcerySpeed(raw){
    if (!raw) return false;
    if (raw.sorcerySpeed === true || raw.activateOnlyAsSorcery === true || raw.castOnlyAsSorcery === true || raw.onlyAsSorcery === true) return true;
    const timing = lower(raw.timing || raw.timingRestriction || raw.speed);
    if (["sorcery","sorceryspeed","sorcery-speed","mainphase","main-phase"].includes(timing)) return true;
    const s = lower([raw.rulesText, raw.oracleText, raw.memo, raw.resolveNote, raw.costText, raw.text].map(str).join(" "));
    return s.includes("activate only as a sorcery") || s.includes("cast only as a sorcery") ||
      /ソーサリー(?:・|\s*)タイミングでのみ(?:起動|唱)/.test(s) ||
      /ソーサリーとしてのみ(?:起動|唱)/.test(s) ||
      /ソーサリーを唱えられるときにのみ(?:起動|唱)/.test(s);
  }
  function spellRequiresSorcerySpeed(card, face, opts){
    if (opts && opts.timingOverride) return false;
    if (explicitlySorcerySpeed(face) || explicitlySorcerySpeed(card)) return true;
    if (hasType(card, face, "Instant", "インスタント")) return false;
    if (hasFlash(card, face)) return false;
    return true;
  }
  function abilityRequiresSorcerySpeed(card, ability){
    if (!ability) return false;
    const kind = lower(ability.kind);
    if (["triggered","static","replacement","continuous","誘発型","常在型","置換"].includes(kind)) return false;
    return explicitlySorcerySpeed(ability);
  }
  function timingSnapshot(raw){
    const turn = raw && raw.turn || {};
    return {
      actorRole: str(raw && (raw.actorRole || raw.actor || raw.role)),
      active: str(turn.active), phase: turn.phase,
      priority: str(turn.priority), stackDepth: arr(raw && raw.stack).length,
      timingOverride: !!(raw && raw.timingOverride),
    };
  }
  function sorceryWindow(raw){
    const s = timingSnapshot(raw);
    if (s.timingOverride) return { ok:true, reasons:[], ...s };
    const reasons = [];
    if (s.active && s.actorRole && s.active !== s.actorRole) reasons.push("sorceryTimingActivePlayerRequired");
    if (!MAIN_PHASES.has(s.phase)) reasons.push("sorceryTimingMainPhaseRequired");
    if (s.stackDepth !== 0) reasons.push("sorceryTimingStackEmptyRequired");
    if (s.priority && s.actorRole && s.priority !== s.actorRole) reasons.push("priorityRequired");
    return { ok: reasons.length === 0, reasons, ...s };
  }
  function validateSpellTiming(raw){
    const face = raw && (raw.face || selectFace(raw.card, raw.faceIndex));
    const override = !!(raw && raw.timingOverride);
    const priority = timingSnapshot(raw);
    if (!override && priority.priority && priority.actorRole && priority.priority !== priority.actorRole) {
      return { ok:false, reasons:["priorityRequired"], requiresSorcerySpeed:spellRequiresSorcerySpeed(raw && raw.card, face, raw), ...priority };
    }
    const slow = spellRequiresSorcerySpeed(raw && raw.card, face, raw);
    if (!slow) return { ok:true, reasons:[], requiresSorcerySpeed:false, ...priority };
    return { ...sorceryWindow(raw), requiresSorcerySpeed:true };
  }
  function validateAbilityTiming(raw){
    const slow = abilityRequiresSorcerySpeed(raw && raw.card, raw && raw.ability);
    const snap = timingSnapshot(raw);
    if (!slow) return { ok:true, reasons:[], requiresSorcerySpeed:false, ...snap };
    return { ...sorceryWindow(raw), requiresSorcerySpeed:true };
  }

  function manaValue(card){
    for (const v of [card && card.manaValue, card && card.cmc, card && card.mv, card && card.convertedManaCost]) {
      if (Number.isFinite(Number(v))) return Math.max(0, Number(v));
    }
    const cost = str(card && (card.manaCostText || card.manaCost));
    if (!cost) return 0;
    let total = 0;
    for (const token of cost.replace(/[{}]/g," ").split(/[\s/]+/).filter(Boolean)) {
      if (/^\d+$/.test(token)) total += Number(token);
      else if (/^[WUBRGCXYZ]+$/i.test(token)) total += token.toUpperCase().replace(/[XYZ]/g,"").length;
      else if (/^[WUBRGCP]\/[WUBRGCP]$/i.test(token)) total += 1;
    }
    return total;
  }
  function colorsOf(card){
    const raw = [];
    if (Array.isArray(card && card.colors)) raw.push(...card.colors);
    if (Array.isArray(card && card.colorIdentity)) raw.push(...card.colorIdentity);
    if (card && card.color) raw.push(card.color);
    const text = raw.map(str).join(" ").toUpperCase();
    const out = ["W","U","B","R","G"].filter(c => new RegExp(`(^|[^A-Z])${c}([^A-Z]|$)`).test(text) || (text.length <= 5 && text.includes(c)));
    return uniq(out);
  }
  function descriptor(card){
    const face = selectFace(card, card && card.activeFaceIndex);
    const types = typesOf(card, face);
    return {
      id: str(card && card.id), name: str((face && face.name) || (card && card.name)),
      manaValue: manaValue(face || card), colors: colorsOf(face || card), types,
      typeLine: str((face && face.typeLine) || (card && (card.typeLine || card.type))),
    };
  }
  function buildRevealContext(cards, meta){
    const ds = arr(cards).map(descriptor);
    const values = ds.map(x => num(x.manaValue));
    const colors = uniq(ds.flatMap(x => x.colors));
    const types = uniq(ds.flatMap(x => x.types));
    const names = ds.map(x => x.name).filter(Boolean);
    return {
      version: VERSION, at: new Date().toISOString(), public: meta && meta.public !== false,
      sourceCardId: str(meta && meta.sourceCardId), cards: ds, count: ds.length,
      names, uniqueNames: uniq(names), colors, types,
      maxManaValue: values.length ? Math.max(...values) : 0,
      minManaValue: values.length ? Math.min(...values) : 0,
      sumManaValue: values.reduce((a,b)=>a+b,0), distinctNameCount:uniq(names).length,
      distinctColorCount:colors.length, distinctTypeCount:types.length,
    };
  }
  const METRICS = Object.freeze({
    revealedCount:"count", count:"count", maxManaValue:"maxManaValue", minManaValue:"minManaValue",
    sumManaValue:"sumManaValue", distinctNameCount:"distinctNameCount",
    distinctColorCount:"distinctColorCount", distinctTypeCount:"distinctTypeCount",
  });
  function revealMetric(context, variable){
    const key = METRICS[str(variable)] || str(variable);
    return Number.isFinite(Number(context && context[key])) ? Number(context[key]) : null;
  }
  function materializeEffect(effect, context){
    const out = clone(effect || {}), variable = out.v7936Variable;
    if (!variable) return { changed:false, effect:out, value:null };
    const value = revealMetric(context, variable);
    if (value == null) return { changed:false, effect:out, value:null, blocked:true, reason:"revealContextUnavailable" };
    out.amountFixed = value; out.amountMode = "fixed"; out.v7936ResolvedValue = value;
    return { changed:true, effect:out, value };
  }
  function diagnose(){
    const slow = validateSpellTiming({card:{type:"Sorcery"},actorRole:"A",turn:{active:"A",phase:3,priority:"A"},stack:[]});
    const blocked = validateAbilityTiming({card:{},ability:{kind:"activated",timing:"sorcery"},actorRole:"A",turn:{active:"A",phase:4,priority:"A"},stack:[]});
    const ctx = buildRevealContext([{id:"1",name:"A",manaValue:2,colors:["U"],types:["Creature"]},{id:"2",name:"B",manaValue:5,colors:["R"],types:["Sorcery"]}],{public:true});
    const tests = [slow.ok, !blocked.ok && blocked.reasons.includes("sorceryTimingMainPhaseRequired"), ctx.count===2, ctx.maxManaValue===5, ctx.distinctColorCount===2, materializeEffect({v7936Variable:"maxManaValue"},ctx).value===5];
    return {ok:tests.every(Boolean), testsPassed:tests.filter(Boolean).length, testsTotal:tests.length, version:VERSION, protocol:PROTOCOL};
  }
  return {VERSION,PROTOCOL,MAIN_PHASES,selectFace,textOf,typesOf,hasFlash,explicitlySorcerySpeed,spellRequiresSorcerySpeed,
    abilityRequiresSorcerySpeed,timingSnapshot,sorceryWindow,validateSpellTiming,validateAbilityTiming,manaValue,colorsOf,
    descriptor,buildRevealContext,revealMetric,materializeEffect,diagnose};
});
