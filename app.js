(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const icons = {
    home: "M3 10 12 3l9 7v10H3V10Z M9 20v-7h6v7",
    collection: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",
    heart:
      "M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z",
    compass: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M16 8l-3 5-5 3 3-5 5-3Z",
    calendar: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2",
    user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M4 21v-2a8 8 0 0 1 16 0v2",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    plus: "M12 5v14 M5 12h14",
    arrow: "M5 12h14 M14 7l5 5-5 5",
    sparkle: "m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8L12 2Z",
    medal: "M17 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z M8 12l-2 9 6-3 6 3-2-9",
    qr: "M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h3v3h-3z M21 15v6h-6 M6 6h.01 M18 6h.01 M6 18h.01",
    search: "M18 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z M15 15l6 6",
    download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
    upload: "M12 16V4 M7 9l5-5 5 5 M4 16v5h16v-5",
    external: "M14 3h7v7 M21 3 10 14 M10 4H4v16h16v-6",
    close: "M6 6l12 12 M18 6 6 18",
    refresh:
      "M20 8a9 9 0 0 0-15-3L3 8 M3 3v5h5 M4 16a9 9 0 0 0 15 3l2-3 M21 21v-5h-5",
    raid: "m6 3 15 15-3 3L3 6V3h3Z M18 3 3 18l3 3L21 6V3h-3Z M2 15l7 7 M15 2l7 7",
    egg: "M20 14a8 8 0 1 1-16 0C4 8 9 2 12 2s8 6 8 12Z M7 9l4 3 5-4 M7 17l4-2 5 3",
    research: "M6 4h12v17H6z M9 2h6v4H9z M9 10h6 M9 14h6 M9 17h3",
    rocket:
      "M9 15 4 20l1-6 M9 15l5 4 6-1 M9 15C5 7 14 2 21 3c1 7-4 16-12 12Z M16 8h.01 M4 21l3-3",
  };
  function icon(name) {
    const i = document.createElement("i");
    i.dataset.icon = name;
    i.setAttribute("aria-hidden", "true");
    i.innerHTML =
      '<svg class="icon" viewBox="0 0 24 24"><path d="' +
      (icons[name] || icons.compass) +
      '"/></svg>';
    return i;
  }
  function hydrateIcons() {
    document
      .querySelectorAll("i[data-icon]:empty")
      .forEach((i) => i.replaceWith(icon(i.dataset.icon)));
  }
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function action(text, fn, cls = "ghost") {
    const b = el("button", cls, text);
    b.type = "button";
    b.onclick = fn;
    return b;
  }
  function external(text, url, cls = "text-link") {
    const a = el("a", cls, text);
    a.href = CompanionData.safeURL(url) || "#";
    a.target = "_blank";
    a.rel = "noopener";
    a.append(icon("external"));
    return a;
  }
  function img(src, name, cls = "") {
    const n = el("img", cls);
    n.alt = name;
    n.loading = "lazy";
    n.src = src;
    n.onerror = () => {
      n.replaceWith(icon("collection"));
    };
    return n;
  }
  function art(id) {
    return (
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/" +
      id +
      ".png"
    );
  }
  const feedNames = {
    raids: "Raids",
    eggs: "Ovos",
    research: "Pesquisas",
    rocket: "Equipe Rocket",
    events: "Eventos",
  };
  let feed = null,
    guide = "raids",
    toastTimer,
    loading = false;
  const titles = {
    home: "Visão geral",
    collection: "Minha coleção",
    wishlist: "Quero pegar",
    guide: "Guia de capturas",
    events: "Eventos e novidades",
    trainer: "Meu treinador",
  };
  const types = {
    normal: "Normal",
    fire: "Fogo",
    water: "Água",
    electric: "Elétrico",
    grass: "Planta",
    ice: "Gelo",
    fighting: "Lutador",
    poison: "Veneno",
    ground: "Terra",
    flying: "Voador",
    psychic: "Psíquico",
    bug: "Inseto",
    rock: "Pedra",
    ghost: "Fantasma",
    dragon: "Dragão",
    dark: "Sombrio",
    steel: "Aço",
    fairy: "Fada",
  };
  const researchTypes = {
    event: "Evento",
    catch: "Captura",
    throw: "Arremesso",
    battle: "Batalha",
    buddy: "Companheiro",
    explore: "Exploração",
    training: "Treinamento",
    evolve: "Evolução",
    other: "Outras",
  };
  const typeText = (value) => types[value.toLowerCase()] || value;
  function toast(text, undo) {
    clearTimeout(toastTimer);
    const node = $("toast");
    node.replaceChildren(document.createTextNode(text));
    if (undo) {
      node.append(
        action(
          "Desfazer",
          () => {
            undo();
            node.hidden = true;
          },
          "toast-undo",
        ),
      );
    }
    node.hidden = false;
    toastTimer = setTimeout(() => (node.hidden = true), undo ? 9000 : 5000);
  }
  function route() {
    const key = location.hash.slice(1);
    const active = Object.hasOwn(titles, key) ? key : "home";
    document
      .querySelectorAll(".view")
      .forEach(
        (v) =>
          (v.hidden =
            v.id !== (active === "wishlist" ? "collection" : active) + "-view"),
      );
    document.querySelectorAll("[data-nav]").forEach((a) => {
      const on = a.dataset.nav === active;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $("breadcrumb").textContent = titles[active];
    document.title = titles[active] + " · Meus Pokémon GO";
    if (active === "collection" || active === "wishlist") {
      Collection.select(active === "collection" ? "have" : "want");
      $("collection-title").textContent = titles[active];
    }
    if (active === "guide") drawGuide();
    if (active === "events") drawEvents();
    window.scrollTo(0, 0);
  }
  function profile() {
    let p = {};
    try {
      p = TrainerCompanion.snapshot
        ? TrainerCompanion.snapshot().profile
        : JSON.parse(localStorage.getItem("pgo-profile")) || {};
    } catch (_) {}
    const name =
      typeof p.name === "string" && p.name.trim() ? p.name.trim() : "treinador";
    $("trainer-greeting").textContent = name;
    document.querySelector(".avatar").textContent = name
      .charAt(0)
      .toUpperCase();
  }
  function metrics() {
    const storage = Collection.getStorageStatus();
    let notice = $("collection-storage-note");
    if (!notice) {
      notice = el("div", "feed-notice warning");
      notice.id = "collection-storage-note";
      notice.setAttribute("role", "alert");
      document.querySelector("#collection-view .page-heading").after(notice);
    }
    notice.hidden = !storage.blocked && !storage.warning;
    notice.textContent = storage.blocked
      ? "A coleção salva precisa de recuperação. Exporte os dados originais abaixo e importe um backup válido para continuar."
      : storage.warning
        ? "O navegador não conseguiu salvar as alterações. Exporte um backup antes de sair para preservar sua coleção."
        : "";
    document.querySelector(".save-indicator").textContent = storage.blocked
      ? "Coleção aguardando recuperação"
      : storage.warning
        ? "Alterações salvas só nesta sessão"
        : "● Coleção salva no dispositivo";
    const d = Collection.getData(),
      unique = new Set(d.have.map((p) => p.id)).size;
    $("stat-have").textContent = d.have.length;
    $("side-count").textContent = d.have.length;
    $("stat-want").textContent = d.want.length;
    $("stat-shiny").textContent = d.have.filter((p) => p.shiny).length;
    $("stat-hundo").textContent = d.have.filter((p) => p.hundo).length;
    $("dex-count").textContent = unique;
    $("dex-progress").style.setProperty(
      "--progress",
      (unique / 1025) * 100 + "%",
    );
    $("dex-description").textContent = unique
      ? unique + " de 1.025 espécies no catálogo."
      : "Comece a registrar suas capturas.";
    drawRadar();
  }
  function allEncounters() {
    if (!feed) return [];
    return [
      ...feed.raids.map((p) => ({
        ...p,
        source: "Raids",
        sourceKey: "raids",
        shadow: p.shadow,
      })),
      ...feed.eggs.map((p) => ({
        ...p,
        source: "Ovos · " + p.eggType,
        sourceKey: "eggs",
      })),
      ...feed.research.flatMap((r) =>
        r.rewards.map((p) => ({
          ...p,
          source: "Pesquisa de campo",
          sourceKey: "research",
        })),
      ),
      ...feed.rocket.flatMap((r) =>
        r.slots
          .flat()
          .filter((p) => p.isEncounter)
          .map((p) => ({
            ...p,
            shadow: true,
            source: "Equipe Rocket",
            sourceKey: "rocket",
          })),
      ),
    ];
  }
  const wishMatches = CompanionRules.matchesWish;
  function drawRadar() {
    const host = $("radar"),
      wishes = Collection.getData().want;
    host.replaceChildren();
    if (!wishes.length) {
      const n = el("div", "radar-empty"),
        copy = el("div");
      n.append(img(art(133), "Eevee"));
      copy.append(
        el("h3", "", "Grandes jornadas começam com um desejo."),
        el(
          "p",
          "",
          "Escolha os Pokémon que quer encontrar. O radar cruza sua lista com os encontros do guia.",
        ),
      );
      const a = el("a", "text-link", "Criar minha lista");
      a.href = "#wishlist";
      a.append(icon("arrow"));
      copy.append(a);
      n.append(copy);
      host.append(n);
      return;
    }
    const encounters = allEncounters();
    wishes.slice(0, 4).forEach((w) => {
      const available = encounters.find((p) => wishMatches(w, p)),
        row = el("div", "radar-row"),
        copy = el("div");
      row.append(
        img(
          art(window.Collection?.formId ? window.Collection.formId(w) : w.id),
          w.name,
        ),
      );
      copy.append(
        el(
          "strong",
          "",
          w.name +
            (w.form === "alola" ? " (Alola)" : "") +
            (w.shiny ? " ✦" : ""),
        ),
        el(
          "span",
          "",
          available
            ? available.source
            : feed
              ? "Sem encontro identificado no guia"
              : "Consultando encontros…",
        ),
      );
      row.append(copy);
      if (available) {
        const a = el("a", "text-link", "Ver encontro");
        a.href = "#guide";
        a.onclick = () => {
          setGuide(available.sourceKey);
          $("guide-search").value = available.name;
          drawGuide();
        };
        a.append(icon("arrow"));
        row.append(a);
      }
      host.append(row);
    });
  }
  function dateLabel(value, short = false) {
    if (!value) return "Horário não informado";
    return new Date(value).toLocaleString(
      "pt-BR",
      short
        ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
        : {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
    );
  }
  function statusText(e) {
    return {
      active: "Acontecendo",
      upcoming: "Em breve",
      ended: "Encerrado",
      unknown: "A confirmar",
    }[CompanionData.eventStatus(e)];
  }
  function drawHomeEvents() {
    const host = $("home-events");
    host.replaceChildren();
    if (!feed) {
      host.append(el("p", "hint", "Consultando eventos…"));
      return;
    }
    const items = feed.events
      .filter((e) =>
        ["active", "upcoming"].includes(CompanionData.eventStatus(e)),
      )
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
      .slice(0, 3);
    if (!items.length) {
      host.append(
        el(
          "div",
          "empty",
          feed.sources.events.status === "error"
            ? "Não foi possível consultar a agenda. Tente atualizar em Eventos."
            : "Nenhum evento com data confirmada na fonte.",
        ),
      );
      return;
    }
    items.forEach((e) => {
      const a = el("a", "home-event");
      a.href = "#events";
      const date = el("div", "date-tile"),
        d = new Date(e.start);
      date.append(
        el("strong", "", String(d.getDate()).padStart(2, "0")),
        el(
          "span",
          "",
          d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        ),
      );
      const copy = el("div");
      copy.append(
        el("h3", "", e.name),
        el("p", "", statusText(e) + " · " + dateLabel(e.end, true)),
      );
      a.append(date, copy, icon("arrow"));
      host.append(a);
    });
  }
  function feedStatus(id, kinds) {
    const node = $(id);
    if (!feed) {
      node.textContent = "Consultando fontes…";
      return;
    }
    const sources = kinds.map((k) => [k, feed.sources[k]]).filter(([, s]) => s),
      failed = sources.filter(([, s]) => s.status === "error"),
      stale = sources.filter(([, s]) => s.status === "stale");
    node.classList.toggle("warning", !!(failed.length || stale.length));
    const times = sources.map(([, s]) => s.fetchedAt).filter(Boolean);
    const text = [];
    if (failed.length)
      text.push(
        "Indisponível: " + failed.map(([k]) => feedNames[k]).join(", ") + ".",
      );
    if (stale.length)
      text.push(
        "Cópia salva, possivelmente desatualizada: " +
          stale.map(([k]) => feedNames[k]).join(", ") +
          ".",
      );
    if (times.length)
      text.push(
        "Última consulta: " +
          new Date(Math.min(...times)).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }) +
          ".",
      );
    text.push("Fonte comunitária: Leek Duck / ScrapedDuck.");
    node.textContent = text.join(" ");
  }
  function setGuide(key) {
    guide = key;
    $("guide-search").value = "";
    $("guide-filter").replaceChildren(new Option("Todas", "all"));
    document.querySelectorAll("[data-guide]").forEach((b) => {
      b.classList.toggle("selected", b.dataset.guide === guide);
      b.setAttribute("aria-pressed", String(b.dataset.guide === guide));
    });
    drawGuide(true);
  }
  function sourcePokemons(row) {
    return guide === "research"
      ? row.rewards
      : guide === "rocket"
        ? row.slots.flat().filter((p) => p.isEncounter)
        : [row];
  }
  function tierText(tier) {
    return tier
      .replace(/(\d+)-Star Raids/gi, "Raids de $1 estrela(s)")
      .replace(/Tier (\d+)/gi, "Nível $1")
      .replace(/Shadow/gi, "Sombrosa")
      .replace(/Raids/gi, "Raids");
  }
  function filterName(r) {
    return guide === "raids"
      ? tierText(r.tier)
      : guide === "eggs"
        ? r.eggType +
          (r.isAdventureSync
            ? " · Sincroaventura"
            : r.isGiftExchange
              ? " · Presentes"
              : "")
        : guide === "research"
          ? researchTypes[r.type] || r.type
          : guide === "rocket"
            ? r.type
              ? typeText(r.type)
              : r.name
            : r.source;
  }
  function wanted(p, shiny = guide === "shiny") {
    return Collection.getData().want.some(
      (w) =>
        w.id === p.dexId &&
        !!w.shiny === shiny &&
        !!w.shadow === !!p.shadow &&
        !!w.mega === /\bmega\b/i.test(p.name || ""),
    );
  }
  function wishButton(p) {
    const shiny = guide === "shiny",
      saved = wanted(p, shiny);
    const b = action(
      saved ? "✓ Na sua lista" : "+ Quero pegar",
      () => {
        if (saved) {
          location.hash = "wishlist";
          return;
        }
        if (Collection.addWanted(p, shiny)) {
          toast(p.name + " adicionado à lista de desejos.");
        } else
          toast(
            "Não foi possível adicionar esta espécie ao catálogo de 1 a 1.025.",
          );
      },
      "want-button" + (saved ? " saved" : ""),
    );
    b.setAttribute(
      "aria-label",
      (saved ? "Ver na lista: " : "Quero pegar ") + p.name,
    );
    if (!p.dexId || p.dexId > 1025) {
      b.disabled = true;
      b.textContent = "Espécie fora do catálogo";
    }
    return b;
  }
  function pokemonCard(p) {
    const c = el("article", "encounter"),
      picture = el("div", "encounter-picture");
    picture.append(el("span", "encounter-label", filterName(p)));
    if (p.canBeShiny) {
      const s = el("span", "shiny-symbol", "✦");
      s.title = "Pode ser shiny, segundo a fonte";
      s.setAttribute("aria-label", "Pode ser shiny");
      picture.append(s);
    }
    if (p.image || p.dexId)
      picture.append(img(p.image || art(p.dexId), p.name));
    const info = el("div", "encounter-info");
    info.append(el("h3", "", p.name));
    const meta = el("div", "encounter-meta");
    p.types.forEach((t) => meta.append(el("span", "type-pill", typeText(t))));
    if (p.shadow) meta.append(el("span", "tag", "Sombroso"));
    info.append(meta);
    if (p.cp)
      info.append(
        el(
          "p",
          "cp-range",
          "CP " +
            p.cp.min +
            "–" +
            p.cp.max +
            (p.boostedCp
              ? " · Clima: " + p.boostedCp.min + "–" + p.boostedCp.max
              : ""),
        ),
      );
    if (p.isRegional)
      info.append(el("p", "subtext", "Disponibilidade regional"));
    if (p.rarity)
      info.append(el("p", "subtext", "Raridade na fonte: " + p.rarity + "/5"));
    if (guide === "shiny")
      info.append(el("p", "subtext", "Taxa shiny não informada pela fonte"));
    info.append(wishButton(p));
    c.append(picture, info);
    return c;
  }
  function rewardRow(p, allow = true) {
    const row = el("div", "reward"),
      copy = el("div");
    if (p.image || p.dexId) row.append(img(p.image || art(p.dexId), p.name));
    copy.append(el("strong", "", p.name + (p.canBeShiny ? " ✦" : "")));
    if (p.cp) copy.append(el("small", "", "CP " + p.cp.min + "–" + p.cp.max));
    row.append(copy);
    if (allow) row.append(wishButton(p));
    return row;
  }
  function researchCard(r) {
    const c = el("article", "research-card");
    c.append(el("span", "eyebrow", filterName(r)), el("h3", "", r.text));
    const rewards = el("div", "research-rewards");
    r.rewards.forEach((p) => rewards.append(rewardRow(p)));
    c.append(rewards);
    return c;
  }
  function rocketCard(r) {
    const c = el("article", "rocket-card");
    c.append(
      el("span", "eyebrow", r.type ? typeText(r.type) : "Equipe GO Rocket"),
      el("h3", "", r.name),
    );
    if (r.title) c.append(el("p", "hint", r.title));
    r.slots.forEach((slot, i) => {
      if (!slot.length) return;
      c.append(el("p", "rocket-slot", i + 1 + "º Pokémon"));
      slot.forEach((p) => {
        const row = rewardRow({ ...p, shadow: true }, p.isEncounter === true);
        if (p.isEncounter)
          row
            .querySelector("strong")
            .append(el("small", "", " · Pode ser resgatado"));
        c.append(row);
      });
    });
    return c;
  }
  function drawGuide(reset = false) {
    const host = $("guide-content");
    feedStatus(
      "feed-status",
      guide === "shiny" ? ["raids", "eggs", "research", "rocket"] : [guide],
    );
    const descriptions = {
      raids:
        "CPs de captura sem e com bônus de clima, quando informados. ✦ indica que a versão shiny está disponível na fonte.",
      eggs: "Os encontros dependem do ovo recebido, da região e do evento. Sincroaventura e presentes aparecem em categorias próprias.",
      research:
        "Missões e recompensas da rotação informada pela fonte. Os textos originais das pesquisas estão em inglês.",
      rocket:
        "Formações dos líderes e recrutas. “Quero pegar” aparece apenas nos encontros que a fonte identifica como resgatáveis.",
      shiny:
        "Encontros com shiny disponível em raids, ovos, pesquisas e Rocket. A fonte não fornece probabilidades verificáveis; disponibilidade não garante uma taxa maior.",
    };
    $("guide-intro").textContent = descriptions[guide];
    $("guide-title").textContent = {
      raids: "Chefes de raid",
      eggs: "O que pode chocar?",
      research: "Pesquisas de campo",
      rocket: "Encontros com a Equipe Rocket",
      shiny: "O brilho da próxima captura",
    }[guide];
    host.replaceChildren();
    if (!feed) {
      host.append(el("div", "empty", "Consultando encontros…"));
      return;
    }
    let rows =
      guide === "shiny"
        ? allEncounters().filter((p) => p.canBeShiny)
        : feed[guide] || [];
    if (guide === "shiny")
      rows = [...new Map(rows.map((p) => [p.id + "-" + p.source, p])).values()];
    const select = $("guide-filter"),
      old = reset ? "all" : select.value;
    select.replaceChildren(new Option("Todas", "all"));
    [...new Set(rows.map(filterName))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .forEach((v) => select.add(new Option(v, v)));
    if ([...select.options].some((o) => o.value === old)) select.value = old;
    const query = $("guide-search").value.trim().toLowerCase(),
      wishes = Collection.getData().want;
    rows = rows.filter(
      (r) =>
        (select.value === "all" || filterName(r) === select.value) &&
        (!query ||
          [r.name, r.text, r.title, ...sourcePokemons(r).map((p) => p.name)]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)) &&
        (!$("only-wishes").checked ||
          sourcePokemons(r).some((p) =>
            wishes.some((w) =>
              wishMatches(w, { ...p, shadow: guide === "rocket" || p.shadow }),
            ),
          )),
    );
    $("guide-count").textContent = rows.length + " resultados";
    if (!rows.length) {
      const empty = el("div", "empty");
      empty.append(
        el("h3", "", "Nenhum encontro para mostrar."),
        el(
          "p",
          "",
          query || select.value !== "all" || $("only-wishes").checked
            ? "Tente outros filtros ou adicione mais Pokémon à sua lista."
            : "A fonte pode estar indisponível ou ainda não ter uma rotação cadastrada.",
        ),
      );
      if (query || select.value !== "all" || $("only-wishes").checked)
        empty.append(
          action("Limpar filtros", () => {
            $("only-wishes").checked = false;
            setGuide(guide);
          }),
        );
      host.append(empty);
    }
    rows.forEach((r) =>
      host.append(
        guide === "research"
          ? researchCard(r)
          : guide === "rocket"
            ? rocketCard(r)
            : pokemonCard(r),
      ),
    );
    if (guide === "shiny") host.append(shinyCalculator());
  }
  function shinyCalculator() {
    const c = el("article", "research-card shiny-calculator");
    c.append(
      el("span", "eyebrow", "SIMULE SUA CAÇADA"),
      el("h3", "", "Qual a chance de encontrar um shiny?"),
      el(
        "p",
        "hint",
        "Informe uma taxa estimada de uma fonte que você confia. Cada encontro é independente; a conta não prevê sua próxima captura.",
      ),
    );
    const label1 = el("label", "fld", "Taxa estimada: 1 em"),
      rate = el("input");
    rate.type = "number";
    rate.min = "1";
    rate.max = "1000000";
    rate.step = "1";
    rate.placeholder = "Ex.: 512";
    rate.setAttribute("aria-label", "Taxa estimada: 1 em");
    label1.append(rate);
    const label2 = el("label", "fld", "Número de encontros"),
      count = el("input");
    count.type = "number";
    count.min = "1";
    count.max = "1000000";
    count.step = "1";
    count.placeholder = "Ex.: 100";
    count.setAttribute("aria-label", "Número de encontros");
    label2.append(count);
    const out = el("output", "hint", "Preencha os campos para calcular.");
    out.setAttribute("aria-live", "polite");
    const calc = () => {
      if (
        !rate.value ||
        !count.value ||
        !rate.checkValidity() ||
        !count.checkValidity()
      ) {
        out.textContent = "Informe dois números inteiros positivos.";
        return;
      }
      const chance =
        1 - Math.pow(1 - 1 / Number(rate.value), Number(count.value));
      out.textContent =
        (chance * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
        "% de chance de ao menos um shiny, usando a taxa informada.";
    };
    rate.oninput = count.oninput = calc;
    c.append(label1, label2, out);
    return c;
  }
  const eventCalendar = EventCalendar.create($("calendar-host"), {
    onToast: toast,
  });
  function drawEvents() {
    feedStatus("events-status", ["events"]);
    eventCalendar.update(feed?.events || [], {
      ready: Boolean(feed),
      error: feed?.sources.events.status === "error",
    });
  }
  function feedChanges(previous, current) {
    if (!previous) return;
    let enabled = false;
    try {
      enabled = localStorage.getItem("pgo-watch") === "true";
    } catch (_) {}
    if (!enabled) return;
    const changes = CompanionRules.rotationChanges(previous, current);
    if (changes.length)
      toast(
        "Rotação alterada: " +
          changes
            .map(
              (c) =>
                feedNames[c.kind] +
                " (" +
                (c.added + c.removed + c.updated) +
                ")",
            )
            .join(" · "),
      );
  }
  async function load(force = false) {
    if (loading) return;
    loading = true;
    document.querySelectorAll(".refresh-data").forEach((b) => {
      b.disabled = true;
      b.setAttribute("aria-busy", "true");
    });
    try {
      const next = await CompanionData.loadAll({ force });
      const brazilFeed = {
        ...next,
        events: BrazilEventScope.filter(next.events),
      };
      feedChanges(feed, brazilFeed);
      feed = brazilFeed;
      feedStatus("home-status", Object.keys(feedNames));
      TrainerCompanion.refresh(feed.events);
      drawRadar();
      drawHomeEvents();
      drawGuide();
      drawEvents();
      if (force)
        toast(
          Object.values(feed.sources).some(
            (s) => s.status === "error" || s.status === "stale",
          )
            ? "Algumas fontes não responderam. Veja os avisos de consulta."
            : "Dados consultados.",
        );
    } catch (_) {
      toast(
        "Não foi possível carregar os encontros. Sua coleção continua disponível.",
      );
    } finally {
      loading = false;
      document.querySelectorAll(".refresh-data").forEach((b) => {
        b.disabled = false;
        b.removeAttribute("aria-busy");
      });
    }
  }
  document.querySelectorAll("[data-add]").forEach(
    (b) =>
      (b.onclick = () => {
        $("msg").textContent = "";
        $("dAdd").showModal();
        $("name").focus();
      }),
  );
  document.querySelector(".close-add").onclick = () => $("dAdd").close();
  document
    .querySelectorAll("[data-guide]")
    .forEach((b) => (b.onclick = () => setGuide(b.dataset.guide)));
  document
    .querySelectorAll("[data-filter]")
    .forEach((b) => (b.onclick = () => Collection.filter(b.dataset.filter)));
  document
    .querySelectorAll(".refresh-data")
    .forEach((b) => (b.onclick = () => load(true)));
  document
    .querySelectorAll("[data-special]")
    .forEach(
      (a) => (a.onclick = () => Collection.select("have", a.dataset.special)),
    );
  $("guide-search").oninput = () => drawGuide();
  $("guide-filter").onchange = () => drawGuide();
  $("only-wishes").onchange = () => drawGuide();
  document.addEventListener("pgo-change", () => {
    metrics();
    if (feed) drawGuide();
  });
  document.addEventListener("pgo-toast", (e) => toast(e.detail));
  document.addEventListener("pgo-added", (e) => {
    location.hash = e.detail.list === "have" ? "collection" : "wishlist";
    toast(e.detail.name + " adicionado à sua lista.");
  });
  document.addEventListener("pgo-removed", (e) =>
    toast(e.detail.entry.name + " removido.", e.detail.undo),
  );
  document.addEventListener("trainer-profile-change", profile);
  document.addEventListener("trainer-reminders-change", drawEvents);
  window.addEventListener("hashchange", route);
  window.addEventListener("online", () => load(true));
  TrainerCompanion.init($("trainer-host"));
  TrainerCompanion.renderReminders($("reminders-host"), []);
  const watch = el("label", "watch-feed"),
    watchInput = el("input");
  watchInput.type = "checkbox";
  try {
    watchInput.checked = localStorage.getItem("pgo-watch") === "true";
  } catch (_) {}
  watchInput.onchange = () => {
    try {
      localStorage.setItem("pgo-watch", String(watchInput.checked));
    } catch (_) {}
    toast(
      watchInput.checked
        ? "Avisos de novas rotações ativados enquanto a página estiver aberta."
        : "Avisos de novas rotações desativados.",
    );
  };
  watch.append(
    watchInput,
    document.createTextNode(
      "Avisar novas rotações nesta página (consulta a cada 15 min)",
    ),
  );
  $("reminders-host").after(watch);
  const homeStatus = el("div", "home-feed-status");
  homeStatus.id = "home-status";
  homeStatus.setAttribute("role", "status");
  document.querySelector(".stats-row").after(homeStatus);
  document.querySelector(".skip-link").onclick = (e) => {
    e.preventDefault();
    $("content").focus();
  };
  $("today-label").textContent = new Date()
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
  hydrateIcons();
  profile();
  metrics();
  route();
  load();
  setInterval(
    () => {
      if (document.visibilityState === "visible") load();
    },
    15 * 60 * 1000,
  );
  setInterval(() => {
    if (feed && document.visibilityState === "visible") {
      drawHomeEvents();
      if (!document.activeElement?.closest("#calendar-host, .cal-dialog"))
        drawEvents();
    }
  }, 60000);
})();
