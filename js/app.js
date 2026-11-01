Object.assign(App, {
  set: function(k, v){
    cur()[k] = v;
    scheduleSave();
  },
  switchTab: function(t){
    commit();
    document.querySelectorAll(".tab").forEach(function(b){ b.classList.toggle("active", b.dataset.tab === t); });
    document.querySelectorAll(".tabsec").forEach(function(s){ s.hidden = (s.id !== "tab-" + t); });
  },
  switchChar: function(id){
    if (!id || id === DB.current) return;
    commit();
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
      var items = (entry.lines || []).map(function(line){ return "<li>" + esc(line) + "</li>"; }).join("");
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
  if (e.key === "Escape") { App.closeEffort(); App.closeModal(); }
});
window.addEventListener("pagehide", function(){ commit(); });

load();
snapId = DB.current;
snap = snapshotOf(cur());
App.renderAll();
