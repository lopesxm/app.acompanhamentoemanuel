// Entrada suave uma vez por conteúdo; sem animar de novo cartões recriados.
export function initMotion(){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),seen=new Set(),watched=new WeakSet();
 const selector='#content > .card, #content > .week-strip, #content > .quick-records, #content > .section-heading, #content > .notice, .post, .timeline article';
 const key=el=>el.dataset.post||el.dataset.meal||el.dataset.event||el.className+'|'+(el.querySelector('h2,h3')?.textContent||el.textContent.slice(0,65));
 const visible=new IntersectionObserver(entries=>{let order=0;for(const entry of entries){if(!entry.isIntersecting)continue;const el=entry.target;visible.unobserve(el);const id=key(el);if(seen.has(id))continue;seen.add(id);if(reduce.matches||!el.animate)continue;el.animate([{opacity:.35,transform:'translateY(9px)'},{opacity:1,transform:'none'}],{duration:650,delay:Math.min(order++*55,110),easing:'cubic-bezier(.22,1,.36,1)'});}},{threshold:.08});
 const scan=node=>{if(node.nodeType!==1)return;const candidates=[...(node.matches(selector)?[node]:[]),...node.querySelectorAll(selector)];for(const el of candidates){if(watched.has(el))continue;watched.add(el);if(!seen.has(key(el)))visible.observe(el);}};
 const content=document.querySelector('#content');if(!content)return;
 const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)scan(node);});
 observer.observe(content,{childList:true,subtree:true});scan(content);
 reduce.addEventListener('change',()=>{if(reduce.matches)content.getAnimations({subtree:true}).forEach(a=>a.cancel());});
 addEventListener('pagehide',()=>{observer.disconnect();visible.disconnect();},{once:true});
}
