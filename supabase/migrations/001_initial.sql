-- Execute no SQL Editor de um projeto Supabase novo.
begin;
create extension if not exists pgcrypto;
create table public.perfis(id uuid primary key references auth.users on delete cascade,papel text not null check(papel in ('admin','cliente')),nome text not null,criado_em timestamptz not null default now());
create table public.clientes(id uuid primary key default gen_random_uuid(),nutricionista_id uuid not null references public.perfis,usuario_id uuid unique references public.perfis,nome text not null,whatsapp text not null,email text,status text not null default 'convite_pendente' check(status in ('convite_pendente','ficha_pendente','aguardando_plano','ativo','inativo')),frequencia_peso integer not null default 7 check(frequencia_peso>0),criado_em timestamptz not null default now());
create table public.convites(id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes on delete cascade,token uuid not null unique default gen_random_uuid(),expira_em timestamptz not null default now()+interval '7 days',usado_em timestamptz);
create table public.fichas(cliente_id uuid primary key references public.clientes on delete cascade,dados jsonb not null default '{}',etapa_atual integer not null default 0,concluida_em timestamptz,consentimento_em timestamptz,consentimento_versao text,atualizado_em timestamptz not null default now());
create table public.fichas_tecnicas(cliente_id uuid primary key references public.clientes on delete cascade,estrategia text,fator_atividade numeric default 1.2,formula_calculo text default 'mifflin',anotacoes_privadas text);
create table public.alimentos(id uuid primary key default gen_random_uuid(),nutricionista_id uuid not null references public.perfis,nome text not null,quantidade_padrao numeric check(quantidade_padrao>0),unidade text,medida_caseira text);
create table public.planos(id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes on delete cascade,nutricionista_id uuid not null references public.perfis,versao integer not null default 0,status text not null default 'rascunho' check(status in ('rascunho','publicado','arquivado')),observacoes_gerais text,inicio_em date not null default current_date,publicado_em timestamptz);
create unique index unico_plano_publicado on public.planos(cliente_id) where status='publicado';
create table public.refeicoes(id uuid primary key default gen_random_uuid(),plano_id uuid not null references public.planos on delete cascade,nome text not null,horario text not null,ordem integer not null,observacoes text);
create table public.grupos(id uuid primary key default gen_random_uuid(),refeicao_id uuid not null references public.refeicoes on delete cascade,nome text not null,regra text not null check(regra in ('escolher_1','todos','a_vontade')),ordem integer not null);
create table public.opcoes(id uuid primary key default gen_random_uuid(),grupo_id uuid not null references public.grupos on delete cascade,alimento_id uuid references public.alimentos on delete set null,descricao text not null,quantidade numeric,unidade text,medida_caseira text,observacao text,ordem integer not null);
create table public.registros_refeicao(id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes on delete cascade,refeicao_id uuid not null references public.refeicoes on delete cascade,data date not null default current_date,status text not null check(status in ('comi','pulei')),refeicao_nome text,detalhes text,opcoes_escolhidas uuid[] not null default '{}',criado_em timestamptz not null default now(),unique(cliente_id,refeicao_id,data));
create table public.fotos_refeicao(id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes on delete cascade,registro_id uuid references public.registros_refeicao on delete set null,caminho_storage text not null,data date not null default current_date,criado_em timestamptz not null default now());
create table public.fugas(id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes on delete cascade,data date not null default current_date,horario text,descricao text not null,motivo text,criado_em timestamptz not null default now());
create table public.medidas(id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes on delete cascade,data date not null default current_date,peso numeric not null check(peso>0 and peso<600),cintura numeric,quadril numeric,braco numeric,coxa numeric,criado_em timestamptz not null default now());
create table public.arquivos(id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes on delete cascade,tipo text not null check(tipo in ('exame','frente','lado','costas')),caminho_storage text not null,criado_em timestamptz not null default now());
create table public.comentarios(id uuid primary key default gen_random_uuid(),cliente_id uuid not null references public.clientes on delete cascade,autor_id uuid not null references public.perfis,alvo_tipo text not null check(alvo_tipo in ('registro','foto','fuga')),alvo_id uuid not null,texto text not null,criado_em timestamptz not null default now());
create table public.modelos(id uuid primary key default gen_random_uuid(),nutricionista_id uuid not null references public.perfis,nome text not null,tipo text not null default 'plano' check(tipo in ('plano','refeicao')),conteudo jsonb not null);
create table public.configuracoes(nutricionista_id uuid primary key references public.perfis,sem_registro_dias integer not null default 3 check(sem_registro_dias>0),adesao_minima integer not null default 60 check(adesao_minima between 0 and 100));
create function public.e_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from perfis where id=auth.uid() and papel='admin')$$;
create function public.gerencia(cid uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from clientes where id=cid and nutricionista_id=auth.uid()) and e_admin()$$;
create function public.e_cliente(cid uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from clientes where id=cid and usuario_id=auth.uid() and status<>'inativo')$$;
create function public.pode_ler_plano(pid uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from planos where id=pid and (gerencia(cliente_id) or (e_cliente(cliente_id) and status='publicado')))$$;
create function public.plano_do_grupo(gid uuid) returns uuid language sql stable security definer set search_path=public as $$select r.plano_id from grupos g join refeicoes r on r.id=g.refeicao_id where g.id=gid$$;
alter table perfis enable row level security;
create policy perfil_proprio on perfis for select to authenticated using(id=auth.uid());
alter table clientes enable row level security;
create policy clientes_leitura on clientes for select to authenticated using((nutricionista_id=auth.uid() and e_admin()) or (usuario_id=auth.uid() and status<>'inativo'));
create policy clientes_insercao on clientes for insert to authenticated with check(nutricionista_id=auth.uid() and e_admin() and usuario_id is null and status='convite_pendente');
create policy clientes_edicao on clientes for update to authenticated using(gerencia(id)) with check(nutricionista_id=auth.uid() and e_admin());
create policy clientes_exclusao on clientes for delete to authenticated using(gerencia(id));
alter table convites enable row level security;
create policy convites_admin on convites for all to authenticated using(gerencia(cliente_id)) with check(gerencia(cliente_id));
alter table fichas enable row level security;
create policy ficha_leitura on fichas for select to authenticated using(gerencia(cliente_id) or e_cliente(cliente_id));
-- Escrita de ficha somente por RPC para preservar consentimento e validar conclusão.
alter table fichas_tecnicas enable row level security;
create policy tecnica_admin on fichas_tecnicas for all to authenticated using(gerencia(cliente_id)) with check(gerencia(cliente_id));
alter table planos enable row level security;
create policy planos_leitura on planos for select to authenticated using(pode_ler_plano(id));
alter table refeicoes enable row level security;
create policy refeicoes_leitura on refeicoes for select to authenticated using(pode_ler_plano(plano_id));
alter table grupos enable row level security;
create policy grupos_leitura on grupos for select to authenticated using(pode_ler_plano(plano_do_grupo(id)));
alter table opcoes enable row level security;
create policy opcoes_leitura on opcoes for select to authenticated using(pode_ler_plano(plano_do_grupo(grupo_id)));
do $$declare t text;begin
 foreach t in array array['registros_refeicao','fotos_refeicao','fugas','medidas','arquivos'] loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy leitura on %I for select to authenticated using(gerencia(cliente_id) or e_cliente(cliente_id))',t);
 execute format('create policy insercao on %I for insert to authenticated with check(e_cliente(cliente_id))',t);
 execute format('create policy edicao on %I for update to authenticated using(e_cliente(cliente_id)) with check(e_cliente(cliente_id))',t);
 execute format('create policy exclusao on %I for delete to authenticated using(e_cliente(cliente_id) or gerencia(cliente_id))',t);
 end loop;
 foreach t in array array['alimentos','modelos','configuracoes'] loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy somente_admin on %I for all to authenticated using(nutricionista_id=auth.uid() and e_admin()) with check(nutricionista_id=auth.uid() and e_admin())',t);
 end loop;
