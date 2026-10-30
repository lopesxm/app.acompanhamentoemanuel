# Alternativas alimentares

No painel do nutricionista, abra o plano do paciente, adicione um grupo de substituição e selecione **Escolher entre as alternativas**. Cada linha tem alimento, quantidade e unidade próprios. Exemplo: arroz 100 g, macarrão 80 g e batata 200 g. Use a seta para ordenar ou **Usar como inicial** para colocar uma alternativa primeiro. Salve o rascunho e publique.

Itens fixos continuam em grupos **Combinação fixa: consumir todos**. Não há mistura livre de alternativas nem alteração de porções pelo paciente. A primeira opção é a sugestão inicial; mudar a seleção salva a intenção do dia, separada do botão **Comi**. A seleção é recuperada nas telas Início e Plano, inclusive ao recarregar ou entrar em outro dispositivo. Um novo dia começa com a sugestão inicial. Alterar uma escolha não reescreve um consumo anterior; para corrigir o consumo do dia é necessário registrar novamente.

## Ativação

No projeto Supabase existente, executar uma vez `supabase/migrations/006_escolhas_alimentares.sql` no SQL Editor. Não executar `instalar_tudo.sql` no banco existente; ele é destinado a projetos novos. A migração não foi aplicada remotamente nesta implementação.

A tabela escolhas_alimentares armazena uma escolha por paciente, grupo e dia. A RPC escolher_alimento valida autoria, grupo exclusivo, opção autorizada e plano publicado vigente. RLS permite leitura apenas ao paciente e ao nutricionista responsável. Escrita direta é bloqueada. Os IDs dos grupos vinculam as escolhas à versão do plano; planos arquivados não aceitam novas escolhas.

## Validação

Testes de banco cobrem persistência entre sessões, substituição da escolha, ausência de consumo automático, isolamento entre pacientes, leitura pelo nutricionista, opção inválida, escrita direta bloqueada e preservação após nova publicação. O instalador completo inclui a migração 006. Validação no Supabase remoto fica pendente da aplicação da migração.
