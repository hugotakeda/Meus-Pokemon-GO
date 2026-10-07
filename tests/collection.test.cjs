const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Run the real browser script without a network or third-party DOM dependency.
// The DOM double only implements the controls used by the collection workflows.
function createApp(saved = { have: [], want: [] }, options = {}) {
  class Element {
    constructor(tag = "div") {
      this.tagName = tag.toUpperCase();
      this.value = "";
      this.checked = false;
      this.textContent = "";
      this.dataset = {};
      this.children = [];
      this.selectors = new Map();
      this.listeners = new Map();
      this.attributes = new Map();
      this.classes = new Set();
      this.classList = {
        add: (...names) => names.forEach((name) => this.classes.add(name)),
        remove: (...names) =>
          names.forEach((name) => this.classes.delete(name)),
        contains: (name) => this.classes.has(name),
        toggle: (name, force) => {
          const on = force === undefined ? !this.classes.has(name) : force;
          on ? this.classes.add(name) : this.classes.delete(name);
          return on;
        },
      };
      this.style = { setProperty() {} };
    }
    set value(value) {
      this.inputValue = String(value);
    }
    get value() {
      return this.inputValue || "";
    }
    set innerHTML(html) {
      this.html = html;
      this.children = [];
      this.selectors.clear();
    }
    get innerHTML() {
      return this.html || "";
    }
    append(...children) {
      this.children.push(...children);
    }
    appendChild(child) {
      this.append(child);
      return child;
    }
    replaceChildren(...children) {
      this.children = children;
    }
    replaceWith() {}
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }
    removeAttribute(name) {
      this.attributes.delete(name);
    }
    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }
    dispatch(type) {
      const event = { type, target: this, preventDefault() {} };
      for (const listener of this.listeners.get(type) || []) listener(event);
      if (this["on" + type]) this["on" + type](event);
    }
    click() {
      this.dispatch("click");
    }
    focus() {}
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
    }
    querySelector(selector) {
      if (!this.selectors.has(selector)) {
        const element = new Element(selector === "input" ? "input" : "div");
        const flag = this.innerHTML.match(/data-f="([^"]+)"/);
        if (flag && selector === "input") element.dataset.f = flag[1];
        this.selectors.set(selector, element);
      }
      return this.selectors.get(selector);
    }
    querySelectorAll(selector) {
      if (selector === "input")
        return this.children.map((child) => child.querySelector("input"));
      if (selector === ".evo") return this.children;
      return [];
    }
  }
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const tabs = ["have", "want"].map((list) => {
    const element = new Element("button");
    element.dataset.t = list;
    return element;
  });
  const store = new Map([
    [
      "pgo",
      options.rawSaved === undefined ? JSON.stringify(saved) : options.rawSaved,
    ],
    [
      "pgo-dex",
      JSON.stringify({
        bulbasaur: 1,
        ivysaur: 2,
        charizard: 6,
        pikachu: 25,
        raichu: 26,
        magikarp: 129,
        rattata: 19,
        raticate: 20,
        vulpix: 37,
      }),
    ],
    [
      "pgo-evo",
      JSON.stringify({
        1: ["ivysaur"],
        2: ["venusaur"],
        6: [],
        25: ["raichu"],
        26: [],
        129: ["gyarados"],
        19: ["raticate"],
        20: [],
        37: ["ninetales"],
      }),
    ],
  ]);
  const downloads = [];
  const document = {
    getElementById: get,
    createElement: (tag) => new Element(tag),
    createTextNode: (text) => ({ textContent: text }),
    querySelectorAll(selector) {
      if (selector.endsWith(".tab")) return tabs;
      if (selector === "#eFlags input")
        return get("eFlags").querySelectorAll("input");
      return [];
    },
    querySelector(selector) {
      const flag = selector.match(/^#eFlags input\[data-f=([^\]]+)\]$/);
      if (flag)
        return get("eFlags")
          .querySelectorAll("input")
          .find((input) => input.dataset.f === flag[1]);
      return selector.startsWith("#") ? get(selector.slice(1)) : null;
    },
    addEventListener() {},
    dispatchEvent() {},
    documentElement: new Element(),
    body: new Element(),
  };
  const context = vm.createContext({
    document,
    localStorage: {
      getItem: (key) => {
        if (options.denyStorage) throw new Error("Storage access denied");
        return store.get(key) ?? null;
      },
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    fetch: async () => {
      throw new Error("Network deliberately disabled in collection tests");
    },
    Blob,
    URL: {
      createObjectURL(blob) {
        downloads.push(blob);
        return "blob:test-" + downloads.length;
      },
      revokeObjectURL() {},
    },
    console,
    structuredClone,
    setTimeout: (callback, delay) => {
      const timer = setTimeout(callback, delay);
      timer.unref();
      return timer;
    },
    clearTimeout,
    CustomEvent: class {
      constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
      }
    },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    addEventListener() {},
    dispatchEvent() {},
    confirm: () => options.confirm !== false,
    navigator: {},
    location: { hash: "" },
    TrainerCompanion: options.companion,
  });
  context.window = context;
  context.globalThis = context;
  const script = fs.readFileSync(
    path.join(__dirname, "..", "collection.js"),
    "utf8",
  );
  // Insert a test-only accessor inside the closure; application code is unchanged.
  const instrumented = script.replace(
    /\}\)\(\);\s*$/,
    "window.__collectionTestEval = code => eval(code);\n})();",
  );
  assert.notEqual(
    instrumented,
    script,
    "collection closure must remain accessible to the test harness",
  );
  vm.runInContext(instrumented, context, { filename: "collection.js" });
  const evaluate = (code) => context.__collectionTestEval(code);
  const json = (code) => JSON.parse(JSON.stringify(evaluate(code)));
  return { get, store, document, evaluate, json, downloads };
}

