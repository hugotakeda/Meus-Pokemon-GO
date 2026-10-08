const test = require('node:test');
const assert = require('node:assert/strict');
const { weaknesses, evolutionPaths } = require('../pokedex.js');
const type = (double=[], half=[], no=[]) => ({damage_relations:{double_damage_from:double.map(name=>({name})),half_damage_from:half.map(name=>({name})),no_damage_from:no.map(name=>({name}))}});
test('dual types combine weaknesses, resistances and immunities in both game systems', () => {
  const types=[type(['ice','rock'],['fire'],['ground']),type(['ice','fire'],['rock'])];
  assert.deepEqual(weaknesses(types,false), [['ice',4]]);
  const go=weaknesses(types,true);
  assert.equal(go.length,1);
  assert.ok(Math.abs(go[0][1]-2.56)<1e-10);
  assert.deepEqual(weaknesses([type(['ground']),type([],[],['ground'])],false),[]);
  assert.deepEqual(weaknesses([type(['ground']),type([],[],['ground'])],true),[]);
});
test('branched evolution chains retain ancestors on every path', () => {
  const leaf=name=>({species:{name},evolves_to:[]});
  assert.deepEqual(evolutionPaths({species:{name:'eevee'},evolves_to:[leaf('vaporeon'),leaf('jolteon')]}),[['eevee','vaporeon'],['eevee','jolteon']]);
  assert.deepEqual(evolutionPaths(leaf('ditto')),[['ditto']]);
});

const go = require('../pokemon-go-dex.json').pokemon;
test('GO dex uses real GO stats and form-specific evolution branches', () => {
  assert.deepEqual(go.elgyem.stats,{baseStamina:146,baseAttack:148,baseDefense:100});
  assert.equal(go.elgyem.evolutions[0].candy,50);
  assert.equal(go['raichu-alola'].stats.baseAttack,201);
  assert.deepEqual(go['raichu-alola'].types,['electric','psychic']);
  assert.equal(go['rattata-alola'].evolutions[0].form,'RATICATE_ALOLA');
});
