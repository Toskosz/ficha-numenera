var DB = {list:{}, current:null};
var saveTimer = null;
var EDIT = {key:null, i:-1};
var snapId = null, snap = null, pendingNotes = [];
var App = window.App || {};
window.App = App;

function uid(){
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function blank(){
  return {
    id:uid(), name:"", descriptor:"", type:"", focus:"", portrait:"",
    tier:1, effort:1, xp:0, shins:0,
    advances:{pools:false, edge:false, effort:false, skill:false},
    armorEase:0, recoveryBonus:0,
    pools:{
      might:{cur:11, max:11, edge:1},
      speed:{cur:10, max:10, edge:1},
      intellect:{cur:7, max:7, edge:0}
    },
    recovery:{used:[false, false, false, false]}, damage:0,
    skills:[], weapons:[], armors:[], attacks:[], abilities:[],
    cypherLimit:2, cyphers:[], artifacts:[], equipment:[], buffs:[],
    other:"", background:"", goal:"", notes:"", history:[]
  };
}

function load(){
  try {
    var raw = localStorage.getItem(STORE);
    if (raw) DB = JSON.parse(raw);
  } catch (e) {}
  if (!DB.list || !Object.keys(DB.list).length) {
    var c = blank();
    c.name = "Novo Aventureiro";
    c.history = [{t:Date.now(), lines:["Personagem criado"]}];
    DB.list = {};
    DB.list[c.id] = c;
    DB.current = c.id;
  }
  if (!DB.list[DB.current]) DB.current = Object.keys(DB.list)[0];
  for (var id in DB.list) {
    var ch = DB.list[id];
    ["skills","weapons","armors","attacks","abilities","cyphers","artifacts","equipment","buffs"].forEach(function(k){
      if (!Array.isArray(ch[k])) ch[k] = [];
    });
    ch.skills.forEach(function(s){
      if (s && s.desc == null) s.desc = "";
    });
    ["other","background","goal","notes"].forEach(function(k){
      if (ch[k] == null) ch[k] = "";
    });
    if (ch.shins == null) ch.shins = 0;
    if (ch.armorEase == null) ch.armorEase = 0;
    if (ch.recoveryBonus == null) ch.recoveryBonus = 0;
    if (!ch.advances || typeof ch.advances !== "object" || Array.isArray(ch.advances)) {
      ch.advances = {pools:false, edge:false, effort:false, skill:false};
    }
    ["pools","edge","effort","skill"].forEach(function(k){ ch.advances[k] = ch.advances[k] === true; });
    if (!Array.isArray(ch.history)) ch.history = [];
  }
}

function writeDB(){
  try { localStorage.setItem(STORE, JSON.stringify(DB)); }
  catch (e) { toast("Não foi possível salvar (armazenamento cheio?)"); }
}

function persist(){
  try { recordChanges(); } catch (err) { console.error(err); }
  writeDB();
  try { App.renderHistory(); } catch (err) {}
}

function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
}

function commit(){
  clearTimeout(saveTimer);
  saveTimer = null;
  persist();
}

function cur(){ return DB.list[DB.current]; }

function esc(s){
  return (s == null ? "" : String(s))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(msg){
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._tm);
  t._tm = setTimeout(function(){ t.classList.remove("show"); }, 1900);
}

function noteChange(line){
  if (line) pendingNotes.push(line);
}
