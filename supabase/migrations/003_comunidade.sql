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
