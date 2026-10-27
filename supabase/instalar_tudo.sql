-- Instalação completa do sistema num projeto Supabase NOVO (gerado a partir de supabase/migrations/001 a 005).
-- Antes de rodar: crie a conta do Emanuel em Authentication → Users (Add user, marque Auto Confirm User).
-- Depois cole este arquivo inteiro no SQL Editor e clique em Run. Não rode num projeto que já tem as tabelas.

-- ========== 001_initial.sql ==========
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

-- ========== 002_mensagens_casuais.sql ==========
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

-- ========== 003_comunidade.sql ==========
-- Fase 5: comunidade. Clientes não leem estas tabelas direto: tudo passa por funções que aplicam as regras de privacidade.
begin;
create table public.comunidade_perfis(cliente_id uuid primary key references public.clientes on delete cascade,usuario text not null unique check(usuario ~ '^[a-z0-9_.]{3,20}$'),nome text not null check(char_length(nome) between 1 and 40),mostrar_peso boolean not null default false,ativo boolean not null default true,ativado_em timestamptz not null default now());
create table public.seguidores(seguidor_id uuid not null references public.clientes on delete cascade,seguido_id uuid not null references public.clientes on delete cascade,status text not null default 'pendente' check(status in ('pendente','aceito')),criado_em timestamptz not null default now(),primary key(seguidor_id,seguido_id),check(seguidor_id<>seguido_id));
create table public.posts(id uuid primary key default gen_random_uuid(),nutricionista_id uuid not null references public.perfis,cliente_id uuid references public.clientes on delete cascade,tipo text not null check(tipo in ('foto','resumo','conquista','dica')),texto text check(char_length(texto)<=1000),foto_caminho text,dentro_do_plano boolean not null default false,dados jsonb not null default '{}',oculto boolean not null default false,criado_em timestamptz not null default now(),check((tipo='dica')=(cliente_id is null)));
create table public.curtidas(post_id uuid not null references public.posts on delete cascade,perfil_id uuid not null references public.perfis on delete cascade,criado_em timestamptz not null default now(),primary key(post_id,perfil_id));
create table public.comentarios_post(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts on delete cascade,autor_id uuid not null references public.perfis on delete cascade,texto text not null check(char_length(trim(texto)) between 1 and 500),oculto boolean not null default false,criado_em timestamptz not null default now());
create index posts_feed on public.posts(nutricionista_id,criado_em desc);
create index posts_cliente on public.posts(cliente_id,criado_em desc);
create index seguidores_seguido on public.seguidores(seguido_id,status);
create index comentarios_post_post on public.comentarios_post(post_id,criado_em);
do $$declare t text;begin
 foreach t in array array['comunidade_perfis','seguidores','posts','curtidas','comentarios_post'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;

-- Funções internas (não expostas aos clientes).
create function public.hoje_sp() returns date language sql stable as $$select (now() at time zone 'America/Sao_Paulo')::date$$;
create function public.cliente_atual() returns uuid language sql stable security definer set search_path=public as $$select id from clientes where usuario_id=auth.uid() and status<>'inativo'$$;
create function public.na_comunidade(cid uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from comunidade_perfis where cliente_id=cid and ativo)$$;
create function public.segue(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from seguidores where seguidor_id=a and seguido_id=b and status='aceito')$$;
create function public.exigir_comunidade() returns uuid language plpgsql stable security definer set search_path=public as $$declare me uuid:=cliente_atual();begin
 if me is null or not na_comunidade(me) then raise exception 'Ativa a comunidade primeiro.';end if;return me;
end $$;
create function public.refeicoes_previstas(cid uuid,dia date) returns int language sql stable security definer set search_path=public as $$
 select coalesce((select count(*)::int from refeicoes r where r.plano_id=(select p.id from planos p where p.cliente_id=cid and p.status in ('publicado','arquivado') and p.inicio_em<=dia and coalesce(p.publicado_em::date,p.inicio_em)<=dia order by p.versao desc limit 1)),0)$$;
create function public.refeicoes_feitas(cid uuid,dia date) returns int language sql stable security definer set search_path=public as $$select count(*)::int from registros_refeicao where cliente_id=cid and data=dia and status='comi'$$;
create function public.adesao_periodo(cid uuid,inicio date,fim date) returns int language sql stable security definer set search_path=public as $$
 select case when sum(prev)>0 then least(100,round(100.0*sum(feitas)/sum(prev)))::int end from (select refeicoes_previstas(cid,d::date) prev,refeicoes_feitas(cid,d::date) feitas from generate_series(inicio,fim,interval '1 day') d) x$$;
create function public.sequencia_dias(cid uuid) returns int language plpgsql stable security definer set search_path=public as $$declare d date:=hoje_sp();n int:=0;begin
 if refeicoes_feitas(cid,d)=0 then d:=d-1;end if;
 while refeicoes_feitas(cid,d)>0 loop n:=n+1;d:=d-1;end loop;return n;
end $$;
create function public.pode_ver_post(pid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from posts p where p.id=pid and (
  (e_admin() and p.nutricionista_id=auth.uid())
  or (p.cliente_id is not null and p.cliente_id=cliente_atual() and na_comunidade(p.cliente_id))
  or (not p.oculto and na_comunidade(cliente_atual()) and (
   (p.cliente_id is null and p.nutricionista_id=(select nutricionista_id from clientes where id=cliente_atual()))
   or (na_comunidade(p.cliente_id) and segue(cliente_atual(),p.cliente_id))))))$$;
create function public.conquistas_disponiveis(cid uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$declare seq int:=sequencia_dias(cid);inicio date:=date_trunc('week',hoje_sp())::date;r jsonb:='[]';n int;begin
 foreach n in array array[30,14,7] loop
 if seq>=n then r:=r||jsonb_build_object('codigo','sequencia_'||n,'titulo',n||' dias seguidos','chave','sequencia_'||n||':'||inicio);exit;end if;
 end loop;
 if adesao_periodo(cid,inicio-7,inicio-1)=100 then r:=r||jsonb_build_object('codigo','semana_100','titulo','Semana 100%','chave','semana_100:'||(inicio-7));end if;
 return (select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(r) c where not exists(select 1 from posts where cliente_id=cid and tipo='conquista' and dados->>'chave'=c->>'chave'));
end $$;
create function public.resumo_comparacao(cid uuid,inicio date) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('cliente_id',cid,'nome',cp.nome,'usuario',cp.usuario,'adesao',adesao_periodo(cid,inicio,hoje_sp()),'feitas',(select count(*) from registros_refeicao where cliente_id=cid and status='comi' and data between inicio and hoje_sp()),'sequencia',sequencia_dias(cid),'dias_registrados',(select count(distinct data) from registros_refeicao where cliente_id=cid)) from comunidade_perfis cp where cp.cliente_id=cid$$;
create function public.pode_ver_foto_post(caminho text) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from posts where foto_caminho=caminho and pode_ver_post(id))$$;

-- Perfil e conexões.
create function public.ativar_comunidade(p_usuario text,p_nome text,p_mostrar_peso boolean default false) returns void language plpgsql security definer set search_path=public as $$declare me uuid:=cliente_atual();u text:=lower(trim(coalesce(p_usuario,'')));begin
 if me is null then raise exception 'Opa, você não tem acesso a isso.';end if;
 if u !~ '^[a-z0-9_.]{3,20}$' then raise exception 'O @ precisa ter de 3 a 20 caracteres: letras, números, ponto ou _.';end if;
 -- Ninguém se passa pelo Emanuel ou pela equipe.
 if u ~ '^(emanuel|nutri|admin|suporte|oficial)' then raise exception 'Esse @ é reservado. Escolhe outro.';end if;
 if exists(select 1 from comunidade_perfis where usuario=u and cliente_id<>me) then raise exception 'Esse @ já tem dono. Tenta outro.';end if;
 if coalesce(trim(p_nome),'')='' or char_length(trim(p_nome))>40 then raise exception 'Escolhe um nome de até 40 caracteres.';end if;
 insert into comunidade_perfis(cliente_id,usuario,nome,mostrar_peso) values(me,u,trim(p_nome),coalesce(p_mostrar_peso,false))
 on conflict(cliente_id) do update set usuario=excluded.usuario,nome=excluded.nome,mostrar_peso=excluded.mostrar_peso,ativo=true,ativado_em=case when comunidade_perfis.ativo then comunidade_perfis.ativado_em else now() end;
end $$;
create function public.desativar_comunidade() returns void language plpgsql security definer set search_path=public as $$begin
 update comunidade_perfis set ativo=false where cliente_id=cliente_atual();
end $$;
create function public.minha_comunidade() returns jsonb language plpgsql stable security definer set search_path=public as $$declare me uuid:=cliente_atual();cp comunidade_perfis;begin
 if me is null then raise exception 'Opa, você não tem acesso a isso.';end if;
 select * into cp from comunidade_perfis where cliente_id=me;
 if not found or not cp.ativo then return jsonb_build_object('perfil',case when found then jsonb_build_object('usuario',cp.usuario,'nome',cp.nome,'mostrar_peso',cp.mostrar_peso,'ativo',false) end);end if;
 return jsonb_build_object('perfil',jsonb_build_object('cliente_id',me,'usuario',cp.usuario,'nome',cp.nome,'mostrar_peso',cp.mostrar_peso,'ativo',true),
  'pedidos',(select coalesce(jsonb_agg(jsonb_build_object('cliente_id',x.cliente_id,'nome',x.nome,'usuario',x.usuario) order by s.criado_em desc),'[]') from seguidores s join comunidade_perfis x on x.cliente_id=s.seguidor_id and x.ativo where s.seguido_id=me and s.status='pendente'),
  'seguidores',(select coalesce(jsonb_agg(jsonb_build_object('cliente_id',x.cliente_id,'nome',x.nome,'usuario',x.usuario) order by x.nome),'[]') from seguidores s join comunidade_perfis x on x.cliente_id=s.seguidor_id and x.ativo where s.seguido_id=me and s.status='aceito'),
  'seguindo',(select coalesce(jsonb_agg(jsonb_build_object('cliente_id',x.cliente_id,'nome',x.nome,'usuario',x.usuario,'status',s.status) order by x.nome),'[]') from seguidores s join comunidade_perfis x on x.cliente_id=s.seguido_id and x.ativo where s.seguidor_id=me),
  'conquistas',conquistas_disponiveis(me));
end $$;
create function public.buscar_perfil(p_usuario text) returns jsonb language plpgsql stable security definer set search_path=public as $$declare me uuid:=exigir_comunidade();x comunidade_perfis;begin
 select cp.* into x from comunidade_perfis cp join clientes c on c.id=cp.cliente_id where cp.usuario=lower(trim(replace(coalesce(p_usuario,''),'@',''))) and cp.ativo and cp.cliente_id<>me and c.nutricionista_id=(select nutricionista_id from clientes where id=me);
 if not found then return null;end if;
 return jsonb_build_object('cliente_id',x.cliente_id,'nome',x.nome,'usuario',x.usuario,'relacao',case when segue(me,x.cliente_id) then 'seguindo' when exists(select 1 from seguidores where seguidor_id=me and seguido_id=x.cliente_id) then 'pendente' else 'nenhuma' end);
end $$;
create function public.pedir_para_seguir(cid uuid) returns void language plpgsql security definer set search_path=public as $$declare me uuid:=exigir_comunidade();begin
 if cid=me or not na_comunidade(cid) or (select nutricionista_id from clientes where id=cid) is distinct from (select nutricionista_id from clientes where id=me) then raise exception 'Não achei esse perfil na comunidade.';end if;
 insert into seguidores(seguidor_id,seguido_id) values(me,cid) on conflict do nothing;
end $$;
create function public.aceitar_seguidor(cid uuid) returns void language plpgsql security definer set search_path=public as $$declare me uuid:=exigir_comunidade();begin
 update seguidores set status='aceito' where seguidor_id=cid and seguido_id=me;
 if not found then raise exception 'Esse pedido não existe mais.';end if;
end $$;
create function public.remover_seguidor(cid uuid) returns void language plpgsql security definer set search_path=public as $$begin
 delete from seguidores where seguidor_id=cid and seguido_id=cliente_atual();
end $$;
create function public.deixar_de_seguir(cid uuid) returns void language plpgsql security definer set search_path=public as $$begin
 delete from seguidores where seguidor_id=cliente_atual() and seguido_id=cid;
end $$;

-- Posts.
create function public.postar_foto(foto uuid,p_texto text default null) returns uuid language plpgsql security definer set search_path=public as $$declare me uuid:=exigir_comunidade();f fotos_refeicao;r registros_refeicao;pid uuid;begin
 select * into f from fotos_refeicao where id=foto and cliente_id=me;
 if not found then raise exception 'Não achei essa foto no seu diário.';end if;
 if exists(select 1 from posts where foto_caminho=f.caminho_storage) then raise exception 'Essa foto já tá no feed.';end if;
 select * into r from registros_refeicao where id=f.registro_id;
 insert into posts(nutricionista_id,cliente_id,tipo,texto,foto_caminho,dentro_do_plano,dados) select c.nutricionista_id,me,'foto',nullif(trim(p_texto),''),f.caminho_storage,coalesce(r.status='comi',false),jsonb_build_object('refeicao',r.refeicao_nome,'dia',f.data) from clientes c where c.id=me returning id into pid;
 return pid;
end $$;
create function public.postar_resumo(dia date,p_texto text default null) returns uuid language plpgsql security definer set search_path=public as $$declare me uuid:=exigir_comunidade();prev int;feitas int;pid uuid;begin
 if dia is null or dia>hoje_sp() or dia<hoje_sp()-6 then raise exception 'Dá pra postar o resumo só dos últimos 7 dias.';end if;
 if exists(select 1 from posts where cliente_id=me and tipo='resumo' and dados->>'dia'=dia::text) then raise exception 'Você já postou o resumo desse dia.';end if;
 prev:=refeicoes_previstas(me,dia);feitas:=refeicoes_feitas(me,dia);
 if prev=0 then raise exception 'Nesse dia ainda não tinha plano pra resumir.';end if;
 insert into posts(nutricionista_id,cliente_id,tipo,texto,dados) select c.nutricionista_id,me,'resumo',nullif(trim(p_texto),''),jsonb_build_object('dia',dia,'feitas',least(feitas,prev),'previstas',prev,'adesao',least(100,round(100.0*feitas/prev))::int,'sequencia',sequencia_dias(me)) from clientes c where c.id=me returning id into pid;
 return pid;
end $$;
create function public.postar_conquista(codigo text,p_texto text default null) returns uuid language plpgsql security definer set search_path=public as $$declare me uuid:=exigir_comunidade();c jsonb;pid uuid;begin
 select x into c from jsonb_array_elements(conquistas_disponiveis(me)) x where x->>'codigo'=codigo;
 if c is null then raise exception 'Essa conquista ainda não tá liberada.';end if;
 insert into posts(nutricionista_id,cliente_id,tipo,texto,dados) select k.nutricionista_id,me,'conquista',nullif(trim(p_texto),''),c from clientes k where k.id=me returning id into pid;
 return pid;
end $$;
create function public.postar_dica(p_texto text,foto text default null) returns uuid language plpgsql security definer set search_path=public as $$declare pid uuid;begin
 if not e_admin() then raise exception 'Opa, você não tem acesso a isso.';end if;
 if coalesce(trim(p_texto),'')='' and foto is null then raise exception 'Escreve alguma coisa ou coloca uma foto.';end if;
 if foto is not null and foto not like 'comunidade/'||auth.uid()::text||'/%' then raise exception 'Caminho do arquivo tá zuado.';end if;
 insert into posts(nutricionista_id,tipo,texto,foto_caminho) values(auth.uid(),'dica',nullif(trim(p_texto),''),foto) returning id into pid;
 return pid;
end $$;
create function public.apagar_post(pid uuid) returns text language plpgsql security definer set search_path=public as $$declare caminho text;tipo_post text;begin
 delete from posts where id=pid and ((cliente_id is not null and cliente_id=cliente_atual()) or (e_admin() and nutricionista_id=auth.uid())) returning foto_caminho,tipo into caminho,tipo_post;
 if not found then raise exception 'Opa, você não tem acesso a isso.';end if;
 -- Só a foto de dica sai do armazenamento; a foto do cliente continua no diário.
 return case when tipo_post='dica' then caminho end;
end $$;
create function public.moderar_post(pid uuid,ocultar boolean) returns void language plpgsql security definer set search_path=public as $$begin
 update posts set oculto=ocultar where id=pid and e_admin() and nutricionista_id=auth.uid();
 if not found then raise exception 'Opa, você não tem acesso a isso.';end if;
end $$;

-- Curtidas e comentários.
create function public.curtir(pid uuid) returns boolean language plpgsql security definer set search_path=public as $$begin
 if not pode_ver_post(pid) then raise exception 'Esse post não tá disponível.';end if;
 delete from curtidas where post_id=pid and perfil_id=auth.uid();
 if found then return false;end if;
 insert into curtidas(post_id,perfil_id) values(pid,auth.uid());return true;
end $$;
create function public.comentar_post(pid uuid,p_texto text) returns uuid language plpgsql security definer set search_path=public as $$declare cid uuid;begin
 if not pode_ver_post(pid) then raise exception 'Esse post não tá disponível.';end if;
 if coalesce(trim(p_texto),'')='' or char_length(trim(p_texto))>500 then raise exception 'O comentário precisa ter de 1 a 500 caracteres.';end if;
 insert into comentarios_post(post_id,autor_id,texto) values(pid,auth.uid(),trim(p_texto)) returning id into cid;return cid;
end $$;
create function public.apagar_comentario(kid uuid) returns void language plpgsql security definer set search_path=public as $$begin
 delete from comentarios_post k where k.id=kid and (k.autor_id=auth.uid() or exists(select 1 from posts p where p.id=k.post_id and e_admin() and p.nutricionista_id=auth.uid()));
 if not found then raise exception 'Opa, você não tem acesso a isso.';end if;
end $$;
create function public.moderar_comentario(kid uuid,ocultar boolean) returns void language plpgsql security definer set search_path=public as $$begin
 update comentarios_post k set oculto=ocultar where k.id=kid and exists(select 1 from posts p where p.id=k.post_id and e_admin() and p.nutricionista_id=auth.uid());
 if not found then raise exception 'Opa, você não tem acesso a isso.';end if;
end $$;

-- Leitura: feed, perfil, ranking e comparação.
-- Comentários de quem saiu da comunidade deixam de aparecer para os outros clientes.
create function public.feed(p_cliente uuid default null,p_emanuel boolean default false,p_antes timestamptz default null) returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(item order by criado desc),'[]') from (
  select p.criado_em criado,jsonb_build_object('id',p.id,'tipo',p.tipo,'texto',p.texto,'foto_caminho',p.foto_caminho,'dentro_do_plano',p.dentro_do_plano,'dados',p.dados,'oculto',p.oculto,'criado_em',p.criado_em,
   'autor',case when p.cliente_id is null then jsonb_build_object('cliente_id',null,'nome',(select nome from perfis where id=p.nutricionista_id),'usuario',null,'nutricionista',true)
    else (select jsonb_build_object('cliente_id',cp.cliente_id,'nome',cp.nome,'usuario',cp.usuario,'nutricionista',false) from comunidade_perfis cp where cp.cliente_id=p.cliente_id) end,
   'meu',p.cliente_id is not null and p.cliente_id=cliente_atual(),
   'curtidas',(select count(*) from curtidas c where c.post_id=p.id),
   'curti',exists(select 1 from curtidas c where c.post_id=p.id and c.perfil_id=auth.uid()),
   'comentarios',(select coalesce(jsonb_agg(jsonb_build_object('id',k.id,'texto',k.texto,'oculto',k.oculto,'criado_em',k.criado_em,'meu',k.autor_id=auth.uid(),'nutricionista',a.papel='admin',
     'nome',case when a.papel='admin' then a.nome else coalesce(cp2.nome,'Alguém') end,'usuario',case when a.papel='admin' then null else cp2.usuario end) order by k.criado_em),'[]')
    from comentarios_post k join perfis a on a.id=k.autor_id left join clientes c2 on c2.usuario_id=a.id left join comunidade_perfis cp2 on cp2.cliente_id=c2.id
    where k.post_id=p.id and (e_admin() or k.autor_id=auth.uid() or (not k.oculto and (a.papel='admin' or na_comunidade(c2.id)))))) item
  from posts p where pode_ver_post(p.id) and (p_cliente is null or p.cliente_id=p_cliente) and (not p_emanuel or p.cliente_id is null) and (p_antes is null or p.criado_em<p_antes)
  order by p.criado_em desc limit 30) x$$;
