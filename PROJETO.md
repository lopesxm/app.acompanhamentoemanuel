# Sistema Nutricionista: documento do projeto

Versão 0.1 (rascunho). Documento vivo: atualize conforme as decisões forem tomadas.

## 1. Visão geral

Sistema web para um nutricionista (Emanuel) acompanhar seus clientes. O cliente entra por um link de convite, preenche a própria ficha e passa a ver o plano alimentar no celular. No dia a dia ele registra o que comeu, envia foto do prato, relata quando saiu da dieta e atualiza peso e medidas. O nutricionista vê tudo em um painel e usa essas informações para montar e ajustar a dieta.

### Objetivo principal

Dar ao nutricionista controle sobre o que os clientes estão comendo e agilizar a construção da dieta, juntando em um só lugar a ficha, o plano e o histórico de cada pessoa.

### Princípio inegociável

O sistema não prescreve dietas. Quem prescreve é o nutricionista. Isso significa:

- Nenhum plano alimentar é gerado automaticamente.
- Cálculos (TMB, gasto energético total) aparecem apenas como apoio no painel do nutricionista, com a fórmula visível e valores editáveis. O cliente nunca vê sugestões de calorias ou alimentos geradas pelo sistema.
- Todo plano exibido ao cliente foi criado e publicado pelo nutricionista.

## 2. Perfis de acesso

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| Admin | O nutricionista | Cadastrar clientes, gerar convites, ver e editar fichas, montar e publicar planos, ver registros, fotos e evolução de todos os clientes |
| Cliente | Pessoa atendida | Preencher e atualizar a própria ficha, ver o próprio plano publicado, registrar refeições, fotos, fugas, peso e medidas. Nunca vê dados de outro cliente |

Por enquanto existe um único admin. Mesmo assim, as tabelas principais terão a coluna `nutricionista_id`. Custa quase nada agora e evita refazer o banco se o sistema virar SaaS para outros nutricionistas.

## 3. Fluxos principais

### 3.1 Cadastro do cliente e convite

1. Admin clica em "Novo cliente" e informa nome e WhatsApp (e-mail opcional).
2. O sistema cria o cliente com status `convite_pendente` e gera um link único, por exemplo `https://dominio.com/convite.html?token=abc123`.
3. Admin clica em "Enviar no WhatsApp", que abre o `wa.me` com uma mensagem pronta contendo o link.
4. O cliente abre o link, cria a conta (e-mail e senha) e aceita o termo de consentimento de dados de saúde.
5. O convite é marcado como usado e o cliente cai direto na ficha. Status passa para `ficha_pendente`.

Regras do convite: expira em 7 dias, só pode ser usado uma vez, admin pode gerar um novo a qualquer momento.

### 3.2 Preenchimento da ficha (anamnese)

Formulário em etapas, pensado para celular, com barra de progresso e salvamento automático a cada etapa (o cliente pode parar e voltar depois). Ao concluir, status passa para `aguardando_plano` e o admin vê o aviso no painel. Campos na seção 4.

### 3.3 Construção do plano alimentar

1. Admin abre o cliente e vê a ficha resumida ao lado do editor.
2. Cria o plano a partir de: plano em branco, modelo salvo ou cópia de um plano anterior do próprio cliente.
3. Monta refeições, grupos e opções (estrutura na seção 5).
4. Salva como rascunho quantas vezes quiser. Ao clicar em "Publicar", o plano fica visível para o cliente e o anterior vai para o histórico.
5. Pode exportar em PDF no mesmo formato dos planos que já usa hoje.

### 3.4 Uso diário pelo cliente

Tela inicial do cliente mostra o plano do dia, refeição por refeição, na ordem dos horários. Em cada refeição ele pode:

- Marcar "Comi" e escolher qual opção de cada grupo comeu (ex: no almoço, carboidrato "Batata-doce 200 g" e proteína "Frango 120 g").
- Marcar "Pulei esta refeição".
- Anexar foto do prato.
- Registrar "Comi fora do plano", descrevendo o que comeu.

Além disso, um botão para registrar peso e medidas (o admin define a frequência, por exemplo semanal).

### 3.5 Acompanhamento pelo nutricionista

