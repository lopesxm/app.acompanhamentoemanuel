# Organização do membro

Principal: Início, Meu plano, Registrar, Minha evolução, Society.
Minha conta: Minha ficha, Conquistas, Falar com a equipe, Configurações.
O avatar continua abrindo a identidade pública do membro. Configurações permite editar foto, apresentação e tema, consultar privacidade e pedir ajuda.

O início apresenta somente dados reais: refeições do plano ativo, último peso e sequência de dias com refeições feitas. Dias com refeições puladas não são apresentados como refeições feitas. A ação principal continua respeitando ficha pendente, plano ausente e início futuro.

Níveis representam participação por pontos. Não são patentes e não certificam resultados físicos. Os pontos e os requisitos anteriores foram preservados; a identificação visual passa a usar número e nome do nível.

## Início (`assets/js/home.js`, `assets/css/grinder.css`)

- Em onboarding (ficha pendente, ficha enviada ou plano com início futuro): saudação, próximo passo, etapas do acompanhamento, guia recolhido, o que já está liberado e Society.
- Com plano ativo: saudação, próximo passo com a refeição da vez, Seu dia, registros rápidos, consistência e peso, Society e Grinder Ranks.
- O cartão de Grinder Ranks só aparece quando `visual_perfil` devolve `pontos`. Sem esse dado, não aparece nem vazio. A regra de pontos segue no banco (`010_pontos_grinder.sql`).
- Peso não usa cor nem texto de "bom" ou "ruim": subir ou descer depende do objetivo.
- Quando treino, água, hábitos ou desafios ganharem dados reais, entram em Seu dia, nos registros rápidos e na Society.

## Próximas etapas

- Prescrição e histórico de treinos, com acesso profissional e registro de execução.
- Meta de hidratação definida pelo profissional e registro diário persistente.
- Hábitos prescritos, frequência, conclusão diária e pontuação protegida contra duplicações.
- Desafios coletivos com inscrição, regras e critérios verificáveis.
- Atendimento por mensagens gerais dentro do app. Hoje o contato abre o e-mail do Emanuel e o diário permite responder orientações existentes.
- Preferências adicionais e recuperação de conta integradas às configurações.

As telas atuais não simulam treinos, água, hábitos ou desafios inexistentes. Esses itens precisam de modelos de dados, permissões e validação antes de publicação.
