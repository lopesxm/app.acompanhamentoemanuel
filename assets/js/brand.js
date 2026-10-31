// Recortes de apresentação da arte original: preservam o desenho aprovado.
// Não são arquivos vetoriais mestres; a imagem permanece intacta.
const source='/assets/img/grinders-styleboard.png';
export const brandArt=(variant='horizontal')=>{
 const boxes={horizontal:'1282 176 234 59',vertical:'1007 132 220 145',symbol:'1061 132 101 91'};
 return `<svg class="grinders-art grinders-${variant}" viewBox="${boxes[variant]||boxes.horizontal}" role="img" aria-label="Grinders Society" focusable="false"><image href="${source}" width="1536" height="1024"/></svg>`;
};
export const brandLink=(href='/login.html')=>`<a class="brand grinders-brand" href="${href}" aria-label="Grinders Society — início">${brandArt('symbol')}${brandArt()}</a>`;
const boxes={treino:'70 589 76 54',nutricao:'216 589 54 54',energia:'362 587 51 56',mentalidade:'503 587 66 56',evolucao:'652 587 94 56',comunidade:'818 587 70 56'};
export const brandIcon=(name,cls='')=>`<svg class="ui-icon grinders-art ${cls}" viewBox="${boxes[name]}" aria-hidden="true" focusable="false"><image href="${source}" width="1536" height="1024"/></svg>`;
