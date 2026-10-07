"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const rules = require("../calendar-rules.js");
const trainer = require("../trainer.js");

// A deliberately small DOM harness for calendar integration. It does not test
// layout, browser dialog focus trapping, or native download behavior.
function calendarHarness() {
  const downloads = [],
    savedEvents = [],
    exportedEvents = [];
  const saved = new Map();
  let document;
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attributes = {};
      this.className = "";
      this._text = "";
      this.open = false;
      this.listeners = {};
      this.classList = {
        contains: (name) => this.className.split(/\s+/).includes(name),
        add: (name) => {
          if (!this.classList.contains(name)) this.className += " " + name;
        },
        remove: (name) => {
          this.className = this.className
            .split(/\s+/)
            .filter((n) => n !== name)
            .join(" ");
        },
        toggle: (name, force) => {
          const enabled =
            force === undefined ? !this.classList.contains(name) : force;
          this.classList[enabled ? "add" : "remove"](name);
          return enabled;
        },
      };
    }
    get textContent() {
      return (
        this._text + this.children.map((child) => child.textContent).join("")
      );
    }
    set textContent(value) {
      this._text = String(value);
      this.replaceChildren();
    }
    get isConnected() {
      return this === document.body || Boolean(this.parentNode?.isConnected);
    }
    append(...nodes) {
      nodes.forEach((node) => {
        this.children.push(node);
        node.parentNode = this;
      });
    }
    replaceChildren(...nodes) {
      this.children.forEach((node) => {
        node.parentNode = null;
      });
      this.children = [];
      this.append(...nodes);
    }
    setAttribute(key, value) {
      this.attributes[key] = String(value);
    }
    getAttribute(key) {
      return this.attributes[key] ?? null;
    }
    addEventListener(type, callback) {
      (this.listeners[type] ||= []).push(callback);
    }
    matches(selector) {
      if (selector.startsWith("."))
        return this.classList.contains(selector.slice(1));
      if (selector.startsWith("#")) return this.id === selector.slice(1);
      const attr = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
      if (attr) {
        const value = attr[1].startsWith("data-")
          ? this.dataset[
              attr[1]
                .slice(5)
                .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
            ]
          : this.getAttribute(attr[1]);
        return value != null && (attr[2] === undefined || value === attr[2]);
      }
      return this.tagName.toLowerCase() === selector.toLowerCase();
    }
    querySelectorAll(selector) {
      const results = [],
        selectors = selector.split(",").map((s) => s.trim());
      const visit = (node) =>
        node.children.forEach((child) => {
          if (selectors.some((s) => child.matches(s))) results.push(child);
          visit(child);
        });
      visit(this);
      return results;
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
    closest(selector) {
      return this.matches(selector)
        ? this
        : this.parentNode?.closest(selector) || null;
    }
    contains(node) {
      return (
        node === this || this.children.some((child) => child.contains(node))
      );
    }
    focus() {
      document.activeElement = this;
    }
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
      (this.listeners.close || []).forEach((callback) =>
        callback({ target: this }),
      );
    }
    click() {
      this.onclick?.({
        target: this,
        currentTarget: this,
        preventDefault() {},
      });
    }
    remove() {
      if (this.parentNode)
        this.parentNode.children = this.parentNode.children.filter(
          (node) => node !== this,
        );
      this.parentNode = null;
    }
  }
  document = {
    createElement: (tag) => new Element(tag),
    body: new Element("body"),
    activeElement: null,
    addEventListener() {},
  };
  const host = new Element("div");
  document.body.append(host);
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [2026, 9, 7, 12]));
    }
    static now() {
      return new FixedDate().getTime();
    }
  }
  const TrainerCompanion = {
    normalizeEvent: trainer.normalizeEvent,
    isSaved: (id) => saved.has(id),
    snapshot: () => ({ reminders: [...saved.values()] }),
    toggleReminder: (event) => {
      savedEvents.push(event);
      if (saved.has(event.id)) {
        saved.delete(event.id);
        return false;
      }
      saved.set(event.id, event);
      return true;
    },
    makeCalendar: (events) => {
      exportedEvents.push(...events);
      return trainer.makeCalendar(events);
    },
  };
  const BrazilEventScope = {
    classify: () => ({ eligible: true, scope: "global", label: "Global" }),
    filter: (events) => events,
  };
  const context = {
    window: { PogoCalendarRules: rules, BrazilEventScope },
    document,
    TrainerCompanion,
    BrazilEventScope,
    CompanionData: { safeURL: (value) => value, eventStatus: () => "upcoming" },
    Date: FixedDate,
    Set,
    Blob,
    URL: {
      createObjectURL: (blob) => {
        downloads.push(blob);
        return "blob:calendar-test";
      },
      revokeObjectURL() {},
    },
    setTimeout: (callback) => {
      callback();
      return 1;
    },
  };
  vm.runInNewContext(
    fs.readFileSync(require.resolve("../event-calendar.js"), "utf8"),
    context,
  );
  const calendar = context.window.EventCalendar.create(host);
  return { calendar, host, document, savedEvents, exportedEvents, downloads };
}