test("legacy Hundo entries receive perfect IVs in both existing lists", () => {
  const app = createApp({
    have: [
      { uid: 1, id: 25, name: "pikachu", hundo: true, cp: "", note: "antigo" },
    ],
    want: [{ uid: 2, id: 6, name: "charizard", hundo: true, cp: "" }],
  });
  assert.deepEqual(app.json("data.have[0].iv"), [15, 15, 15]);
  assert.deepEqual(app.json("data.want[0].iv"), [15, 15, 15]);
  assert.equal(app.evaluate("data.have[0].note"), "antigo");
});

test("CP multipliers preserve exact levels and the squared-average half-level rule", () => {
  const app = createApp();
  assert.equal(app.evaluate("cpm(1)"), 0.094);
  assert.equal(app.evaluate("cpm(40)"), 0.7903);
  assert.equal(app.evaluate("cpm(51)"), 0.8453);
  const expectedHalf = Math.sqrt((0.7903 ** 2 + 0.7953 ** 2) / 2);
  assert.ok(Math.abs(app.evaluate("cpm(40.5)") - expectedHalf) < 1e-12);
});

test("known perfect Charizard CP resolves level 40 and impossible CP is rejected", () => {
  const app = createApp();
  assert.deepEqual(app.json("calcLevel(statsOf(6), [15,15,15], 2889)"), {
    lo: 40,
    hi: 40,
    exact: true,
  });
  assert.equal(app.evaluate("calcLevel(statsOf(6), [15,15,15], 99999)"), null);
  assert.equal(
    app.evaluate("levelText({id:6,iv:[15,15,15],cp:2889,mega:true})"),
    "",
  );
});

test("minimum CP collisions return a level range, while nearby CP remains approximate", () => {
  const app = createApp();
  const low = app.json("calcLevel(statsOf(129), [0,0,0], 10)");
  assert.equal(low.exact, true);
  assert.equal(low.lo, 1);
  assert.ok(low.hi > low.lo);
  const near = app.json("calcLevel(statsOf(6), [15,15,15], 2890)");
  assert.equal(near.exact, false);
  assert.equal(near.lo, 40);
  assert.match(
    app.evaluate("fmtLv(calcLevel(statsOf(6), [15,15,15], 2890))"),
    /^~/,
  );
});

