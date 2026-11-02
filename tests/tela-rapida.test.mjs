import {test} from 'node:test';
import assert from 'node:assert/strict';
class Store{getItem(k){return k in this?this[k]:null;}setItem(k,v){this[k]=String(v);}removeItem(k){delete this[k];}}
globalThis.localStorage=new Store();globalThis.sessionStorage=new Store();
globalThis.location={pathname:'/app/hoje.html',reload(){}};
const {profile,clienteAtual,signOut}=await import('../assets/js/supabase.js');
const {config}=await import('../assets/js/config.js');
const AUTH=`sb-${new URL(config.url).hostname.split('.')[0]}-auth-token`;
const perfil={id:'u1',papel:'cliente',nome:'Ana'},agora=()=>Date.now();
const prepare=()=>{for(const k of Object.keys(localStorage))localStorage.removeItem(k);localStorage.setItem(AUTH,JSON.stringify({user:{id:'u1'}}));localStorage.setItem('perfil:app',JSON.stringify({uid:'u1',perfil,conferido:agora()}));};
// Em Node o Supabase não carrega (o import é de uma URL https): se a função tentar usar a rede, ela falha e o teste acusa.
test('tela abre com o perfil guardado, sem carregar o Supabase',async()=>{
 prepare();
 assert.deepEqual(await profile(),perfil);
});
test('perfil guardado não vale pra outra conta, outra área ou sem sessão',async()=>{
 prepare();localStorage.setItem(AUTH,JSON.stringify({user:{id:'outra'}}));
 await assert.rejects(profile,'outra conta precisa ir ao banco');
 prepare();localStorage.removeItem(AUTH);
 await assert.rejects(profile,'sem sessão guardada precisa ir ao Supabase');
 prepare();location.pathname='/admin/index.html';
 await assert.rejects(profile,'a visão de Emanuel tem perfil próprio');
 location.pathname='/app/hoje.html';
 prepare();localStorage.setItem(AUTH,'{quebrado');
 await assert.rejects(profile,'sessão ilegível não abre a tela');
});
test('cadastro do cliente vem do aparelho e fica preso à conta',async()=>{
 prepare();const row={id:'c1',nome:'Ana Souza'};
 localStorage.setItem('cliente:u1',JSON.stringify({row,conferido:agora()}));
 assert.deepEqual(await clienteAtual(perfil),row);
 await assert.rejects(()=>clienteAtual({id:'outra'}),'outra conta não usa o cadastro guardado');
});
test('sair da conta apaga o que ficou guardado',async()=>{
 prepare();localStorage.setItem('cliente:u1','{}');localStorage.setItem('tema','escuro');
 await signOut().catch(()=>{});
 assert.equal(localStorage.getItem('perfil:app'),null);
 assert.equal(localStorage.getItem('cliente:u1'),null);
 assert.equal(localStorage.getItem('tema'),'escuro','preferência de tema fica');
});
