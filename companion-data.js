/*
 * Public community data: Leek Duck, delivered by ScrapedDuck.
 * https://github.com/bigfoott/ScrapedDuck#for-developers
 * Keep visible attribution to both providers. This API must not be used behind
 * a paywall or in an application monetized with advertisements.
 * fetchedAt means downloaded by this browser, NOT updated by the publisher.
 */
(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CompanionData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const BASE = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/";
  const CACHE_KEY = "pgo-companion-feed-v1";
  const CACHE_TTL = 15 * 60 * 1000;
  const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;
  const REQUEST_TIMEOUT = 12000;
  const MAX_ITEMS = 3000;
  const SOURCE_DEFINITIONS = Object.freeze({
    events: {
      file: "events.min.json",
      pageUrl: "https://leekduck.com/events/",
    },
    raids: { file: "raids.min.json", pageUrl: "https://leekduck.com/boss/" },
    eggs: { file: "eggs.min.json", pageUrl: "https://leekduck.com/eggs/" },
    research: {
      file: "research.min.json",
      pageUrl: "https://leekduck.com/research/",
    },
    rocket: {
      file: "rocketLineups.min.json",
      pageUrl: "https://leekduck.com/rocket-lineups/",
    },
  });
  const ATTRIBUTION = Object.freeze([
    { name: "Leek Duck", url: "https://leekduck.com/" },
    { name: "ScrapedDuck", url: "https://github.com/bigfoott/ScrapedDuck" },
  ]);

  const object = (value) =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const array = (value) =>
    Array.isArray(value) ? value.slice(0, MAX_ITEMS) : [];
  const boolean = (value) => (typeof value === "boolean" ? value : null);
  const number = (value) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : null;

  // Returned strings are plain text. Consumers must still use textContent rather
  // than inserting remote strings into HTML, attributes, styles or handlers.
  function safeText(value, limit = 600) {
    if (typeof value !== "string") return "";
    const entities = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " ",
    };
    return value
      .slice(0, 10000)
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(
        /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
        (match, key) => {
          if (key[0] !== "#") return entities[key.toLowerCase()] || match;
          const n =
            key[1].toLowerCase() === "x"
              ? parseInt(key.slice(2), 16)
              : parseInt(key.slice(1), 10);
          return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
            ? String.fromCodePoint(n)
            : "";
        },
      )
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

  function safeURL(value, allowedHosts) {
    if (typeof value !== "string" || value.length > 2000) return "";
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password) return "";
      if (allowedHosts && !allowedHosts.includes(url.hostname)) return "";
      return url.href;
    } catch (_) {
      return "";
    }
  }

  const imageURL = (value) =>
    safeURL(value, ["leekduck.com", "www.leekduck.com", "cdn.leekduck.com"]);
  const pageURL = (value) =>
    safeURL(value, ["leekduck.com", "www.leekduck.com"]);
  const slug = (value) =>
    safeText(value, 240)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  function cpRange(value) {
    const obj = object(value),
      min = number(obj.min),
      max = number(obj.max);
    return min !== null && max !== null && min <= max ? { min, max } : null;
  }

  function dexIdFromImage(image) {
    const match = image.match(/\/(?:pm(\d+)[._]|pokemon_icon_(\d+)_)/);
    const id = match ? Number(match[1] || match[2]) : null;
    return Number.isInteger(id) && id > 0 && id < 10000 ? id : null;
  }

  function pokemon(value) {
    const raw = object(value),
      name = safeText(raw.name, 140);
    if (!name) return null;
    const image = imageURL(raw.image),
      dexId = dexIdFromImage(image);
    return {
      id: (dexId || "unknown") + "-" + slug(name),
      dexId,
      name,
      image,
      canBeShiny: boolean(raw.canBeShiny),
      shinyOdds: null,
      types: array(raw.types)
        .map((t) => safeText(typeof t === "string" ? t : object(t).name, 30))
        .filter(Boolean),
      cp: cpRange(raw.combatPower),
      isEncounter: boolean(raw.isEncounter),
    };
  }

  function validDate(value) {
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?$/.test(
        value,
      )
    )
      return null;
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() !== m - 1 ||
      date.getUTCDate() !== d
    )
      return null;
    return Number.isFinite(Date.parse(value)) ? value : null;
  }

  // The source documents times without a UTC offset as the player's local time.
  // Never append Z: that would silently shift a local Community Day/raid hour.
  function eventStatus(event, now = Date.now()) {
    const start = validDate(event && event.start),
      end = validDate(event && event.end);
    if (end && Date.parse(end) <= now) return "ended";
    if (start && Date.parse(start) > now) return "upcoming";
    if (start && end && Date.parse(start) <= now && Date.parse(end) > now)
      return "active";
    return "unknown";
  }

  function normalizeEvents(raw) {
    return raw
      .map((value) => {
        const row = object(value),
          name = safeText(row.name, 200);
        if (!name) return null;
        const extra = object(row.extraData),
          community = object(extra.communityday);
        const spotlight = object(extra.spotlight),
          raid = object(extra.raidbattles);
        const pokemonRows = [
          spotlight,
          object(extra.breakthrough),
          ...array(raid.bosses),
          ...array(community.spawns),
        ];
        let start = validDate(row.start),
          end = validDate(row.end);
        if (start && end && Date.parse(end) < Date.parse(start)) {
          start = null;
          end = null;
        }
        const eventID = safeText(row.eventID, 240) || slug(name);
        const link = pageURL(row.link);
        const unique = new Map(
          pokemonRows
            .map(pokemon)
            .filter(Boolean)
            .map((p) => [p.id, p]),
        );
        return {
          id: eventID,
          eventID,
          name,
          type: safeText(row.eventType, 80) || "event",
          heading: safeText(row.heading, 100),
          url: link,
          link,
          image: imageURL(row.image),
          start,
          end,
          timeZone: !(start || end)
            ? "unknown"
            : /(?:Z|[+-]\d{2}:\d{2})$/.test(start || end)
              ? "absolute"
              : "local",
          pokemon: Array.from(unique.values()),
          bonuses: [
            spotlight.bonus,
            ...array(community.bonuses).map((b) => object(b).text),
          ]
            .map((b) => safeText(b, 300))
            .filter(Boolean),
        };
      })
      .filter(Boolean);
  }

  function normalizeRaids(raw) {
    return raw
      .map((value) => {
        const row = object(value),
          p = pokemon(row);
        if (!p) return null;
        const tier = safeText(row.tier, 100);
        return {
          ...p,
          id: p.id + "-" + slug(tier),
          tier,
          cp: cpRange(object(row.combatPower).normal),
          boostedCp: cpRange(object(row.combatPower).boosted),
          weather: array(row.boostedWeather)
            .map((w) => safeText(object(w).name, 40))
            .filter(Boolean),
          shadow: /shadow/i.test(p.name + " " + tier),
        };
      })
      .filter(Boolean);
  }

  function normalizeEggs(raw) {
    return raw
      .map((value) => {
        const row = object(value),
          p = pokemon(row);
        if (!p) return null;
        const eggType = safeText(row.eggType, 80),
          match = eggType.match(/^(\d+(?:\.\d+)?)\s*km$/i);
        const adventure = row.isAdventureSync === true,
          gift = row.isGiftExchange === true;
        return {
          ...p,
          id:
            p.id +
            "-" +
            slug(eggType) +
            (adventure ? "-adventure" : "") +
            (gift ? "-gift" : ""),
          eggType,
          distance: match ? Number(match[1]) : null,
          isAdventureSync: adventure,
          isRegional: row.isRegional === true,
          isGiftExchange: gift,
          rarity:
            Number.isInteger(row.rarity) && row.rarity >= 1 && row.rarity <= 5
              ? row.rarity
              : null,
        };
      })
      .filter(Boolean);
  }

  function normalizeResearch(raw) {
    return raw
      .map((value) => {
        const row = object(value),
          text = safeText(row.text),
          type = safeText(row.type, 80) || "event";
        if (!text) return null;
        const rewards = array(row.rewards).map(pokemon).filter(Boolean);
        return {
          id:
            slug(type + "-" + text) + "-" + rewards.map((p) => p.id).join("-"),
          text,
          type,
          rewards,
        };
      })
      .filter(Boolean);
  }

  function normalizeRocket(raw) {
    return raw
      .map((value) => {
        const row = object(value),
          name = safeText(row.name, 140);
        if (!name) return null;
        const type = safeText(row.type, 60),
          title = safeText(row.title, 200);
        return {
          id: slug(name + "-" + title + "-" + type),
          name,
          type,
          title,
          slots: ["firstPokemon", "secondPokemon", "thirdPokemon"].map((key) =>
            array(row[key]).map(pokemon).filter(Boolean),
          ),
        };
      })
      .filter(Boolean);
  }

  const normalizers = {
    events: normalizeEvents,
    raids: normalizeRaids,
    eggs: normalizeEggs,
    research: normalizeResearch,
    rocket: normalizeRocket,
  };
  function normalize(kind, raw) {
    if (!normalizers[kind]) throw new Error("Fonte desconhecida.");
    if (!Array.isArray(raw) || raw.length > MAX_ITEMS)
      throw new Error("Formato de dados inesperado.");
    const result = normalizers[kind](raw);
    if (raw.length && !result.length)
      throw new Error("A fonte não retornou registros válidos.");
    return result;
  }

  function createClient(options = {}) {
    const fetcher = options.fetch || (root.fetch && root.fetch.bind(root));
    const now = options.now || Date.now;
    const timeout = options.timeoutMs || REQUEST_TIMEOUT;
    let storage = options.storage;
    if (storage === undefined) {
      try {
        storage = root.localStorage;
      } catch (_) {
        storage = null;
      }
    }
    let memory = {},
      pending = null;

    function readCache() {
      try {
        const value = storage && storage.getItem(CACHE_KEY);
        if (!value || value.length > 2500000) return memory;
        const parsed = JSON.parse(value);
        if (parsed && parsed.version === 1)
          return { ...object(parsed.sources), ...memory };
      } catch (_) {
        /* Blocked/quota-limited storage must not break the site. */
      }
      return memory;
    }

    function cacheEntry(cache, kind, currentTime) {
      const entry = object(cache[kind]),
        age = currentTime - entry.fetchedAt;
      if (typeof entry.fetchedAt !== "number" || age < 0 || age > MAX_CACHE_AGE)
        return null;
      try {
        return { ...entry, items: normalize(kind, entry.raw) };
      } catch (_) {
        return null;
      }
    }

    async function request(url) {
      if (!fetcher)
        throw new Error("Este navegador não permite consultar a fonte.");
      const controller =
        typeof AbortController !== "undefined" ? new AbortController() : null;
      let timer;
      try {
        return await Promise.race([
          (async () => {
            const response = await fetcher(url, {
              signal: controller ? controller.signal : undefined,
              credentials: "omit",
              cache: "no-cache",
            });
            if (!response.ok)
              throw new Error(
                "A fonte respondeu com HTTP " + response.status + ".",
              );
            return response.json();
          })(),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              if (controller) controller.abort();
              reject(new Error("A fonte demorou demais para responder."));
            }, timeout);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    }

    async function loadAll(options = {}) {
      if (pending) return pending;
      pending = (async () => {
        const currentTime = now(),
          cache = readCache(),
          sources = {},
          result = { news: [] };
        await Promise.all(
          Object.entries(SOURCE_DEFINITIONS).map(async ([kind, definition]) => {
            const url = BASE + definition.file,
              cached = cacheEntry(cache, kind, currentTime);
            const source = {
              name: "Leek Duck / ScrapedDuck",
              url,
              pageUrl: definition.pageUrl,
              status: "error",
              fetchedAt: null,
              updatedAt: null,
              error: null,
            };
            if (
              !options.force &&
              cached &&
              currentTime - cached.fetchedAt < CACHE_TTL
            ) {
              result[kind] = cached.items;
              source.status = "cache";
              source.fetchedAt = cached.fetchedAt;
            } else {
              try {
                const raw = await request(url),
                  items = normalize(kind, raw),
                  fetchedAt = now();
                result[kind] = items;
                cache[kind] = { raw, fetchedAt };
                memory[kind] = cache[kind];
                source.status = "network";
                source.fetchedAt = fetchedAt;
              } catch (error) {
                result[kind] = cached ? cached.items : [];
                source.status = cached ? "stale" : "error";
                source.fetchedAt = cached ? cached.fetchedAt : null;
                source.error =
                  error &&
                  /^A fonte |^Formato |^Este navegador/.test(error.message)
                    ? safeText(error.message, 200)
                    : "Não foi possível consultar a fonte. Verifique sua conexão e tente novamente.";
              }
            }
            sources[kind] = source;
          }),
        );
        try {
          if (storage)
            storage.setItem(
              CACHE_KEY,
              JSON.stringify({ version: 1, sources: cache }),
            );
        } catch (_) {
          /* Memory cache remains usable. */
        }
        const states = Object.values(sources).map((source) => source.status);
        const fetched = Object.values(sources)
          .map((source) => source.fetchedAt)
          .filter((t) => t !== null);
        return {
          ...result,
          sources,
          fetchedAt: fetched.length ? Math.min(...fetched) : null,
          updatedAt: null,
          status: states.every((s) => s === states[0]) ? states[0] : "partial",
          attribution: ATTRIBUTION,
        };
      })();
      try {
        return await pending;
      } finally {
        pending = null;
      }
    }
    return { loadAll };
  }

  const client = createClient();
  return Object.freeze({
    loadAll: client.loadAll,
    createClient,
    normalize,
    eventStatus,
    safeText,
    safeURL,
    sources: SOURCE_DEFINITIONS,
    attribution: ATTRIBUTION,
    CACHE_KEY,
    CACHE_TTL,
    MAX_CACHE_AGE,
  });
});
