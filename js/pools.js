Object.assign(App, {
  setType: function(v){
    var c = cur();
    c.type = v;
    var t = TYPES[v];
    if (t) {
      var apply = confirm("Aplicar as Reservas iniciais de " + v + "?\n\nPotência " + t.might + " · Velocidade " + t.speed + " · Intelecto " + t.intellect + "\n(+6 pontos para distribuir depois.)");
      if (apply) {
        noteChange("Aplicou as Reservas iniciais de " + v);
        c.pools.might = {cur:t.might, max:t.might, edge:t.mEdge};
        c.pools.speed = {cur:t.speed, max:t.speed, edge:t.sEdge};
        c.pools.intellect = {cur:t.intellect, max:t.intellect, edge:t.iEdge};
        c.cypherLimit = t.cypher;
        document.getElementById("f-cypherlimit").value = c.cypherLimit;
        this.renderList("cyphers");
      }
    }
    commit();
    this.renderSentence();
    this.renderPools();
    this.renderDamage();
  },
  adjust: function(stat, d){
    var p = cur().pools[stat];
    p.cur = Math.max(0, Math.min(p.max, p.cur + d));
    this.autoDamage();
    commit();
    this.renderPools();
  },
  setMax: function(stat, v){
    if (String(v).trim() === "") return;
    var p = cur().pools[stat];
    p.max = Math.max(0, parseInt(v, 10) || 0);
    if (p.cur > p.max) p.cur = p.max;
    this.autoDamage();
    scheduleSave();
    this.patchPool(stat);
  },
  setEdge: function(stat, v){
    if (String(v).trim() === "") return;
    cur().pools[stat].edge = Math.max(0, parseInt(v, 10) || 0);
    scheduleSave();
    var back = document.getElementById("effortback");
    if (back && back.classList.contains("show") && EFFORT.stat === stat) this.refreshEffort();
  },
  patchPool: function(stat){
    var idx = {might:0, speed:1, intellect:2}[stat];
    var pool = document.querySelectorAll("#pools .pool")[idx];
    var p = cur().pools[stat];
    if (!pool || !p) { this.renderPools(); return; }
    var curEl = pool.querySelector(".cur");
    var mx = pool.querySelector(".mx");
    if (curEl) curEl.textContent = p.cur;
    if (mx) mx.textContent = "/ " + p.max;
    var fill = pool.querySelector("circle.fill");
    if (!fill) return;
    var R = 40, C = 2 * Math.PI * R;
    var pct = p.max > 0 ? p.cur / p.max : 0;
    fill.setAttribute("stroke-dasharray", String(C));
    fill.setAttribute("stroke-dashoffset", String(C * (1 - pct)));
  },
  setDamage: function(i){
    cur().damage = i;
    commit();
    this.renderDamage();
  },
  autoDamage: function(){
    var c = cur();
    c.damage = ["might","speed","intellect"].filter(function(s){ return c.pools[s].cur <= 0; }).length;
    this.renderDamage();
  },
  toggleRecov: function(i){
    var u = cur().recovery.used;
    u[i] = !u[i];
    commit();
    this.renderRecov();
  },
  rollRecovery: function(){
    var c = cur();
    var bonus = Math.max(0, c.recoveryBonus | 0);
    var r = Math.floor(Math.random() * 6) + 1 + (+c.tier || 1) + bonus;
    var which = prompt("Recuperou " + r + " ponto(s). Em qual Reserva? (potência / velocidade / intelecto)", "potência");
    if (!which) return;
    var map = {"potência":"might", "potencia":"might", "velocidade":"speed", "intelecto":"intellect"};
    var s = map[which.trim().toLowerCase()];
    if (!s) { toast("Reserva não reconhecida"); return; }
    noteChange("Rolou recuperação: +" + r + " em " + which.trim());
    var p = c.pools[s];
    p.cur = Math.min(p.max, p.cur + r);
    var u = c.recovery.used;
    var idx = u.indexOf(false);
    if (idx >= 0) u[idx] = true;
    this.autoDamage();
    commit();
    this.renderPools();
    this.renderRecov();
    toast("+" + r + " em " + which);
  },
  fullRest: function(){
    var c = cur();
    noteChange("Descanso de 10 horas");
    for (var s in c.pools) c.pools[s].cur = c.pools[s].max;
    c.recovery.used = [false, false, false, false];
    c.damage = 0;
    commit();
    this.renderPools();
    this.renderDamage();
    this.renderRecov();
    toast("Reservas restauradas");
  },
  portraitClick: function(e){
    if (e.target.classList.contains("rm")) return;
    document.getElementById("portraitfile").click();
  },
  loadPortrait: function(e){
    var f = e.target.files[0];
    if (!f) return;
    var self = this;
    var rd = new FileReader();
    rd.onload = function(ev){
      var img = new Image();
      img.onload = function(){
        var max = 560, w = img.width, h = img.height;
        if (w > h && w > max) { h = h * max / w; w = max; }
        else if (h > max) { w = w * max / h; h = max; }
        var cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        cur().portrait = cv.toDataURL("image/jpeg", 0.84);
        commit();
        self.renderPortrait();
      };
      img.src = ev.target.result;
    };
    rd.readAsDataURL(f);
    e.target.value = "";
  },
  removePortrait: function(e){
    e.stopPropagation();
    cur().portrait = "";
    commit();
    this.renderPortrait();
  },
  renderSentence: function(){
    var c = cur();
    document.getElementById("sentence").innerHTML = "Eu sou um(a) <b>" + esc(c.descriptor || "____") + "</b> <b>" + esc(c.type || "____") + "</b> que <b>" + esc(c.focus || "____") + "</b>.";
  },
  renderPortrait: function(){
    var c = cur();
    var box = document.getElementById("portrait");
    var ph = document.getElementById("portrait-ph");
    var img = box.querySelector("img");
    if (c.portrait) {
      if (!img) { img = document.createElement("img"); box.insertBefore(img, ph); }
      img.src = c.portrait;
      ph.style.display = "none";
      box.classList.add("has");
    } else {
      if (img) img.remove();
      ph.style.display = "flex";
      box.classList.remove("has");
    }
  },
  renderPools: function(){
    var c = cur();
    var html = "";
    STATS.forEach(function(arr){
      var key = arr[0], label = arr[1], cssv = arr[2];
      var p = c.pools[key];
      var R = 40, C = 2 * Math.PI * R;
      var pct = p.max > 0 ? p.cur / p.max : 0;
      var off = C * (1 - pct);
      var color = "var(" + cssv + ")";
      html += '<div class="pool"><div class="gauge"><svg viewBox="0 0 96 96"><circle class="track" cx="48" cy="48" r="' + R + '" fill="none" stroke-width="8"/><circle class="fill" cx="48" cy="48" r="' + R + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"/></svg><div class="ctr"><span class="cur" style="color:' + color + '">' + p.cur + '</span><span class="mx">/ ' + p.max + "</span></div></div>" +
        '<div class="pool-info"><span class="pool-name">' + label + '</span><div class="pool-ctrls"><button class="step" onclick="App.adjust(\'' + key + '\',-1)">−</button><button class="step" onclick="App.adjust(\'' + key + '\',1)">+</button><button class="step effort" type="button" onclick="App.openEffort(\'' + key + '\')" title="Gastar esforço nesta Reserva">Esforço</button><span class="miniedit">Reserva <input type="number" value="' + p.max + '" min="0" oninput="App.setMax(\'' + key + '\',this.value)"></span><span class="miniedit">Margem <input type="number" value="' + p.edge + '" min="0" oninput="App.setEdge(\'' + key + '\',this.value)"></span></div></div></div>';
    });
    document.getElementById("pools").innerHTML = html;
  },
  renderDamage: function(){
    var c = cur();
    var states = [["Saudável","Plena capacidade"],["Debilitado","Uma Reserva zerada"],["Incapacitado","Duas Reservas zeradas"],["Morto","Três Reservas zeradas"]];
    var notes = ["Todas as Reservas com pontos.","Esforço custa 1 ponto a mais.","Só ações muito limitadas.","Os três Pools chegaram a 0."];
    document.getElementById("dmgrow").innerHTML = states.map(function(s, i){
      return '<div class="dmgcell s' + i + " " + (c.damage === i ? "active" : "") + '" onclick="App.setDamage(' + i + ')"><div class="st">' + s[0] + '</div><div class="sub">' + s[1] + "</div></div>";
    }).join("");
    document.getElementById("dmg-note").textContent = notes[c.damage] || "";
  },
  renderRecov: function(){
    var c = cur();
    var bonus = Math.max(0, c.recoveryBonus | 0);
    var formula = document.getElementById("recov-formula");
    if (formula) formula.innerHTML = "Recupera <b>1d6 + Grau" + (bonus ? " +" + bonus : "") + "</b>, divididos como quiser.";
    var roll = document.getElementById("recov-roll");
    if (roll) roll.textContent = "Rolar 1d6 + Grau" + (bonus ? " +" + bonus : "");
    document.getElementById("recrow").innerHTML = RECOV.map(function(r, i){
      return '<div class="rectile ' + (c.recovery.used[i] ? "used" : "") + '" onclick="App.toggleRecov(' + i + ')"><span class="t">' + r + "</span>" + (c.recovery.used[i] ? "usada" : "livre") + "</div>";
    }).join("");
  }
});
