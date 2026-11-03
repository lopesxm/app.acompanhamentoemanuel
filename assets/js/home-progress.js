import {icon} from './visuals.js';
const shift=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const fmt=date=>date.split('-').reverse().join('/');
const number=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:1});
const signed=n=>`${n>0?'+':''}${number(n)} kg`;
const days=n=>`${n} ${n===1?'dia':'dias'}`;
export function progressData(measures,history,date,hasPlan=false){
 const made=new Set(history.filter(r=>r.status==='comi'&&r.data<=date).map(r=>r.data));
 let cursor=made.has(date)?date:shift(date,-1),streak=0;
 while(made.has(cursor)){streak++;cursor=shift(cursor,-1);}
 const day=new Date(date+'T12:00:00Z').getUTCDay(),monday=shift(date,-((day+6)%7));
 const week=Array.from({length:7},(_,i)=>{const key=shift(monday,i);return {date:key,label:['S','T','Q','Q','S','S','D'][i],state:key>date?'future':made.has(key)?'done':key===date&&hasPlan?'pending':history.some(r=>r.data===key)?'skipped':'empty'};});
 const thisWeek=week.filter(d=>d.state==='done').length;
 const lastWeek=Array.from({length:7},(_,i)=>shift(monday,i-7)).filter(key=>made.has(key)).length;
 const weights=(measures||[]).filter(m=>m.data<=date&&Number.isFinite(Number(m.peso))&&Number(m.peso)>0).sort((a,b)=>b.data.localeCompare(a.data)||(b.criado_em||'').localeCompare(a.criado_em||''));
 const latest=weights[0],previous=latest?weights.find(m=>m.data<latest.data):null;
 const delta=previous?Math.round((Number(latest.peso)-Number(previous.peso))*10)/10:null;
 // Um ponto por data, do mais antigo pro mais novo: é o que o mini gráfico e o "desde o início" usam.
 const byDate=[...new Map([...weights].reverse().map(m=>[m.data,m])).values()];
 const first=byDate[0],sinceStart=byDate.length>=3?Math.round((Number(latest.peso)-Number(first.peso))*10)/10:null;
 return {streak,week,thisWeek,lastWeek,latest,previous,delta,first,sinceStart,trend:byDate.slice(-8).map(m=>Number(m.peso)),unavailable:measures===null};
}
// Linha neutra, sem cor de "bom" ou "ruim": subir ou descer depende do objetivo de cada um.
function trendLine(values){
 if(values.length<2)return '';
 const min=Math.min(...values),max=Math.max(...values),span=max-min||1;
 const points=values.map((v,i)=>[4+i*192/(values.length-1),max===min?20:34-(v-min)/span*28]);
 const last=points.at(-1);
 return `<svg class="weight-trend" viewBox="0 0 200 40" role="img" aria-label="Últimos ${values.length} registros de peso: de ${number(values[0])} a ${number(values.at(-1))} kg" preserveAspectRatio="none"><polyline points="${points.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ')}" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="3"/></svg>`;
}
function weightCard({latest,previous,delta,first,sinceStart,trend,unavailable}){
 const empty=`<div class="progress-empty"><strong>${unavailable?'Peso indisponível agora':'Seu ponto de partida'}</strong><p>${unavailable?'Não deu pra carregar seu peso. Tenta de novo daqui a pouco.':'Anota o primeiro peso e sua linha do tempo começa aqui.'}</p></div>`;
 const compare=delta===null?'Sua comparação começa no próximo registro.':`${signed(delta)} em relação a ${fmt(previous.data)}`;
 return `<section class="card home-progress-card"><header><h2>Peso</h2><span class="progress-glyph">${icon('scale')}</span></header>${latest?`<div class="progress-value">${number(Number(latest.peso))}<span>kg</span></div><p class="progress-caption">Registrado em ${fmt(latest.data)}</p>${trendLine(trend)}<p class="weight-change">${compare}</p>${sinceStart===null?'':`<p class="weight-change">${signed(sinceStart)} desde ${fmt(first.data)}</p>`}`:empty}<a class="progress-link" href="${latest||unavailable?'/app/evolucao.html':'/app/registrar.html?tipo=peso'}"><span>${latest||unavailable?'Ver evolução':'Registrar peso'}</span>${icon('arrow')}</a></section>`;
}
function consistencyCard({streak,week,thisWeek,lastWeek},date){
 const labels={done:'Refeição feita registrada',pending:'Hoje, registro pendente',empty:'Sem registro',future:'Dia futuro',skipped:'Sem refeição feita registrada'};
 return `<section class="card home-progress-card"><header><h2>Consistência</h2><span class="progress-glyph">${icon('record')}</span></header><div class="progress-value">${streak}<span>${streak===1?'dia seguido':'dias seguidos'}</span></div><p class="progress-caption">${streak?'Com pelo menos uma refeição feita':'Sua sequência começa na primeira refeição registrada.'}</p><ol class="consistency-week" aria-label="Registros desta semana">${week.map(d=>`<li class="week-${d.state}" ${d.date===date?'aria-current="date"':''}><span>${d.label}</span><span class="consistency-dot" role="img" aria-label="${fmt(d.date)}: ${labels[d.state]}" title="${fmt(d.date)}: ${labels[d.state]}">${d.state==='done'?icon('tick'):d.date.slice(-2)}</span></li>`).join('')}</ol><div class="week-compare"><div><small>Esta semana</small><strong>${days(thisWeek)}</strong><span class="week-bar"><i style="width:${Math.round(thisWeek/7*100)}%"></i></span></div>${lastWeek?`<div><small>Semana passada</small><strong>${days(lastWeek)}</strong><span class="week-bar is-past"><i style="width:${Math.round(lastWeek/7*100)}%"></i></span></div>`:''}</div><a class="progress-link" href="/app/evolucao.html"><span>Ver minha consistência</span>${icon('arrow')}</a></section>`;
}
export function homeProgress(measures,history,date,hasPlan=false){
 const data=progressData(measures,history,date,hasPlan);
 return `<div class="home-progress-grid">${consistencyCard(data,date)}${weightCard(data)}</div>`;
}