test("a slow stats response cannot overwrite the level for a newer input", async () => {
  const app = createApp();
  ["iA", "iD", "iS"].forEach((id) => {
    app.get(id).value = "15";
  });
  app.evaluate(
    "window.pendingStats = []; getStats = () => new Promise(resolve => pendingStats.push(resolve))",
  );
  app.get("cp").value = "500";
  const first = app.evaluate(
    "updateLv('lvRes',25,'cp',['iA','iD','iS'],false)",
  );
  app.get("cp").value = "2889";
  const second = app.evaluate(
    "updateLv('lvRes',6,'cp',['iA','iD','iS'],false)",
  );
  app.evaluate("pendingStats[1]([223,173,186])");
  await second;
  assert.equal(app.get("lvRes").textContent, "40");
  app.evaluate("pendingStats[0]([112,96,111])");
  await first;
  assert.equal(app.get("lvRes").textContent, "40");
});

test("IV input distinguishes omitted, incomplete, and valid zero-valued stats", () => {
  const app = createApp();
  assert.equal(app.evaluate("readIV('iA','iD','iS')"), null);
  app.get("iA").value = "0";
  assert.equal(app.evaluate("readIV('iA','iD','iS')"), false);
  app.get("iD").value = "0";
  app.get("iS").value = "15";
  assert.deepEqual(app.json("readIV('iA','iD','iS')"), [0, 0, 15]);
  app.get("iD").value = "not-a-number";
  assert.equal(app.evaluate("readIV('iA','iD','iS')"), false);
});

test("IV input rejects fractional and out-of-range values instead of silently changing them", () => {
  const app = createApp();
  app.get("iD").value = "15";
  app.get("iS").value = "15";
  for (const invalid of ["-1", "16", "14.5"]) {
    app.get("iA").value = invalid;
    assert.equal(app.evaluate("readIV('iA','iD','iS')"), false, invalid);
  }
});

test("Hundo controls synchronize perfect IVs and clear the tag after IV edits", () => {
  const app = createApp();
  app.get("hundo").checked = true;
  app.get("hundo").dispatch("change");
  assert.deepEqual(
    ["iA", "iD", "iS"].map((id) => Number(app.get(id).value)),
    [15, 15, 15],
  );
  // Real number inputs expose their value as a string.
  ["iA", "iD", "iS"].forEach((id) => {
    app.get(id).value = "15";
  });
  app.get("iD").value = "14";
  app.get("iD").dispatch("input");
  assert.equal(app.get("hundo").checked, false);
  app.get("iD").value = "15";
  app.get("iD").dispatch("input");
  assert.equal(app.get("hundo").checked, true);
  app.get("hundo").checked = false;
  app.get("hundo").dispatch("change");
  assert.deepEqual(
    ["iA", "iD", "iS"].map((id) => app.get(id).value),
    ["", "", ""],
  );
});

test("adding an incomplete IV record does not modify the collection", () => {
  const app = createApp();
  app.get("name").value = "pikachu";
  app.get("iA").value = "15";
  app.get("addHave").click();
  assert.equal(app.evaluate("data.have.length"), 0);
  assert.match(app.get("msg").textContent, /três IVs/);
});

test("invalid CP cannot be added and successful adds clear variant flags for the next Pokémon", () => {
  const app = createApp();
  app.get("name").value = "pikachu";
  for (const invalid of ["-50", "9", "50.5"]) {
    app.get("cp").value = invalid;
    app.get("addHave").click();
    assert.equal(app.evaluate("data.have.length"), 0, invalid);
  }
  app.get("cp").value = "500";
  app.get("hundo").checked = true;
  app.get("addHave").click();
  assert.deepEqual(app.json("data.have[0].iv"), [15, 15, 15]);
  assert.equal(app.get("hundo").checked, false);
  app.get("name").value = "charizard";
  app.get("addHave").click();
  assert.equal(app.evaluate("data.have[1].hundo"), false);
  assert.equal(app.evaluate("data.have[1].iv"), null);
});

test("catching a wanted Pokémon preserves identity, IVs, variants and notes", () => {
  const wanted = {
    uid: 42,
    id: 25,
    name: "pikachu",
    cp: "500",
    iv: [10, 11, 12],
    shiny: true,
    lucky: true,
    note: "Troca com amigo",
  };
  const app = createApp({ have: [], want: [wanted] });
  app.evaluate("tab = 'want'; render()");
  const card = app.get("grid").children[0];
  const catchButton = card
    .querySelector(".acts")
    .children.find((button) => button.textContent === "Peguei!");
  assert.ok(catchButton);
  catchButton.click();
  assert.equal(app.evaluate("data.want.length"), 0);
  const caught = app.json("data.have[0]");
  for (const [key, value] of Object.entries(wanted))
    assert.deepEqual(caught[key], value, key);
  const backup = JSON.parse(app.store.get("pgo"));
  assert.equal(backup.have[0].uid, 42);
  assert.equal(backup.want.length, 0);
});

