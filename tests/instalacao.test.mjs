import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const dir=new URL('../supabase/',import.meta.url);

test('instalar_tudo.sql traz todas as migrações e instala num banco limpo',async()=>{
 const all=(await readFile(new URL('instalar_tudo.sql',dir),'utf8'));
 for(const f of (await readdir(new URL('migrations/',dir))).filter(f=>f.endsWith('.sql')).sort()){
  const body=(await readFile(new URL('migrations/'+f,dir),'utf8')).replace(/\r\n/g,'\n').trim();
  assert.ok(all.includes(body),`${f} não está igual dentro de instalar_tudo.sql — gere o arquivo de novo`);
 }
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 insert into auth.users values('00000000-0000-4000-8000-000000000001','emanuel@exemplo.test');`);
 await db.exec(all.replace('create extension if not exists pgcrypto;',''));
 const row=(await db.query(`select (select count(*)::int from information_schema.tables where table_schema='public') tabelas,(select count(*)::int from storage.buckets where id='saude') bucket_saude,(select count(*)::int from public.perfis where papel='admin') admins`)).rows[0];
 assert.deepEqual(row,{tabelas:26,bucket_saude:1,admins:1});
 }finally{await db.close();}
});
