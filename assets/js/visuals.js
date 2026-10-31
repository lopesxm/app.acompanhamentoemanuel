import {brandIcon} from './brand.js';
// Ilustrações decorativas e ícones locais: nenhum dado ou imagem de cliente.
const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="11" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="18" width="7" height="3" rx="1"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
 leaf:'<path d="M20 3C10 2 3 7 4 14a6 6 0 0 0 9 6C20 17 21 10 20 3ZM4 21 16 8"/>',
 plan:'<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6m-6 5h6"/>',
 record:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4m-4 5v6m-3-3h6"/>',
 chart:'<path d="M4 3v17h17M8 14l4-5 4 3 5-7"/>',
 heart:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 4 1 10 8 15 7-5 12-11 8-15Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 check:'<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="10"/>',
 plate:'<circle cx="12" cy="12" r="5"/><path d="M2 3v6m3-6v6M2 6h3m-1.5 3v12M21 3v18m0-18c-4 3-4 8 0 8"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
 camera:'<path d="M8 5 9 3h6l1 2h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',
 chat:'<path d="M21 11a9 9 0 0 1-9 9H3l1-5a9 9 0 1 1 17-4Z"/><path d="M8 10h8m-8 4h5"/>',
 scale:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7 8a7 7 0 0 1 10 0l-2 4H9Zm5-2v3"/>',
 moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
 tick:'<path d="m5 12.5 4.5 4.5L19 7"/>',
 folder:'<path d="M3 7V4h6l2 3h10v13H3Z"/>',
 bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 whatsapp:'<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7Z"/><path d="M9.5 9c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2Z"/>'
};
const branded={plate:'nutricao',people:'comunidade',chart:'evolucao',spark:'energia',treino:'treino',mentalidade:'mentalidade'};
export const icon=(name,cls='')=>branded[name]?brandIcon(branded[name],cls):`<svg class="ui-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]||paths.leaf}</svg>`;
export function mealVisual(name,time){const n=name.toLowerCase();const kind=/café|cafe|desjejum/.test(n)?'breakfast':/lanche|pré|pós/.test(n)?'snack':/jantar|ceia/.test(n)||Number(time?.slice(0,2))>=18?'dinner':'lunch';return `<span class="meal-art ${kind}" aria-hidden="true"><img src="/assets/img/${kind}.svg" alt="" width="80" height="80" loading="lazy"></span>`;}
export const heroArt=()=>'<div class="hero-art" aria-hidden="true"><span class="hero-orbit orbit-one"></span><span class="hero-orbit orbit-two"></span><img src="/assets/img/nutrition-garden.svg" alt="" width="280" height="210"><span class="floating-leaf">'+icon('leaf')+'</span></div>';
