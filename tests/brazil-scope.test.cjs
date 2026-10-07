"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const scope = require("../brazil-event-scope.js");

const fixture = (id, type, start, end, extra = {}) => ({
  id,
  type,
  name: id,
  start,
  end,
  url: "https://leekduck.com/events/" + id + "/",
  ...extra,
});
const space = () =>
  fixture(
    "world-space-week-2026",
    "event",
    "2026-10-04T00:00:00",
    "2026-10-10T23:59:00",
  );
const max = () =>
  fixture(
    "dynamax-uxie-mesprit-azelf-max-battle-day-2026",
    "max-battles",
    "2026-10-24T14:00:00",
    "2026-10-24T17:00:00",
    {
      name: "Dynamax Uxie, Mesprit, and Azelf Max Battle Day",
      featuredNames: ["Uxie", "Mesprit", "Azelf"],
      pokemon: [
        { name: "Uxie" },
        { name: "Mesprit" },
        { name: "Azelf", dexId: 482, shiny: true },
      ],
    },
  );
const twitch = () =>
  fixture(
    "pokemon-night-out-2026-twitch-drops",
    "twitch-drops",
    "2026-10-25T02:30:00Z",
    "2026-10-25T06:59:00Z",
  );

test("exact reviewed event admits Brazil with provenance; ID, dates, timezone or type changes do not inherit approval", () => {
  const event = space();
  assert.equal(scope.classify(event).eligible, true);
  assert.equal(scope.classify(event).reviewedAt, "2026-10-07");
  assert.equal(scope.classify(event).sourceUrl, event.url);
  for (const change of [
    { id: "world-space-week-2027" },
    { start: "2027-10-04T00:00:00" },
    { end: "2026-10-11T23:59:00" },
    { start: event.start + "Z" },
    { type: "research" },
    { end: null },
  ])
    assert.equal(scope.classify({ ...event, ...change }).eligible, false);
  assert.equal(
    scope.classify({
      ...event,
      start: event.start + ".000",
      end: event.end + ".000",
    }).eligible,
    true,
  );
});

test("raw feed and normalized inputs agree", () => {
  const { id, type, url, ...rest } = space();
  assert.deepEqual(
    scope.classify({ ...rest, eventID: id, eventType: type, link: url }),
    scope.classify(space()),
  );
});

test("TCG store promotion is US-only despite generic name and event type", () => {
  const result = scope.classify(
    fixture(
      "pokemon-tcg-30th-celebration",
      "event",
      "2026-09-27T10:00:00",
      "2026-10-20T22:00:00",
    ),
  );
  assert.equal(result.scope, "regional");
  assert.equal(result.eligible, false);
  assert.match(result.reason, /Estados Unidos/);
});

test("physical editions abroad are excluded and an explicit global edition is accepted", () => {
  for (const [type, name] of [
    ["wild-area", "Pokémon GO Wild Area: Sendai • Tohoku"],
    ["wild-area", "Pokémon GO Wild Area: Mexico City"],
    ["pokemon-go-tour", "Pokémon GO Tour: Alola - Kaohsiung"],
    ["pokemon-go-tour", "Pokémon GO Tour: Alola - Los Angeles"],
    ["city-safari", "City Safari: São Paulo"], // Still requires verified Brazilian evidence.
  ])
    assert.equal(scope.classify({ type, name }).eligible, false);
  for (const type of ["wild-area", "pokemon-go-tour", "go-fest"]) {
    assert.equal(
      scope.classify({ type, name: "Pokémon GO: Global" }).eligible,
      true,
    );
    assert.equal(
      scope.classify({ type, name: "Pokémon GO: Global - Japan exclusive" })
        .eligible,
      false,
    );
  }
});

test("only recurring allowlisted types pass automatically; geographic restrictions override them", () => {
  for (const type of [
    "raid-battles",
    "raid-hour",
    "pokemon-spotlight-hour",
    "max-mondays",
    "community-day",
    "go-battle-league",
    "season",
  ]) {
    assert.equal(
      scope.classify({ type, name: "Alolan Raichu" }).eligible,
      true,
    );
    assert.equal(
      scope.classify({ type, name: "Only in Osaka" }).eligible,
      false,
    );
  }
  assert.equal(
    scope.classify({ type: "go-battle-league", name: "2026 GO LAIC Cup" })
      .eligible,
    true,
  );
  for (const type of [
    "event",
    "research",
    "go-pass",
    "max-battles",
    "raid-day",
    "new-type",
  ]) {
    assert.equal(
      scope.classify({ type, name: "Global bonus" }).eligible,
      false,
    );
  }
});

