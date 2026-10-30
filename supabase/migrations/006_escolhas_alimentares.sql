begin;
-- A intenção de escolha não é um registro de consumo. Uma escolha por grupo e dia.
create table public.escolhas_alimentares(
 cliente_id uuid not null references public.clientes on delete cascade,
 grupo_id uuid not null references public.grupos on delete cascade,
 opcao_id uuid not null references public.opcoes on delete cascade,
 data date not null,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 primary key(cliente_id,grupo_id,data)
);
alter table public.escolhas_alimentares enable row level security;
revoke all on public.escolhas_alimentares from public,anon,authenticated;
grant select on public.escolhas_alimentares to authenticated;
create policy escolhas_leitura on public.escolhas_alimentares for select to authenticated using(public.e_cliente(cliente_id) or public.gerencia(cliente_id));
create function public.escolher_alimento(gid uuid,oid uuid) returns void language plpgsql security definer set search_path=public as $$
declare cid uuid;pid uuid;
begin
 select p.cliente_id,p.id into cid,pid from grupos g join refeicoes r on r.id=g.refeicao_id join planos p on p.id=r.plano_id where g.id=gid and g.regra='escolher_1' and p.status='publicado' and p.inicio_em<=(now() at time zone 'America/Sao_Paulo')::date for share of p;
 if cid is null or not e_cliente(cid) then raise exception 'Esta refeição não está disponível para você.';end if;
 if not exists(select 1 from opcoes where id=oid and grupo_id=gid) then raise exception 'Alternativa não autorizada para este grupo.';end if;
 insert into escolhas_alimentares(cliente_id,grupo_id,opcao_id,data) values(cid,gid,oid,(now() at time zone 'America/Sao_Paulo')::date)
 on conflict(cliente_id,grupo_id,data) do update set opcao_id=excluded.opcao_id,atualizado_em=now();
end $$;
revoke all on function public.escolher_alimento(uuid,uuid) from public,anon;
grant execute on function public.escolher_alimento(uuid,uuid) to authenticated;
commit;
