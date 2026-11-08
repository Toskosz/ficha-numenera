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

function textTooWide(v){
  if (v == null || typeof v === "object") return false;
  return String(v).replace(/\s+/g, " ").trim().length > 80;
}

function textTokens(s){
  return String(s == null ? "" : s).split(/(\s+)/).filter(function(t){ return t.length; });
}

function copyFrontier(v){
  var o = {};
  for (var k in v) o[k] = v[k];
  return o;
}

function myersDiff(a, b){
  var N = a.length, M = b.length;
  if (!N && !M) return [];
  if (!N) return b.map(function(s){ return {t:"+", s:s}; });
  if (!M) return a.map(function(s){ return {t:"-", s:s}; });
  var max = N + M, limit = 400;
  var v = {1: 0};
  var trace = [];
  for (var d = 0; d <= max; d++) {
    if (d > limit) return null;
    for (var k = -d; k <= d; k += 2) {
      var x;
      if (k === -d || (k !== d && (v[k - 1] || 0) < (v[k + 1] || 0))) x = v[k + 1] || 0;
      else x = (v[k - 1] || 0) + 1;
      var y = x - k;
      while (x < N && y < M && a[x] === b[y]) { x++; y++; }
      v[k] = x;
      if (x >= N && y >= M) {
        trace.push(copyFrontier(v));
        return backtrackDiff(trace, a, b);
      }
    }
    trace.push(copyFrontier(v));
  }
  return null;
}

function backtrackDiff(trace, a, b){
  var x = a.length, y = b.length, edits = [];
  for (var d = trace.length - 1; d >= 0; d--) {
    var fv = trace[d];
    var k = x - y;
    var prevK = (k === -d || (k !== d && (fv[k - 1] || 0) < (fv[k + 1] || 0))) ? k + 1 : k - 1;
    var prevX = fv[prevK] || 0;
    var prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      edits.push({t:"=", s:a[x - 1]});
      x--; y--;
    }
    if (d > 0) edits.push(x === prevX ? {t:"+", s:b[y - 1]} : {t:"-", s:a[x - 1]});
    x = prevX;
    y = prevY;
  }
  edits.reverse();
  return edits;
}

function commonEnds(a, b){
  var p = 0, s = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return {p:p, s:s};
}

function tidySnippet(s){
  return s.replace(/[ \t\f\v]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
}

function markSnippet(s, pre, post){
  var max = 360;
  if (s.length > max) {
    var keep = Math.floor((max - 1) / 2);
    s = s.slice(0, keep) + "…" + s.slice(s.length - keep);
  }
  if (pre) s = "… " + s;
  if (post) s = s + " …";
  return s;
}

function groupHunks(ops){
  var CONTEXT = 5, n = ops.length, idxs = [], hunks = [];
  for (var i = 0; i < n; i++) if (ops[i].t !== "=") idxs.push(i);
  if (!idxs.length) return hunks;
  function wordsBetween(from, to){
    var c = 0;
    for (var i = from + 1; i < to; i++) if (ops[i].t === "=" && /\S/.test(ops[i].s)) c++;
    return c;
  }
  var ranges = [], rs = idxs[0], re = idxs[0];
  for (var j = 1; j < idxs.length; j++) {
    if (wordsBetween(re, idxs[j]) <= CONTEXT * 2) re = idxs[j];
    else { ranges.push([rs, re]); rs = re = idxs[j]; }
  }
  ranges.push([rs, re]);
  ranges.forEach(function(r){
    var from = r[0], to = r[1], got = 0;
    while (from > 0 && got < CONTEXT) {
      var prev = ops[from - 1];
      if (prev.t !== "=") break;
      from--;
      if (/\S/.test(prev.s)) got++;
    }
    got = 0;
    while (to < n - 1 && got < CONTEXT) {
      var next = ops[to + 1];
      if (next.t !== "=") break;
      to++;
      if (/\S/.test(next.s)) got++;
    }
    var del = "", add = "";
    for (var i = from; i <= to; i++) {
      if (ops[i].t !== "+") del += ops[i].s;
      if (ops[i].t !== "-") add += ops[i].s;
    }
    var dv = tidySnippet(del), av = tidySnippet(add);
    if (dv === av) return;
    hunks.push({
      del: dv ? markSnippet(dv, from > 0, to < n - 1) : "",
      add: av ? markSnippet(av, from > 0, to < n - 1) : ""
    });
  });
  return hunks;
}

function wordHunks(before, after){
  var a = textTokens(before), b = textTokens(after);
  var ends = commonEnds(a, b);
  if (ends.p === a.length && ends.s === 0 && a.length === b.length) return [];
  var aMid = a.slice(ends.p, a.length - ends.s);
  var bMid = b.slice(ends.p, b.length - ends.s);
  var mid = myersDiff(aMid, bMid);
  if (!mid) {
    mid = aMid.map(function(s){ return {t:"-", s:s}; }).concat(bMid.map(function(s){ return {t:"+", s:s}; }));
  }
  var ops = a.slice(0, ends.p).map(function(s){ return {t:"=", s:s}; })
    .concat(mid)
    .concat((ends.s ? a.slice(a.length - ends.s) : []).map(function(s){ return {t:"=", s:s}; }));
  return groupHunks(ops);
}

function pushTextDiff(label, before, after, lines){
  var b = before == null ? "" : String(before);
  var a = after == null ? "" : String(after);
  var hunks = wordHunks(b, a);
  if (!hunks.length) {
    if (tidySnippet(b) !== tidySnippet(a)) {
      hunks = [{del:markSnippet(tidySnippet(b), false, false), add:markSnippet(tidySnippet(a), false, false)}];
    } else if (b !== a) lines.push(label + ": alterou espaços");
    if (!hunks.length) return;
  }
  var rows = [label];
  hunks.forEach(function(h, i){
    if (i) rows.push("");
    if (h.del) rows.push("− " + h.del);
    if (h.add) rows.push("+ " + h.add);
  });
  lines.push("@@" + rows.join("\n"));
}

function historyLineHtml(line){
  if (typeof line === "string" && line.slice(0, 2) === "@@") {
    var rows = line.slice(2).split("\n");
    var html = '<li class="hdiff"><div class="hdiff-k">' + esc(rows[0]) + "</div>";
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row) { html += '<div class="hdiff-gap"></div>'; continue; }
      var cls = row.slice(0, 2) === "− " ? " del" : row.slice(0, 2) === "+ " ? " add" : "";
      html += '<div class="hdiff-ln' + cls + '">' + esc(row) + "</div>";
    }
    return html + "</li>";
  }
  return "<li>" + esc(line) + "</li>";
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
    var label = cfg.label + " «" + clip(title) + "» · " + f.l;
    if (textTooWide(item[f.k])) pushTextDiff(label, cfg.blank[f.k], item[f.k], lines);
    else lines.push(label + ": " + showField(f, item[f.k]));
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
      var label = cfg.label + " «" + clip(shown) + "» · " + f.l;
      if (textTooWide(b[f.k]) || textTooWide(a[f.k])) pushTextDiff(label, b[f.k], a[f.k], lines);
      else lines.push(label + ": " + showField(f, b[f.k]) + " → " + showField(f, a[f.k]));
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
    if (textTooWide(before[k]) || textTooWide(after[k])) {
      pushTextDiff(SCALAR_LABELS[k], before[k], after[k], lines);
      return;
    }
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
