import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,validatePlan,selectedOptions,escapeHTML,adherence} from '../assets/js/domain.js';
test('Mifflin e Harris revisada usam constantes e unidades esperadas',()=>{assert.deepEqual([calculate({peso:70,altura:175,idade:30,sexo:'masculino'}).tmb,calculate({peso:70,altura:175,idade:30,sexo:'feminino'}).tmb],[1649,1483]);assert.equal(calculate({peso:70,altura:175,idade:30,sexo:'masculino',formula:'harris'}).tmb,1696);assert.throws(()=>calculate({peso:70,altura:175,idade:12,sexo:'masculino'}));});
test('publicação exige refeições, grupos e quantidades',()=>{assert.throws(()=>validatePlan({refeicoes:[]}));assert.throws(()=>validatePlan({refeicoes:[{nome:'Almoço',horario:'12:00',grupos:[{nome:'Proteína',regra:'escolher_1',opcoes:[{descricao:'Frango',quantidade:0}]}]}]}));assert.doesNotThrow(()=>validatePlan({refeicoes:[{nome:'Almoço',horario:'12:00',grupos:[{nome:'Salada',regra:'a_vontade',opcoes:[{descricao:'Folhas'}]}]}]}));});
test('check inclui todos os obrigatórios e somente a opção escolhida',()=>{const m={grupos:[{id:'a',regra:'escolher_1',opcoes:[{id:'1'},{id:'2'}]},{id:'b',regra:'todos',opcoes:[{id:'3'},{id:'4'}]}]};assert.deepEqual(selectedOptions(m,{a:'2'}),['2','3','4']);});
test('conteúdo do cliente é escapado no HTML',()=>assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;'));
test('adesão considera ausências e refeições puladas',()=>{assert.equal(adherence([{status:'comi'},{status:'pulei'}],4,1),25);assert.equal(adherence([],0),null);});
