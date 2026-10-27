import {test} from 'node:test';
import assert from 'node:assert/strict';
let role='cliente';
globalThis.sessionStorage={getItem:()=>role};
const {seed}=await import('../assets/js/demo.js');
const {demoCommunity}=await import('../assets/js/demo-comunidade.js');
const {today}=await import('../assets/js/domain.js');

// A demonstração precisa seguir as mesmas regras de privacidade de 003_comunidade.sql.
test('demonstração da comunidade segue as regras do banco',()=>{
 const db=seed();
 // Pula o exemplo pronto da Mariana: o teste parte de uma cliente que nunca ativou a comunidade.
 db.exemploPerfilCompleto=true;
 const call=(as,name,args)=>{role=as;return demoCommunity(name,args,db);};
 const camila=db.clientes.find(c=>c.nome.startsWith('Camila')).id,bia=db.clientes.find(c=>c.nome.startsWith('Beatriz')).id;
 assert.equal(call('cliente','minha_comunidade').perfil,null,'vem desligada');
 assert.throws(()=>call('cliente','postar_resumo',{dia:today()}),/Ativa a comunidade/);
 assert.deepEqual(call('cliente','feed',{}),[]);
 assert.throws(()=>call('cliente','ativar_comunidade',{p_usuario:'camis.santos',p_nome:'Mari'}),/já tem dono/);
 assert.throws(()=>call('cliente','ativar_comunidade',{p_usuario:'emanuel_fake',p_nome:'Mari'}),/reservado/);
 call('cliente','ativar_comunidade',{p_usuario:'mari',p_nome:'Mari'});
 const feed=call('cliente','feed',{});
 assert.ok(feed.length&&feed.every(p=>p.autor.nutricionista),'antes de seguir, só os posts do Emanuel');
 assert.equal(call('cliente','perfil_comunidade',{cid:camila}).bloqueado,true);
 assert.equal(call('cliente','visual_perfil',{cid:camila}),null,'foto e bio de quem você não segue ficam fechadas');
 call('cliente','salvar_visual',{p_nome:'Mari',p_bio:'Oi!',p_avatar:'demo/x.jpg'});
 assert.deepEqual(call('cliente','visual_perfil',{}),{nome:'Mari',bio:'Oi!',avatar:'demo/x.jpg',capa:null,meu:true});
 assert.equal(call('cliente','perfil_comunidade',{cid:camila}).dias_registrados,undefined);
 assert.throws(()=>call('cliente','comparar',{cid:camila}),/precisa seguir/);
 call('cliente','aceitar_seguidor',{cid:bia});
 assert.throws(()=>call('cliente','comparar',{cid:bia}),/precisa seguir/,'ser seguido não libera os números de quem segue');
 call('cliente','pedir_para_seguir',{cid:camila});
 assert.equal(call('cliente','perfil_comunidade',{cid:camila}).bloqueado,false);
 assert.notEqual(call('cliente','visual_perfil',{cid:camila}),null,'depois de seguir, a foto e a bio aparecem');
 assert.equal(call('cliente','comparar',{cid:camila}).length,2);
 assert.ok(call('cliente','feed',{}).some(p=>p.autor.cliente_id===camila));
 assert.ok(!call('cliente','feed',{}).some(p=>p.autor.cliente_id===bia),'quem te segue não aparece no seu feed sem você seguir');
 const ontem=new Date(today()+'T12:00:00');ontem.setDate(ontem.getDate()-1);
 const resumo=call('cliente','postar_resumo',{dia:ontem.toLocaleDateString('en-CA')});
 const post=call('cliente','feed',{}).find(p=>p.id===resumo);
 assert.deepEqual(Object.keys(post.dados).sort(),['adesao','dia','feitas','previstas','sequencia']);
 assert.doesNotMatch(JSON.stringify(post),/Banana|Frango|Arroz|Ovos/);
 const deCamila=call('cliente','feed',{}).find(p=>p.autor.cliente_id===camila).id;
 call('admin','moderar_post',{pid:deCamila,ocultar:true});call('admin','moderar_post',{pid:resumo,ocultar:true});
 assert.ok(!call('cliente','feed',{}).some(p=>p.id===deCamila),'post escondido some para os outros');
 assert.equal(call('cliente','feed',{}).find(p=>p.id===resumo).oculto,true,'autor ainda vê o próprio post escondido');
 assert.throws(()=>call('cliente','moderar_post',{pid:resumo,ocultar:false}),/não tem acesso/);
 const dica=call('cliente','feed',{}).find(p=>p.autor.nutricionista).id;
 call('cliente','comentar_post',{pid:dica,p_texto:'Comentário da Mari'});
 call('cliente','desativar_comunidade');
 // A demonstração usa o primeiro perfil de cliente; colocar o da Camila na frente faz a chamada sair como ela.
 const mari=db.clientes.find(c=>c.nome.startsWith('Mariana')).id;
 const camilaPerfil=db.perfis.find(p=>p.id===db.clientes.find(c=>c.id===camila).usuario_id);
 db.perfis=[camilaPerfil,...db.perfis.filter(p=>p!==camilaPerfil)];
 const vistoPelaCamila=call('cliente','feed',{});
 assert.ok(!vistoPelaCamila.find(p=>p.id===dica).comentarios.some(k=>k.texto==='Comentário da Mari'),'comentário de quem saiu some');
 assert.ok(!vistoPelaCamila.some(p=>p.autor.cliente_id===mari),'posts de quem saiu somem');
});
