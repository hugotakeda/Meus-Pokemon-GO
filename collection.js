(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const ART =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";
  const FLAGS = {
    hundo: "100%",
    shiny: "Shiny",
    shadow: "Rocket",
    purified: "Purificado",
    lucky: "Sortudo",
    mega: "Mega",
  };
  // Formas de Alola: número da Pokédex -> ID da forma na PokéAPI.
  // Esse ID aponta para a arte oficial (normal e shiny) e para os atributos base.
  // prettier-ignore
  const ALOLA = {19:10091,20:10092,26:10100,27:10101,28:10102,37:10103,38:10104,50:10105,51:10106,52:10107,53:10108,74:10109,75:10110,76:10111,88:10112,89:10113,103:10114,105:10115};
  const hasAlola = (id) => Object.prototype.hasOwnProperty.call(ALOLA, id);
  const formIdFor = (id, form) =>
    form === "alola" && hasAlola(id) ? ALOLA[id] : id;
  const formId = (e) => formIdFor(e.id, e.form);
  // Aceita "raichu-alola", "alolan raichu", "raichu de alola", etc.
  const ALOLA_WORD = /(^|-)(?:de-)?alolan?(?:-form)?(?=-|$)/;
  const slug = (txt) => txt.trim().toLowerCase().replace(/\s+/g, "-");
  const wantsAlola = (txt) => ALOLA_WORD.test(slug(txt));
  const artUrls = (e) => {
    const id = formId(e),
      normal = ART + id + ".png";
    return e.shiny ? [ART + "shiny/" + id + ".png", normal] : [normal];
  };
  let dex = {},
    data = { have: [], want: [] },
    tab = "have",
    flt = "all",
    sortKey = "add",
    recoveryRequired = false,
    storageWarning = false;

  function normalizeCollection(value) {
    if (!value || !Array.isArray(value.have) || !Array.isArray(value.want))
      throw new Error("O backup deve conter as listas Tenho e Quero pegar.");
    const seen = new Set();
    const clean = (list) =>
      list.map((e) => {
        if (
          !e ||
          typeof e !== "object" ||
          !Number.isInteger(e.id) ||
          e.id < 1 ||
          e.id > 1025 ||
          typeof e.name !== "string" ||
          !e.name.trim()
        )
          throw new Error("O backup contém um Pokémon inválido.");
        if (
          e.iv != null &&
          (!Array.isArray(e.iv) ||
            e.iv.length !== 3 ||
            e.iv.some((v) => !Number.isInteger(v) || v < 0 || v > 15))
        )
          throw new Error("O backup contém IVs inválidos.");
        const cp = e.cp == null ? "" : String(e.cp);
        if (
          cp !== "" &&
          (!Number.isInteger(Number(cp)) ||
            Number(cp) < 10 ||
            Number(cp) > 100000)
        )
          throw new Error("O backup contém CP inválido.");
        let uid = e.uid;
        if (!["number", "string"].includes(typeof uid) || seen.has(uid))
          uid = Date.now() + Math.random();
        seen.add(uid);
        const entry = {
          uid,
          id: e.id,
          name: e.name.trim().slice(0, 140),
          cp,
          note: typeof e.note === "string" ? e.note.slice(0, 2000) : "",
          iv: e.iv ? e.iv.slice() : null,
        };
        Object.keys(FLAGS).forEach((f) => (entry[f] = e[f] === true));
        if (e.form === "alola" && hasAlola(e.id)) entry.form = "alola";
        if (entry.iv) entry.hundo = entry.iv.every((v) => v === 15);
        else if (entry.hundo) entry.iv = [15, 15, 15];
        if (typeof e.evolvedFrom === "string")
          entry.evolvedFrom = e.evolvedFrom.slice(0, 140);
        return entry;
      });
    return { have: clean(value.have), want: clean(value.want) };
  }
  try {
    const raw = localStorage.getItem("pgo");
    if (raw !== null) data = normalizeCollection(JSON.parse(raw));
  } catch (e) {
    recoveryRequired = true;
    $("msg").textContent =
      "Não foi possível ler a coleção salva. Exporte os dados originais e importe um backup válido para continuar.";
    window.setTimeout(
      () =>
        document.dispatchEvent(
          new CustomEvent("pgo-toast", {
            detail:
              "A coleção salva precisa ser recuperada. Exporte os dados originais na tela Minha coleção.",
          }),
        ),
      0,
    );
  }
  const fixHundo = () =>
    [...(data.have || []), ...(data.want || [])].forEach((e) => {
      if (e.hundo && !e.iv) e.iv = [15, 15, 15];
    });
  fixHundo();
  const save = () => {
    if (recoveryRequired) return;
    try {
      localStorage.setItem("pgo", JSON.stringify(data));
      storageWarning = false;
    } catch (e) {
      storageWarning = true;
      document.dispatchEvent(
        new CustomEvent("pgo-toast", {
          detail:
            "O navegador não conseguiu salvar. Exporte um backup para preservar sua coleção.",
        }),
      );
    }
    document.dispatchEvent(new CustomEvent("pgo-change"));
  };
  function validCP(id, msg) {
    const v = $(id).value;
    if (v !== "" && (!Number.isInteger(+v) || +v < 10 || +v > 100000)) {
      $(msg).textContent = "Informe um CP inteiro de pelo menos 10.";
      return false;
    }
    return true;
  }

  async function loadDex() {
    try {
      const c = JSON.parse(localStorage.getItem("pgo-dex") || "null");
      if (c) dex = c;
    } catch (e) {}
    if (!Object.keys(dex).length) {
      try {
        const j = await (
          await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025")
        ).json();
        j.results.forEach(
          (p) => (dex[p.name] = +p.url.split("/").filter(Boolean).pop()),
        );
        try {
          localStorage.setItem("pgo-dex", JSON.stringify(dex));
        } catch (e) {}
      } catch (e) {
        $("msg").textContent =
          "Sem internet para carregar os nomes. Você ainda pode usar o número da Pokédex.";
      }
    }
    $("names").innerHTML = Object.keys(dex)
      .flatMap((n) => (hasAlola(dex[n]) ? [n, n + "-alola"] : [n]))
      .map((n) => `<option value="${n}">`)
      .join("");
    document.dispatchEvent(new CustomEvent("pgo-dex-ready"));
  }

  function resolve(txt) {
    let t = slug(txt);
    const alola = ALOLA_WORD.test(t);
    if (alola) t = t.replace(ALOLA_WORD, "").replace(/^-+|-+$/g, "");
    let found = null;
    if (/^\d+$/.test(t)) {
      const id = +t;
      if (id > 0 && id <= 1025)
        found = {
          id,
          name: Object.keys(dex).find((k) => dex[k] === id) || "#" + id,
        };
    } else if (dex[t]) found = { id: dex[t], name: t };
    if (found && alola) {
      if (!hasAlola(found.id)) return null;
      found.form = "alola";
    }
    return found;
  }

  function add(list) {
    if (recoveryRequired) {
      $("msg").textContent =
        "Exporte os dados originais e importe um backup válido na tela Minha coleção antes de adicionar Pokémon.";
      return;
    }
    const p = resolve($("name").value);
    if (!p) {
      $("msg").textContent = wantsAlola($("name").value)
        ? "Não encontrei essa forma de Alola. Confira o nome ou escolha um Pokémon que tenha forma de Alola."
        : "Não encontrei esse Pokémon. Use o nome em inglês ou o número da Pokédex.";
      return;
    }
    const form =
      p.form || (hasAlola(p.id) && $("form").value === "alola" ? "alola" : "");
    const iv = readIV("iA", "iD", "iS");
    if (iv === false) {
      $("msg").textContent =
        "Preencha os três IVs (ataque, defesa e PS) ou deixe todos vazios.";
      return;
    }
    if (!validCP("cp", "msg")) return;
    $("msg").textContent = "";
    const e = {
      uid: Date.now() + Math.random(),
      id: p.id,
      name: p.name,
      cp: $("cp").value,
      note: $("note").value.trim(),
      iv,
    };
    if (form) e.form = form;
    Object.keys(FLAGS).forEach((f) => (e[f] = $(f).checked));
    if (iv && iv.every((x) => x === 15)) e.hundo = true;
    if (e.hundo && !e.iv) e.iv = [15, 15, 15];
    data[list].push(e);
    save();
    ["name", "cp", "note", "iA", "iD", "iS"].forEach((i) => ($(i).value = ""));
    Object.keys(FLAGS).forEach((f) => ($(f).checked = false));
    $("form").value = "";
    syncForm();
    showIV("iA", "iD", "iS", "ivRes");
    upd();
    tab = list;
    render();
    if ($("dAdd").open) $("dAdd").close();
    document.dispatchEvent(
      new CustomEvent("pgo-added", { detail: { list, name: p.name } }),
    );
  }

  // A arte segue a forma do registro (normal ou de Alola) e a tag shiny.
  // Se a arte shiny não existir, volta para a normal da mesma forma.
  function pic(e) {
    const img = document.createElement("img");
    img.alt = e.name + (e.form === "alola" ? " (Alola)" : "");
    img.loading = "lazy";
    const urls = artUrls(e);
    let i = 0;
    img.src = urls[0];
    img.onerror = () => {
      if (++i < urls.length) img.src = urls[i];
      else img.replaceWith(document.createTextNode("?"));
    };
    return img;
  }
  const searchName = (e) =>
    e.name.toLowerCase() + (e.form === "alola" ? " alola alolan" : "");

  const SORTS = [
    ["add", "Ordem de adição"],
    ["recent", "Mais recentes"],
    ["cpd", "CP: maior primeiro"],
    ["cpa", "CP: menor primeiro"],
    ["ivd", "IV: maior primeiro"],
    ["iva", "IV: menor primeiro"],
    ["name", "Nome (A-Z)"],
    ["dex", "Número da Pokédex"],
  ];
  function drawFil() {
    const mk = (box, list, cur, set) => {
      $(box).innerHTML = "";
      list.forEach(([k, v]) => {
        const b = document.createElement("button");
        b.className = "f" + (cur() === k ? " on" : "");
        b.textContent = v;
        b.onclick = () => {
          set(k);
          drawFil();
          render();
        };
        $(box).append(b);
      });
    };
    mk(
      "fSort",
      SORTS,
      () => sortKey,
      (k) => (sortKey = k),
    );
    mk(
      "fTags",
      [["all", "Todos"], ...Object.entries(FLAGS)],
      () => flt,
      (k) => (flt = k),
    );
  }

  function render() {
    document.querySelectorAll("[data-filter]").forEach((b) => {
      b.classList.toggle("selected", b.dataset.filter === flt);
      b.setAttribute("aria-pressed", String(b.dataset.filter === flt));
    });
    document.querySelectorAll(".tab").forEach((b) => {
      b.classList.toggle("on", b.dataset.t === tab);
      b.textContent =
        (b.dataset.t === "have" ? "Tenho" : "Quero pegar") +
        " (" +
        data[b.dataset.t].length +
        ")";
    });
    const act = (flt !== "all") + (sortKey !== "add");
    $("fbtn").textContent = "Filtrar / Ordenar" + (act ? " (" + act + ")" : "");
    const q = $("q").value.trim().toLowerCase();
    const g = $("grid");
    g.innerHTML = "";
    const cpOf = (e) => (e.cp === "" || e.cp == null ? null : +e.cp);
    const items = data[tab].filter(
      (e) =>
        (!q ||
          searchName(e).includes(q) ||
          String(e.id) === q.replace("#", "")) &&
        (flt === "all" || e[flt]),
    );
    const so = sortKey,
      big = 1e9;
    const cmp = {
      cpd: (a, b) => (cpOf(b) ?? -1) - (cpOf(a) ?? -1),
      cpa: (a, b) => (cpOf(a) ?? big) - (cpOf(b) ?? big),
      ivd: (a, b) => (ivp(b) ?? -1) - (ivp(a) ?? -1),
      iva: (a, b) => (ivp(a) ?? big) - (ivp(b) ?? big),
      name: (a, b) => a.name.localeCompare(b.name),
      dex: (a, b) => a.id - b.id,
    }[so];
    if (so === "recent") items.reverse();
    else if (cmp) items.sort(cmp);
    $("count").textContent =
      items.length + " de " + data[tab].length + " Pokémon";
    if (!items.length) {
      g.innerHTML =
        '<div class="empty"><h3>' +
        (data[tab].length
          ? "Nenhum Pokémon com esses filtros."
          : tab === "have"
            ? "Sua jornada começa com uma captura."
            : "Quem será sua próxima captura?") +
        "</h3><p>" +
        (data[tab].length
          ? "Tente outro nome ou remova os filtros."
          : tab === "have"
            ? "Registre seu primeiro Pokémon, suas variantes e os IVs. Sua coleção fica salva neste navegador."
            : "Adicione seus favoritos à lista ou descubra encontros no guia de capturas.") +
        '</p><button class="primary">' +
        (data[tab].length ? "Limpar filtros" : "Adicionar Pokémon") +
        "</button></div>";
      g.querySelector("button").onclick = () => {
        if (data[tab].length) {
          flt = "all";
          sortKey = "add";
          $("q").value = "";
          render();
        } else $("dAdd").showModal();
      };
      return;
    }
    items.forEach((e) => {
      const on = Object.keys(FLAGS).filter((f) => e[f]);
      const c = document.createElement("div");
      c.className = "card " + on.join(" ");
      const lt = levelText(e);
      c.innerHTML = `<div class="cp">${e.cp ? "CP <b>" + (+e.cp | 0) + "</b>" + (lt ? '<span class="lv">Nível <b>' + lt + "</b></span>" : "") : ""}</div><div class="pic"></div><div class="badges">${on.map((f) => `<span class="b ${f}">${FLAGS[f]}</span>`).join("")}${e.form === "alola" ? '<span class="b alola">Alola</span>' : ""}</div><div class="nm"></div><div class="from"></div><div class="iv"></div><div class="nt"></div><div class="acts"></div>`;
      c.querySelector(".pic").append(pic(e));
      const nm = c.querySelector(".nm");
      nm.textContent = e.name + " ";
      const id = document.createElement("span");
      id.className = "id";
      id.textContent = "#" + e.id;
      nm.append(id);
      c.querySelector(".nt").textContent = e.note || "";
      c.querySelector(".from").textContent = e.evolvedFrom
        ? "Evoluiu de " + e.evolvedFrom
        : "";
      c.querySelector(".iv").textContent = e.iv
        ? "IV " +
          String(ivp(e)).replace(".", ",") +
          "% (" +
          e.iv.join("/") +
          ")"
        : "";
      const a = c.querySelector(".acts");
      const mk = (t, fn) => {
        const b = document.createElement("button");
        b.className = "ghost";
        b.textContent = t;
        b.onclick = fn;
        a.append(b);
      };
      if (tab === "want")
        mk("Peguei!", () => {
          data.want = data.want.filter((x) => x.uid !== e.uid);
          data.have.push(e);
          save();
          render();
        });
      else {
        const ev = evoCache[e.id];
        if ((ev && ev.length) || (!ev && evoFail.has(e.id)))
          mk("Evoluir", () => openEvo(e));
      }
      mk("Editar", () => openEdit(e));
      const d = document.createElement("button");
      d.className = "ghost";
      d.textContent = "Remover";
      d.onclick = () => {
        const list = tab,
          index = data[list].indexOf(e);
        data[list] = data[list].filter((x) => x.uid !== e.uid);
        save();
        render();
        document.dispatchEvent(
          new CustomEvent("pgo-removed", {
            detail: {
              entry: e,
              undo: () => {
                if (!data[list].some((x) => x.uid === e.uid)) {
                  data[list].splice(index, 0, e);
                  save();
                  render();
                }
              },
            },
          }),
        );
      };
      a.append(d);
      g.append(c);
    });
    const need = [
      ...new Set(items.filter((e) => e.iv && cpOf(e) && !e.mega).map(formId)),
    ].filter((id) => !statsOf(id) && !statsFail.has(id));
    if (need.length) Promise.all(need.map(getStats)).then(render);
    if (tab === "have") {
      const miss = [...new Set(items.map((e) => e.id))].filter(
        (id) => !evoCache[id] && !evoFail.has(id),
      );
      if (miss.length) Promise.all(miss.map(getEvos)).then(render);
    }
  }

  // Game Master do Pokémon GO (PokeMiners/game_masters), níveis 1 a 51.
  // Meios níveis: raiz da média dos quadrados dos multiplicadores vizinhos.
  // prettier-ignore
  const CPI=[0.094,0.16639787,0.21573247,0.25572005,0.29024988,0.3210876,0.34921268,0.3752356,0.39956728,0.4225,0.44310755,0.4627984,0.48168495,0.49985844,0.51739395,0.5343543,0.5507927,0.5667545,0.5822789,0.5974,0.6121573,0.6265671,0.64065295,0.65443563,0.667934,0.6811649,0.69414365,0.7068842,0.7193991,0.7317,0.7377695,0.74378943,0.74976104,0.7556855,0.76156384,0.76739717,0.7731865,0.77893275,0.784637,0.7903,0.7953,0.8003,0.8053,0.8103,0.8153,0.8203,0.8253,0.8303,0.8353,0.8403,0.8453];
  const cpm = (l) => {
    if (Number.isInteger(l)) return CPI[l - 1];
    const a = CPI[Math.floor(l) - 1],
      b = CPI[Math.ceil(l) - 1];
    return Math.sqrt((a * a + b * b) / 2);
  };
  let statsCache = {};
  try {
    statsCache = JSON.parse(localStorage.getItem("pgo-stats") || "{}");
  } catch (e) {}
  const statsFail = new Set();
  // [ataque, defesa, PS] base no Pokémon GO, do número 1 ao 1025 (null = usa a conversão pela PokéAPI)
  // prettier-ignore
  const GO_STATS=[[118,111,128],[151,143,155],[198,189,190],[116,93,118],[158,126,151],[223,173,186],[94,121,127],[126,155,153],[171,207,188],[55,55,128],[45,80,137],[167,137,155],[63,50,120],[46,75,128],[169,130,163],[85,73,120],[117,105,160],[166,154,195],[103,70,102],[161,139,146],[112,60,120],[182,133,163],[110,97,111],[167,153,155],[112,96,111],[193,151,155],[126,120,137],[182,175,181],[86,89,146],[117,120,172],[180,173,207],[105,76,130],[137,111,156],[204,156,191],[107,108,172],[178,162,216],[96,109,116],[169,190,177],[80,41,251],[156,90,295],[83,73,120],[161,150,181],[131,112,128],[153,136,155],[202,167,181],[121,99,111],[165,146,155],[100,100,155],[179,143,172],[109,78,67],[167,134,111],[92,78,120],[150,136,163],[122,95,137],[191,162,190],[148,82,120],[207,138,163],[136,93,146],[227,166,207],[101,82,120],[130,123,163],[182,184,207],[195,82,93],[232,117,120],[271,167,146],[137,82,172],[177,125,190],[234,159,207],[139,61,137],[172,92,163],[207,135,190],[97,149,120],[166,209,190],[132,132,120],[164,164,146],[211,198,190],[170,127,137],[207,162,163],[109,98,207],[177,180,216],[165,121,93],[223,169,137],[124,115,141],[158,83,111],[218,140,155],[85,121,163],[139,177,207],[135,90,190],[190,172,233],[116,134,102],[186,256,137],[186,67,102],[223,107,128],[261,149,155],[85,232,111],[89,136,155],[144,193,198],[181,124,102],[240,181,146],[109,111,120],[173,173,155],[107,125,155],[233,149,216],[90,144,137],[144,186,155],[224,181,137],[193,197,137],[108,137,207],[119,141,120],[174,197,163],[140,127,190],[222,171,233],[60,128,487],[183,169,163],[181,165,233],[129,103,102],[187,156,146],[123,110,128],[175,147,190],[137,112,102],[210,184,155],[192,205,120],[218,170,172],[223,151,163],[198,158,163],[206,154,163],[238,182,163],[198,183,181],[29,85,85],[237,186,216],[165,174,277],[91,91,134],[104,114,146],[205,161,277],[232,182,163],[246,179,163],[153,136,163],[155,153,111],[207,201,172],[148,140,102],[220,186,155],[221,159,190],[190,169,330],[192,236,207],[253,185,207],[251,181,207],[119,91,121],[163,135,156],[263,198,209],[300,182,214],[210,210,225],[92,122,128],[122,155,155],[168,202,190],[116,93,118],[158,126,151],[223,173,186],[117,109,137],[150,142,163],[205,188,198],[79,73,111],[148,125,198],[67,88,155],[145,156,225],[72,118,120],[107,179,146],[105,73,120],[161,124,172],[194,178,198],[106,97,181],[146,137,268],[77,53,85],[75,79,137],[69,32,207],[67,116,111],[139,181,146],[134,89,120],[192,146,163],[114,79,146],[145,109,172],[211,169,207],[169,186,181],[37,93,172],[112,152,225],[167,176,172],[174,179,207],[67,94,111],[91,120,146],[118,183,181],[136,112,146],[55,55,102],[185,135,181],[154,94,163],[75,66,146],[152,143,216],[261,175,163],[126,240,216],[175,87,155],[177,180,216],[167,154,155],[136,91,134],[60,106,382],[182,133,172],[108,122,137],[161,205,181],[131,128,225],[143,184,163],[148,272,181],[137,85,155],[212,131,207],[184,138,163],[236,181,172],[17,396,85],[234,179,190],[189,146,146],[142,93,155],[236,144,207],[118,71,120],[139,191,137],[90,69,137],[181,138,225],[118,156,146],[127,69,111],[197,141,181],[128,90,128],[148,226,163],[148,226,163],[152,83,128],[224,144,181],[194,194,181],[107,98,207],[214,185,207],[198,180,198],[192,131,177],[40,83,146],[64,64,111],[173,207,137],[153,91,128],[135,101,128],[151,99,128],[157,193,216],[129,169,496],[241,195,207],[235,171,251],[180,235,225],[115,93,137],[155,133,172],[251,207,225],[193,310,235],[239,244,214],[210,210,225],[124,94,120],[172,120,137],[223,169,172],[130,87,128],[163,115,155],[240,141,190],[126,93,137],[156,133,172],[208,175,225],[96,61,111],[171,132,172],[58,80,116],[142,128,186],[75,59,128],[60,77,137],[189,98,155],[60,77,137],[98,162,155],[71,77,120],[112,119,155],[173,176,190],[71,77,120],[134,78,172],[200,121,207],[106,61,120],[185,124,155],[106,61,120],[175,174,155],[79,59,99],[117,90,116],[237,195,169],[93,87,120],[192,150,172],[74,110,155],[241,144,155],[104,92,155],[159,145,190],[290,166,284],[80,126,104],[199,112,156],[153,73,1],[92,42,162],[134,81,197],[179,137,232],[99,54,176],[209,114,302],[36,71,137],[82,215,102],[84,79,137],[132,127,172],[141,136,137],[155,141,137],[121,141,137],[158,198,155],[198,257,172],[78,107,102],[121,152,155],[123,78,120],[215,127,172],[167,129,155],[147,150,155],[143,166,163],[143,166,163],[186,131,137],[80,99,172],[140,159,225],[171,39,128],[243,83,172],[136,68,277],[175,87,347],[119,79,155],[194,136,172],[151,203,172],[125,122,155],[171,188,190],[116,116,155],[162,78,128],[134,99,137],[205,168,190],[156,74,137],[221,115,172],[76,132,128],[141,201,181],[222,124,177],[196,118,177],[178,153,207],[178,153,207],[93,82,137],[151,141,242],[141,99,125],[224,142,160],[77,124,120],[140,229,155],[105,150,165],[152,194,200],[176,100,128],[222,174,181],[29,85,85],[192,219,216],[139,139,172],[161,189,155],[138,65,127],[218,126,162],[70,162,85],[124,234,120],[136,163,223],[175,170,181],[246,120,163],[41,86,216],[95,95,137],[162,162,190],[95,90,172],[137,132,207],[182,176,242],[133,135,111],[197,179,146],[211,179,146],[162,203,225],[81,128,125],[134,93,128],[172,155,163],[277,168,216],[96,132,120],[138,176,155],[257,228,190],[179,309,190],[179,309,190],[143,285,190],[228,246,190],[268,212,190],[270,228,205],[270,228,205],[284,170,213],[210,210,225],[345,115,137],[119,110,146],[157,143,181],[202,188,216],[113,86,127],[158,105,162],[222,151,183],[112,102,142],[150,139,162],[210,186,197],[101,58,120],[142,94,146],[234,140,198],[80,73,153],[162,119,188],[45,74,114],[160,100,184],[117,64,128],[159,95,155],[232,156,190],[91,109,120],[243,185,155],[218,71,167],[295,109,219],[76,195,102],[94,286,155],[53,83,120],[141,180,155],[185,98,172],[59,83,102],[149,190,172],[94,172,155],[132,67,146],[221,114,198],[108,92,128],[170,153,172],[103,105,183],[169,143,244],[205,143,181],[117,80,207],[180,102,312],[130,105,146],[156,194,163],[211,187,155],[243,103,225],[109,82,135],[172,133,174],[114,94,128],[121,90,160],[184,132,230],[43,154,149],[161,213,167],[124,133,137],[125,142,85],[25,77,225],[183,91,183],[169,199,137],[124,84,151],[172,125,169],[261,193,239],[137,117,286],[127,78,120],[236,144,172],[124,118,169],[201,191,239],[93,151,120],[180,202,172],[116,76,134],[211,133,195],[187,136,179],[96,116,135],[142,170,170],[105,179,128],[115,105,155],[178,158,207],[243,171,172],[238,205,172],[161,181,242],[241,190,251],[207,184,225],[249,163,181],[247,172,181],[225,217,198],[231,156,200],[216,219,163],[238,205,163],[185,222,181],[247,146,242],[264,150,198],[237,195,169],[135,275,155],[180,254,128],[171,150,172],[185,159,137],[156,270,181],[212,212,190],[270,151,181],[275,211,205],[280,215,189],[251,213,209],[287,210,221],[187,225,284],[152,258,260],[162,162,190],[210,210,225],[285,198,172],[210,210,225],[238,238,237],[210,210,225],[88,107,128],[122,152,155],[161,204,181],[115,85,163],[173,106,207],[235,127,242],[117,85,146],[159,116,181],[212,157,216],[98,73,128],[165,139,155],[107,86,128],[145,126,163],[206,182,198],[98,73,121],[187,106,162],[104,94,137],[206,133,181],[104,94,137],[206,133,181],[104,94,137],[206,133,181],[111,92,183],[183,166,253],[98,80,137],[144,107,158],[226,146,190],[118,64,128],[211,136,181],[121,110,146],[174,143,172],[226,201,198],[107,85,163],[161,119,167],[154,85,155],[255,129,242],[114,163,230],[134,87,181],[180,134,198],[243,158,233],[98,78,137],[128,109,181],[188,150,233],[172,160,260],[231,153,181],[96,124,128],[115,162,146],[205,165,181],[83,99,102],[100,173,120],[203,175,155],[71,111,120],[164,176,155],[119,91,128],[214,155,172],[189,129,172],[132,69,137],[155,90,155],[229,158,216],[153,86,172],[263,114,233],[201,130,181],[118,128,137],[188,200,172],[132,132,137],[163,222,163],[204,167,176],[95,141,116],[163,237,151],[134,146,144],[192,197,179],[213,89,146],[292,139,181],[96,122,137],[181,164,190],[153,78,120],[250,127,155],[98,80,146],[198,130,181],[98,112,128],[137,153,155],[176,205,172],[170,83,128],[208,103,163],[214,148,242],[84,96,158],[182,132,181],[118,106,113],[151,138,139],[218,184,174],[115,100,155],[198,146,190],[158,127,146],[137,87,137],[223,187,172],[97,91,170],[155,139,249],[115,134,146],[159,178,225],[138,131,338],[110,98,137],[201,128,172],[82,155,127],[158,223,179],[98,121,120],[150,174,155],[199,214,155],[105,78,111],[156,130,163],[217,152,198],[148,100,146],[221,163,181],[108,98,137],[169,115,155],[271,182,155],[154,101,130],[212,123,165],[284,172,183],[128,74,146],[233,152,216],[190,218,190],[72,140,137],[220,120,190],[144,171,240],[160,98,128],[258,127,163],[213,170,184],[127,92,153],[222,154,205],[154,114,128],[232,176,163],[195,182,216],[150,97,172],[232,152,225],[105,139,172],[129,205,242],[204,129,198],[217,188,151],[116,93,141],[159,135,176],[256,188,211],[156,107,146],[264,189,198],[192,229,209],[260,192,209],[192,229,209],[266,164,188],[266,164,188],[275,211,205],[275,211,205],[261,182,205],[246,170,245],[260,192,209],[250,225,225],[252,199,174],[110,106,148],[146,156,156],[201,204,204],[116,102,120],[171,130,153],[230,189,181],[122,84,121],[168,114,144],[223,152,176],[68,72,116],[112,155,198],[95,80,128],[145,110,158],[176,155,186],[63,63,116],[48,89,128],[176,103,190],[139,112,158],[221,149,200],[108,120,127],[136,151,144],[212,244,186],[123,102,165],[196,146,265],[145,107,167],[226,146,216],[164,167,181],[120,114,158],[166,167,179],[135,139,128],[188,206,153],[97,272,155],[110,113,186],[173,150,226],[109,119,158],[168,163,193],[98,95,142],[177,165,200],[96,120,123],[194,205,176],[109,109,137],[177,207,163],[108,117,137],[221,171,174],[115,78,127],[219,168,158],[158,123,151],[227,191,193],[124,109,184],[186,163,265],[203,205,216],[195,153,186],[164,134,167],[95,285,137],[101,112,128],[159,176,169],[220,242,207],[160,179,149],[125,103,125],[201,154,198],[122,124,127],[171,219,146],[117,120,146],[196,240,216],[83,73,120],[205,175,198],[250,185,246],[250,185,246],[203,232,239],[190,285,137],[261,187,173],[252,216,190],[102,99,169],[142,139,186],[210,179,186],[128,79,128],[174,103,163],[214,175,216],[120,103,137],[168,145,155],[232,195,190],[136,59,111],[159,100,146],[222,146,190],[122,56,134],[194,113,204],[115,85,132],[145,161,149],[254,158,184],[150,104,132],[231,138,219],[196,145,181],[110,81,120],[198,146,155],[117,78,128],[231,140,181],[46,43,128],[98,110,137],[114,273,137],[175,121,172],[214,174,225],[72,117,116],[126,219,169],[100,64,120],[192,169,172],[108,119,120],[154,168,155],[136,80,134],[228,130,169],[136,95,172],[226,141,260],[55,69,123],[78,94,141],[222,195,176],[165,215,139],[168,192,207],[222,160,225],[67,74,93],[218,226,181],[120,118,146],[178,178,198],[97,224,146],[184,184,216],[198,198,216],[116,194,155],[216,165,163],[165,215,155],[190,145,163],[177,199,146],[208,145,169],[231,164,186],[233,179,172],[102,108,128],[145,162,146],[222,240,181],[250,181,172],[259,208,172],[249,215,172],[189,254,172],[54,57,125],[54,242,125],[255,191,264],[255,191,264],[249,210,240],[236,196,216],[316,85,174],[330,144,195],[207,199,219],[323,182,139],[188,99,440],[251,195,219],[246,225,190],[265,190,207],[145,133,167],[263,159,177],[213,298,156],[315,148,142],[252,177,204],[118,99,130],[226,190,264],[122,91,137],[165,134,172],[239,168,225],[132,79,137],[170,125,163],[238,163,190],[132,79,137],[186,113,163],[262,142,172],[95,86,172],[160,156,260],[88,67,116],[129,110,169],[163,192,221],[46,67,93],[87,157,137],[156,240,155],[85,82,120],[172,164,172],[70,104,120],[148,211,155],[76,97,123],[159,198,176],[114,85,137],[213,164,207],[80,90,153],[197,131,170],[73,91,102],[114,157,190],[146,198,242],[71,116,120],[214,144,172],[178,146,242],[103,123,141],[202,207,176],[173,163,172],[118,72,121],[258,127,156],[97,65,120],[224,140,181],[118,90,137],[220,158,225],[121,103,137],[209,162,190],[134,96,120],[248,189,155],[98,93,123],[153,133,149],[237,182,149],[103,69,128],[145,102,163],[227,139,216],[180,194,212],[195,162,172],[253,182,155],[248,176,158],[212,179,190],[163,237,151],[90,97,128],[203,203,163],[193,170,163],[176,161,134],[76,59,102],[230,155,172],[222,182,225],[148,195,181],[208,166,155],[192,121,151],[140,91,176],[226,126,263],[195,165,207],[190,166,207],[175,185,207],[171,185,207],[239,185,172],[117,61,99],[163,105,169],[266,170,204],[254,236,192],[254,236,192],[278,192,268],[170,112,155],[254,177,225],[242,215,233],[250,125,190],[202,101,400],[246,223,225],[273,146,205],[162,162,225],[206,145,230],[253,174,172],[243,181,277],null,[259,158,190],[222,171,198],[281,162,179],[116,99,120],[157,128,156],[233,153,183],[112,96,167],[162,134,191],[207,178,232],[120,86,146],[162,123,172],[236,159,198],[81,79,144],[186,153,242],[70,77,111],[139,166,155],[81,65,107],[199,144,174],[95,45,128],[147,82,155],[232,141,172],[98,90,137],[159,157,179],[102,126,114],[159,212,149],[100,89,121],[137,131,141],[219,189,186],[185,105,193],[95,108,146],[105,160,155],[171,212,225],[92,74,120],[234,185,198],[239,189,181],[104,73,156],[184,165,240],[105,75,120],[221,132,172],[140,108,155],[230,168,190],[124,70,120],[199,149,160],[121,64,120],[228,144,146],[97,149,120],[166,209,190],[184,185,172],[118,76,137],[216,130,163],[86,108,121],[201,178,181],[105,60,102],[204,127,216],[85,110,137],[109,145,163],[155,196,198],[109,52,67],[205,136,111],[198,172,172],[90,80,172],[143,144,225],[123,107,128],[229,168,190],[205,142,172],[161,219,172],[187,104,134],[246,177,195],[105,106,137],[186,195,176],[227,145,193],[119,80,239],[208,123,347],[196,139,207],[176,178,312],[226,166,169],[220,178,242],[127,151,277],[209,136,260],[188,150,268],[238,203,225],[249,209,251],[139,234,251],[232,190,244],[280,235,146],[261,193,198],[244,195,198],[227,216,207],[266,211,148],[245,177,319],[249,179,214],[281,196,190],[250,200,225],[134,86,163],[173,128,207],[254,168,229],[140,76,128],[252,190,202],[186,242,198],[261,167,190],[194,203,321],[269,221,146],[280,196,233],[279,171,179],[263,223,205],[263,223,205],[233,171,203],[236,194,189],[173,184,190],[134,96,120],[225,191,174],[220,191,186],[238,157,186],[169,208,186],[219,178,173],[250,215,207],[216,186,235],[205,208,213],[235,165,245],[227,195,189],[221,200,189],[126,165,207],[164,248,186]];
  const statsOf = (id) => GO_STATS[id - 1] || statsCache[id];
  async function getStats(id) {
    if (statsOf(id)) return statsOf(id);
    try {
      const j = await (
        await fetch("https://pokeapi.co/api/v2/pokemon/" + id)
      ).json();
      const st = {};
      j.stats.forEach((x) => (st[x.stat.name] = x.base_stat));
      const sp = 1 + (st.speed - 75) / 500,
        A = st.attack,
        SA = st["special-attack"],
        D = st.defense,
        SD = st["special-defense"];
      statsCache[id] = [
        Math.round(
          2 * ((7 / 8) * Math.max(A, SA) + (1 / 8) * Math.min(A, SA)) * sp,
        ),
        Math.round(
          2 * ((5 / 8) * Math.max(D, SD) + (3 / 8) * Math.min(D, SD)) * sp,
        ),
        st.hp === 1 ? 1 : Math.floor(st.hp * 1.75 + 50),
      ];
      try {
        localStorage.setItem("pgo-stats", JSON.stringify(statsCache));
      } catch (e) {}
      return statsCache[id];
    } catch (err) {
      statsFail.add(id);
      return null;
    }
  }
  function calcLevel(st, iv, cp) {
    const base =
      (st[0] + iv[0]) * Math.sqrt(st[1] + iv[1]) * Math.sqrt(st[2] + iv[2]);
    const ex = [];
    let best = null;
    for (let l = 1; l <= 51; l += 0.5) {
      const c = Math.max(10, Math.floor((base * cpm(l) * cpm(l)) / 10));
      if (c === cp) ex.push(l);
      const d = Math.abs(c - cp);
      if (!best || d < best.d) best = { l, d };
    }
    if (ex.length) return { lo: ex[0], hi: ex[ex.length - 1], exact: true };
    if (best.d <= Math.max(3, cp * 0.015))
      return { lo: best.l, hi: best.l, exact: false };
    return null;
  }
  const fmtLv = (r) => {
    const f = (n) => String(n).replace(".", ",");
    return r.exact
      ? r.lo === r.hi
        ? f(r.lo)
        : f(r.lo) + " a " + f(r.hi)
      : "~" + f(r.lo);
  };
  function levelText(e) {
    const cp = +e.cp,
      st = statsOf(formId(e));
    if (e.mega || !e.iv || !cp || !st) return "";
    const r = calcLevel(st, e.iv, cp);
    return r ? fmtLv(r) : "";
  }
  async function updateLv(out, id, cpId, ivIds, mega) {
    const el = $(out),
      tok = (el._t = (el._t || 0) + 1);
    const set = (t, dim) => {
      if (el._t !== tok) return;
      el.textContent = t;
      el.classList.toggle("dim", dim);
    };
    const iv = readIV(...ivIds),
      cp = +$(cpId).value;
    if (!id || !cp || !iv || mega) {
      set("—", true);
      return;
    }
    const st = await getStats(id);
    if (!st) {
      set("—", true);
      return;
    }
    const r = calcLevel(st, iv, cp);
    set(r ? fmtLv(r) : "Não confere", !r);
  }
  const ivp = (e) =>
    e.iv
      ? Math.round((e.iv.reduce((a, b) => a + b, 0) / 45) * 1000) / 10
      : null;
  function showIV(a, b, c, out) {
    const v = [a, b, c].map((i) => $(i).value),
      el = $(out);
    let t = "—",
      dim = true;
    if (v.some((x) => x !== "")) {
      if (v.some((x) => x === "" || isNaN(x))) t = "Incompleto";
      else {
        const sum = v.reduce((n, x) => n + Math.min(15, Math.max(0, +x)), 0);
        t = (Math.round((sum / 45) * 1000) / 10).toLocaleString("pt-BR") + "%";
        dim = false;
      }
    }
    el.textContent = t;
    el.classList.toggle("dim", dim);
  }
  function readIV(a, b, c) {
    const v = [a, b, c].map((i) => $(i).value);
    if (v.every((x) => x === "")) return null;
    if (v.some((x) => x === "" || !Number.isInteger(+x) || +x < 0 || +x > 15))
      return false;
    return v.map(Number);
  }
  let evoCache = {};
  try {
    evoCache = JSON.parse(localStorage.getItem("pgo-evo") || "{}");
  } catch (e) {}
  const evoFail = new Set();
  async function getEvos(id) {
    if (evoCache[id]) return evoCache[id];
    try {
      const sp = await (
        await fetch("https://pokeapi.co/api/v2/pokemon-species/" + id)
      ).json();
      const ch = await (await fetch(sp.evolution_chain.url)).json();
      const find = (n) =>
        n.species.name === sp.name ? n : n.evolves_to.map(find).find(Boolean);
      const node = find(ch.chain);
      evoCache[id] = node ? node.evolves_to.map((n) => n.species.name) : [];
      try {
        localStorage.setItem("pgo-evo", JSON.stringify(evoCache));
      } catch (e) {}
      return evoCache[id];
    } catch (err) {
      evoFail.add(id);
      return null;
    }
  }
  let cur = null;
  function openEdit(e) {
    cur = e;
    $("eTitle").textContent =
      "Editar " + e.name + (e.form === "alola" ? " (Alola)" : "");
    $("eFormBox").hidden = !hasAlola(e.id);
    $("eForm").value = e.form === "alola" && hasAlola(e.id) ? "alola" : "";
    const box = $("eFlags");
    box.innerHTML = "";
    Object.keys(FLAGS).forEach((f) => {
      const l = document.createElement("label");
      l.className = "chip c-" + f;
      l.innerHTML =
        '<input type="checkbox" data-f="' +
        f +
        '"><span>' +
        FLAGS[f] +
        "</span>";
      l.querySelector("input").checked = !!e[f];
      box.append(l);
    });
    $("eCp").value = e.cp || "";
    $("eNote").value = e.note || "";
    ["eA", "eD", "eS"].forEach((id, i) => ($(id).value = e.iv ? e.iv[i] : ""));
    $("eMsg").textContent = "";
    showIV("eA", "eD", "eS", "eRes");
    eUpd();
    $("dEdit").showModal();
  }
  $("eSave").onclick = () => {
    const iv = readIV("eA", "eD", "eS");
    if (iv === false) {
      $("eMsg").textContent = "Preencha os três IVs ou deixe todos vazios.";
      return;
    }
    if (!validCP("eCp", "eMsg")) return;
    cur.iv = iv;
    document
      .querySelectorAll("#eFlags input")
      .forEach((i) => (cur[i.dataset.f] = i.checked));
    if (iv && iv.every((x) => x === 15)) cur.hundo = true;
    if (cur.hundo && !cur.iv) cur.iv = [15, 15, 15];
    if (hasAlola(cur.id) && $("eForm").value === "alola") cur.form = "alola";
    else delete cur.form;
    cur.cp = $("eCp").value;
    cur.note = $("eNote").value.trim();
    save();
    $("dEdit").close();
    render();
  };
  $("eCancel").onclick = () => $("dEdit").close();

  async function openEvo(e) {
    cur = e;
    $("vTitle").textContent = "Evoluir " + e.name;
    $("vName").value = "";
    $("vCp").value = "";
    $("vMsg").textContent = "";
    const box = $("vOpts");
    box.innerHTML = '<span class="hint">Buscando evoluções…</span>';
    $("dEvo").showModal();
    const list = (await getEvos(e.id)) || [];
    box.innerHTML = "";
    if (!list.length) {
      box.innerHTML =
        '<span class="hint">Nenhuma evolução encontrada. Digite o nome abaixo.</span>';
      return;
    }
    list.forEach((n) => {
      const b = document.createElement("button");
      b.className = "evo";
      b.textContent = n;
      b.onclick = () => {
        $("vName").value = n;
        box
          .querySelectorAll(".evo")
          .forEach((x) => x.classList.toggle("on", x === b));
      };
      box.append(b);
    });
  }
  $("vOk").onclick = () => {
    const p = resolve($("vName").value);
    if (!p) {
      $("vMsg").textContent = "Escolha uma evolução ou digite um nome válido.";
      return;
    }
    if (!validCP("vCp", "vMsg")) return;
    cur.evolvedFrom = cur.name;
    cur.id = p.id;
    cur.name = p.name;
    // Mantém a forma de Alola se a evolução também a tiver; senão volta ao normal.
    if (p.form || (cur.form === "alola" && hasAlola(p.id))) cur.form = "alola";
    else delete cur.form;
    cur.cp = $("vCp").value;
    save();
    $("dEvo").close();
    render();
  };
  $("vCancel").onclick = () => $("dEvo").close();

  $("addHave").onclick = () => add("have");
  $("addWant").onclick = () => add("want");
  $("name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") add(tab);
  });
  document.querySelectorAll(".tab").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.t;
        location.hash = tab === "have" ? "collection" : "wishlist";
        render();
      }),
  );
  const upd = () => {
    const p = resolve($("name").value);
    updateLv(
      "lvRes",
      p && formIdFor(p.id, p.form || $("form").value),
      "cp",
      ["iA", "iD", "iS"],
      $("mega").checked,
    );
  };
  // Mostra o campo "Forma" só quando a espécie tem forma de Alola.
  function syncForm() {
    const p = resolve($("name").value),
      can = !!p && hasAlola(p.id);
    $("formRow").hidden = !can;
    if (!can) $("form").value = "";
    else if (p.form) $("form").value = "alola";
  }
  ["cp", "iA", "iD", "iS"].forEach((i) => $(i).addEventListener("input", upd));
  $("name").addEventListener("input", () => {
    syncForm();
    upd();
  });
  $("form").addEventListener("change", () => {
    const p = resolve($("name").value);
    if (p && p.form && $("form").value !== "alola") $("name").value = p.name;
    upd();
  });
  $("mega").addEventListener("change", upd);
  const eMega = () =>
    document.querySelector("#eFlags input[data-f=mega]").checked;
  const eUpd = () =>
    updateLv(
      "eLv",
      cur && formIdFor(cur.id, $("eForm").value),
      "eCp",
      ["eA", "eD", "eS"],
      eMega(),
    );
  ["eCp", "eA", "eD", "eS"].forEach((i) =>
    $(i).addEventListener("input", eUpd),
  );
  $("eForm").addEventListener("change", eUpd);
  $("eFlags").addEventListener("change", (ev) => {
    if (ev.target.dataset.f === "hundo") {
      setHundoIV(eIV, ev.target.checked);
      showIV(...eIV, "eRes");
    }
    eUpd();
  });
  $("q").oninput = render;
  function syncHundo(ids, chip) {
    const v = ids.map((i) => $(i).value);
    if (v.every((x) => x === "15")) chip().checked = true;
    else if (v.some((x) => x !== "" && x !== "15")) chip().checked = false;
  }
  function setHundoIV(ids, on) {
    if (on) ids.forEach((i) => ($(i).value = 15));
    else if (ids.every((i) => $(i).value === "15"))
      ids.forEach((i) => ($(i).value = ""));
  }
  const mIV = ["iA", "iD", "iS"],
    eIV = ["eA", "eD", "eS"];
  const eChip = () => document.querySelector("#eFlags input[data-f=hundo]");
  mIV.forEach(
    (i) =>
      ($(i).oninput = () => {
        showIV(...mIV, "ivRes");
        syncHundo(mIV, () => $("hundo"));
      }),
  );
  $("hundo").addEventListener("change", () => {
    setHundoIV(mIV, $("hundo").checked);
    showIV(...mIV, "ivRes");
    upd();
  });
  eIV.forEach(
    (i) =>
      ($(i).oninput = () => {
        showIV(...eIV, "eRes");
        syncHundo(eIV, eChip);
      }),
  );
  $("fbtn").onclick = () => {
    drawFil();
    $("dFil").showModal();
  };
  $("fOk").onclick = () => $("dFil").close();
  $("fClr").onclick = () => {
    flt = "all";
    sortKey = "add";
    drawFil();
    render();
  };
  $("exp").onclick = () => {
    const a = document.createElement("a");
    let content = JSON.stringify(
      { ...data, version: 2, companion: window.TrainerCompanion?.snapshot?.() },
      null,
      2,
    );
    if (recoveryRequired) {
      try {
        content = localStorage.getItem("pgo") || "null";
      } catch (_) {
        document.dispatchEvent(
          new CustomEvent("pgo-toast", {
            detail:
              "O navegador bloqueou a leitura dos dados. Verifique as permissões de armazenamento.",
          }),
        );
        return;
      }
    }
    a.href = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    a.download = "meus-pokemon-go.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("imp").onclick = () => $("file").click();
  $("file").onchange = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      if (file.size > 10000000) throw new Error("O arquivo excede 10 MB.");
      const raw = JSON.parse(await file.text()),
        j = normalizeCollection(raw);
      if (
        (data.have.length ||
          data.want.length ||
          recoveryRequired ||
          raw.companion) &&
        !confirm(
          "Importar este backup substituirá sua coleção" +
            (raw.companion ? ", perfil e lembretes" : "") +
            " atuais. Deseja continuar?",
        )
      )
        return;
      let companionPersisted = true;
      if (raw.companion && window.TrainerCompanion?.restore) {
        const result = window.TrainerCompanion.restore(raw.companion);
        if (!result.ok) throw new Error(result.error);
        companionPersisted = result.persisted !== false;
      }
      recoveryRequired = false;
      data = j;
      fixHundo();
      save();
      render();
      document.dispatchEvent(
        new CustomEvent("pgo-toast", {
          detail: companionPersisted
            ? "Backup importado. Sua coleção está pronta."
            : "Backup importado nesta sessão. O navegador bloqueou o armazenamento do perfil e lembretes; exporte um backup antes de sair.",
        }),
      );
    } catch (e) {
      document.dispatchEvent(
        new CustomEvent("pgo-toast", {
          detail: "Backup inválido. " + e.message,
        }),
      );
    } finally {
      ev.target.value = "";
    }
  };
  window.Collection = {
    resolveName: resolve,
    formId,
    getData: () => data,
    getStorageStatus: () => ({
      blocked: recoveryRequired,
      warning: storageWarning,
    }),
    select: (list, filter) => {
      tab = list;
      if (filter !== undefined) flt = filter;
      render();
    },
    filter: (value) => {
      flt = value;
      render();
    },
    addWanted: (pokemon, shiny = false) => {
      if (recoveryRequired) {
        document.dispatchEvent(
          new CustomEvent("pgo-toast", {
            detail:
              "Recupere sua coleção a partir de um backup antes de adicionar desejos.",
          }),
        );
        return false;
      }
      if (
        !Number.isInteger(pokemon.dexId) ||
        pokemon.dexId < 1 ||
        pokemon.dexId > 1025
      )
        return false;
      const mega = /\bmega\b/i.test(pokemon.name || "");
      const form =
        /\balolan?\b/i.test(pokemon.name || "") && hasAlola(pokemon.dexId)
          ? "alola"
          : "";
      if (
        data.want.some(
          (e) =>
            e.id === pokemon.dexId &&
            !!e.shiny === shiny &&
            !!e.shadow === !!pokemon.shadow &&
            !!e.mega === mega &&
            (e.form || "") === form,
        )
      )
        return false;
      const entry = {
        uid: Date.now() + Math.random(),
        id: pokemon.dexId,
        name:
          Object.keys(dex).find((k) => dex[k] === pokemon.dexId) ||
          pokemon.name.toLowerCase(),
        cp: "",
        note: "Objetivo: " + pokemon.name,
        iv: null,
      };
      Object.keys(FLAGS).forEach((f) => (entry[f] = false));
      entry.shiny = shiny;
      entry.shadow = !!pokemon.shadow;
      entry.mega = mega;
      if (form) entry.form = form;
      data.want.push(entry);
      save();
      render();
      return true;
    },
  };
  loadDex();
  render();
})();
