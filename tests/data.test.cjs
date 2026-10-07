"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const data = require("../companion-data.js");

// Small authored fixtures matching the documented ScrapedDuck schema.
// Dates are test inputs, never fallback content shipped in the application.
const picture =
  "https://cdn.leekduck.com/assets/img/pokemon_icons/pm25.icon.png";
const pokemon = {
  name: "Pikachu",
  image: picture,
  canBeShiny: true,
  types: [{ name: "electric" }],
  combatPower: { min: 493, max: 536 },
};
const fixtures = {
  events: [
    {
      eventID: "pikachu-hour",
      name: "Pikachu Hour",
      eventType: "pokemon-spotlight-hour",
      link: "https://leekduck.com/events/pikachu-hour/",
      image: picture,
      start: "2026-10-06T18:00:00",
      end: "2026-10-06T19:00:00",
      extraData: { spotlight: { ...pokemon, bonus: "2× Catch XP" } },
    },
  ],
  raids: [
    {
      ...pokemon,
      tier: "1-Star Raids",
      combatPower: {
        normal: { min: 493, max: 536 },
        boosted: { min: 616, max: 670 },
      },
      boostedWeather: [{ name: "rainy" }],
    },
  ],
  eggs: [{ ...pokemon, eggType: "5 km", isAdventureSync: true, rarity: 2 }],
  research: [
    {
      text: "<span>Catch 5 Pokémon &amp; earn a reward</span>",
      type: "catch",
      rewards: [pokemon],
    },
  ],
  rocket: [
    {
      name: "Cliff",
      title: "Team GO Rocket Leader",
      type: "",
      firstPokemon: [{ ...pokemon, types: ["electric"], isEncounter: true }],
      secondPokemon: [],
      thirdPokemon: [],
    },
  ],
};
const fileToKind = Object.fromEntries(
  Object.entries(data.sources).map(([kind, source]) => [source.file, kind]),
);
const kindFromURL = (url) => fileToKind[url.split("/").pop()];
const goodResponse = (payload) => ({
  ok: true,
  status: 200,
  json: async () => structuredClone(payload),
});
function memoryStorage(initial) {
  const store = new Map(initial ? [[data.CACHE_KEY, initial]] : []);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

test("normalizes real feed shapes, keeps forms and does not fabricate shiny odds", () => {
  const raid = data.normalize("raids", fixtures.raids)[0];
  assert.equal(raid.dexId, 25);
  assert.deepEqual(raid.cp, { min: 493, max: 536 });
  assert.deepEqual(raid.boostedCp, { min: 616, max: 670 });
  assert.deepEqual(raid.types, ["electric"]);
  assert.deepEqual(raid.weather, ["rainy"]);
  assert.equal(raid.shinyOdds, null);
  const egg = data.normalize("eggs", fixtures.eggs)[0];
  assert.equal(egg.distance, 5);
  assert.equal(egg.isAdventureSync, true);
  assert.equal(egg.rarity, 2);
  const research = data.normalize("research", fixtures.research)[0];
  assert.equal(research.text, "Catch 5 Pokémon & earn a reward");
  assert.equal(research.rewards[0].dexId, 25);
  const rocket = data.normalize("rocket", fixtures.rocket)[0];
  assert.equal(rocket.slots.length, 3);
  assert.equal(rocket.slots[0][0].isEncounter, true);
  assert.deepEqual(rocket.slots[0][0].types, ["electric"]);
  const forms = data.normalize("raids", [
    {
      ...fixtures.raids[0],
      name: "Alolan Raichu",
      image: picture.replace("pm25", "pm26.fALOLA"),
    },
    {
      ...fixtures.raids[0],
      name: "Raichu",
      image: picture.replace("pm25", "pokemon_icon_026_00"),
    },
  ]);
  assert.equal(forms[0].dexId, 26);
  assert.equal(forms[1].dexId, 26);
  assert.notEqual(forms[0].id, forms[1].id);
});

test("event local wall-clock times remain local; UTC and missing dates remain explicit", () => {
  const event = data.normalize("events", fixtures.events)[0];
  assert.equal(event.start, "2026-10-06T18:00:00");
  assert.equal(event.timeZone, "local");
  assert.equal(event.pokemon[0].dexId, 25);
  assert.deepEqual(event.bonuses, ["2× Catch XP"]);
  assert.equal(
    data.eventStatus(event, new Date(2026, 9, 6, 17, 0).getTime()),
    "upcoming",
  );
  assert.equal(
    data.eventStatus(event, new Date(2026, 9, 6, 18, 30).getTime()),
    "active",
  );
  assert.equal(
    data.eventStatus(event, new Date(2026, 9, 6, 19, 0).getTime()),
    "ended",
  );
  const absolute = data.normalize("events", [
    { ...fixtures.events[0], start: "2026-10-06T18:00:00Z", end: null },
  ])[0];
  assert.equal(absolute.timeZone, "absolute");
  assert.equal(
    data.eventStatus(absolute, Date.parse("2026-10-06T19:00:00Z")),
    "unknown",
  );
  const undated = data.normalize("events", [
    { ...fixtures.events[0], start: null, end: null },
  ])[0];
  assert.equal(undated.start, null);
  assert.equal(undated.timeZone, "unknown");
  assert.equal(data.eventStatus(undated), "unknown");
});

test("rejects executable URLs, malformed dates and non-data payloads", () => {
  assert.equal(data.safeURL("javascript:alert(1)"), "");
  assert.equal(data.safeURL("data:text/html,hello"), "");
  assert.equal(data.safeURL("https://user:password@leekduck.com"), "");
  const hostile = data.normalize("events", [
    {
      name: "<script>danger()</script>Safe",
      link: "https://attacker.example/",
      image: "javascript:alert(1)",
      start: "2026-02-30T12:00:00",
      end: "nonsense",
    },
  ])[0];
  assert.equal(hostile.name, "Safe");
  assert.equal(hostile.url, "");
  assert.equal(hostile.image, "");
  assert.equal(hostile.start, null);
  assert.equal(hostile.end, null);
  const backwards = data.normalize("events", [
    {
      ...fixtures.events[0],
      start: "2026-10-08T10:00:00",
      end: "2026-10-07T10:00:00",
    },
  ])[0];
  assert.equal(backwards.start, null);
  assert.equal(backwards.end, null);
  assert.throws(() => data.normalize("raids", { error: "outage" }), /Formato/);
  assert.throws(() => data.normalize("eggs", [null, {}]), /válidos/);
  assert.deepEqual(data.normalize("raids", []), []);
  const incomplete = data.normalize("raids", [
    {
      name: "Unknown",
      canBeShiny: "true",
      combatPower: { normal: { min: 200, max: 100 } },
    },
  ])[0];
  assert.equal(incomplete.canBeShiny, null);
  assert.equal(incomplete.cp, null);
});

test("caches successful feeds independently, force refreshes, and distinguishes retrieval from publication", async () => {
  let calls = 0,
    time = Date.parse("2026-10-06T20:00:00Z");
  const client = data.createClient({
    storage: memoryStorage(),
    now: () => time,
    fetch: async (url) => {
      calls++;
      return goodResponse(fixtures[kindFromURL(url)]);
    },
  });
  const first = await client.loadAll();
  assert.equal(first.status, "network");
  assert.equal(calls, 5);
  assert.equal(first.sources.raids.fetchedAt, time);
  assert.equal(first.sources.raids.updatedAt, null);
  time += 1000;
  const cached = await client.loadAll();
  assert.equal(cached.status, "cache");
  assert.equal(calls, 5);
  assert.equal(cached.fetchedAt, first.fetchedAt);
  await client.loadAll({ force: true });
  assert.equal(calls, 10);
});

test("an individual feed failure does not suppress other feeds and keeps its last known timestamp", async () => {
  let time = 1000000,
    broken = false;
  const client = data.createClient({
    storage: memoryStorage(),
    now: () => time,
    fetch: async (url) => {
      if (broken && kindFromURL(url) === "raids")
        return { ok: false, status: 503 };
      return goodResponse(fixtures[kindFromURL(url)]);
    },
  });
  const first = await client.loadAll();
  time += data.CACHE_TTL + 1;
  broken = true;
  const partial = await client.loadAll();
  assert.equal(partial.status, "partial");
  assert.equal(partial.sources.raids.status, "stale");
  assert.match(partial.sources.raids.error, /503/);
  assert.equal(partial.sources.raids.fetchedAt, first.sources.raids.fetchedAt);
  assert.equal(partial.raids[0].name, "Pikachu");
  assert.equal(partial.sources.eggs.status, "network");
  time += data.MAX_CACHE_AGE + 1;
  const expired = await client.loadAll();
  assert.equal(expired.sources.raids.status, "error");
  assert.equal(expired.sources.raids.fetchedAt, null);
  assert.deepEqual(expired.raids, []);
});

test("offline first load, corrupt storage and denied storage return usable error states", async () => {
  for (const storage of [
    memoryStorage("{broken"),
    {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
    },
  ]) {
    const client = data.createClient({
      storage,
      fetch: async () => {
        throw new Error("network down");
      },
    });
    const result = await client.loadAll();
    assert.equal(result.status, "error");
    assert.equal(result.fetchedAt, null);
    assert.equal(result.raids.length, 0);
    assert.match(result.sources.events.error, /conexão/);
  }
});

test("concurrent callers share one request per feed and hung requests time out", async () => {
  let calls = 0;
  const client = data.createClient({
    storage: null,
    fetch: async (url) => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return goodResponse(fixtures[kindFromURL(url)]);
    },
  });
  const [a, b] = await Promise.all([client.loadAll(), client.loadAll()]);
  assert.equal(calls, 5);
  assert.deepEqual(a, b);
  const hung = data.createClient({
    storage: null,
    timeoutMs: 10,
    fetch: () => new Promise(() => {}),
  });
  const result = await hung.loadAll();
  assert.equal(result.status, "error");
  assert.match(result.sources.events.error, /demorou/);
});

test("cached raw data is validated again and future timestamps are rejected", async () => {
  const time = 1000000;
  for (const entry of [
    { fetchedAt: time + 10000, raw: fixtures.raids },
    { fetchedAt: time - 1000, raw: { changed: "schema" } },
  ]) {
    const storage = memoryStorage(
      JSON.stringify({ version: 1, sources: { raids: entry } }),
    );
    const client = data.createClient({
      now: () => time,
      storage,
      fetch: async () => {
        throw new Error("offline");
      },
    });
    const result = await client.loadAll();
    assert.equal(result.sources.raids.status, "error");
    assert.deepEqual(result.raids, []);
  }
});
