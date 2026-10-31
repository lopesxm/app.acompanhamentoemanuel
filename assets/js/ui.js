import {brandLink,brandArt} from './brand.js';
import {initMotion} from './motion.js';
import {icon,heroArt} from './visuals.js';
import {escapeHTML as e} from './domain.js';
import {isDemo,signOut,rpc,signedUrl} from './supabase.js';
import {notifButton,bindNotifications} from './notificacoes.js';
export const $=(s,root=document)=>root.querySelector(s);
export const $$=(s,root=document)=>[...root.querySelectorAll(s)];
export const empty=(text='Nada por aqui ainda.')=>`<div class="empty"><span class="empty-art">${icon('leaf')}</span><p>${e(text)}</p></div>`;
export const button=(text,action,secondary=false)=>`<button type="button" class="button ${secondary?'secondary':''}" data-action="${action}">${e(text)}</button>`;
export function field(name,label,value='',type='text',options={}){const attr=`name="${name}" id="f-${name}" ${options.required?'required':''}`;return `<div class="field ${options.full?'full':''}"><label for="f-${name}">${e(label)}${options.required?' *':''}</label>${type==='textarea'?`<textarea ${attr}>${e(value)}</textarea>`:type==='select'?`<select ${attr}>${(options.choices||[]).map(c=>{const [v,l]=Array.isArray(c)?c:[c,c];return `<option value="${e(v)}" ${value===v?'selected':''}>${e(l)}</option>`;}).join('')}</select>`:`<input ${attr} type="${type}" value="${e(value)}" ${type==='number'?'step="any" min="0"':''} ${type==='password'?'minlength="8" autocomplete="new-password"':''}>`}</div>`;}
export function toast(text){$('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.role='status';el.textContent=text;document.body.append(el);setTimeout(()=>el.remove(),6000);}
export async function safe(fn,el){try{if(el){el.disabled=true;if(el.tagName==='BUTTON')el.setAttribute('aria-busy','true');}return await fn();}catch(err){toast(err.message||'Ih, tá zuado isso aqui. Tenta de novo?');console.error(err);}finally{if(el){el.disabled=false;el.removeAttribute('aria-busy');}}}
export function on(el,event,fn){el?.addEventListener(event,ev=>{if(event==='submit')ev.preventDefault();safe(()=>fn(ev),event==='submit'?el.querySelector('[type=submit]'):ev.currentTarget);});}
export function modal(title,content){$('dialog')?.remove();const d=document.createElement('dialog');d.innerHTML=`<div class="title-row"><h2>${e(title)}</h2><button type="button" class="button ghost" aria-label="Fechar">×</button></div>${content}`;document.body.append(d);$('.ghost',d).onclick=()=>d.close();d.showModal();return d;}
// Botão de modo claro/escuro: a escolha fica salva neste aparelho (theme.js aplica antes de pintar).
export const themeButton=()=>'<button type="button" class="button ghost theme-toggle" data-theme-toggle></button>';
export function bindThemeToggles(root=document){
 const paint=()=>{const dark=document.documentElement.dataset.theme==='escuro';$$('[data-theme-toggle]',root).forEach(b=>{b.innerHTML=icon(dark?'sun':'moon');b.setAttribute('aria-label',dark?'Usar modo claro':'Usar modo escuro');b.setAttribute('aria-pressed',String(dark));});document.querySelector('meta[name=theme-color]')?.setAttribute('content',dark?'#0B0B0B':'#F2F0E9');};
 $$('[data-theme-toggle]',root).forEach(b=>b.onclick=()=>{const t=document.documentElement.dataset.theme==='escuro'?'claro':'escuro';document.documentElement.dataset.theme=t;try{localStorage.setItem('tema',t);}catch{}paint();});
 paint();
}
export function shell(p,title,subtitle='',action='') {
 const admin=p.papel==='admin';
 const links=admin?[['index','dashboard','Visão geral'],['clientes','people','Clientes'],['alimentos','leaf','Banco de alimentos'],['modelos','folder','Modelos'],['comunidade','chat','Comunidade']]:[['hoje','home','Início'],['plano','plate','Plano alimentar'],['registrar','record','Registrar'],['evolucao','chart','Evolução'],['comunidade','people','Comunidade'],['perfil','people','Perfil'],['ficha','plan','Minha ficha']];
 const current=location.pathname.split('/').pop().replace('.html','');
 const brand=brandLink('/'+(admin?'admin/index':'app/hoje')+'.html');
 const nav=links.map(([path,glyph,text])=>`<a class="${current===path?'active':''}" ${current===path?'aria-current="page"':''} href="/${admin?'admin':'app'}/${path}.html">${icon(glyph)}<span>${text}</span></a>`).join('');
 const initials=e(p.nome.split(' ').map(x=>x[0]).slice(0,2).join(''));
 document.body.dataset.role=p.papel;document.body.dataset.screen=current;
 document.body.innerHTML=`<header class="mobile-header"><div class="header-actions">${notifButton()}${themeButton()}<button class="button ghost" id="open-menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="main-sidebar">☰</button></div>${admin?brand:`<a class="mobile-identity" href="/app/perfil.html"><span class="avatar" data-shell-avatar>${initials}</span><span><strong data-shell-name>${e(p.nome.split(' ')[0])}</strong><small>Seu acompanhamento</small></span></a>`}</header><div class="drawer-shade" hidden></div><aside class="sidebar" id="main-sidebar"><div class="sidebar-brand">${brand}<button class="button ghost" id="close-menu" aria-label="Fechar menu">×</button></div><nav aria-label="Navegação principal">${nav}<a href="/equipe.html">${icon('people')}<span>Nossa equipe</span></a></nav><div class="account"><a class="account-profile" href="/${admin?'admin':'app'}/perfil.html" aria-label="Editar meu perfil"><span class="avatar" data-shell-avatar>${initials}</span><span><strong data-account-name>${e(p.nome)}</strong><small>${admin?'Nutricionista':'Meu acompanhamento'}</small></span></a>${notifButton()}${themeButton()}<button class="button ghost" id="logout" aria-label="Sair da conta">↗</button></div></aside><main class="${admin?'workspace':'client-shell'}"><div class="title-row page-heading"><div class="heading-copy"><h1>${e(title)}</h1><p class="muted">${e(subtitle)}</p></div>${action}</div><div class="app-columns"><div class="main-column"><div id="content"></div><footer>Grinders Society · <a href="/equipe.html">Nossa equipe</a> · <a href="/privacidade.html">Privacidade</a></footer></div>${admin?'':`<aside class="context-rail"><section class="card profile-summary"><span class="avatar">${initials}</span><h2>${e(p.nome)}</h2><p class="muted">Seu espaço de acompanhamento</p><a class="button secondary" href="/app/perfil.html">Ver meu perfil</a></section><section class="card"><h2>Seu acompanhamento</h2><a class="rail-link" href="/app/plano.html">${icon('plate')} Plano alimentar <span>→</span></a><a class="rail-link" href="/app/evolucao.html">${icon('chart')} Evolução <span>→</span></a><a class="rail-link" href="/app/ficha.html">${icon('plan')} Minha ficha <span>→</span></a></section><section class="card"><h2>Compartilhe sua jornada</h2><p class="muted">Veja as publicações da comunidade e acompanhe quem inspira você.</p><a class="button secondary" href="/app/comunidade.html">Ver comunidade</a></section></aside>`}</div></main>${admin?'':`<nav class="floating-nav" aria-label="Atalhos principais">${[['hoje','home','Início'],['plano','plate','Plano'],['registrar','record','Registrar'],['comunidade','chat','Comunidade'],['perfil','people','Perfil']].map(([path,glyph,label])=>`<a href="/app/${path}.html" aria-label="${label}" ${current===path?'aria-current="page"':''}>${icon(glyph)}<span>${label}</span></a>`).join('')}</nav>`}`;
 if(p.desenvolvedor){
  sessionStorage.setItem('grinders-dev-view',admin?'admin':'cliente');
  const bar=document.createElement('div');bar.className='developer-access';bar.setAttribute('role','region');bar.setAttribute('aria-label','Acesso de desenvolvimento');
  bar.innerHTML=`<div><strong>Desenvolvimento · lopesxm</strong><small>${admin?'Visão administrativa do Emanuel · alterações em dados reais':'Visão de cliente · seu cadastro Junior'}</small></div><a class="button secondary" href="${admin?'/app/hoje.html':'/admin/index.html'}">${admin?'Ver como cliente':'Ver como Emanuel'}</a>`;
  $('main').prepend(bar);
 }
 on($('#logout'),'click',signOut);bindThemeToggles();bindNotifications(p,modal);
 const sidebar=$('#main-sidebar'),trigger=$('#open-menu'),shade=$('.drawer-shade');
 const mobile=matchMedia('(max-width:700px)');
 const main=$('main'),header=$('.mobile-header');
 function toggleMenu(open,restoreFocus=true){
  document.body.classList.toggle('menu-open',open);shade.hidden=!open;
  trigger.setAttribute('aria-expanded',String(open));main.inert=open;header.inert=open;if($('.floating-nav'))$('.floating-nav').inert=open;
  if(open){sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');sidebar.setAttribute('aria-label','Menu principal');requestAnimationFrame(()=>{if(document.body.classList.contains('menu-open'))$('#close-menu').focus();});}
  else{sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');sidebar.removeAttribute('aria-label');if(restoreFocus)trigger.focus();}
 }
 trigger.onclick=()=>toggleMenu(true);$('#close-menu').onclick=()=>toggleMenu(false);shade.onclick=()=>toggleMenu(false);
 mobile.addEventListener('change',()=>toggleMenu(false,false));
 document.addEventListener('keydown',ev=>{if(!document.body.classList.contains('menu-open'))return;if(ev.key==='Escape'){ev.preventDefault();toggleMenu(false);}if(ev.key==='Tab'){const els=[...sidebar.querySelectorAll('a,button')],first=els[0],last=els.at(-1);if(!sidebar.contains(document.activeElement)){ev.preventDefault();first.focus();}else if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}});
 const refreshProfile=()=>rpc('visual_perfil',{}).then(async v=>{
  if(!v)return;
  const name=$('[data-shell-name]');if(name)name.textContent=v.nome.split(' ')[0];
  const accountName=$('[data-account-name]');if(accountName)accountName.textContent=v.nome;
  const src=v.avatar?await signedUrl(v.avatar):null;
  $$('[data-shell-avatar],.profile-summary>.avatar').forEach(old=>{
   const replacement=document.createElement(src?'img':'span');replacement.className='avatar';replacement.setAttribute('data-shell-avatar','');
   if(src){replacement.alt='Sua foto de perfil';replacement.onload=()=>{if(old.isConnected)old.replaceWith(replacement);};replacement.src=src;}
   else{replacement.textContent=v.nome.trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('');old.replaceWith(replacement);}
  });
 }).catch(()=>{});
 void refreshProfile();document.addEventListener('profile-updated',refreshProfile);
 initMotion();
 return $('#content');
}
export function person(c){return `<div class="person"><span class="avatar">${e(c.nome.split(' ').map(x=>x[0]).slice(0,2).join(''))}</span><div><strong>${e(c.nome)}</strong><br><small>${e(c.email||'Ainda não aceitou o convite')}</small></div></div>`;}
export function formatDate(v){return v?new Date(v.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR'):'—';}
export function chart(rows,key='peso'){const data=rows.filter(x=>Number(x[key])>0).sort((a,b)=>a.data.localeCompare(b.data));if(!data.length)return empty('Anota sua primeira medida e o gráfico aparece aqui.');const vals=data.map(x=>Number(x[key])),min=Math.min(...vals),max=Math.max(...vals),pad=(max-min)*.3||1,lo=min-pad,hi=max+pad;const pts=vals.map((v,i)=>[30+i*540/Math.max(1,data.length-1),24+(hi-v)/(hi-lo)*150]);
 // Curva suave (Catmull-Rom convertido em Bézier) com área preenchida embaixo.
 const d=pts.map(([x,y],i)=>{if(!i)return `M${x},${y}`;const [x0,y0]=pts[i-1],[xp,yp]=pts[i-2]||pts[i-1],[xn,yn]=pts[i+1]||pts[i];return `C${x0+(x-xp)/6},${y0+(y-yp)/6} ${x-(xn-x0)/6},${y-(yn-y0)/6} ${x},${y}`;}).join(' ');const last=pts.at(-1),fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:1});
 return `<svg class="sparkline" viewBox="0 0 600 220" role="img" aria-label="Evolução de ${e(key)}: de ${fmt(vals[0])} para ${fmt(vals.at(-1))}"><defs><linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--cor-primaria);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--cor-primaria);stop-opacity:0"/></linearGradient></defs><path class="area" d="${d} L${last[0]},190 L${pts[0][0]},190 Z"/><path class="line" d="${d}"/>${pts.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i===pts.length-1?7:4}" fill="${i===pts.length-1?'var(--cor-primaria)':'#fff'}" stroke="var(--cor-primaria)" stroke-width="2.5"/>`).join('')}<text x="${Math.max(60,last[0])}" y="${last[1]-16}" text-anchor="end" font-size="16" font-weight="700" fill="var(--cor-titulo)">${fmt(vals.at(-1))}</text><text x="30" y="214" font-size="12" fill="var(--cor-placeholder)">${formatDate(data[0].data)}</text><text x="570" y="214" text-anchor="end" font-size="12" fill="var(--cor-placeholder)">${formatDate(data.at(-1).data)}</text></svg>`;}