test("evolving changes species and CP while retaining collection metadata", () => {
  const original = {
    uid: 73,
    id: 25,
    name: "pikachu",
    cp: "500",
    iv: [10, 11, 12],
    shiny: true,
    shadow: true,
    note: "Favorito",
  };
  const app = createApp({ have: [original], want: [] });
  app.evaluate("cur = data.have[0]");
  app.get("vName").value = "raichu";
  app.get("vCp").value = "1000";
  app.get("vOk").click();
  const evolved = app.json("data.have[0]");
  assert.equal(evolved.id, 26);
  assert.equal(evolved.name, "raichu");
  assert.equal(evolved.cp, "1000");
  assert.equal(evolved.evolvedFrom, "pikachu");
  for (const key of ["uid", "iv", "shiny", "shadow", "note"])
    assert.deepEqual(evolved[key], original[key], key);
  assert.equal(JSON.parse(app.store.get("pgo")).have[0].id, 26);
});

test("old backup format imports and applies Hundo migration", async () => {
  const app = createApp();
  const backup = {
    have: [
      {
        uid: 5,
        id: 6,
        name: "charizard",
        hundo: true,
        cp: "2889",
        note: "Backup original",
      },
    ],
    want: [],
  };
  await app
    .get("file")
    .onchange({
      target: { files: [{ text: async () => JSON.stringify(backup) }] },
    });
  assert.equal(app.evaluate("data.have[0].uid"), 5);
  assert.deepEqual(app.json("data.have[0].iv"), [15, 15, 15]);
  assert.equal(app.evaluate("levelText(data.have[0])"), "40");
  assert.equal(
    JSON.parse(app.store.get("pgo")).have[0].note,
    "Backup original",
  );
});

test("invalid backup rows cannot replace or persist over the existing collection", async () => {
  const original = {
    have: [{ uid: 6, id: 25, name: "pikachu", cp: "500", iv: [10, 10, 10] }],
    want: [],
  };
  const app = createApp(original);
  const before = app.json("data");
  const storedBefore = app.store.get("pgo");
  const invalidRows = [
    null,
    { id: 0, name: "invalid" },
    { id: 25, name: "pikachu", iv: [15, 15, 16] },
    { id: 25, name: "pikachu", cp: -20 },
  ];
  for (const invalid of invalidRows) {
    const backup = { have: [...original.have, invalid], want: [] };
    await app
      .get("file")
      .onchange({
        target: { files: [{ text: async () => JSON.stringify(backup) }] },
      });
    assert.deepEqual(app.json("data"), before);
    assert.equal(app.store.get("pgo"), storedBefore);
  }
});

test("corrupt saved data is preserved and exported verbatim while all additions are blocked", async () => {
  for (const raw of [
    "{broken json with valuable original data",
    JSON.stringify({ have: {}, want: [] }),
  ]) {
    const app = createApp(undefined, { rawSaved: raw });
    assert.equal(app.evaluate("recoveryRequired"), true);
    app.get("name").value = "pikachu";
    app.get("addHave").click();
    assert.equal(
      app.evaluate("Collection.addWanted({dexId:25,name:'Pikachu'})"),
      false,
    );
    app.evaluate("save()");
    assert.deepEqual(app.json("data"), { have: [], want: [] });
    assert.equal(app.store.get("pgo"), raw);
    app.get("exp").click();
    assert.equal(app.downloads.length, 1);
    assert.equal(await app.downloads[0].text(), raw);
  }
});

test("falsy JSON values in saved storage require recovery instead of becoming writable empty collections", () => {
  for (const raw of ["false", "0", '""', "null"]) {
    const app = createApp(undefined, { rawSaved: raw });
    const status = app.json("Collection.getStorageStatus()");
    assert.equal(status.blocked, true, raw);
    app.get("name").value = "pikachu";
    app.get("addHave").click();
    assert.equal(
      app.evaluate("Collection.addWanted({dexId:25,name:'Pikachu'})"),
      false,
      raw,
    );
    app.evaluate("save()");
    assert.deepEqual(app.json("data"), { have: [], want: [] });
    assert.equal(app.store.get("pgo"), raw);
  }
});

