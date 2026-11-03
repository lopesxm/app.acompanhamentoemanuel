// A TACO não tem suplementos. Estes valores são por 100 g e vêm de referências públicas, indicadas em "origem".
// Variam por marca e sabor: valem como ponto de partida, e quem fecha a conta é o rótulo do produto usado.
// Campo null é "sem dado": nunca entra como zero na conta.
const USDA_ROTULOS='Mediana de rótulos · USDA FoodData Central';
const OFF='Mediana de rótulos · Open Food Facts';
const USDA='USDA FoodData Central';
const DESPREZIVEL='Sem energia relevante na dose. Micronutrientes dependem da marca.';
const item=(numero,nome,porcao_g,medida_caseira,origem,busca,[kcal,proteina,carboidratos,lipideos,fibra,sodio,potassio=null,calcio=null,magnesio=null,fosforo=null,ferro=null,zinco=null,vitamina_c=null,colesterol=null])=>({id:'sup-'+numero,numero,nome,categoria:'Suplementos',quantidade_padrao:100,unidade:'g',fonte:'média de rótulos',origem,porcao_g,medida_caseira,busca:'suplemento '+busca,kcal,proteina,carboidratos,lipideos,fibra,sodio,potassio,calcio,magnesio,fosforo,ferro,zinco,vitamina_c,colesterol});
export const SUPLEMENTOS=[
 item(1001,'Whey protein, concentrado',30,'1 scoop',USDA_ROTULOS,'wpc proteina soro do leite',[394,73.5,8.3,8.1,0,500,423,497,null,null,0,null,null,206]),
 item(1002,'Whey protein, isolado',30,'1 scoop',USDA_ROTULOS,'wpi proteina soro do leite',[371,78.1,6.3,1.6,2.6,375,489,333,null,null,.5,null,null,17]),
 item(1003,'Whey protein, hidrolisado',30,'1 scoop',OFF,'wph proteina soro do leite',[371,80,6.3,2,0,311.5]),
 item(1004,'Whey protein, blend 3W',30,'1 scoop',OFF,'3w proteina soro do leite',[382,72.7,8.6,5.4,1.8,266.7]),
 item(1005,'Caseína micelar',30,'1 scoop',OFF,'proteina leite noturna',[362,77,7.1,1.7,2.6,264]),
 item(1006,'Albumina, em pó',30,'1 scoop',OFF,'proteina clara de ovo',[342,78.6,6.9,.3,.4,775.5]),
 item(1007,'Proteína de ervilha, em pó',30,'1 scoop',OFF,'vegana vegetal',[395.6,79,4,5.5,1.3,760]),
 item(1008,'Proteína de soja, isolada, em pó',30,'1 scoop',USDA,'vegana vegetal',[335,88.3,0,3.4,0,1000,81,178,39,776,14.5,4,0,0]),
 item(1009,'Colágeno hidrolisado, em pó',10,'1 dosador',USDA,'proteina gelatina',[335,85.6,0,.1,0,196,16,55,22,39,1.1,.1,0,0]),
 item(1010,'Barra de proteína',45,'1 barra',OFF,'barrinha proteica',[376.8,30.3,29.8,12,6.8,124]),
 item(1011,'Hipercalórico, em pó',160,'1 porção do rótulo',OFF,'massa gainer',[386.3,9.4,83.8,1,.6,132.8]),
 item(1012,'Maltodextrina, em pó',50,'1 porção do rótulo',OFF,'carboidrato malto',[384,0,95,0,0,null]),
 item(1013,'Dextrose, em pó',30,'1 scoop',OFF,'carboidrato glicose',[368,0,90,0,null,null]),
 item(1014,'Creatina, monohidratada',3,'1 dosador',OFF,'',[0,0,0,0,0,0]),
 item(1015,'BCAA, em pó',5,'1 dosador',OFF,'aminoacido',[372,69.5,3.9,0,null,null]),
 item(1016,'Glutamina, em pó',5,'1 dosador',OFF,'aminoacido',[392,96,0,0,null,null]),
 item(1017,'Pré-treino, em pó',10,'1 dosador',OFF,'pre workout',[124,0,19.5,0,null,121.2]),
 item(1018,'Ômega 3, óleo de peixe',1,'1 cápsula',USDA,'omega capsula',[902,0,0,100,0,0,0,0,0,0,0,0,0,521]),
 item(1019,'Beta-alanina, em pó',3,'1 dosador',DESPREZIVEL,'aminoacido',[0,0,0,0,0,null]),
 item(1020,'Cafeína, anidra',.2,'1 cápsula',DESPREZIVEL,'capsula termogenico',[0,0,0,0,0,null]),
 item(1021,'Multivitamínico',1,'1 cápsula',DESPREZIVEL,'vitaminas minerais capsula',[0,0,0,0,0,null]),
];
