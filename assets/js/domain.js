export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
export const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const statusLabels={convite_pendente:'Convite pendente',ficha_pendente:'Ficha pendente',aguardando_plano:'Aguardando plano',ativo:'Em acompanhamento',inativo:'Inativo'};
export function adherence(records,meals,days=7){return meals>0?Math.round(records.filter(x=>x.status==='comi').length/(meals*days)*100):null;}
export function calculate({peso,altura,idade,sexo,fator=1.2,formula='mifflin'}){
 const p=Number(peso),a=Number(altura),i=Number(idade),f=Number(fator);
 if(![p,a,i,f].every(Number.isFinite)||p<=0||a<=0||i<18||f<1||f>3) throw Error('Confere os dados: a conta vale pra adultos e o fator vai de 1 a 3.');
 const male=sexo==='masculino';
 const expression=formula==='harris'?(male?'88,362 + 13,397 × peso + 4,799 × altura − 5,677 × idade':'447,593 + 9,247 × peso + 3,098 × altura − 4,330 × idade'):'10 × peso + 6,25 × altura − 5 × idade '+(male?'+ 5':'− 161');
 const tmb=formula==='harris'?(male?88.362+13.397*p+4.799*a-5.677*i:447.593+9.247*p+3.098*a-4.330*i):10*p+6.25*a-5*i+(male?5:-161);
 return {tmb:Math.round(tmb),get:Math.round(tmb*f),expression};
}
export function validatePlan(plan){
 if(!plan.refeicoes?.length)throw Error('Coloca pelo menos uma refeição no plano.');
 for(const m of plan.refeicoes){if(!m.nome?.trim()||!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.horario)||!m.grupos?.length)throw Error('Toda refeição precisa de nome, horário e pelo menos um grupo.');
 for(const g of m.grupos){if(!g.nome?.trim()||!['escolher_1','todos','a_vontade'].includes(g.regra)||!g.opcoes?.length)throw Error('Falta o nome ou as opções de algum grupo.');
 for(const o of g.opcoes){if(!o.descricao?.trim()||(g.regra!=='a_vontade'&&!(Number(o.quantidade)>0)))throw Error('Falta alimento ou quantidade em alguma opção.');}}}
 return plan;
}
export function selectedOptions(meal,values){return meal.grupos.flatMap(g=>g.regra==='escolher_1'?[values[g.id]].filter(Boolean):g.opcoes.map(o=>o.id));}
