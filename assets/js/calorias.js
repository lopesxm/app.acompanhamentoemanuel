// As calorias salvas nos planos continuam sob revisão do profissional.
import {tacoCalories} from './taco-calories.js';
const key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const byName=new Map(tacoCalories.map(([name,kcal])=>[key(name),{name,kcal}]));
export function sugerirKcal(descricao,quantidade,unidade,banco=[]){
 const q=Number(quantidade);if(!descricao||!Number.isFinite(q)||q<=0)return null;
 const food=banco.find(f=>f.nome===descricao&&f.kcal!=null&&f.kcal!==''&&Number.isFinite(Number(f.kcal))&&Number(f.kcal)>=0&&f.unidade===unidade&&Number(f.quantidade_padrao)>0);
 if(food)return {kcal:Math.round(Number(food.kcal)*q/Number(food.quantidade_padrao)),fonte:food.fonte||'banco',ref:food.nome};
 const hit=byName.get(key(descricao));
 // A TACO é por massa. Não inferir densidade nem peso de unidades/porções.
 if(!hit||unidade!=='g'||typeof hit.kcal!=='number')return null;
 return {kcal:Math.round(hit.kcal*q/100),fonte:'TACO',ref:hit.name};
}

const value=o=>o.kcal===''||o.kcal==null||!Number.isFinite(Number(o.kcal))?null:Number(o.kcal);
// Faixa da refeição: "escolha 1" soma a menor e a maior opção; "todos" soma tudo; "à vontade" não conta.
export function mealKcal(m){let min=0,max=0,missing=0;for(const g of m.grupos||[]){if(g.regra==='a_vontade')continue;const vals=(g.opcoes||[]).map(value);if(!vals.length)continue;if(vals.some(v=>v==null)){missing+=vals.filter(v=>v==null).length;continue;}if(g.regra==='escolher_1'){min+=Math.min(...vals);max+=Math.max(...vals);}else{const s=vals.reduce((a,b)=>a+b,0);min+=s;max+=s;}}return {min:Math.round(min),max:Math.round(max),complete:missing===0&&max>0,missing};}
export function planKcal(p){const meals=(p?.refeicoes||[]).map(mealKcal);return {min:meals.reduce((a,m)=>a+m.min,0),max:meals.reduce((a,m)=>a+m.max,0),complete:meals.length>0&&meals.every(m=>m.complete),missing:meals.reduce((a,m)=>a+m.missing,0)};}
// O que o cliente marcou como comido hoje, pelas opções escolhidas.
export function eatenKcal(plan,records){let total=0,complete=true;for(const r of records){if(r.status!=='comi')continue;const m=(plan?.refeicoes||[]).find(x=>x.id===r.refeicao_id);if(!m)continue;for(const g of m.grupos||[]){if(g.regra==='a_vontade')continue;const chosen=g.regra==='escolher_1'?g.opcoes.filter(o=>r.opcoes_escolhidas?.includes(o.id)):g.opcoes;for(const o of chosen){const v=value(o);if(v==null)complete=false;else total+=v;}}}return {kcal:Math.round(total),complete};}
export const fmtKcal=n=>Number(n).toLocaleString('pt-BR');
export const kcalText=({min,max})=>min===max?`${fmtKcal(min)} kcal`:`${fmtKcal(min)}–${fmtKcal(max)} kcal`;
