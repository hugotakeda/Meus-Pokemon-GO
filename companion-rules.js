(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./pokemon-forms.js")
      : root.PokemonForms,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CompanionRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (forms) {
  "use strict";
  function matchesWish(w, p) {
    return (
      w.id === p.dexId &&
      forms.sameForm(w, p) &&
      (!w.shiny || p.canBeShiny === true) &&
      (!w.shadow || p.shadow === true) &&
      (!w.mega || /\bmega\b/i.test(p.name || ""))
    );
  }
  // IDs for Rocket leaders and research tasks stay the same when their rewards
  // rotate. Compare meaningful content as well as additions and removals.
  function signature(value) {
    if (Array.isArray(value)) return value.map(signature);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.keys(value)
          .filter((k) => !["image", "url", "link", "id"].includes(k))
          .sort()
          .map((k) => [k, signature(value[k])]),
      );
    return value;
  }
  function rotationChanges(previous, current) {
    if (!previous || !current) return [];
    return ["events", "raids", "eggs", "research", "rocket"].flatMap((kind) => {
      if (
        current.sources[kind]?.status !== "network" ||
        !["network", "cache"].includes(previous.sources[kind]?.status)
      )
        return [];
      const before = new Map(
        (previous[kind] || []).map((p) => [p.id, JSON.stringify(signature(p))]),
      );
      const after = new Map(
        (current[kind] || []).map((p) => [p.id, JSON.stringify(signature(p))]),
      );
      const added = [...after.keys()].filter((id) => !before.has(id)).length;
      const removed = [...before.keys()].filter((id) => !after.has(id)).length;
      const updated = [...after].filter(
        ([id, value]) => before.has(id) && before.get(id) !== value,
      ).length;
      return added + removed + updated
        ? [{ kind, added, removed, updated }]
        : [];
    });
  }
  return { matchesWish, rotationChanges };
});
