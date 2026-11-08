var STORE = "numenera_chars_v3";
var HIST_MAX = 400;
var STATS = [
  ["might", "Potência", "--pot"],
  ["speed", "Velocidade", "--vel"],
  ["intellect", "Intelecto", "--int"]
];
var RECOV = ["1 ação", "10 min", "1 hora", "10 horas"];
var TYPES = {
  Glaive: {might:11, speed:10, intellect:7, mEdge:1, sEdge:1, iEdge:0, cypher:2},
  Nano: {might:7, speed:9, intellect:12, mEdge:0, sEdge:0, iEdge:1, cypher:3},
  Jack: {might:10, speed:10, intellect:10, mEdge:0, sEdge:0, iEdge:0, cypher:2}
};
var DESCRIPTORS = ["Decidido","Encantador","Erudito","Esperto","Forte","Furtivo","Gracioso","Inteligente","Místico/Mecânico","Resistente","Rústico","Veloz"];
var FOCI = ["Assassina","Caça Com Grande Perícia","Carrega uma Aljava","Controla a Gravidade","Controla Bestas","Cria Ilusões","Cria Objetos Únicos","Deixa um Rastro de Gelo","Doma o Relâmpago","Domina a Defesa","Domina o Armamento","Domina Poderes Mentais","Empunha Duas Armas ao Mesmo Tempo","Entretém","Espreita nos Becos","Existe Parcialmente Fora desta Fase","Explora Lugares Escuros","Fala com Máquinas","Faz Milagres","Funde Carne e Aço","Lidera","Luta Com Estilo","Maneja o Poder Com Precisão","Manipula a Matéria com a Mente","Porta um Halo de Fogo","Se Enfurece","Uiva para a Lua","Usa o Magnetismo","Vive nos Ermos"];
var SKILLS_SUGG = ["Abrir Fechaduras","Astronomia","Biologia","Botânica","Carpintaria","Carregar","Cavalgar","Couraria","Curar","Enganar","Equilíbrio","Escalar","Escapar","Esgueirar","Esmagar","Filosofia","Furto","Geografia","Geologia","História","Identificar","Iniciativa","Intimidação","Metalurgia","Nadar","Numenera","Percepção","Persuasão","Reparos","Saltar"];
var SCALAR_LABELS = {
  name:"Nome", descriptor:"Descritor", type:"Tipo", focus:"Foco",
  tier:"Grau", effort:"Esforço", xp:"XP", shins:"Shins", cypherLimit:"Limite de cifras",
  other:"Outros", background:"Antecedente", goal:"Objetivo pessoal", notes:"Notas"
};
var POOL_NAME = {might:"Potência", speed:"Velocidade", intellect:"Intelecto"};
var DMG_NAME = ["Saudável", "Debilitado", "Incapacitado", "Morto"];
var LIST_KEYS = ["weapons","armors","attacks","abilities","cyphers","artifacts","equipment","buffs"];
var USABLE_LISTS = {weapons:1, attacks:1, abilities:1};

function armorEaseOf(){
  try { return Math.max(0, (cur().armorEase | 0)); }
  catch (e) { return 0; }
}

function easedArmorStat(raw){
  if (raw == null || String(raw).trim() === "") return "";
  var n = parseInt(raw, 10);
  if (!isFinite(n)) return String(raw);
  return String(Math.max(0, n - armorEaseOf()));
}

