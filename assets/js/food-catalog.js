import {TACO} from './taco-data.js';
import {escapeHTML as e} from './domain.js';
export {TACO};
export const normalizeFood=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterFoods(query='',category=''){
 const terms=normalizeFood(query).split(/\s+/).filter(Boolean);
 return TACO.filter(f=>(!category||f.categoria===category)&&terms.every(t=>normalizeFood(f.nome).includes(t)));
}
const fmt=v=>v==null?'Não informado':typeof v==='number'?v.toLocaleString('pt-BR',{maximumFractionDigits:2}):v;
export function tacoBrowser(host){
 host.innerHTML=`<section class="card"><h2>TACO · 597 alimentos</h2><p>Referência para toda a equipe. Valores por 100 g de parte comestível.</p><div class="form-grid"><label>Buscar alimento<input data-taco-search type="search" placeholder="Ex.: arroz integral cozido"></label><label>Categoria<select data-taco-category><option value="">Todas as categorias</option>${[...new Set(TACO.map(f=>f.categoria))].map(c=>`<option>${e(c)}</option>`).join('')}</select></label></div><p data-taco-count role="status"></p><div data-taco-results></div><div class="row"><button type="button" class="button secondary" data-taco-prev>Anterior</button><span data-taco-page></span><button type="button" class="button secondary" data-taco-next>Próxima</button></div><small>Tr: traços · NA: não aplicável · Não informado: célula vazia na fonte. <a href="https://nepa.unicamp.br/publicacoes/tabela-taco-excel/" target="_blank" rel="noopener">Fonte: NEPA/Unicamp · TACO, 4ª edição</a></small></section>`;
 let page=0;
 const q=s=>host.querySelector(s);
 const render=()=>{
 const rows=filterFoods(q('[data-taco-search]').value,q('[data-taco-category]').value),pages=Math.max(1,Math.ceil(rows.length/20));
 page=Math.min(page,pages-1);
 q('[data-taco-count]').textContent=`${rows.length} alimentos encontrados`;
 q('[data-taco-results]').innerHTML=rows.slice(page*20,page*20+20).map(f=>`<details style="padding:16px 0;border-top:1px solid var(--border)"><summary><strong>${e(f.nome)}</strong> <small>· ${e(fmt(f.kcal))} kcal / 100 g</small></summary><p>${e(f.categoria)} · TACO #${f.numero}</p><dl class="form-grid">${Object.entries({kcal:'Energia (kcal)',proteina:'Proteínas (g)',carboidratos:'Carboidratos (g)',lipideos:'Lipídeos (g)',fibra:'Fibra alimentar (g)',sodio:'Sódio (mg)',calcio:'Cálcio (mg)',ferro:'Ferro (mg)',potassio:'Potássio (mg)',colesterol:'Colesterol (mg)',magnesio:'Magnésio (mg)',fosforo:'Fósforo (mg)',zinco:'Zinco (mg)',vitamina_c:'Vitamina C (mg)'}).map(([key,label])=>`<div><dt>${label}</dt><dd style="margin:4px 0">${e(fmt(f[key]))}</dd></div>`).join('')}</dl></details>`).join('')||'<p>Nenhum alimento encontrado. Tente outro termo ou categoria.</p>';
 q('[data-taco-page]').textContent=`${page+1} / ${pages}`;
 q('[data-taco-prev]').disabled=page===0;q('[data-taco-next]').disabled=page===pages-1;
 };
 for(const selector of ['[data-taco-search]','[data-taco-category]'])q(selector).addEventListener('input',()=>{page=0;render();});
 q('[data-taco-prev]').addEventListener('click',()=>{page--;render();});
 q('[data-taco-next]').addEventListener('click',()=>{page++;render();});
 render();
}
