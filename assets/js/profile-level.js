export const levels=[
 ['bronze','Bronze',0,'Primeiro compromisso'],
 ['prata','Prata',750,'Uma base em construção'],
 ['ouro','Ouro',2000,'Participação que se fortalece'],
 ['platina','Platina',4500,'Uma jornada consistente'],
 ['diamante','Diamante',8000,'Compromisso em destaque'],
 ['onix','Ônix',13000,'Presença que faz diferença'],
 ['tita','Titã',20000,'Uma trajetória de dedicação'],
 ['elite','Elite',30000,'Um marco de participação'],
 ['mestre','Mestre',45000,'Uma longa jornada construída'],
 ['lenda','Lenda',65000,'O maior marco da Society']
];
const number=n=>n.toLocaleString('pt-BR');
export function profileLevel(points){
 if(typeof points!=='number'||!Number.isFinite(points)||points<0)return null;
 const total=Math.floor(points);
 const index=levels.findLastIndex(x=>total>=x[2]),[key,name,min,caption]=levels[index],next=levels[index+1];
 return {key,name,caption,index,min,points:total,next:next?.[1]||null,target:next?.[2]||null,remaining:next?next[2]-total:0,progress:next?Math.min(100,Math.floor((total-min)/(next[2]-min)*100)):100};
}
function emblem(index){return `<svg viewBox="0 0 48 56" aria-hidden="true" focusable="false"><path d="M24 3 44 14.500v27L24 53 4 41.500v-27Z"/><text x="24" y="33" text-anchor="middle">${String(index+1).padStart(2,'0')}</text></svg>`;}
// Progressão individual: não depende de ninguém. O ranking com quem você segue fica na Society.
export function homeRank(points,conquistas=0){
 const l=profileLevel(points);if(!l)return '';
 return `<section class="card home-rank" aria-labelledby="home-rank-title"><header class="home-card-head"><h2 id="home-rank-title">Grinder Ranks</h2><span class="home-badge">Nível ${l.index+1} de ${levels.length}</span></header><div class="home-rank-main"><span class="rank-emblem">${emblem(l.index)}</span><div><strong>Grinder ${l.name}</strong><small>${l.caption}</small></div><span class="home-rank-points"><strong>${number(l.points)}</strong><small>pts</small></span></div><ol class="home-rank-track" aria-hidden="true">${levels.map((_,i)=>`<li class="${i<l.index?'is-earned':i===l.index?'is-current':''}">${i===l.index?`<i style="width:${l.progress}%"></i>`:''}</li>`).join('')}</ol><p class="home-rank-next">${l.next?`Faltam ${number(l.remaining)} pts pra ${l.next}`:'Nível máximo alcançado'}${conquistas?` · ${conquistas} ${conquistas===1?'conquista pra postar':'conquistas pra postar'}`:''}</p><small class="home-rank-note">É a sua progressão individual. O ranking com quem você segue fica na Society.</small><a class="progress-link" href="/app/conquistas.html"><span>Ver níveis e conquistas</span><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a></section>`;
}
export function levelCard(points){
 const l=profileLevel(points);if(!l)return '';
 return `<section class="profile-level level-${l.key}" aria-label="Nível de participação"><div class="level-heading"><span class="level-medal rank-emblem">${emblem(l.index)}</span><div><small>Nível ${l.index+1} de ${levels.length}</small><strong>Grinder ${l.name}</strong><span class="rank-caption">${l.caption}</span></div><span class="level-days">${number(l.points)} pts</span></div><progress max="100" value="${l.progress}" aria-label="Progresso para ${l.next?'Grinder '+l.next:'o nível máximo'}"></progress><div class="rank-next"><strong>${l.next?'Próxima: '+l.next:'Nível máximo alcançado'}</strong><span>${l.next?'Faltam '+number(l.remaining)+' pts':number(l.points)+' pontos na sua trajetória'}</span></div><details class="rank-track"><summary>Ver os 10 níveis</summary><ol>${levels.map(([key,name,min],i)=>`<li class="${i<l.index?'rank-earned':i===l.index?'rank-current':'rank-locked'}" ${i===l.index?'aria-current="step"':''}><span class="rank-step" aria-hidden="true">${i<l.index?'✓':String(i+1).padStart(2,'0')}</span><span><strong>${name}</strong><small>${i===l.index?'Seu nível atual':i<l.index?'Conquistada':number(min)+' pontos'}</small></span><span>${i<=l.index?number(min)+' pts':'Por conquistar'}</span></li>`).join('')}</ol></details><details><summary>Como conquistar pontos</summary><p>Refeição registrada +5 (até 6/dia), dia com registro +5, publicação +10 (até 2/dia), comentário em publicação de outro membro +3 (até 5 publicações/dia) e curtida em publicação de outro membro +1 (até 5/dia). Limite total: 75 pontos por dia.</p><p>Não é preciso publicar todos os dias. Registros e participação contam; tempo de cadastro, peso e medidas não geram pontos. O nível reconhece participação, não mede saúde ou resultados físicos. Ações excluídas ou ocultas deixam de contar.</p></details><details class="rank-update"><summary>Sobre os níveis</summary><p>Os requisitos aumentaram para valorizar uma trajetória duradoura. Seus pontos foram mantidos; seu nível é calculado pelos novos marcos.</p></details></section>`;
}
