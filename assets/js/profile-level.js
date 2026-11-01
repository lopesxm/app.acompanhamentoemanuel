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
function emblem(index){return `<svg viewBox="0 0 48 56" fill="none" aria-hidden="true"><path d="M24 3 43 11v22L24 52 5 33V11Z" stroke="currentColor" stroke-width="2"/><path d="m14 25 10 9 10-9M14 17l10 9 10-9" stroke="currentColor" stroke-width="2"/>${index>=4?'<path d="m16 40 8 7 8-7" stroke="currentColor" stroke-width="2"/>':''}${index>=7?'<path d="m24 7 2 4 4 1-3 3 .5 4-3.5-2-3.5 2 .5-4-3-3 4-1Z" fill="currentColor"/>':''}</svg>`;}
export function levelCard(points){
 const l=profileLevel(points);if(!l)return '';
 return `<section class="profile-level level-${l.key}" aria-label="Patente Grinder"><div class="level-heading"><span class="level-medal rank-emblem">${emblem(l.index)}</span><div><small>Patente ${l.index+1} de ${levels.length}</small><strong>Grinder ${l.name}</strong><span class="rank-caption">${l.caption}</span></div><span class="level-days">${number(l.points)} pts</span></div><progress max="100" value="${l.progress}" aria-label="Progresso para ${l.next?'Grinder '+l.next:'a patente máxima'}"></progress><div class="rank-next"><strong>${l.next?'Próxima: '+l.next:'Patente máxima conquistada'}</strong><span>${l.next?'Faltam '+number(l.remaining)+' pts':number(l.points)+' pontos na sua trajetória'}</span></div><details class="rank-track"><summary>Explorar as 10 patentes</summary><ol>${levels.map(([key,name,min],i)=>`<li class="${i<l.index?'rank-earned':i===l.index?'rank-current':'rank-locked'}" ${i===l.index?'aria-current="step"':''}><span class="rank-step" aria-hidden="true">${i<l.index?'✓':String(i+1).padStart(2,'0')}</span><span><strong>${name}</strong><small>${i===l.index?'Sua patente atual':i<l.index?'Conquistada':number(min)+' pontos'}</small></span><span>${i<=l.index?number(min)+' pts':'Por conquistar'}</span></li>`).join('')}</ol></details><details><summary>Como conquistar pontos</summary><p>Refeição registrada +5 (até 6/dia), dia com registro +5, publicação +10 (até 2/dia), comentário em publicação de outro membro +3 (até 5 publicações/dia) e curtida em publicação de outro membro +1 (até 5/dia). Limite total: 75 pontos por dia.</p><p>Não é preciso publicar todos os dias. Registros e participação contam; tempo de cadastro, peso e medidas não geram pontos. A patente reconhece participação, não mede saúde ou resultados físicos. Ações excluídas ou ocultas deixam de contar.</p></details><details class="rank-update"><summary>Nova trilha de patentes</summary><p>Os requisitos aumentaram para valorizar uma trajetória duradoura. Seus pontos foram mantidos; sua patente é calculada pelos novos marcos.</p></details></section>`;
}
