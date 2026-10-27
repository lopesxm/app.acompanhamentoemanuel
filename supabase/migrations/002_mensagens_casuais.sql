-- Mensagens de erro no tom casual do app. Mesma lógica e permissões da 001; só os textos mudam.
begin;
create or replace function public.novo_convite(cid uuid) returns uuid language plpgsql security definer set search_path=public as $$declare result uuid;begin
 if not gerencia(cid) then raise exception 'Opa, você não tem acesso a isso.';end if;
 perform 1 from clientes where id=cid and usuario_id is null for update;
 if not found then raise exception 'Esse cliente já tem acesso, não precisa de convite novo.';end if;
 update convites set expira_em=now() where cliente_id=cid and usado_em is null;
 insert into convites(cliente_id) values(cid) returning token into result;return result;
end $$;
create or replace function public.aceitar_convite(token_convite uuid,consentiu boolean) returns uuid language plpgsql security definer set search_path=public as $$declare c convites;cid uuid;begin
 if auth.uid() is null or consentiu is not true then raise exception 'Pra continuar, entra na sua conta e aceita o termo de consentimento.';end if;
 select * into c from convites where token=token_convite for update;
 if not found or c.usado_em is not null or c.expira_em<=now() then raise exception 'Oh meu amigo, esse convite não vale mais (já foi usado ou expirou). Pede um novo pro Emanuel.';end if;
 if exists(select 1 from perfis where id=auth.uid()) then raise exception 'Essa conta já tá cadastrada. É só entrar pelo login.';end if;
 perform 1 from clientes where id=c.cliente_id and usuario_id is null for update;
 if not found then raise exception 'Esse convite já foi usado por outra conta. Pede um novo pro Emanuel.';end if;
 insert into perfis(id,papel,nome) select auth.uid(),'cliente',nome from clientes where id=c.cliente_id;
 update clientes set usuario_id=auth.uid(),email=(select email from auth.users where id=auth.uid()),status='ficha_pendente' where id=c.cliente_id;
 update convites set usado_em=now() where id=c.id;
 insert into fichas(cliente_id,consentimento_em,consentimento_versao) values(c.cliente_id,now(),'1.0');
 return c.cliente_id;
end $$;
create or replace function public.salvar_ficha(cid uuid,respostas jsonb,etapa integer,concluir boolean default false) returns void language plpgsql security definer set search_path=public as $$begin
 if not (e_cliente(cid) or gerencia(cid)) then raise exception 'Opa, você não tem acesso a isso.';end if;
 if concluir and (not respostas ?& array['nome','nascimento','sexo','whatsapp','email','peso','altura','objetivo','acorda','dorme','alergias'] or exists(select 1 from jsonb_each_text(respostas) where key=any(array['nome','nascimento','sexo','whatsapp','email','peso','altura','objetivo','acorda','dorme','alergias']) and trim(value)='')) then raise exception 'Faltou preencher alguns campos obrigatórios.';end if;
 update fichas set dados=respostas,etapa_atual=etapa,concluida_em=case when concluir then now() else concluida_em end,atualizado_em=now() where cliente_id=cid;
 if not found then raise exception 'Antes da ficha, aceita o termo de consentimento pelo link do convite.';end if;
 if concluir then update clientes set status='aguardando_plano' where id=cid and status='ficha_pendente';end if;
end $$;
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
 insert into opcoes(grupo_id,descricao,quantidade,unidade,medida_caseira,observacao,ordem) values(gid,o->>'descricao',nullif(o->>'quantidade','')::numeric,o->>'unidade',o->>'medida_caseira',o->>'observacao',oi);oi:=oi+1;
 end loop;end loop;end loop;return pid;
