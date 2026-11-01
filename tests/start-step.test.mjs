import test from 'node:test';import assert from 'node:assert/strict';import {startStep} from '../assets/js/start-step.js';
const date='2026-10-31',ficha={concluida_em:date},plan={inicio_em:date,refeicoes:[{id:'b',nome:'Almoço',horario:'12:00'},{id:'a',nome:'Café',horario:'08:00'}]};
test('início orienta cada etapa sem mostrar refeições antes de começar',()=>{
 assert.equal(startStep(null,plan,[],date).kind,'ficha');assert.equal(startStep(ficha,null,[],date).kind,'waiting');assert.equal(startStep(ficha,{...plan,inicio_em:'2026-11-01'},[],date).kind,'scheduled');
 assert.equal(startStep(ficha,plan,[],date).meal.id,'a');assert.equal(startStep(ficha,plan,[{refeicao_id:'a'}],date).meal.id,'b');assert.equal(startStep(ficha,plan,[{refeicao_id:'a'},{refeicao_id:'b'}],date).kind,'done');assert.equal(startStep(ficha,{...plan,refeicoes:[]},[],date).kind,'waiting');assert.equal(plan.refeicoes[0].id,'b');
});