test("only a validated recovery import unlocks writes and subsequent additions retain imported entries", async () => {
  const raw = "{corrupt original";
  const app = createApp(undefined, { rawSaved: raw });
  const importBackup = (value) =>
    app
      .get("file")
      .onchange({
        target: { files: [{ text: async () => JSON.stringify(value) }] },
      });
  await importBackup({ have: [null], want: [] });
  assert.equal(app.evaluate("recoveryRequired"), true);
  assert.equal(app.store.get("pgo"), raw);
  await importBackup({
    have: [{ uid: 81, id: 6, name: "charizard", hundo: true, cp: "2889" }],
    want: [],
  });
  assert.equal(app.evaluate("recoveryRequired"), false);
  assert.deepEqual(app.json("data.have[0].iv"), [15, 15, 15]);
  app.get("name").value = "pikachu";
  app.get("addHave").click();
  const stored = JSON.parse(app.store.get("pgo"));
  assert.deepEqual(
    stored.have.map((entry) => entry.id),
    [6, 25],
  );
  assert.equal(stored.have[0].uid, 81);
});

test("cancelling recovery import keeps the original data and write guard intact", async () => {
  const raw = "{corrupt original";
  const app = createApp(undefined, { rawSaved: raw, confirm: false });
  await app
    .get("file")
    .onchange({
      target: {
        files: [{ text: async () => JSON.stringify({ have: [], want: [] }) }],
      },
    });
  assert.equal(app.evaluate("recoveryRequired"), true);
  assert.equal(app.store.get("pgo"), raw);
});

test("denied storage access starts conservatively and exporting does not create an empty backup", () => {
  const app = createApp(undefined, { denyStorage: true });
  const before = app.store.get("pgo");
  assert.equal(app.evaluate("recoveryRequired"), true);
  app.get("name").value = "25";
  app.get("addHave").click();
  app.get("exp").click();
  assert.equal(app.downloads.length, 0);
  assert.equal(app.store.get("pgo"), before);
});

test("version 2 export includes collection and companion data without changing stored collection shape", async () => {
  const snapshot = { version: 1, profile: { name: "Hugo" }, reminders: [] };
  const original = {
    have: [{ uid: 91, id: 25, name: "pikachu", cp: "500" }],
    want: [],
  };
  const app = createApp(original, { companion: { snapshot: () => snapshot } });
  const storedBefore = app.store.get("pgo");
  app.get("exp").click();
  const exported = JSON.parse(await app.downloads[0].text());
  assert.equal(exported.version, 2);
  assert.deepEqual(exported.companion, snapshot);
  assert.equal(exported.have[0].uid, 91);
  assert.deepEqual(exported.want, []);
  assert.equal(app.store.get("pgo"), storedBefore);
});

test("a rejected companion restore cannot release the recovery guard or overwrite collection data", async () => {
  const raw = "{corrupt original";
  let restoreCalls = 0;
  const app = createApp(undefined, {
    rawSaved: raw,
    companion: {
      restore: () => {
        restoreCalls++;
        return { ok: false, error: "Invalid profile" };
      },
    },
  });
  const backup = {
    version: 2,
    have: [],
    want: [],
    companion: { invalid: true },
  };
  await app
    .get("file")
    .onchange({
      target: { files: [{ text: async () => JSON.stringify(backup) }] },
    });
  assert.equal(restoreCalls, 1);
  assert.equal(app.evaluate("recoveryRequired"), true);
  assert.equal(app.store.get("pgo"), raw);
});

test("normalization repairs duplicate identities without merging distinct specimens", () => {
  const app = createApp({
    have: [{ uid: 7, id: 25, name: "pikachu", cp: "500", note: "Primeiro" }],
    want: [{ uid: 7, id: 25, name: "pikachu", cp: "", note: "Outro exemplar" }],
  });
  assert.notEqual(
    app.evaluate("data.have[0].uid"),
    app.evaluate("data.want[0].uid"),
  );
  assert.equal(app.evaluate("data.have[0].note"), "Primeiro");
  assert.equal(app.evaluate("data.want[0].note"), "Outro exemplar");
});

