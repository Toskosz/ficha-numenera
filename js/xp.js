var XPUI = {view:"list", alloc:{might:0, speed:0, intellect:0}, edge:"", skill:"", skillDesc:""};

var XP_STEPS = [
  {key:"pools", view:"pools", title:"Aumentar Capacidades", desc:"Adiciona 4 pontos novos para distribuir entre Potência, Velocidade e Intelecto."},
  {key:"edge", view:"edge", title:"Rumo à Perfeição", desc:"Adiciona +1 à Margem de Potência, Velocidade ou Intelecto, à sua escolha."},
  {key:"effort", view:"effort", title:"Esforço Extra", desc:"Aumenta o limite máximo de Esforço em +1."},
  {key:"skill", view:"options", title:"Perícias ou Opções Especiais", desc:"Treinado numa perícia nova, ou especializado se já for treinado. No lugar disso: aliviar armadura, +2 na recuperação ou uma habilidade de Tipo."}
];

function ensureAdvances(c){
  var a = c.advances;
  if (!a || typeof a !== "object" || Array.isArray(a)) a = {};
  c.advances = {
    pools: a.pools === true,
    edge: a.edge === true,
    effort: a.effort === true,
    skill: a.skill === true
  };
  return c.advances;
}

function advanceCount(a){
  return ["pools", "edge", "effort", "skill"].filter(function(k){ return a[k]; }).length;
}

function xpBlockReason(key){
  var c = cur();
  var a = ensureAdvances(c);
  if ((c.tier | 0) >= 6) return "Grau máximo";
  if (a[key]) return "Já adquirido neste Grau";
  if ((c.xp | 0) < 4) {
    var miss = 4 - (c.xp | 0);
    return miss === 1 ? "Falta 1 XP" : ("Faltam " + miss + " XP");
  }
  return "";
}

function allocSum(){
  return (XPUI.alloc.might | 0) + (XPUI.alloc.speed | 0) + (XPUI.alloc.intellect | 0);
}

function findSkillIndex(name){
  var n = String(name || "").trim().toLowerCase();
  if (!n) return -1;
  var skills = cur().skills || [];
  for (var i = 0; i < skills.length; i++) {
    if (String(skills[i].name || "").trim().toLowerCase() === n) return i;
  }
  return -1;
}

function skillOutcome(name){
  var n = String(name || "").trim();
  if (!n) return {text:"Uma perícia nova fica Treinada. Se ela já for Treinada, passa a Especializada.", blocked:""};
  var i = findSkillIndex(n);
  if (i < 0) return {text:"«" + n + "» será Treinada.", blocked:""};
  var s = cur().skills[i];
  var label = s.name || n;
  if (s.level === "E") return {text:"«" + label + "» já é Especializada. Escolha outra.", blocked:"Já especializada"};
  if (s.level === "T") return {text:"«" + label + "» passará de Treinada para Especializada.", blocked:""};
  return {text:"«" + label + "» passará a ser Treinada.", blocked:""};
}

function typeAbilityPhrase(type){
  if (type === "Glaive") return "manobra de combate";
  if (type === "Nano") return "esoterismo";
  if (type === "Jack") return "truque de ofício";
  return "habilidade de Tipo";
}

function xpFoot(back, action, label, disabled){
  return '<button class="btn ghost" type="button" onclick="App.xpGo(\'' + back + '\')">Voltar</button>' +
    '<button class="btn prim" type="button"' + (disabled ? " disabled" : "") + " onclick=\"" + action + "\">" + esc(label) + "</button>";
}