- Painel com a lista de clientes e indicadores de alerta (seção 7).
- No perfil do cliente: linha do tempo dos registros com fotos, adesão por dia e por refeição, fugas relatadas e gráfico de peso e medidas.
- Admin pode deixar um comentário em um registro (ex: na foto do prato) que o cliente vê.

## 4. Ficha do cliente (anamnese)

Campos marcados com (*) são obrigatórios. Lista inicial, a ser validada pelo Emanuel.

**Dados pessoais**
- Nome completo (*), data de nascimento (*), sexo biológico (*), WhatsApp (*), e-mail (*)
- Profissão e rotina de trabalho (horário, se é sentado ou de pé)

**Antropometria**
- Peso atual (*), altura (*)
- Circunferências opcionais: cintura, quadril, braço, coxa
- Foto corporal opcional (frente, lado, costas)

**Objetivo**
- O que o cliente quer (*): perder gordura, ganhar massa, manter, saúde, performance, outro
- Prazo ou evento (opcional)
- Observação: o objetivo declarado é a vontade do cliente. A definição técnica da estratégia fica com o nutricionista em um campo próprio do admin.

**Rotina e atividade física**
- Horário em que acorda e dorme (*)
- Treina? Qual modalidade, quantos dias por semana, horário e duração
- Nível de atividade fora do treino
- Fator atividade: definido pelo nutricionista no painel, não pelo cliente

**Saúde**
- Condições de saúde diagnosticadas
- Medicamentos em uso
- Alergias e intolerâncias alimentares (*)
- Cirurgias anteriores
- Exames recentes (upload de PDF ou imagem)

**Hábitos**
- Consumo de água por dia
- Álcool (frequência)
- Qualidade do sono
- Funcionamento intestinal
- Fuma?

**Alimentação atual**
- Quantas refeições faz por dia e em quais horários
- Descrição de um dia típico (texto livre)
- Alimentos que gosta muito
- Alimentos que não come de jeito nenhum
- Restrições por escolha (vegetariano, sem lactose por opção, religiosa etc.)
- Quem cozinha, se come fora com frequência, se leva marmita
- Suplementos que usa

**Consentimento**
- Aceite do termo de uso e do tratamento de dados de saúde (*), com data e hora registradas

## 5. Estrutura do plano alimentar

Baseada nos planos que o Emanuel já entrega. Hierarquia:

```
Plano (versão, data de início, status: rascunho | publicado | arquivado)
 └── Refeição (nome, horário, ordem)          ex: Almoço, 12h50
      └── Grupo (nome, regra)                 ex: Carboidrato, escolher 1
           └── Opção (alimento, quantidade, unidade, observação)
                ex: Batata-doce cozida, 200, g
```

Regras dos grupos:
- `escolher_1`: cliente escolhe uma opção do grupo (o caso mais comum: carboidrato, proteína, fruta)
- `todos`: todos os itens fazem parte da refeição (ex: pré-treino com pão, ovos e doce de leite)
- `a_vontade`: sem quantidade (ex: salada)

Também é possível ter opções inteiras de refeição (ex: café da manhã Opção 1 e Opção 2, ou jantar Opção Arroz e Opção Batata). Modelagem: um grupo do tipo `escolher_1` cujas opções são combinações. A confirmar com o Emanuel qual forma ele prefere usar no editor.

Campos extras:
- Observações por refeição e observações gerais do plano (ex: "Feijão removido das opções de jantar")
- Unidade de medida: g, ml, unidade, colher de sopa, fatia, porção, a gosto
- Equivalência caseira opcional (ex: 150 g, cerca de 3 unidades)

Agilidade na montagem:
- Banco de alimentos próprio do nutricionista: ele cadastra uma vez o alimento e a quantidade padrão e depois só seleciona
- Modelos de refeição e de plano reutilizáveis
- Duplicar plano de um cliente para outro
- Calorias (implementado, em validação com o Emanuel): kcal informadas por opção, com sugestão da tabela TACO no editor que o Emanuel decide usar. O cliente vê kcal por refeição, total do dia (faixa quando há "escolha 1") e o que já registrou no Hoje. Se o Emanuel não aprovar a sugestão automática, ela sai e fica só o campo manual.
- Futuro: macros (proteína, carboidrato, gordura) pela TACO como apoio ao nutricionista