test("companion targets distinguish shiny and shadow goals while avoiding duplicates", () => {
  const app = createApp();
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:25,name:'Pikachu'})"),
    true,
  );
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:25,name:'Pikachu'})"),
    false,
  );
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:25,name:'Pikachu'},true)"),
    true,
  );
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:25,name:'Pikachu',shadow:true})"),
    true,
  );
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:0,name:'Invalid'})"),
    false,
  );
  assert.equal(app.evaluate("data.want.length"), 3);
  const goals = JSON.parse(app.store.get("pgo")).want;
  assert.equal(goals.filter((entry) => entry.shiny).length, 1);
  assert.equal(goals.filter((entry) => entry.shadow).length, 1);
});

test("Mega and normal wishes remain separate while duplicate Mega wishes are rejected", () => {
  const app = createApp();
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:6,name:'Charizard'})"),
    true,
  );
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:6,name:'Mega Charizard'})"),
    true,
  );
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:6,name:'MEGA Charizard'})"),
    false,
  );
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:6,name:'Charizard'})"),
    false,
  );
  assert.equal(
    app.evaluate("Collection.addWanted({dexId:6,name:'Mega Charizard'},true)"),
    true,
  );
  const wishes = JSON.parse(app.store.get("pgo")).want;
  assert.equal(wishes.length, 3);
  assert.equal(wishes.filter((entry) => entry.mega).length, 2);
  assert.equal(wishes.filter((entry) => entry.mega && entry.shiny).length, 1);
  assert.equal(wishes.filter((entry) => !entry.mega && !entry.shiny).length, 1);
});

test("the redesigned page retains each required collection control without duplicate IDs", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "collection.js"), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(
    new Set(ids).size,
    ids.length,
    "duplicate HTML IDs can route actions to the wrong control",
  );
  const required = new Set(
    [...script.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]),
  );
  for (const id of [
    "iA",
    "iD",
    "iS",
    "eA",
    "eD",
    "eS",
    "hundo",
    "shiny",
    "shadow",
    "purified",
    "lucky",
    "mega",
    "form",
    "formRow",
    "eForm",
    "eFormBox",
  ])
    required.add(id);
  for (const id of required)
    assert.ok(ids.includes(id), `missing collection control #${id}`);
  const tabTags = html.match(/<[^>]+class="[^"]*\btab\b[^>]*>/g) || [];
  assert.equal(
    tabTags.length,
    2,
    "only collection list switches should use the legacy .tab class",
  );
  assert.ok(tabTags.every((tag) => /data-t="(?:have|want)"/.test(tag)));
});

const ART =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";

test("Alolan form IDs point to the PokeAPI form artwork, normal and shiny", () => {
  const app = createApp();
  assert.deepEqual(app.json("artUrls({ id: 26, form: 'alola' })"), [
    ART + "10100.png",
  ]);
  assert.deepEqual(app.json("artUrls({ id: 26, form: 'alola', shiny: true })"), [
    ART + "shiny/10100.png",
    ART + "10100.png",
  ]);
  assert.deepEqual(app.json("artUrls({ id: 26 })"), [ART + "26.png"]);
  assert.deepEqual(app.json("artUrls({ id: 26, shiny: true })"), [
    ART + "shiny/26.png",
    ART + "26.png",
  ]);
  // A species without an Alolan form keeps its default artwork.
  assert.deepEqual(app.json("artUrls({ id: 25, form: 'alola' })"), [
    ART + "25.png",
  ]);
});

test("all 18 Alolan species resolve to distinct form IDs", () => {
  const app = createApp();
  const table = app.json("ALOLA");
  assert.equal(Object.keys(table).length, 18);
  assert.equal(new Set(Object.values(table)).size, 18);
  for (const [dex, form] of Object.entries(table)) {
    assert.ok(+dex >= 1 && +dex <= 1025);
    assert.ok(form >= 10091 && form <= 10115, `form ${form} for #${dex}`);
  }
});

test("Alolan card image falls back from shiny to normal Alola art, never to the base species", () => {
  const app = createApp();
  const img = app.evaluate(
    "pic({ id: 26, name: 'raichu', form: 'alola', shiny: true })",
  );
  assert.equal(img.src, ART + "shiny/10100.png");
  img.onerror();
  assert.equal(img.src, ART + "10100.png");
  img.onerror(); // nothing left to try: shows the placeholder without throwing
});