test("adidas research includes only documented participating Brazilian stores", () => {
  const result = scope.classify(
    fixture(
      "pokemon-x-adidas-2026",
      "research",
      "2026-09-25T10:00:00",
      "2027-01-15T20:00:00",
    ),
  );
  assert.equal(result.scope, "brazil");
  assert.equal(result.label, "Brasil · lojas participantes");
  assert.match(result.reason, /Rio de Janeiro/);
  assert.match(result.reason, /São Paulo/);
});

test("regional raid species require edition-specific evidence rather than recurring-type approval", () => {
  for (const type of ["raid-battles", "raid-hour"]) {
    for (const name of ["Uxie", "Mesprit", "Xurkitree", "Pheromosa"]) {
      for (const detail of [
        { name: name + " Raid Hour" },
        { featuredNames: [name] },
        { pokemon: [{ name: name.toLowerCase() }] },
        { extraData: { raidbattles: { bosses: [{ name }] } } },
      ]) {
        const result = scope.classify({ type, ...detail });
        assert.equal(result.eligible, false);
        assert.equal(result.scope, "unknown");
        assert.match(result.reason, /confirmação específica/);
      }
    }
    for (const name of [
      "Azelf",
      "Alolan Raichu",
      "Hisuian Typhlosion",
      "Galarian Articuno",
      "Uxiel",
      "NotMesprit",
    ]) {
      assert.equal(scope.classify({ type, name }).eligible, true);
    }
  }
  // Reviewed ID+interval still precedes this safeguard and retains Azelf.
  assert.equal(scope.classify(max()).eligible, true);
  assert.deepEqual(scope.filter([max()])[0].featuredNames, ["Azelf"]);
});

test("Max Battle Day shows only Azelf locally and leaves original feed untouched", () => {
  const event = max();
  const original = structuredClone(event);
  const [filtered] = scope.filter([event]);
  assert.equal(filtered.name, "Dynamax Azelf · Dia de Batalhas Max");
  assert.equal(filtered.originalName, event.name);
  assert.deepEqual(filtered.featuredNames, ["Azelf"]);
  assert.deepEqual(filtered.pokemon, [
    { name: "Azelf", dexId: 482, shiny: true },
  ]);
  assert.match(filtered.availability.reason, /Américas/);
  assert.deepEqual(event, original);
  assert.deepEqual(
    scope.filter([{ ...event, end: "2026-10-25T17:00:00" }]),
    [],
  );
  assert.deepEqual(scope.filter([{ ...event, pokemon: [] }])[0].pokemon, []);
});

test("Twitch is global but no fabricated end is retained; filtering is idempotent", () => {
  const event = twitch();
  const [filtered] = scope.filter([event]);
  assert.equal(filtered.end, null);
  assert.equal(filtered.availability.endConfirmed, false);
  assert.match(filtered.scheduleNote, /ainda não anunciado/);
  assert.equal(event.end, "2026-10-25T06:59:00Z");
  assert.deepEqual(scope.filter([filtered]), [filtered]);
  assert.equal(
    scope.classify({ ...event, end: "2026-10-26T06:59:00Z" }).eligible,
    false,
  );
});

test("Minior Geminids covers both hemispheres without inventing the Brazilian core color", () => {
  const result = scope.classify(
    fixture(
      "minior-showers-geminids-2026",
      "event",
      "2026-12-11T17:00:00",
      "2026-12-16T23:59:00",
    ),
  );
  assert.equal(result.eligible, true);
  assert.match(result.reason, /dois hemisférios/);
  assert.match(result.reason, /ainda não foram anunciadas/);
});

test("malformed inputs fail closed and links cannot introduce executable or untrusted URLs", () => {
  for (const event of [
    null,
    undefined,
    "event",
    [],
    {},
    { type: "__proto__" },
  ]) {
    assert.equal(scope.classify(event).eligible, false);
  }
  for (const url of [
    "javascript:alert(1)",
    "https://leekduck.com.evil.test/",
    "https://user:password@leekduck.com/",
    "http://leekduck.com/",
  ]) {
    assert.equal(
      scope.classify({ type: "raid-hour", name: "Raikou", url }).sourceUrl,
      null,
    );
  }
  assert.deepEqual(scope.filter(null), []);
  assert.deepEqual(
    scope.filter([null, {}, space()]).map((event) => event.id),
    [space().id],
  );
});
