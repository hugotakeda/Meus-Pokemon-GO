const test = require("node:test");
const assert = require("node:assert/strict");
const trainer = require("../trainer.js");
const event = {
  id: "community-day",
  title: "Pokémon; amigos, raids\\trocas\nSegundo dia",
  start: "2026-10-10T14:00:00-03:00",
  end: "2026-10-10T17:00:00-03:00",
  url: "https://pokemongo.com/events",
};

test("trainer codes preserve leading zeroes and accept pasted separators only", () => {
  assert.equal(trainer.normalizeCode("0123 4567-8901"), "012345678901");
  assert.equal(trainer.validCode("0123 4567 8901"), true);
  assert.equal(trainer.formatCode("012345678901"), "0123 4567 8901");
  for (const invalid of [
    "",
    "12345678901",
    "1234567890123",
    "12345678901a",
    "1234.5678.9012",
    "<012345678901>",
  ])
    assert.equal(trainer.validCode(invalid), false);
});

test("calendar dates are converted to UTC and text cannot inject calendar properties", () => {
  const calendar = trainer.makeCalendar(
    [event],
    new Date("2026-10-06T12:00:00Z"),
  );
  assert.match(calendar, /DTSTART:20261010T170000Z\r\nDTEND:20261010T200000Z/);
  assert.match(
    calendar,
    /SUMMARY:Pokémon\\; amigos\\, raids\\\\trocas\\nSegundo dia/,
  );
  assert.match(calendar, /TRIGGER:-PT15M/);
  assert.match(calendar, /UID:community-day@meuspokemon.local/);
  const injection = trainer.makeCalendar([
    { ...event, title: "hello\r\nBEGIN:VEVENT" },
  ]);
  assert.equal((injection.match(/\r\nBEGIN:VEVENT/g) || []).length, 1);
});

test("calendar folding respects 75 octets and retains Unicode when unfolded", () => {
  const title = "Pokémon ✨ ".repeat(25);
  const calendar = trainer.makeCalendar([{ ...event, title }]);
  for (const line of calendar.split("\r\n"))
    assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  assert.ok(calendar.replace(/\r\n /g, "").includes("SUMMARY:" + title));
});

test("invalid dates, inverted ranges and unsafe source URLs are rejected", () => {
  assert.equal(trainer.normalizeEvent({ ...event, start: null }), null);
  assert.equal(trainer.normalizeEvent({ ...event, end: null }), null);
  assert.equal(trainer.normalizeEvent({ ...event, start: "garbage" }), null);
  assert.equal(trainer.normalizeEvent({ ...event, end: "2026-01-01" }), null);
  assert.equal(
    trainer.normalizeEvent({ ...event, url: "javascript:alert(1)" }).url,
    "",
  );
  assert.equal(
    trainer.normalizeEvent({ ...event, title: undefined, name: "Novo nome" })
      .title,
    "Novo nome",
  );
});

test("reminders become due 15 minutes before an event and never repeat or alert after it ended", () => {
  const clean = trainer.normalizeEvent(event);
  assert.equal(
    trainer.dueReminders([clean], Date.parse("2026-10-10T16:44:59Z")).length,
    0,
  );
  assert.equal(
    trainer.dueReminders([clean], Date.parse("2026-10-10T16:45:00Z")).length,
    1,
  );
  assert.equal(
    trainer.dueReminders([clean], Date.parse("2026-10-10T18:00:00Z")).length,
    1,
  );
  assert.equal(
    trainer.dueReminders([clean], Date.parse("2026-10-10T20:00:00Z")).length,
    0,
  );
  assert.equal(
    trainer.dueReminders(
      [{ ...clean, notifiedAt: "2026-10-10T16:45:00Z" }],
      Date.parse("2026-10-10T17:00:00Z"),
    ).length,
    0,
  );
});

test("locally vendored QR library creates a numeric QR including leading zeroes", () => {
  const qrcode = require("../vendor/qrcode.js");
  const qr = qrcode(0, "M");
  qr.addData("012345678901", "Numeric");
  qr.make();
  assert.equal(qr.getModuleCount(), 21);
  assert.match(
    qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true }),
    /<svg/,
  );
});

function isolatedTrainer(storage) {
  const vm = require("node:vm");
  const fs = require("node:fs");
  const context = {
    module: { exports: {} },
    localStorage: storage,
    TextEncoder,
    URL,
    Date,
  };
  vm.runInNewContext(
    fs.readFileSync(require.resolve("../trainer.js"), "utf8"),
    context,
  );
  return context.module.exports;
}

