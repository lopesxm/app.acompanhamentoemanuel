// Versão de demonstração das funções da comunidade (003_comunidade.sql), sobre os dados fictícios do navegador.
import {today} from './domain.js';
const id=()=>crypto.randomUUID();
const shift=(day,n)=>{const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA');};
const weekStart=day=>{const d=new Date(day+'T12:00:00');return shift(day,-((d.getDay()+6)%7));};
const hoursAgo=h=>new Date(Date.now()-h*3600000).toISOString();
export const communityRpcs=new Set(['minha_comunidade','ativar_comunidade','desativar_comunidade','buscar_perfil','pedir_para_seguir','aceitar_seguidor','remover_seguidor','deixar_de_seguir','postar_foto','visual_perfil','salvar_visual','postar_resumo','postar_conquista','postar_dica','apagar_post','moderar_post','curtir','comentar_post','apagar_comentario','moderar_comentario','feed','perfil_comunidade','ranking_semanal','comparar']);

export function ensureCommunity(db){
 if(db.comunidade_perfis)return;
 const admin=db.perfis.find(p=>p.papel==='admin').id;
 const find=name=>db.clientes.find(c=>c.nome.startsWith(name));
 const camila=find('Camila'),beatriz=find('Beatriz'),mariana=find('Mariana');
 db.comunidade_perfis=[{cliente_id:camila.id,usuario:'camis.santos',nome:'Camila',mostrar_peso:false,ativo:true},{cliente_id:beatriz.id,usuario:'bia.almeida',nome:'Bia',mostrar_peso:true,ativo:true}];
 db.seguidores=[{seguidor_id:camila.id,seguido_id:beatriz.id,status:'aceito'},{seguidor_id:beatriz.id,seguido_id:camila.id,status:'aceito'},{seguidor_id:camila.id,seguido_id:mariana.id,status:'pendente'},{seguidor_id:beatriz.id,seguido_id:mariana.id,status:'pendente'}];
 const d1=shift(today(),-1);
 db.posts=[
  {id:id(),nutricionista_id:admin,cliente_id:null,tipo:'dica',texto:'Dica do dia: deixa a garrafa de água sempre à vista. Parece bobo, mas funciona demais 💧',foto_caminho:null,dentro_do_plano:false,dados:{},oculto:false,criado_em:hoursAgo(3)},
  {id:id(),nutricionista_id:admin,cliente_id:camila.id,tipo:'foto',texto:'Almoço de hoje, simples e top',foto_caminho:'/assets/img/lunch.svg',dentro_do_plano:true,dados:{refeicao:'Almoço',dia:d1},oculto:false,criado_em:hoursAgo(20)},
  {id:id(),nutricionista_id:admin,cliente_id:beatriz.id,tipo:'conquista',texto:'Uma semana sem pular nada!',foto_caminho:null,dentro_do_plano:false,dados:{codigo:'sequencia_7',titulo:'7 dias seguidos',chave:'demo'},oculto:false,criado_em:hoursAgo(26)},
  {id:id(),nutricionista_id:admin,cliente_id:camila.id,tipo:'resumo',texto:null,foto_caminho:null,dentro_do_plano:false,dados:{dia:d1,feitas:4,previstas:4,adesao:100,sequencia:7},oculto:false,criado_em:hoursAgo(30)},
  {id:id(),nutricionista_id:admin,cliente_id:null,tipo:'dica',texto:'Desafio da semana: coloca uma cor nova no prato todo dia. Quem topa? 🥕🥦🍅',foto_caminho:null,dentro_do_plano:false,dados:{},oculto:false,criado_em:hoursAgo(50)}
 ];
 const bia=db.perfis.find(p=>p.id===beatriz.usuario_id).id;
 db.curtidas=[{post_id:db.posts[1].id,perfil_id:bia},{post_id:db.posts[0].id,perfil_id:bia}];
 db.comentarios_post=[{id:id(),post_id:db.posts[1].id,autor_id:bia,texto:'Que prato lindo!',oculto:false,criado_em:hoursAgo(19)},{id:id(),post_id:db.posts[1].id,autor_id:admin,texto:'Esse é o espírito 👏',oculto:false,criado_em:hoursAgo(18)}];
}

export function demoCommunity(name,args={},db){
 ensureCommunity(db);
 if(!db.exemploPerfilCompleto){
 const sample=db.clientes.find(c=>c.nome==='Mariana Oliveira'),friend=db.clientes.find(c=>c.nome==='Camila Santos');
 if(sample&&friend){
 if(!db.comunidade_perfis.some(x=>x.cliente_id===sample.id))db.comunidade_perfis.push({cliente_id:sample.id,usuario:'mariana.exemplo',nome:'Mariana Oliveira',mostrar_peso:false,ativo:true});
 for(const [a,b] of [[sample.id,friend.id],[friend.id,sample.id]])if(!db.seguidores.some(x=>x.seguidor_id===a&&x.seguido_id===b))db.seguidores.push({seguidor_id:a,seguido_id:b,status:'aceito'});
 db.posts.push({id:id(),nutricionista_id:sample.nutricionista_id,cliente_id:sample.id,tipo:'resumo',texto:'Organizando minha rotina, uma refeição de cada vez. Exemplo fictício.',foto_caminho:null,dentro_do_plano:false,dados:{dia:shift(today(),-1),feitas:4,previstas:4,adesao:100,sequencia:7},oculto:false,criado_em:hoursAgo(12)});
 db.perfis_visuais??=[];if(!db.perfis_visuais.some(v=>v.usuario_id===sample.usuario_id))db.perfis_visuais.push({usuario_id:sample.usuario_id,nome:'Mariana Oliveira',bio:'Organizando minha rotina, uma refeição de cada vez. Perfil fictício.',avatar:null});
 db.exemploPerfilCompleto=true;
 }
 }
 const role=sessionStorage.getItem('demo-role');
 const myProfile=db.perfis.find(p=>p.papel===role);const uid=myProfile.id;const isAdmin=role==='admin';
 const me=isAdmin?null:db.clientes.find(c=>c.usuario_id===uid)?.id;
 const fail=msg=>{throw Error(msg);};
 const cp=cid=>db.comunidade_perfis.find(x=>x.cliente_id===cid);
 const active=cid=>Boolean(cid&&cp(cid)?.ativo);
 const follows=(a,b)=>db.seguidores.some(s=>s.seguidor_id===a&&s.seguido_id===b&&s.status==='aceito');
 const requireMe=()=>{if(!active(me))fail('Ativa a comunidade primeiro.');return me;};
 const planFor=(cid,day)=>db.planos.filter(p=>p.cliente_id===cid&&p.status!=='rascunho'&&p.inicio_em<=day&&(p.publicado_em||p.inicio_em).slice(0,10)<=day).sort((a,b)=>b.versao-a.versao)[0];
 const expected=(cid,day)=>planFor(cid,day)?.refeicoes.length||0;
 const done=(cid,day)=>db.registros_refeicao.filter(r=>r.cliente_id===cid&&r.data===day&&r.status==='comi').length;
 const adherence=(cid,start,end)=>{let prev=0,ok=0;for(let d=start;d<=end;d=shift(d,1)){prev+=expected(cid,d);ok+=done(cid,d);}return prev?Math.min(100,Math.round(ok/prev*100)):null;};
 const streak=cid=>{let d=today(),n=0;if(!done(cid,d))d=shift(d,-1);while(done(cid,d)){n++;d=shift(d,-1);}return n;};
 const week=weekStart(today());
 const canSee=p=>(isAdmin)||(p.cliente_id&&p.cliente_id===me&&active(me))||(!p.oculto&&active(me)&&(p.cliente_id===null||(active(p.cliente_id)&&follows(me,p.cliente_id))));
 const person=cid=>{const x=cp(cid);return {cliente_id:cid,nome:x.nome,usuario:x.usuario};};
 const achievements=cid=>{const seq=streak(cid),r=[];for(const n of [30,14,7])if(seq>=n){r.push({codigo:'sequencia_'+n,titulo:n+' dias seguidos',chave:`sequencia_${n}:${week}`});break;}if(adherence(cid,shift(week,-7),shift(week,-1))===100)r.push({codigo:'semana_100',titulo:'Semana 100%',chave:'semana_100:'+shift(week,-7)});return r.filter(c=>!db.posts.some(p=>p.cliente_id===cid&&p.tipo==='conquista'&&p.dados.chave===c.chave));};
 const insertPost=post=>{const row={id:id(),nutricionista_id:db.clientes[0].nutricionista_id,dentro_do_plano:false,foto_caminho:null,dados:{},oculto:false,criado_em:new Date().toISOString(),...post};db.posts.push(row);return row.id;};
 const nameOf=perfilId=>{const p=db.perfis.find(x=>x.id===perfilId);if(p?.papel==='admin')return {nome:p.nome,usuario:null,nutricionista:true};const c=db.clientes.find(x=>x.usuario_id===perfilId);const x=c&&cp(c.id);return {nome:x?.nome||'Alguém',usuario:x?.usuario||null,nutricionista:false};};
 switch(name){
 case 'minha_comunidade':{const x=cp(me);if(!x||!x.ativo)return {perfil:x?{...x,ativo:false}:null};return {perfil:{...x,cliente_id:me},pedidos:db.seguidores.filter(s=>s.seguido_id===me&&s.status==='pendente'&&active(s.seguidor_id)).map(s=>person(s.seguidor_id)),seguidores:db.seguidores.filter(s=>s.seguido_id===me&&s.status==='aceito'&&active(s.seguidor_id)).map(s=>person(s.seguidor_id)),seguindo:db.seguidores.filter(s=>s.seguidor_id===me&&active(s.seguido_id)).map(s=>({...person(s.seguido_id),status:s.status})),conquistas:achievements(me)};}
 case 'ativar_comunidade':{if(!me)fail('Opa, você não tem acesso a isso.');const u=String(args.p_usuario||'').trim().toLowerCase();if(!/^[a-z0-9_.]{3,20}$/.test(u))fail('O @ precisa ter de 3 a 20 caracteres: letras, números, ponto ou _.');if(/^(emanuel|nutri|admin|suporte|oficial)/.test(u))fail('Esse @ é reservado. Escolhe outro.');if(db.comunidade_perfis.some(x=>x.usuario===u&&x.cliente_id!==me))fail('Esse @ já tem dono. Tenta outro.');const nome=String(args.p_nome||'').trim();if(!nome||nome.length>40)fail('Escolhe um nome de até 40 caracteres.');const x=cp(me);if(x)Object.assign(x,{usuario:u,nome,mostrar_peso:Boolean(args.p_mostrar_peso),ativo:true});else db.comunidade_perfis.push({cliente_id:me,usuario:u,nome,mostrar_peso:Boolean(args.p_mostrar_peso),ativo:true});return;}
 case 'desativar_comunidade':{const x=cp(me);if(x)x.ativo=false;return;}
 case 'buscar_perfil':{requireMe();const u=String(args.p_usuario||'').replace('@','').trim().toLowerCase();const x=db.comunidade_perfis.find(y=>y.usuario===u&&y.ativo&&y.cliente_id!==me);if(!x)return null;return {...person(x.cliente_id),relacao:follows(me,x.cliente_id)?'seguindo':db.seguidores.some(s=>s.seguidor_id===me&&s.seguido_id===x.cliente_id)?'pendente':'nenhuma'};}
 case 'pedir_para_seguir':{requireMe();if(args.cid===me||!active(args.cid))fail('Não achei esse perfil na comunidade.');if(!db.seguidores.some(s=>s.seguidor_id===me&&s.seguido_id===args.cid))db.seguidores.push({seguidor_id:me,seguido_id:args.cid,status:'aceito'});return 'demo-aceito';}
 case 'aceitar_seguidor':{requireMe();const s=db.seguidores.find(s=>s.seguidor_id===args.cid&&s.seguido_id===me);if(!s)fail('Esse pedido não existe mais.');s.status='aceito';return;}
 case 'remover_seguidor':db.seguidores=db.seguidores.filter(s=>!(s.seguidor_id===args.cid&&s.seguido_id===me));return;
 case 'deixar_de_seguir':db.seguidores=db.seguidores.filter(s=>!(s.seguidor_id===me&&s.seguido_id===args.cid));return;
 case 'postar_foto':{requireMe();const f=db.fotos_refeicao.find(x=>x.id===args.foto&&x.cliente_id===me);if(!f)fail('Não achei essa foto no seu diário.');if(db.posts.some(p=>p.foto_caminho===f.caminho_storage))fail('Essa foto já tá no feed.');const r=db.registros_refeicao.find(x=>x.id===f.registro_id);return insertPost({cliente_id:me,tipo:'foto',texto:args.p_texto?.trim()||null,foto_caminho:f.caminho_storage,dentro_do_plano:r?.status==='comi',dados:{refeicao:r?.refeicao_nome||null,dia:f.data}});}
 case 'visual_perfil':{db.perfis_visuais??=[];const admin=db.perfis.find(x=>x.papel==='admin');const target=args.cid?db.clientes.find(c=>c.id===args.cid)?.usuario_id:args.emanuel?admin.id:uid;const tc=db.clientes.find(c=>c.usuario_id===target);const visible=target===uid||isAdmin||target===admin.id||(tc&&active(me)&&active(tc.id)&&follows(me,tc.id));if(!target||!visible)return null;const v=db.perfis_visuais.find(x=>x.usuario_id===target),base=db.perfis.find(x=>x.id===target);return {nome:v?.nome||(tc&&cp(tc.id)?.nome)||base.nome,bio:v?.bio||'',avatar:v?.avatar||null,capa:null,meu:target===uid};}
 case 'salvar_visual':{db.perfis_visuais??=[];const nome=String(args.p_nome||'').trim(),bio=String(args.p_bio||'').trim();if(!nome||nome.length>40||bio.length>240)fail('Use um nome de até 40 caracteres e apresentação de até 240.');const row=db.perfis_visuais.find(x=>x.usuario_id===uid);if(row)Object.assign(row,{nome,bio,avatar:args.p_avatar||null});else db.perfis_visuais.push({usuario_id:uid,nome,bio,avatar:args.p_avatar||null});return;}
 case 'postar_resumo':{requireMe();const dia=args.dia;if(!dia||dia>today()||dia<shift(today(),-6))fail('Dá pra postar o resumo só dos últimos 7 dias.');if(db.posts.some(p=>p.cliente_id===me&&p.tipo==='resumo'&&p.dados.dia===dia))fail('Você já postou o resumo desse dia.');const prev=expected(me,dia),ok=done(me,dia);if(!prev)fail('Nesse dia ainda não tinha plano pra resumir.');return insertPost({cliente_id:me,tipo:'resumo',texto:args.p_texto?.trim()||null,dados:{dia,feitas:Math.min(ok,prev),previstas:prev,adesao:Math.min(100,Math.round(ok/prev*100)),sequencia:streak(me)}});}
 case 'postar_conquista':{requireMe();const c=achievements(me).find(x=>x.codigo===args.codigo);if(!c)fail('Essa conquista ainda não tá liberada.');return insertPost({cliente_id:me,tipo:'conquista',texto:args.p_texto?.trim()||null,dados:c});}
 case 'postar_dica':{if(!isAdmin)fail('Opa, você não tem acesso a isso.');if(!String(args.p_texto||'').trim()&&!args.foto)fail('Escreve alguma coisa ou coloca uma foto.');return insertPost({cliente_id:null,tipo:'dica',texto:String(args.p_texto||'').trim()||null,foto_caminho:args.foto||null});}
 case 'apagar_post':{const p=db.posts.find(x=>x.id===args.pid);if(!p||!(isAdmin||(p.cliente_id&&p.cliente_id===me)))fail('Opa, você não tem acesso a isso.');db.posts=db.posts.filter(x=>x!==p);return null;}
 case 'moderar_post':{if(!isAdmin)fail('Opa, você não tem acesso a isso.');db.posts.find(x=>x.id===args.pid).oculto=Boolean(args.ocultar);return;}
 case 'curtir':{const p=db.posts.find(x=>x.id===args.pid);if(!p||!canSee(p))fail('Esse post não tá disponível.');const i=db.curtidas.findIndex(c=>c.post_id===p.id&&c.perfil_id===uid);if(i>=0){db.curtidas.splice(i,1);return false;}db.curtidas.push({post_id:p.id,perfil_id:uid});return true;}
 case 'comentar_post':{const p=db.posts.find(x=>x.id===args.pid);if(!p||!canSee(p))fail('Esse post não tá disponível.');const texto=String(args.p_texto||'').trim();if(!texto||texto.length>500)fail('O comentário precisa ter de 1 a 500 caracteres.');const row={id:id(),post_id:p.id,autor_id:uid,texto,oculto:false,criado_em:new Date().toISOString()};db.comentarios_post.push(row);return row.id;}
 case 'apagar_comentario':{const k=db.comentarios_post.find(x=>x.id===args.kid);if(!k||!(isAdmin||k.autor_id===uid))fail('Opa, você não tem acesso a isso.');db.comentarios_post=db.comentarios_post.filter(x=>x!==k);return;}
 case 'moderar_comentario':{if(!isAdmin)fail('Opa, você não tem acesso a isso.');db.comentarios_post.find(x=>x.id===args.kid).oculto=Boolean(args.ocultar);return;}
 case 'feed':{const admin=db.perfis.find(p=>p.papel==='admin');return db.posts.filter(canSee).filter(p=>(!args.p_cliente||p.cliente_id===args.p_cliente)&&(!args.p_emanuel||p.cliente_id===null)&&(!args.p_antes||p.criado_em<args.p_antes)).sort((a,b)=>b.criado_em.localeCompare(a.criado_em)).slice(0,30).map(p=>({...p,autor:p.cliente_id?{...person(p.cliente_id),nutricionista:false}:{cliente_id:null,nome:admin.nome,usuario:null,nutricionista:true},meu:Boolean(p.cliente_id&&p.cliente_id===me),curtidas:db.curtidas.filter(c=>c.post_id===p.id).length,curti:db.curtidas.some(c=>c.post_id===p.id&&c.perfil_id===uid),comentarios:db.comentarios_post.filter(k=>k.post_id===p.id&&(isAdmin||k.autor_id===uid||(!k.oculto&&(nameOf(k.autor_id).nutricionista||active(db.clientes.find(c=>c.usuario_id===k.autor_id)?.id))))).sort((a,b)=>a.criado_em.localeCompare(b.criado_em)).map(k=>({...k,meu:k.autor_id===uid,...nameOf(k.autor_id)}))}));}
 case 'perfil_comunidade':{const cid=args.cid,x=cp(cid);if(!x?.ativo)fail('Esse perfil não tá na comunidade.');if(!isAdmin&&!active(me))fail('Ativa a comunidade primeiro.');const rel=cid===me?'eu':follows(me,cid)?'seguindo':db.seguidores.some(s=>s.seguidor_id===me&&s.seguido_id===cid)?'pendente':'nenhuma';if(!isAdmin&&!['eu','seguindo'].includes(rel))return {...person(cid),relacao:rel,bloqueado:true};const semanas=Array.from({length:8},(_,i)=>{const s=shift(week,(i-7)*7);return {inicio:s,adesao:adherence(cid,s,[shift(s,6),today()].sort()[0])};});const peso=x.mostrar_peso?db.medidas.filter(m=>m.cliente_id===cid).sort((a,b)=>b.data.localeCompare(a.data))[0]?.peso??null:null;return {...person(cid),relacao:rel,bloqueado:false,dias_registrados:new Set(db.registros_refeicao.filter(r=>r.cliente_id===cid).map(r=>r.data)).size,seguidores:db.seguidores.filter(s=>s.seguido_id===cid&&s.status==='aceito'&&active(s.seguidor_id)).length,seguindo:db.seguidores.filter(s=>s.seguidor_id===cid&&s.status==='aceito'&&active(s.seguido_id)).length,sequencia:streak(cid),semanas,peso,pode_comparar:Boolean(me&&cid!==me&&follows(me,cid))};}
 case 'ranking_semanal':{requireMe();return db.comunidade_perfis.filter(x=>x.ativo&&(x.cliente_id===me||follows(me,x.cliente_id))).map(x=>({...person(x.cliente_id),eu:x.cliente_id===me,adesao:adherence(x.cliente_id,week,today())})).sort((a,b)=>(b.adesao??-1)-(a.adesao??-1)||a.nome.localeCompare(b.nome));}
 case 'comparar':{requireMe();const cid=args.cid;if(cid===me||!active(cid)||!follows(me,cid))fail('Pra comparar, você precisa seguir essa pessoa.');const sum=c=>({...person(c),adesao:adherence(c,week,today()),feitas:db.registros_refeicao.filter(r=>r.cliente_id===c&&r.status==='comi'&&r.data>=week&&r.data<=today()).length,sequencia:streak(c),dias_registrados:new Set(db.registros_refeicao.filter(r=>r.cliente_id===c).map(r=>r.data)).size});return [sum(me),sum(cid)];}
 }
}
