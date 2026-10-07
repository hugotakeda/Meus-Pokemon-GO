/*
 * Brazil availability policy for ScrapedDuck/Leek Duck events.
 * The feed has no structured location field. Exceptional events below were
 * reviewed against their source pages on 2026-10-07. Approval is scoped to
 * the exact ID, type AND interval; it must never roll into a later edition.
 * This is editorial evidence, not a live geography API. Unknown events stay
 * hidden until reviewed. Keep availability.reason/sourceUrl visible in UI.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BrazilEventScope = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const REVIEWED_AT = "2026-10-07";
  const RECURRING_GLOBAL = new Set([
    "raid-battles",
    "raid-hour",
    "pokemon-spotlight-hour",
    "max-mondays",
    "community-day",
    "go-battle-league",
    "season",
  ]);
  const LIVE_TYPES = new Set([
    "wild-area",
    "pokemon-go-fest",
    "go-fest",
    "pokemon-go-tour",
    "go-tour",
    "safari-zone",
    "city-safari",
    "pokemon-go-safari-zone",
    "pokemon-go-city-safari",
  ]);
  const EVIDENCE = new Map();

  function record(id, type, start, end, scope, reason, extra) {
    EVIDENCE.set(
      id,
      Object.freeze({
        id,
        type,
        start,
        end,
        scope,
        reason,
        eligible: scope === "global" || scope === "brazil",
        label:
          scope === "global"
            ? "Global · disponível no Brasil"
            : scope === "brazil"
              ? "Brasil"
              : "Evento fora do Brasil",
        sourceUrl: "https://leekduck.com/events/" + id + "/",
        reviewedAt: REVIEWED_AT,
        ...extra,
      }),
    );
  }

  record(
    "world-space-week-2026",
    "event",
    "2026-10-04T00:00:00",
    "2026-10-10T23:59:00",
    "global",
    "A fonte descreve este evento como global; a colaboração com a agência espacial europeia não o limita à Europa.",
  );
  record(
    "sandile-hatch-day-2026",
    "event",
    "2026-10-17T11:00:00",
    "2026-10-17T17:00:00",
    "global",
    "Dia de chocar Sandile anunciado no horário local dos Treinadores; compras opcionais podem variar por região.",
  );
  record(
    "fall-marathon-buddy-trek-2026",
    "event",
    "2026-10-13T10:00:00",
    "2026-10-19T20:00:00",
    "global",
    "Evento no jogo anunciado para os Treinadores no horário local, com pesquisa gratuita e GO Pass automático.",
  );
  record(
    "pokemon-tcg-30th-celebration",
    "event",
    "2026-09-27T10:00:00",
    "2026-10-20T22:00:00",
    "regional",
    "Disponível somente em lojas Target, Best Buy e GameStop participantes nos Estados Unidos.",
  );
  record(
    "dynamax-uxie-mesprit-azelf-max-battle-day-2026",
    "max-battles",
    "2026-10-24T14:00:00",
    "2026-10-24T17:00:00",
    "brazil",
    "No Brasil, o chefe local é Azelf (Américas e Groenlândia). Uxie e Mesprit aparecem em outras regiões.",
    { label: "Brasil · Azelf", brazilPokemon: "Azelf" },
  );
  record(
    "pokemon-night-out-2026-twitch-drops",
    "twitch-drops",
    "2026-10-25T02:30:00Z",
    "2026-10-25T06:59:00Z",
    "global",
    "As recompensas da transmissão Twitch são globais; o show presencial acontece em Los Angeles.",
    {
      endConfirmed: false,
      scheduleNote: "Horário de término ainda não anunciado na fonte.",
    },
  );
  record(
    "halloween-2026-part-1",
    "event",
    "2026-10-27T10:00:00",
    "2026-11-01T10:00:00",
    "global",
    "Evento de Halloween no jogo, no horário local dos Treinadores, com encontros e GO Pass automático.",
  );
  record(
    "halloween-2026-part-2",
    "event",
    "2026-11-01T10:00:00",
    "2026-11-05T20:00:00",
    "global",
    "Segunda parte do evento de Halloween no jogo; os horários publicados ainda são previstos.",
    {
      scheduleNote:
        "Horários previstos pela fonte; detalhes ainda serão anunciados.",
    },
  );
  record(
    "go-pass-october-2026",
    "go-pass",
    "2026-10-06T10:00:00",
    "2026-11-03T10:00:00",
    "global",
    "GO Pass gratuito recebido automaticamente pelos Treinadores; disponibilidade de compras Deluxe pode variar por região.",
  );
  for (const [id, date] of [
    ["super-mega-raid-day-october-2026", "2026-10-31"],
    ["super-mega-raid-day-november-2026", "2026-11-28"],
  ]) {
    record(
      id,
      "raid-day",
      date + "T14:00:00",
      date + "T17:00:00",
      "global",
      "Dia de Megarreides anunciado no horário local. A fonte ainda não publicou os chefes e demais detalhes.",
    );
  }

  // The annual schedule on the Orionids source page explicitly covers both
  // hemispheres. Geminids has different core colors by hemisphere; no color
  // has been announced, and Brazil itself crosses the equator.
  for (const [id, start, end] of [
    ["minior-showers-orionids-2026", "2026-10-19", "2026-10-24"],
    ["minior-showers-leonids-2026", "2026-11-14", "2026-11-19"],
    ["minior-showers-geminids-2026", "2026-12-11", "2026-12-16"],
    ["minior-showers-eta-aquariids-2027", "2027-05-03", "2027-05-08"],
    [
      "minior-showers-southern-delta-aquariids-2027",
      "2027-07-28",
      "2027-08-02",
    ],
    ["minior-showers-perseids-2027", "2027-08-10", "2027-08-15"],
  ]) {
    record(
      id,
      "event",
      start + "T17:00:00",
      end + "T23:59:00",
      "global",
      id.includes("geminids")
        ? "Evento nos dois hemisférios. Na Geminids, a cor do núcleo varia entre Norte e Sul; as cores ainda não foram anunciadas."
        : "Chuva de Minior do calendário anunciado, disponível no horário local; não há restrição ao hemisfério Norte.",
      {
        sourceUrl: "https://leekduck.com/events/minior-showers-orionids-2026/",
      },
    );
  }

  // Official map linked by Leek Duck, read 2026-10-07:
  // https://www.google.com/maps/d/viewer?mid=19w5-ATT1vG5vc3fiqBJupegP9rDD6Zg
  // Ipanema (-22.98346,-43.20918), Oscar Freire (-23.564,-46.671),
  // Pinheiros (-23.5653572,-46.6826547), Top Center (-23.5665,-46.651694).
  // The global avatar-shoes code is a separate benefit, not evidence that
  // this location-based research can be received anywhere in Brazil.
  record(
    "pokemon-x-adidas-2026",
    "research",
    "2026-09-25T10:00:00",
    "2027-01-15T20:00:00",
    "brazil",
    "Pesquisa presencial em lojas participantes: Ipanema (Rio de Janeiro), Oscar Freire, Pinheiros e Top Center (São Paulo). Consulte o mapa da fonte antes de ir.",
    { label: "Brasil · lojas participantes" },
  );

  for (const [id, type, start, end, city] of [
    [
      "pokemon-go-wild-area-2026-sendai-japan",
      "wild-area",
      "2026-11-06T01:00:00Z",
      "2026-11-08T09:00:00Z",
      "Sendai/Tohoku, Japão",
    ],
    [
      "pokemon-go-wild-area-2026-mexico-city",
      "wild-area",
      "2026-11-06T16:00:00Z",
      "2026-11-09T00:00:00Z",
      "Cidade do México, México",
    ],
    [
      "pokemon-go-tour-alola-kaohsiung-2027",
      "pokemon-go-tour",
      "2027-02-18T16:00:00Z",
      "2027-02-21T15:59:59Z",
      "Kaohsiung, Taiwan",
    ],
    [
      "pokemon-go-tour-alola-los-angeles-2027",
      "pokemon-go-tour",
      "2027-02-19T08:00:00Z",
      "2027-02-22T07:59:59Z",
      "Los Angeles, Estados Unidos",
    ],
  ])
    record(
      id,
      type,
      start,
      end,
      "regional",
      "Evento presencial em " + city + ", fora do Brasil.",
    );

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }
  function dateKey(value) {
    // Ignore zero milliseconds only. Never equate a local time with UTC.
    return text(value).replace(/\.000(?=Z?$)/, "");
  }
  function sourceUrl(event) {
    try {
      const url = new URL(text(event.url || event.link));
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        /^(?:www\.)?(?:leekduck\.com|pokemongo\.com|pokemongolive\.com)$/.test(
          url.hostname,
        )
      )
        return url.href;
    } catch (_) {
      /* Untrusted feed links are optional. */
    }
    return null;
  }
  function result(scope, reason, event, extra) {
    return {
      eligible: scope === "global" || scope === "brazil",
      scope,
      label:
        scope === "global"
          ? "Global · disponível no Brasil"
          : scope === "brazil"
            ? "Brasil"
            : scope === "regional"
              ? "Evento regional"
              : "Brasil não confirmado",
      reason,
      sourceUrl: sourceUrl(event),
      reviewedAt: null,
      ...extra,
    };
  }
  function regionalMarker(value) {
    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    // Pokémon forms (Alolan, Galarian, Hisuian) and named GBL cups are not
    // real-world location restrictions. Do not scan descriptions/bonuses.
    return (
      /\b(?:sendai|tohoku|kaohsiung|los[ -]angeles|mexico[ -]city|cidade do mexico|osaka|seoul|taipei|taiwan|japan|japao|united[ -]states|estados unidos|united kingdom|london|new[ -]york|madrid|paris|singapore|singapura)\b/.test(
        normalized,
      ) ||
      /\b(?:regional[ -]exclusive|region[ -]exclusive|location[ -]exclusive|exclusive[ -]to|only[ -]in|exclusiv[oa][ -](?:em|de)|somente[ -]em|apenas[ -]em)\b/.test(
        normalized,
      )
    );
  }

  function needsRaidRegionReview(event, title, id) {
    // These species have regional distributions, but special events can
    // override them. Require event-specific evidence instead of declaring
    // that they can never appear in Brazil. Whole names only: fictional
    // Pokémon form regions (Alolan, Galarian, etc.) are unrelated to this.
    const names = [title, id];
    if (Array.isArray(event.featuredNames)) names.push(...event.featuredNames);
    if (Array.isArray(event.pokemon)) {
      names.push(...event.pokemon.map((pokemon) => pokemon && pokemon.name));
    }
    const bosses =
      event.extraData &&
      event.extraData.raidbattles &&
      event.extraData.raidbattles.bosses;
    if (Array.isArray(bosses))
      names.push(...bosses.map((pokemon) => pokemon && pokemon.name));
    return names.some((name) =>
      /(?:^|[^\p{L}\p{N}_])(?:Uxie|Mesprit|Xurkitree|Pheromosa)(?=$|[^\p{L}\p{N}_])/iu.test(
        text(name),
      ),
    );
  }

  function classify(input) {
    const event = input && typeof input === "object" ? input : {};
    const id = text(event.id || event.eventID);
    const type = text(event.type || event.eventType);
    const evidence = EVIDENCE.get(id);
    if (evidence) {
      const matches =
        type === evidence.type &&
        dateKey(event.start) === evidence.start &&
        (dateKey(event.end) === evidence.end ||
          (evidence.endConfirmed === false && event.end === null));
      if (!matches)
        return result(
          "unknown",
          "As datas ou o tipo mudaram; a disponibilidade no Brasil precisa ser conferida novamente.",
          event,
        );
      const {
        id: _id,
        type: _type,
        start: _start,
        end: _end,
        brazilPokemon: _pokemon,
        ...availability
      } = evidence;
      return { ...availability };
    }
    const title = text(event.name);
    if (regionalMarker(title + " " + id)) {
      return result(
        "regional",
        "O título ou identificador indica uma região ou exclusividade local; disponibilidade no Brasil não confirmada.",
        event,
      );
    }
    if (
      (type === "raid-battles" || type === "raid-hour") &&
      needsRaidRegionReview(event, title, id)
    ) {
      return result(
        "unknown",
        "Este evento inclui espécie com distribuição regional; a presença no Brasil precisa de confirmação específica para esta edição.",
        event,
      );
    }
    if (RECURRING_GLOBAL.has(type)) {
      return result(
        "global",
        "Programação recorrente global do jogo, disponível no Brasil; siga o horário indicado no evento.",
        event,
      );
    }
    if (LIVE_TYPES.has(type) && /\bglobal\b/i.test(title)) {
      return result(
        "global",
        "Edição explicitamente Global, disponível no Brasil; não é a edição presencial de outra cidade.",
        event,
      );
    }
    return result(
      "unknown",
      "A fonte não oferece confirmação suficiente de disponibilidade no Brasil para este evento.",
      event,
    );
  }

  function filter(events) {
    if (!Array.isArray(events)) return [];
    return events.flatMap((event) => {
      const availability = classify(event);
      if (!availability.eligible) return [];
      const output = { ...event, availability };
      if (availability.scheduleNote)
        output.scheduleNote = availability.scheduleNote;
      if (availability.endConfirmed === false) output.end = null;
      const evidence = EVIDENCE.get(text(event.id || event.eventID));
      if (evidence && evidence.brazilPokemon) {
        output.originalName = event.originalName || event.name;
        output.name = "Dynamax Azelf · Dia de Batalhas Max";
        output.featuredNames = ["Azelf"];
        output.pokemon = Array.isArray(event.pokemon)
          ? event.pokemon.filter(
              (pokemon) =>
                pokemon && text(pokemon.name).toLowerCase() === "azelf",
            )
          : [];
      }
      return [output];
    });
  }

  return Object.freeze({ classify, filter });
});