end $$;
create or replace function public.publicar_plano(pid uuid) returns void language plpgsql security definer set search_path=public as $$declare cid uuid;v integer;begin
 select cliente_id into cid from planos where id=pid;
 if cid is null or not gerencia(cid) then raise exception 'Opa, você não tem acesso a isso.';end if;
 perform 1 from clientes where id=cid for update;
 perform 1 from planos where id=pid and status='rascunho' for update;if not found then raise exception 'Esse plano já foi publicado.';end if;
 if not exists(select 1 from refeicoes where plano_id=pid) or exists(select 1 from refeicoes r where plano_id=pid and (trim(r.nome)='' or r.horario !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or not exists(select 1 from grupos where refeicao_id=r.id))) or exists(select 1 from grupos g join refeicoes r on r.id=g.refeicao_id where r.plano_id=pid and (trim(g.nome)='' or not exists(select 1 from opcoes where grupo_id=g.id))) or exists(select 1 from opcoes o join grupos g on g.id=o.grupo_id join refeicoes r on r.id=g.refeicao_id where r.plano_id=pid and (trim(o.descricao)='' or (g.regra<>'a_vontade' and coalesce(o.quantidade,0)<=0))) then raise exception 'Falta coisa no plano: confere refeições, grupos e quantidades.';end if;
 select coalesce(max(versao),0)+1 into v from planos where cliente_id=cid;
 update planos set status='arquivado' where cliente_id=cid and status='publicado';
 update planos set status='publicado',versao=v,publicado_em=now() where id=pid;
 update clientes set status='ativo' where id=cid;
end $$;
create or replace function public.validar_registro() returns trigger language plpgsql security definer set search_path=public as $$declare grp record;n int;begin
 if tg_op='UPDATE' then if old.data<>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Esse dia já fechou, não dá mais pra mudar o registro.';end if;end if;
 if new.data<>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Só dá pra anotar refeições do dia de hoje.';end if;
 if not exists(select 1 from refeicoes r join planos p on p.id=r.plano_id where r.id=new.refeicao_id and p.cliente_id=new.cliente_id and p.status='publicado') then raise exception 'Essa refeição não tá no seu plano atual.';end if;
 if cardinality(new.opcoes_escolhidas)<>(select count(distinct x) from unnest(new.opcoes_escolhidas) x) then raise exception 'Tá zuado isso: tem opção repetida aí.';end if;
 if exists(select 1 from unnest(new.opcoes_escolhidas) x where not exists(select 1 from opcoes o join grupos g on g.id=o.grupo_id where o.id=x and g.refeicao_id=new.refeicao_id)) then raise exception 'Essa opção é de outra refeição.';end if;
 if new.status='pulei' then new.opcoes_escolhidas:='{}';else
 for grp in select * from grupos where refeicao_id=new.refeicao_id loop
 select count(*) into n from opcoes where grupo_id=grp.id and id=any(new.opcoes_escolhidas);
 if (grp.regra='escolher_1' and n<>1) or (grp.regra in ('todos','a_vontade') and n<>(select count(*) from opcoes where grupo_id=grp.id)) then raise exception 'Escolhe uma opção de cada grupo antes de marcar.';end if;
 end loop;end if;
 select nome into new.refeicao_nome from refeicoes where id=new.refeicao_id;
 select coalesce(string_agg(o.descricao||' '||case when gr.regra='a_vontade' then 'à vontade' else coalesce(o.quantidade::text,'')||' '||coalesce(o.unidade,'') end,'; ' order by gr.ordem,o.ordem),'') into new.detalhes from opcoes o join grupos gr on gr.id=o.grupo_id where o.id=any(new.opcoes_escolhidas);
 return new;
end $$;
create or replace function public.validar_vinculo() returns trigger language plpgsql security definer set search_path=public as $$declare cid uuid;begin
 if tg_table_name='comentarios' then
 if new.alvo_tipo='registro' then select cliente_id into cid from registros_refeicao where id=new.alvo_id;
 elsif new.alvo_tipo='foto' then select cliente_id into cid from fotos_refeicao where id=new.alvo_id;
 else select cliente_id into cid from fugas where id=new.alvo_id;end if;
 if cid is distinct from new.cliente_id then raise exception 'Esse registro não é desse cliente.';end if;
 else
 if split_part(new.caminho_storage,'/',1)<>new.cliente_id::text then raise exception 'Caminho do arquivo tá zuado.';end if;
 if tg_table_name='fotos_refeicao' then
 if new.registro_id is not null then select cliente_id into cid from registros_refeicao where id=new.registro_id;if cid is distinct from new.cliente_id then raise exception 'Esse registro é de outro cliente.';end if;end if;
 end if;
 end if;return new;
end $$;
commit;
