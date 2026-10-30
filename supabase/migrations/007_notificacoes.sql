begin;
-- Avisos do sininho. Só o banco cria (pelos gatilhos abaixo); cada pessoa lê e marca como lidos só os seus.
create table public.notificacoes(
 id uuid primary key default gen_random_uuid(),
 destinatario_id uuid not null references public.perfis on delete cascade,
 cliente_id uuid references public.clientes on delete cascade,
 tipo text not null,
 titulo text not null,
 texto text,
 link text not null,
 lida_em timestamptz,
 criado_em timestamptz not null default now()
);
create index notificacoes_caixa on public.notificacoes(destinatario_id,criado_em desc);
alter table public.notificacoes enable row level security;
revoke all on public.notificacoes from public,anon,authenticated;
grant select on public.notificacoes to authenticated;
create policy notificacoes_leitura on public.notificacoes for select to authenticated using(destinatario_id=auth.uid());

-- Link do grupo do WhatsApp do Emanuel, guardado junto com os lembretes dele.
alter table public.configuracoes add column grupo_whatsapp text check(grupo_whatsapp is null or grupo_whatsapp ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$');

-- O cliente agora pode responder os comentários do Emanuel no próprio diário.
create policy comentario_resposta on public.comentarios for insert to authenticated with check(public.e_cliente(cliente_id) and autor_id=auth.uid());

create function public.notificar(dest uuid,cid uuid,p_tipo text,p_titulo text,p_texto text,p_link text) returns void language plpgsql security definer set search_path=public as $$begin
 -- Ninguém recebe aviso da própria ação.
 if dest is null or dest is not distinct from auth.uid() then return;end if;
 insert into notificacoes(destinatario_id,cliente_id,tipo,titulo,texto,link) values(dest,cid,p_tipo,p_titulo,left(nullif(trim(p_texto),''),160),p_link);
end $$;

create function public.marcar_notificacoes_lidas(ids uuid[] default null) returns integer language plpgsql security definer set search_path=public as $$declare n integer;begin
 update notificacoes set lida_em=now() where destinatario_id=auth.uid() and lida_em is null and (ids is null or id=any(ids));
 get diagnostics n=row_count;return n;
end $$;

create function public.grupo_whatsapp() returns text language sql stable security definer set search_path=public as $$
 select g.grupo_whatsapp from configuracoes g where g.nutricionista_id=coalesce((select nutricionista_id from clientes where usuario_id=auth.uid() and status<>'inativo' limit 1),case when e_admin() then auth.uid() end)
$$;

-- O que o cliente faz no app vira aviso pro Emanuel.
create function public.avisar_emanuel() returns trigger language plpgsql security definer set search_path=public as $$
declare c clientes;nome text;aba text;hoje date:=(now() at time zone 'America/Sao_Paulo')::date;n integer;
begin
 select * into c from clientes where id=new.cliente_id;
 -- Só avisa quando quem age é o próprio cliente (o Emanuel editando a ficha não gera aviso).
 if c.id is null or c.usuario_id is distinct from auth.uid() then return new;end if;
 nome:=split_part(c.nome,' ',1);
 if tg_table_name='registros_refeicao' then
  select count(*) into n from registros_refeicao where cliente_id=c.id and data=hoje;
  -- Um aviso por dia: os registros seguintes só atualizam a contagem.
  update notificacoes set texto=n||case when n=1 then ' refeição registrada hoje' else ' refeições registradas hoje' end,criado_em=now() where destinatario_id=c.nutricionista_id and cliente_id=c.id and tipo='registro' and lida_em is null and (criado_em at time zone 'America/Sao_Paulo')::date=hoje;
  if found then return new;end if;
  perform notificar(c.nutricionista_id,c.id,'registro',nome||' tá registrando as refeições',n||case when n=1 then ' refeição registrada hoje' else ' refeições registradas hoje' end,'/admin/cliente.html?id='||c.id||'&aba=diario');
 elsif tg_table_name='fotos_refeicao' then
  perform notificar(c.nutricionista_id,c.id,'foto',nome||' mandou foto do prato',null,'/admin/cliente.html?id='||c.id||'&aba=diario');
 elsif tg_table_name='fugas' then
  perform notificar(c.nutricionista_id,c.id,'fuga',nome||' contou que saiu do plano',new.descricao,'/admin/cliente.html?id='||c.id||'&aba=diario');
 elsif tg_table_name='medidas' then
  perform notificar(c.nutricionista_id,c.id,'medidas',nome||' atualizou as medidas','Peso: '||trim_scale(new.peso)||' kg','/admin/cliente.html?id='||c.id||'&aba=evolucao');
 elsif tg_table_name='arquivos' then
  perform notificar(c.nutricionista_id,c.id,'arquivo',nome||case when new.tipo='exame' then ' enviou um exame' else ' enviou foto de acompanhamento' end,null,'/admin/cliente.html?id='||c.id||'&aba=ficha');
 elsif tg_table_name='fichas' then
  if old.concluida_em is null and new.concluida_em is not null then
   perform notificar(c.nutricionista_id,c.id,'ficha',nome||' terminou a ficha','Agora é contigo: hora de montar o plano.','/admin/cliente.html?id='||c.id||'&aba=ficha');
  end if;
 end if;
 return new;
end $$;
create trigger aviso_registro after insert on public.registros_refeicao for each row execute function public.avisar_emanuel();
create trigger aviso_foto after insert on public.fotos_refeicao for each row execute function public.avisar_emanuel();
create trigger aviso_fuga after insert on public.fugas for each row execute function public.avisar_emanuel();
create trigger aviso_medidas after insert on public.medidas for each row execute function public.avisar_emanuel();
create trigger aviso_arquivo after insert on public.arquivos for each row execute function public.avisar_emanuel();
create trigger aviso_ficha after update on public.fichas for each row execute function public.avisar_emanuel();

-- Conversa no diário: comentário do Emanuel avisa o cliente, resposta do cliente avisa o Emanuel.
create function public.avisar_comentario() returns trigger language plpgsql security definer set search_path=public as $$declare c clientes;begin
 select * into c from clientes where id=new.cliente_id;
 if new.autor_id=c.usuario_id then
  perform notificar(c.nutricionista_id,c.id,'resposta',split_part(c.nome,' ',1)||' respondeu no diário',new.texto,'/admin/cliente.html?id='||c.id||'&aba=diario');
 else
  perform notificar(c.usuario_id,c.id,'comentario','O Emanuel comentou no seu diário',new.texto,'/app/hoje.html#diario');
 end if;
 return new;
end $$;
create trigger aviso_comentario after insert on public.comentarios for each row execute function public.avisar_comentario();

create function public.avisar_plano() returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.status='publicado' and old.status<>'publicado' then
  perform notificar((select usuario_id from clientes where id=new.cliente_id),new.cliente_id,'plano','Plano novo no ar! 🎉','O Emanuel publicou seu plano. Bora dar uma olhada?','/app/plano.html');
 end if;
 return new;
end $$;
create trigger aviso_plano after update of status on public.planos for each row execute function public.avisar_plano();

-- Comunidade: post do Emanuel avisa quem ativou a comunidade; post de cliente avisa o Emanuel.
create function public.avisar_post() returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.cliente_id is null then
  insert into notificacoes(destinatario_id,cliente_id,tipo,titulo,texto,link)
  select c.usuario_id,c.id,'post','O Emanuel postou na comunidade',left(nullif(trim(new.texto),''),160),'/app/comunidade.html#post-'||new.id
  from clientes c join comunidade_perfis cp on cp.cliente_id=c.id and cp.ativo where c.nutricionista_id=new.nutricionista_id and c.usuario_id is not null and c.status<>'inativo';
 else
  perform notificar(new.nutricionista_id,new.cliente_id,'post',(select split_part(nome,' ',1) from clientes where id=new.cliente_id)||' postou na comunidade',new.texto,'/admin/comunidade.html#post-'||new.id);
 end if;
 return new;
end $$;
create trigger aviso_post after insert on public.posts for each row execute function public.avisar_post();

-- Comentário em post avisa o dono do post, quem já tinha comentado nele e o Emanuel.
create function public.avisar_comentario_post() returns trigger language plpgsql security definer set search_path=public as $$
declare p posts;dono uuid;admin boolean;c clientes;nome_publico text;nome_real text;dest uuid;
begin
 select * into p from posts where id=new.post_id;
 dono:=case when p.cliente_id is null then p.nutricionista_id else (select usuario_id from clientes where id=p.cliente_id) end;
 admin:=exists(select 1 from perfis where id=new.autor_id and papel='admin');
 select * into c from clientes where usuario_id=new.autor_id;
 -- Pra outros clientes aparece o nome da comunidade; pro Emanuel, o primeiro nome do cadastro.
 nome_publico:=case when admin then 'O Emanuel' else coalesce((select nome from comunidade_perfis where cliente_id=c.id),'Alguém') end;
 nome_real:=case when admin then 'O Emanuel' else split_part(c.nome,' ',1) end;
 for dest in select distinct x from unnest(array[dono,p.nutricionista_id]||array(select autor_id from comentarios_post where post_id=p.id and id<>new.id and not oculto)) x where x is not null and x<>new.autor_id loop
  perform notificar(dest,coalesce(c.id,p.cliente_id),'comentario_post',
   case when dest=p.nutricionista_id then nome_real else nome_publico end||case when dest=dono then ' comentou no seu post' when exists(select 1 from comentarios_post where post_id=p.id and autor_id=dest and id<>new.id) then ' respondeu na conversa' else ' comentou na comunidade' end,
   new.texto,
   case when dest=p.nutricionista_id then '/admin/comunidade.html#post-' else '/app/comunidade.html#post-' end||p.id);
 end loop;
 return new;
end $$;
create trigger aviso_comentario_post after insert on public.comentarios_post for each row execute function public.avisar_comentario_post();

revoke all on function public.notificar(uuid,uuid,text,text,text,text),public.avisar_emanuel(),public.avisar_comentario(),public.avisar_plano(),public.avisar_post(),public.avisar_comentario_post() from public,anon,authenticated;
revoke all on function public.marcar_notificacoes_lidas(uuid[]),public.grupo_whatsapp() from public,anon;
grant execute on function public.marcar_notificacoes_lidas(uuid[]),public.grupo_whatsapp() to authenticated;
commit;