end $$;
alter table comentarios enable row level security;
create policy comentario_leitura on comentarios for select to authenticated using(gerencia(cliente_id) or e_cliente(cliente_id));
create policy comentario_escrita on comentarios for insert to authenticated with check(gerencia(cliente_id) and autor_id=auth.uid());
create policy comentario_exclusao on comentarios for delete to authenticated using(gerencia(cliente_id));
create function public.novo_convite(cid uuid) returns uuid language plpgsql security definer set search_path=public as $$declare result uuid;begin
 if not gerencia(cid) then raise exception 'Acesso negado';end if;
 perform 1 from clientes where id=cid and usuario_id is null for update;
 if not found then raise exception 'Cliente já possui acesso';end if;
 update convites set expira_em=now() where cliente_id=cid and usado_em is null;
 insert into convites(cliente_id) values(cid) returning token into result;return result;
end $$;
create function public.aceitar_convite(token_convite uuid,consentiu boolean) returns uuid language plpgsql security definer set search_path=public as $$declare c convites;cid uuid;begin
 if auth.uid() is null or consentiu is not true then raise exception 'Autenticação e consentimento são obrigatórios';end if;
 select * into c from convites where token=token_convite for update;
 if not found or c.usado_em is not null or c.expira_em<=now() then raise exception 'Convite inválido, usado ou expirado';end if;
 if exists(select 1 from perfis where id=auth.uid()) then raise exception 'Esta conta já tem um perfil';end if;
 perform 1 from clientes where id=c.cliente_id and usuario_id is null for update;
 if not found then raise exception 'Cliente já vinculado';end if;
 insert into perfis(id,papel,nome) select auth.uid(),'cliente',nome from clientes where id=c.cliente_id;
 update clientes set usuario_id=auth.uid(),email=(select email from auth.users where id=auth.uid()),status='ficha_pendente' where id=c.cliente_id;
 update convites set usado_em=now() where id=c.id;
 insert into fichas(cliente_id,consentimento_em,consentimento_versao) values(c.cliente_id,now(),'1.0');
 return c.cliente_id;
