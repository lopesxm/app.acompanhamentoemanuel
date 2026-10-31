import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const dir=new URL('../supabase/migrations/',import.meta.url);
test('Desenvolvimento: exclusivo, revogável, isolado e auditado',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const f of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec((await readFile(new URL(f,dir),'utf8')).replace('create extension if not exists pgcrypto;','-- gen_random_uuid já existe no Postgres embarcado'));

 const owner='00000000-0000-4000-8000-000000000001',dev='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
 await db.query(`insert into auth.users values($1,'owner@test'),($2,'dev@test'),($3,'other@test')`,[owner,dev,other]);
 await db.query(`insert into perfis(id,papel,nome) values($1,'admin','Emanuel'),($2,'cliente','Junior'),($3,'cliente','Outro')`,[owner,dev,other]);
 await db.query(`insert into acessos_desenvolvimento values($1,$2,true)`,[dev,owner]);
 const as=async(uid,view)=>{await db.exec('reset role');await db.query(`select set_config('request.jwt.claim.sub',$1,false),set_config('request.headers',$2,false)`,[uid,JSON.stringify({'x-grinders-view':view})]);await db.exec('set role authenticated');};
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 await as(other,'admin');assert.equal(await scalar('select ator_aplicativo()'),other);assert.equal(await scalar('select e_admin()'),false);assert.equal(await scalar('select contexto_desenvolvimento()'),null);
 await assert.rejects(()=>db.query('insert into acessos_desenvolvimento values($1,$2,true)',[other,owner]),/permission denied/);
 await as(dev,'cliente');assert.equal(await scalar('select ator_aplicativo()'),dev);assert.equal(await scalar('select e_admin()'),false);
 await as(dev,'admin');assert.equal(await scalar('select ator_aplicativo()'),owner);assert.equal(await scalar('select e_admin()'),true);
 const context=await scalar('select contexto_desenvolvimento()');assert.equal(context.perfil.id,owner);assert.equal(context.executor_id,dev);
 const cid=await scalar(`insert into clientes(nutricionista_id,nome,whatsapp) values($1,'Teste','11999999999') returning id`,[owner]);
 assert.equal(await scalar('select gerencia($1)',[cid]),true);
 await db.query(`update clientes set nome='Editado pelo desenvolvedor' where id=$1`,[cid]);
 await db.exec('reset role');const audit=(await db.query('select executor_id,administrador_id,operacao from auditoria_desenvolvimento order by id')).rows;
 assert.equal(audit.length,2);assert.equal(audit[1].executor_id,dev);assert.equal(audit[1].administrador_id,owner);
 await db.query('update acessos_desenvolvimento set ativo=false where usuario_id=$1',[dev]);
 await as(dev,'admin');assert.equal(await scalar('select e_admin()'),false);assert.equal(await scalar('select contexto_desenvolvimento()'),null);
 assert.equal(await scalar('select count(*)::int from clientes'),0);
 }finally{await db.close();}
});