function event(overrides = {}) {
  return {
    id: "test-event",
    name: "Evento original",
    type: "event",
    timeZone: "absolute",
    start: "2026-10-28T12:00:00Z",
    end: "2026-10-28T18:00:00Z",
    pokemon: [],
    bonuses: [],
    url: "https://leekduck.com/events/test-event/",
    ...overrides,
  };
}

test("events with a known start and pending end remain visible among unconfirmed dates", () => {
  const app = calendarHarness();
  app.calendar.update([
    event({ end: null, name: "Término ainda não anunciado" }),
  ]);
  const unconfirmed = app.host.querySelector(".cal-unconfirmed");
  assert.ok(
    unconfirmed,
    "partial dates must not disappear from both the month and the unconfirmed list",
  );
  assert.match(unconfirmed.textContent, /Término ainda não anunciado/);
  assert.equal(
    unconfirmed.querySelector(".cal-card").dataset.eventId,
    "test-event",
  );
});

test("refreshing an open dialog updates its displayed schedule and save action", () => {
  const app = calendarHarness();
  app.calendar.update([event()]);
  app.host.querySelector(".cal-card").click();
  const dialog = app.document.body.querySelector(".cal-dialog");
  const oldTime = dialog.querySelector(".cal-dialog-time").textContent;
  const updated = event({
    name: "Evento atualizado",
    start: "2026-10-29T12:00:00Z",
    end: "2026-10-29T18:00:00Z",
  });
  app.calendar.update([updated]);
  assert.equal(dialog.open, true);
  assert.notEqual(
    dialog.querySelector(".cal-dialog-time").textContent,
    oldTime,
  );
  assert.match(dialog.querySelector(".cal-dialog-time").textContent, /29/);
  assert.equal(
    dialog.querySelector("#cal-dialog-title").textContent,
    updated.name,
  );
  dialog.querySelector(".cal-save").click();
  assert.equal(app.savedEvents.at(-1).start, updated.start);
  assert.equal(app.savedEvents.at(-1).end, updated.end);
});

test("export from an open dialog uses the refreshed event dates", async () => {
  const app = calendarHarness();
  app.calendar.update([event()]);
  app.host.querySelector(".cal-card").click();
  const updated = event({
    start: "2026-10-29T12:00:00Z",
    end: "2026-10-29T18:00:00Z",
  });
  app.calendar.update([updated]);
  const dialog = app.document.body.querySelector(".cal-dialog");
  const exportButton = dialog
    .querySelectorAll("button")
    .find((button) => button.textContent.includes("Exportar .ics"));
  assert.ok(exportButton, "a valid event can be exported from its details");
  exportButton.click();
  assert.equal(app.exportedEvents.at(-1).start, updated.start);
  assert.equal(app.downloads.length, 1);
  assert.equal(app.downloads[0].type, "text/calendar;charset=utf-8");
  const ics = await app.downloads[0].text();
  assert.match(ics, /DTSTART:20261029T120000Z/);
  assert.match(ics, /DTEND:20261029T180000Z/);
  assert.doesNotMatch(ics, /DTSTART:20261028T120000Z/);
});
