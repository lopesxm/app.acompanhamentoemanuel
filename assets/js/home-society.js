import {icon} from './visuals.js';
// Desafios coletivos ainda não existem no app: nada de contador de membros ou atividade inventada.
// Só entra aqui o que vem de minha_comunidade: perfil ativo, pedidos pra seguir e conquistas prontas pra postar.
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
export function homeSociety({ativo=null,pedidos=0,conquistas=0}={}){
 const chips=[
  pedidos?`<a class="society-chip" href="/app/comunidade.html#amigos">${icon('people')}${plural(pedidos,'pedido pra te seguir','pedidos pra te seguir')}</a>`:'',
  conquistas?`<a class="society-chip" href="/app/comunidade.html">${icon('medal')}${plural(conquistas,'conquista pra postar','conquistas pra postar')}</a>`:''
 ].join('');
 const cta=ativo===false?'Ativar meu perfil':'Entrar na Society';
 const text=ativo===false?'Ativa seu perfil pra postar, trocar ideia e acompanhar outros Grinders. Só vai pra comunidade o que você escolher.':'Mostra seu progresso, troca ideia e acompanha outros Grinders. Aqui ninguém evolui sozinho.';
 return `<section class="card society-home" id="home-society" aria-labelledby="home-society-title"><header class="society-home-header"><span class="society-home-label">Grinders Society</span><span class="society-home-symbol" aria-hidden="true">${icon('people')}</span></header><h2 id="home-society-title">The Society</h2><p class="society-home-lead">Seu ritmo. Nossa evolução.</p><p class="society-home-description">${text}</p>${chips?`<div class="society-chips">${chips}</div>`:''}<a class="button society-home-cta" href="/app/comunidade.html"><span>${cta}</span>${icon('arrow')}</a><p class="society-home-signature">Train. Eat. Improve. Together.</p></section>`;
}
