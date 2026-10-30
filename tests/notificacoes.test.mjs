import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const dir=new URL('../supabase/migrations/',import.meta.url);
test('Notificações: quem recebe, privacidade e grupo do WhatsApp',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const f of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec((await readFile(new URL(f,dir),'utf8')).replace('create extension if not exists pgcrypto;','-- gen_random_uuid já existe no Postgres embarcado'));
 const admin='00000000-0000-4000-8000-000000000001',ua='00000000-0000-4000-8000-00000000000a',ub='00000000-0000-4000-8000-00000000000b';
 await db.query(`insert into auth.users values($1,'admin@exemplo.test'),($2,'a@exemplo.test'),($3,'b@exemplo.test')`,[admin,ua,ub]);
 await db.query(`insert into perfis(id,papel,nome) values($1,'admin','Emanuel')`,[admin]);
 const as=async uid=>{await db.exec('reset role');await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[uid]);await db.exec('set role authenticated');};
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 const inbox=async()=>(await db.query('select tipo,titulo,texto,link,lida_em from notificacoes order by criado_em,titulo')).rows;
 const payload={inicio_em:'2020-01-01',refeicoes:[{nome:'Almoço',horario:'12:00',grupos:[{nome:'Proteína',regra:'escolher_1',opcoes:[{descricao:'Frango grelhado',quantidade:120,unidade:'g'}]}]},{nome:'Jantar',horario:'19:00',grupos:[{nome:'Proteína',regra:'escolher_1',opcoes:[{descricao:'Peixe assado',quantidade:150,unidade:'g'}]}]}]};
 await as(admin);
 const cid={};
 for(const [k,u,nome] of [['a',ua,'Ana Souza'],['b',ub,'Bruno Lima']]){cid[k]=await scalar(`insert into clientes(nutricionista_id,nome,whatsapp) values($1,$2,'5511999999999') returning id`,[admin,nome]);const token=await scalar('select novo_convite($1)',[cid[k]]);await as(u);await db.query('select aceitar_convite($1,true)',[token]);await as(admin);}

 await t.test('ficha, plano e registros viram avisos pra pessoa certa',async()=>{
 await as(ua);
 await db.query(`select salvar_ficha($1,$2,3,true)`,[cid.a,{nome:'Ana',nascimento:'1990-01-01',sexo:'feminino',whatsapp:'11999999999',email:'a@exemplo.test',peso:'70',altura:'165',objetivo:'Saúde',acorda:'07:00',dorme:'23:00',alergias:'Nenhuma'}]);
 assert.deepEqual(await inbox(),[],'a cliente não recebe aviso da própria ficha');
 await as(admin);
 assert.deepEqual((await inbox()).map(n=>[n.tipo,n.titulo]),[['ficha','Ana terminou a ficha']]);
 const pid=await scalar('select salvar_plano($1,$2,null)',[cid.a,payload]);await db.query('select publicar_plano($1)',[pid]);
 assert.equal((await inbox()).length,1,'o Emanuel não recebe aviso do plano que ele mesmo publicou');
 await as(ua);
 assert.deepEqual((await inbox()).map(n=>[n.tipo,n.link]),[['plano','/app/plano.html']]);
 const meals=(await db.query(`select r.id,o.id oid from refeicoes r join grupos g on g.refeicao_id=r.id join opcoes o on o.grupo_id=g.id order by r.ordem`)).rows;
 for(const m of meals)await db.query(`insert into registros_refeicao(cliente_id,refeicao_id,data,status,opcoes_escolhidas) values($1,$2,(now() at time zone 'America/Sao_Paulo')::date,'comi',$3)`,[cid.a,m.id,[m.oid]]);
 await db.query(`insert into fugas(cliente_id,descricao) values($1,'Pizza com a família')`,[cid.a]);
 await db.query(`insert into medidas(cliente_id,peso) values($1,68.40)`,[cid.a]);
 await as(admin);
 const avisos=await inbox();
 const registro=avisos.filter(n=>n.tipo==='registro');
 assert.equal(registro.length,1,'registros do mesmo dia viram um aviso só');
 assert.equal(registro[0].texto,'2 refeições registradas hoje');
 assert.equal(registro[0].link,`/admin/cliente.html?id=${cid.a}&aba=diario`);
 assert.equal(avisos.find(n=>n.tipo==='fuga').texto,'Pizza com a família');
 assert.equal(avisos.find(n=>n.tipo==='medidas').texto,'Peso: 68.4 kg');
 });

 await t.test('conversa no diário avisa os dois lados',async()=>{
 await as(ua);
 const reg=await scalar('select id from registros_refeicao where cliente_id=$1 limit 1',[cid.a]);
 await as(admin);
 await db.query(`insert into comentarios(cliente_id,autor_id,alvo_tipo,alvo_id,texto) values($1,$2,'registro',$3,'Mandou bem!')`,[cid.a,admin,reg]);
 await as(ua);
 const meu=(await inbox()).find(n=>n.tipo==='comentario');
 assert.equal(meu.titulo,'O Emanuel comentou no seu diário');assert.equal(meu.texto,'Mandou bem!');
 await db.query(`insert into comentarios(cliente_id,autor_id,alvo_tipo,alvo_id,texto) values($1,$2,'registro',$3,'Valeu!')`,[cid.a,ua,reg]);
 await assert.rejects(()=>db.query(`insert into comentarios(cliente_id,autor_id,alvo_tipo,alvo_id,texto) values($1,$2,'registro',$3,'Me passando pelo Emanuel')`,[cid.a,admin,reg]),/row-level security/,'cliente não comenta em nome do Emanuel');
 await as(ub);
 await assert.rejects(()=>db.query(`insert into comentarios(cliente_id,autor_id,alvo_tipo,alvo_id,texto) values($1,$2,'registro',$3,'Oi')`,[cid.a,ub,reg]),/row-level security/,'cliente não comenta no diário de outro');
 await as(admin);
 assert.ok((await inbox()).some(n=>n.tipo==='resposta'&&n.titulo==='Ana respondeu no diário'&&n.texto==='Valeu!'));
 });

 await t.test('cada um lê e marca como lido só o que é seu',async()=>{
 await as(ub);
 assert.deepEqual(await inbox(),[],'o Bruno não vê os avisos da Ana nem do Emanuel');
 await assert.rejects(()=>db.query(`insert into notificacoes(destinatario_id,tipo,titulo,link) values($1,'x','Falso','/')`,[ua]),/permission denied/);
 await assert.rejects(()=>db.query(`select notificar($1,null,'x','Falso',null,'/')`,[ua]),/permission denied/);
 assert.equal(await scalar('select marcar_notificacoes_lidas()'),0);
 await as(ua);
 const total=(await inbox()).length;
 assert.equal(await scalar('select marcar_notificacoes_lidas()'),total);
 assert.ok((await inbox()).every(n=>n.lida_em));
 await as(admin);
 assert.ok((await inbox()).every(n=>!n.lida_em),'marcar os da Ana não mexe nos do Emanuel');
 });

 await t.test('comunidade avisa dono do post, quem comentou e o Emanuel',async()=>{
 for(const [u,usuario,nome] of [[ua,'ana.s','Ana Fit'],[ub,'bruno.l','Bru']]){await as(u);await db.query('select ativar_comunidade($1,$2)',[usuario,nome]);}
 await as(admin);
 await db.query('select marcar_notificacoes_lidas()');
 const dica=await scalar(`select postar_dica('Bebe água, galera!',null)`);
 for(const u of [ua,ub]){await as(u);assert.ok((await inbox()).some(n=>n.tipo==='post'&&n.link==='/app/comunidade.html#post-'+dica));}
 await as(ua);await db.query(`select comentar_post($1,'Bora!')`,[dica]);
 await as(ub);await db.query(`select comentar_post($1,'Tô dentro')`,[dica]);
 await as(admin);
 const doEmanuel=(await inbox()).filter(n=>n.tipo==='comentario_post').map(n=>n.titulo);
 assert.deepEqual(doEmanuel.sort(),['Ana comentou no seu post','Bruno comentou no seu post'],'pro Emanuel vale o nome do cadastro');
 await as(ua);
 const daAna=(await inbox()).filter(n=>n.tipo==='comentario_post');
 assert.deepEqual(daAna.map(n=>n.titulo),['Bru respondeu na conversa'],'entre clientes vale o nome da comunidade');
 assert.equal(daAna[0].texto,'Tô dentro');
 });

 await t.test('link do grupo do WhatsApp',async()=>{
 await as(admin);
 await assert.rejects(()=>db.query(`insert into configuracoes(nutricionista_id,grupo_whatsapp) values($1,'https://golpe.example/grupo')`,[admin]),/check constraint/);
 await db.query(`insert into configuracoes(nutricionista_id,grupo_whatsapp) values($1,'https://chat.whatsapp.com/AbCdEf123456789') on conflict(nutricionista_id) do update set grupo_whatsapp=excluded.grupo_whatsapp`,[admin]);
 await as(ua);
 assert.equal(await scalar('select grupo_whatsapp()'),'https://chat.whatsapp.com/AbCdEf123456789');
 assert.equal((await db.query('select * from configuracoes')).rows.length,0,'cliente não lê as configurações do Emanuel');
 });
 }finally{await db.close();}
});
