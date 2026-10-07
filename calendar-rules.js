(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PogoCalendarRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const text = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  function date(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  function dayKey(value) {
    const d = date(value);
    return d
      ? [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, "0"),
          String(d.getDate()).padStart(2, "0"),
        ].join("-")
      : null;
  }
  function parseDay(key) {
    if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key))
      return null;
    const [y, m, d] = key.split("-").map(Number),
      result = new Date(y, m - 1, d, 12);
    return dayKey(result) === key ? result : null;
  }
  function monthDays(year, month) {
    const first = new Date(year, month, 1, 12),
      offset = (first.getDay() + 6) % 7;
    const length = new Date(year, month + 1, 0).getDate();
    return Array.from(
      { length: Math.max(35, Math.ceil((offset + length) / 7) * 7) },
      (_, i) => {
        const d = new Date(year, month, 1 - offset + i, 12);
        return {
          key: dayKey(d),
          date: d,
          inMonth:
            d.getMonth() === first.getMonth() &&
            d.getFullYear() === first.getFullYear(),
        };
      },
    );
  }
  function overlaps(event, start, end) {
    const a = date(event?.start),
      b = date(event?.end);
    if (!a || !b || b < a) return false;
    // Zero-duration announcements belong to their starting day; all other
    // intervals are half-open, so an end at midnight does not add another day.
    return +a === +b ? a >= start && a < end : a < end && b > start;
  }
  function eventsOnDay(events, key) {
    const d = parseDay(key);
    if (!d) return [];
    return (events || []).filter((e) =>
      overlaps(
        e,
        new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      ),
    );
  }
  function eventsInMonth(events, year, month) {
    return (events || []).filter((e) =>
      overlaps(e, new Date(year, month, 1), new Date(year, month + 1, 1)),
    );
  }
  const labels = {
    raids: "Raids",
    mega: "Megarreides",
    shadow: "Reides sombrosos",
    "raid-hour": "Hora de Reide",
    max: "Batalhas Max",
    spotlight: "Hora do Holofote",
    community: "Comunidade",
    research: "Pesquisas",
    season: "Temporada",
    battle: "Liga de Batalha GO",
    events: "Eventos",
    other: "Outros eventos",
  };
  function scheduleCategory(event) {
    const type = text(event?.type),
      name = text(event?.name),
      names = (event?.pokemon || []).map((p) => text(p.name)).join(" ");
    let id = "events";
    if (type === "season") id = "season";
    else if (type.includes("raid-hour")) id = "raid-hour";
    else if (type.includes("spotlight")) id = "spotlight";
    else if (type.includes("community")) id = "community";
    else if (type.includes("max-")) id = "max";
    else if (type.includes("raid"))
      id = /\bshadow\b/.test(name + " " + names)
        ? "shadow"
        : /\bmega\b/.test(name + " " + names)
          ? "mega"
          : "raids";
    else if (
      type.includes("battle") ||
      type.includes("gbl") ||
      type.includes("go-league")
    )
      id = "battle";
    else if (type.includes("research") || type.includes("breakthrough"))
      id = "research";
    return { id, label: labels[id] };
  }
  function category(event) {
    let id = scheduleCategory(event).id;
    if (["mega", "shadow", "raid-hour"].includes(id)) id = "raids";
    if (id === "spotlight") id = "community";
    if (["season", "events"].includes(id)) id = "other";
    return { id, label: labels[id] };
  }
  function filterEvents(
    events,
    { query = "", category: filter = "all", savedIds = null } = {},
  ) {
    const terms = text(query).trim().split(/\s+/).filter(Boolean),
      saved = savedIds === null ? null : new Set(savedIds.map(String));
    return (events || []).filter((event) => {
      if (filter !== "all" && category(event).id !== filter) return false;
      if (saved && !saved.has(String(event.id))) return false;
      const search = text(
        [
          event.name,
          event.heading,
          scheduleCategory(event).label,
          ...(event.pokemon || []).map((p) => p.name),
          ...(event.featuredNames || []),
          ...(event.bonuses || []),
        ].join(" "),
      );
      return terms.every((term) => search.includes(term));
    });
  }
  function relativeTime(event, now = new Date()) {
    const start = date(event?.start),
      end = date(event?.end),
      current = date(now);
    if (!start || !end || !current || end < start)
      return "Horário não informado";
    if (end <= current) return "Encerrado";
    if (start <= current) return "Acontecendo";
    const calendarDays = Math.round(
      (Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) -
        Date.UTC(
          current.getFullYear(),
          current.getMonth(),
          current.getDate(),
        )) /
        86400000,
    );
    if (calendarDays === 1) return "Amanhã";
    if (calendarDays > 1) return "Em " + calendarDays + " dias";
    const minutes = Math.ceil((start - current) / 60000);
    if (minutes < 60) return "Em " + minutes + " min";
    if (minutes < 1440) return "Em " + Math.ceil(minutes / 60) + " h";
    const days = Math.ceil(minutes / 1440);
    return "Em " + days + (days === 1 ? " dia" : " dias");
  }
  function shiftMonth(year, month, delta) {
    const d = new Date(year, month + delta, 1, 12);
    return { year: d.getFullYear(), month: d.getMonth() };
  }
  return Object.freeze({
    dayKey,
    parseDay,
    monthDays,
    eventsOnDay,
    eventsInMonth,
    category,
    scheduleCategory,
    filterEvents,
    relativeTime,
    shiftMonth,
  });
});
