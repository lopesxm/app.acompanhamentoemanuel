-- Acesso delegado: aplicar depois da migração 007. Não concede acesso por nome.
begin;
create table public.acessos_desenvolvimento(
 usuario_id uuid primary key references public.perfis(id) on delete cascade,
 administrador_id uuid not null references public.perfis(id) on delete cascade,
 ativo boolean not null default true,
 check(usuario_id<>administrador_id)
);
alter table public.acessos_desenvolvimento enable row level security;
revoke all on public.acessos_desenvolvimento from public,anon,authenticated;
create table public.auditoria_desenvolvimento(
 id bigint generated always as identity primary key,
 executor_id uuid not null, administrador_id uuid not null,
 tabela text not null, operacao text not null, registro_id text,
 criado_em timestamptz not null default now()
);
alter table public.auditoria_desenvolvimento enable row level security;
revoke all on public.auditoria_desenvolvimento from public,anon,authenticated;
create function public.ator_aplicativo() returns uuid language sql stable security definer set search_path=public as $$
 select coalesce((select a.administrador_id from acessos_desenvolvimento a join perfis p on p.id=a.administrador_id and p.papel='admin'
 where a.usuario_id=auth.uid() and a.ativo and coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-grinders-view','')='admin'),auth.uid())
$$;
revoke all on function public.ator_aplicativo() from public,anon;
grant execute on function public.ator_aplicativo() to authenticated;
-- Reutiliza as regras existentes com o ator autorizado, mantendo auth.uid() real para auditoria.
do $migration$
declare r record; definition text;
begin
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prokind='f' and p.proname<>'ator_aplicativo' and p.prosrc like '%auth.uid()%'
 loop definition:=pg_get_functiondef(r.oid);execute replace(definition,'auth.uid()','public.ator_aplicativo()');end loop;
 for r in select * from pg_policies where schemaname in ('public','storage')
 and (coalesce(qual,'') like '%auth.uid()%' or coalesce(with_check,'') like '%auth.uid()%')
 loop
  definition:=format('alter policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  if r.qual is not null then definition:=definition||' using ('||replace(r.qual,'auth.uid()','public.ator_aplicativo()')||')';end if;
  if r.with_check is not null then definition:=definition||' with check ('||replace(r.with_check,'auth.uid()','public.ator_aplicativo()')||')';end if;
  execute definition;
 end loop;
end $migration$;
create function public.contexto_desenvolvimento() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('permitido',true,'executor_id',auth.uid(),'perfil',to_jsonb(p))
 from acessos_desenvolvimento a join perfis owner on owner.id=a.administrador_id and owner.papel='admin'
 join perfis p on p.id=public.ator_aplicativo() where a.usuario_id=auth.uid() and a.ativo
$$;
revoke all on function public.contexto_desenvolvimento() from public,anon;
grant execute on function public.contexto_desenvolvimento() to authenticated;
create function public.auditar_desenvolvimento() returns trigger language plpgsql security definer set search_path=public as $$
declare row_data jsonb;
begin
 if auth.uid() is distinct from public.ator_aplicativo() then
  row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into auditoria_desenvolvimento(executor_id,administrador_id,tabela,operacao,registro_id)
  values(auth.uid(),public.ator_aplicativo(),tg_table_schema||'.'||tg_table_name,tg_op,coalesce(row_data->>'id',row_data->>'cliente_id',row_data->>'usuario_id',row_data->>'nutricionista_id'));
 end if;
 return null;
end $$;
revoke all on function public.auditar_desenvolvimento() from public,anon,authenticated;
do $$declare r record;begin
 for r in select tablename from pg_tables where schemaname='public' and tablename not in ('acessos_desenvolvimento','auditoria_desenvolvimento') loop
 execute format('create trigger auditoria_dev after insert or update or delete on public.%I for each row execute function public.auditar_desenvolvimento()',r.tablename);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