var LISTS = {
  weapons:{label:"Arma", blank:{name:"",weight:"Média",dmg:"4",mod:"",notes:""},
    fields:[{k:"name",l:"Nome",t:"text",ph:"ex: Espada de lâmina larga"},{k:"weight",l:"Categoria",t:"select",opts:["Leve","Média","Pesada"]},{k:"dmg",l:"Dano",t:"num"},{k:"mod",l:"Modificador / perícia",t:"text",ph:"+0, treinado…"},{k:"notes",l:"Notas / propriedades",t:"area"}],
    name:function(o){return o.name||"Arma"}, sub:function(o){return o.weight||""}, num:function(o){return o.dmg}, numL:"dano", numClass:"",
    tip:function(o){return [["Categoria",o.weight],["Dano",o.dmg],["Modificador",o.mod]]}, full:function(o){return o.notes}},
  armors:{label:"Armadura", blank:{name:"",armorVal:"1",potCost:"",speedRed:"",notes:""},
    fields:[{k:"name",l:"Nome",t:"text",ph:"ex: Gibão de couro"},{k:"armorVal",l:"Armadura (pontos)",t:"num"},{k:"potCost",l:"Custo de Potência por hora",t:"num"},{k:"speedRed",l:"Redução da Reserva de Velocidade",t:"num"},{k:"notes",l:"Notas",t:"area"}],
    name:function(o){return o.name||"Armadura"}, sub:function(o){
      var pot = easedArmorStat(o.potCost), vel = easedArmorStat(o.speedRed);
      return [pot !== "" ? ("Pot/h " + pot) : "", vel !== "" ? ("Vel −" + vel) : ""].filter(Boolean).join("  ·  ");
    }, num:function(o){return o.armorVal}, numL:"armad.", numClass:"blue",
    tip:function(o){
      var ease = armorEaseOf();
      var pot = easedArmorStat(o.potCost), vel = easedArmorStat(o.speedRed);
      return [
        ["Armadura", o.armorVal],
        ["Custo Potência/h", pot !== "" ? (pot + (ease && String(o.potCost) !== pot ? " (base " + o.potCost + ")" : "")) : ""],
        ["Redução Velocidade", vel !== "" ? (vel + (ease && String(o.speedRed) !== vel ? " (base " + o.speedRed + ")" : "")) : ""]
      ];
    }, full:function(o){return o.notes}, after:function(){App.renderArmorTotal()}},
  attacks:{label:"Ataque", blank:{name:"",cost:"",dmg:"",mod:"",desc:""},
    fields:[{k:"name",l:"Nome",t:"text",ph:"ex: Estocada"},{k:"dmg",l:"Dano",t:"num"},{k:"mod",l:"Modificador",t:"text",ph:"+0, dif. −1…"},{k:"cost",l:"Custo (opcional)",t:"text",ph:"ex: 1 p. Velocidade"},{k:"desc",l:"Descrição / efeito",t:"area"}],
    name:function(o){return o.name||"Ataque"}, sub:function(o){return [o.cost,o.mod?("mod "+o.mod):""].filter(Boolean).join("  ·  ")}, num:function(o){return o.dmg}, numL:"dano", numClass:"",
    tip:function(o){return [["Dano",o.dmg],["Modificador",o.mod],["Custo",o.cost]]}, full:function(o){return o.desc}},
  abilities:{label:"Habilidade Especial", blank:{name:"",cost:"",dmg:"",desc:""},
    fields:[{k:"name",l:"Nome",t:"text",ph:"ex: Espancar"},{k:"cost",l:"Custo (opcional)",t:"text",ph:"ex: 1 p. Potência"},{k:"dmg",l:"Dano (opcional)",t:"num"},{k:"desc",l:"O que faz",t:"area"}],
    name:function(o){return o.name||"Habilidade"}, sub:function(o){return o.cost||""}, num:function(o){return o.dmg}, numL:"dano", numClass:"",
    tip:function(o){return [["Custo",o.cost],["Dano",o.dmg]]}, full:function(o){return o.desc}},
  cyphers:{label:"Cifra", blank:{name:"",level:"",effect:""},
    fields:[{k:"name",l:"Nome",t:"text",ph:"Nome da cifra"},{k:"level",l:"Nível",t:"text"},{k:"effect",l:"Efeito",t:"area"}],
    name:function(o){return o.name||"Cifra"}, sub:function(o){return ""}, num:function(o){return o.level}, numL:"nível", numClass:"brass",
    tip:function(o){return [["Nível",o.level]]}, full:function(o){return o.effect}, after:function(){App.renderCypherCount()}},
  artifacts:{label:"Artefato / Esquisitice", blank:{name:"",level:"",effect:""},
    fields:[{k:"name",l:"Nome",t:"text",ph:"Artefato ou esquisitice"},{k:"level",l:"Nível",t:"text"},{k:"effect",l:"Efeito / teste de desgaste",t:"area"}],
    name:function(o){return o.name||"Item"}, sub:function(o){return ""}, num:function(o){return o.level}, numL:"nível", numClass:"brass",
    tip:function(o){return [["Nível",o.level]]}, full:function(o){return o.effect}},
  equipment:{label:"Equipamento", blank:{name:"",qty:"1",desc:""},
    fields:[{k:"name",l:"Nome",t:"text",ph:"ex: Kit do explorador"},{k:"qty",l:"Quantidade",t:"num"},{k:"desc",l:"Descrição",t:"area"}],
    name:function(o){return o.name||"Item"}, sub:function(o){return ""}, num:function(o){return o.qty}, numL:"qtd", numClass:"green",
    tip:function(o){return [["Quantidade",o.qty]]}, full:function(o){return o.desc}},
  buffs:{label:"Bônus / Buff", blank:{name:"",effect:"",duration:""},
    fields:[{k:"name",l:"Nome / o que aconteceu",t:"text",ph:"ex: Bênção do Sacerdote"},{k:"effect",l:"O que ganha",t:"area",ph:"+1 em Armadura…"},{k:"duration",l:"Duração",t:"text",ph:"ex: 10 min, até o fim da cena"}],
    name:function(o){return o.name||"Bônus"}, sub:function(o){return o.duration||""}, num:function(o){return ""}, numL:"", numClass:"",
    tip:function(o){return [["Duração",o.duration]]}, full:function(o){return o.effect}}
};
