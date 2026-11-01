export function startStep(ficha,plan,records,date){
 if(!ficha?.concluida_em)return {kind:'ficha',title:'Vamos começar pela sua ficha',text:'Conte sua rotina para o nutricionista preparar seu acompanhamento.',href:'/app/ficha.html',label:'Preencher minha ficha'};
 if(!plan)return {kind:'waiting',title:'Sua ficha foi enviada',text:'Seu plano aparecerá aqui quando o nutricionista publicar.',href:'/app/ficha.html',label:'Consultar minha ficha'};
 if(plan.inicio_em>date)return {kind:'scheduled',title:'Seu plano está pronto',text:'Você já pode consultar as refeições antes da data de início.',href:'/app/plano.html',label:'Ver meu plano'};
 const meals=[...(plan.refeicoes||[])].sort((a,b)=>(a.horario||'').localeCompare(b.horario||''));
 const next=meals.find(m=>!records.some(r=>r.refeicao_id===m.id));
 if(!meals.length)return {kind:'waiting',title:'Seu plano está sendo preparado',text:'As refeições aparecerão aqui quando estiverem disponíveis.',href:'/app/plano.html',label:'Consultar meu plano'};
 return next?{kind:'meal',title:next.nome,text:'Consulte as opções e registre sua refeição abaixo.',meal:next,href:'#meal-'+next.id,label:'Ver próxima refeição'}:{kind:'done',title:'Registros de hoje concluídos',text:'Você pode revisar ou corrigir seus registros quando precisar.',href:'/app/plano.html',label:'Revisar meu plano'};
}
