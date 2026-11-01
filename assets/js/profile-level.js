export const levels=[['bronze','Bronze',0],['prata','Prata',30],['ouro','Ouro',90],['platina','Platina',180],['diamante','Diamante',365]];
export function profileLevel(since,now=Date.now()){
 const start=since?Date.parse(since):NaN;if(!Number.isFinite(start)||!Number.isFinite(now))return null;
 const days=Math.max(0,Math.floor((now-start)/86400000));
 const index=levels.findLastIndex(x=>days>=x[2]),[key,name,min]=levels[index],next=levels[index+1];
 return {key,name,days,next:next?.[1]||null,remaining:next?next[2]-days:0,progress:next?Math.min(100,Math.floor((days-min)/(next[2]-min)*100)):100};
}
export function levelCard(since){
 const l=profileLevel(since);if(!l)return '';
 return `<section class="profile-level level-${l.key}" aria-label="Nível do perfil"><div class="level-heading"><span class="level-medal" aria-hidden="true">◇</span><div><small>Nível do perfil</small><strong>Grinder ${l.name}</strong></div><span class="level-days">${l.days} dias</span></div><progress max="100" value="${l.progress}" aria-label="Progresso para ${l.next?'Grinder '+l.next:'o nível máximo'}"></progress><p>${l.next?`${l.remaining} dias para Grinder ${l.next}`:'Grinder Diamante · nível máximo'}</p><details><summary>Como os níveis funcionam</summary><p>O nível sobe automaticamente com o tempo desde o cadastro, independentemente de medidas ou resultados físicos.</p><ol>${levels.map(([,name,day])=>`<li>Grinder ${name} · ${day===0?'ao entrar':day+' dias'}</li>`).join('')}</ol></details></section>`;
}
