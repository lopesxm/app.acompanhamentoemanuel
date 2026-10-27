import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {sugerirKcal,mealKcal,planKcal,eatenKcal,kcalText} from '../assets/js/calorias.js';

test('sugestão pela TACO só quando dá pra calcular com segurança',()=>{
 assert.equal(sugerirKcal('Arroz branco cozido',150,'g').kcal,192);
 assert.equal(sugerirKcal('Batata-doce cozida',200,'g').kcal,154);
 assert.equal(sugerirKcal('Ovos inteiros',3,'unidade').kcal,219);
 assert.equal(sugerirKcal('Doce de leite',15,'g').ref,'Doce de leite cremoso','o mais específico vem antes de "leite"');
 assert.equal(sugerirKcal('Leite',150,'ml').kcal,92);
 assert.equal(sugerirKcal('Macarrão cozido',120,'g'),null,'macarrão não é confundido com maçã');
 assert.equal(sugerirKcal('Maçã',130,'g').kcal,73);
 for(const combo of ['Arroz cozido + feijão','Peixe (atum ou tilápia)','Café com leite'])assert.equal(sugerirKcal(combo,100,'g'),null,combo);
 assert.equal(sugerirKcal('Banana',1,'unidade'),null,'sem peso médio definido, não chuta');
 assert.equal(sugerirKcal('Salada',null,'a gosto'),null);
 assert.deepEqual(sugerirKcal('Arroz cozido',60,'g',[{nome:'Arroz cozido',quantidade_padrao:120,unidade:'g',kcal:160}]),{kcal:80,fonte:'banco',ref:'Arroz cozido'},'o banco do Emanuel tem prioridade');
});

test('totais: faixa por "escolha 1", soma em "todos", salada não conta, faltando valor não mostra total',()=>{
 const almoco={id:'a',grupos:[{regra:'escolher_1',opcoes:[{id:'1',kcal:192},{id:'2',kcal:154}]},{regra:'escolher_1',opcoes:[{id:'3',kcal:191}]},{regra:'a_vontade',opcoes:[{id:'4'}]}]};
 const lanche={id:'b',grupos:[{regra:'todos',opcoes:[{id:'5',kcal:87},{id:'6',kcal:56}]}]};
 assert.deepEqual(mealKcal(almoco),{min:345,max:383,complete:true,missing:0});
 assert.equal(kcalText(planKcal({refeicoes:[almoco,lanche]})),'488–526 kcal');
 assert.equal(planKcal({refeicoes:[almoco,{grupos:[{regra:'escolher_1',opcoes:[{kcal:''}]}]}]}).complete,false);
 assert.deepEqual(eatenKcal({refeicoes:[almoco,lanche]},[{refeicao_id:'a',status:'comi',opcoes_escolhidas:['2','3']},{refeicao_id:'b',status:'pulei',opcoes_escolhidas:[]}]),{kcal:345,complete:true});
});

test('migração 005 salva as kcal de cada opção do plano',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const name of ['001_initial.sql','002_mensagens_casuais.sql','003_comunidade.sql','004_perfis_visuais.sql','005_calorias.sql'])await db.exec((await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
 const admin='00000000-0000-4000-8000-000000000001';
 await db.query(`insert into auth.users values($1,'admin@exemplo.test')`,[admin]);await db.query(`insert into perfis(id,papel,nome) values($1,'admin','Emanuel')`,[admin]);
 await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[admin]);await db.exec('set role authenticated');
 const cid=(await db.query(`insert into clientes(nutricionista_id,nome,whatsapp) values($1,'Cliente','5511999999999') returning id`,[admin])).rows[0].id;
 const payload={inicio_em:'2020-01-01',refeicoes:[{nome:'Almoço',horario:'12:00',grupos:[{nome:'Carboidrato',regra:'escolher_1',opcoes:[{descricao:'Arroz',quantidade:150,unidade:'g',kcal:192},{descricao:'Batata',quantidade:200,unidade:'g',kcal:''}]}]}]};
 await db.query('select salvar_plano($1,$2,null)',[cid,payload]);
 assert.deepEqual((await db.query('select descricao,kcal::int from opcoes order by ordem')).rows,[{descricao:'Arroz',kcal:192},{descricao:'Batata',kcal:null}]);
 await assert.rejects(()=>db.query(`insert into alimentos(nutricionista_id,nome,kcal) values($1,'X',-5)`,[admin]),/check/);
 }finally{await db.close();}
});
