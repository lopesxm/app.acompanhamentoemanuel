-- Acrescenta a data à resposta já autorizada, preservando a delegação da 008.
begin;
do $$
declare definition text;
begin
 select pg_get_functiondef('public.visual_perfil(uuid,boolean)'::regprocedure) into definition;
 if position('membro_desde' in definition)=0 then
  if position('''meu'',uid=' in definition)=0 then
   raise exception 'Formato de visual_perfil não reconhecido; nenhuma alteração aplicada.';
  end if;
  definition:=replace(definition,'''meu'',uid=', '''membro_desde'',(select coalesce((select c.criado_em from public.clientes c where c.usuario_id=p.id),p.criado_em) from public.perfis p where p.id=uid),''meu'',uid=');
  execute definition;
 end if;
end $$;
commit;
