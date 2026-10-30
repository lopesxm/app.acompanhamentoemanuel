import {icon} from './visuals.js';
import {escapeHTML as e} from './domain.js';
import {list,rpc} from './supabase.js';
// Sininho: os avisos são criados pelo banco (007_notificacoes.sql). Atualiza a cada minuto e quando a aba volta pro foco.
export const notifButton=()=>'<button type="button" class="button ghost notif-toggle" data-notif aria-label="Notificações" aria-haspopup="dialog">'+icon('bell')+'<span class="notif-count" hidden></span></button>';
const icons={registro:'plate',foto:'camera',fuga:'chat',medidas:'scale',arquivo:'folder',ficha:'plan',comentario:'chat',resposta:'chat',plano:'plate',post:'people',comentario_post:'chat'};
let rows=[],me=null,timer;
function ago(date){
 const min=Math.round((Date.now()-new Date(date))/60000);
 if(min<1)return 'agora';if(min<60)return `há ${min} min`;
 const h=Math.round(min/60);if(h<24)return `há ${h} h`;
 const d=Math.round(h/24);return d===1?'ontem':`há ${d} dias`;
}
function paint(){
 const n=rows.filter(x=>!x.lida_em).length;
 document.querySelectorAll('[data-notif]').forEach(b=>{const badge=b.querySelector('.notif-count');badge.hidden=!n;badge.textContent=n>9?'9+':String(n);b.setAttribute('aria-label',n?`Notificações: ${n} ${n===1?'nova':'novas'}`:'Notificações');});
}
async function refresh(){
 try{rows=(await list('notificacoes',{destinatario_id:me.id})).sort((a,b)=>b.criado_em.localeCompare(a.criado_em)).slice(0,40);}catch{rows=[];}
 paint();
}
function item(x,fresh){
 return `<a data-notification="${e(x.id)}" class="notif-item ${fresh?'is-new':''}" href="${e(x.link)}"><span class="notif-icon">${icon(icons[x.tipo]||'bell')}</span><span class="notif-copy"><strong>${e(x.titulo)}</strong>${x.texto?`<span>${e(x.texto)}</span>`:''}<small>${ago(x.criado_em)}${fresh?' · nova':''}</small></span></a>`;
}
async function open(modal){
 await refresh();
 const fresh=new Set(rows.filter(x=>!x.lida_em).map(x=>x.id));
 const d=modal('Notificações',rows.length?`<div class="notif-list">${rows.map(x=>item(x,fresh.has(x.id))).join('')}</div>`:`<div class="notif-empty">${icon('bell')}<p>Nada novo por aqui. Quando ${me.papel==='admin'?'alguém registrar, postar ou responder':'o Emanuel comentar, publicar seu plano ou alguém responder'}, aparece aqui.</p></div>`);
 d.classList.add('notif-dialog');
 d.querySelectorAll('.notif-item').forEach(a=>a.addEventListener('click',async ev=>{
  ev.preventDefault();
  if(a.getAttribute('aria-busy')==='true')return;
  a.setAttribute('aria-busy','true');
  try{
   await rpc('marcar_notificacoes_lidas',{ids:[a.dataset.notification]});
   const row=rows.find(x=>x.id===a.dataset.notification);if(row)row.lida_em=new Date().toISOString();paint();
   const to=new URL(a.href);if(to.pathname===location.pathname&&to.search===location.search){location.hash=to.hash;location.reload();}else location.href=to.href;
  }catch{
   let error=d.querySelector('[data-notif-error]');if(!error){error=document.createElement('p');error.dataset.notifError='';error.setAttribute('role','alert');d.append(error);}error.textContent='Não foi possível abrir a notificação. Tente novamente.';
  }finally{a.removeAttribute('aria-busy');}
 }));
}
export function bindNotifications(p,modal){
 me=p;
 document.querySelectorAll('[data-notif]').forEach(b=>b.addEventListener('click',()=>open(modal)));
 refresh();
 clearInterval(timer);timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},60000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
}
