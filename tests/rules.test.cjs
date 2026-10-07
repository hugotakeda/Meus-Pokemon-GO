const test = require("node:test"),
  assert = require("node:assert/strict");
const { matchesWish, rotationChanges } = require("../companion-rules.js");
const snapshot = (rocket, status = "network") => ({
  rocket,
  sources: { rocket: { status } },
});
test("rotation alerts detect changed Rocket encounters even with stable leader IDs", () => {
  const before = snapshot([
    { id: "arlo", name: "Arlo", slots: [[{ name: "Bagon" }], [], []] },
  ]);
  const after = snapshot([
    { id: "arlo", name: "Arlo", slots: [[{ name: "Charmander" }], [], []] },
  ]);
  assert.deepEqual(rotationChanges(before, after), [
    { kind: "rocket", added: 0, removed: 0, updated: 1 },
  ]);
});
test("rotation alerts detect removals but ignore failed feeds and cosmetic image changes", () => {
  assert.equal(
    rotationChanges(snapshot([{ id: "arlo" }]), snapshot([]))[0].removed,
    1,
  );
  assert.deepEqual(
    rotationChanges(snapshot([{ id: "arlo" }]), snapshot([], "error")),
    [],
  );
  assert.deepEqual(
    rotationChanges(snapshot([], "error"), snapshot([{ id: "arlo" }])),
    [],
  );
  assert.deepEqual(
    rotationChanges(
      snapshot([{ id: "arlo", image: "old" }]),
      snapshot([{ id: "arlo", image: "new" }]),
    ),
    [],
  );
});
test("radar respects shiny, shadow and Mega constraints", () => {
  const p = { dexId: 6, name: "Charizard", canBeShiny: true };
  assert.equal(matchesWish({ id: 6, shiny: true }, p), true);
  assert.equal(matchesWish({ id: 6, shadow: true }, p), false);
  assert.equal(matchesWish({ id: 6, mega: true }, p), false);
  assert.equal(
    matchesWish({ id: 6, mega: true }, { ...p, name: "Mega Charizard X" }),
    true,
  );
  assert.equal(
    matchesWish({ id: 6, shiny: true }, { ...p, canBeShiny: null }),
    false,
  );
});
