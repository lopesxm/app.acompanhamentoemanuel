# Plano de atualizações — uso real antes de expansão

Atualizado em 27/10/2026. Documento de planejamento; itens pendentes não são funcionalidades disponíveis.

## Resultado que queremos validar

O paciente encontra o que fazer hoje, registra sem dificuldade e percebe o retorno do acompanhamento. O nutricionista encontra quem precisa de atenção e consegue agir com contexto. A quantidade de telas e o tempo dentro do aplicativo não são metas de sucesso.

## Base existente e limites da validação

Implementados no código: acesso por convite, ficha em etapas, plano com grupos/opções, versões no administrativo, registros, fotos, relatos, medidas, comentários do profissional, modelos, alertas básicos e comunidade opcional. Existe uma base de testes de permissões e regras.

Acesso real por convite e carregamento da comunidade foram verificados anteriormente. Isso não comprova o fluxo completo em produção. Publicação de plano, fotos privadas, isolamento entre pacientes, recuperação de conta e experiência móvel precisam de validação integrada antes do piloto. A interface recentemente alterada ainda precisa de revisão visual no navegador.

## Agora — tornar o ciclo principal confiável

| Prioridade | Entrega pendente | Critério de conclusão |
| --- | --- | --- |
| P0 | Validar convite → ficha → publicação → registro → comentário → leitura pelo paciente | Executar com contas de teste separadas; registrar resultado e corrigir falhas; não usar dados clínicos fictícios em contas reais |
| P0 | Revisar interface móvel e menu | Sem rolagem horizontal da página; menu abre/fecha por botão, fundo e Escape; foco acessível; formulários e ações utilizáveis em tela estreita |
| P0 | Publicar ambiente de piloto e validar recuperação de acesso | Convite e recuperação funcionam no domínio; sessão persiste; erros indicam próximo passo |
| P0 | Verificar proteção e operação | Testar isolamento de dois pacientes, acesso negado a notas privadas, fotos com acesso autorizado, consentimento, exclusão e recuperação de backup; registrar evidências |
| P1 | Início com próximo passo explícito | Mostrar ficha pendente, espera pelo plano ou refeições do dia conforme dados reais; não inventar consultas, metas ou progresso |
| P1 | Registro com menos esforço | Foto, relato e medidas fáceis de encontrar; confirmação de salvamento; erro preserva o preenchimento; paciente consegue entender o fluxo sem orientação |
| P1 | Pendências úteis no painel profissional | Cada alerta informa período, motivo e acesso ao paciente; ausência de registro não vira conclusão clínica |
| P1 | Retorno visível | Paciente encontra o comentário do nutricionista; validar antes de desenvolver chat paralelo |

Ajustes já feitos nesta rodada: navegação ordenada pelo uso principal, nome Comunidade e títulos objetivos. Não adicionar links de módulos ainda inexistentes.

## Próxima fase — adesão, após o piloto

| Recurso | Por que fica para depois | Dependências e aceite |
| --- | --- | --- |
| Check-in configurável | Novo fluxo de perguntas, frequência e respostas | Tabelas, RLS, configuração pelo profissional e histórico; resposta gera pendência sem duplicação |
| Fila de acompanhamento e intervenções | Exige estados e responsabilidade, além de um alerta visual | Registrar motivo, evidência, responsável, conclusão e descarte; evitar tarefas repetidas |
| Hábitos personalizados | Metas precisam fazer sentido para cada paciente | Profissional define hábito e frequência; paciente pode registrar sem punição por interrupções |
| Lembretes push/WhatsApp | Depende de infraestrutura, permissões e entregabilidade | Preferências, horário, opt-out, fila, prevenção de duplicatas e registro de falhas; nada é enviado nesta etapa |
| Histórico de planos para o paciente | Histórico administrativo já existe; exposição precisa ser deliberada | Diferenciar claramente plano atual de anterior e impedir registros no plano antigo |
| Evolução além do peso | Exige definição útil dos indicadores | Períodos claros, métricas selecionadas pelo profissional e explicação do cálculo |
| Lista de compras | Somar todas as alternativas geraria compras erradas | Escolhas e período definidos; unidades compatíveis; itens à vontade tratados separadamente |
| Receitas e alternativas fora de casa | Novo conteúdo e vínculo ao plano | Curadoria e aprovação pelo nutricionista, sem substituições automáticas |

## Futuro — expansões complexas registradas

