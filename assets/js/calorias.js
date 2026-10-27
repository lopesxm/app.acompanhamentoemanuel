// Calorias do plano. Os valores que o cliente vê são sempre os salvos pelo Emanuel em cada opção;
// a tabela TACO só aparece como sugestão no editor, e ele decide usar ou não.

// kcal por 100 g (ou 100 ml) da TACO, 4ª ed. Ordem importa: o mais específico vem antes ("doce de leite" antes de "leite").
// porUnidade: peso médio em gramas para sugerir quando a unidade é "unidade".
const TACO=[
 [['doce','leite'],306,'Doce de leite cremoso'],
 [['leite','desnatado'],35,'Leite desnatado'],
 [['leite'],61,'Leite integral'],
 [['iogurte','desnatado'],41,'Iogurte natural desnatado'],
 [['iogurte'],51,'Iogurte natural'],
 [['arroz','integral'],124,'Arroz integral cozido'],
 [['arroz'],128,'Arroz tipo 1 cozido'],
 [['feijao','preto'],77,'Feijão preto cozido'],
 [['feijao'],76,'Feijão carioca cozido'],
 [['batata','doce'],77,'Batata-doce cozida'],
 [['batata'],52,'Batata inglesa cozida'],
 [['mandioca'],125,'Mandioca cozida'],
 [['cuscuz'],113,'Cuscuz de milho cozido'],
 [['aveia'],394,'Aveia em flocos'],
 [['pao','frances'],300,'Pão francês',50],
 [['ovo','frito'],240,'Ovo frito',50],
 [['ovo'],146,'Ovo cozido',50],
 [['frango'],159,'Peito de frango sem pele grelhado'],
 [['carne','moida'],212,'Carne moída (acém) cozida'],
 [['patinho'],219,'Patinho grelhado'],
 [['carne'],194,'Carne bovina magra cozida'],
 [['atum'],166,'Atum em conserva'],
 [['banana'],98,'Banana prata'],
 [['maca'],56,'Maçã com casca'],
 [['mamao'],40,'Mamão papaia'],
 [['laranja'],37,'Laranja pera'],
 [['queijo','minas'],264,'Queijo minas frescal'],
 [['mussarela'],330,'Queijo mussarela'],
 [['requeijao'],257,'Requeijão cremoso'],
 [['azeite'],884,'Azeite de oliva'],
 [['manteiga'],726,'Manteiga'],
 [['cafe'],9,'Café (infusão)'],
];
const words=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
const has=(list,key)=>list.some(w=>w===key||w===key+'s'||w===key+'es');

// Sugestão para uma opção. Combinações ("arroz + feijão", "atum ou tilápia", "café com leite") ficam sem sugestão:
// não dá pra saber a proporção, e o Emanuel preenche.
export function sugerirKcal(descricao,quantidade,unidade,banco=[]){
 const q=Number(quantidade);if(!descricao||!(q>0))return null;
 const food=banco.find(f=>f.nome===descricao&&Number(f.kcal)>0&&f.unidade===unidade&&Number(f.quantidade_padrao)>0);
 if(food)return {kcal:Math.round(Number(food.kcal)*q/Number(food.quantidade_padrao)),fonte:'banco',ref:food.nome};
 if(/\+|\bou\b|\bcom\b/i.test(String(descricao).normalize('NFD').replace(/[̀-ͯ]/g,'')))return null;
 const w=words(descricao),hit=TACO.find(([keys])=>keys.every(k=>has(w,k)));if(!hit)return null;
 const [, per100,ref,porUnidade]=hit;
 const grams=unidade==='g'||unidade==='ml'?q:unidade==='unidade'&&porUnidade?q*porUnidade:null;
 return grams?{kcal:Math.round(per100*grams/100),fonte:'TACO',ref}:null;
}

const value=o=>o.kcal===''||o.kcal==null||!Number.isFinite(Number(o.kcal))?null:Number(o.kcal);
// Faixa da refeição: "escolha 1" soma a menor e a maior opção; "todos" soma tudo; "à vontade" não conta.
export function mealKcal(m){let min=0,max=0,missing=0;for(const g of m.grupos||[]){if(g.regra==='a_vontade')continue;const vals=(g.opcoes||[]).map(value);if(!vals.length)continue;if(vals.some(v=>v==null)){missing+=vals.filter(v=>v==null).length;continue;}if(g.regra==='escolher_1'){min+=Math.min(...vals);max+=Math.max(...vals);}else{const s=vals.reduce((a,b)=>a+b,0);min+=s;max+=s;}}return {min:Math.round(min),max:Math.round(max),complete:missing===0&&max>0,missing};}
export function planKcal(p){const meals=(p?.refeicoes||[]).map(mealKcal);return {min:meals.reduce((a,m)=>a+m.min,0),max:meals.reduce((a,m)=>a+m.max,0),complete:meals.length>0&&meals.every(m=>m.complete),missing:meals.reduce((a,m)=>a+m.missing,0)};}
// O que o cliente marcou como comido hoje, pelas opções escolhidas.
export function eatenKcal(plan,records){let total=0,complete=true;for(const r of records){if(r.status!=='comi')continue;const m=(plan?.refeicoes||[]).find(x=>x.id===r.refeicao_id);if(!m)continue;for(const g of m.grupos||[]){if(g.regra==='a_vontade')continue;const chosen=g.regra==='escolher_1'?g.opcoes.filter(o=>r.opcoes_escolhidas?.includes(o.id)):g.opcoes;for(const o of chosen){const v=value(o);if(v==null)complete=false;else total+=v;}}}return {kcal:Math.round(total),complete};}
export const fmtKcal=n=>Number(n).toLocaleString('pt-BR');
export const kcalText=({min,max})=>min===max?`${fmtKcal(min)} kcal`:`${fmtKcal(min)}–${fmtKcal(max)} kcal`;
