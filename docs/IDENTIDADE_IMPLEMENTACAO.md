# Grinders Society — implementação do brand book v1

## Aplicado no aplicativo
- Sora 600/700/800 em títulos e métricas, Inter nos textos e controles.
- Tokens oficiais: preto #0B0B0B, off-white #E6E1D9, cinza #9A9A9A, charcoal #3A3A3A e marrom #6B5E4E.
- Superfícies #171717, campos #151515, bordas #303030 e elementos elevados #202020.
- Botões com altura mínima de 48px, cards 14px, campos 10px e modais 16px. Avatares circulares.
- Cor marrom reservada a detalhes institucionais. Indicadores e ações principais em off-white.
- Variante clara preservada. Texto secundário e placeholders usam cinza com contraste maior que #707070 para manter leitura.
- The Grind e The Society com explicações em português. Login com assinatura principal.

## Preservado
- Logo e ícones de instalação existentes, até aprovação do mestre GS vetorial.
- Rotas, dados, permissões, prescrições e funcionalidades atuais.
- Rótulos funcionais em português. Não inserir Training na navegação sem um módulo de treino funcional.
- Erros e ações destrutivas com cores semânticas, não apenas tons neutros.

## Próximas entregas
1. Refinar e vetorizar o GS e lettering; submeter o desenho mestre antes de substituir logo, favicon e ícones PWA.
2. Exportar variantes SVG, PDF vetorial e PNG após aprovação.
3. Implementar treinamento, metas pessoais, hábitos e desafios persistentes em etapas próprias, com validação de permissões e dados.
4. Selecionar fotografias autorizadas para campanhas e onboarding. O styleboard é referência, não arquivo final de logo ou fotografia.
5. Website institucional, redes sociais, materiais físicos e selo da Society em projetos próprios.

## Componentes e responsividade
Os tokens e acabamentos estão em assets/css/editorial.css. Os componentes existentes (card, button, field, avatar, modal, client-row e society-sections) compartilham essa base. A lista de clientes vira cards até 1000px; áreas da Society passam de três para duas colunas até 650px. Os formulários mantêm labels e foco visível.