Versionamento: cada publicação gera uma nova versão. O histórico fica guardado para o nutricionista comparar o que mudou e relacionar com a evolução de peso.

## 6. Registros do cliente

| Tipo | Dados | Observação |
|---|---|---|
| Check de refeição | data, refeição, status (comi, pulei), opções escolhidas por grupo | Base para calcular adesão |
| Foto do prato | imagem, data, refeição vinculada | Armazenada em bucket privado, compressão no navegador antes do upload |
| Fuga da dieta | data, horário aproximado, descrição, motivo opcional (social, fome, ansiedade, outro) | Tom acolhedor na interface, sem julgamento |
| Peso e medidas | data, peso, circunferências opcionais, foto corporal opcional | Gera gráfico de evolução |

Cálculo de adesão (apoio para o nutricionista):
- Adesão do dia = refeições marcadas como "Comi" dentro do plano ÷ refeições previstas
- Mostrada por dia, semana e por refeição (ex: "jantar é onde ele mais falha")

## 7. Painel do administrador

**Tela inicial**
- Contadores: clientes ativos, fichas pendentes, aguardando plano
- Lista de alertas:
  - Ficha preenchida e sem plano publicado
  - Cliente sem nenhum registro há 3 dias ou mais
  - Adesão da semana abaixo de 60%
  - Novas fugas relatadas
  - Pesagem atrasada
- Valores de alerta configuráveis

**Lista de clientes**
- Busca por nome, filtro por status e por objetivo
- Colunas: nome, status, objetivo, último registro, adesão da semana

**Perfil do cliente (abas)**
1. Ficha: dados preenchidos, com campos técnicos do nutricionista (estratégia, fator atividade, anotações privadas que o cliente não vê)
2. Cálculos de apoio: TMB e GET com fórmula escolhida pelo nutricionista (ex: Harris-Benedict, Mifflin-St Jeor), todos os valores editáveis
3. Plano: editor, versão atual, histórico, exportar PDF
4. Diário: linha do tempo de checks, fotos e fugas, com comentários
5. Evolução: gráficos de peso e medidas, fotos corporais lado a lado

## 8. Telas

**Públicas**
- `login.html`: login e "esqueci minha senha"
- `convite.html`: criação de conta a partir do token
- `redefinir-senha.html`

**Cliente (mobile first)**
- `app/hoje.html`: plano do dia com check por refeição
- `app/plano.html`: plano completo
- `app/registrar.html`: foto, fuga, peso
- `app/evolucao.html`: gráfico simples do próprio peso
- `app/ficha.html`: ver e atualizar a ficha
- `app/comunidade.html`: feed, ranking semanal e amigos (Fase 5)
- `app/perfil.html?id=`: perfil na comunidade, com adesão semanal e "Comparar" (Fase 5)

**Admin (desktop first, funcionando no celular)**
- `admin/index.html`: painel e alertas
- `admin/clientes.html`: lista
- `admin/cliente.html?id=`: perfil com abas
- `admin/alimentos.html`: banco de alimentos
- `admin/modelos.html`: modelos de refeição e plano
- `admin/comunidade.html`: posts do Emanuel e moderação (Fase 5)

### 8.1 Identidade visual (provisória)

Visual limpo e mais visual do que textual: números grandes, anel de progresso, cartões curtos e ícones em quadrinhos. A base é neutra, o verde da marca é o acento principal e dois tons de apoio (coral e âmbar) aparecem pouco, só em ícones e em um ou outro destaque. O app tem modo claro e modo escuro: o botão ☾/☀ fica no topo, no menu e no login; a escolha fica salva no aparelho e, sem escolha, segue o tema do celular.

Todas as cores estão em `assets/css/paleta.css` (claro e escuro). Toda tela usa as variáveis, nunca cores soltas.