create function public.perfil_comunidade(cid uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$declare me uuid:=cliente_atual();cp comunidade_perfis;rel text;semanas jsonb;inicio date:=date_trunc('week',hoje_sp())::date;begin
 select * into cp from comunidade_perfis where cliente_id=cid and ativo;
 if not found then raise exception 'Esse perfil não tá na comunidade.';end if;
 if not (gerencia(cid) or na_comunidade(me)) then raise exception 'Ativa a comunidade primeiro.';end if;
 rel:=case when cid=me then 'eu' when segue(me,cid) then 'seguindo' when exists(select 1 from seguidores where seguidor_id=me and seguido_id=cid) then 'pendente' else 'nenhuma' end;
 if not (gerencia(cid) or rel in ('eu','seguindo')) then return jsonb_build_object('cliente_id',cid,'nome',cp.nome,'usuario',cp.usuario,'relacao',rel,'bloqueado',true);end if;
 select jsonb_agg(jsonb_build_object('inicio',s::date,'adesao',adesao_periodo(cid,s::date,least(s::date+6,hoje_sp()))) order by s) into semanas from generate_series(inicio-49,inicio,interval '7 days') s;
 return jsonb_build_object('cliente_id',cid,'nome',cp.nome,'usuario',cp.usuario,'relacao',rel,'bloqueado',false,
  'dias_registrados',(select count(distinct data) from registros_refeicao where cliente_id=cid),
  'seguidores',(select count(*) from seguidores s join comunidade_perfis x on x.cliente_id=s.seguidor_id and x.ativo where s.seguido_id=cid and s.status='aceito'),
  'seguindo',(select count(*) from seguidores s join comunidade_perfis x on x.cliente_id=s.seguido_id and x.ativo where s.seguidor_id=cid and s.status='aceito'),
  'sequencia',sequencia_dias(cid),'semanas',semanas,
  'peso',case when cp.mostrar_peso then (select peso from medidas where cliente_id=cid order by data desc,criado_em desc limit 1) end,
  'pode_comparar',me is not null and cid<>me and segue(me,cid));
end $$;
create function public.ranking_semanal() returns jsonb language plpgsql stable security definer set search_path=public as $$declare me uuid:=exigir_comunidade();inicio date:=date_trunc('week',hoje_sp())::date;begin
 return (select coalesce(jsonb_agg(jsonb_build_object('cliente_id',cid,'nome',nome,'usuario',usuario,'eu',cid=me,'adesao',adesao) order by adesao desc nulls last,nome),'[]') from (
  select cp.cliente_id cid,cp.nome,cp.usuario,adesao_periodo(cp.cliente_id,inicio,hoje_sp()) adesao from comunidade_perfis cp where cp.ativo and (cp.cliente_id=me or segue(me,cp.cliente_id))) x);
end $$;
create function public.comparar(cid uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$declare me uuid:=exigir_comunidade();inicio date:=date_trunc('week',hoje_sp())::date;begin
 -- Só compara com quem você segue: foi essa pessoa que aceitou mostrar os números pra você.
 if cid=me or not na_comunidade(cid) or not segue(me,cid) then raise exception 'Pra comparar, você precisa seguir essa pessoa.';end if;
 return jsonb_build_array(resumo_comparacao(me,inicio),resumo_comparacao(cid,inicio));
end $$;

-- Ao excluir um cliente, comentários e curtidas dele em posts de outras pessoas também saem (LGPD).
create function public.apagar_rastros_comunidade() returns trigger language plpgsql security definer set search_path=public as $$begin
 if old.usuario_id is not null then delete from comentarios_post where autor_id=old.usuario_id;delete from curtidas where perfil_id=old.usuario_id;end if;
 return old;
end $$;
create trigger apagar_rastros_comunidade before delete on public.clientes for each row execute function public.apagar_rastros_comunidade();

-- Fotos: quem pode ver o post pode ver a foto. Fotos de dica ficam em comunidade/{id do Emanuel}/.
create policy saude_comunidade_leitura on storage.objects for select to authenticated using(bucket_id='saude' and (public.pode_ver_foto_post(name) or (public.e_admin() and name like 'comunidade/'||auth.uid()::text||'/%')));
create policy saude_comunidade_upload on storage.objects for insert to authenticated with check(bucket_id='saude' and public.e_admin() and name like 'comunidade/'||auth.uid()::text||'/%');
create policy saude_comunidade_exclusao on storage.objects for delete to authenticated using(bucket_id='saude' and public.e_admin() and name like 'comunidade/'||auth.uid()::text||'/%');

revoke all on function public.hoje_sp(),public.cliente_atual(),public.na_comunidade(uuid),public.segue(uuid,uuid),public.exigir_comunidade(),public.refeicoes_previstas(uuid,date),public.refeicoes_feitas(uuid,date),public.adesao_periodo(uuid,date,date),public.sequencia_dias(uuid),public.pode_ver_post(uuid),public.conquistas_disponiveis(uuid),public.resumo_comparacao(uuid,date),public.apagar_rastros_comunidade() from public,anon,authenticated;
revoke all on function public.pode_ver_foto_post(text),public.ativar_comunidade(text,text,boolean),public.desativar_comunidade(),public.minha_comunidade(),public.buscar_perfil(text),public.pedir_para_seguir(uuid),public.aceitar_seguidor(uuid),public.remover_seguidor(uuid),public.deixar_de_seguir(uuid),public.postar_foto(uuid,text),public.postar_resumo(date,text),public.postar_conquista(text,text),public.postar_dica(text,text),public.apagar_post(uuid),public.moderar_post(uuid,boolean),public.curtir(uuid),public.comentar_post(uuid,text),public.apagar_comentario(uuid),public.moderar_comentario(uuid,boolean),public.feed(uuid,boolean,timestamptz),public.perfil_comunidade(uuid),public.ranking_semanal(),public.comparar(uuid) from public,anon;
grant execute on function public.pode_ver_foto_post(text),public.ativar_comunidade(text,text,boolean),public.desativar_comunidade(),public.minha_comunidade(),public.buscar_perfil(text),public.pedir_para_seguir(uuid),public.aceitar_seguidor(uuid),public.remover_seguidor(uuid),public.deixar_de_seguir(uuid),public.postar_foto(uuid,text),public.postar_resumo(date,text),public.postar_conquista(text,text),public.postar_dica(text,text),public.apagar_post(uuid),public.moderar_post(uuid,boolean),public.curtir(uuid),public.comentar_post(uuid,text),public.apagar_comentario(uuid),public.moderar_comentario(uuid,boolean),public.feed(uuid,boolean,timestamptz),public.perfil_comunidade(uuid),public.ranking_semanal(),public.comparar(uuid) to authenticated;
commit;

-- ========== 004_perfis_visuais.sql ==========
-- Perfis visuais privados. Aplicar após 003_comunidade.sql.
begin;
create table public.perfis_visuais (
 usuario_id uuid primary key references public.perfis(id) on delete cascade,
 cliente_id uuid unique references public.clientes(id) on delete cascade,
 nome text not null check(char_length(trim(nome)) between 1 and 40),
 bio text not null default '' check(char_length(bio)<=240),
 avatar text, capa text,
 atualizado_em timestamptz not null default now()
);
alter table public.perfis_visuais enable row level security;
revoke all on public.perfis_visuais from public,anon,authenticated;

create function public.pode_ver_visual(uid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from perfis p where p.id=uid and (
 p.id=auth.uid()
 or (p.papel='admin' and exists(select 1 from clientes c where c.usuario_id=auth.uid() and c.status<>'inativo' and c.nutricionista_id=p.id))
 or exists(select 1 from clientes c where c.usuario_id=p.id and (gerencia(c.id) or (na_comunidade(cliente_atual()) and na_comunidade(c.id) and segue(cliente_atual(),c.id))))
 ))
$$;
create function public.visual_perfil(cid uuid default null,emanuel boolean default false) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare uid uuid:=auth.uid(); v perfis_visuais; n text;
begin
 if cid is not null then select usuario_id into uid from clientes where id=cid;
 elsif emanuel and not e_admin() then select nutricionista_id into uid from clientes where id=cliente_atual();end if;
 if not coalesce(pode_ver_visual(uid),false) then return null;end if;
 select * into v from perfis_visuais where usuario_id=uid;
 select coalesce(cp.nome,p.nome) into n from perfis p left join clientes c on c.usuario_id=p.id left join comunidade_perfis cp on cp.cliente_id=c.id where p.id=uid;
 return jsonb_build_object('nome',coalesce(v.nome,n),'bio',coalesce(v.bio,''),'avatar',v.avatar,'capa',v.capa,'meu',uid=auth.uid());
end $$;
create function public.salvar_visual(p_nome text,p_bio text default '',p_avatar text default null,p_capa text default null) returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();cid uuid:=cliente_atual();path text;
begin
 if uid is null or not (e_admin() or cid is not null) then raise exception 'Acesso não autorizado.';end if;
 if coalesce(trim(p_nome),'')='' or char_length(trim(p_nome))>40 or char_length(coalesce(p_bio,''))>240 then raise exception 'Use um nome de até 40 caracteres e apresentação de até 240.';end if;
 foreach path in array array[p_avatar,p_capa] loop
 if path is not null and (path not like 'perfis/'||uid::text||'/%' or not exists(select 1 from storage.objects where bucket_id='saude' and name=path)) then raise exception 'Foto inválida para este perfil.';end if;
 end loop;
 insert into perfis_visuais(usuario_id,cliente_id,nome,bio,avatar,capa) values(uid,cid,trim(p_nome),trim(coalesce(p_bio,'')),p_avatar,p_capa)
 on conflict(usuario_id) do update set nome=excluded.nome,bio=excluded.bio,avatar=excluded.avatar,capa=excluded.capa,atualizado_em=now();
 if cid is not null then update comunidade_perfis set nome=trim(p_nome) where cliente_id=cid;end if;
end $$;
create function public.pode_ver_foto_perfil(caminho text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from perfis_visuais v where (v.avatar=caminho or v.capa=caminho) and pode_ver_visual(v.usuario_id))
$$;
create policy saude_perfil_leitura on storage.objects for select to authenticated using(bucket_id='saude' and (name like 'perfis/'||auth.uid()::text||'/%' or public.pode_ver_foto_perfil(name)));
create policy saude_perfil_upload on storage.objects for insert to authenticated with check(bucket_id='saude' and name like 'perfis/'||auth.uid()::text||'/%' and (public.e_admin() or exists(select 1 from public.clientes where usuario_id=auth.uid() and status<>'inativo')));
create policy saude_perfil_exclusao on storage.objects for delete to authenticated using(bucket_id='saude' and name like 'perfis/'||auth.uid()::text||'/%');
revoke all on function public.pode_ver_visual(uuid) from public,anon,authenticated;
revoke all on function public.visual_perfil(uuid,boolean),public.salvar_visual(text,text,text,text),public.pode_ver_foto_perfil(text) from public,anon;
grant execute on function public.visual_perfil(uuid,boolean),public.salvar_visual(text,text,text,text),public.pode_ver_foto_perfil(text) to authenticated;
commit;

-- ========== 005_calorias.sql ==========
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

-- ========== Conta do Emanuel como administradora ==========
-- Funciona quando existe exatamente uma conta em Authentication (a do Emanuel). Se houver mais, troque pelo e-mail dele.
insert into public.perfis(id, papel, nome)
select id, 'admin', 'Emanuel' from auth.users
where (select count(*) from auth.users) = 1
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- ========== Verificação (resultado esperado: tabelas 24, bucket_saude 1, admins 1) ==========
select
  (select count(*) from information_schema.tables where table_schema='public') as tabelas,
  (select count(*) from storage.buckets where id='saude') as bucket_saude,
  (select count(*) from public.perfis where papel='admin') as admins;
