/* Alolan forms: species IDs remain National Pokédex numbers; sprite IDs are
 * Pokémon varieties from https://pokeapi.co/api/v2/pokemon?limit=10000.
 * GO base stats [attack, defense, stamina]:
 * https://pogoapi.net/api/v1/pokemon_stats.json (form=Alola).
 * Catalog verified 2026-10-07. Totem variants are not Pokémon GO forms.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PokemonForms = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const rows = [
    [19, "rattata", 10091, [103, 70, 102], 20],
    [20, "raticate", 10092, [135, 154, 181]],
    [26, "raichu", 10100, [201, 154, 155]],
    [27, "sandshrew", 10101, [125, 129, 137], 28],
    [28, "sandslash", 10102, [177, 195, 181]],
    [37, "vulpix", 10103, [96, 109, 116], 38],
    [38, "ninetales", 10104, [170, 193, 177]],
    [50, "diglett", 10105, [108, 81, 67], 51],
    [51, "dugtrio", 10106, [201, 142, 111]],
    [52, "meowth", 10107, [99, 78, 120], 53],
    [53, "persian", 10108, [158, 136, 163]],
    [74, "geodude", 10109, [132, 132, 120], 75],
    [75, "graveler", 10110, [164, 164, 146], 76],
    [76, "golem", 10111, [211, 198, 190]],
    [88, "grimer", 10112, [135, 90, 190], 89],
    [89, "muk", 10113, [190, 172, 233]],
    [103, "exeggutor", 10114, [230, 153, 216]],
    [105, "marowak", 10115, [144, 186, 155]],
  ];
  const catalog = Object.freeze(
    rows.map(([id, name, spriteId, stats, next]) =>
      Object.freeze({
        id,
        name,
        form: "alola",
        spriteId,
        pokeapiName: name + "-alola",
        label: name[0].toUpperCase() + name.slice(1) + " de Alola",
        stats: Object.freeze(stats),
        next: next || null,
      }),
    ),
  );
  const byId = new Map(catalog.map((p) => [p.id, p])),
    bySprite = new Map(catalog.map((p) => [p.spriteId, p]));
  const key = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[()_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  function get(id, form = "alola") {
    return form === "alola" ? byId.get(Number(id)) || null : null;
  }
  function resolve(name) {
    const input = key(name);
    return (
      catalog.find((p) =>
        [
          p.pokeapiName.replace("-", " "),
          "alolan " + p.name,
          p.name + " alolan",
          p.name + " de alola",
          p.name + " da regiao de alola",
          p.name + " forma de alola",
          String(p.id) + " alola",
        ].includes(input),
      ) || null
    );
  }
  function forEntry(entry) {
    if (!entry) return null;
    const id = Number(entry.dexId ?? entry.id);
    const fromSprite = bySprite.get(id);
    if (fromSprite) return fromSprite;
    if (entry.form === "normal") return null;
    if (["alola", "alolan"].includes(key(entry.form)) || entry.alola === true)
      return get(id);
    const named = resolve(entry.name);
    return named && (!id || named.id === id) ? named : null;
  }
  function label(entry) {
    const p = forEntry(entry);
    return p ? p.label : entry.name;
  }
  function evolutionNames(entry) {
    const p = forEntry(entry);
    return p ? (p.next ? [get(p.next).pokeapiName] : []) : null;
  }
  function sameForm(a, b) {
    const formKey = (e) => {
      const p = forEntry(e);
      if (p) return "alola";
      const n = key(e?.name);
      if (/\b(?:galarian|galar|hisuian|hisui|paldean|paldea)\b/.test(n))
        return n;
      return "normal";
    };
    return formKey(a) === formKey(b);
  }
  return Object.freeze({
    catalog,
    get,
    resolve,
    forEntry,
    label,
    evolutionNames,
    sameForm,
  });
});