**Cores (claro / escuro)**

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--cor-canvas` | `#F3F4F3` | `#0F1211` | Fundo da página |
| `--cor-fundo` | `#FFFFFF` | `#181C1B` | Cartões, campos e superfícies |
| `--cor-suave` | `#F1F2F1` | `#222726` | Blocos internos, trilhas, chips |
| `--cor-borda` | `#E3E6E3` | `#303634` | Bordas |
| `--cor-titulo` | `#17191B` | `#F1F3F2` | Títulos e números; fundo de elementos invertidos |
| `--cor-texto` | `#42464B` | `#C9CECB` | Texto corrido |
| `--cor-placeholder` | `#747B78` | `#8E9692` | Texto secundário |
| `--cor-primaria` | `#008060` | `#35B886` | Ações, refeições feitas, anel, links |
| `--cor-primaria-suave` | `#E6F2EC` | `#18332A` | Fundo de destaque verde |
| `--cor-coral` / `-suave` | `#D9775F` / `#FBEBE6` | `#EF9682` / `#3A2622` | Fotos e ponta quente do anel |
| `--cor-ambar` / `-suave` | `#B7800F` / `#FDF2D8` | `#E5B64F` / `#372F1E` | Sequência de dias e conquistas |
| `--cor-erro` | `#C0392B` | `#F0806F` | Erros e validação |

**Tipografia**
- Fonte: Inter (Google Fonts), com fonte do sistema como alternativa
- Título de página: 32px, peso 800, cor preta, espaçamento entre letras levemente negativo
- Texto: 16px, peso 400, altura de linha 1.5, cor cinza
- Destaque dentro do texto: peso 700 em preto (ex: "**Crie um projeto** grátis em supabase.com")
- Rótulo de campo: 14px, cinza, acima do campo

**Componentes**
- Botão principal: fundo verde, texto branco em negrito, cantos arredondados de 6px, altura de 44px
- Botão secundário: fundo branco, borda cinza de 1px, texto preto em negrito
- Link de ação: texto verde em negrito, sem sublinhado (sublinha no hover)
- Campo de texto: borda cinza de 1px, cantos de 8px, altura de 44px, foco com borda verde
- Lista de passos: círculo preto de 24px com número branco, título em negrito seguido da explicação no mesmo parágrafo
- Conteúdo em coluna única com largura máxima de 640px nas telas de formulário (convite, ficha, login)

## 9. Stack técnica

- Frontend: HTML, CSS e JavaScript puro (sem framework). Um arquivo JS por tela e um módulo comum para o cliente Supabase e funções utilitárias.
- Backend: Supabase
  - Auth: e-mail e senha
  - Postgres: dados, com Row Level Security em todas as tabelas
  - Storage: buckets privados para fotos e exames, acesso por URL assinada
  - Funções SQL (RPC) para operações sensíveis, como aceitar convite
- Biblioteca supabase-js carregada via CDN com versão fixa
- Gráficos: Chart.js via CDN
- PDF do plano: página de impressão com CSS próprio (`window.print()`) na primeira versão
- Hospedagem: Vercel ou Netlify (site estático)
- PWA simples (manifest e ícone) para o cliente instalar na tela inicial do celular

Estrutura de pastas sugerida:

```
/
├── index.html            (redireciona conforme o perfil logado)
├── login.html
├── convite.html
├── redefinir-senha.html
├── app/                  (telas do cliente)
├── admin/                (telas do nutricionista)
├── assets/
│   ├── css/
│   ├── js/
│   │   ├── supabase.js   (cliente e helpers de sessão)
│   │   ├── auth-guard.js (bloqueia página se perfil errado)
│   │   └── ...
│   └── img/
├── supabase/
│   └── migrations/       (SQL versionado)
├── manifest.json
└── PROJETO.md
```

Segurança importante: a chave `anon` do Supabase fica no frontend, então toda a proteção depende do RLS. Nunca colocar a chave `service_role` no código do site. O guard de página no JS é só conforto de navegação, não segurança.

## 10. Modelo de dados (Supabase)