test("typed Alola names resolve to the species with the Alola form", () => {
  const app = createApp();
  for (const text of [
    "raichu-alola",
    "Raichu Alola",
    "alolan raichu",
    "Alolan-Raichu",
    "raichu de alola",
    "26 alola",
  ])
    assert.deepEqual(
      app.json(`resolve(${JSON.stringify(text)})`),
      { id: 26, name: "raichu", form: "alola" },
      text,
    );
  assert.deepEqual(app.json("resolve('raichu')"), { id: 26, name: "raichu" });
  // Species with no Alolan form cannot be resolved as one.
  assert.equal(app.evaluate("resolve('pikachu-alola')"), null);
  assert.equal(app.evaluate("resolve('alola')"), null);
});

test("adding with the Forma selector or a typed suffix stores form: alola and keeps the entry shape", () => {
  const app = createApp();
  app.get("name").value = "raichu";
  app.get("form").value = "alola";
  app.get("cp").value = "1500";
  app.get("shiny").checked = true;
  app.get("addHave").click();
  app.get("name").value = "vulpix-alola";
  app.get("addWant").click();
  const saved = JSON.parse(app.store.get("pgo"));
  assert.equal(saved.have[0].id, 26);
  assert.equal(saved.have[0].name, "raichu");
  assert.equal(saved.have[0].form, "alola");
  assert.equal(saved.have[0].shiny, true);
  assert.equal(saved.want[0].id, 37);
  assert.equal(saved.want[0].name, "vulpix");
  assert.equal(saved.want[0].form, "alola");
  // The selector resets for the next Pokémon.
  assert.equal(app.get("form").value, "");
});

test("normal entries never get a form, even if the selector was left on Alola for another species", () => {
  const app = createApp();
  app.get("name").value = "raichu";
  app.get("addHave").click();
  app.get("name").value = "pikachu";
  app.get("form").value = "alola"; // stale selector value
  app.get("addHave").click();
  const have = JSON.parse(app.store.get("pgo")).have;
  assert.equal(have.length, 2);
  assert.ok(!("form" in have[0]));
  assert.ok(!("form" in have[1]));
});

test("an Alola name for a species without that form is rejected with a clear message", () => {
  const app = createApp();
  app.get("name").value = "pikachu-alola";
  app.get("addHave").click();
  assert.equal(JSON.parse(app.store.get("pgo")).have.length, 0);
  assert.match(app.get("msg").textContent, /forma de Alola/);
});

test("the Forma row only appears for species that have an Alolan form", () => {
  const app = createApp();
  app.get("name").value = "raichu";
  app.get("name").dispatch("input");
  assert.equal(app.get("formRow").hidden, false);
  app.get("name").value = "pikachu";
  app.get("name").dispatch("input");
  assert.equal(app.get("formRow").hidden, true);
  assert.equal(app.get("form").value, "");
  app.get("name").value = "raichu-alola";
  app.get("name").dispatch("input");
  assert.equal(app.get("form").value, "alola");
  // Switching the selector back to Normal also removes the typed suffix.
  app.get("form").value = "";
  app.get("form").dispatch("change");
  assert.equal(app.get("name").value, "raichu");
});

test("form survives export, import and normalization, and invalid forms are dropped", () => {
  const app = createApp();
  const normalized = app.json(`normalizeCollection({
    have: [
      { uid: 1, id: 26, name: "raichu", form: "alola" },
      { uid: 2, id: 25, name: "pikachu", form: "alola" },
      { uid: 3, id: 26, name: "raichu", form: "galar" },
      { uid: 4, id: 26, name: "raichu" },
    ],
    want: [],
  })`);
  assert.equal(normalized.have[0].form, "alola");
  assert.ok(!("form" in normalized.have[1]), "Pikachu has no Alolan form");
  assert.ok(!("form" in normalized.have[2]), "unsupported forms are ignored");
  assert.ok(!("form" in normalized.have[3]));
});

test("old collections without a form field load unchanged", () => {
  const old = {
    have: [{ uid: 9, id: 26, name: "raichu", cp: "900", note: "", iv: null }],
    want: [],
  };
  const app = createApp(old);
  assert.ok(!("form" in app.json("data.have[0]")));
  assert.deepEqual(app.json("artUrls(data.have[0])"), [ART + "26.png"]);
});

