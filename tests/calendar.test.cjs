"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../calendar-rules.js");
const e = (id, start, end, extra = {}) => ({
  id,
  name: id,
  start,
  end,
  ...extra,
});
test("month cells cover Monday–Sunday, leap days and year rollover", () => {
  for (const [year, month] of [
    [2026, 9],
    [2026, 1],
    [2024, 1],
    [2026, 11],
    [2027, 0],
  ]) {
    const cells = rules.monthDays(year, month);
    assert.ok([35, 42].includes(cells.length));
    assert.equal(cells[0].date.getDay(), 1);
    assert.equal(cells.at(-1).date.getDay(), 0);
    assert.equal(
      cells.filter((d) => d.inMonth).length,
      new Date(year, month + 1, 0).getDate(),
    );
    assert.equal(new Set(cells.map((d) => d.key)).size, cells.length);
    assert.ok(
      cells.every((c) => rules.dayKey(rules.parseDay(c.key)) === c.key),
    );
  }
  assert.deepEqual(rules.shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.equal(rules.parseDay("2026-02-30"), null);
  assert.equal(rules.dayKey(null), null);
});
test("overlap preserves cross-month events but excludes an exclusive midnight end", () => {
  const events = [
    e("raid", "2026-09-30T10:00:00", "2026-10-07T10:00:00"),
    e("midnight", "2026-10-06T10:00:00", "2026-10-07T00:00:00"),
    e("single", "2026-10-07T18:00:00", "2026-10-07T19:00:00"),
    e("bad", null, null),
    e("reverse", "2026-10-09T00:00:00", "2026-10-08T00:00:00"),
  ];
  assert.deepEqual(
    rules.eventsOnDay(events, "2026-10-07").map((e) => e.id),
    ["raid", "single"],
  );
  assert.deepEqual(
    rules.eventsInMonth(events, 2026, 8).map((e) => e.id),
    ["raid"],
  );
  assert.deepEqual(
    rules.eventsInMonth(events, 2026, 9).map((e) => e.id),
    ["raid", "midnight", "single"],
  );
  assert.deepEqual(rules.eventsOnDay(events, "bad"), []);
});
test("UTC date intervals use device local day and zero-duration announcements stay in one day", () => {
  const start = new Date(2026, 9, 7, 23, 30),
    end = new Date(2026, 9, 8, 0, 30);
  const event = e("utc", start.toISOString(), end.toISOString());
  assert.equal(rules.eventsOnDay([event], "2026-10-07").length, 1);
  assert.equal(rules.eventsOnDay([event], "2026-10-08").length, 1);
  const point = e("point", "2026-10-07T12:00:00", "2026-10-07T12:00:00");
  assert.equal(rules.eventsOnDay([point], "2026-10-07").length, 1);
  assert.equal(rules.eventsOnDay([point], "2026-10-08").length, 0);
});
test("fine schedule groups prioritize spotlight, raid-hour, shadow and max", () => {
  for (const [type, name, id] of [
    ["raid-battles", "Mega Charizard X", "mega"],
    ["raid-battles", "Shadow Thundurus", "shadow"],
    ["raid-hour", "Yveltal Raid Hour", "raid-hour"],
    ["max-mondays", "Dynamax Rookidee during Max Monday", "max"],
    ["pokemon-spotlight-hour", "Gastly", "spotlight"],
    ["community-day", "Zorua Community Day", "community"],
    ["go-battle-league", "Great League", "battle"],
    ["season", "Twilight Trails", "season"],
    ["timed-research", "Task", "research"],
    ["event", "Harvest Festival", "events"],
  ])
    assert.equal(rules.scheduleCategory({ type, name }).id, id);
  assert.equal(
    rules.category({ type: "raid-battles", name: "Mega Charizard" }).id,
    "raids",
  );
  assert.equal(
    rules.category({ type: "pokemon-spotlight-hour" }).id,
    "community",
  );
});
test("search matches featured names, accented bonuses, category and saved IDs together", () => {
  const events = [
    e("1", null, null, {
      type: "max-mondays",
      name: "Max Monday",
      featuredNames: ["Rookidee"],
      bonuses: ["Bônus de Poeira Estelar"],
    }),
    e("2", null, null, { type: "raid-battles", name: "Yveltal" }),
  ];
  assert.equal(
    rules.filterEvents(events, {
      query: "rookidee bonus",
      category: "max",
      savedIds: ["1"],
    }).length,
    1,
  );
  assert.equal(rules.filterEvents(events, { savedIds: [] }).length, 0);
  assert.equal(rules.filterEvents(events, { savedIds: null }).length, 2);
  assert.equal(
    rules.filterEvents(events, { query: "rookidee", category: "raids" }).length,
    0,
  );
});
test("relative labels distinguish upcoming, live, ended and unknown", () => {
  const event = e("hour", "2026-10-07T18:00:00", "2026-10-07T19:00:00");
  assert.equal(
    rules.relativeTime(event, new Date("2026-10-07T17:30:00")),
    "Em 30 min",
  );
  assert.equal(
    rules.relativeTime(event, new Date("2026-10-07T18:30:00")),
    "Acontecendo",
  );
  assert.equal(
    rules.relativeTime(event, new Date("2026-10-07T19:00:00")),
    "Encerrado",
  );
  assert.equal(rules.relativeTime({}), "Horário não informado");
  assert.equal(
    rules.relativeTime(event, new Date("2026-10-06T15:00:00")),
    "Amanhã",
  );
  assert.equal(
    rules.relativeTime(event, new Date("2026-10-05T15:00:00")),
    "Em 2 dias",
  );
});
