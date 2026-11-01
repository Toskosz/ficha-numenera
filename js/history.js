function snapshotOf(c){
  var o = JSON.parse(JSON.stringify(c));
  delete o.history;
  return o;
}

function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }

function changed(a, b){
  if (a === b) return false;
  if ((a == null || a === "") && (b == null || b === "")) return false;
  if (a != null && b != null && typeof a !== "object" && typeof b !== "object" && String(a) === String(b)) return false;
  return true;
}

function clip(v){
  var s = String(v == null ? "" : v).replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}

function num(v){
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && isFinite(Number(v))) return Number(v);
  return v;
}

function showVal(v){
  if (v == null || v === "") return "—";
  if (typeof v === "number" && isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "sim" : "não";
  var s = clip(v);
  return s ? "«" + s + "»" : "—";
}

function showField(f, v){
  if (f && f.t === "num") {
    if (v == null || String(v).trim() === "") return "—";
    return showVal(num(v));
  }
  return showVal(v);
}

function trimHistory(c){
  if (c.history.length > HIST_MAX) c.history.splice(0, c.history.length - HIST_MAX);
}

function recordChanges(){
  var c = cur();
  if (!c) return;
  if (!Array.isArray(c.history)) c.history = [];
  if (snapId !== c.id || !snap) {
    snapId = c.id;
    snap = snapshotOf(c);
    if (pendingNotes.length) {
      c.history.push({t:Date.now(), lines:pendingNotes.slice()});
      pendingNotes = [];
      trimHistory(c);
    }
    return;
  }
  var next = snapshotOf(c);
  var lines = diffChar(snap, next);
  var merged = pendingNotes.concat(lines).filter(Boolean);
  pendingNotes = [];
  if (merged.length) {
    c.history.push({t:Date.now(), lines:merged});
    trimHistory(c);
  }
  snap = next;
}

function findInsert(before, after){
  if (after.length !== before.length + 1) return -1;
  for (var i = 0; i < after.length; i++) {
    if (same(after.slice(0, i).concat(after.slice(i + 1)), before)) return i;
  }
  return -1;
}

function findRemove(before, after){
  if (before.length !== after.length + 1) return -1;
  for (var i = 0; i < before.length; i++) {
    if (same(before.slice(0, i).concat(before.slice(i + 1)), after)) return i;
  }
  return -1;
}

function itemTitle(o){
  var n = o && o.name != null ? String(o.name).trim() : "";
  return n || "sem nome";
}

function skillLevelLabel(v){
  if (v === "T") return "Treinado";
  if (v === "E") return "Especializado";
  return "sem treinamento";
}

function pushSkillAdded(s, lines){
  var name = (s && s.name || "").trim();
  var line = "Adicionou perícia" + (name ? " " + showVal(name) : "");
  if (s && s.level) line += " (" + skillLevelLabel(s.level) + ")";
  lines.push(line);
}

function diffSkills(before, after, lines){
  var ins = findInsert(before, after);
  if (ins >= 0) { pushSkillAdded(after[ins], lines); return; }
  var rem = findRemove(before, after);
  if (rem >= 0) { lines.push("Removeu perícia " + showVal(before[rem].name || "sem nome")); return; }
  var n = Math.min(before.length, after.length);
  for (var i = 0; i < n; i++) {
    if (same(before[i], after[i])) continue;
    var b = before[i], a = after[i];
    var who = a.name || b.name || "sem nome";
    if (changed(b.name, a.name)) lines.push("Perícia «" + clip(who) + "» · Nome: " + showVal(b.name) + " → " + showVal(a.name));
    if (changed(b.level, a.level)) lines.push("Perícia «" + clip(who) + "»: " + skillLevelLabel(b.level) + " → " + skillLevelLabel(a.level));
  }
  for (var j = n; j < after.length; j++) pushSkillAdded(after[j], lines);
  for (var k = n; k < before.length; k++) lines.push("Removeu perícia " + showVal(before[k].name || "sem nome"));
}

function pushItemFields(key, item, lines, title){
  var cfg = LISTS[key];
  (cfg.fields || []).forEach(function(f){
    if (f.k === "name") return;
    if (!changed(cfg.blank[f.k], item[f.k])) return;
    lines.push(cfg.label + " «" + clip(title) + "» · " + f.l + ": " + showField(f, item[f.k]));
  });
}

function diffList(key, before, after, lines){
  var cfg = LISTS[key];
  var ins = findInsert(before, after);
  if (ins >= 0) {
    var item = after[ins], title = itemTitle(item);
    lines.push("Adicionou " + cfg.label + (title !== "sem nome" ? " " + showVal(title) : ""));
    pushItemFields(key, item, lines, title);
    return;
  }
  var rem = findRemove(before, after);
  if (rem >= 0) { lines.push("Removeu " + cfg.label + " " + showVal(itemTitle(before[rem]))); return; }
  var n = Math.min(before.length, after.length);
  for (var i = 0; i < n; i++) {
    if (same(before[i], after[i])) continue;
    var b = before[i], a = after[i];
    var shownTitle = itemTitle(a.name ? a : b);
    (cfg.fields || []).forEach(function(f){
      if (!changed(b[f.k], a[f.k])) return;
      var shown = f.k === "name" ? itemTitle(b.name ? b : a) : shownTitle;
      lines.push(cfg.label + " «" + clip(shown) + "» · " + f.l + ": " + showField(f, b[f.k]) + " → " + showField(f, a[f.k]));
    });
  }
  for (var j = n; j < after.length; j++) {
    var addedTitle = itemTitle(after[j]);
    lines.push("Adicionou " + cfg.label + (addedTitle !== "sem nome" ? " " + showVal(addedTitle) : ""));
    pushItemFields(key, after[j], lines, addedTitle);
  }
  for (var k = n; k < before.length; k++) lines.push("Removeu " + cfg.label + " " + showVal(itemTitle(before[k])));
}

function diffChar(before, after){
  var lines = [];
  Object.keys(SCALAR_LABELS).forEach(function(k){
    if (!changed(before[k], after[k])) return;
    var fk = ({tier:1, effort:1, xp:1, shins:1, cypherLimit:1})[k] ? {t:"num"} : null;
    lines.push(SCALAR_LABELS[k] + ": " + showField(fk, before[k]) + " → " + showField(fk, after[k]));
  });
  if (changed(before.portrait, after.portrait)) {
    if (!after.portrait) lines.push("Removeu a ilustração");
    else if (!before.portrait) lines.push("Adicionou uma ilustração");
    else lines.push("Trocou a ilustração");
  }
  if (changed(before.damage, after.damage)) {
    lines.push("Marcador de dano: " + (DMG_NAME[before.damage] || showVal(before.damage)) + " → " + (DMG_NAME[after.damage] || showVal(after.damage)));
  }
  ["might","speed","intellect"].forEach(function(stat){
    var b = (before.pools && before.pools[stat]) || {};
    var a = (after.pools && after.pools[stat]) || {};
    [["cur","atual"],["max","reserva"],["edge","margem"]].forEach(function(pair){
      if (!changed(b[pair[0]], a[pair[0]])) return;
      lines.push(POOL_NAME[stat] + " (" + pair[1] + "): " + showVal(num(b[pair[0]])) + " → " + showVal(num(a[pair[0]])));
    });
  });
  var bu = (before.recovery && before.recovery.used) || [];
  var au = (after.recovery && after.recovery.used) || [];
  for (var i = 0; i < RECOV.length; i++) {
    if (!!bu[i] === !!au[i]) continue;
    lines.push("Recuperação (" + RECOV[i] + "): " + (bu[i] ? "usada" : "livre") + " → " + (au[i] ? "usada" : "livre"));
  }
  diffSkills(before.skills || [], after.skills || [], lines);
  LIST_KEYS.forEach(function(key){ diffList(key, before[key] || [], after[key] || [], lines); });
  var known = {id:1, portrait:1, pools:1, recovery:1, damage:1, skills:1};
  Object.keys(SCALAR_LABELS).forEach(function(k){ known[k] = 1; });
  LIST_KEYS.forEach(function(k){ known[k] = 1; });
  Object.keys(after).forEach(function(k){
    if (known[k]) return;
    if (!same(before[k], after[k])) lines.push("Alterou " + k);
  });
  return lines;
}
