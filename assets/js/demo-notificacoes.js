// Demonstração: imita os gatilhos de 007_notificacoes.sql com os dados deste navegador.
const first=n=>String(n||'').split(' ')[0];
const spDay=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(d?new Date(d):new Date());
const adminLink=(cid,aba)=>`/admin/cliente.html?id=${cid}&aba=${aba}`;
const registered=n=>n+(n===1?' refeição registrada hoje':' refeições registradas hoje');
function actor(db){return db.perfis.find(p=>p.papel===sessionStorage.getItem('demo-role'))?.id;}
function push(db,dest,cid,tipo,titulo,texto,link,criado_em=new Date().toISOString()){
 if(!dest||dest===actor(db))return;
 db.notificacoes??=[];
 db.notificacoes.push({id:crypto.randomUUID(),destinatario_id:dest,cliente_id:cid||null,tipo,titulo,texto:String(texto??'').trim().slice(0,160)||null,link,lida_em:null,criado_em});
}
export function demoNotify(db,table,row){
 if(table==='posts'){
  if(!row.cliente_id){for(const c of db.clientes)if(c.usuario_id&&c.status!=='inativo'&&db.comunidade_perfis?.some(x=>x.cliente_id===c.id&&x.ativo))push(db,c.usuario_id,c.id,'post','O Emanuel postou na comunidade',row.texto,'/app/comunidade.html#post-'+row.id);}
  else push(db,row.nutricionista_id,row.cliente_id,'post',first(db.clientes.find(c=>c.id===row.cliente_id)?.nome)+' postou na comunidade',row.texto,'/admin/comunidade.html#post-'+row.id);
  return;
 }
 if(table==='comentarios_post'){
  const p=db.posts.find(x=>x.id===row.post_id);if(!p)return;
  const owner=p.cliente_id?db.clientes.find(c=>c.id===p.cliente_id)?.usuario_id:p.nutricionista_id;
  const admin=db.perfis.find(x=>x.id===row.autor_id)?.papel==='admin',c=db.clientes.find(x=>x.usuario_id===row.autor_id);
  const shown=admin?'O Emanuel':db.comunidade_perfis?.find(x=>x.cliente_id===c?.id)?.nome||'Alguém',real=admin?'O Emanuel':first(c?.nome);
  const others=db.comentarios_post.filter(k=>k.post_id===p.id&&k.id!==row.id&&!k.oculto).map(k=>k.autor_id);
  for(const dest of new Set([owner,p.nutricionista_id,...others].filter(x=>x&&x!==row.autor_id))){
   const what=dest===owner?' comentou no seu post':others.includes(dest)?' respondeu na conversa':' comentou na comunidade';
   push(db,dest,c?.id||p.cliente_id,'comentario_post',(dest===p.nutricionista_id?real:shown)+what,row.texto,(dest===p.nutricionista_id?'/admin/comunidade.html#post-':'/app/comunidade.html#post-')+p.id);
  }
  return;
 }
 const c=db.clientes.find(x=>x.id===row.cliente_id);if(!c)return;const name=first(c.nome);
 if(table==='comentarios'){
  if(row.autor_id===c.usuario_id)push(db,c.nutricionista_id,c.id,'resposta',name+' respondeu no diário',row.texto,adminLink(c.id,'diario'));
  else push(db,c.usuario_id,c.id,'comentario','O Emanuel comentou no seu diário',row.texto,'/app/hoje.html#diario');
  return;
 }
 if(table==='planos'){push(db,c.usuario_id,c.id,'plano','Plano novo no ar! 🎉','O Emanuel publicou seu plano. Bora dar uma olhada?','/app/plano.html');return;}
 // Daqui pra baixo só conta o que o próprio cliente fez.
 if(c.usuario_id!==actor(db))return;
 const dest=c.nutricionista_id;
 if(table==='registros_refeicao'){
  const n=db.registros_refeicao.filter(r=>r.cliente_id===c.id&&r.data===spDay()).length;
  const open=(db.notificacoes||[]).find(x=>x.destinatario_id===dest&&x.cliente_id===c.id&&x.tipo==='registro'&&!x.lida_em&&spDay(x.criado_em)===spDay());
  if(open)Object.assign(open,{texto:registered(n),criado_em:new Date().toISOString()});
  else push(db,dest,c.id,'registro',name+' tá registrando as refeições',registered(n),adminLink(c.id,'diario'));
 }
 if(table==='fotos_refeicao')push(db,dest,c.id,'foto',name+' mandou foto do prato',null,adminLink(c.id,'diario'));
 if(table==='fugas')push(db,dest,c.id,'fuga',name+' contou que saiu do plano',row.descricao,adminLink(c.id,'diario'));
 if(table==='medidas')push(db,dest,c.id,'medidas',name+' atualizou as medidas',`Peso: ${Number(row.peso).toLocaleString('pt-BR')} kg`,adminLink(c.id,'evolucao'));
 if(table==='arquivos')push(db,dest,c.id,'arquivo',name+(row.tipo==='exame'?' enviou um exame':' enviou foto de acompanhamento'),null,adminLink(c.id,'ficha'));
 if(table==='fichas')push(db,dest,c.id,'ficha',name+' terminou a ficha','Agora é contigo: hora de montar o plano.',adminLink(c.id,'ficha'));
}
export function demoNotificationRpc(name,args,db){
 const me=actor(db);
 if(name==='marcar_notificacoes_lidas'){let n=0;for(const x of db.notificacoes||[])if(x.destinatario_id===me&&!x.lida_em&&(!args?.ids||args.ids.includes(x.id))){x.lida_em=new Date().toISOString();n++;}return n;}
 if(name==='grupo_whatsapp'){const c=db.clientes.find(x=>x.usuario_id===me);const owner=c?.nutricionista_id||(db.perfis.find(p=>p.id===me)?.papel==='admin'?me:null);return db.configuracoes?.find(x=>x.nutricionista_id===owner)?.grupo_whatsapp||null;}
}
export const notificationRpcs=new Set(['marcar_notificacoes_lidas','grupo_whatsapp']);
// Alguns avisos prontos pra demonstração não abrir com o sininho vazio.
export function seedNotifications(db){
 if(db.notificacoesDemo)return;db.notificacoesDemo=true;db.notificacoes??=[];
 const admin=db.perfis.find(p=>p.papel==='admin')?.id,mari=db.clientes.find(c=>c.nome==='Mariana Oliveira'),lucas=db.clientes.find(c=>c.nome==='Lucas Ferreira');
 const hours=n=>new Date(Date.now()-n*3600000).toISOString();
 const add=(dest,cid,tipo,titulo,texto,link,h,lida=false)=>db.notificacoes.push({id:crypto.randomUUID(),destinatario_id:dest,cliente_id:cid,tipo,titulo,texto,link,lida_em:lida?hours(h-1):null,criado_em:hours(h)});
 if(mari){
  add(admin,mari.id,'fuga','Mariana contou que saiu do plano','Saí para jantar com a família e comi pizza.',adminLink(mari.id,'diario'),20);
  add(admin,mari.id,'medidas','Mariana atualizou as medidas','Peso: 68,4 kg',adminLink(mari.id,'evolucao'),2);
  add(mari.usuario_id,mari.id,'plano','Plano novo no ar! 🎉','O Emanuel publicou seu plano. Bora dar uma olhada?','/app/plano.html',72,true);
  const fuga=db.fugas.find(f=>f.cliente_id===mari.id),texto='Pizza com a família faz parte. Amanhã a gente segue o plano normal 💚';
  if(fuga){db.comentarios.push({id:crypto.randomUUID(),cliente_id:mari.id,autor_id:admin,alvo_tipo:'fuga',alvo_id:fuga.id,texto,criado_em:hours(5)});add(mari.usuario_id,mari.id,'comentario','O Emanuel comentou no seu diário',texto,'/app/hoje.html#diario',5);}
 }
 if(lucas)add(admin,lucas.id,'ficha','Lucas terminou a ficha','Agora é contigo: hora de montar o plano.',adminLink(lucas.id,'ficha'),30);
}
