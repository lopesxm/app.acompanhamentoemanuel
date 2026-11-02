// Leituras do banco nesta sessão, só em memória: o que já foi visto aparece na hora e é conferido em segundo plano.
const CHECK_MS=15000,KEEP_MS=5*60*1000;
// A ordem das linhas pode variar entre consultas iguais: isso não conta como mudança.
const canonical=v=>Array.isArray(v)?v.map(r=>JSON.stringify(r)).sort().join('\n'):JSON.stringify(v);
export function readCache({now=Date.now,onChange=()=>{}}={}){
 const entries=new Map(),pending=new Map();let generation=0;
 function fetchFresh(key,load,notify){
  const gen=generation;
  const promise=Promise.resolve().then(load).then(value=>{
   // Se houve escrita enquanto a consulta estava no ar, a resposta pode estar velha: entrega, mas não guarda.
   if(gen!==generation)return value;
   const old=entries.get(key);entries.set(key,{value,at:now()});
   if(notify&&old&&canonical(old.value)!==canonical(value))onChange(key);
   return value;
  }).finally(()=>{if(pending.get(key)===promise)pending.delete(key);});
  pending.set(key,promise);return promise;
 }
 return {
  read(key,load,{useCache=true}={}){
   const entry=entries.get(key);
   if(useCache&&entry&&now()-entry.at<KEEP_MS){
    // Entre uma conferência e outra não vai ao banco, e uma nova renderização nunca dispara outra conferência em cascata.
    if(now()-entry.at>=CHECK_MS&&!pending.has(key))fetchFresh(key,load,true).catch(()=>{});
    return Promise.resolve(structuredClone(entry.value));
   }
   if(useCache&&pending.has(key))return pending.get(key).then(v=>structuredClone(v));
   return fetchFresh(key,load,false).then(v=>structuredClone(v));
  },
  has:key=>{const entry=entries.get(key);return Boolean(entry&&now()-entry.at<KEEP_MS);},
  clear(){generation++;entries.clear();pending.clear();},
 };
}
