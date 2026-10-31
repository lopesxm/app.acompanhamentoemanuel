# Acesso exclusivo de desenvolvimento

Aplicar `supabase/EXECUTAR_ACESSO_LOPESXM.sql` uma única vez no projeto conectado ao aplicativo. O arquivo reúne a migração 008 e a ativação vinculada ao cadastro Junior `073316d7-bf81-4eba-8eab-d0923fd3627a`. Se esse cadastro não existir ou não estiver vinculado a uma conta e nutricionista, a ativação falha.

A conta mantém suas credenciais e o papel original de cliente. A tabela privada `acessos_desenvolvimento` autoriza somente o usuário vinculado ao cadastro confirmado. Não há promoção por nome, e-mail ou informação editável do perfil.

O banner oferece as visões Cliente (o próprio Junior) e Emanuel (o administrador responsável pelo cadastro). A visão administrativa trabalha com dados reais e executa as ações sob as permissões desse administrador. O cabeçalho da requisição escolhe a visão, mas não concede permissão: cada requisição é validada no banco. A identidade autenticada real permanece em `auth.uid()`.

As operações INSERT, UPDATE e DELETE em tabelas públicas são registradas em `auditoria_desenvolvimento`, com executor, administrador, tabela, operação, identificador e horário, sem copiar conteúdo clínico. Leituras e operações de arquivo no Storage não entram nessa auditoria. Publicações e notificações mantêm a autoria operacional do administrador; a auditoria identifica lopesxm como executor.

As migrações futuras devem usar `ator_aplicativo()` para autorização delegada e `auth.uid()` para identificar o executor real. A migração 008 adapta as funções e políticas existentes no momento de sua execução; não altera futuras definições automaticamente.

Para revogar pelo SQL Editor:

```sql
update public.acessos_desenvolvimento
set ativo=false
where usuario_id=(select usuario_id from public.clientes where id='073316d7-bf81-4eba-8eab-d0923fd3627a');
```

A revogação é aplicada às próximas requisições, mesmo se a interface já estiver aberta.
