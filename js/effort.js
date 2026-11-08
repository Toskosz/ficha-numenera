var EFFORT = {stat:null, levels:1, extra:0, allowStatPick:false, source:null};

function rawEffortCost(levels){
  levels = Math.max(0, levels | 0);
  return levels <= 0 ? 0 : 3 + 2 * (levels - 1);
}

function effortPaid(levels, edge, debilitated, extra){
  extra = Math.max(0, extra | 0);
  return Math.max(0, extra + rawEffortCost(levels) - (edge | 0) + (debilitated ? 1 : 0));
}

function parsePoolCost(text){
  var raw = String(text == null ? "" : text).trim();
  if (!raw) return {extra:0, stat:null};
  var s = raw.toLowerCase();
  var stat = null;
  if (/pot[eê]ncia|might/.test(s)) stat = "might";
  else if (/velocidade|speed/.test(s)) stat = "speed";
  else if (/intelecto|intellect/.test(s)) stat = "intellect";
  var m = s.match(/(\d+)/);
  return {extra: m ? +m[1] : 0, stat: stat};
}

function pickDefaultStat(c){
  var best = "might", bestCur = -1;
  STATS.forEach(function(arr){
    var p = c.pools[arr[0]];
    if (p && p.cur > bestCur) { bestCur = p.cur; best = arr[0]; }
  });
  return best;
}

function effortNote(stat, levels, extra, edge, debilitated, paid, source){
  var label = POOL_NAME[stat];
  var n = Math.max(0, levels | 0);
  extra = Math.max(0, extra | 0);
  var total = extra + rawEffortCost(n);
  var action;
  if (n <= 0) action = "custo de habilidade em " + label + (extra ? " (+" + extra + ")" : "");
  else action = (n === 1 ? "1 esforço" : n + " esforços") + " em " + label + (extra ? " (habilidade +" + extra + ")" : "");
  var math = String(total);
  if (edge) math += " − margem " + edge;
  if (debilitated) math += " + debilitado 1";
  math += " = " + (paid ? ("−" + paid) : "0");
  if (source && (source.name || source.label)) {
    return "Usou " + (source.label || "item") + (source.name ? " " + showVal(source.name) : "") + " · " + action + ": " + math;
  }
  if (n > 0) return "Usou " + action + ": " + math;
  return action.charAt(0).toUpperCase() + action.slice(1) + ": " + math;
}

function effortOpts(statOrOpts){
  if (typeof statOrOpts === "string") return {stat: statOrOpts};
  return statOrOpts || {};
}

