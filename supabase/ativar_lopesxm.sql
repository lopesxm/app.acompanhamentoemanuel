-- Executar depois de 008_acesso_desenvolvimento.sql.
-- Vínculo exclusivo ao cadastro Junior confirmado pelo responsável.
begin;
do $$declare c public.clientes;begin
 select * into c from public.clientes where id='073316d7-bf81-4eba-8eab-d0923fd3627a';
 if c.usuario_id is null or not exists(select 1 from public.perfis where id=c.nutricionista_id and papel='admin') then
 raise exception 'Cadastro Junior ou nutricionista não encontrado. Nenhuma permissão foi concedida.';end if;
 insert into public.acessos_desenvolvimento(usuario_id,administrador_id,ativo)
 values(c.usuario_id,c.nutricionista_id,true)
 on conflict(usuario_id) do update set administrador_id=excluded.administrador_id,ativo=true;
end $$;
commit;
