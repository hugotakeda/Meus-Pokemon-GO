(function () {
  "use strict";
  const R = window.PogoCalendarRules;
  const GROUPS = [
    ["raids", "Raids de 5 estrelas", "As rotações do mês", "✦"],
    ["mega", "Megarreides", "Megaenergia à vista", "◈"],
    ["shadow", "Reides sombrosos", "Encontros presenciais", "◐"],
    ["raid-hour", "Hora de Reide", "Seu encontro da semana", "◷"],
    ["max", "Batalhas Max", "Segundas e eventos especiais", "⌁"],
    ["spotlight", "Hora do Holofote", "Pokémon e bônus em destaque", "☀"],
    ["community", "Comunidade", "Encontros para jogar junto", "♡"],
    ["events", "Eventos do mês", "Mais motivos para explorar", "▦"],
    ["battle", "Liga de Batalha GO", "Prepare sua equipe", "△"],
    ["research", "Pesquisas", "Novas descobertas", "⌕"],
    ["season", "Temporada", "Uma nova jornada", "✧"],
  ];
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function button(text, action, cls = "ghost") {
    const b = el("button", cls, text);
    b.type = "button";
    b.onclick = action;
    return b;
  }
  function link(text, url) {
    const a = el("a", "text-link", text + " ↗");
    a.href = CompanionData.safeURL(url) || "https://leekduck.com/events/";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }
  const validDate = (value) =>
    value && Number.isFinite(new Date(value).getTime());
  const dateText = (value) =>
    validDate(value)
      ? new Date(value).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Data a confirmar";
  const clockText = (value) =>
    new Date(value).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  function dateTile(value) {
    const d = new Date(value),
      tile = el("span", "cal-date");
    tile.append(
      el("strong", "", String(d.getDate()).padStart(2, "0")),
      el(
        "span",
        "",
        d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      ),
    );
    return tile;
  }
  function bonusText(value) {
    const simple = {
      "Increased Spawns": "Mais Pokémon aparecendo",
      "Catch Candy": "Doces por captura",
      "Transfer Candy": "Doces por transferência",
      "Catch Stardust": "Poeira Estelar por captura",
      "Evolution XP": "XP por evolução",
      "Catch XP": "XP por captura",
    };
    if (simple[value]) return simple[value];
    return String(value).replace(
      /^(\d+)[×x] (Catch Candy|Transfer Candy|Catch Stardust|Evolution XP|Catch XP)$/i,
      (_, n, type) => n + "× " + (simple[type] || type),
    );
  }
  function dates(event) {
    const row = el("span", "cal-dates");
    if (!validDate(event.start))
      return el("span", "cal-pending", "Data a confirmar");
    row.append(dateTile(event.start));
    if (
      validDate(event.end) &&
      R.dayKey(new Date(event.start)) !== R.dayKey(new Date(event.end))
    )
      row.append(el("span", "cal-date-arrow", "→"), dateTile(event.end));
    return row;
  }
  function participants(event) {
    if (event.pokemon?.length) return event.pokemon;
    return (event.featuredNames || []).map((name) => {
      const known = window.Collection?.resolveName(name);
      return {
        name,
        image: known
          ? "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/" +
            known.id +
            ".png"
          : "",
        illustration: true,
      };
    });
  }
  function artwork(pokemon, compact = false) {
    const figure = el("span", "cal-pokemon" + (compact ? " compact" : ""));
    if (pokemon.image) {
      const image = el("img");
      image.src = CompanionData.safeURL(pokemon.image);
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.onerror = () => {
        image.hidden = true;
        figure.classList.add("no-image");
      };
      figure.append(image);
    } else figure.classList.add("no-image");
    if (pokemon.canBeShiny === true) {
      const shiny = el("span", "cal-shiny", "✧");
      shiny.title = "Pode aparecer shiny";
      shiny.setAttribute("aria-label", "Pode aparecer shiny");
      figure.append(shiny);
    }
    figure.append(el("span", "cal-pokemon-name", pokemon.name));
    return figure;
  }
  function create(host, { onToast = () => {} } = {}) {
    const today = new Date();
    const state = {
      year: today.getFullYear(),
      month: today.getMonth(),
      view: "summary",
      query: "",
      category: "all",
      saved: false,
      day: R.dayKey(today),
      events: [],
      ready: false,
      error: false,
    };
    let openEvent = null,
      openSnapshot = null,
      restoreFocus = null;
    const toolbar = el("div", "cal-toolbar"),
      monthHeading = el("h2", "cal-month-title"),
      nav = el("div", "cal-month-nav");
    const prev = button("‹", () => move(-1), "ghost cal-arrow"),
      next = button("›", () => move(1), "ghost cal-arrow");
    prev.setAttribute("aria-label", "Mês anterior");
    next.setAttribute("aria-label", "Próximo mês");
    nav.append(
      prev,
      next,
      button("Hoje", () => {
        const now = new Date();
        state.year = now.getFullYear();
        state.month = now.getMonth();
        state.day = R.dayKey(now);
        render();
      }),
    );
    const heading = el("div");
    heading.append(
      el("span", "eyebrow", "SUA AGENDA DE AVENTURAS"),
      monthHeading,
    );
    const views = el("div", "cal-view-switch");
    views.setAttribute("aria-label", "Visualização da agenda");
    const summaryButton = button("Resumo do mês", () => {
        state.view = "summary";
        render();
      }),
      gridButton = button("Calendário", () => {
        state.view = "grid";
        render();
      });
    views.append(summaryButton, gridButton);
    toolbar.append(heading, nav, views);
    const filters = el("div", "cal-filters"),
      searchLabel = el("label", "cal-search"),
      search = el("input");
    search.type = "search";
    search.placeholder = "Buscar Pokémon ou evento";
    search.setAttribute("aria-label", "Buscar Pokémon ou evento");
    search.oninput = () => {
      state.query = search.value;
      render();
    };
    searchLabel.append(el("span", "", "⌕"), search);
    const category = el("select");
    category.setAttribute("aria-label", "Tipo de evento");
    [
      ["all", "Todos os tipos"],
      ["raids", "Raids e Megas"],
      ["max", "Batalhas Max"],
      ["community", "Comunidade"],
      ["battle", "Liga GO"],
      ["research", "Pesquisas"],
      ["other", "Outros eventos"],
    ].forEach(([value, text]) => {
      const o = el("option", "", text);
      o.value = value;
      category.append(o);
    });
    category.onchange = () => {
      state.category = category.value;
      render();
    };
    const saved = button("♡ Só os meus", () => {
      state.saved = !state.saved;
      render();
    });
    saved.setAttribute("aria-pressed", "false");
    filters.append(searchLabel, category, saved);
    const regionNotice = el("p", "cal-region-notice");
    regionNotice.append(
      el("strong", "", "BRASIL"),
      el("span", "", "Eventos globais válidos aqui e encontros brasileiros."),
    );
    const meta = el("div", "cal-meta"),
      count = el("span"),
      legend = el(
        "span",
        "",
        "✧ Shiny disponível · Horários do seu dispositivo",
      );
    count.setAttribute("role", "status");
    meta.append(count, legend);
    const content = el("div", "cal-content"),
      note = el(
        "p",
        "cal-history-note",
        "Agenda para o Brasil. Eventos sem disponibilidade confirmada aqui ficam ocultos. O histórico pode estar incompleto. Toque em um cartão para ver horários, abrangência e lembretes.",
      );
    host.append(toolbar, filters, meta, regionNotice, content, note);
    const dialog = el("dialog", "cal-dialog");
    dialog.setAttribute("aria-labelledby", "cal-dialog-title");
    document.body.append(dialog);
    dialog.addEventListener("close", () => {
      openEvent = null;
      openSnapshot = null;
      const target = Array.from(host.querySelectorAll("[data-event-id]")).find(
        (n) => n.dataset.eventId === restoreFocus,
      );
      target?.focus({ preventScroll: true });
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          dialog.close();
      }
    });
    function move(amount) {
      const d = new Date(state.year, state.month + amount, 1, 12);
      state.year = d.getFullYear();
      state.month = d.getMonth();
      state.day = R.dayKey(d);
      render();
    }
    function filtered() {
      return R.filterEvents(state.events, {
        query: state.query,
        category: state.category,
        savedIds: state.saved
          ? TrainerCompanion.snapshot().reminders.map((e) => e.id)
          : null,
      });
    }
    function save(event, control) {
      event = state.events.find((e) => e.id === event.id) || event;
      const wasSaved = TrainerCompanion.isSaved(event.id);
      const result = TrainerCompanion.toggleReminder(event);
      onToast(
        result
          ? "Evento salvo. Exporte para receber avisos com o site fechado."
          : wasSaved
            ? "Lembrete removido."
            : "Este evento não tem um horário futuro válido para salvar.",
      );
      if (control?.isConnected) {
        control.textContent = TrainerCompanion.isSaved(event.id)
          ? "✓ Lembrete salvo"
          : "♡ Salvar lembrete";
        control.setAttribute(
          "aria-pressed",
          String(TrainerCompanion.isSaved(event.id)),
        );
      }
    }
    function exportEvent(event) {
      event = state.events.find((e) => e.id === event.id) || event;
      if (!TrainerCompanion.normalizeEvent(event)) return;
      const url = URL.createObjectURL(
        new Blob([TrainerCompanion.makeCalendar([event])], {
          type: "text/calendar;charset=utf-8",
        }),
      );
      const a = el("a");
      a.href = url;
      a.download = "pokemon-go-evento.ics";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function open(event) {
      const focusedAction = dialog.contains(document.activeElement)
        ? document.activeElement?.dataset.calAction
        : null;
      const scrollTop = dialog.open ? dialog.scrollTop : 0;
      openEvent = event.id;
      openSnapshot = JSON.stringify(event);
      restoreFocus = event.id;
      dialog.replaceChildren();
      const close = button("✕", () => dialog.close(), "ghost cal-dialog-close");
      close.setAttribute("aria-label", "Fechar detalhes");
      close.dataset.calAction = "close";
      const label = el(
        "p",
        "eyebrow",
        R.scheduleCategory(event).label || event.heading || "EVENTO",
      );
      const title = el("h2", "", event.name);
      title.id = "cal-dialog-title";
      dialog.append(
        close,
        label,
        title,
        el(
          "p",
          "cal-dialog-time",
          dateText(event.start) + " → " + dateText(event.end),
        ),
      );
      const pokemon = participants(event);
      if (pokemon.length) {
        const arts = el("div", "cal-dialog-pokemon");
        pokemon.forEach((p) => arts.append(artwork(p)));
        dialog.append(arts);
      } else if (event.image) {
        const cover = el("img", "cal-dialog-cover");
        cover.src = CompanionData.safeURL(event.image);
        cover.alt = "";
        dialog.append(cover);
      }
      const scope = window.BrazilEventScope?.classify(event);
      if (scope?.eligible) {
        dialog.append(
          el("p", "cal-scope", scope.label),
          el("p", "cal-small", scope.reason),
        );
        if (scope.reviewedAt && scope.sourceUrl) {
          dialog.append(
            link("Fonte da disponibilidade", scope.sourceUrl),
            el(
              "p",
              "cal-small",
              "Disponibilidade conferida em " +
                scope.reviewedAt.split("-").reverse().join("/"),
            ),
          );
        }
      }
      if (event.scheduleNote)
        dialog.append(el("p", "cal-small", event.scheduleNote));
      if (pokemon.some((p) => p.illustration))
        dialog.append(
          el(
            "p",
            "cal-small",
            "Arte ilustrativa da espécie. Consulte a fonte para detalhes da forma e disponibilidade shiny.",
          ),
        );
      if (event.bonuses?.length) {
        dialog.append(el("h3", "", "Bônus do evento"));
        const list = el("ul", "cal-bonus-list");
        event.bonuses.forEach((b) => list.append(el("li", "", bonusText(b))));
        dialog.append(list);
      }
      (event.bonusDisclaimers || []).forEach((note) =>
        dialog.append(el("p", "cal-small", note)),
      );
      (event.seasonGuide?.notes || []).forEach((note) =>
        dialog.append(el("p", "cal-small", note)),
      );
      if (event.weeklyBonuses?.length)
        dialog.append(
          el(
            "p",
            "cal-small",
            "Os bônus diários desta temporada estão no resumo do mês.",
          ),
        );
      const actions = el("div", "cal-dialog-actions");
      if (
        TrainerCompanion.isSaved(event.id) ||
        (TrainerCompanion.normalizeEvent(event) &&
          new Date(event.end) > new Date())
      ) {
        const remember = button(
          TrainerCompanion.isSaved(event.id)
            ? "✓ Lembrete salvo"
            : "♡ Salvar lembrete",
          () => save(event, remember),
          "cal-save",
        );
        remember.setAttribute(
          "aria-pressed",
          String(TrainerCompanion.isSaved(event.id)),
        );
        remember.dataset.calAction = "save";
        const exportButton = button("↓ Exportar .ics", () =>
          exportEvent(event),
        );
        exportButton.dataset.calAction = "export";
        actions.append(remember, exportButton);
      }
      if (event.url) actions.append(link("Ver na fonte", event.url));
      dialog.append(
        actions,
        el(
          "p",
          "cal-small",
          event.timeZone === "local"
            ? "Horário local do jogo, interpretado no fuso deste dispositivo."
            : "Horários convertidos para o fuso deste dispositivo.",
        ),
      );
      if (!dialog.open) dialog.showModal();
      if (focusedAction)
        dialog
          .querySelector('[data-cal-action="' + focusedAction + '"]')
          ?.focus({ preventScroll: true });
      dialog.scrollTop = scrollTop;
    }
    function card(event, compact = false) {
      const group = R.scheduleCategory(event),
        id = typeof group === "string" ? group : group.id;
      const c = button(
        "",
        () => open(event),
        "cal-card cal-kind-" + id + (compact ? " cal-card-compact" : ""),
      );
      c.dataset.eventId = event.id;
      c.setAttribute("aria-label", "Ver detalhes de " + event.name);
      const top = el("span", "cal-card-top");
      top.append(dates(event));
      if (TrainerCompanion.isSaved(event.id))
        top.append(el("span", "cal-saved-mark", "♥"));
      c.append(top);
      const pokemon = participants(event);
      if (pokemon.length) {
        const arts = el("span", "cal-artwork");
        pokemon.slice(0, 3).forEach((p) => arts.append(artwork(p)));
        if (pokemon.length > 3)
          arts.append(
            el("span", "cal-more-pokemon", "+" + (pokemon.length - 3)),
          );
        c.append(arts);
      } else if (event.image) {
        const cover = el("img", "cal-card-cover");
        cover.src = CompanionData.safeURL(event.image);
        cover.alt = "";
        cover.loading = "lazy";
        cover.onerror = () => (cover.hidden = true);
        c.append(cover);
      }
      const names = pokemon.map((p) => p.name).join(" / ");
      c.append(el("strong", "cal-card-title", names || event.name));
      if (event.availability?.scope === "brazil")
        c.append(el("span", "cal-card-bonus", event.availability.label));
      if (event.scheduleNote)
        c.append(el("span", "cal-small", event.scheduleNote));
      if (names && names !== event.name)
        c.append(el("span", "cal-event-name", event.name));
      if (
        validDate(event.start) &&
        validDate(event.end) &&
        R.dayKey(new Date(event.start)) === R.dayKey(new Date(event.end))
      )
        c.append(
          el(
            "span",
            "cal-card-time",
            clockText(event.start) + " – " + clockText(event.end),
          ),
        );
      (event.bonuses || [])
        .slice(0, 2)
        .forEach((b) => c.append(el("span", "cal-card-bonus", bonusText(b))));
      if (event.bonuses?.length > 2)
        c.append(
          el(
            "span",
            "cal-small",
            "+ " + (event.bonuses.length - 2) + " bônus nos detalhes",
          ),
        );
      const status = CompanionData.eventStatus(event);
      c.append(
        el(
          "span",
          "cal-card-state " + status,
          status === "active"
            ? "● Acontecendo"
            : status === "ended"
              ? "Encerrado"
              : R.relativeTime(event, new Date()),
        ),
      );
      return c;
    }
    function seasonPanel(events) {
      const season = events.find((e) => e.weeklyBonuses?.length);
      if (!season) return;
      const area = el("section", "cal-season"),
        top = el("div", "cal-section-top");
      const title = el("div");
      title.append(
        el("p", "eyebrow", "TODAS AS SEMANAS"),
        el("h3", "", "Um motivo para jogar a cada dia"),
      );
      const disclosure = button(
        "Ver temporada ↗",
        () => open(season),
        "ghost",
      );
      top.append(title, disclosure);
      area.append(top);
      const days = el("div", "cal-weekly");
      [...season.weeklyBonuses]
        .sort((a, b) => (a.day || 7) - (b.day || 7))
        .forEach((d) => {
          const item = el("article", "cal-weekly-day");
          const day = new Date(2026, 9, 4 + d.day).toLocaleDateString("pt-BR", {
            weekday: "long",
          });
          item.append(
            el("span", "cal-weekday", day),
            el("strong", "", d.title),
          );
          d.bonuses.forEach((b) =>
            item.append(el("span", "cal-weekly-bonus", b)),
          );
          days.append(item);
        });
      area.append(days);
      const guide = season.seasonGuide;
      if (guide) {
        area.append(
          el(
            "p",
            "cal-small",
            "Válido de " +
              new Date(guide.start).toLocaleDateString("pt-BR") +
              " a " +
              new Date(guide.end).toLocaleDateString("pt-BR") +
              " · Guia conferido em " +
              guide.reviewedAt.split("-").reverse().join("/"),
          ),
          link("Fonte dos bônus", guide.sourceUrl),
        );
      }
      if (guide?.notes?.length) {
        const conditions = el("details", "cal-season-conditions");
        conditions.append(el("summary", "", "Condições dos bônus"));
        guide.notes.forEach((note) => conditions.append(el("p", "", note)));
        area.append(conditions);
      }
      content.append(area);
      const research = season.researchBreakthrough;
      if (research?.pokemon?.length) {
        const box = el("details", "cal-breakthrough"),
          summary = el("summary"),
          text = el("span");
        text.append(
          el("span", "eyebrow", "DESCOBERTA EXTRAORDINÁRIA"),
          el("strong", "", "7 selos, novas possibilidades"),
          el(
            "span",
            "cal-small",
            research.pokemon.length +
              " possíveis encontros · " +
              new Date(research.start).toLocaleDateString("pt-BR") +
              " a " +
              new Date(research.end).toLocaleDateString("pt-BR"),
          ),
        );
        const preview = el("span", "cal-breakthrough-preview");
        research.pokemon
          .slice(0, 4)
          .forEach((p) => preview.append(artwork(p, true)));
        summary.append(
          text,
          preview,
          el("span", "cal-expand", "Ver encontros ＋"),
        );
        box.append(summary);
        const all = el("div", "cal-breakthrough-all");
        research.pokemon.forEach((p) => all.append(artwork(p, true)));
        box.append(
          all,
          link("Fonte dos encontros", research.sourceUrl),
          el(
            "p",
            "cal-small",
            "Guia conferido em " +
              research.reviewedAt.split("-").reverse().join("/"),
          ),
        );
        content.append(box);
      }
    }
    function summary(events) {
      seasonPanel(events);
      let total = 0;
      GROUPS.forEach(([id, title, subtitle, symbol]) => {
        const rows = events.filter((e) => {
          const group = R.scheduleCategory(e);
          return (
            (typeof group === "string" ? group : group.id) === id &&
            !(id === "season" && e.weeklyBonuses?.length)
          );
        });
        if (!rows.length) return;
        total += rows.length;
        const section = el("section", "cal-schedule-row cal-kind-" + id),
          label = el("div", "cal-row-label");
        label.append(
          el("span", "cal-row-symbol", symbol),
          el("h3", "", title),
          el("p", "", subtitle),
        );
        const cards = el("div", "cal-row-cards");
        rows.forEach((e) => cards.append(card(e)));
        section.append(label, cards);
        content.append(section);
      });
      if (!total && !events.some((e) => e.weeklyBonuses?.length)) empty();
    }
    function empty() {
      const box = el("div", "cal-empty");
      box.append(
        el("span", "cal-empty-icon", "▦"),
        el(
          "h3",
          "",
          state.error
            ? "Não conseguimos consultar a agenda"
            : "Nenhum evento encontrado",
        ),
        el(
          "p",
          "",
          state.error
            ? "Use Atualizar dados para tentar novamente."
            : state.query || state.category !== "all" || state.saved
              ? "Tente outro nome ou remova os filtros para explorar o mês."
              : "A fonte ainda não lista eventos para este mês, ou o histórico já não está disponível.",
        ),
      );
      content.append(box);
    }
    function grid(events) {
      const layout = el("div", "cal-grid-layout"),
        board = el("div", "cal-board"),
        week = el("div", "cal-grid-weekdays");
      ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].forEach((d) =>
        week.append(el("span", "", d)),
      );
      board.append(week);
      const cells = el("div", "cal-grid-days");
      const current = R.dayKey(new Date());
      R.monthDays(state.year, state.month).forEach((day) => {
        const dayEvents = R.eventsOnDay(filtered(), day.key).filter((e) => {
          const g = R.scheduleCategory(e);
          return (typeof g === "string" ? g : g.id) !== "season";
        });
        const cell = button(
          "",
          () => {
            state.day = day.key;
            render();
          },
          "cal-day" +
            (!day.inMonth ? " cal-other-month" : "") +
            (day.key === state.day ? " selected" : "") +
            (day.key === current ? " cal-today" : ""),
        );
        cell.dataset.day = day.key;
        cell.setAttribute("aria-pressed", String(day.key === state.day));
        cell.setAttribute(
          "aria-label",
          day.date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }) +
            ": " +
            dayEvents.length +
            " eventos",
        );
        if (day.key === current) cell.setAttribute("aria-current", "date");
        cell.append(el("span", "cal-day-number", String(day.date.getDate())));
        dayEvents.slice(0, 2).forEach((event) => {
          const g = R.scheduleCategory(event);
          cell.append(
            el(
              "span",
              "cal-day-event cal-kind-" + (typeof g === "string" ? g : g.id),
              event.name,
            ),
          );
        });
        if (dayEvents.length > 2)
          cell.append(el("span", "cal-day-more", "+" + (dayEvents.length - 2)));
        if (dayEvents.length)
          cell.append(
            el("span", "cal-day-mobile-count", String(dayEvents.length)),
          );
        cells.append(cell);
      });
      board.append(cells);
      layout.append(board);
      const agenda = el("section", "cal-day-agenda");
      agenda.append(
        el("p", "eyebrow", "PROGRAMADO PARA"),
        el(
          "h3",
          "",
          R.parseDay(state.day).toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
          }),
        ),
      );
      const dayEvents = R.eventsOnDay(filtered(), state.day).filter((e) => {
        const g = R.scheduleCategory(e);
        return (typeof g === "string" ? g : g.id) !== "season";
      });
      if (dayEvents.length)
        dayEvents.forEach((e) => agenda.append(card(e, true)));
      else
        agenda.append(
          el(
            "p",
            "cal-small",
            "Nenhum evento anunciado para este dia com os filtros atuais.",
          ),
        );
      layout.append(agenda);
      content.append(layout);
    }
    function render() {
      const focused = document.activeElement,
        eventFocus = focused?.dataset.eventId,
        dayFocus = focused?.dataset.day;
      const openBreakthrough = content.querySelector(".cal-breakthrough")?.open;
      monthHeading.textContent = new Date(
        state.year,
        state.month,
        1,
      ).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      summaryButton.classList.toggle("selected", state.view === "summary");
      gridButton.classList.toggle("selected", state.view === "grid");
      summaryButton.setAttribute(
        "aria-pressed",
        String(state.view === "summary"),
      );
      gridButton.setAttribute("aria-pressed", String(state.view === "grid"));
      saved.setAttribute("aria-pressed", String(state.saved));
      saved.classList.toggle("selected", state.saved);
      const events = R.eventsInMonth(filtered(), state.year, state.month).sort(
        (a, b) => new Date(a.start) - new Date(b.start),
      );
      const eventCount = events.filter((e) => {
        const g = R.scheduleCategory(e);
        return (typeof g === "string" ? g : g.id) !== "season";
      }).length;
      count.textContent = state.ready
        ? eventCount +
          (eventCount === 1 ? " evento neste mês" : " eventos neste mês")
        : "Consultando agenda…";
      content.replaceChildren();
      if (!state.ready) {
        content.append(
          el("div", "cal-empty", "Preparando sua agenda de aventuras…"),
        );
        return;
      }
      if (state.view === "summary") summary(events);
      else grid(events);
      const unknown = filtered().filter(
        (e) =>
          (validDate(e.start) || validDate(e.end)) &&
          new Date(validDate(e.start) ? e.start : e.end).getFullYear() ===
            state.year &&
          new Date(validDate(e.start) ? e.start : e.end).getMonth() ===
            state.month &&
          (!validDate(e.start) ||
            !validDate(e.end) ||
            new Date(e.end) < new Date(e.start)),
      );
      if (unknown.length) {
        const details = el("details", "cal-unconfirmed");
        details.append(
          el(
            "summary",
            "",
            unknown.length +
              (unknown.length === 1
                ? " evento com horário a confirmar"
                : " eventos com horários a confirmar"),
          ),
        );
        unknown.forEach((e) => details.append(card(e, true)));
        content.append(details);
      }
      if (openBreakthrough && content.querySelector(".cal-breakthrough"))
        content.querySelector(".cal-breakthrough").open = true;
      if (eventFocus || dayFocus)
        Array.from(content.querySelectorAll("[data-event-id], [data-day]"))
          .find((n) =>
            eventFocus
              ? n.dataset.eventId === eventFocus
              : n.dataset.day === dayFocus,
          )
          ?.focus({ preventScroll: true });
    }
    document.addEventListener("pgo-dex-ready", () => {
      if (state.ready) render();
    });
    render();
    return {
      update(events, { ready = true, error = false } = {}) {
        state.events = events || [];
        state.ready = ready;
        state.error = error;
        render();
        if (openEvent) {
          const event = state.events.find((e) => e.id === openEvent);
          if (event) {
            if (JSON.stringify(event) !== openSnapshot) open(event);
            const control = dialog.querySelector(".cal-save");
            if (control) {
              control.textContent = TrainerCompanion.isSaved(event.id)
                ? "✓ Lembrete salvo"
                : "♡ Salvar lembrete";
              control.setAttribute(
                "aria-pressed",
                String(TrainerCompanion.isSaved(event.id)),
              );
            }
          }
        }
      },
    };
  }
  window.EventCalendar = Object.freeze({ create });
})();
