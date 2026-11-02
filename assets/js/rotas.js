import {cachedPage,primeReads} from './supabase.js';
// Troca de seção sem recarregar: o código e a conexão continuam vivos, só a tela muda.
const ADMIN={'/admin/index.html':'dashboard','/admin/clientes.html':'clientes','/admin/cliente.html':'cliente','/admin/alimentos.html':'alimentos','/admin/modelos.html':'modelos','/admin/comunidade.html':'comunidade-admin','/admin/perfil.html':'perfil'};
const CLIENT={'/app/hoje.html':'hoje','/app/plano.html':'plano','/app/registrar.html':'registrar','/app/evolucao.html':'evolucao','/app/ficha.html':'ficha','/app/comunidade.html':'comunidade','/app/perfil.html':'perfil','/app/configuracoes.html':'configuracoes','/app/conquistas.html':'conquistas'};
export const ROUTES={...ADMIN,...CLIENT};
// Depois desse tempo a próxima troca recarrega de verdade, pra pegar a versão nova do app.
const MAX_SESSION_MS=30*60*1000;
const loadedAt=Date.now();
let token=0,installed=false,refreshTimer;
export const navToken=()=>token;
const areaOf=path=>path.split('/')[1];
const place=()=>location.pathname+location.search;
let current=null;
async function show(path){
 token++;current=place();
 const page=ROUTES[path],mod=path.startsWith('/admin/')?await import('./admin.js'):await import('./client.js');
 await mod.boot(page);
}
function remember(){try{history.replaceState({...history.state,y:scrollY},'');}catch{/* Sem histórico: só perde a posição. */}}
export function go(url){
 const to=new URL(url,location.href);
 if(to.origin!==location.origin||!ROUTES[to.pathname]||areaOf(to.pathname)!==areaOf(location.pathname)||Date.now()-loadedAt>MAX_SESSION_MS){location.href=to.href;return;}
 remember();history.pushState(null,'',to.pathname+to.search+to.hash);
 scrollTo({top:0,behavior:'instant'});
 show(to.pathname).catch(()=>{location.href=to.href;});
}
function onClick(ev){
 if(ev.defaultPrevented||ev.button!==0||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey)return;
 const link=ev.target.closest?.('a[href]');if(!link||link.target||link.hasAttribute('download'))return;
 const to=new URL(link.href,location.href);
 if(to.origin!==location.origin||!ROUTES[to.pathname]||areaOf(to.pathname)!==areaOf(location.pathname))return;
 // Âncora dentro da mesma tela continua com o comportamento normal.
 if(to.pathname+to.search===place()&&to.hash)return;
 ev.preventDefault();go(to.href);
}
async function onPop(ev){
 if(place()===current)return;
 if(!ROUTES[location.pathname]||areaOf(location.pathname)!==areaOf(current||'')){location.reload();return;}
 await show(location.pathname);
 scrollTo({top:ev.state?.y||0,behavior:'instant'});
}
// O banco trouxe algo novo pra esta tela: redesenha, a não ser que a pessoa esteja no meio de alguma coisa.
function onDataChanged(){
 clearTimeout(refreshTimer);refreshTimer=setTimeout(async()=>{
  if(!cachedPage()||!ROUTES[location.pathname]||document.querySelector('dialog[open]'))return;
  if(document.activeElement?.matches?.('input,textarea,select'))return;
  if([...document.querySelectorAll('#content input:not([type=radio],[type=checkbox],[type=file]),#content textarea')].some(el=>el.value))return;
  const y=scrollY;await show(location.pathname).catch(()=>{});scrollTo({top:y,behavior:'instant'});
 },200);
}
export function installRouter(){
 if(installed)return;installed=true;current=place();
 document.addEventListener('click',onClick);
 addEventListener('popstate',onPop);
 addEventListener('leituras-mudaram',onDataChanged);
 setTimeout(()=>{primeReads().catch(()=>{});},1500);
}
