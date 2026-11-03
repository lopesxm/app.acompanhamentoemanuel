import {icon} from './visuals.js';
import {escapeHTML as e} from './domain.js';
const states={
 ficha:['plan','Ficha pendente','wait'],
 waiting:['clock','Aguardando o plano','wait'],
 scheduled:['plan','Plano publicado','ready'],
 meal:['plate','Plano em andamento','active'],
 done:['check','Tudo registrado hoje','done']
};
// A etapa da ficha vem do que já foi salvo: etapa_atual conta as etapas concluídas.
function fichaProgress(done,total){
 if(!total||!(done>0))return '';
 const current=Math.min(done+1,total);
 return `<div class="next-step-progress"><span>Etapa ${current} de ${total}</span><progress max="${total}" value="${done}" aria-label="Etapas da ficha concluídas"></progress></div>`;
}
export function nextStepCard(step,{startDate='',fichaDone=0,fichaTotal=0}={}){
 const [glyph,status,tone]=states[step.kind]||states.waiting;
 const detail=step.kind==='scheduled'&&startDate?`Início do plano: ${startDate}`:step.kind==='meal'&&step.meal?.horario?`Horário no plano: ${step.meal.horario}`:'';
 const label=step.kind==='ficha'&&fichaDone>0?'Continuar de onde parei':step.label;
 return `<section class="card start-focus next-step-card is-${tone}" aria-labelledby="next-step-title"><header class="next-step-top"><span class="next-step-icon" aria-hidden="true">${icon(glyph)}</span><span class="next-step-status"><i aria-hidden="true"></i>${status}</span></header><div class="next-step-copy"><span class="next-step-eyebrow">Seu próximo passo</span><h2 id="next-step-title">${e(step.title)}</h2><p>${e(step.text)}</p>${detail?`<span class="next-step-detail">${icon('clock')}${e(detail)}</span>`:''}${step.kind==='ficha'?fichaProgress(fichaDone,fichaTotal):''}</div><a class="button next-step-button" href="${e(step.href)}"><span>${e(label)}</span>${icon('arrow')}</a></section>`;
}
