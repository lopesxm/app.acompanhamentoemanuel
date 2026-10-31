import {profile,signedUrl} from './supabase.js';
import {readVisual} from './profile-visual.js';
import {shell,bindThemeToggles,themeButton} from './ui.js';
import {icon} from './visuals.js';

async function start(){
 let me=null;try{me=await profile();}catch{/* The team presentation is also available before login. */}
 let root;
 if(me)root=shell(me,'Nossa equipe','As pessoas por trás da Grinders Society.');
 else{
  document.body.innerHTML=`<main class="team-public"><div class="title-row"><a class="brand" href="/login.html"><span class="brand-icon">↗</span> emanuel.</a>${themeButton()}</div><h1>Nossa equipe</h1><p class="muted">As pessoas por trás da Grinders Society.</p><div id="team-content"></div><a class="button secondary" href="/login.html">Voltar ao acesso</a></main>`;
  bindThemeToggles();root=document.querySelector('#team-content');
 }
 root.innerHTML=`<section class="card team-intro"><span class="eyebrow">Grinders Society</span><h2>Acompanhamento, evolução e comunidade.</h2><p>Conheça as pessoas responsáveis pela nutrição, pelo desenvolvimento e pelo suporte do projeto.</p></section><div class="team-grid"><section class="card"><h2 class="icon-heading">${icon('people')} Nutrição</h2><article class="team-member"><span class="avatar" aria-hidden="true">ED</span><div><h3>Edvania</h3><p class="muted">Nutricionista · CRN 53443</p><p>Responsável pela prescrição das dietas.</p></div></article><article class="team-member"><span class="avatar" data-team-emanuel aria-hidden="true">EM</span><div><h3>Emanuel</h3><p class="muted">Nutricionista técnico</p><p>Responsável pelo acompanhamento de todos os clientes, desde a ficha até a comunidade.</p></div></article></section><section class="card"><h2 class="icon-heading">${icon('folder')} Desenvolvimento e equipe</h2><article class="team-member"><span class="avatar" data-team-lopes aria-hidden="true">L</span><div><h3>lopesxm</h3><p class="muted">Desenvolvedor e estrategista da Grinders</p></div></article><article class="team-member"><span class="avatar" aria-hidden="true">${icon('chat')}</span><div><h3>Moderação e suporte</h3><p class="muted">Responsável a definir</p></div></article></section></div>`;
 if(me){
  await Promise.all([
   ['emanuel','Emanuel',{emanuel:true}],
   ['lopes','lopesxm',{cid:'073316d7-bf81-4eba-8eab-d0923fd3627a'}]
  ].map(async ([key,name,args])=>{
   try{
    const visual=await readVisual(args);
    if(!visual?.avatar)return;
    const src=await signedUrl(visual.avatar),old=root.querySelector('[data-team-'+key+']'),img=document.createElement('img');
    img.className='avatar';img.alt='Foto de '+name;img.onload=()=>old?.replaceWith(img);img.src=src;
   }catch{/* Preserve initials when the private profile is not accessible to the viewer. */}
  }));
 }

}
start();
