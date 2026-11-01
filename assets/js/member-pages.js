import {rpc} from './supabase.js';
import {visualCard} from './profile-visual.js';
import {levelCard} from './profile-level.js';
import {themeButton,bindThemeToggles} from './ui.js';
import {escapeHTML as e} from './domain.js';
export async function memberPage(root,c,p,page){
 if(page==='configuracoes'){
  root.innerHTML=`<div id="member-visual"></div><section class="card"><h2>Aparência</h2><p>Escolha o tema que prefere neste aparelho.</p>${themeButton()}</section><section class="card"><h2>Conta e privacidade</h2><div class="start-links"><a href="/app/perfil.html">Ver meu perfil na Society →</a><a href="/app/comunidade.html#amigos">Privacidade da comunidade →</a><a href="/privacidade.html">Seus dados e consentimento →</a><a href="/app/suporte.html">Solicitar ajuda com a conta →</a></div></section>`;
  bindThemeToggles(root);await visualCard(root.querySelector('#member-visual'),{},true);return;
 }
 if(page==='suporte'){
  root.innerHTML=`<section class="card"><span class="eyebrow">Acompanhamento</span><h2>Fale com o Emanuel</h2><p>Dúvidas sobre seu plano ou sobre o uso do app? Envie sua mensagem por e-mail.</p><a class="button" href="mailto:emanuelmoreiralopes@gmail.com?subject=D%C3%BAvida%20sobre%20meu%20acompanhamento">Enviar e-mail →</a><p class="muted">Abre seu aplicativo de e-mail. A mensagem só é enviada quando você confirmar nele.</p></section><section class="card"><h2>Seu acompanhamento no app</h2><div class="start-links"><a href="/app/hoje.html#diario">Consultar e responder orientações no diário →</a><a href="/equipe.html">Conhecer os responsáveis →</a></div></section>`;return;
 }
 const v=await rpc('visual_perfil',{});
 root.innerHTML=`${levelCard(v?.pontos)||'<section class="card">Seu nível estará disponível quando a pontuação carregar.</section>'}<section class="card"><h2>Marcos da sua jornada</h2><div id="member-milestones"><p class="muted">Carregando conquistas…</p></div></section>`;
 try{const state=await rpc('minha_comunidade');const items=state.conquistas||[];root.querySelector('#member-milestones').innerHTML=items.length?`<ul class="member-milestones">${items.map(x=>`<li><span aria-hidden="true">✓</span><strong>${e(x.titulo)}</strong></li>`).join('')}</ul>`:'<p class="muted">Continue registrando sua rotina. Seus marcos aparecerão aqui conforme forem alcançados.</p>';}catch{root.querySelector('#member-milestones').innerHTML='<p class="muted">Não foi possível carregar os marcos agora. Tente novamente mais tarde.</p>';}
}
