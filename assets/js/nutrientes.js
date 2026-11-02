import {tacoKey} from './calorias.js';
export const MACROS=[['proteina','Proteína','g'],['carboidratos','Carboidrato','g'],['lipideos','Gordura','g'],['fibra','Fibra','g']];
export const MICROS=[['sodio','Sódio','mg'],['potassio','Potássio','mg'],['calcio','Cálcio','mg'],['magnesio','Magnésio','mg'],['fosforo','Fósforo','mg'],['ferro','Ferro','mg'],['zinco','Zinco','mg'],['vitamina_c','Vitamina C','mg'],['colesterol','Colesterol','mg']];
const ALL=[...MACROS,...MICROS];
// Na TACO, Tr (traços) e NA (não se aplica) valem zero. Vazio ou * é "sem dado": nunca entra como zero na conta.
function perHundred(v){if(typeof v==='number')return v;const t=String(v??'').trim();return t==='Tr'||t==='NA'?0:null;}
export const tacoIndex=taco=>new Map(taco.map(f=>[tacoKey(f.nome),f]));
export function gramas(o){
 const q=Number(o.quantidade);if(!(q>0)||o.unidade==='a gosto')return null;
 if(o.unidade==='g')return q;
 const peso=Number(o.peso_unidade);return peso>0?q*peso:null;
}
// Nutrientes de uma opção do plano. Null quando o nome não está na TACO ou falta saber o peso.
export function optionNutrients(o,index){
 const food=index.get(tacoKey(o.descricao)),g=gramas(o);if(!food||g==null)return null;
 const out={};for(const [k] of ALL){const v=perHundred(food[k]);out[k]=v==null?null:v*g/100;}return out;
}
// Mesma regra das calorias: "escolher" vira faixa, "todos" soma, "à vontade" não conta.
export function mealNutrients(m,index){
 const out={};for(const [k] of ALL)out[k]={min:0,max:0,missing:0};
 for(const g of m.grupos||[]){
  if(g.regra==='a_vontade'||!g.opcoes?.length)continue;
  const rows=g.opcoes.map(o=>optionNutrients(o,index));
  for(const [k] of ALL){
   const known=rows.map(r=>r?.[k]??null).filter(v=>v!=null);out[k].missing+=rows.length-known.length;if(!known.length)continue;
   if(g.regra==='escolher_1'){out[k].min+=Math.min(...known);out[k].max+=Math.max(...known);}
   else{const sum=known.reduce((a,b)=>a+b,0);out[k].min+=sum;out[k].max+=sum;}
  }
 }
 return out;
}
export function planNutrients(p,index){
 const out={};for(const [k] of ALL)out[k]={min:0,max:0,missing:0};
 for(const m of p?.refeicoes||[]){const t=mealNutrients(m,index);for(const [k] of ALL){out[k].min+=t[k].min;out[k].max+=t[k].max;out[k].missing+=t[k].missing;}}
 return out;
}
export const fmtNutrient=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:n<10?1:0});
export function nutrientText({min,max},unit){
 const a=fmtNutrient(min),b=fmtNutrient(max);
 return (a===b?a:`${a}–${b}`)+' '+unit;
}