Object.assign(App, {
  openEffort: function(statOrOpts){
    var c = cur();
    var opts = effortOpts(statOrOpts);
    var stat = opts.stat && c.pools[opts.stat] ? opts.stat : null;
    var allowPick = !!opts.allowStatPick || !stat;
    if (!stat) stat = pickDefaultStat(c);
    if (!c.pools[stat]) return;
    var maxE = Math.max(0, c.effort | 0);
    EFFORT = {
      stat: stat,
      levels: maxE > 0 ? 1 : 0,
      extra: Math.max(0, opts.extra | 0),
      allowStatPick: allowPick,
      source: opts.source || null
    };
    this.refreshEffortForm();
    document.getElementById("effortback").classList.add("show");
    this.refreshEffort();
  },
  refreshEffortForm: function(){
    var source = EFFORT.source;
    var title = source
      ? ("Usar · " + (source.name || source.label || "item"))
      : ("Esforço · " + POOL_NAME[EFFORT.stat]);
    document.getElementById("effort-title").textContent = title;

    var sourceHtml = "";
    if (source) {
      var bits = [source.label, source.detail].filter(Boolean);
      sourceHtml = '<p class="effort-source">' + esc(bits.join(" · ") || "Aplicar esforço") + "</p>";
      if (source.effect && String(source.effect).trim()) {
        sourceHtml += '<p class="effort-effect">' + esc(source.effect) + "</p>";
      }
    }

    var poolHtml = "";
    if (EFFORT.allowStatPick) {
      poolHtml =
        '<div class="mfield"><label>Reserva</label><div class="effort-pools" id="effort-pools">' +
        STATS.map(function(arr){
          return '<button class="step pick" type="button" data-stat="' + arr[0] + '" onclick="App.setEffortStat(\'' + arr[0] + '\')">' + esc(arr[1]) + "</button>";
        }).join("") +
        "</div></div>";
    }

    document.getElementById("effort-body").innerHTML =
      sourceHtml + poolHtml +
      '<div class="mfield"><label>Níveis de esforço</label><div class="effort-stepper">' +
      '<button class="step" type="button" onclick="App.nudgeEffort(-1)">−</button>' +
      '<span class="n" id="effort-n">1</span>' +
      '<button class="step" type="button" onclick="App.nudgeEffort(1)">+</button>' +
      '<span class="mx" id="effort-max"></span></div></div>' +
      '<div class="mfield"><label>Custo extra da habilidade</label>' +
      '<input id="effort-extra" class="fld" type="number" min="0" value="' + EFFORT.extra + '" oninput="App.setEffortExtra(+this.value||0)"></div>' +
      '<div class="effort-math" id="effort-math"></div>';
  },
  renderEffortLimit: function(){
    var back = document.getElementById("effortback");
    if (!back || !back.classList.contains("show") || !EFFORT.stat) return;
    var maxE = Math.max(0, cur().effort | 0);
    if (EFFORT.levels > maxE) EFFORT.levels = maxE;
    this.refreshEffort();
  },
  closeEffort: function(){
    document.getElementById("effortback").classList.remove("show");
    EFFORT.stat = null;
    EFFORT.source = null;
  },
  effortBackClick: function(e){
    if (e.target.id === "effortback") this.closeEffort();
  },
  setEffortStat: function(stat){
    if (!cur().pools[stat]) return;
    EFFORT.stat = stat;
    this.refreshEffort();
  },
  nudgeEffort: function(d){
    var maxE = Math.max(0, cur().effort | 0);
    EFFORT.levels = Math.max(0, Math.min(maxE, EFFORT.levels + d));
    this.refreshEffort();
  },
  setEffortExtra: function(v){
    EFFORT.extra = Math.max(0, v | 0);
    this.refreshEffort();
  },
  refreshEffort: function(){
    if (!EFFORT.stat) return;
    var c = cur();
    var p = c.pools[EFFORT.stat];
    var maxE = Math.max(0, c.effort | 0);
    var deb = c.damage === 1;
    var raw = rawEffortCost(EFFORT.levels);
    var paid = effortPaid(EFFORT.levels, p.edge, deb, EFFORT.extra);
    var nEl = document.getElementById("effort-n");
    if (nEl) nEl.textContent = EFFORT.levels;
    var mEl = document.getElementById("effort-max");
    if (mEl) mEl.textContent = maxE ? "máx. " + maxE : "sem esforço";
    document.querySelectorAll("#effort-pools .pick").forEach(function(btn){
      btn.classList.toggle("on", btn.getAttribute("data-stat") === EFFORT.stat);
    });
    var math = document.getElementById("effort-math");
    if (math) {
      var lines = [];
      if (EFFORT.levels) lines.push(["Esforço (" + EFFORT.levels + ")", "+" + raw]);
      if (EFFORT.extra) lines.push(["Habilidade", "+" + EFFORT.extra]);
      if (!lines.length) lines.push(["Custo", "0"]);
      if (p.edge) lines.push(["Margem", "−" + p.edge]);
      if (deb) lines.push(["Debilitado", "+1"]);
      math.innerHTML = lines.map(function(r){
        return '<div class="line"><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + "</span></div>";
      }).join("") +
        '<div class="pay"><span>A pagar em ' + esc(POOL_NAME[EFFORT.stat]) + "</span><span>" + paid + "</span></div>" +
        '<div class="hint">O primeiro nível custa 3; cada extra custa 2. A margem reduz o total.</div>';
    }
    var go = document.getElementById("effort-go");
    if (go) {
      var empty = EFFORT.levels <= 0 && EFFORT.extra <= 0;
      go.disabled = empty;
      go.textContent = empty ? "Gastar" : (paid ? ("Gastar · −" + paid) : "Gastar · sem custo");
    }
  },
  spendEffort: function(){
    if (!EFFORT.stat) return;
    var c = cur();
    var stat = EFFORT.stat;
    var p = c.pools[stat];
    if (EFFORT.levels <= 0 && EFFORT.extra <= 0) { toast("Nada para gastar"); return; }
    var deb = c.damage === 1;
    var paid = effortPaid(EFFORT.levels, p.edge, deb, EFFORT.extra);
    if (paid > p.cur) {
      toast(POOL_NAME[stat] + " insuficiente (precisa " + paid + ", tem " + p.cur + ")");
      return;
    }
    noteChange(effortNote(stat, EFFORT.levels, EFFORT.extra, p.edge, deb, paid, EFFORT.source));
    p.cur = Math.max(0, p.cur - paid);
    this.autoDamage();
    commit();
    this.renderPools();
    this.closeEffort();
    toast(paid ? ("−" + paid + " de " + POOL_NAME[stat]) : "Esforço sem custo");
  },
  useItem: function(key, i){
    var cfg = LISTS[key];
    var o = cur()[key][i];
    if (!cfg || !o) return;
    var parsed = parsePoolCost(o.cost);
    var name = cfg.name(o);
    this.openEffort({
      stat: parsed.stat,
      extra: parsed.extra,
      allowStatPick: !parsed.stat,
      source: {
        kind: key,
        label: cfg.label,
        name: name,
        detail: o.cost || o.mod || ""
      }
    });
  },
  useSkill: function(i){
    var s = cur().skills[i];
    if (!s) return;
    this.openEffort({
      allowStatPick: true,
      source: {
        kind: "skills",
        label: "Perícia",
        name: s.name || "sem nome",
        detail: skillLevelLabel(s.level),
        effect: s.desc || ""
      }
    });
  }
});
