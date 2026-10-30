# Validação antes do piloto

## 27/10/2026

- PASSOU: 21 testes locais (regras, migrações, convites, RLS, publicação/versionamento, isolamento de arquivos e comunidade).
- Execução padrão esgotou memória no ambiente. Execução alternativa passou integralmente: `npm run test:low-memory`. As mesmas asserções foram mantidas.
- PASSOU: início real da conta de teste carrega; página com viewport de 454 px não apresenta overflow horizontal (scrollWidth 454).
- PASSOU: menu móvel abre e fecha por Escape na versão anterior à correção de foco; links levam ao início.
- CORRIGIDO, REVALIDAÇÃO PENDENTE: foco ao abrir menu, bloqueio do conteúdo de fundo e limpeza do estado ao mudar para desktop. Interação durante a revisão não permitiu concluir a nova verificação.
- CORRIGIDO: estado sem plano explica que aguarda publicação, sem afirmar que o nutricionista já está montando o plano.
- CORRIGIDO: texto vazio da comunidade sem diminutivo.
- PENDENTE: revisão desktop e celular estreito; fluxo real de publicação, registro, comentário e leitura; upload privado com contas distintas; recuperação de acesso; domínio do piloto; backup e recuperação.

## Próximo teste real

A conta Edson — TESTE de validação está sem plano publicado. Aguardar acesso do Emanuel para validar a publicação exclusivamente nesse cadastro. Usar conteúdo identificado como teste de interface, sem prescrição clínica, e nunca publicar para outros pacientes. Não confundir testes locais com validação completa no Supabase hospedado.

Piloto ainda não liberado: os itens P0 de ATUALIZACOES.md permanecem pendentes até evidências completas.

## 29/10/2026 — saída do modo demonstração

- Removidos os acessos de demonstração do login e o aviso da interface. O adaptador do aplicativo ignora sessões demo antigas e exige autenticação real. Os fixtures locais permanecem para testes; não são migrados para contas reais.
- Migrações 006 e 007 confirmadas pela disponibilidade das tabelas na API do projeto conectado em verificações anteriores. Plano de teste versão 1 publicado e visualizado no painel.
- Ainda pendentes antes da liberação: domínio HTTPS e URLs de autenticação; teste integrado com duas contas reais (convite, ficha, plano, escolha persistente, registro, foto e notificação); recuperação de senha e restauração de backup. O termo de privacidade ainda contém campos e instruções de modelo a finalizar pelo responsável.