```
perfis
  id (uuid, = auth.users.id), papel ('admin' | 'cliente'), nome, criado_em

clientes
  id, nutricionista_id -> perfis, usuario_id -> perfis (nulo até aceitar convite),
  nome, whatsapp, email, status ('convite_pendente' | 'ficha_pendente' |
  'aguardando_plano' | 'ativo' | 'inativo'), criado_em

convites
  id, cliente_id, token (único), expira_em, usado_em

fichas
  id, cliente_id, dados (jsonb com as respostas por seção), etapa_atual,
  concluida_em, consentimento_em, atualizado_em

fichas_tecnicas            (só o admin lê e escreve)
  cliente_id, estrategia, fator_atividade, formula_calculo, anotacoes_privadas

alimentos                  (banco do nutricionista)
  id, nutricionista_id, nome, quantidade_padrao, unidade, medida_caseira

planos
  id, cliente_id, versao, status ('rascunho' | 'publicado' | 'arquivado'),
  observacoes_gerais, inicio_em, publicado_em

refeicoes
  id, plano_id, nome, horario, ordem, observacoes

grupos
  id, refeicao_id, nome, regra ('escolher_1' | 'todos' | 'a_vontade'), ordem

opcoes
  id, grupo_id, alimento_id (opcional), descricao, quantidade, unidade,
  medida_caseira, observacao, ordem

registros_refeicao
  id, cliente_id, refeicao_id, data, status ('comi' | 'pulei'),
  opcoes_escolhidas (array de opcao_id), criado_em

fotos_refeicao
  id, cliente_id, registro_id (opcional), caminho_storage, data, criado_em

fugas
  id, cliente_id, data, horario, descricao, motivo, criado_em

medidas
  id, cliente_id, data, peso, cintura, quadril, braco, coxa, criado_em

comentarios
  id, autor_id, alvo_tipo ('registro' | 'foto' | 'fuga'), alvo_id, texto, criado_em
```

Regras de RLS (resumo):
- Admin: acesso total às linhas onde `nutricionista_id` é o dele (direto ou via cliente).
- Cliente: lê e escreve só linhas cujo `cliente_id` pertence ao seu `usuario_id`.
- Cliente lê apenas planos com status `publicado`.
- `fichas_tecnicas` e `anotacoes_privadas`: invisíveis para o cliente.
- Storage: caminho no formato `{cliente_id}/{arquivo}`, com policy equivalente.

Aceite de convite: função SQL `aceitar_convite(token)` com `security definer`. Valida se o token existe, não expirou e não foi usado, vincula o `auth.uid()` ao cliente, cria o perfil com papel `cliente`, marca o convite como usado e muda o status para `ficha_pendente`.

## 11. Privacidade e LGPD

Dados de saúde são dados pessoais sensíveis pela LGPD. Mínimo necessário:
- Termo de consentimento específico, aceito no primeiro acesso, com data registrada
- Política de privacidade acessível no rodapé
- Fotos e exames em bucket privado, nunca com URL pública
- Cliente pode pedir exclusão dos seus dados (na primeira versão, via solicitação ao nutricionista, com botão de exclusão no admin)
- Backups do Supabase ativos

## 12. Fases de entrega

**Fase 1: base e acesso**
- Projeto Supabase, tabelas, RLS
- Login, logout, redefinir senha
- Admin cadastra cliente e gera link de convite com botão de WhatsApp
- Cliente aceita convite e cria conta
- Ficha em etapas com salvamento automático
- Admin vê lista de clientes e ficha preenchida

**Fase 2: plano alimentar**
- Editor de plano (refeição, grupo, opção) com rascunho e publicação
- Banco de alimentos do nutricionista
- Tela do cliente com o plano
- Impressão em PDF

**Fase 3: registro diário**
- Check de refeição com escolha de opção
- Foto do prato
- Relato de fuga
- Linha do tempo no admin e comentários

**Fase 4: evolução e produtividade**
- Peso e medidas com gráficos
- Cálculos de apoio (TMB e GET)
- Alertas no painel
- Modelos de plano, duplicar plano, histórico de versões
- PWA

**Fase 5: comunidade**

Inspirada no Hevy, mas o que se compartilha é a alimentação, não o treino. Depende do diário da Fase 3, porque os posts nascem dos registros que o cliente já faz.

O que o cliente compartilha:
- Foto da refeição: sai do próprio diário. O cliente toca em "Compartilhar" e o post ganha o selo "Dentro do plano".
- Resumo do dia: só números, por exemplo "6 de 6 refeições, 100%, 12 dias seguidos". Nenhum nome de alimento aparece.
- Conquista: marcos como "7 dias seguidos" ou "Semana 100%". O sistema sugere, mas é o cliente quem decide postar.

