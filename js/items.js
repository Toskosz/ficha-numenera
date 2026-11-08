var skillInfoOpen = -1;

Object.assign(App, {
  addItem: function(key){
    cur()[key].push(Object.assign({}, LISTS[key].blank));
    commit();
    this.renderList(key);
    this.openModal(key, cur()[key].length - 1);
  },
  delItem: function(e, key, i){
    e.stopPropagation();
    cur()[key].splice(i, 1);
    commit();
    this.renderList(key);
    if (LISTS[key].after) LISTS[key].after();
  },
  openModal: function(key, i){
    EDIT = {key:key, i:i};
    var cfg = LISTS[key];
    document.getElementById("modal-title").textContent = cfg.label;
    document.getElementById("modal-body").innerHTML = this.buildForm(key, i);
    document.getElementById("modalback").classList.add("show");
  },
  modalBackClick: function(e){
    if (e.target.id === "modalback") this.closeModal();
  },
  closeModal: function(){
    var open = document.getElementById("modalback").classList.contains("show");
    document.getElementById("modalback").classList.remove("show");
    if (open) commit();
    if (EDIT.key) {
      this.renderList(EDIT.key);
      if (LISTS[EDIT.key].after) LISTS[EDIT.key].after();
    }
    EDIT = {key:null, i:-1};
  },
  buildForm: function(key, i){
    var o = cur()[key][i];
    var cfg = LISTS[key];
    return cfg.fields.map(function(f){
      var val = esc(o[f.k] || "");
      var inp;
      if (f.t === "area") inp = '<textarea id="mf-' + f.k + '" class="fld" style="min-height:84px" oninput="App.modalSet(\'' + f.k + '\',this.value)" placeholder="' + esc(f.ph || "") + '">' + val + "</textarea>";
      else if (f.t === "select") inp = '<select id="mf-' + f.k + '" class="fld" onchange="App.modalSet(\'' + f.k + '\',this.value)">' + f.opts.map(function(op){ return "<option " + (o[f.k] === op ? "selected" : "") + ">" + esc(op) + "</option>"; }).join("") + "</select>";
      else if (f.t === "num") inp = '<input id="mf-' + f.k + '" class="fld" type="number" value="' + val + '" oninput="App.modalSet(\'' + f.k + '\',this.value)">';
      else inp = '<input id="mf-' + f.k + '" class="fld" value="' + val + '" placeholder="' + esc(f.ph || "") + '" oninput="App.modalSet(\'' + f.k + '\',this.value)">';
      return '<div class="mfield"><label>' + esc(f.l) + "</label>" + inp + "</div>";
    }).join("");
  },
  modalSet: function(field, value){
    var o = cur()[EDIT.key][EDIT.i];
    o[field] = value;
    if (EDIT.key === "weapons" && field === "weight") {
      var d = {Leve:"2", Média:"4", Pesada:"6"}[value];
      if (d != null) {
        o.dmg = d;
        var di = document.getElementById("mf-dmg");
        if (di) di.value = d;
      }
    }
    scheduleSave();
  },
  renderList: function(key){
    var cfg = LISTS[key];
    var arr = cur()[key] || [];
    var wrap = document.getElementById("list-" + key);
    if (!wrap) return;
    if (!arr.length) wrap.innerHTML = '<div class="empty">Nada por aqui ainda.</div>';
    else wrap.innerHTML = arr.map(function(o, i){
      var numVal = cfg.num ? cfg.num(o) : "";
      var numHtml = (numVal !== "" && numVal != null) ? '<div class="cnum ' + (cfg.numClass || "") + '"><span class="v">' + esc(numVal) + '</span><span class="l">' + (cfg.numL || "") + "</span></div>" : "";
      var sub = cfg.sub ? cfg.sub(o) : "";
      var useBtn = USABLE_LISTS[key]
        ? '<button class="ic-btn use" onclick="event.stopPropagation();App.useItem(\'' + key + "'," + i + ')" title="Usar com esforço">usar</button>'
        : "";
      return '<div class="chip" ondblclick="App.openModal(\'' + key + "'," + i + ')" onmouseenter="App.showTip(event,\'' + key + "'," + i + ')" onmousemove="App.moveTip(event)" onmouseleave="App.hideTip()">' +
        '<div class="cmain"><div class="cname">' + esc(cfg.name(o)) + "</div>" + (sub ? '<div class="csub">' + esc(sub) + "</div>" : "") + "</div>" +
        numHtml +
        '<div class="cact">' + useBtn +
        '<button class="ic-btn" onclick="event.stopPropagation();App.openModal(\'' + key + "'," + i + ')" title="Editar">✎</button>' +
        '<button class="ic-btn del" onclick="App.delItem(event,\'' + key + "'," + i + ')" title="Excluir">✕</button></div>' +
      "</div>";
    }).join("");
    if (key === "cyphers") this.renderCypherCount();
  },
  renderCypherCount: function(){
    var c = cur();
    var count = (c.cyphers || []).filter(function(x){ return (x.name || "").trim(); }).length;
    var lim = document.getElementById("cyphlimit");
    if (lim) {
      document.getElementById("cyphcount").textContent = count + "/" + (c.cypherLimit || 0);
      lim.classList.toggle("over", count > (+c.cypherLimit || 0));
    }
  },
  renderArmorTotal: function(){
    var sum = (cur().armors || []).reduce(function(a, o){ return a + (parseInt(o.armorVal) || 0); }, 0);
    var el = document.getElementById("armor-total");
    if (el) el.textContent = sum;
    var hint = document.getElementById("armor-ease");
    if (hint) {
      var ease = Math.max(0, cur().armorEase | 0);
      hint.hidden = !ease;
      hint.textContent = ease ? ("Alívio de armadura −" + ease + " já descontado no custo de Potência por hora e na redução de Velocidade. No editor, os números continuam sendo os da peça.") : "";
    }
  },
  showTip: function(e, key, i){
    var cfg = LISTS[key];
    var o = cur()[key][i];
    var rows = (cfg.tip(o) || []).filter(function(r){ return r[1] != null && String(r[1]).trim() !== ""; });
    var full = cfg.full ? (cfg.full(o) || "").trim() : "";
    var t = document.getElementById("tip");
    if (!rows.length && !full) { this.hideTip(); return; }
    t.innerHTML = '<div class="tt-title">' + esc(cfg.name(o)) + "</div>" +
      rows.map(function(r){ return '<div class="tt-row"><span class="k">' + esc(r[0]) + '</span><span class="vv">' + esc(r[1]) + "</span></div>"; }).join("") +
      (full ? '<div class="tt-full">' + esc(full) + "</div>" : "");
    t.classList.add("show");
    this.moveTip(e);
  },
  moveTip: function(e){
    var t = document.getElementById("tip");
    var pad = 14;
    var r = t.getBoundingClientRect();
    var x = e.clientX + pad, y = e.clientY + pad;
    if (x + r.width > innerWidth) x = e.clientX - r.width - pad;
    if (y + r.height > innerHeight) y = e.clientY - r.height - pad;
    t.style.left = Math.max(6, x) + "px";
    t.style.top = Math.max(6, y) + "px";
  },
  hideTip: function(){
    document.getElementById("tip").classList.remove("show");
  },
  addSkill: function(){
    cur().skills.push({name:"", level:"", desc:""});
    skillInfoOpen = cur().skills.length - 1;
    commit();
    this.renderSkills();
    var el = document.getElementById("skill-desc");
    if (el) el.focus();
  },
  delSkill: function(i){
    cur().skills.splice(i, 1);
    if (skillInfoOpen === i) skillInfoOpen = -1;
    else if (skillInfoOpen > i) skillInfoOpen--;
    commit();
    this.renderSkills();
  },
  skillName: function(i, v){
    cur().skills[i].name = v;
    scheduleSave();
  },
  skillDesc: function(i, v){
    cur().skills[i].desc = v;
    scheduleSave();
  },
  cycleSkill: function(i, k){
    var s = cur().skills[i];
    s.level = (s.level === k) ? "" : k;
    commit();
    this.renderSkills();
  },
  toggleSkillInfo: function(i){
    skillInfoOpen = skillInfoOpen === i ? -1 : i;
    this.renderSkills();
    if (skillInfoOpen === i) {
      var el = document.getElementById("skill-desc");
      if (el) el.focus();
    }
  },
  renderSkills: function(){
    var c = cur();
    var wrap = document.getElementById("skills");
    if (!c.skills.length) { wrap.innerHTML = '<div class="empty">Nenhuma perícia ainda.</div>'; return; }
    wrap.innerHTML = c.skills.map(function(s, i){
      var open = skillInfoOpen === i;
      var has = String(s.desc || "").trim() !== "";
      var desc = open
        ? '<textarea id="skill-desc" class="fld skill-desc" spellcheck="false" placeholder="Efeito — o que esta perícia facilita ou altera" oninput="App.skillDesc(' + i + ',this.value)">' + esc(s.desc || "") + "</textarea>"
        : "";
      return '<div class="skill">' +
        '<input class="fld" value="' + esc(s.name) + '" list="dl-skills" placeholder="ex: Esgueirar" oninput="App.skillName(' + i + ',this.value)">' +
        '<div class="skill-actions"><div class="badges"><button class="bdg ' + (s.level === "T" ? "on" : "") + '" data-k="T" onclick="App.cycleSkill(' + i + ',\'T\')" title="Treinado">T</button>' +
        '<button class="bdg ' + (s.level === "E" ? "on" : "") + '" data-k="E" onclick="App.cycleSkill(' + i + ',\'E\')" title="Especializado">E</button></div>' +
        '<button class="info' + (has ? " has" : "") + (open ? " on" : "") + '" type="button" onclick="App.toggleSkillInfo(' + i + ')" title="Efeito">i</button>' +
        '<button class="use" type="button" onclick="App.useSkill(' + i + ')" title="Usar com esforço">usar</button>' +
        '<button class="del" onclick="App.delSkill(' + i + ')">✕</button></div>' +
        desc + "</div>";
    }).join("");
  }
});
