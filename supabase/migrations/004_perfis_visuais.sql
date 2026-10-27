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
