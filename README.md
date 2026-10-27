# Emanuel · Sistema nutricionista

Implementação local do `PROJETO.md`, com HTML, CSS e módulos JavaScript, preparada para Supabase. Nenhuma dieta é gerada pelo sistema.

## Executar

Requer Node.js 20 ou superior. Para abrir a interface, não é necessário instalar dependências:

```sh
npm run dev
```

Abra http://localhost:4173. Na tela de acesso, escolha **Demonstração do nutricionista** ou **Demonstração do cliente**. Os dados são fictícios e persistem no navegador. Na demonstração dá pra enviar imagens (foto de perfil, foto do prato, post com foto): elas ficam comprimidas só no armazenamento deste navegador, nunca vão pra internet. Não use dados reais na demonstração.

Para limpar a demonstração, apague somente a chave `emanuel-demo-v1` no armazenamento local do site. O modo ativo usa a chave de sessão `demo-role`.

## Conectar ao Supabase

1. Crie um projeto Supabase novo. A migração inicial é destinada a um banco sem estas tabelas.
2. Execute `supabase/migrations/001_initial.sql` no SQL Editor. Ela cria as tabelas, RPCs, políticas RLS e o bucket privado `saude`. Depois execute `002_mensagens_casuais.sql`, que só troca o texto das mensagens de erro, `003_comunidade.sql`, que cria a comunidade (Fase 5), `004_perfis_visuais.sql` (foto de perfil e bio) e `005_calorias.sql` (kcal das opções do plano e do banco de alimentos).
3. Em Authentication, crie a conta do administrador e copie o UUID. No SQL Editor, execute, substituindo o UUID abaixo:

```sql
insert into public.perfis(id, papel, nome)
values ('UUID-DA-CONTA-ADMINISTRADORA', 'admin', 'Emanuel');
```

4. Preencha `assets/js/config.js` com a URL e a chave **pública** anon/publishable. Nunca use service_role ou secret key no frontend.
5. Configure a URL do site e os redirecionamentos de autenticação para `/convite.html` e `/redefinir-senha.html`, incluindo os parâmetros de convite. Para desenvolvimento, permita `http://localhost:4173/**`; em produção, restrinja ao domínio publicado.
6. Configure envio de e-mails de autenticação. Com confirmação de e-mail habilitada, o cliente confirma o e-mail, reabre o convite e usa **Já confirmei meu e-mail: aceitar convite**.
7. Entre com a conta administradora, cadastre um cliente e gere um convite. A ação WhatsApp abre a mensagem para revisão e envio manual.

## Fluxos implementados

- Admin: painel, alertas configuráveis, filtros de clientes, cadastro e convite de 7 dias, ficha e anotações privadas, cálculos de apoio, planos com refeições/grupos/opções, rascunhos, publicação atômica e versões, impressão, banco de alimentos, modelos de plano e refeição, cópia entre clientes, diário/comentários e evolução.
- Cliente: convite com consentimento, ficha em seis etapas com salvamento automático, plano publicado, seleção de alimentos, registro de refeição, foto do prato, relato fora do plano, peso e circunferências, exames e fotos corporais privados, comentários e evolução.
- Comunidade (Fase 5): ativação opcional com @, pedidos para seguir com aceite, feed com fotos do diário, resumo do dia só com números e conquistas, curtidas e comentários, perfil com adesão semanal, ranking semanal entre quem se segue, comparação lado a lado, posts do Emanuel para todos e moderação depois. Os clientes não leem as tabelas da comunidade direto: tudo passa por funções do banco que aplicam as regras de privacidade (`003_comunidade.sql`).
- Acesso: login, logout, redefinição de senha e proteção por perfil. O controle real está no banco, não no guard JavaScript.
- Arquivos: compressão de imagens para até 1600 px, limite de 10 MB, bucket privado e URLs assinadas de cinco minutos.
- PWA básica: manifesto, ícone e service worker sem cache de dados de saúde. Precisa de HTTPS fora de localhost.

## Decisões da primeira implementação

- Registros de refeições podem ser alterados no dia atual, considerando America/Sao_Paulo. O banco valida a regra.
- Pesagem a cada sete dias por padrão, editável por cliente.
- Adesão percentual é exibida apenas para o nutricionista; o cliente vê o número de refeições registradas.
- Opções inteiras de refeição são cadastradas como descrição da combinação e porção em um grupo de escolha única. Ainda não há subeditor de ingredientes dentro da combinação.
- Gráficos usam SVG acessível, sem Chart.js, evitando outra dependência de CDN.
- Resultados de TMB/GET são editáveis na tela; a fórmula e o fator são persistidos, e a decisão clínica deve ser registrada na estratégia. Não há recomendações automáticas de calorias ou alimentos.
- Publicar substitui imediatamente o plano visível anterior. Se a data de início for futura, a nova versão pode ser consultada, mas os checks aguardam a data. Não há agendamento automático de versões.
- A exclusão pelo painel remove arquivos e dados relacionados ao cliente. A remoção da conta Auth exige a operação administrativa no Supabase. Arquivos e linhas não compartilham uma transação; uma falha deve ser corrigida antes de tentar novamente.

