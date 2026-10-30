import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('Migração, convites, publicação e isolamento de dados sob RLS',async t=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;grant execute on function auth.uid() to authenticated;`);
 const sql=(await readFile(new URL('../supabase/migrations/001_initial.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;','-- gen_random_uuid já existe no Postgres embarcado');
 await db.exec(sql);
 await db.exec(await readFile(new URL('../supabase/migrations/002_mensagens_casuais.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/006_escolhas_alimentares.sql',import.meta.url),'utf8'));
 const admin='00000000-0000-4000-8000-000000000001',u1='00000000-0000-4000-8000-000000000002',u2='00000000-0000-4000-8000-000000000003';
 await db.query(`insert into auth.users values($1,'admin@exemplo.test'),($2,'a@exemplo.test'),($3,'b@exemplo.test')`,[admin,u1,u2]);
 await db.query(`insert into perfis(id,papel,nome) values($1,'admin','Emanuel')`,[admin]);
 const as=async uid=>{await db.exec('reset role');await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[uid]);await db.exec('set role authenticated');};
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 await as(admin);
 const cid1=await scalar(`insert into clientes(nutricionista_id,nome,whatsapp) values($1,'Cliente A','5511999999999') returning id`,[admin]);
 const cid2=await scalar(`insert into clientes(nutricionista_id,nome,whatsapp) values($1,'Cliente B','5511999999998') returning id`,[admin]);
 const token1=await scalar('select novo_convite($1)',[cid1]);const token2=await scalar('select novo_convite($1)',[cid2]);
 await t.test('consentimento obrigatório, convite de uso único e perfil sem autopromoção',async()=>{
 await as(u1);await assert.rejects(()=>db.query('select aceitar_convite($1,false)',[token1]),/consentimento/);
 assert.equal(await scalar('select aceitar_convite($1,true)',[token1]),cid1);
 await assert.rejects(()=>db.query('select aceitar_convite($1,true)',[token1]),/não vale mais/);
 await assert.rejects(()=>db.query(`insert into perfis(id,papel,nome) values(gen_random_uuid(),'admin','Ataque')`),/row-level security/);
 await as(u2);await db.query('select aceitar_convite($1,true)',[token2]);
 });
 await t.test('cliente não lê outro cliente, convites ou anotações privadas',async()=>{
 await as(admin);await db.query(`insert into fichas_tecnicas(cliente_id,anotacoes_privadas) values($1,'Privado')`,[cid1]);
 await as(u1);assert.equal((await db.query('select * from clientes')).rows.length,1);assert.equal((await db.query('select * from fichas_tecnicas')).rows.length,0);assert.equal((await db.query('select * from convites')).rows.length,0);
 await assert.rejects(()=>db.query('select salvar_ficha($1,$2,0,false)',[cid2,{}]),/não tem acesso/);
 await assert.rejects(()=>db.query(`insert into medidas(cliente_id,peso) values($1,70)`,[cid2]),/row-level security/);
 });
 const payload={inicio_em:'2020-01-01',observacoes_gerais:'Teste',refeicoes:[{nome:'Almoço',horario:'12:00',grupos:[{nome:'Proteína',regra:'escolher_1',opcoes:[{descricao:'Alimento A',quantidade:100,unidade:'g'},{descricao:'Alimento B',quantidade:100,unidade:'g'}]}]}]};
 let pid,mid,oid,gid;
 await t.test('rascunho invisível e publicação versionada, sem escrita direta do cliente',async()=>{
 await as(admin);pid=await scalar('select salvar_plano($1,$2,null)',[cid1,payload]);
 await as(u1);assert.equal((await db.query('select * from planos')).rows.length,0);assert.equal((await db.query('select * from refeicoes')).rows.length,0);
 await assert.rejects(()=>db.query('select publicar_plano($1)',[pid]),/não tem acesso/);
 await as(admin);await db.query('select publicar_plano($1)',[pid]);
 await assert.rejects(()=>db.query('select salvar_plano($1,$2,$3)',[cid1,payload,pid]),/Faz uma cópia/);
 await as(u1);assert.equal((await db.query('select * from planos')).rows.length,1);mid=await scalar('select id from refeicoes');oid=await scalar('select id from opcoes limit 1');
 assert.equal((await db.query(`update planos set observacoes_gerais='alterado' where id=$1 returning id`,[pid])).rows.length,0);
 await as(u2);assert.equal((await db.query('select * from planos')).rows.length,0);
 });
 await t.test('alternativas persistem sem consumo e respeitam paciente e grupo',async()=>{
 await as(u1);gid=await scalar('select id from grupos limit 1');
 const options=(await db.query('select id from opcoes where grupo_id=$1',[gid])).rows;
 await db.query('select escolher_alimento($1,$2)',[gid,options[1].id]);
 assert.equal(await scalar('select count(*)::int from registros_refeicao'),0);
 await as(u2);assert.equal(await scalar('select count(*)::int from escolhas_alimentares'),0);
 await assert.rejects(()=>db.query('select escolher_alimento($1,$2)',[gid,oid]),/disponível/);
 await as(u1);assert.equal(await scalar('select opcao_id from escolhas_alimentares'),options[1].id);
 await assert.rejects(()=>db.query('select escolher_alimento($1,gen_random_uuid())',[gid]),/autorizada/);
 await assert.rejects(()=>db.query('delete from escolhas_alimentares'),/permission denied/);
 await db.query('select escolher_alimento($1,$2)',[gid,oid]);
 assert.equal(await scalar('select count(*)::int from escolhas_alimentares'),1);
 assert.equal(await scalar('select opcao_id from escolhas_alimentares'),oid);
 await as(admin);assert.equal(await scalar('select count(*)::int from escolhas_alimentares'),1);
 });
 await t.test('checks validam refeição e opções; arquivos respeitam caminho e cliente',async()=>{
 await as(u1);
 await assert.rejects(()=>db.query(`insert into registros_refeicao(cliente_id,refeicao_id,data,status) values($1,$2,(now() at time zone 'America/Sao_Paulo')::date,'comi')`,[cid1,mid]),/Escolhe uma opção/);
 await db.query(`insert into registros_refeicao(cliente_id,refeicao_id,data,status,opcoes_escolhidas) values($1,$2,(now() at time zone 'America/Sao_Paulo')::date,'comi',$3)`,[cid1,mid,[oid]]);
 await db.query(`insert into arquivos(cliente_id,tipo,caminho_storage) values($1,'exame',$2)`,[cid1,cid1+'/teste.pdf']);
 await assert.rejects(()=>db.query(`insert into arquivos(cliente_id,tipo,caminho_storage) values($1,'exame',$2)`,[cid1,cid2+'/teste.pdf']),/Caminho/);
 await db.query(`insert into storage.objects(bucket_id,name) values('saude',$1)`,[cid1+'/teste.pdf']);
 await assert.rejects(()=>db.query(`insert into storage.objects(bucket_id,name) values('saude',$1)`,[cid2+'/teste.pdf']),/row-level security/);
 await as(u2);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 });
 await t.test('nova publicação arquiva a anterior e protege histórico',async()=>{
 await as(admin);const pid2=await scalar('select salvar_plano($1,$2,null)',[cid1,payload]);await db.query('select publicar_plano($1)',[pid2]);
 assert.equal(await scalar(`select count(*)::int from planos where cliente_id=$1 and status='publicado'`,[cid1]),1);
 assert.equal(await scalar('select versao from planos where id=$1',[pid2]),2);
 await as(u1);assert.equal((await db.query('select * from planos')).rows.length,1);assert.equal((await db.query('select * from registros_refeicao')).rows.length,1);
 await assert.rejects(()=>db.query('select escolher_alimento($1,$2)',[gid,oid]),/disponível/);
 assert.equal(await scalar('select opcao_id from escolhas_alimentares'),oid);
 });
 }finally{await db.close();}
});
