import {icon} from './visuals.js';
import {escapeHTML as e} from './domain.js';
import {planKcal,eatenKcal,fmtKcal} from './calorias.js';
import {nextStepCard} from './next-step-card.js';
import {homeProgress} from './home-progress.js';
import {homeSociety} from './home-society.js';
// Só o que existe no app entra na Home: refeições, peso, registros, Society e nível.
// Treino, água e hábitos não têm dados ainda (docs/EXPERIENCIA_MEMBRO.md), então não aparecem nem vazios.
const byTime=meals=>[...meals].sort((a,b)=>(a.horario||'').localeCompare(b.horario||''));
export function dayStatus(plan,records){
 const meals=byTime(plan?.refeicoes||[]),state=m=>records.find(r=>r.refeicao_id===m.id)?.status||'pending';
 const done=meals.filter(m=>state(m)==='comi').length,skipped=meals.filter(m=>state(m)==='pulei').length,pending=meals.length-done-skipped;
 return {meals,state,total:meals.length,done,skipped,pending,percent:meals.length?Math.round(done/meals.length*100):0,next:meals.find(m=>state(m)==='pending')||null};
}
const dayBadge=({total,done,pending})=>!pending?(done===total?'Concluído':'Registrado'):done?'Em andamento':'A começar';
const stateLabel={comi:'Feita',pulei:'Pulada',pending:'Pendente'};
function daySummary(plan,records){
 const s=dayStatus(plan,records),rows=records.filter(r=>s.meals.some(m=>m.id===r.refeicao_id));
 const kp=planKcal(plan),eaten=eatenKcal(plan,rows);
 const kcal=kp.complete&&eaten.complete?`<div class="home-day-kcal"><span><strong>${fmtKcal(eaten.kcal)}</strong> kcal de ${fmtKcal(kp.min)}${kp.min!==kp.max?'–'+fmtKcal(kp.max):''}</span><span class="week-bar"><i style="width:${Math.min(100,Math.round(eaten.kcal/kp.max*100))}%"></i></span></div>`:'';
 const ring=`<div class="home-ring" role="img" aria-label="${s.done} de ${s.total} refeições feitas"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28"/><circle class="home-ring-value" cx="32" cy="32" r="28" pathLength="100" style="--p:${s.percent}"/></svg><span><strong>${s.done}</strong><small>de ${s.total}</small></span></div>`;
 const list=`<ol class="home-day-meals">${s.meals.map(m=>{const st=s.state(m);return `<li><a class="is-${st}" href="#meal-${e(m.id)}"><span class="home-day-mark">${st==='comi'?icon('tick'):st==='pulei'?'–':''}</span><span class="home-day-name"><strong>${e(m.nome)}</strong><small>${e(m.horario||'')}</small></span><span class="home-day-state">${stateLabel[st]}</span></a></li>`;}).join('')}</ol>`;
 return `<section class="card home-day" aria-labelledby="home-day-title"><header class="home-card-head"><h2 id="home-day-title">Seu dia</h2><span class="home-badge">${dayBadge(s)}</span></header><div class="home-day-main">${ring}<div class="home-day-copy"><strong>${s.pending?`${s.pending} ${s.pending===1?'refeição pendente':'refeições pendentes'}`:'Nada pendente hoje'}</strong><small>${s.done} ${s.done===1?'feita':'feitas'}${s.skipped?` · ${s.skipped} ${s.skipped===1?'pulada':'puladas'}`:''}</small>${kcal}</div></div>${list}</section>`;
}
// A frequência de pesagem é a combinada no cadastro, a mesma que a tela Registrar mostra.
export function weighInState(measures,frequency,date){
 if(measures===null)return null;
 const dates=(measures||[]).map(m=>m.data).filter(d=>d<=date).sort();
 if(!dates.length)return {due:true,text:'Primeiro registro'};
 const since=Math.round((new Date(date+'T12:00:00Z')-new Date(dates.at(-1)+'T12:00:00Z'))/864e5);
 return since>=(frequency||7)?{due:true,text:'Tá na hora'}:{due:false,text:since?`Há ${since} ${since===1?'dia':'dias'}`:'Registrado hoje'};
}
function quickRecords(plan,records,measures,frequency,date){
 const next=dayStatus(plan,records).next,weigh=weighInState(measures,frequency,date);
 const tile=(href,glyph,label,sub,due=false)=>`<a class="home-quick-tile" href="${href}"><span class="home-quick-icon">${icon(glyph)}${due?'<i aria-hidden="true"></i>':''}</span><span><strong>${label}</strong><small>${e(sub)}</small></span></a>`;
 return `<section class="home-quick" aria-labelledby="home-quick-title"><h2 id="home-quick-title">Registrar</h2><div class="home-quick-grid">${tile(next?'#meal-'+e(next.id):'/app/plano.html','plate','Refeição',next?next.nome:'Tudo registrado')}${tile('/app/registrar.html?tipo=peso','scale','Peso e medidas',weigh?.text||'Abrir registro',Boolean(weigh?.due))}${tile('/app/registrar.html?tipo=foto','camera','Foto do prato','Só você e o Emanuel')}${tile('/app/registrar.html?tipo=relato','chat','Relato','Zero julgamento')}</div></section>`;
}
// Etapas reais do acompanhamento, na ordem em que acontecem.
function journey(kind){
 const current={ficha:0,waiting:1,scheduled:2}[kind]??1;
 const steps=['Sua ficha','Plano do Emanuel','Início do plano'];
 return `<section class="card home-journey-card" aria-labelledby="home-journey-title"><header class="home-card-head"><h2 id="home-journey-title">Seu acompanhamento</h2></header><ol class="home-journey">${steps.map((label,i)=>`<li class="${i<current?'is-done':i===current?'is-current':''}" ${i===current?'aria-current="step"':''}><span>${i<current?icon('tick'):i+1}</span><strong>${label}</strong></li>`).join('')}</ol></section>`;
}
function unlocked(kind){
 const items=[
  kind==='ficha'?null:['/app/ficha.html','plan','Minha ficha','Consulta o que você enviou'],
  kind==='scheduled'?['/app/plano.html','plate','Meu plano','Já dá pra conferir as refeições']:null,
  ['/app/registrar.html?tipo=peso','scale','Peso e medidas','Anota seu ponto de partida'],
  ['/app/comunidade.html','people','Society','Conhece a comunidade'],
  ['/equipe.html','chat','Falar com a equipe','Tira suas dúvidas']
 ].filter(Boolean);
 return `<section class="home-unlocked" aria-labelledby="home-unlocked-title"><h2 id="home-unlocked-title">Já liberado pra você</h2><div class="home-unlocked-list">${items.map(([href,glyph,label,sub])=>`<a href="${href}"><span class="home-quick-icon">${icon(glyph)}</span><span><strong>${label}</strong><small>${sub}</small></span>${icon('arrow')}</a>`).join('')}</div></section>`;
}
function guide(seen){
 return `<details class="card start-guide" id="start-guide"><summary><span>Como usar o app</span>${seen?'':'<span class="home-badge" data-guide-new>Novo</span>'}</summary><ol><li><strong>Minha ficha:</strong> preencha sua rotina para iniciar o acompanhamento.</li><li><strong>Meu plano:</strong> veja os alimentos e as opções de cada refeição.</li><li><strong>Início:</strong> marque a refeição depois de comer.</li><li><strong>Registrar:</strong> envie fotos, medidas ou relatos quando precisar.</li></ol><button class="button secondary" id="dismiss-guide" type="button">Entendi</button></details>`;
}
export function homeDate(date){
 const text=new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
 return text.charAt(0).toUpperCase()+text.slice(1);
}
export function homeSkeleton(){
 return '<div class="home-skeleton" aria-hidden="true"><span class="is-hero"></span><span></span><span class="is-short"></span></div>';
}
export function homeView({step,active,plan,records,history,measures,frequency,date,fichaDone=0,fichaTotal=0,startDate='',firstMealHTML='',othersHTML='',noteHTML='',guideSeen=false}){
 const next=nextStepCard(step,{startDate,fichaDone,fichaTotal}),meals=active&&plan?.refeicoes?.length;
 const diary='<details class="card diary-fold no-print" id="diario"><summary>Ver meu diário</summary><div id="client-diary"></div></details>';
 if(!active)return `${next}${journey(step.kind)}${guide(guideSeen)}${unlocked(step.kind)}${noteHTML}${measures?.length||history.length?homeProgress(measures,history,date,false):''}${homeSociety()}${diary}`;
 return `${next}${firstMealHTML}${noteHTML}${meals?daySummary(plan,records):''}${othersHTML}${quickRecords(plan,records,measures,frequency,date)}${homeProgress(measures,history,date,Boolean(meals))}${homeSociety()}<div id="home-rank"></div>${diary}${guide(guideSeen)}`;
}
