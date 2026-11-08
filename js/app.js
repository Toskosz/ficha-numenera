Object.assign(App, {
  set: function(k, v, final){
    var numeric = {tier:1, effort:1, xp:1, shins:1, cypherLimit:1};
    if (numeric[k]) {
      if (String(v).trim() === "") {
        if (!final) return;
        v = k === "tier" ? 1 : 0;
      } else {
        v = parseInt(v, 10);
        if (!isFinite(v)) return;
        v = k === "tier" ? Math.min(6, Math.max(1, v)) : Math.max(0, v);
      }
    }
    var c = cur();
    if (!c) return;
    c[k] = v;
    scheduleSave();
    if (final) {
      var id = {tier:"f-tier", effort:"f-effort", xp:"f-xp", shins:"f-shins", cypherLimit:"f-cypherlimit"}[k];
      var el = id && document.getElementById(id);
      if (el && String(el.value) !== String(v)) el.value = v;
    }
  },
  paintSheet: function(){
    if (this._painting) return;
    var c = cur();
    if (!c) return;
    this._painting = true;
    try {
      var active = document.activeElement;
      function inId(el, id){
        while (el && el !== document.body) {
          if (el.id === id) return true;
          el = el.parentNode;
        }
        return false;
      }
      var fields = {
        "f-name": c.name, "f-descriptor": c.descriptor, "f-type": c.type || "", "f-focus": c.focus,
        "f-tier": c.tier, "f-effort": c.effort, "f-xp": c.xp, "f-shins": c.shins, "f-cypherlimit": c.cypherLimit,
        "f-other": c.other, "f-background": c.background, "f-goal": c.goal, "f-notes": c.notes
      };
      Object.keys(fields).forEach(function(id){
        var el = document.getElementById(id);
        if (!el || el === active) return;
        var next = fields[id] == null ? "" : String(fields[id]);
        if (el.value !== next) el.value = next;
      });
      if (!active || active.id !== "charsel") this.refreshSelect();
      this.renderSentence();
      this.renderXp();
      this.renderDamage();
      this.renderRecov();
      this.renderArmorTotal();
      this.renderCypherCount();
      if (inId(active, "pools")) ["might", "speed", "intellect"].forEach(function(s){ App.patchPool(s); });
      else this.renderPools();
      if (!inId(active, "skills")) this.renderSkills();
      var self = this;
      LIST_KEYS.forEach(function(k){ self.renderList(k); });
      var effortBack = document.getElementById("effortback");
      if (effortBack && effortBack.classList.contains("show") && EFFORT.stat) {
        var maxE = Math.max(0, c.effort | 0);
        if (EFFORT.levels > maxE) EFFORT.levels = maxE;
        this.refreshEffort();
      }
    } finally {
      this._painting = false;
    }
  },
  resetSheetUi: function(){
    skillInfoOpen = -1;
    this.closeXp();
    this.closeEffort();
    this.closeModal();
  },
  switchTab: function(t){
    commit();
    document.querySelectorAll(".tab").forEach(function(b){ b.classList.toggle("active", b.dataset.tab === t); });
    document.querySelectorAll(".tabsec").forEach(function(s){ s.hidden = (s.id !== "tab-" + t); });
  },
  switchChar: function(id){
    if (!id || id === DB.current) return;
    commit();
    this.resetSheetUi();
    DB.current = id;
    snapId = id;
    snap = snapshotOf(cur());
    pendingNotes = [];
    writeDB();
    this.renderAll();
  },
  newChar: function(){
    commit();
    var c = blank();
    c.name = "Novo Aventureiro";
    c.history = [{t:Date.now(), lines:["Personagem criado"]}];
    DB.list[c.id] = c;
    DB.current = c.id;
    snapId = c.id;
    snap = snapshotOf(c);
    pendingNotes = [];
    this.resetSheetUi();
    writeDB();
    this.renderAll();
    toast("Personagem criado");
  },
  deleteChar: function(){
    if (Object.keys(DB.list).length <= 1) { toast("É o único personagem"); return; }
    if (!confirm('Excluir "' + (cur().name || "sem nome") + '"?')) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    pendingNotes = [];
    delete DB.list[DB.current];
    DB.current = Object.keys(DB.list)[0];
    snapId = DB.current;
    snap = snapshotOf(cur());
    this.resetSheetUi();
    writeDB();
    this.renderAll();
    toast("Excluído");
  },
  exportChar: function(){
    var c = cur();
    var blob = new Blob([JSON.stringify(c, null, 2)], {type:"application/json"});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (c.name || "personagem").replace(/[^\w\-]+/g, "_") + ".numenera.json";
    a.click();
    toast("Ficha exportada");
  },
  importChar: function(e){
    var f = e.target.files[0];
    if (!f) return;
    var self = this;
    var rd = new FileReader();
    rd.onload = function(ev){
      try {
        var obj = JSON.parse(ev.target.result);
        commit();
        var c = Object.assign(blank(), obj, {id:uid()});
        if (!Array.isArray(c.history)) c.history = [];
        c.history.push({t:Date.now(), lines:["Ficha importada"]});
        DB.list[c.id] = c;
        DB.current = c.id;
        snapId = c.id;
        snap = snapshotOf(c);
        pendingNotes = [];
        writeDB();
        load();
        snapId = DB.current;
        snap = snapshotOf(cur());
        self.resetSheetUi();
        self.renderAll();
        toast("Ficha importada");
      } catch (err) {
        toast("Arquivo inválido");
      }
    };
    rd.readAsText(f);
    e.target.value = "";
  },
  refreshSelect: function(){
    document.getElementById("charsel").innerHTML = Object.values(DB.list).map(function(x){
      return '<option value="' + x.id + '" ' + (x.id === DB.current ? "selected" : "") + ">" + esc(x.name || "(sem nome)") + "</option>";
    }).join("");
  },
  renderAll: function(){
    var c = cur();
    this.refreshSelect();
    document.getElementById("f-name").value = c.name;
    document.getElementById("f-descriptor").value = c.descriptor;
    document.getElementById("f-type").value = c.type;
    document.getElementById("f-focus").value = c.focus;
    document.getElementById("f-tier").value = c.tier;
    document.getElementById("f-effort").value = c.effort;
    document.getElementById("f-xp").value = c.xp;
    this.renderXp();
    document.getElementById("f-shins").value = c.shins;
    document.getElementById("f-cypherlimit").value = c.cypherLimit;
    document.getElementById("f-other").value = c.other;
    document.getElementById("f-background").value = c.background;
    document.getElementById("f-goal").value = c.goal;
    document.getElementById("f-notes").value = c.notes;
    this.renderSentence();
    this.renderPortrait();
    this.renderPools();
    this.renderDamage();
    this.renderRecov();
    this.renderSkills();
    var self = this;
    ["weapons","armors","attacks","abilities","cyphers","artifacts","equipment","buffs"].forEach(function(k){ self.renderList(k); });
    this.renderArmorTotal();
    this.renderCypherCount();
    this.renderHistory();
  },
  renderHistory: function(){
    var el = document.getElementById("history-list");
    if (!el || !DB.current || !DB.list[DB.current]) return;
    var h = Array.isArray(cur().history) ? cur().history : [];
    var count = document.getElementById("history-count");
    if (count) count.textContent = h.length ? (" · " + h.length) : "";
    if (!h.length) { el.innerHTML = '<div class="empty">Nenhuma alteração ainda.</div>'; return; }
    var fmt = new Intl.DateTimeFormat("pt-BR", {day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit"});
    el.innerHTML = h.slice().reverse().map(function(entry){
      var d = new Date(entry.t);
      var items = (entry.lines || []).map(historyLineHtml).join("");
      return '<article class="hentry"><time class="when" datetime="' + esc(d.toISOString()) + '">' + esc(fmt.format(d)) + "</time><ul>" + items + "</ul></article>";
    }).join("");
  },
  clearHistory: function(){
    var c = cur();
    if (!c.history || !c.history.length) { toast("O histórico já está vazio"); return; }
    if (!confirm('Apagar o histórico de "' + (c.name || "sem nome") + '"? A ficha não será alterada.')) return;
    c.history = [];
    pendingNotes = [];
    writeDB();
    this.renderHistory();
    toast("Histórico apagado");
  }
});

document.getElementById("dl-desc").innerHTML = DESCRIPTORS.map(function(d){ return '<option value="' + esc(d) + '">'; }).join("");
document.getElementById("dl-focus").innerHTML = FOCI.map(function(f){ return '<option value="' + esc(f) + '">'; }).join("");
var dlsk = document.createElement("datalist");
dlsk.id = "dl-skills";
dlsk.innerHTML = SKILLS_SUGG.map(function(s){ return '<option value="' + esc(s) + '">'; }).join("");
document.body.appendChild(dlsk);
document.addEventListener("keydown", function(e){
  if (e.key === "Escape") { App.closeXp(); App.closeEffort(); App.closeModal(); }
});
window.addEventListener("pagehide", function(){ commit(); });
window.addEventListener("storage", function(e){
  if (e.key !== STORE || !e.newValue) return;
  load();
  skillInfoOpen = -1;
  snapId = DB.current;
  snap = snapshotOf(cur());
  pendingNotes = [];
  App.renderAll();
});

load();
snapId = DB.current;
snap = snapshotOf(cur());
App.renderAll();
