import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TACO,FOODS,filterFoods} from '../assets/js/food-catalog.js';
import {SUPLEMENTOS} from '../assets/js/suplementos.js';
import {sugerirKcal,pesoReferencia,precisaPeso} from '../assets/js/calorias.js';
import {tacoIndex,optionNutrients,mealNutrients,MICROS} from '../assets/js/nutrientes.js';
const index=tacoIndex(FOODS);
const whey={descricao:'Whey protein, concentrado',quantidade:30,unidade:'g'};
test('suplementos ficam fora da tabela oficial e não colidem com ela',()=>{
 assert.equal(TACO.length,597);
 assert.equal(TACO.filter(f=>f.categoria==='Suplementos').length,0);
 assert.equal(FOODS.length,597+SUPLEMENTOS.length);
 assert.equal(new Set(FOODS.map(f=>f.numero)).size,FOODS.length,'o seletor acha pelo número');
 assert.equal(new Set(FOODS.map(f=>f.nome)).size,new Set(TACO.map(f=>f.nome)).size+SUPLEMENTOS.length);
 for(const f of SUPLEMENTOS){
  assert.ok(f.origem&&f.fonte!=='TACO',f.nome+' precisa dizer de onde veio');
  assert.ok(f.porcao_g>0&&f.medida_caseira,f.nome);
  assert.ok(typeof f.kcal==='number'&&f.kcal>=0&&f.kcal<=902,f.nome);
  const soma=f.proteina+f.carboidratos+f.lipideos;assert.ok(soma<=100.5,f.nome+' soma mais de 100 g em 100 g');
 }
});
test('busca acha pelo nome, por apelido e por categoria',()=>{
 assert.deepEqual(filterFoods('whey').map(f=>f.numero),[1001,1002,1003,1004]);
 assert.deepEqual(filterFoods('whey isolado').map(f=>f.nome),['Whey protein, isolado']);
 assert.equal(filterFoods('','Suplementos').length,SUPLEMENTOS.length);
 assert.equal(filterFoods('suplemento').length,SUPLEMENTOS.length);
 assert.deepEqual(filterFoods('creatina').map(f=>f.numero),[1014]);
 assert.deepEqual(filterFoods('omega').map(f=>f.numero),[1018]);
 assert.deepEqual(filterFoods('cafeina').map(f=>f.numero),[1020]);
 assert.ok(filterFoods('colageno').some(f=>f.numero===1009));
 assert.equal(filterFoods('arroz','Suplementos').length,0);
});
test('kcal diz que veio de rótulos, não da TACO',()=>{
 const s=sugerirKcal(whey.descricao,30,'g');
 assert.deepEqual([s.kcal,s.fonte,s.ref],[118,'média de rótulos','Whey protein, concentrado']);
 const naLista=sugerirKcal(whey.descricao,30,'g',SUPLEMENTOS);
 assert.deepEqual([naLista.kcal,naLista.fonte],[118,'média de rótulos'],'editor passa o banco e dá o mesmo valor');
 assert.equal(sugerirKcal('Creatina, monohidratada',3,'g').kcal,0,'zero é valor, não falta de dado');
 assert.equal(sugerirKcal('Arroz, tipo 1, cozido',150,'g').fonte,'TACO');
});
test('porção usa o peso de partida do suplemento, e alimento comum continua pedindo o peso',()=>{
 assert.equal(pesoReferencia(whey.descricao,'porção'),30);
 assert.equal(pesoReferencia(whey.descricao,'unidade'),null);
 assert.equal(pesoReferencia('Arroz, tipo 1, cozido','porção'),null);
 assert.equal(sugerirKcal(whey.descricao,1,'porção').kcal,118);
 assert.equal(sugerirKcal(whey.descricao,1,'porção',[],40).kcal,158,'peso informado vale mais que o de partida');
 assert.equal(sugerirKcal('Arroz, tipo 1, cozido',1,'porção'),null);
 assert.equal(precisaPeso(whey.descricao,'porção'),true,'mostra o campo de peso pra ajustar');
});
test('nutrientes entram na conta, e o que o rótulo não traz fica sem dado',()=>{
 const n=optionNutrients(whey,index);
 assert.equal(Math.round(n.proteina*100)/100,22.05);
 assert.equal(Math.round(n.lipideos*100)/100,2.43);
 assert.equal(n.magnesio,null,'sem dado, não zero');
 const h=optionNutrients({descricao:'Whey protein, hidrolisado',quantidade:30,unidade:'g'},index);
 assert.equal(Math.round(h.sodio*10)/10,93.5);
 assert.equal(h.calcio,null);
 const multi=optionNutrients({descricao:'Multivitamínico',quantidade:1,unidade:'g'},index);
 for(const [k] of MICROS)assert.equal(multi[k],null,k+' depende da marca');
 assert.equal(multi.proteina,0);
 const refeicao=mealNutrients({grupos:[{regra:'todos',opcoes:[whey,{descricao:'Frango, peito, sem pele, grelhado',quantidade:100,unidade:'g'}]}]},index);
 assert.ok(refeicao.proteina.min>50);assert.equal(refeicao.proteina.missing,0);assert.equal(refeicao.magnesio.missing,1);
});
