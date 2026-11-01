-- Pontuação derivada das ações existentes. Não aceita pontos enviados pelo navegador.
begin;
create or replace function public.pontos_grinder(alvo uuid) returns integer
language sql stable security definer set search_path=public as $$
 with acoes as (
  select (r.criado_em at time zone 'America/Sao_Paulo')::date dia,
   'refeicao' tipo,count(*) n from registros_refeicao r join clientes c on c.id=r.cliente_id
   where c.usuario_id=alvo group by 1
  union all
  select (p.criado_em at time zone 'America/Sao_Paulo')::date,'post',count(*)
   from posts p left join clientes c on c.id=p.cliente_id
   where coalesce(c.usuario_id,p.nutricionista_id)=alvo and not p.oculto group by 1
  union all
  select (k.criado_em at time zone 'America/Sao_Paulo')::date,'comentario',count(distinct k.post_id)
   from comentarios_post k join posts p on p.id=k.post_id left join clientes c on c.id=p.cliente_id
   where k.autor_id=alvo and not k.oculto and not p.oculto
   and coalesce(c.usuario_id,p.nutricionista_id)<>alvo group by 1
  union all
  select (k.criado_em at time zone 'America/Sao_Paulo')::date,'curtida',count(*)
   from curtidas k join posts p on p.id=k.post_id left join clientes c on c.id=p.cliente_id
   where k.perfil_id=alvo and not p.oculto and coalesce(c.usuario_id,p.nutricionista_id)<>alvo group by 1
 ) select coalesce(sum(case tipo when 'refeicao' then least(n,6)*5+5
 when 'post' then least(n,2)*10 when 'comentario' then least(n,5)*3
 when 'curtida' then least(n,5) end),0)::integer from acoes;
$$;
-- Somente a função de perfil, que já valida acesso, pode expor a pontuação.
revoke all on function public.pontos_grinder(uuid) from public,anon,authenticated;
do $$
declare definition text;
begin
 select pg_get_functiondef('public.visual_perfil(uuid,boolean)'::regprocedure) into definition;
 if position('''pontos''' in definition)=0 then
  if position('''meu'',uid=' in definition)=0 then raise exception 'Formato de visual_perfil não reconhecido.';end if;
  execute replace(definition,'''meu'',uid=','''pontos'',public.pontos_grinder(uid),''meu'',uid=');
 end if;
end $$;
commit;
