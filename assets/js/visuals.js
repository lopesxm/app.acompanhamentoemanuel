// Ilustrações decorativas e ícones locais: nenhum dado ou imagem de cliente.
const paths={
 medal:'<path d="m7 3 5 7 5-7M4 3h5l3 4 3-4h5l-6 9h-4Z"/><circle cx="12" cy="16" r="6"/><path d="m12 13 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L9 15.3l2-.3Z"/>',
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
 plus:'<path d="M12 5v14M5 12h14"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 logout:'<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5m5-12 4 4-4 4m4-4H10"/>',
 whatsapp:'<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7Z"/><path d="M9.5 9c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2Z"/>'
};
// Ícones da marca (design/grinders-v1/icons), desenhados em 32 x 32.
const brand32={plate:'<path d="M5 3v8c0 4 8 4 8 0V3M9 3v26M25 3c-5 3-7 9-7 15h7M25 3v26"/>',people:'<circle cx="16" cy="8" r="4"/><circle cx="5" cy="12" r="3"/><circle cx="27" cy="12" r="3"/><path d="M9 29v-6a7 7 0 0 1 14 0v6ZM2 29v-7a5 5 0 0 1 5-5m23 12v-7a5 5 0 0 0-5-5M2 29h5m18 0h5"/>',chart:'<path d="m2 26 8-13 4 6M8 26 17 6l13 20M12 18l5 4 5-8"/>',spark:'<path d="m19 2-13 17h9l-2 11 13-18h-9z"/>',treino:'<path d="M3 10v12m4-16v20m4-23v26m10-26v26m4-23v20m4-16v12M11 13h10M11 19h10M3 13H1v6h2m26-6h2v6h-2"/>',mentalidade:'<path d="M16 7c-3-7-10-3-9 2-6 1-6 9-3 11-2 6 5 11 9 8 2 0 3-2 3-4V7Zm0 0c3-7 10-3 9 2 6 1 6 9 3 11 2 6-5 11-9 8-2 0-3-2-3-4M7 9l3 3m-6 8 5-2m4 10-2-5m14-14-3 3m6 8-5-2m-4 10 2-5"/>'};
export const icon=(name,cls='')=>`<svg class="ui-icon ${cls}" viewBox="${brand32[name]?'0 0 32 32':'0 0 24 24'}" fill="none" stroke="currentColor" stroke-width="${brand32[name]?2.2:1.65}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${brand32[name]||paths[name]||paths.leaf}</svg>`;
export function mealVisual(name,time){const n=name.toLowerCase();const kind=/café|cafe|desjejum/.test(n)?'breakfast':/lanche|pré|pós/.test(n)?'snack':/jantar|ceia/.test(n)||Number(time?.slice(0,2))>=18?'dinner':'lunch';return `<span class="meal-art ${kind}" aria-hidden="true"><img src="/assets/img/${kind}.svg" alt="" width="80" height="80" loading="lazy"></span>`;}
export const heroArt=()=>'<div class="hero-art" aria-hidden="true"><span class="hero-orbit orbit-one"></span><span class="hero-orbit orbit-two"></span><img src="/assets/img/nutrition-garden.svg" alt="" width="280" height="210"><span class="floating-leaf">'+icon('leaf')+'</span></div>';