test("saved reminders persist and refresh their title, dates and notification eligibility", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
  };
  const local = isolatedTrainer(storage);
  const future = {
    ...event,
    start: "2099-10-10T14:00:00Z",
    end: "2099-10-10T17:00:00Z",
  };
  assert.equal(local.toggleReminder(future), true);
  assert.equal(local.isSaved(future.id), true);
  assert.equal(isolatedTrainer(storage).isSaved(future.id), true);
  local.refresh([
    {
      ...future,
      title: "Nova programação",
      start: "2099-10-11T14:00:00Z",
      end: "2099-10-11T17:00:00Z",
    },
  ]);
  const saved = JSON.parse(data.get("pgo-reminders"))[0];
  assert.equal(saved.title, "Nova programação");
  assert.equal(saved.start, "2099-10-11T14:00:00.000Z");
  assert.equal(saved.notifiedAt, null);
  assert.equal(local.toggleReminder(future), false);
  assert.equal(JSON.parse(data.get("pgo-reminders")).length, 0);
});

test("unavailable or malformed browser storage does not break session reminders", () => {
  const blocked = isolatedTrainer({
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  });
  const future = {
    ...event,
    start: "2099-10-10T14:00:00Z",
    end: "2099-10-10T17:00:00Z",
  };
  assert.equal(blocked.toggleReminder(future), true);
  assert.equal(blocked.isSaved(event.id), true);
  const malformed = isolatedTrainer({
    getItem: () => "{broken-json",
    setItem() {},
  });
  assert.equal(malformed.isSaved(event.id), false);
  assert.equal(malformed.toggleReminder(future), true);
});

test("trainer backups round-trip profile and reminders without importing notification permissions", () => {
  const data = new Map([["pgo-notifications", "false"]]);
  const storage = {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  const local = isolatedTrainer(storage);
  const input = {
    profile: { name: "Ash", code: "0123 4567 8901", team: "mystic" },
    reminders: [event],
    notificationsEnabled: true,
  };
  assert.equal(local.restore(input).ok, true);
  assert.equal(data.get("pgo-notifications"), "false");
  assert.equal(JSON.parse(data.get("pgo-profile")).code, "012345678901");
  assert.equal(local.snapshot().profile.name, "Ash");
  const copy = local.snapshot();
  copy.profile.name = "Changed";
  copy.reminders[0].title = "Changed";
  assert.equal(local.snapshot().profile.name, "Ash");
  assert.equal(local.snapshot().reminders[0].title, event.title);
  const reloaded = isolatedTrainer(storage);
  assert.equal(reloaded.snapshot().profile.name, "Ash");
  assert.equal(reloaded.isSaved(event.id), true);
});

test("invalid trainer backups leave all current data untouched", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  const local = isolatedTrainer(storage);
  assert.equal(
    local.restore({
      profile: { name: "Ash", code: "012345678901", team: "valor" },
      reminders: [event],
    }).ok,
    true,
  );
  const original = JSON.stringify(local.snapshot());
  const disk = JSON.stringify([...data]);
  const invalidInputs = [
    null,
    [],
    {},
    { profile: { code: "bad" }, reminders: [] },
    { profile: {}, reminders: [event, event] },
    { profile: {}, reminders: [event, { ...event, id: "second", end: null }] },
    { profile: {}, reminders: [{ ...event, url: "javascript:alert(1)" }] },
    { profile: {}, reminders: [{ ...event, notifiedAt: "invalid" }] },
  ];
  for (const invalid of invalidInputs) {
    assert.equal(local.restore(invalid).ok, false);
    assert.equal(JSON.stringify(local.snapshot()), original);
    assert.equal(JSON.stringify([...data]), disk);
  }
});

test("quota errors roll back disk changes and report a session-only restoration", () => {
  const oldProfile = JSON.stringify({
    name: "Antes",
    code: "111122223333",
    team: "none",
  });
  const data = new Map([
    ["pgo-profile", oldProfile],
    ["pgo-reminders", "[]"],
  ]);
  let failOnce = true;
  const storage = {
    getItem: (key) => data.get(key) || null,
    removeItem: (key) => data.delete(key),
    setItem(key, value) {
      if (key === "pgo-reminders" && failOnce) {
        failOnce = false;
        throw Error("QuotaExceededError");
      }
      data.set(key, value);
    },
  };
  const local = isolatedTrainer(storage);
  const result = local.restore({
    profile: { name: "Depois", code: "012345678901", team: "instinct" },
    reminders: [event],
  });
  assert.equal(result.ok, true);
  assert.equal(result.persisted, false);
  assert.equal(data.get("pgo-profile"), oldProfile);
  assert.equal(data.get("pgo-reminders"), "[]");
  assert.equal(local.snapshot().profile.name, "Depois");
  assert.equal(local.snapshot().reminders.length, 1);
});
