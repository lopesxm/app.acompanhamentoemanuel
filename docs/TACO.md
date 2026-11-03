# Catálogo TACO

597 alimentos da Tabela Brasileira de Composição de Alimentos, NEPA/Unicamp, 4ª edição ampliada e revisada (2011).

Fonte oficial: https://nepa.unicamp.br/publicacoes/tabela-taco-excel/

O catálogo é distribuído com o aplicativo e fica disponível a todos os profissionais autorizados a acessar o Banco de alimentos e o editor de planos. Não exige importação SQL. Os alimentos personalizados continuam no Supabase, sujeitos às permissões existentes. A referência TACO não pode ser editada ou excluída pela interface.

Os valores são por 100 g de parte comestível. A planilha original e sua precisão são preservadas em `assets/js/taco-data.js`; a interface arredonda apenas para apresentação. Células vazias, “Tr” e “NA” não são convertidas em zero. A consulta compacta de energia é gerada da mesma fonte.

No editor, selecione o nome completo, incluindo o preparo. Sugestões por palavras genéricas foram removidas para evitar confundir alimentos crus e cozidos. Não há conversão automática de massa para volume, unidades ou medidas caseiras. Calorias já salvas nos planos não são recalculadas.

Para atualizar, baixe a planilha oficial e execute (Python com openpyxl):

```powershell
python scripts/import-taco.py caminho/planilha.xlsx
node --test tests/taco.test.mjs
```

O importador exige os 597 códigos e registra o SHA256 da planilha no arquivo gerado. Mudanças de edição exigem revisão do importador e dos testes.

## Suplementos

A TACO não tem suplementos. Whey, creatina e outros ficam em `assets/js/suplementos.js`, separados da tabela oficial, e entram na busca, na kcal e nos nutrientes do editor junto com ela. A origem de cada item fica no campo `origem`:

- Mediana de rótulos do USDA FoodData Central (produtos de marca), mediana de rótulos do Open Food Facts ou registro do USDA FoodData Central.
- Beta-alanina, cafeína e multivitamínico não têm base consultada: entram sem energia relevante na dose e sem micronutrientes, porque dependem da marca.

Valores mudam por marca e sabor, então são ponto de partida. Campo `null` é "sem dado" e nunca vira zero. A porção (`porcao_g`) é a quantidade inicial no editor e não é recomendação de dose. Marca específica deve ser cadastrada em Alimentos personalizados, com os valores do rótulo.
