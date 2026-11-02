import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TACO,filterFoods,foodLabel} from '../assets/js/food-catalog.js';
import {tacoCalories} from '../assets/js/taco-calories.js';
import {sugerirKcal} from '../assets/js/calorias.js';
import {tacoIndex,gramas,optionNutrients,mealNutrients,planNutrients,nutrientText} from '../assets/js/nutrientes.js';
const index=tacoIndex(TACO);
const ovo={descricao:'Ovo, de galinha, inteiro, cru',quantidade:3,unidade:'unidade',peso_unidade:50};
const arroz={descricao:'Arroz branco, tipo 1, cozido',quantidade:100,unidade:'g'};
test('nutrientes de cada alimento vêm da TACO pelo peso em gramas',()=>{
 assert.equal(gramas(ovo),150);
 assert.equal(gramas({quantidade:2,unidade:'fatia'}),null,'sem peso não chuta');
 assert.equal(gramas({quantidade:1,unidade:'a gosto',peso_unidade:50}),null);
 const n=optionNutrients(ovo,index);
 assert.equal(Math.round(n.proteina*100)/100,19.55);
 assert.equal(Math.round(n.lipideos*100)/100,13.35);
 assert.equal(n.fibra,0,'NA na TACO vale zero');
 assert.equal(n.vitamina_c,null,'campo vazio na TACO é sem dado, não zero');
 assert.equal(Math.round(optionNutrients(arroz,index).carboidratos*10)/10,28.1,'nome de tela usa o valor oficial');
 assert.equal(optionNutrients({descricao:'Vitamina da casa',quantidade:100,unidade:'g'},index),null);
});
test('totais seguem a regra das calorias e avisam quando falta dado',()=>{
 const frango={descricao:'Frango, peito, sem pele, grelhado',quantidade:100,unidade:'g'};
 const escolher={regra:'escolher_1',opcoes:[ovo,frango]},todos={regra:'todos',opcoes:[arroz,ovo]},vontade={regra:'a_vontade',opcoes:[arroz]};
 const pOvo=optionNutrients(ovo,index).proteina,pFrango=optionNutrients(frango,index).proteina,pArroz=optionNutrients(arroz,index).proteina;
 const e=mealNutrients({grupos:[escolher]},index).proteina;
 assert.deepEqual([e.min,e.max,e.missing],[Math.min(pOvo,pFrango),Math.max(pOvo,pFrango),0],'escolher vira faixa');
 assert.equal(mealNutrients({grupos:[todos]},index).proteina.min,pArroz+pOvo,'todos soma');
 assert.equal(mealNutrients({grupos:[vontade]},index).proteina.max,0,'à vontade não conta');
 const parcial=mealNutrients({grupos:[{regra:'todos',opcoes:[arroz,{descricao:'Vitamina da casa',quantidade:1,unidade:'g'}]}]},index).proteina;
 assert.deepEqual([parcial.min,parcial.missing],[pArroz,1],'o que falta é contado, não vira zero escondido');
 const dia=planNutrients({refeicoes:[{grupos:[todos]},{grupos:[todos]}]},index).proteina;
 assert.equal(dia.min,(pArroz+pOvo)*2);
 assert.equal(nutrientText({min:19.55,max:19.55},'g'),'20 g');
 assert.equal(nutrientText({min:2.54,max:32},'g'),'2,5–32 g');
});
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
test('arroz branco acha os tipos 1 e 2 sem mudar o nome oficial da TACO',()=>{
 assert.deepEqual(filterFoods('arroz branco').map(f=>f.nome),['Arroz, tipo 1, cozido','Arroz, tipo 1, cru','Arroz, tipo 2, cozido','Arroz, tipo 2, cru']);
 assert.deepEqual(filterFoods('arroz branco cozido').map(f=>f.nome),['Arroz, tipo 1, cozido','Arroz, tipo 2, cozido']);
 assert.ok(!filterFoods('arroz branco').some(f=>f.nome.includes('integral')));
 assert.equal(foodLabel({nome:'Arroz, tipo 1, cozido'}),'Arroz branco, tipo 1, cozido');
 assert.equal(foodLabel({nome:'Arroz, integral, cozido'}),'Arroz, integral, cozido');
 assert.equal(sugerirKcal('Arroz branco, tipo 1, cozido',150,'g').kcal,192,'o nome de tela usa o valor oficial');
 assert.equal(sugerirKcal('Arroz, tipo 1, cozido',150,'g').kcal,192,'plano antigo continua calculando');
 assert.equal(sugerirKcal('Arroz branco',150,'g'),null,'sem tipo e preparo não presume');
 assert.equal(TACO.filter(f=>/branco/.test(f.nome)&&/Arroz/.test(f.nome)).length,0,'a tabela oficial continua igual');
 assert.ok(filterFoods('branco').some(f=>f.nome==='Repolho, branco, cru'),'outros brancos continuam aparecendo');
});