Perfil (no desenho do Hevy):
- Gráfico de adesão semanal no lugar do gráfico de horas de treino
- Contadores: dias registrados, seguidores e seguindo
- Botão "Comparar"

Interações:
- Curtir e comentar
- Ranking semanal: compara a adesão só entre você e quem você segue, e zera toda segunda-feira
- Comparar com um amigo: os dois lado a lado. Só funciona quando um segue o outro.

Privacidade, a parte mais importante:
- A comunidade vem desligada. O cliente ativa se quiser.
- Para seguir alguém, a pessoa precisa aceitar.
- Nada é postado sozinho.
- Ficha, quantidades da dieta, fugas e medidas nunca vão para o feed.
- Peso em kg só aparece se o cliente ligar essa opção.
- O Emanuel vê tudo, modera os posts e comenta com o selo "Nutricionista".

Decisões do Emanuel:
- O Emanuel tem perfil próprio na comunidade e posta dicas, conteúdos e chamadas para engajar. Esses posts aparecem para todo cliente que ativou a comunidade, sem precisar seguir.
- A moderação é depois: os posts entram direto e o Emanuel esconde o que não estiver adequado.
- Perfil de cliente só pode ser visto por quem segue a pessoa (com o pedido aceito). Para achar alguém, busca-se pelo @usuário e envia o pedido. Antes do aceite, aparece só o nome e o @.

**Futuro (fora do escopo atual)**
- Registro de treino estilo Hevy (fora do MVP para não inflar o escopo)
- Multi-nutricionista e cobrança (SaaS)
- Tabela TACO com macros automáticos como apoio
- Lembretes por WhatsApp ou notificação push nos horários das refeições
- Chat entre nutricionista e cliente
- Agenda de consultas e retornos

## 13. Perguntas em aberto

1. Algum campo que o Emanuel sempre pergunta e não está na ficha? Algum que sobra?
2. No editor, ele prefere montar por grupos ("escolher 1 carboidrato") ou por opções inteiras de refeição ("Opção 1 arroz, Opção 2 batata")? Ou os dois?
3. O cliente pode trocar a opção escolhida depois de marcar, ou o registro fica travado no fim do dia?
4. Com que frequência ele quer que o cliente se pese?
5. O cliente deve ver a própria adesão ou só o nutricionista?
6. Vai ter domínio próprio e marca (nome do sistema, logo, cores)?
7. Haverá cobrança do cliente final pelo sistema ou o acompanhamento é pago por fora?
8. Qual é o prazo desejado para a Fase 1 ficar no ar?

As perguntas sobre a comunidade (perfil do Emanuel, momento da moderação e visibilidade dos perfis) já foram respondidas e estão em "Decisões do Emanuel", na Fase 5.


## 14. Direção de produto e próximas entregas — 27/10/2026

**Objetivo principal:** criar um aplicativo que o nutricionista e os pacientes realmente usam. Priorizar clareza, facilidade de registro e acompanhamento útil antes de aumentar o número de funcionalidades.

O detalhamento e a fila de atualizações estão em [ATUALIZACOES.md](ATUALIZACOES.md). Essa priorização orienta as próximas entregas; as fases anteriores descrevem o escopo original, não comprovam validação em produção.

- Manter o foco atual no acompanhamento do Emanuel. Multi-consultório/SaaS é uma decisão futura, não uma mudança autorizada de arquitetura nesta etapa.
- Paciente: entender o próximo passo, consultar o plano, registrar e receber retorno.
- Nutricionista: identificar pendências, consultar o contexto e agir sem trabalho repetitivo.
- Comunidade: participação opcional e apoio; não exigir interação para usar o acompanhamento.
- Linguagem direta, respeitosa e adulta, sem diminutivos ou gírias forçadas.
- Visual inspirado na organização do Hevy, adaptado à nutrição: cartões, navegação previsível, uso móvel e verde pontual.
- Ausência de registro significa ausência de informação, não prova de descumprimento do plano.
- Nenhuma recomendação clínica automática ou exposição adicional de dados é introduzida por este planejamento.
