export const levels=[['bronze','Bronze',0],['prata','Prata',100],['ouro','Ouro',500],['platina','Platina',1500],['diamante','Diamante',3000]];
export function profileLevel(points){
 if(typeof points!=='number'||!Number.isFinite(points)||points<0)return null;
 const days=Math.floor(points);
 const index=levels.findLastIndex(x=>days>=x[2]),[key,name,min]=levels[index],next=levels[index+1];
 return {key,name,points:days,next:next?.[1]||null,remaining:next?next[2]-days:0,progress:next?Math.min(100,Math.floor((days-min)/(next[2]-min)*100)):100};
}
export function levelCard(points){
 const l=profileLevel(points);if(!l)return '';
 return `<section class="profile-level level-${l.key}" aria-label="Nível do perfil"><div class="level-heading"><span class="level-medal" aria-hidden="true">◇</span><div><small>Nível do perfil</small><strong>Grinder ${l.name}</strong></div><span class="level-days">${l.points} pts</span></div><progress max="100" value="${l.progress}" aria-label="Progresso para ${l.next?'Grinder '+l.next:'o nível máximo'}"></progress><p>${l.next?`${l.remaining} pontos para Grinder ${l.next}`:'Grinder Diamante · nível máximo'}</p><details><summary>Como os níveis funcionam</summary><p>Pontos por ações registradas: refeição +5 (até 6/dia), dia com registro +5, publicação +10 (até 2/dia), comentário em publicação de outro membro +3 (até 5 publicações/dia) e curtida em publicação de outro membro +1 (até 5/dia). Ações excluídas ou ocultas deixam de contar.</p><ol>${levels.map(([,name,day])=>`<li>Grinder ${name} · ${day===0?'ao entrar':day+' pontos'}</li>`).join('')}</ol></details></section>`;
}