test("editing can switch an entry between normal and Alola form", () => {
  const app = createApp({
    have: [{ uid: 5, id: 26, name: "raichu", cp: "900", note: "", iv: null }],
    want: [],
  });
  app.evaluate("openEdit(data.have[0])");
  assert.equal(app.get("eFormBox").hidden, false);
  assert.equal(app.get("eForm").value, "");
  app.get("eForm").value = "alola";
  app.get("eSave").click();
  assert.equal(JSON.parse(app.store.get("pgo")).have[0].form, "alola");
  app.evaluate("openEdit(data.have[0])");
  assert.equal(app.get("eForm").value, "alola");
  assert.match(app.get("eTitle").textContent, /Alola/);
  app.get("eForm").value = "";
  app.get("eSave").click();
  assert.ok(!("form" in JSON.parse(app.store.get("pgo")).have[0]));
});

test("editing hides the Forma field for species without an Alolan form", () => {
  const app = createApp({
    have: [{ uid: 6, id: 25, name: "pikachu", cp: "300", note: "", iv: null }],
    want: [],
  });
  app.evaluate("openEdit(data.have[0])");
  assert.equal(app.get("eFormBox").hidden, true);
  app.get("eForm").value = "alola"; // stale value must not be saved
  app.get("eSave").click();
  assert.ok(!("form" in JSON.parse(app.store.get("pgo")).have[0]));
});

test("evolving keeps the Alola form when the evolution has one", () => {
  const app = createApp({
    have: [
      { uid: 1, id: 19, name: "rattata", form: "alola", cp: "100", note: "", iv: null },
    ],
    want: [],
  });
  app.evaluate("cur = data.have[0]");
  app.get("vName").value = "raticate";
  app.get("vCp").value = "400";
  app.get("vOk").click();
  const evolved = JSON.parse(app.store.get("pgo")).have[0];
  assert.equal(evolved.id, 20);
  assert.equal(evolved.form, "alola");
});

test("evolving into a species without an Alolan form drops the form", () => {
  const app = createApp({
    have: [
      { uid: 1, id: 19, name: "rattata", form: "alola", cp: "100", note: "", iv: null },
    ],
    want: [],
  });
  app.evaluate("cur = data.have[0]");
  app.get("vName").value = "magikarp";
  app.get("vOk").click();
  assert.ok(!("form" in JSON.parse(app.store.get("pgo")).have[0]));
});

test("guide goals named Alolan become Alola wishes and stay separate from the normal form", () => {
  const app = createApp();
  assert.equal(
    app.evaluate(
      "window.Collection.addWanted({ dexId: 37, name: 'Alolan Vulpix' }, false)",
    ),
    true,
  );
  assert.equal(
    app.evaluate(
      "window.Collection.addWanted({ dexId: 37, name: 'Alolan Vulpix' }, false)",
    ),
    false,
    "the same Alola goal is not duplicated",
  );
  assert.equal(
    app.evaluate(
      "window.Collection.addWanted({ dexId: 37, name: 'Vulpix' }, false)",
    ),
    true,
    "the normal form is a different goal",
  );
  const want = JSON.parse(app.store.get("pgo")).want;
  assert.equal(want.length, 2);
  assert.equal(want[0].form, "alola");
  assert.equal(want[0].name, "vulpix");
  assert.equal(want[0].note, "Objetivo: Alolan Vulpix");
  assert.ok(!("form" in want[1]));
});

test("level lookups use the Alolan form's stats key instead of the base species", () => {
  const app = createApp();
  assert.equal(app.evaluate("formIdFor(26, 'alola')"), 10100);
  assert.equal(app.evaluate("formIdFor(26, '')"), 26);
  assert.equal(app.evaluate("formIdFor(25, 'alola')"), 25);
  assert.equal(app.evaluate("window.Collection.formId({ id: 38, form: 'alola' })"), 10104);
});

test("searching finds Alola entries by the word Alola", () => {
  const app = createApp();
  assert.ok(app.evaluate("searchName({ name: 'raichu', form: 'alola' })").includes("alola"));
  assert.ok(!app.evaluate("searchName({ name: 'raichu' })").includes("alola"));
});
