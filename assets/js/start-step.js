export function startStep(ficha,plan,records,date){
 if(!ficha?.concluida_em)return {kind:'ficha',title:'Bora começar pela sua ficha',text:'Conta sua rotina pro Emanuel montar seu acompanhamento.',href:'/app/ficha.html',label:'Preencher minha ficha'};
 if(!plan)return {kind:'waiting',title:'Sua ficha chegou no Emanuel',text:'Seu plano aparece aqui assim que o Emanuel publicar.',href:'/app/ficha.html',label:'Consultar minha ficha'};
 if(plan.inicio_em>date)return {kind:'scheduled',title:'Seu plano está pronto',text:'Já dá pra ver as refeições antes da data de início.',href:'/app/plano.html',label:'Ver meu plano'};
 const meals=[...(plan.refeicoes||[])].sort((a,b)=>(a.horario||'').localeCompare(b.horario||''));
 const next=meals.find(m=>!records.some(r=>r.refeicao_id===m.id));
 if(!meals.length)return {kind:'waiting',title:'Seu plano está sendo preparado',text:'As refeições aparecem aqui quando estiverem disponíveis.',href:'/app/plano.html',label:'Consultar meu plano'};
 return next?{kind:'meal',title:next.nome,text:'É a próxima do seu plano. Escolhe as opções e registra aqui embaixo.',meal:next,href:'#meal-'+next.id,label:'Registrar refeição'}:{kind:'done',title:'Dia registrado',text:'Todas as refeições de hoje têm registro. Se precisar, dá pra revisar ou corrigir.',href:'/app/plano.html',label:'Revisar meu plano'};
}
