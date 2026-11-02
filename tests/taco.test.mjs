import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TACO,filterFoods} from '../assets/js/food-catalog.js';
import {tacoCalories} from '../assets/js/taco-calories.js';
import {sugerirKcal} from '../assets/js/calorias.js';
test('catálogo oficial completo e categorias preservadas',()=>{
 assert.equal(TACO.length,597);
 assert.equal(new Set(TACO.map(f=>f.numero)).size,597);
 assert.equal(TACO[0].nome,'Arroz, integral, cozido');
 assert.equal(TACO.at(-1).nome,'Noz, crua');
 assert.ok(TACO.every(f=>f.categoria&&!f.categoria.includes('Número')&&f.unidade==='g'&&f.quantidade_padrao===100));
 assert.equal(tacoCalories.length,597);
 for(const f of TACO){
  assert.deepEqual(tacoCalories[f.numero-1],[f.nome,f.kcal]);
  assert.equal(sugerirKcal(f.nome,100,'ml'),null);
  const suggestion=sugerirKcal(f.nome,100,'g');
  if(typeof f.kcal==='number')assert.equal(suggestion.kcal,Math.round(f.kcal));
  else assert.equal(suggestion,null);
 }
});
test('busca por termos e categoria, incluindo acentos',()=>{
 assert.ok(filterFoods('arroz integral').length>=2);
 assert.ok(filterFoods('maca').some(f=>f.nome.includes('Maçã')));
 assert.equal(filterFoods('arroz','Frutas e derivados').length,0);
 assert.equal(filterFoods('zzzinexistente').length,0);
});
