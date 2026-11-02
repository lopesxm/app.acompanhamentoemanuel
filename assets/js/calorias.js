// As calorias salvas nos planos continuam sob revisão do profissional.
import {tacoCalories} from './taco-calories.js';
const key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const byName=new Map(tacoCalories.map(([name,kcal])=>[key(name),{name,kcal}]));
// "Arroz branco, tipo 1" é o nome de tela do "Arroz, tipo 1" da TACO.
export const tacoKey=s=>key(s).replace(/^arroz branco tipo ([12])\b/,'arroz tipo $1');
const MEDIDAS=new Set(['unidade','colher de sopa','fatia','porção','ml']);
const fromBank=(descricao,unidade,banco)=>banco.find(f=>f.nome===descricao&&f.kcal!=null&&f.kcal!==''&&Number.isFinite(Number(f.kcal))&&Number(f.kcal)>=0&&f.unidade===unidade&&Number(f.quantidade_padrao)>0);
const tacoHit=descricao=>{const hit=byName.get(tacoKey(descricao));return typeof hit?.kcal==='number'?hit:null;};
// Peso médio só onde a medida é bem padronizada. Nos outros casos quem informa é o Emanuel, na linha do alimento.
export function pesoReferencia(descricao,unidade){return unidade==='unidade'&&/^ovo de galinha inteiro\b/.test(key(descricao))?50:null;}
// A TACO é por 100 g: fora de gramas, a conta só existe com o peso de 1 medida.
export const precisaPeso=(descricao,unidade,banco=[])=>MEDIDAS.has(unidade)&&Boolean(tacoHit(descricao))&&!fromBank(descricao,unidade,banco);
export function sugerirKcal(descricao,quantidade,unidade,banco=[],pesoUnidade=null){
 const q=Number(quantidade);if(!descricao||!Number.isFinite(q)||q<=0)return null;
 const food=fromBank(descricao,unidade,banco);
 if(food)return {kcal:Math.round(Number(food.kcal)*q/Number(food.quantidade_padrao)),fonte:food.fonte||'banco',ref:food.nome};
 const hit=tacoHit(descricao);if(!hit)return null;
 if(unidade==='g')return {kcal:Math.round(hit.kcal*q/100),fonte:'TACO',ref:hit.name};
 if(!MEDIDAS.has(unidade))return null;
 const peso=Number(pesoUnidade)>0?Number(pesoUnidade):pesoReferencia(descricao,unidade);
 return peso?{kcal:Math.round(hit.kcal*q*peso/100),fonte:'TACO',ref:hit.name,peso}:null;
}
// O peso não é salvo no plano: ao reabrir, sai da kcal já gravada, pra quantidade continuar recalculando certo.
export function pesoImplicito(descricao,quantidade,unidade,kcal){
 const q=Number(quantidade),k=Number(kcal),hit=tacoHit(descricao);
 if(!hit||!MEDIDAS.has(unidade)||!(q>0)||!(k>0)||!(hit.kcal>0))return null;
 const peso=k*100/(q*hit.kcal);
 return peso>2000||peso<.5?null:peso>=10?Math.round(peso):Math.round(peso*10)/10;
}
// Kcal que destoa demais do peso médio é erro antigo (ex.: 4 kcal em 3 ovos): não vira peso, e o editor avisa da diferença.
export function pesoInicial(descricao,quantidade,unidade,kcal){
 const ref=pesoReferencia(descricao,unidade),implied=pesoImplicito(descricao,quantidade,unidade,kcal);
 if(implied==null)return ref;
 return ref&&(implied<ref*.5||implied>ref*1.5)?ref:implied;
}

const value=o=>o.kcal===''||o.kcal==null||!Number.isFinite(Number(o.kcal))?null:Number(o.kcal);
// Faixa da refeição: "escolha 1" soma a menor e a maior opção; "todos" soma tudo; "à vontade" não conta.
export function mealKcal(m){let min=0,max=0,missing=0;for(const g of m.grupos||[]){if(g.regra==='a_vontade')continue;const vals=(g.opcoes||[]).map(value);if(!vals.length)continue;if(vals.some(v=>v==null)){missing+=vals.filter(v=>v==null).length;continue;}if(g.regra==='escolher_1'){min+=Math.min(...vals);max+=Math.max(...vals);}else{const s=vals.reduce((a,b)=>a+b,0);min+=s;max+=s;}}return {min:Math.round(min),max:Math.round(max),complete:missing===0&&max>0,missing};}
export function planKcal(p){const meals=(p?.refeicoes||[]).map(mealKcal);return {min:meals.reduce((a,m)=>a+m.min,0),max:meals.reduce((a,m)=>a+m.max,0),complete:meals.length>0&&meals.every(m=>m.complete),missing:meals.reduce((a,m)=>a+m.missing,0)};}
// O que o cliente marcou como comido hoje, pelas opções escolhidas.
export function eatenKcal(plan,records){let total=0,complete=true;for(const r of records){if(r.status!=='comi')continue;const m=(plan?.refeicoes||[]).find(x=>x.id===r.refeicao_id);if(!m)continue;for(const g of m.grupos||[]){if(g.regra==='a_vontade')continue;const chosen=g.regra==='escolher_1'?g.opcoes.filter(o=>r.opcoes_escolhidas?.includes(o.id)):g.opcoes;for(const o of chosen){const v=value(o);if(v==null)complete=false;else total+=v;}}}return {kcal:Math.round(total),complete};}
export const fmtKcal=n=>Number(n).toLocaleString('pt-BR');
export const kcalText=({min,max})=>min===max?`${fmtKcal(min)} kcal`:`${fmtKcal(min)}–${fmtKcal(max)} kcal`;
