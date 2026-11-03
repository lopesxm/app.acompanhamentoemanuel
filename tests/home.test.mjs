import test from 'node:test';import assert from 'node:assert/strict';
import {homeView,dayStatus,weighInState} from '../assets/js/home.js';
import {nextStepCard} from '../assets/js/next-step-card.js';
import {homeSociety} from '../assets/js/home-society.js';
import {homeRank} from '../assets/js/profile-level.js';
import {progressData,homeProgress} from '../assets/js/home-progress.js';
import {startStep} from '../assets/js/start-step.js';
const date='2026-11-03';
const meal=(id,nome,horario,kcal=null)=>({id,nome,horario,grupos:[{id:'g'+id,regra:'todos',opcoes:[{id:'o'+id,kcal}]}]});
const plan={inicio_em:'2026-10-01',refeicoes:[meal('b','Almoço','12:00',600),meal('a','Café','08:00',300),meal('c','Jantar','20:00',500)]};
const base={records:[],history:[],measures:[],date};
const view=(ficha,p,extra={})=>{const active=Boolean(p&&p.inicio_em<=date);return homeView({...base,step:startStep(ficha,p,extra.records||[],date),active,plan:active?p:null,...extra});};
const sent={concluida_em:'2026-10-30'};
test('onboarding mostra o caminho real e esconde o que depende de plano',()=>{
 for(const [ficha,p,atual] of [[null,null,'Sua ficha'],[sent,null,'Plano do Emanuel'],[sent,{...plan,inicio_em:'2026-11-10'},'Início do plano']]){
  const html=view(ficha,p);
  assert.match(html,new RegExp(`is-current" aria-current="step"><span>\\d</span><strong>${atual}`));
  for(const part of ['home-day','home-quick-grid','home-rank'])assert.ok(!html.includes(part),part+' não aparece no onboarding');
  assert.match(html,/home-unlocked/);assert.match(html,/id="start-guide"/);assert.match(html,/id="diario"/);
 }
 assert.ok(!view(null,null).includes('/app/ficha.html"><span class="home-quick-icon"'),'a ficha já é o botão principal');
 assert.match(view(sent,{...plan,inicio_em:'2026-11-10'}),/href="\/app\/plano.html"><span class="home-quick-icon"/,'plano agendado já dá pra consultar');
});
test('plano ativo segue a ordem combinada, com ou sem dados',()=>{
 const html=view(sent,plan),order=['next-step-card','home-day','home-quick','home-progress-grid','society-home','home-rank','start-guide'].map(x=>html.indexOf(x));
 assert.ok(order.every(i=>i>=0));assert.deepEqual(order,[...order].sort((a,b)=>a-b));
 assert.ok(!html.includes('home-journey'));
});
test('a Home não mostra o que o app ainda não tem',()=>{
 for(const html of [view(null,null),view(sent,plan),homeSociety({ativo:true,pedidos:3,conquistas:1})]){
  assert.doesNotMatch(html,/treino|hidrata|água|hábito|desafio/i);
  assert.doesNotMatch(html.replace(/→/g,''),/\p{Extended_Pictographic}/u,'sem emoji');
 }
});
test('Seu dia separa feita, pulada e pendente, e kcal só com o plano completo',()=>{
 const records=[{refeicao_id:'a',status:'comi',opcoes_escolhidas:['oa']},{refeicao_id:'b',status:'pulei',opcoes_escolhidas:[]}];
 const s=dayStatus(plan,records);
 assert.deepEqual([s.total,s.done,s.skipped,s.pending,s.next.id,s.meals[0].id],[3,1,1,1,'c','a']);
 assert.match(view(sent,plan,{records}),/300<\/strong> kcal de 1\.400/);
 const incompleto={...plan,refeicoes:[meal('a','Café','08:00',300),meal('b','Almoço','12:00')]};
 assert.ok(!view(sent,incompleto,{records}).includes('home-day-kcal'),'sem somar kcal que falta');
 assert.match(view(sent,plan,{records:[...records,{refeicao_id:'c',status:'comi'}]}),/Nada pendente hoje/);
});
test('pesagem segue a frequência combinada, e falha não vira cobrança',()=>{
 assert.equal(weighInState(null,7,date),null);
 assert.deepEqual(weighInState([],7,date),{due:true,text:'Primeiro registro'});
 assert.deepEqual(weighInState([{data:'2026-11-01'}],7,date),{due:false,text:'Há 2 dias'});
 assert.deepEqual(weighInState([{data:'2026-11-03'}],7,date),{due:false,text:'Registrado hoje'});
 assert.equal(weighInState([{data:'2026-10-27'}],7,date).due,true);
 assert.equal(weighInState([{data:'2026-10-27'}],14,date).due,false);
 assert.equal(weighInState([{data:'2026-11-09'}],7,date).due,true,'data futura não conta');
});
test('peso é neutro e o histórico só aparece quando existe',()=>{
 const rows=[['2026-10-01',80],['2026-10-10',81],['2026-10-20',80.5]].map(([data,peso])=>({data,peso}));
 const d=progressData(rows,[],date);
 assert.deepEqual(d.trend,[80,81,80.5]);assert.equal(d.sinceStart,.5);assert.equal(d.delta,-.5);
 assert.equal(progressData(rows.slice(0,2),[],date).sinceStart,null,'dois registros já são o comparativo do último');
 const html=homeProgress(rows,[],date);
 assert.match(html,/-0,5 kg em relação a 10\/10\/2026/);assert.match(html,/\+0,5 kg desde 01\/10\/2026/);
 assert.doesNotMatch(html,/parabéns|ótimo|melhor|pior|perdeu|ganhou/i);
 assert.doesNotMatch(homeProgress([],[],date),/weight-trend/);
 assert.match(homeProgress(null,[],date),/Peso indisponível agora/);
});
test('consistência compara semanas só com dado real',()=>{
 const history=['2026-10-26','2026-10-27','2026-11-02'].map(data=>({data,status:'comi'}));
 const d=progressData([],history,date,true);
 assert.deepEqual([d.thisWeek,d.lastWeek],[1,2]);
 assert.match(homeProgress([],history,date),/Semana passada/);
 assert.doesNotMatch(homeProgress([],[{data:'2026-11-02',status:'comi'}],date),/Semana passada/);
});
test('próximo passo mostra a etapa salva da ficha',()=>{
 const step=startStep(null,null,[],date);
 assert.doesNotMatch(nextStepCard(step,{fichaDone:0,fichaTotal:6}),/Etapa/);
 const html=nextStepCard(step,{fichaDone:3,fichaTotal:6});
 assert.match(html,/Etapa 4 de 6/);assert.match(html,/Continuar de onde parei/);
 assert.doesNotMatch(nextStepCard(startStep(sent,null,[],date),{fichaDone:5,fichaTotal:6}),/Etapa/);
 assert.match(nextStepCard(startStep(sent,{...plan,inicio_em:'2026-11-10'},[],date),{startDate:'10/11/2026'}),/Início do plano: 10\/11\/2026/);
});
test('Society só traz contagens reais e muda o convite se o perfil não está ativo',()=>{
 assert.doesNotMatch(homeSociety(),/society-chip/);
 assert.match(homeSociety({ativo:false}),/Ativar meu perfil/);
 assert.match(homeSociety({ativo:true}),/Entrar na Society/);
 const html=homeSociety({ativo:true,pedidos:1,conquistas:2});
 assert.match(html,/1 pedido pra te seguir/);assert.match(html,/2 conquistas pra postar/);
});
test('Grinder Ranks não aparece sem pontos do banco e se separa do ranking',()=>{
 for(const x of [undefined,null,'',-1,NaN])assert.equal(homeRank(x),'');
 const html=homeRank(1320,1);
 assert.match(html,/Grinder Prata/);assert.match(html,/1\.320/);assert.match(html,/Faltam 680 pts pra Ouro/);assert.match(html,/1 conquista pra postar/);assert.match(html,/progressão individual/);
 assert.equal((html.match(/<li/g)||[]).length,10,'as dez graduações');
 assert.match(homeRank(0),/Grinder Bronze/,'zero é real');
 assert.match(homeRank(70000),/Nível máximo alcançado/);
});
