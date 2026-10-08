const test = require("node:test");
const assert = require("node:assert/strict");
const forms = require("../pokemon-forms.js");

test("all 18 Alolan GO forms keep species identity and distinct non-Totem artwork", () => {
  assert.equal(forms.catalog.length, 18);
  assert.equal(new Set(forms.catalog.map((p) => p.spriteId)).size, 18);
  for (const p of forms.catalog) {
    assert.ok(p.id < 1025 && p.spriteId > 10000);
    assert.equal(forms.resolve(p.label), p);
    assert.equal(forms.resolve(p.pokeapiName), p);
  }
  assert.equal(forms.get(76).spriteId, 10111);
  assert.equal(forms.get(20).spriteId, 10092);
  assert.equal(
    forms.forEntry({ id: 10093, name: "raticate-totem-alola" }),
    null,
  );
});

test("regional aliases accept Portuguese, English and source feed names without guessing from notes", () => {
  for (const name of [
    "Golem de Alola",
    "Alolan Golem",
    "Golem (Alolan)",
    "golem-alola",
    "76 Alola",
    "alola golem",
    "golem-alola-form",
    "Alolan-form-Golem",
    "76 alolan form",
    "Golem da região de Alola",
  ]) {
    assert.equal(forms.resolve(name).id, 76, name);
  }
  assert.equal(forms.resolve("Golem"), null);
  assert.equal(forms.resolve("Charizard de Alola"), null);
  assert.equal(
    forms.forEntry({ id: 76, name: "golem", note: "Capturado em Alola" }),
    null,
  );
  assert.equal(
    forms.forEntry({
      id: "raid-golem",
      dexId: 76,
      name: "golem",
      form: "alola",
    }).spriteId,
    10111,
  );
  assert.equal(
    forms.forEntry({ id: 76, name: "Alolan Golem", form: "normal" }),
    null,
  );
});

test("regional evolutions stay in Alola and terminal forms do not borrow a base-species chain", () => {
  assert.deepEqual(forms.evolutionNames({ id: 74, form: "alola" }), [
    "graveler-alola",
  ]);
  assert.deepEqual(forms.evolutionNames({ id: 75, form: "alola" }), [
    "golem-alola",
  ]);
  assert.deepEqual(forms.evolutionNames({ id: 76, form: "alola" }), []);
  assert.equal(forms.evolutionNames({ id: 74, form: "normal" }), null);
  assert.deepEqual(forms.get(20).stats, [135, 154, 181]);
});
