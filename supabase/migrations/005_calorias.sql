-- Calorias informadas pelo Emanuel em cada opção do plano e no banco de alimentos. Aplicar após 004.
-- O app pode sugerir um valor pela tabela TACO no editor, mas só o valor salvo aqui (revisado pelo Emanuel) chega ao cliente.
begin;
alter table public.opcoes add column kcal numeric check(kcal>=0 and kcal<10000);
alter table public.alimentos add column kcal numeric check(kcal>=0 and kcal<10000);
create or replace function public.salvar_plano(cid uuid,payload jsonb,pid uuid default null) returns uuid language plpgsql security definer set search_path=public as $$declare mid uuid;gid uuid;m jsonb;g jsonb;o jsonb;mi int:=0;gi int;oi int;begin
 if not gerencia(cid) then raise exception 'Opa, você não tem acesso a isso.';end if;
 perform 1 from clientes where id=cid for update;
 if pid is null then insert into planos(cliente_id,nutricionista_id) values(cid,auth.uid()) returning id into pid;
 else perform 1 from planos where id=pid and cliente_id=cid and status='rascunho' for update;if not found then raise exception 'Esse plano já foi publicado. Faz uma cópia pra editar.';end if;end if;
 update planos set observacoes_gerais=payload->>'observacoes_gerais',inicio_em=coalesce(nullif(payload->>'inicio_em','')::date,current_date) where id=pid;
 delete from refeicoes where plano_id=pid;
 for m in select * from jsonb_array_elements(payload->'refeicoes') loop
 insert into refeicoes(plano_id,nome,horario,ordem,observacoes) values(pid,m->>'nome',m->>'horario',mi,m->>'observacoes') returning id into mid;mi:=mi+1;gi:=0;
 for g in select * from jsonb_array_elements(m->'grupos') loop
 insert into grupos(refeicao_id,nome,regra,ordem) values(mid,g->>'nome',g->>'regra',gi) returning id into gid;gi:=gi+1;oi:=0;
 for o in select * from jsonb_array_elements(g->'opcoes') loop
 insert into opcoes(grupo_id,descricao,quantidade,unidade,medida_caseira,observacao,kcal,ordem) values(gid,o->>'descricao',nullif(o->>'quantidade','')::numeric,o->>'unidade',o->>'medida_caseira',o->>'observacao',nullif(o->>'kcal','')::numeric,oi);oi:=oi+1;
 end loop;end loop;end loop;return pid;
end $$;
commit;
