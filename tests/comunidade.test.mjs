import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const migration=async name=>(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;','-- gen_random_uuid já existe no Postgres embarcado');
test('Comunidade: opt-in, seguidores, privacidade do feed e moderação',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const name of ['001_initial.sql','002_mensagens_casuais.sql','003_comunidade.sql','004_perfis_visuais.sql'])await db.exec(await migration(name));
 const admin='00000000-0000-4000-8000-000000000001',ua='00000000-0000-4000-8000-00000000000a',ub='00000000-0000-4000-8000-00000000000b',uc='00000000-0000-4000-8000-00000000000c';
 await db.query(`insert into auth.users values($1,'admin@exemplo.test'),($2,'a@exemplo.test'),($3,'b@exemplo.test'),($4,'c@exemplo.test')`,[admin,ua,ub,uc]);
 await db.query(`insert into perfis(id,papel,nome) values($1,'admin','Emanuel')`,[admin]);
 const as=async uid=>{await db.exec('reset role');await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[uid]);await db.exec('set role authenticated');};
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 const denied=async sql=>{try{return (await db.query(sql)).rows.length===0;}catch{return true;}};
 const payload={inicio_em:'2020-01-01',refeicoes:[{nome:'Almoço',horario:'12:00',grupos:[{nome:'Proteína',regra:'escolher_1',opcoes:[{descricao:'Frango grelhado',quantidade:120,unidade:'g'}]}]},{nome:'Jantar',horario:'19:00',grupos:[{nome:'Proteína',regra:'escolher_1',opcoes:[{descricao:'Peixe assado',quantidade:150,unidade:'g'}]}]}]};
 await as(admin);
 const cid={};
 for(const [k,u] of [['a',ua],['b',ub],['c',uc]]){cid[k]=await scalar(`insert into clientes(nutricionista_id,nome,whatsapp) values($1,$2,'5511999999999') returning id`,[admin,'Cliente '+k.toUpperCase()]);const token=await scalar('select novo_convite($1)',[cid[k]]);await as(u);await db.query('select aceitar_convite($1,true)',[token]);await as(admin);}
 for(const k of ['a','b']){const pid=await scalar('select salvar_plano($1,$2,null)',[cid[k],payload]);await db.query('select publicar_plano($1)',[pid]);}
 const dica=await scalar(`select postar_dica('Bebe água, galera!',null)`);
 await as(ua);
 const meals=(await db.query(`select r.id,o.id oid from refeicoes r join grupos g on g.refeicao_id=r.id join opcoes o on o.grupo_id=g.id order by r.ordem`)).rows;
 const reg=await scalar(`insert into registros_refeicao(cliente_id,refeicao_id,data,status,opcoes_escolhidas) values($1,$2,(now() at time zone 'America/Sao_Paulo')::date,'comi',$3) returning id`,[cid.a,meals[0].id,[meals[0].oid]]);

 await t.test('perfil visual privado, edição própria e validação de arquivos',async()=>{
 await as(ua);
 const path='perfis/'+ua+'/avatar.jpg';
 await db.query("insert into storage.objects(bucket_id,name) values('saude',$1)",[path]);
 await db.query("select salvar_visual('Ana visual','Minha apresentação',$1,null)",[path]);
 assert.equal((await scalar('select visual_perfil()')).avatar,path);
 assert.ok(await denied('select * from perfis_visuais'));
 await assert.rejects(()=>db.query("select salvar_visual('Ana','', $1,null)",['perfis/'+ub+'/outro.jpg']),/Foto inválida/);
 await as(ub);
 assert.equal(await scalar('select visual_perfil($1)',[cid.a]),null);
 assert.equal(await scalar('select pode_ver_foto_perfil($1)',[path]),false);
 assert.equal((await db.query("select name from storage.objects where name=$1",[path])).rows.length,0);
 await assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name) values('saude',$1)",['perfis/'+ua+'/intruso.jpg']),/row-level security/);
 await as(admin);
 assert.equal((await scalar('select visual_perfil($1)',[cid.a])).nome,'Ana visual');
 await db.query("select salvar_visual('Emanuel Nutricionista','Acompanhamento individual',null,null)");
 await as(ua);
 assert.equal((await scalar('select visual_perfil(null,true)')).nome,'Emanuel Nutricionista');
 });

 await t.test('comunidade vem desligada e nada aparece antes do opt-in',async()=>{
 await as(ua);
 assert.equal((await scalar('select minha_comunidade()')).perfil,null);
 await assert.rejects(()=>db.query(`select postar_resumo((now() at time zone 'America/Sao_Paulo')::date,null)`),/Ativa a comunidade/);
 assert.deepEqual(await scalar('select feed()'),[]);
 await db.query(`select ativar_comunidade('Ana.Teste','Ana',false)`);
 assert.equal((await scalar('select minha_comunidade()')).perfil.usuario,'ana.teste');
 assert.equal((await scalar('select feed()'))[0].id,dica,'post do Emanuel aparece para quem ativou');
 await as(ub);await assert.rejects(()=>db.query(`select ativar_comunidade('ana.teste','Bia',false)`),/já tem dono/);
 await assert.rejects(()=>db.query(`select ativar_comunidade('emanuel.oficial','Emanuel',false)`),/reservado/,'ninguém se passa pelo Emanuel');
 await db.query(`select ativar_comunidade('bia','Bia',false)`);
 });

 await t.test('clientes não leem tabelas da comunidade nem funções internas',async()=>{
 await as(ub);
 for(const table of ['posts','seguidores','comunidade_perfis','curtidas','comentarios_post'])assert.ok(await denied(`select * from ${table}`),table);
 await assert.rejects(()=>db.query('select segue($1,$2)',[cid.a,cid.b]),/permission denied/);
 await assert.rejects(()=>db.query('select adesao_periodo($1,current_date,current_date)',[cid.a]),/permission denied/);
 });

 let resumo;
 await t.test('resumo do dia só tem números, nunca alimentos',async()=>{
 await as(ua);
 resumo=await scalar(`select postar_resumo((now() at time zone 'America/Sao_Paulo')::date,'Bora!')`);
 const post=(await scalar('select feed()')).find(p=>p.id===resumo);
 assert.deepEqual(Object.keys(post.dados).sort(),['adesao','dia','feitas','previstas','sequencia']);
 assert.equal(post.dados.feitas,1);assert.equal(post.dados.previstas,2);assert.equal(post.dados.adesao,50);
 assert.doesNotMatch(JSON.stringify(post),/Frango|Peixe|120|150/);
 await assert.rejects(()=>db.query(`select postar_resumo((now() at time zone 'America/Sao_Paulo')::date,null)`),/já postou/);
 await assert.rejects(()=>db.query(`select postar_conquista('sequencia_30',null)`),/não tá liberada/);
 });

 await t.test('perfil e posts só para quem segue com pedido aceito',async()=>{
 await as(ub);
 assert.equal((await scalar('select buscar_perfil($1)',['@ana.teste'])).relacao,'nenhuma');
 await db.query('select pedir_para_seguir($1)',[cid.a]);
 const fechado=await scalar('select perfil_comunidade($1)',[cid.a]);
 assert.equal(fechado.bloqueado,true);assert.equal(fechado.dias_registrados,undefined);
 assert.ok(!(await scalar('select feed()')).some(p=>p.id===resumo),'sem aceite não vê post');
 await assert.rejects(()=>db.query('select curtir($1)',[resumo]),/não tá disponível/);
 await as(ua);
 assert.equal((await scalar('select minha_comunidade()')).pedidos[0].usuario,'bia');
 await db.query('select aceitar_seguidor($1)',[cid.b]);
 await as(ub);
 const aberto=await scalar('select perfil_comunidade($1)',[cid.a]);
 assert.equal(aberto.bloqueado,false);assert.equal(aberto.dias_registrados,1);assert.equal(aberto.peso,null);assert.equal(aberto.pode_comparar,true);
 assert.ok((await scalar('select feed()')).some(p=>p.id===resumo));
 const ranking=await scalar('select ranking_semanal()');
 assert.deepEqual(ranking.map(r=>r.usuario).sort(),['ana.teste','bia']);
 assert.equal((await scalar('select comparar($1)',[cid.a])).length,2);
 await as(ua);
 assert.equal((await scalar('select perfil_comunidade($1)',[cid.b])).bloqueado,true,'seguir não é recíproco');
 await assert.rejects(()=>db.query('select comparar($1)',[cid.b]),/precisa seguir/,'ser seguido não libera os números de quem segue');
 assert.equal((await scalar('select perfil_comunidade($1)',[cid.b])).pode_comparar,undefined);
 await as(uc);
 await assert.rejects(()=>db.query('select ranking_semanal()'),/Ativa a comunidade/);
 await assert.rejects(()=>db.query('select comparar($1)',[cid.a]),/Ativa a comunidade/);
 });

 await t.test('curtidas, comentário do Emanuel e moderação depois',async()=>{
 await as(ub);
 assert.equal(await scalar('select curtir($1)',[resumo]),true);
 const comentario=await scalar(`select comentar_post($1,'Boa, Ana!')`,[resumo]);
 await as(admin);
 await db.query(`select comentar_post($1,'Mandou bem')`,[resumo]);
 let post=(await scalar('select feed()')).find(p=>p.id===resumo);
 assert.equal(post.curtidas,1);assert.equal(post.comentarios.find(c=>c.nutricionista).nome,'Emanuel');
 await db.query('select moderar_comentario($1,true)',[comentario]);
 await db.query('select moderar_post($1,true)',[resumo]);
 await as(ub);
 assert.ok(!(await scalar('select feed()')).some(p=>p.id===resumo),'post escondido some para os outros');
 await as(ua);
 post=(await scalar('select feed()')).find(p=>p.id===resumo);
 assert.equal(post.oculto,true,'autor ainda vê o próprio post escondido');
 assert.ok(!post.comentarios.some(c=>c.id===comentario),'comentário escondido some');
 await as(ub);await assert.rejects(()=>db.query('select moderar_post($1,false)',[resumo]),/não tem acesso/);
 await as(admin);await db.query('select moderar_post($1,false)',[resumo]);
 });

 await t.test('foto do post só abre para quem pode ver o post; peso só com opção ligada',async()=>{
 await as(ua);
 const caminho=cid.a+'/prato.jpg';
 await db.query(`insert into storage.objects(bucket_id,name) values('saude',$1)`,[caminho]);
 const foto=await scalar(`insert into fotos_refeicao(cliente_id,registro_id,caminho_storage,data) values($1,$2,$3,(now() at time zone 'America/Sao_Paulo')::date) returning id`,[cid.a,reg,caminho]);
 await db.query(`insert into medidas(cliente_id,peso) values($1,70)`,[cid.a]);
 await as(ub);assert.equal((await db.query('select * from storage.objects where name=$1',[caminho])).rows.length,0,'antes de postar a foto é privada');
 await as(ua);const pid=await scalar(`select postar_foto($1,'Almoço top')`,[foto]);
 assert.equal((await scalar('select feed()')).find(p=>p.id===pid).dentro_do_plano,true);
 await as(ub);assert.equal((await db.query('select * from storage.objects where name=$1',[caminho])).rows.length,1);
 assert.equal((await scalar('select perfil_comunidade($1)',[cid.a])).peso,null);
 await as(uc);assert.equal((await db.query('select * from storage.objects where name=$1',[caminho])).rows.length,0);
 await as(ua);await db.query(`select ativar_comunidade('ana.teste','Ana',true)`);
 await as(ub);assert.equal(Number((await scalar('select perfil_comunidade($1)',[cid.a])).peso),70);
 });

 await t.test('foto de perfil acompanha autorização de seguidores e saída da comunidade',async()=>{
 await as(ub);assert.equal((await scalar('select visual_perfil($1)',[cid.a])).avatar,'perfis/'+ua+'/avatar.jpg');
 await as(uc);assert.equal(await scalar('select visual_perfil($1)',[cid.a]),null);
 await as(ub);
 });

 await t.test('desativar some com tudo para os outros, inclusive comentários',async()=>{
 await as(ua);await db.query(`select comentar_post($1,'Comentário da Ana')`,[dica]);
 await as(ub);assert.ok((await scalar('select feed()')).find(p=>p.id===dica).comentarios.some(k=>k.texto==='Comentário da Ana'));
 await as(ua);await db.query('select desativar_comunidade()');
 await as(ub);
 assert.ok(!(await scalar('select feed()')).some(p=>p.autor.cliente_id===cid.a));
 assert.ok(!(await scalar('select feed()')).find(p=>p.id===dica).comentarios.some(k=>k.texto==='Comentário da Ana'));
 await assert.rejects(()=>db.query('select perfil_comunidade($1)',[cid.a]),/não tá na comunidade/);
 assert.equal(await scalar('select visual_perfil($1)',[cid.a]),null);
 assert.equal(await scalar('select pode_ver_foto_perfil($1)',['perfis/'+ua+'/avatar.jpg']),false);
 assert.deepEqual((await scalar('select ranking_semanal()')).map(r=>r.usuario),['bia']);
 });

 await t.test('excluir o cliente apaga comentários e curtidas dele nos posts dos outros',async()=>{
 await as(ub);await db.query(`select comentar_post($1,'Comentário da Bia')`,[dica]);await db.query('select curtir($1)',[dica]);
 await as(admin);
 assert.ok((await scalar('select feed()')).find(p=>p.id===dica).comentarios.some(k=>k.texto==='Comentário da Bia'));
 await db.query('delete from clientes where id=$1',[cid.b]);
 const post=(await scalar('select feed()')).find(p=>p.id===dica);
 assert.ok(!post.comentarios.some(k=>k.texto==='Comentário da Bia'));assert.equal(post.curtidas,0);
 });
 }finally{await db.close();}
});