## Verificações

```sh
npm ci
npm run check
npm test
```

PGlite é dependência apenas de desenvolvimento. Os testes executam a migração em Postgres embarcado, com estruturas simuladas de Auth/Storage, e verificam consentimento, uso único de convite, isolamento entre clientes, invisibilidade de anotações/rascunhos, publicação/versionamento, integridade de escolhas e políticas de arquivos. Eles não substituem um teste integrado no seu Supabase.

Verificados na prévia: painel, perfil, editor, cópia e salvamento de rascunho, registro de refeição com opções e layout do cliente em 390 px.

## Empacotar para hospedagem

Execute `npm run build`. A pasta `dist/` inclui apenas as páginas e os recursos públicos. Há configuração para Netlify e Vercel, com os mesmos cabeçalhos de segurança nas duas (`_headers` e `vercel.json`). Os arquivos de banco e testes ficam fora do pacote. Nenhum deploy foi realizado.

## Publicar (passo a passo)

Antes de publicar, rode no Supabase as migrações 001, 002 e 003 e crie o perfil de administrador do Emanuel (seção "Conectar ao Supabase").

Caminho mais simples, sem Git, pelo Netlify Drop:

1. Rode `npm run build` na pasta do projeto.
2. Entre em https://app.netlify.com/drop com a sua conta Netlify e arraste a pasta `dist/` para a página.
3. Copie o endereço que o Netlify criar, por exemplo `https://nome-aleatorio.netlify.app`. Em Site configuration, dá para trocar o nome ou ligar um domínio próprio.
4. No Supabase, em Authentication → URL Configuration:
   - Site URL: o endereço do passo 3.
   - Redirect URLs: `https://SEU-ENDERECO/**`. Mantenha `http://localhost:4173/**` só enquanto ainda testar no computador.
5. Abra o endereço publicado, entre com a conta do Emanuel e cadastre um cliente de teste. Envie o convite para você mesmo e confira o fluxo inteiro no celular: convite, ficha, plano, registro, comunidade.

Para atualizar depois, rode `npm run build` de novo e arraste a nova `dist/` em Deploys → "Drag and drop" no mesmo site.

Pela Vercel o resultado é o mesmo: `npx vercel` na pasta do projeto, que usa o `vercel.json`. Os passos 4 e 5 continuam valendo.

## Antes de produção

Ainda é necessário configurar e testar Auth, SMTP, Storage e redirecionamentos no Supabase real; publicar em hospedagem estática; revisar o texto de privacidade com a identificação e os contatos do responsável; definir retenção de dados e configurar/verificar backups. O arquivo `privacidade.html` é um modelo, não uma validação jurídica.

As tabelas principais usam `nutricionista_id` diretamente ou herdam a relação pela FK de cliente/plano. A associação `cliente_id` nos comentários permite aplicar RLS antes de consultar o alvo. A tabela adicional `arquivos` guarda referências a exames e fotos corporais; `modelos` e `configuracoes` armazenam preferências e estruturas reutilizáveis.

Sem credenciais fornecidas, nenhuma alteração foi aplicada a uma conta Supabase ou hospedagem externa.

## Calorias

O Emanuel informa as kcal de cada opção no editor do plano (e pode guardar no banco de alimentos). Nos campos vazios aparece uma sugestão em cinza calculada pela tabela TACO (`assets/js/calorias.js`), e o botão "Preencher kcal vazias pela TACO" usa essas sugestões. O cliente vê só os valores salvos: kcal de cada refeição, total do dia (faixa quando há "escolha 1") e, na tela Hoje, quanto já registrou. Combinações como "arroz + feijão" ou "atum ou tilápia" ficam sem sugestão. Os valores da TACO no código são uma lista curta de referência e devem ser conferidos pelo Emanuel.

## Instalar num projeto Supabase novo

Use `supabase/instalar_tudo.sql`: ele junta as migrações 001 a 005, torna administradora a única conta criada em Authentication e mostra uma verificação no fim (24 tabelas, bucket `saude` e 1 admin). Crie a conta do Emanuel antes de rodar. Se uma migração nova for criada, gere o arquivo de novo; o teste `tests/instalacao.test.mjs` avisa quando ele fica desatualizado.