- **Comunidade por grupos e programas:** grupos privados, atividades, conteúdos e desafios. Depende de permissões, moderação e evidência de interesse; evitar comparação de peso e pressão por sequências perfeitas. Revisar ranking e opção de compartilhar peso existentes antes de ampliar seu destaque.
- **Agenda e atendimento:** disponibilidade, conflitos, fuso, remarcação, histórico e lembretes. Vídeo e lista de espera ficam após o fluxo básico de agenda.
- **Mensagens e áudio:** histórico, anexos privados, entrega, limites e notificações. Começar pela avaliação dos comentários já existentes.
- **Financeiro e gestão comercial:** pacotes, cobrança, reconciliação, renovações e cancelamentos; requer provedor e tratamento de falhas. Não faz parte do piloto.
- **IA de apoio ao profissional:** resumo rastreável de check-ins e histórico autorizado, com revisão humana, avaliação de qualidade e minimização de dados. Sem prescrição automática.
- **IA em fotos de alimentos:** sugestões editáveis e incerteza explícita; não apresentar porções ou nutrientes estimados como medidas exatas. Avaliar custo e utilidade antes de integrar.
- **Motor de acompanhamento avançado:** começar com regras simples explicáveis. Só avançar a padrões e análise de intervenções depois de dados suficientes; não confundir correlação com efeito clínico.
- **Biblioteca educativa e programas reutilizáveis:** etapas, materiais e personalização por paciente; validar primeiro um programa manual com o Emanuel.
- **Relatórios avançados e integrações:** exportação, dispositivos e fontes nutricionais exigem qualidade de dados, permissões e manutenção.
- **SaaS, equipes e marca por consultório:** decisão comercial separada; exige revisão de isolamento entre organizações, papéis, convites, cobrança e identidade visual.
- **Auditoria e operação ampliadas:** histórico de acessos/alterações, retenção, exportação e recuperação documentada. Proteções essenciais e backup não podem ser adiados em nome dessa fase futura.

## Piloto de uso real

Proposta: Emanuel e 3–5 pacientes voluntários por duas semanas, após os itens P0. É um plano de validação, não convite ou mensagem já enviado.

1. Observar uma sessão de montagem/publicação de plano e o primeiro uso do paciente.
2. Pedir que o paciente encontre o plano, faça um registro e localize o retorno sem instruções de navegação.
3. Observar o profissional identificando uma pendência e respondendo pelo aplicativo.
4. Anotar onde houve hesitação, abandono, informação faltante ou uso de outra ferramenta.
5. Corrigir primeiro o que bloqueia esses fluxos. Só então escolher a próxima funcionalidade.

Indicadores iniciais, medidos manualmente ou com consultas autorizadas e agregadas; nenhum rastreador externo foi instalado:

- Ativação: convidados que concluem acesso/ficha e fazem o primeiro registro após receber o plano; mostrar também cada etapa separada.
- Uso relevante: pacientes com registros em dias distintos na semana, entre aqueles com plano ativo. Frequência esperada deve ser combinada com o profissional.
- Retorno: registros que recebem resposta quando necessária e tempo até essa resposta.
- Esforço: tempo observado para publicar um plano e revisar um paciente; comparar com a rotina anterior.
- Continuidade: participantes que voltam na segunda semana e motivos informados por quem não voltou.
- Qualidade dos alertas: úteis, descartados e repetidos, com justificativa do profissional.

Não estabelecer metas percentuais arbitrárias antes de medir a primeira semana. Não interpretar frequência de registro como resultado clínico. Escolher a próxima entrega com base no principal obstáculo observado e no esforço para resolvê-lo.


## Personalização e resultados — implementado localmente em 27/10/2026

- Foto de perfil, capa, nome de exibição e bio para profissional e paciente, inclusive paciente sem comunidade ativa.
- Foto direta no feed (salva também no diário), filtros de publicações e fotos dos autores.
- Evolução com primeiro/último registro e mudança no período; resumo semanal em texto, sem gráfico de barras.
- Migração necessária: `supabase/migrations/004_perfis_visuais.sql`. Ainda não aplicada no Supabase hospedado nesta entrega.
- 23 testes locais passaram, incluindo privacidade das fotos de perfil, acesso de seguidores e bloqueio após sair da comunidade. Build concluído.
- Upload real de avatar/capa, edição e renderização após a migração ainda exigem validação. Não considerar liberado para o piloto antes disso.

Ajuste de preferência: perfil usa somente foto, nome e apresentação. Capa removida da interface; coluna mantida por compatibilidade e limpa ao salvar o perfil.
