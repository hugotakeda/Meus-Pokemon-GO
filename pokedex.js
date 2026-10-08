(function (root) {
  "use strict";
  const TYPES = {normal:"Normal",fire:"Fogo",water:"Água",electric:"Elétrico",grass:"Planta",ice:"Gelo",fighting:"Lutador",poison:"Veneno",ground:"Terra",flying:"Voador",psychic:"Psíquico",bug:"Inseto",rock:"Pedra",ghost:"Fantasma",dragon:"Dragão",dark:"Sombrio",steel:"Aço",fairy:"Fada"};
  function weaknesses(types, go = true) {
    const result = Object.fromEntries(Object.keys(TYPES).map((t) => [t, 1]));
    types.forEach(({damage_relations:r}) => {
      for (const [key, factor] of [["double_damage_from", go ? 1.6 : 2], ["half_damage_from", go ? .625 : .5], ["no_damage_from", go ? .390625 : 0]])
        r[key].forEach(({name}) => { result[name] *= factor; });
    });
    return Object.entries(result).filter(([,v]) => v > 1).sort((a,b) => b[1]-a[1]);
  }
  function evolutionPaths(node, path = []) {
    const next = [...path, node.species.name];
    return node.evolves_to.length ? node.evolves_to.flatMap((n) => evolutionPaths(n, next)) : [next];
  }
  if (typeof module === "object") { module.exports = {weaknesses, evolutionPaths}; return; }
  const $ = (id) => document.getElementById(id), cache = new Map();
  let request = 0;
  const title = (s) => s.split("-").map((w) => w[0].toUpperCase()+w.slice(1)).join(" ");
  async function get(url) {
    if (cache.has(url)) return cache.get(url);
    let saved;
    try { saved = JSON.parse(localStorage.getItem("pgo-api:"+url) || "null"); } catch (_) {}
    if (saved) { cache.set(url, saved); return saved; }
    const response = await fetch(url);
    if (!response.ok) throw new Error(response.status === 404 ? "Não encontrei esse Pokémon. Confira o nome ou número." : "Não foi possível carregar a Pokédex. Tente novamente.");
    const data = await response.json(); cache.set(url,data);
    try { localStorage.setItem("pgo-api:"+url, JSON.stringify(data)); } catch (_) {}
    return data;
  }
  function element(tag, text, cls) {
    const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e;
  }
  function image(p, shiny = false) {
    const img = element("img"); img.alt = title(p.name)+(shiny ? " Shiny" : "");
    const art = p.sprites.other?.["official-artwork"];
    const urls = [...new Set([shiny ? art?.front_shiny : art?.front_default, shiny ? p.sprites.front_shiny : p.sprites.front_default].filter(Boolean))];
    let index = 0;
    if (!urls.length) return element("p", "Ilustração indisponível.");
    img.src = urls[0]; img.onerror = () => { if (++index < urls.length) img.src = urls[index]; else img.replaceWith(element("p", "Ilustração indisponível.")); }; return img;
  }
  function section(name) { const box = element("section", null, "dex-section"); box.append(element("h2",name)); return box; }
  async function search(value) {
    const token = ++request;
    $("dex-status").textContent = "Carregando Pokémon…";
    $("dex-result").replaceChildren(); $("dex-result").setAttribute("aria-busy","true");
    try {
      const regional = root.PokemonForms.resolve(value);
      const key = regional?.pokeapiName || value.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g,"-");
      if (!key) throw new Error("Digite o nome ou número da Pokédex.");
      const p = await get("https://pokeapi.co/api/v2/pokemon/"+encodeURIComponent(key));
      const species = await get(p.species.url);
      const goData = await get("pokemon-go-dex.json");
      const go = goData.pokemon[p.name];
      if (!go) throw new Error("Esta forma não está cadastrada na Pokédex de Pokémon GO.");
      const types = await Promise.all(go.types.map((t) => get("https://pokeapi.co/api/v2/type/"+t)));
      if (token !== request) return;
      const hero = element("div",null,"dex-hero"), details = element("div");
      hero.append(image(p),details);
      details.append(element("p","#"+String(species.id).padStart(4,"0"),"eyebrow"),element("h2",title(p.name)));
      const badges = element("div",null,"dex-badges");
      go.types.forEach((t) => badges.append(element("span",TYPES[t],"dex-badge")));
      details.append(badges,element("p",`Altura: ${go.height} m · Peso: ${go.weight} kg`));
      details.append(element("p", `Companheiro: ${go.buddy} km por doce`));
      details.append(element("p", "Dados de Pokémon GO. Cadastro no jogo não garante disponibilidade em encontros atuais.", "hint"));
      const shiny = element("button","Ver Shiny","ghost"); let isShiny = false;
      shiny.onclick = () => { isShiny = !isShiny; hero.firstChild.replaceWith(image(p,isShiny)); shiny.textContent = isShiny ? "Ver ilustração normal" : "Ver Shiny"; }; details.append(shiny, element("p", "A arte Shiny não confirma que essa variante já foi lançada em Pokémon GO.", "hint"));
      const stats = section("Estatísticas base de Pokémon GO");
      for (const [key,label] of [["baseAttack","Ataque"],["baseDefense","Defesa"],["baseStamina","Resistência (PS)"]]) {
        const value = go.stats[key], row = element("div",null,"dex-stat"), meter = element("meter");
        meter.min=0; meter.max=Math.max(500,value); meter.value=value; meter.setAttribute("aria-label",label);
        row.append(element("span",label),meter,element("strong",String(value))); stats.append(row);
      }
      const cp = (cpm) => Math.max(10, Math.floor((go.stats.baseAttack+15)*Math.sqrt(go.stats.baseDefense+15)*Math.sqrt(go.stats.baseStamina+15)*cpm*cpm/10));
      stats.append(element("p", `CP máximo (IV 15/15/15): ${cp(.7903)} no nível 40 · ${cp(.84029999)} no nível 50`));
      const weak = section("Fraquezas em Pokémon GO"), weakList = element("div",null,"dex-badges");
      weaknesses(types).forEach(([type,v]) => weakList.append(element("span",`${TYPES[type]} ×${Number(v.toFixed(3)).toLocaleString("pt-BR")}`,"dex-badge")));
      weak.append(weakList);
      const evolutions = section("Evoluções em Pokémon GO");
      if (!go.evolutions.length) evolutions.append(element("p", "Esta forma não possui evolução permanente cadastrada."));
      go.evolutions.forEach((e) => {
        const suffix=e.form.toLowerCase().replace(e.name.replace(/-/g,"_")+"_", "").replace(/_/g,"-");
        const key=e.form && suffix!=="normal" ? e.name+"-"+suffix : e.name;
        const b=element("button", title(key)+(e.candy ? ` · ${e.candy} doces` : ""),"ghost"); b.onclick=()=>search(key); evolutions.append(b);
      });
      evolutions.append(element("p", "Algumas evoluções também exigem itens, tarefas ou condições especiais.", "hint"));
      const variants = section("Formas em Pokémon GO");
      species.varieties.filter((v) => goData.pokemon[v.pokemon.name]).forEach((v) => {
        const b=element("button",title(v.pokemon.name),"ghost"); b.setAttribute("aria-pressed",String(v.pokemon.name===p.name)); b.onclick=()=>search(v.pokemon.name); variants.append(b);
      });
      $("dex-result").append(hero,stats,weak,evolutions,variants);
      $("dex-status").textContent = "Ficha de "+title(p.name)+" carregada.";
    } catch(e) { if(token===request) $("dex-status").textContent = e.message || "Sem conexão. Tente novamente."; }
    finally { if(token===request) $("dex-result").setAttribute("aria-busy","false"); }
  }
  $("dex-search").onsubmit = (e) => { e.preventDefault(); search($("dex-query").value); };
})(typeof window !== "undefined" ? window : globalThis);