end $$;
create function public.salvar_ficha(cid uuid,respostas jsonb,etapa integer,concluir boolean default false) returns void language plpgsql security definer set search_path=public as $$begin
 if not (e_cliente(cid) or gerencia(cid)) then raise exception 'Acesso negado';end if;
 if concluir and (not respostas ?& array['nome','nascimento','sexo','whatsapp','email','peso','altura','objetivo','acorda','dorme','alergias'] or exists(select 1 from jsonb_each_text(respostas) where key=any(array['nome','nascimento','sexo','whatsapp','email','peso','altura','objetivo','acorda','dorme','alergias']) and trim(value)='')) then raise exception 'Preencha os campos obrigatórios';end if;
 update fichas set dados=respostas,etapa_atual=etapa,concluida_em=case when concluir then now() else concluida_em end,atualizado_em=now() where cliente_id=cid;
 if not found then raise exception 'Consentimento não registrado';end if;
 if concluir then update clientes set status='aguardando_plano' where id=cid and status='ficha_pendente';end if;
end $$;
create function public.salvar_plano(cid uuid,payload jsonb,pid uuid default null) returns uuid language plpgsql security definer set search_path=public as $$declare mid uuid;gid uuid;m jsonb;g jsonb;o jsonb;mi int:=0;gi int;oi int;begin
 if not gerencia(cid) then raise exception 'Acesso negado';end if;
 perform 1 from clientes where id=cid for update;
 if pid is null then insert into planos(cliente_id,nutricionista_id) values(cid,auth.uid()) returning id into pid;
 else perform 1 from planos where id=pid and cliente_id=cid and status='rascunho' for update;if not found then raise exception 'Somente rascunhos podem ser editados';end if;end if;
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
create function public.publicar_plano(pid uuid) returns void language plpgsql security definer set search_path=public as $$declare cid uuid;v integer;begin
 select cliente_id into cid from planos where id=pid;
 if cid is null or not gerencia(cid) then raise exception 'Acesso negado';end if;
 perform 1 from clientes where id=cid for update;
 perform 1 from planos where id=pid and status='rascunho' for update;if not found then raise exception 'Plano não é rascunho';end if;
 if not exists(select 1 from refeicoes where plano_id=pid) or exists(select 1 from refeicoes r where plano_id=pid and (trim(r.nome)='' or r.horario !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or not exists(select 1 from grupos where refeicao_id=r.id))) or exists(select 1 from grupos g join refeicoes r on r.id=g.refeicao_id where r.plano_id=pid and (trim(g.nome)='' or not exists(select 1 from opcoes where grupo_id=g.id))) or exists(select 1 from opcoes o join grupos g on g.id=o.grupo_id join refeicoes r on r.id=g.refeicao_id where r.plano_id=pid and (trim(o.descricao)='' or (g.regra<>'a_vontade' and coalesce(o.quantidade,0)<=0))) then raise exception 'Plano incompleto: revise refeições, grupos e quantidades';end if;
 select coalesce(max(versao),0)+1 into v from planos where cliente_id=cid;
 update planos set status='arquivado' where cliente_id=cid and status='publicado';
 update planos set status='publicado',versao=v,publicado_em=now() where id=pid;
 update clientes set status='ativo' where id=cid;