Object.assign(App, {
  renderXp: function(){
    var el = document.getElementById("xp-meta");
    if (!el || !DB.current || !DB.list[DB.current]) return;
    var c = cur();
    var a = ensureAdvances(c);
    var n = advanceCount(a);
    var tier = c.tier | 0;
    var sub = "4 XP cada";
    if (tier >= 6) sub = "Grau máximo";
    else if (n === 3) sub = "o próximo sobe o Grau";
    else if (n > 0) sub = n + "/4 passos";
    el.innerHTML = '<span class="xp-pips">' + XP_STEPS.map(function(s){
      return '<i class="' + (a[s.key] ? "on" : "") + '" title="' + esc(s.title + (a[s.key] ? " — adquirido" : " — 4 XP")) + '"></i>';
    }).join("") + '</span><span class="xp-sub">' + esc(sub) + "</span>";
  },
  openXp: function(){
    ensureAdvances(cur());
    XPUI.view = "list";
    document.getElementById("xpback").classList.add("show");
    this.renderXpModal();
  },
  closeXp: function(){
    var back = document.getElementById("xpback");
    if (back) back.classList.remove("show");
  },
  xpBackClick: function(e){
    if (e.target.id === "xpback") this.closeXp();
  },
  xpGo: function(view){
    XPUI.view = view;
    if (view === "pools") XPUI.alloc = {might:0, speed:0, intellect:0};
    if (view === "edge") XPUI.edge = "";
    if (view === "skill") { XPUI.skill = ""; XPUI.skillDesc = ""; }
    this.renderXpModal();
  },
  xpAlloc: function(stat, d){
    if (!XPUI.alloc || XPUI.alloc[stat] == null) return;
    var n = XPUI.alloc[stat] | 0;
    if (d > 0 && allocSum() >= 4) return;
    if (d < 0 && n <= 0) return;
    XPUI.alloc[stat] = n + d;
    this.renderXpModal();
  },
  xpPickEdge: function(stat){
    if (!cur().pools[stat]) return;
    XPUI.edge = stat;
    this.renderXpModal();
  },
  xpSkillDesc: function(v){
    XPUI.skillDesc = v;
  },
  xpSkillInput: function(v){
    XPUI.skill = v;
    var info = skillOutcome(v);
    var preview = document.getElementById("xp-skill-preview");
    if (preview) preview.textContent = info.text;
    var go = document.getElementById("xp-go");
    var reason = xpBlockReason("skill");
    if (go) {
      var label = reason || (!String(v || "").trim() ? "Diga a perícia" : (info.blocked || "Gastar 4 XP"));
      go.disabled = !!(reason || !String(v || "").trim() || info.blocked);
      go.textContent = label;
    }
  },
  renderXpModal: function(){
    var titles = {
      list:"Gastar XP",
      pools:"Aumentar Capacidades",
      edge:"Rumo à Perfeição",
      effort:"Esforço Extra",
      options:"Perícias ou Opções",
      skill:"Perícia",
      armor:"Reduzir custo de armadura",
      recovery:"Melhorar recuperação",
      ability:"Nova habilidade de Tipo"
    };
    document.getElementById("xp-title").textContent = titles[XPUI.view] || "Gastar XP";
    var body = "";
    var foot = '<button class="btn ghost" type="button" onclick="App.closeXp()">Fechar</button>';
    if (XPUI.view === "list") body = this.xpListHtml();
    else if (XPUI.view === "pools") { body = this.xpPoolsHtml(); foot = this.xpPoolsFoot(); }
    else if (XPUI.view === "edge") { body = this.xpEdgeHtml(); foot = this.xpEdgeFoot(); }
    else if (XPUI.view === "effort") { body = this.xpEffortHtml(); foot = this.xpSimpleFoot("effort", "App.buyEffort()"); }
    else if (XPUI.view === "options") { body = this.xpOptionsHtml(); foot = '<button class="btn ghost" type="button" onclick="App.xpGo(\'list\')">Voltar</button>'; }
    else if (XPUI.view === "skill") { body = this.xpSkillHtml(); foot = this.xpSkillFoot(); }
    else if (XPUI.view === "armor") { body = this.xpArmorHtml(); foot = this.xpSimpleFoot("skill", "App.buyArmorEase()"); }
    else if (XPUI.view === "recovery") { body = this.xpRecoveryHtml(); foot = this.xpSimpleFoot("skill", "App.buyRecovery()"); }
    else if (XPUI.view === "ability") { body = this.xpAbilityHtml(); foot = this.xpSimpleFoot("skill", "App.buyAbility()"); }
    document.getElementById("xp-body").innerHTML = body;
    document.getElementById("xp-foot").innerHTML = foot;
  },
  xpListHtml: function(){
    var c = cur();
    var a = ensureAdvances(c);
    var n = advanceCount(a);
    var xp = c.xp | 0;
    var tier = c.tier | 0;
    var html = '<p class="xp-note">Para subir de Grau, adquira <b>4 passos</b>. Cada um custa <b>4 XP</b> (16 no total). A ordem é livre, mas só <b>um de cada tipo</b> por Grau. Você tem <b>' + xp + " XP</b>.</p>";
    if (tier >= 6) {
      html += '<p class="xp-call">O Grau 6 é o máximo. Estes passos servem para avançar, e não há Grau 7.</p>';
    } else if (n === 3) {
      html += '<p class="xp-call">O próximo passo sobe o personagem para o Grau ' + (tier + 1) + " e libera as habilidades novas do Tipo e do Foco.</p>";
    } else {
      html += '<p class="xp-call">No quarto passo o personagem avança de Grau e desbloqueia as habilidades do Tipo e do Foco. Passos deste Grau: ' + n + "/4.</p>";
    }
    html += XP_STEPS.map(function(s){
      var done = !!a[s.key];
      var locked = tier >= 6 && !done;
      var tag = done || locked ? "div" : "button";
      var cost = done ? "adquirido" : (locked ? "máximo" : "4 XP");
      var cls = "xp-opt" + (done ? " done" : "") + (locked ? " locked" : "");
      var open = tag === "button" ? (' type="button" onclick="App.xpGo(\'' + s.view + '\')"') : "";
      return "<" + tag + ' class="' + cls + '"' + open + ">" +
        '<span class="top"><span class="t">' + esc(s.title) + '</span><span class="cost">' + cost + "</span></span>" +
        '<span class="d">' + esc(s.desc) + "</span></" + tag + ">";
    }).join("");
    return html;
  },
  xpPoolsHtml: function(){
    var c = cur();
    var left = 4 - allocSum();
    var rows = STATS.map(function(s){
      var n = XPUI.alloc[s[0]] | 0;
      var p = c.pools[s[0]];
      return '<div class="xp-row"><div><span class="nm" style="color:var(' + s[2] + ')">' + esc(s[1]) + '</span><span class="now">máx. ' + (p.max | 0) + (n ? " → " + ((p.max | 0) + n) : "") + "</span></div>" +
        '<div class="xp-step"><button class="step" type="button" onclick="App.xpAlloc(\'' + s[0] + '\',-1)">−</button><span class="n">' + n + '</span><button class="step" type="button" onclick="App.xpAlloc(\'' + s[0] + '\',1)">+</button></div></div>';
    }).join("");
    return '<p class="xp-note">Some <b>4 pontos</b> às Reservas, divididos como quiser. O máximo e o valor atual sobem juntos.</p>' +
      rows +
      '<div class="xp-left"><span>Pontos restantes</span><b>' + left + "</b></div>";
  },
  xpPoolsFoot: function(){
    var reason = xpBlockReason("pools");
    var sum = allocSum();
    var label = reason || (sum === 4 ? "Gastar 4 XP" : "Distribua os 4 pontos");
    return xpFoot("list", "App.buyPools()", label, !!(reason || sum !== 4));
  },
  xpEdgeHtml: function(){
    var c = cur();
    var picks = STATS.map(function(s){
      var edge = c.pools[s[0]].edge | 0;
      var on = XPUI.edge === s[0];
      return '<button class="pick' + (on ? " on" : "") + '" type="button" onclick="App.xpPickEdge(\'' + s[0] + '\')"><span>' + esc(s[1]) + '</span><span class="sub">Margem ' + edge + " → " + (edge + 1) + "</span></button>";
    }).join("");
    return '<p class="xp-note">Escolha uma Margem para receber <b>+1</b>.</p><div class="xp-picks">' + picks + "</div>";
  },
  xpEdgeFoot: function(){
    var reason = xpBlockReason("edge");
    var label = reason || (XPUI.edge ? "Gastar 4 XP" : "Escolha uma Margem");
    return xpFoot("list", "App.buyEdge()", label, !!(reason || !XPUI.edge));
  },
  xpEffortHtml: function(){
    var n = cur().effort | 0;
    return '<p class="xp-note">O limite de Esforço sobe de <b>' + n + "</b> para <b>" + (n + 1) + "</b>. Com ele mais alto, dá para aplicar mais esforço numa mesma ação.</p>";
  },
  xpOptionsHtml: function(){
    var opts = [
      {view:"skill", title:"Perícia", desc:"Treinado em uma perícia nova. Se você já for treinado nela, fica especializado."},
      {view:"armor", title:"Reduzir custo de armadura", desc:"Diminui em 1 o custo de Potência por hora e em 1 a redução de Velocidade da armadura."},
      {view:"recovery", title:"Melhorar recuperação", desc:"Soma +2 a todos os testes de recuperação."},
      {view:"ability", title:"Nova habilidade de Tipo", desc:"Uma " + typeAbilityPhrase(cur().type) + " do Grau atual ou de um Grau inferior."}
    ];
    return '<p class="xp-note">Este passo vale <b>4 XP</b>. Escolha a perícia ou uma das alternativas — só uma delas neste Grau.</p>' +
      opts.map(function(o){
        return '<button class="xp-opt" type="button" onclick="App.xpGo(\'' + o.view + '\')"><span class="top"><span class="t">' + esc(o.title) + '</span></span><span class="d">' + esc(o.desc) + "</span></button>";
      }).join("");
  },
  xpSkillHtml: function(){
    var info = skillOutcome(XPUI.skill);
    return '<p class="xp-note">O nome pode ser novo ou uma perícia que você já tenha.</p>' +
      '<div class="mfield"><label>Perícia</label><input id="xp-skill" class="fld" list="dl-skills" value="' + esc(XPUI.skill) + '" placeholder="ex: Esgueirar" oninput="App.xpSkillInput(this.value)"></div>' +
      '<div class="mfield"><label>Efeito</label><textarea id="xp-skill-desc" class="fld" style="min-height:72px" placeholder="O que esta perícia facilita ou altera" oninput="App.xpSkillDesc(this.value)">' + esc(XPUI.skillDesc) + "</textarea></div>" +
      '<p class="xp-preview" id="xp-skill-preview">' + esc(info.text) + "</p>";
  },
  xpSkillFoot: function(){
    var info = skillOutcome(XPUI.skill);
    var reason = xpBlockReason("skill");
    var empty = !String(XPUI.skill || "").trim();
    var label = reason || (empty ? "Diga a perícia" : (info.blocked || "Gastar 4 XP"));
    return xpFoot("options", "App.buySkill()", label, !!(reason || empty || info.blocked)).replace('class="btn prim"', 'class="btn prim" id="xp-go"');
  },
  xpArmorHtml: function(){
    var n = Math.max(0, cur().armorEase | 0);
    return '<p class="xp-note">Cada peça passa a custar <b>1 Potência a menos por hora</b> e a reduzir <b>1 a menos</b> a Reserva de Velocidade (mínimo 0). O alívio vai de <b>−' + n + "</b> para <b>−" + (n + 1) + "</b>.</p>";
  },
  xpRecoveryHtml: function(){
    var n = Math.max(0, cur().recoveryBonus | 0);
    return '<p class="xp-note">Todos os testes de recuperação (<b>1d6 + Grau</b>) passam a somar mais <b>2</b>. O bônus vai de <b>+' + n + "</b> para <b>+" + (n + 2) + "</b>.</p>";
  },
  xpAbilityHtml: function(){
    var c = cur();
    var phrase = typeAbilityPhrase(c.type);
    var who = c.type ? (" de " + c.type) : "";
    return '<p class="xp-note">Escolha uma <b>' + esc(phrase) + "</b>" + esc(who) + " do <b>Grau " + (c.tier | 0) + "</b> ou de um Grau inferior. Em seguida a ficha abre o campo para anotar nome, custo e efeito.</p>";
  },
  xpSimpleFoot: function(key, action){
    var reason = xpBlockReason(key);
    return xpFoot(key === "skill" ? "options" : "list", action, reason || "Gastar 4 XP", !!reason);
  },
  commitAdvance: function(key, note, apply){
    var reason = xpBlockReason(key);
    if (reason) { toast(reason); return null; }
    var c = cur();
    if (apply) apply(c);
    c.xp = (c.xp | 0) - 4;
    c.advances[key] = true;
    noteChange(note);
    var tiered = false;
    if (advanceCount(c.advances) >= 4 && (c.tier | 0) < 6) {
      c.tier = (c.tier | 0) + 1;
      c.advances = {pools:false, edge:false, effort:false, skill:false};
      noteChange("Quarto passo: avançou para o Grau " + c.tier + ". Anote as habilidades novas do Tipo e do Foco.");
      tiered = true;
    }
    var xpEl = document.getElementById("f-xp");
    if (xpEl) xpEl.value = c.xp;
    var tierEl = document.getElementById("f-tier");
    if (tierEl) tierEl.value = c.tier;
    var effEl = document.getElementById("f-effort");
    if (effEl) effEl.value = c.effort;
    commit();
    this.renderPools();
    this.renderSkills();
    this.renderRecov();
    this.renderArmorTotal();
    this.renderList("armors");
    this.renderList("abilities");
    this.renderXp();
    return tiered;
  },
  afterAdvance: function(tiered){
    XPUI.view = "list";
    this.renderXpModal();
    toast(tiered ? ("Grau " + cur().tier + " — anote as habilidades novas do Tipo e do Foco") : "4 XP gastos");
  },
  buyPools: function(){
    if (allocSum() !== 4) { toast("Distribua exatamente 4 pontos"); return; }
    var parts = [];
    STATS.forEach(function(s){
      var n = XPUI.alloc[s[0]] | 0;
      if (n) parts.push("+" + n + " " + s[1]);
    });
    var tiered = this.commitAdvance("pools", "Gastou 4 XP · Aumentar Capacidades: " + parts.join(", "), function(c){
      STATS.forEach(function(s){
        var n = XPUI.alloc[s[0]] | 0;
        if (!n) return;
        c.pools[s[0]].max += n;
        c.pools[s[0]].cur += n;
      });
      App.autoDamage();
    });
    if (tiered === null) return;
    this.afterAdvance(tiered);
  },
  buyEdge: function(){
    var stat = XPUI.edge;
    if (!stat || !cur().pools[stat]) { toast("Escolha uma Margem"); return; }
    var tiered = this.commitAdvance("edge", "Gastou 4 XP · Rumo à Perfeição: Margem de " + POOL_NAME[stat] + " +1", function(c){
      c.pools[stat].edge = (c.pools[stat].edge | 0) + 1;
    });
    if (tiered === null) return;
    this.afterAdvance(tiered);
  },
  buyEffort: function(){
    var prev = cur().effort | 0;
    var tiered = this.commitAdvance("effort", "Gastou 4 XP · Esforço Extra: " + prev + " → " + (prev + 1), function(c){
      c.effort = (c.effort | 0) + 1;
    });
    if (tiered === null) return;
    this.afterAdvance(tiered);
  },
  buySkill: function(){
    var name = String(XPUI.skill || "").trim();
    var desc = String(XPUI.skillDesc || "").trim();
    var info = skillOutcome(name);
    if (!name || info.blocked) { toast(info.blocked || "Diga a perícia"); return; }
    var i = findSkillIndex(name);
    var note;
    if (i < 0) note = "Gastou 4 XP · Perícia " + name + " (Treinado)";
    else if (cur().skills[i].level === "T") note = "Gastou 4 XP · Perícia " + (cur().skills[i].name || name) + " agora é Especializada";
    else note = "Gastou 4 XP · Perícia " + (cur().skills[i].name || name) + " agora é Treinada";
    var tiered = this.commitAdvance("skill", note, function(c){
      var idx = findSkillIndex(name);
      if (idx < 0) c.skills.push({name:name, level:"T", desc:desc});
      else {
        if (c.skills[idx].level === "T") c.skills[idx].level = "E";
        else c.skills[idx].level = "T";
        if (desc) c.skills[idx].desc = desc;
      }
    });
    if (tiered === null) return;
    this.afterAdvance(tiered);
  },
  buyArmorEase: function(){
    var next = Math.max(0, cur().armorEase | 0) + 1;
    var tiered = this.commitAdvance("skill", "Gastou 4 XP · Alívio de armadura (agora −" + next + ")", function(c){
      c.armorEase = next;
    });
    if (tiered === null) return;
    this.afterAdvance(tiered);
  },
  buyRecovery: function(){
    var next = Math.max(0, cur().recoveryBonus | 0) + 2;
    var tiered = this.commitAdvance("skill", "Gastou 4 XP · Recuperação +" + next + " nos testes", function(c){
      c.recoveryBonus = next;
    });
    if (tiered === null) return;
    this.afterAdvance(tiered);
  },
  buyAbility: function(){
    var phrase = typeAbilityPhrase(cur().type);
    var tiered = this.commitAdvance("skill", "Gastou 4 XP · Nova " + phrase, function(c){
      c.abilities.push({name:"", cost:"", dmg:"", desc:""});
      XPUI.abilityIndex = c.abilities.length - 1;
    });
    if (tiered === null) return;
    var i = XPUI.abilityIndex;
    this.closeXp();
    this.openModal("abilities", i);
    toast(tiered ? ("Grau " + cur().tier + " — anote a habilidade e as do Tipo e do Foco") : "Anote a habilidade nova");
  }
});
