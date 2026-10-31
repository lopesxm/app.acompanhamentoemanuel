import {visualCard,authorPhotos,validateImage} from './profile-visual.js';
import {icon} from './visuals.js';
import {rpc,list,save,signedUrl,upload,deleteFile} from './supabase.js';
import {$,$$,field,on,toast,empty,modal,formatDate} from './ui.js';
import {escapeHTML as e,today} from './domain.js';
const initials=nome=>e(String(nome||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase());
const avatar=(nome,big=false)=>`<span class="avatar ${big?'big':''}">${initials(nome)}</span>`;
const nutriBadge='<span class="badge nutri">Nutricionista</span>';
function ago(iso){const s=(Date.now()-new Date(iso))/1000;if(s<60)return 'agora';if(s<3600)return `há ${Math.floor(s/60)} min`;if(s<86400)return `há ${Math.floor(s/3600)} h`;const d=Math.floor(s/86400);return d===1?'ontem':d<7?`há ${d} dias`:formatDate(iso);}
const profileUrl=a=>a.nutricionista?'/app/perfil.html?emanuel=1':`/app/perfil.html?id=${a.cliente_id}`;
const photo=path=>path?.startsWith('/assets/')?`<img class="post-photo" src="${e(path)}" alt="Foto da refeição">`:`<img class="post-photo" data-photo="${e(path)}" alt="Foto da refeição">`;
async function hydratePhotos(root){for(const img of $$('img[data-photo]',root)){try{img.src=await signedUrl(img.dataset.photo);img.removeAttribute('data-photo');}catch{img.alt='Não deu pra carregar a foto';}}}

function postBody(p){
 if(p.tipo==='resumo'){const d=p.dados;return `<div class="post-stats"><div><strong>${e(d.feitas)}/${e(d.previstas)}</strong><small>refeições</small></div><div><strong>${e(d.adesao)}%</strong><small>no plano</small></div><div><strong>${e(d.sequencia)}</strong><small>dias seguidos</small></div></div><small class="muted">Resumo de ${formatDate(d.dia)}</small>`;}
 if(p.tipo==='conquista')return `<div class="post-badge"><span aria-hidden="true">🏆</span><strong>${e(p.dados.titulo)}</strong></div>`;
 if(p.tipo==='foto')return `${photo(p.foto_caminho)}<div class="row" style="margin-top:10px">${p.dentro_do_plano?'<span class="badge green">✓ Dentro do plano</span>':''}${p.dados.refeicao?`<small>${e(p.dados.refeicao)}</small>`:''}</div>`;
 return p.foto_caminho?photo(p.foto_caminho):'';
}
function postHTML(p,admin){
 const a=p.autor||{nome:'Alguém'};const author=`${avatar(a.nome)}<div><strong>${e(a.nome)}</strong> ${a.nutricionista?nutriBadge:''}<br><small>${a.usuario?'@'+e(a.usuario)+' · ':''}${ago(p.criado_em)}</small></div>`;
 const tools=[admin?`<button type="button" class="button ghost" data-moderate="${p.id}" data-hide="${!p.oculto}">${p.oculto?'Mostrar':'Esconder'}</button>`:'',admin||p.meu?`<button type="button" class="button ghost" data-delete-post="${p.id}">Apagar</button>`:''].join('');
 return `<article class="card post ${p.oculto?'is-hidden':''}" data-post="${p.id}"><header class="post-head">${admin?`<div class="post-author">${author}</div>`:`<a class="post-author" href="${profileUrl(a)}">${author}</a>`}<div class="row">${tools}</div></header>${p.oculto?`<div class="notice" style="margin:14px 0 0">${admin?'Escondido: só você e o autor veem esse post.':'O Emanuel escondeu esse post. Só você ainda vê.'}</div>`:''}${p.tipo==='dica'&&p.texto?`<p class="post-tip">${e(p.texto)}</p>`:''}${postBody(p)}${p.tipo!=='dica'&&p.texto?`<p>${e(p.texto)}</p>`:''}<footer class="post-actions"><button type="button" data-like="${p.id}" aria-pressed="${p.curti}">${icon('heart')} ${p.curtidas}</button><span class="muted">${icon('chat')} ${p.comentarios.length}</span></footer><div class="comments">${p.comentarios.map(k=>`<div class="comment ${k.oculto?'is-hidden':''}"><strong>${e(k.nome)}</strong> ${k.nutricionista?nutriBadge:''} ${e(k.texto)} <small>${ago(k.criado_em)}${k.oculto?' · escondido':''}</small>${admin?`<button type="button" class="button ghost" data-moderate-comment="${k.id}" data-hide="${!k.oculto}">${k.oculto?'Mostrar':'Esconder'}</button>`:''}${admin||k.meu?`<button type="button" class="button ghost" data-delete-comment="${k.id}">Apagar</button>`:''}</div>`).join('')}<form class="comment-form" data-comment="${p.id}"><input name="texto" aria-label="Comentar" placeholder="${admin?'Comenta como Emanuel…':'Manda um comentário…'}" required maxlength="500"><button class="button secondary" type="submit">Enviar</button></form></div></article>`;
}
const PAGE=30;
// Busca páginas de 30 até chegar em `count`, para recarregar sem perder o que já estava aberto.
async function fetchPosts(args,count){let posts=[];for(;;){const page=await rpc('feed',{...args,...(posts.length?{p_antes:posts.at(-1).criado_em}:{})});posts=posts.concat(page);if(page.length<PAGE)return {posts,more:false};if(posts.length>=count)return {posts,more:true};}}
async function renderPosts(root,args,admin,emptyText,count=PAGE){
 const {posts,more}=await fetchPosts(args,count);
 const selected=root.querySelector('[data-feed-filter]')?.value||'todos';
 root.innerHTML='<label>Mostrar publicações carregadas<select data-feed-filter><option value=todos>Todas</option><option value=fotos>Com fotos</option><option value=resultados>Resumos e conquistas</option></select></label>'+(posts.length?posts.map(p=>postHTML(p,admin)).join(''):empty(emptyText))+(more?'<button type="button" class="button secondary" data-more style="width:100%">Carregar mais</button>':'');
 root.insertAdjacentHTML('beforeend','<p data-filter-empty class=muted hidden>Nenhuma publicação desse tipo entre as carregadas. Você pode carregar mais publicações.</p>');
 const filter=$('[data-feed-filter]',root);filter.value=selected;const applyFilter=()=>{$$('[data-post]',root).forEach(el=>{const p=posts.find(p=>p.id===el.dataset.post);el.hidden=filter.value==='fotos'?!p.foto_caminho:filter.value==='resultados'?!['resumo','conquista'].includes(p.tipo):false;});$('[data-filter-empty]',root).hidden=!posts.length||$$('[data-post]',root).some(el=>!el.hidden);};on(filter,'change',applyFilter);applyFilter();
 const reload=()=>renderPosts(root,args,admin,emptyText,posts.length);
 on($('[data-more]',root),'click',()=>renderPosts(root,args,admin,emptyText,posts.length+PAGE));
 $$('[data-like]',root).forEach(el=>on(el,'click',async()=>{await rpc('curtir',{pid:el.dataset.like});await reload();}));
 $$('[data-comment]',root).forEach(form=>on(form,'submit',async()=>{await rpc('comentar_post',{pid:form.dataset.comment,p_texto:new FormData(form).get('texto')});await reload();}));
 $$('[data-delete-post]',root).forEach(el=>on(el,'click',async()=>{if(!confirm('Apagar esse post?'))return;const file=await rpc('apagar_post',{pid:el.dataset.deletePost});if(file)await deleteFile(file);toast('Post apagado.');await reload();}));
 $$('[data-delete-comment]',root).forEach(el=>on(el,'click',async()=>{await rpc('apagar_comentario',{kid:el.dataset.deleteComment});await reload();}));
 $$('[data-moderate]',root).forEach(el=>on(el,'click',async()=>{await rpc('moderar_post',{pid:el.dataset.moderate,ocultar:el.dataset.hide==='true'});await reload();}));
 $$('[data-moderate-comment]',root).forEach(el=>on(el,'click',async()=>{await rpc('moderar_comentario',{kid:el.dataset.moderateComment,ocultar:el.dataset.hide==='true'});await reload();}));
 await hydratePhotos(root);
 await authorPhotos(root,posts);
 return posts;
}

// Cliente
async function memberBrotherhood(root,c,p){
 const state=await rpc('minha_comunidade');
 if(!state.perfil?.ativo){await activation(root,c,state.perfil,()=>memberBrotherhood(root,c,p));const group=document.createElement('div');group.style.marginTop='24px';root.append(group);await groupTab(group);return;}
 const tabs=[['feed','Feed'],['ranking','Ranking'],['amigos',`Amigos${state.pedidos.length?` (${state.pedidos.length})`:''}`],['grupo','Grupo do WhatsApp']];
 const target=location.hash.startsWith('#post-')?location.hash.slice(6):null;
 const current=tabs.some(([k])=>k===location.hash.slice(1))?location.hash.slice(1):'feed';
 root.innerHTML=`<div class="row" style="justify-content:space-between"><div class="tabs" role="tablist" style="margin:0">${tabs.map(([k,t])=>`<button role="tab" data-tab="${k}" class="${k===current?'active':''}" aria-selected="${k===current}">${t}</button>`).join('')}</div><a class="button secondary" href="/app/perfil.html">Meu perfil</a></div><div id="community-tab" style="margin-top:24px"></div>`;
 const show=async k=>{history.replaceState(null,'','#'+k);$$('[data-tab]',root).forEach(el=>{el.classList.toggle('active',el.dataset.tab===k);el.setAttribute('aria-selected',String(el.dataset.tab===k));});const pane=$('#community-tab',root);if(k==='feed')await feedTab(pane,c,state,()=>memberBrotherhood(root,c,p));if(k==='ranking')await rankingTab(pane);if(k==='amigos')await friendsTab(pane,state,()=>memberBrotherhood(root,c,p));if(k==='grupo')await groupTab(pane);};
 $$('[data-tab]',root).forEach(el=>on(el,'click',()=>show(el.dataset.tab)));
 await show(current);
 focusPost(root,target);
}
// Veio de uma notificação: rola até o post e destaca.
function focusPost(root,id){
 if(!id)return;const el=$$('[data-post]',root).find(x=>x.dataset.post===id);
 if(el){el.scrollIntoView({block:'center'});el.classList.add('post-highlight');}
}
async function groupTab(pane){
 let link=null;try{link=await rpc('grupo_whatsapp');}catch{/* Banco sem a atualização 007: mostra o aviso padrão. */}
 pane.innerHTML=`<section class="card whatsapp-card"><div class="whatsapp-head"><span class="whatsapp-icon">${icon('whatsapp')}</span><div><h2>Grupo do WhatsApp</h2><p class="muted">O papo com o Emanuel e a comunidade, direto no seu WhatsApp.</p></div></div>${link?`<a class="button" href="${e(link)}" target="_blank" rel="noopener">Entrar no grupo ↗</a><small class="muted">Abre o WhatsApp. Lá dentro valem as mesmas regras de respeito da comunidade.</small>`:'<div class="notice">O Emanuel ainda não colocou o link do grupo. Assim que ele colocar, aparece aqui.</div>'}</section>`;
}
const WHATSAPP_GROUP=/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/;
async function groupSettings(root,p){
 const cfg=(await list('configuracoes'))[0];
 root.innerHTML=`<section class="card whatsapp-card"><div class="whatsapp-head"><span class="whatsapp-icon">${icon('whatsapp')}</span><div><h2>Grupo do WhatsApp</h2><p class="muted">Cola aqui o link de convite do grupo. Os clientes veem um botão pra entrar na aba "Grupo do WhatsApp" da comunidade.</p></div></div><form id="group-form">${field('grupo_whatsapp','Link do grupo',cfg?.grupo_whatsapp||'','url')}<p class="muted" style="margin-top:-8px">No WhatsApp: abre o grupo → nome do grupo → Convidar via link → Copiar link. Deixa vazio pra tirar o botão.</p><div class="row"><button class="button" type="submit">Salvar link</button>${cfg?.grupo_whatsapp?`<a class="button ghost" href="${e(cfg.grupo_whatsapp)}" target="_blank" rel="noopener">Testar link ↗</a>`:''}</div></form></section>`;
 $('[name=grupo_whatsapp]',root).placeholder='https://chat.whatsapp.com/…';
 on($('#group-form',root),'submit',async()=>{
  let link=String(new FormData($('#group-form',root)).get('grupo_whatsapp')||'').trim().split(/[?#]/)[0].replace(/\/$/,'');
  if(link&&!WHATSAPP_GROUP.test(link))throw Error('Esse link não parece de grupo do WhatsApp. Ele começa com https://chat.whatsapp.com/');
  await save('configuracoes',{nutricionista_id:p.id,...(cfg?{}:{sem_registro_dias:3,adesao_minima:60}),grupo_whatsapp:link||null},'nutricionista_id');
  toast(link?'Link do grupo salvo ✓':'Botão do grupo removido.');await groupSettings(root,p);
 });
}
function activation(root,c,previous,done){
 const first=c.nome.split(' ')[0];const suggestion=(previous?.usuario||first.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9_.]/g,'')).slice(0,20);
 root.innerHTML=`<section class="card"><h2>Bora entrar na comunidade?</h2><p class="muted">Aqui você divide sua jornada com quem você segue e acompanha os posts do Emanuel. É opcional: você ativa se quiser e pode sair quando quiser.</p><div class="grid" style="margin:20px 0"><div><strong>Pode ir pro feed (só quando você postar)</strong><ul><li>Fotos das refeições do seu diário</li><li>Resumo do dia, só com números</li><li>Conquistas, tipo "7 dias seguidos"</li></ul></div><div><strong>Nunca vai pro feed</strong><ul><li>Sua ficha</li><li>As quantidades da sua dieta</li><li>O que você comeu fora do plano</li><li>Suas medidas</li></ul></div></div><p class="muted">Seu perfil só é visto por quem você aceitar. O Emanuel vê tudo e pode esconder posts. Seu peso só aparece se você ligar a opção abaixo.</p><form id="activate">${field('nome','Nome que aparece pra comunidade',previous?.nome||first,'text',{required:true})}${field('usuario','Seu @',suggestion,'text',{required:true})}<label class="row"><input type="checkbox" name="mostrar_peso" ${previous?.mostrar_peso?'checked':''}> Mostrar meu peso no perfil</label><label class="row" style="margin-top:12px"><input type="checkbox" name="ok" required> Entendi o que vai e o que não vai pra comunidade, e quero ativar.</label><button class="button" type="submit" style="margin-top:18px">Ativar comunidade</button></form></section>`;
 on($('#activate',root),'submit',async()=>{const f=new FormData($('#activate',root));await rpc('ativar_comunidade',{p_usuario:f.get('usuario'),p_nome:f.get('nome'),p_mostrar_peso:f.get('mostrar_peso')==='on'});toast('Você tá na comunidade! 🎉');await done();});
}
async function feedTab(pane,c,state,refresh){
 const [myPhotos,myPosts]=await Promise.all([list('fotos_refeicao',{cliente_id:c.id}),rpc('feed',{p_cliente:c.id})]);
 const shared=new Set(myPosts.map(x=>x.foto_caminho).filter(Boolean));const recent=myPhotos.filter(x=>x.data>=new Date(Date.now()-7*86400000).toLocaleDateString('en-CA')&&!shared.has(x.caminho_storage));
 pane.innerHTML=`<section class="card composer"><div class="composer-tiles"><label class="composer-tile is-photo">${icon('camera')}<span>Foto</span><input type="file" id="feed-photo" accept="image/jpeg,image/png,image/webp" class="visually-hidden"></label><button type="button" class="composer-tile is-day" id="share-day">${icon('chart')}<span>Resumo do dia</span></button>${state.conquistas.map(x=>`<button type="button" class="composer-tile is-badge" data-achievement="${e(x.codigo)}"><b aria-hidden="true">🏆</b><span>${e(x.titulo)}</span></button>`).join('')}</div><input name="legenda" class="composer-caption" aria-label="Legenda (opcional)" placeholder="Legenda (opcional)"><small class="muted">Só quem você aceitou e o Emanuel veem. Nada é postado sozinho.</small>${recent.length?`<div class="share-thumbs" style="margin-top:14px">${recent.map(x=>`<div><img class="post-photo" data-photo="${e(x.caminho_storage)}" alt="Foto do seu diário"><button type="button" class="button ghost" data-share-photo="${x.id}">Compartilhar ↗</button></div>`).join('')}</div>`:''}</section><div id="posts" style="margin-top:24px"></div>`;
 const caption=()=>$('[name=legenda]',pane).value||null;
 on($('#feed-photo',pane),'change',async()=>{
 const file=$('#feed-photo',pane).files[0];if(!file)throw Error('Escolha uma foto para publicar.');validateImage(file);
 const path=await upload(c.id,file);let photo;
 try{photo=await save('fotos_refeicao',{cliente_id:c.id,data:today(),caminho_storage:path,registro_id:null});}catch(err){await deleteFile(path);throw err;}
 try{await rpc('postar_foto',{foto:photo.id,p_texto:caption()});}catch(err){throw Error('Foto salva no diário, mas não publicada. Você pode tentar compartilhá-la abaixo. '+err.message);}
 toast('Foto no feed ✓');await refresh();
 });
 on($('#share-day',pane),'click',async()=>{await rpc('postar_resumo',{dia:today(),p_texto:caption()});toast('Resumo no feed ✓');await refresh();});
 $$('[data-achievement]',pane).forEach(el=>on(el,'click',async()=>{await rpc('postar_conquista',{codigo:el.dataset.achievement,p_texto:caption()});toast('Conquista no feed! 🏆');await refresh();}));
 $$('[data-share-photo]',pane).forEach(el=>on(el,'click',async()=>{await rpc('postar_foto',{foto:el.dataset.sharePhoto,p_texto:caption()});toast('Foto no feed ✓');await refresh();}));
 await hydratePhotos($('.composer',pane));
 await renderPosts($('#posts',pane),{},false,'Ainda não há publicações. Encontre pessoas na aba Amigos ou compartilhe seu resumo do dia.');
}
async function rankingTab(pane){
 const rows=await rpc('ranking_semanal');const medal=['🥇','🥈','🥉'];
 pane.innerHTML=`<section class="card"><h2>Ranking da semana</h2><p class="muted">Adesão ao plano entre você e quem você segue. Zera toda segunda.</p><ol class="ranking">${rows.map((r,i)=>`<li class="${r.eu?'me':''}"><span class="position">${medal[i]||i+1}</span>${avatar(r.nome)}<div><strong>${e(r.nome)}${r.eu?' (você)':''}</strong><br><small>@${e(r.usuario)}</small></div><div class="ranking-bar"><span style="width:${r.adesao||0}%"></span></div><strong>${r.adesao===null?'—':r.adesao+'%'}</strong></li>`).join('')}</ol>${rows.length<2?'<p class="muted">Segue mais gente na aba Amigos pra ranking ficar disputado 👀</p>':''}</section>`;
}
async function friendsTab(pane,state,refresh){
 const row=(x,buttons)=>`<div class="alert-item"><a class="post-author" href="/app/perfil.html?id=${x.cliente_id}">${avatar(x.nome)}<div><strong>${e(x.nome)}</strong><br><small>@${e(x.usuario)}</small></div></a><div class="row">${buttons}</div></div>`;
 const me=state.perfil;
 pane.innerHTML=`<section class="card"><h2>Achar alguém</h2><form id="search" class="row">${'<input name="usuario" aria-label="@ da pessoa" placeholder="@usuario" required style="flex:1">'}<button class="button" type="submit">Buscar</button></form><div id="search-result"></div></section>
 ${state.pedidos.length?`<section class="card" style="margin-top:20px"><h2>Pedidos pra te seguir</h2>${state.pedidos.map(x=>row(x,`<button class="button" data-accept="${x.cliente_id}">Aceitar</button><button class="button ghost" data-remove="${x.cliente_id}">Recusar</button>`)).join('')}</section>`:''}
 <div class="grid" style="margin-top:20px"><section class="card"><h2>Seguindo</h2>${state.seguindo.map(x=>row(x,`${x.status==='pendente'?'<span class="badge">Pedido enviado</span>':''}<button class="button ghost" data-unfollow="${x.cliente_id}">${x.status==='pendente'?'Cancelar':'Deixar de seguir'}</button>`)).join('')||empty('Você ainda não segue ninguém.')}</section><section class="card"><h2>Seguidores</h2>${state.seguidores.map(x=>row(x,`<button class="button ghost" data-remove="${x.cliente_id}">Remover</button>`)).join('')||empty('Ninguém te segue ainda.')}</section></div>
 <section class="card" style="margin-top:20px"><h2>Seu perfil na comunidade</h2><form id="settings">${field('nome','Nome que aparece',me.nome,'text',{required:true})}${field('usuario','Seu @',me.usuario,'text',{required:true})}<label class="row"><input type="checkbox" name="mostrar_peso" ${me.mostrar_peso?'checked':''}> Mostrar meu peso no perfil</label><div class="row" style="margin-top:18px"><button class="button" type="submit">Salvar</button><button class="button ghost" type="button" id="leave">Sair da comunidade</button></div></form></section>`;
 on($('#search',pane),'submit',async()=>{const found=await rpc('buscar_perfil',{p_usuario:new FormData($('#search',pane)).get('usuario')});const box=$('#search-result',pane);if(!found){box.innerHTML='<p class="muted">Não achei ninguém com esse @ na comunidade.</p>';return;}box.innerHTML=row(found,found.relacao==='nenhuma'?`<button class="button" data-follow="${found.cliente_id}">Pedir pra seguir</button>`:`<span class="badge">${found.relacao==='seguindo'?'Seguindo':'Pedido enviado'}</span>`);on($('[data-follow]',box),'click',async()=>{const r=await rpc('pedir_para_seguir',{cid:found.cliente_id});toast(r==='demo-aceito'?'Na demonstração, o pedido é aceito na hora ✓':'Pedido enviado! Agora é esperar aceitar.');await refresh();});});
 $$('[data-accept]',pane).forEach(el=>on(el,'click',async()=>{await rpc('aceitar_seguidor',{cid:el.dataset.accept});toast('Aceito ✓');await refresh();}));
 $$('[data-remove]',pane).forEach(el=>on(el,'click',async()=>{await rpc('remover_seguidor',{cid:el.dataset.remove});await refresh();}));
 $$('[data-unfollow]',pane).forEach(el=>on(el,'click',async()=>{await rpc('deixar_de_seguir',{cid:el.dataset.unfollow});await refresh();}));
 on($('#settings',pane),'submit',async()=>{const f=new FormData($('#settings',pane));await rpc('ativar_comunidade',{p_usuario:f.get('usuario'),p_nome:f.get('nome'),p_mostrar_peso:f.get('mostrar_peso')==='on'});toast('Salvo ✓');await refresh();});
 on($('#leave',pane),'click',async()=>{if(!confirm('Sair da comunidade? Seus posts e seu perfil somem pra comunidade até você ativar de novo.'))return;await rpc('desativar_comunidade');toast('Você saiu da comunidade.');await refresh();});
}
// Tela Hoje: quando todas as refeições do dia foram marcadas, sugere postar (sem postar nada sozinho).
export async function dayClosedPrompt(el,c){
 el.innerHTML='';let state;try{state=await rpc('minha_comunidade');}catch{return;}
 if(!state.perfil?.ativo)return;
 const mine=await rpc('feed',{p_cliente:c.id});const posted=mine.some(x=>x.tipo==='resumo'&&x.dados.dia===today());
 if(posted&&!state.conquistas.length)return;
 el.innerHTML=`<section class="card share-prompt"><h2>Dia fechado! 🎉</h2><p class="muted">Quer mostrar pra comunidade? Só vai o que você escolher.</p><div class="row">${posted?'':`<button type="button" class="button" id="prompt-day">${icon('chart')} Postar resumo do dia</button>`}${state.conquistas.map(x=>`<button type="button" class="button secondary" data-prompt-achievement="${e(x.codigo)}">🏆 ${e(x.titulo)}</button>`).join('')}<button type="button" class="button ghost" id="prompt-close">Agora não</button></div></section>`;
 on($('#prompt-day',el),'click',async()=>{await rpc('postar_resumo',{dia:today(),p_texto:null});toast('Resumo no feed ✓');await dayClosedPrompt(el,c);});
 $$('[data-prompt-achievement]',el).forEach(b=>on(b,'click',async()=>{await rpc('postar_conquista',{codigo:b.dataset.promptAchievement,p_texto:null});toast('Conquista no feed! 🏆');await dayClosedPrompt(el,c);}));
 on($('#prompt-close',el),'click',()=>{el.innerHTML='';});
}
const profileHead=x=>`<div class="profile-head">${avatar(x.nome,true)}<div><h2 style="margin:0">${e(x.nome)}</h2><small>@${e(x.usuario)}</small></div></div>`;
const profileStats=x=>`<div class="counters"><div><strong>${e(x.dias_registrados)}</strong><small>dias registrados</small></div><div><strong>${e(x.seguidores)}</strong><small>seguidores</small></div><div><strong>${e(x.seguindo)}</strong><small>seguindo</small></div></div><div class="chips">${x.sequencia?`<span class="chip">🔥 ${e(x.sequencia)} dias seguidos</span>`:''}${x.peso!=null?`<span class="chip">⚖️ ${e(String(x.peso).replace('.',','))} kg</span>`:''}</div>`;
function weeklyChart(weeks=[]){
 const recent=weeks.slice(-4).reverse();
 return `<p class="muted">Refeições marcadas como realizadas em relação às previstas. A falta de registro não significa que o plano não foi seguido.</p><div class="simple-weeks">${recent.map((s,i)=>`<div><span>${i===0?'Esta semana':'Semana de '+formatDate(s.inicio)}</span><strong>${s.adesao==null?'Sem registros suficientes':e(s.adesao)+'% registrado'}</strong></div>`).join('')}</div>`;
}
export async function profilePage(root,c,p){
 const params=new URLSearchParams(location.search);
 if(params.has('emanuel')){
  $('h1').textContent='Emanuel';
  root.innerHTML=`<section class="card profile-head">${avatar('Emanuel',true)}<div><h2 style="margin:0">Emanuel ${nutriBadge}</h2><p class="muted">Dicas e conteúdos pra toda a comunidade.</p></div></section><div id="posts" style="margin-top:24px"></div>`;
  root.insertAdjacentHTML('afterbegin','<div id=visual-profile></div>');await visualCard($('#visual-profile',root),{emanuel:true});
  await renderPosts($('#posts',root),{p_emanuel:true},false,'O Emanuel ainda não postou nada.');return;
 }
 let cid=params.get('id');
 if(!cid){const state=await rpc('minha_comunidade');if(!state.perfil?.ativo){root.innerHTML='<div id=visual-profile></div><section class=card><h2>Comunidade opcional</h2><p>Você pode personalizar seu perfil sem participar da comunidade.</p><a class=button href=/app/comunidade.html>Conhecer comunidade</a></section>';await visualCard($('#visual-profile',root),{},true);return;}cid=c.id;}
 const x=await rpc('perfil_comunidade',{cid});
 $('h1').textContent=x.nome;
 const head=profileHead(x);
 if(x.bloqueado){
  root.innerHTML=`<section class="card">${head}<p style="margin-top:20px">🔒 Esse perfil é fechado. Só quem segue vê os números e os posts.</p>${x.relacao==='pendente'?'<span class="badge">Pedido enviado</span>':'<button class="button" id="follow">Pedir pra seguir</button>'}</section>`;
  on($('#follow',root),'click',async()=>{const r=await rpc('pedir_para_seguir',{cid});toast(r==='demo-aceito'?'Na demonstração, o pedido é aceito na hora ✓':'Pedido enviado!');await profilePage(root,c,p);});return;
 }
 root.innerHTML=`<section class="card">${head}${profileStats(x)}<div class="row" style="margin-top:18px">${x.pode_comparar?'<button class="button" id="compare">Comparar</button>':''}${x.relacao==='seguindo'?'<button class="button ghost" id="unfollow">Deixar de seguir</button>':''}${x.relacao==='eu'?'<a class="button secondary" href="/app/comunidade.html#amigos">Configurações da comunidade</a>':''}</div></section><section class="card" style="margin-top:20px"><h2>Sua rotina nas últimas semanas</h2>${weeklyChart(x.semanas)}</section><div id="posts" style="margin-top:24px"></div>`;
 on($('#unfollow',root),'click',async()=>{await rpc('deixar_de_seguir',{cid});await profilePage(root,c,p);});
 on($('#compare',root),'click',async()=>{const [a,b]=await rpc('comparar',{cid});const rows=[['Adesão da semana','adesao','%'],['Refeições na semana','feitas',''],['Dias seguidos','sequencia',''],['Dias registrados','dias_registrados','']];modal('Comparar',`<table class="compare"><thead><tr><th></th><th>${e(a.nome)}<br><small>você</small></th><th>${e(b.nome)}</th></tr></thead><tbody>${rows.map(([label,k,suffix])=>{const va=a[k]??0,vb=b[k]??0;return `<tr><td>${label}</td><td class="${va>vb?'win':''}">${a[k]??'—'}${a[k]==null?'':suffix}</td><td class="${vb>va?'win':''}">${b[k]??'—'}${b[k]==null?'':suffix}</td></tr>`;}).join('')}</tbody></table><p class="muted"><small>A semana zera toda segunda.</small></p>`);});
 root.insertAdjacentHTML('afterbegin','<div id=visual-profile></div>');await visualCard($('#visual-profile',root),{cid},x.relacao==='eu');
 await renderPosts($('#posts',root),{p_cliente:cid},false,x.relacao==='eu'?'Você ainda não postou nada. Bora estrear?':'Nenhum post por aqui ainda.');
}

// Emanuel
// Aba Comunidade no perfil do cliente: o mesmo perfil que os seguidores veem, com moderação dos posts.
export async function adminClientCommunity(pane,c){
 let x;try{x=await rpc('perfil_comunidade',{cid:c.id});}catch{pane.innerHTML=`<section class="card">${empty('Esse cliente ainda não ativou a comunidade.')}</section>`;return;}
 pane.innerHTML=`<section class="card">${profileHead(x)}${profileStats(x)}</section><section class="card" style="margin-top:20px"><h2>Sua rotina nas últimas semanas</h2>${weeklyChart(x.semanas)}</section><div id="client-posts" style="margin-top:24px"></div>`;
 await renderPosts($('#client-posts',pane),{p_cliente:c.id},true,'Esse cliente ainda não postou nada.');
}
async function adminBrotherhood(root,p){
 const target=location.hash.startsWith('#post-')?location.hash.slice(6):null;
 root.innerHTML=`<div id=visual-profile></div><div id="group-settings" style="margin-bottom:24px"></div><section class="card composer"><h2>Postar pra comunidade</h2><p class="muted">Seus posts aparecem pra todo cliente que ativou a comunidade. Os posts dos clientes entram direto, e você pode esconder o que não estiver legal.</p><form id="tip">${field('texto','Dica, desafio ou recado','','textarea')}<div class="field"><label for="tip-photo">Foto (opcional)</label><input id="tip-photo" name="file" type="file" accept="image/jpeg,image/png,image/webp"></div><button class="button" type="submit">Postar</button></form></section><div id="posts" style="margin-top:24px"></div>`;
 on($('#tip',root),'submit',async()=>{const f=new FormData($('#tip',root));const file=f.get('file');if(file?.size)validateImage(file);let path=null;if(file&&file.size)path=await upload(`comunidade/${p.id}`,file);try{await rpc('postar_dica',{p_texto:f.get('texto'),foto:path});}catch(err){if(path)await deleteFile(path);throw err;}toast('Post no ar! 🚀');await adminBrotherhood(root,p);});
 await visualCard($('#visual-profile',root),{},true);
 await groupSettings($('#group-settings',root),p);
 await renderPosts($('#posts',root),{},true,'Ninguém postou ainda. Que tal começar com uma dica?');
 focusPost(root,target);
}

const societySections=[
 ['mission','My Mission','Meus objetivos','Defina o que você quer alcançar e alinhe seus objetivos com o acompanhamento.'],
 ['progress','My Progress','Minha evolução','Acompanhe medidas, registros e mudanças ao longo do tempo.'],
 ['grind','The Grind','Minha rotina diária','Registre suas refeições e mantenha os compromissos do dia em vista.'],
 ['standard','The Standard','Minha consistência','Observe sua frequência de registros e a adesão ao plano.'],
 ['challenges','Society Challenges','Desafios coletivos','Um espaço para propostas de participação e evolução em comunidade.'],
 ['brotherhood','The Society','Comunidade e conexões','Compartilhe experiências, interaja com os membros e acompanhe os recados da equipe.']
];
export async function communityPage(root,c,p){await societyHub(root,p,pane=>memberBrotherhood(pane,c,p));}
export async function adminCommunity(root,p){await societyHub(root,p,pane=>adminBrotherhood(pane,p));}
async function societyHub(root,p,brotherhood){
 const admin=p.papel==='admin';
 root.innerHTML=`<div class="society-sections" role="tablist" aria-label="Áreas da Grinders Society">${societySections.map(([key,title,label])=>`<button type="button" role="tab" id="society-${key}" data-society="${key}" aria-selected="${key==='brotherhood'}" aria-controls="society-panel"><strong>${title}</strong><span>${label}</span></button>`).join('')}</div><section id="society-panel" role="tabpanel" aria-labelledby="society-brotherhood"></section>`;
 const panel=$('#society-panel',root);
 const show=async key=>{
  const section=societySections.find(x=>x[0]===key);
  $$('[data-society]',root).forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.society===key));});
  panel.setAttribute('aria-labelledby','society-'+key);
  panel.innerHTML=`<header class="society-heading"><h2>${section[1]}</h2><p>${section[3]}</p></header><div data-society-content></div>`;
  const content=$('[data-society-content]',panel);
  if(key==='brotherhood'){await brotherhood(content);return;}
  const routes={mission:['/app/ficha.html','Ver meus objetivos'],progress:['/app/evolucao.html','Ver minha evolução'],grind:['/app/hoje.html','Ver minha rotina'],standard:['/app/evolucao.html','Ver minha consistência']};
  if(key==='challenges'){
   content.innerHTML=`<section class="card"><span class="badge">Em preparação</span><h3>Desafios da Society</h3><p>Por enquanto, os desafios podem ser divulgados nas publicações da comunidade. Inscrição, metas coletivas e acompanhamento dos participantes ainda não estão disponíveis.</p><button class="button secondary" data-open-brotherhood>Ver publicações da comunidade</button></section>`;
   on($('[data-open-brotherhood]',content),'click',()=>show('brotherhood'));return;
  }
  const [href,label]=admin?['/admin/clientes.html','Escolher um cliente']:routes[key];
  const text=admin?'Abra o perfil de um cliente para consultar seus objetivos, evolução e registros.':key==='mission'?'Seu objetivo informado na ficha orienta o acompanhamento nutricional.':key==='progress'?'Veja as medidas e os resultados registrados no seu acompanhamento.':key==='grind'?'Consulte as refeições previstas e registre o que fez hoje.':'Veja a adesão e os dias registrados. A consistência é acompanhada a partir dos seus registros.';
  content.innerHTML=`<section class="card"><h3>${section[2]}</h3><p>${text}</p><a class="button" href="${href}">${label} →</a></section>`;
 };
 $$('[data-society]',root).forEach((button,index)=>{on(button,'click',()=>show(button.dataset.society));button.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();const buttons=$$('[data-society]',root),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();buttons[next].click();});});
 await show('brotherhood');
}
