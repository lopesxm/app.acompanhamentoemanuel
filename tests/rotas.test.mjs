import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {readCache} from '../assets/js/leituras.js';
const fake=()=>{let t=0;return {now:()=>t,advance:ms=>{t+=ms;}};};
const tick=()=>new Promise(r=>setTimeout(r,0));
test('o que já foi visto volta na hora e confere em segundo plano',async()=>{
 const clock=fake();let calls=0,changed=0,value=['a'];
 const cache=readCache({now:clock.now,onChange:()=>changed++}),load=async()=>{calls++;return value;};
 assert.deepEqual(await cache.read('k',load),['a']);assert.equal(calls,1);
 assert.deepEqual(await cache.read('k',load),['a']);assert.equal(calls,1,'dentro de 15 s nem vai ao banco');
 clock.advance(20000);value=['b'];
 assert.deepEqual(await cache.read('k',load),['a'],'mostra o que tinha sem esperar');
 await tick();assert.equal(calls,2);assert.equal(changed,1,'avisa que mudou');
 assert.deepEqual(await cache.read('k',load),['b']);assert.equal(calls,2,'redesenhar não dispara outra conferência');
});
test('mudança só de ordem não redesenha a tela',async()=>{
 const clock=fake();let changed=0,value=[{id:1},{id:2}];
 const cache=readCache({now:clock.now,onChange:()=>changed++}),load=async()=>value;
 await cache.read('k',load);clock.advance(20000);value=[{id:2},{id:1}];
 await cache.read('k',load);await tick();assert.equal(changed,0);
});
test('depois de 5 minutos espera o banco, e formulário sempre busca fresco',async()=>{
 const clock=fake();let value='velho';const cache=readCache({now:clock.now}),load=async()=>value;
 await cache.read('k',load);value='novo';
 assert.equal(await cache.read('k',load,{useCache:false}),'novo','formulário não usa o guardado');
 value='mais novo';clock.advance(6*60*1000);
 assert.equal(await cache.read('k',load),'mais novo');
});
test('escrita apaga o guardado e descarta resposta que estava no ar',async()=>{
 const clock=fake();let release,value='antes';
 const cache=readCache({now:clock.now}),slow=()=>new Promise(r=>{release=()=>r(value);});
 const first=cache.read('k',slow);await tick();
 cache.clear();release();await first;
 assert.equal(cache.has('k'),false,'resposta anterior à escrita não volta pro guardado');
 value='depois';assert.equal(await cache.read('k',async()=>value),'depois');
});
test('uma tela não consegue alterar o que outra vai ler',async()=>{
 const cache=readCache({now:fake().now});
 const a=await cache.read('k',async()=>[{nome:'Ana'}]);a[0].nome='alterado';
 assert.equal((await cache.read('k',async()=>[]))[0].nome,'Ana');
});
test('consultas iguais ao mesmo tempo viram uma só, e falha não fica guardada',async()=>{
 const cache=readCache({now:fake().now});let calls=0;const load=async()=>{calls++;await tick();return 1;};
 await Promise.all([cache.read('k',load),cache.read('k',load)]);assert.equal(calls,1);
 await assert.rejects(()=>cache.read('e',async()=>{throw Error('sem rede');}));
 assert.equal(await cache.read('e',async()=>2),2);
});
test('toda página do app tem rota com o nome certo',async()=>{
 const source=await readFile('assets/js/rotas.js','utf8');
 const routes=Object.fromEntries([...source.matchAll(/'(\/(?:admin|app)\/[a-z-]+\.html)':'([a-z-]+)'/g)].map(m=>[m[1],m[2]]));
 const wrappers=(await readdir('assets/js')).filter(f=>/^(admin|app)-.+\.js$/.test(f));
 const dirs=f=>'/'+f.replace('-','/').replace('.js','.html');
 for(const f of wrappers){
  const text=await readFile('assets/js/'+f,'utf8'),boot=text.match(/boot\('([a-z-]+)'\)/);
  if(!boot){assert.equal(routes[dirs(f)],undefined,f+' redireciona e não pode ter rota');continue;}
  assert.equal(routes[dirs(f)],boot[1],f);
 }
 for(const path of Object.keys(routes))assert.ok(wrappers.includes(path.slice(1).replace('/','-').replace('.html','.js')),path);
});