end $$;
create function public.validar_registro() returns trigger language plpgsql security definer set search_path=public as $$declare grp record;n int;begin
 if tg_op='UPDATE' then if old.data<>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Registro de dia encerrado';end if;end if;
 if new.data<>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Registros de refeições só podem ser alterados no dia atual';end if;
 if not exists(select 1 from refeicoes r join planos p on p.id=r.plano_id where r.id=new.refeicao_id and p.cliente_id=new.cliente_id and p.status='publicado') then raise exception 'Refeição inválida';end if;
 if cardinality(new.opcoes_escolhidas)<>(select count(distinct x) from unnest(new.opcoes_escolhidas) x) then raise exception 'Opções repetidas';end if;
 if exists(select 1 from unnest(new.opcoes_escolhidas) x where not exists(select 1 from opcoes o join grupos g on g.id=o.grupo_id where o.id=x and g.refeicao_id=new.refeicao_id)) then raise exception 'Opção de outra refeição';end if;
 if new.status='pulei' then new.opcoes_escolhidas:='{}';else
 for grp in select * from grupos where refeicao_id=new.refeicao_id loop
 select count(*) into n from opcoes where grupo_id=grp.id and id=any(new.opcoes_escolhidas);
 if (grp.regra='escolher_1' and n<>1) or (grp.regra in ('todos','a_vontade') and n<>(select count(*) from opcoes where grupo_id=grp.id)) then raise exception 'Selecione as opções de cada grupo';end if;
 end loop;end if;
 select nome into new.refeicao_nome from refeicoes where id=new.refeicao_id;
 select coalesce(string_agg(o.descricao||' '||case when gr.regra='a_vontade' then 'à vontade' else coalesce(o.quantidade::text,'')||' '||coalesce(o.unidade,'') end,'; ' order by gr.ordem,o.ordem),'') into new.detalhes from opcoes o join grupos gr on gr.id=o.grupo_id where o.id=any(new.opcoes_escolhidas);
 return new;
end $$;
create trigger validar_registro before insert or update on registros_refeicao for each row execute function validar_registro();
create function public.validar_vinculo() returns trigger language plpgsql security definer set search_path=public as $$declare cid uuid;begin
 if tg_table_name='comentarios' then
 if new.alvo_tipo='registro' then select cliente_id into cid from registros_refeicao where id=new.alvo_id;
 elsif new.alvo_tipo='foto' then select cliente_id into cid from fotos_refeicao where id=new.alvo_id;
 else select cliente_id into cid from fugas where id=new.alvo_id;end if;
 if cid is distinct from new.cliente_id then raise exception 'Registro não pertence ao cliente';end if;
 else
 if split_part(new.caminho_storage,'/',1)<>new.cliente_id::text then raise exception 'Caminho inválido';end if;
 if tg_table_name='fotos_refeicao' then
 if new.registro_id is not null then select cliente_id into cid from registros_refeicao where id=new.registro_id;if cid is distinct from new.cliente_id then raise exception 'Registro de outro cliente';end if;end if;
 end if;
 end if;return new;
end $$;
create trigger vinculo_comentario before insert or update on comentarios for each row execute function validar_vinculo();
create trigger vinculo_foto before insert or update on fotos_refeicao for each row execute function validar_vinculo();
create trigger vinculo_arquivo before insert or update on arquivos for each row execute function validar_vinculo();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('saude','saude',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create function public.cliente_do_caminho(p text) returns uuid language plpgsql immutable as $$begin return split_part(p,'/',1)::uuid;exception when others then return null;end $$;
create policy saude_leitura on storage.objects for select to authenticated using(bucket_id='saude' and (public.e_cliente(public.cliente_do_caminho(name)) or public.gerencia(public.cliente_do_caminho(name))));
create policy saude_upload on storage.objects for insert to authenticated with check(bucket_id='saude' and public.e_cliente(public.cliente_do_caminho(name)));
create policy saude_exclusao on storage.objects for delete to authenticated using(bucket_id='saude' and (public.e_cliente(public.cliente_do_caminho(name)) or public.gerencia(public.cliente_do_caminho(name))));
-- Negar RPCs a visitantes. SECURITY DEFINER sempre verifica o usuário e o cliente.
revoke all on all functions in schema public from public,anon;
grant execute on all functions in schema public to authenticated;
grant usage on schema public to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
create index clientes_nutricionista on clientes(nutricionista_id);
create index registros_cliente_data on registros_refeicao(cliente_id,data);
create index planos_cliente on planos(cliente_id);
create index medidas_cliente_data on medidas(cliente_id,data);
commit;
