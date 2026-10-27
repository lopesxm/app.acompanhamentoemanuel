import {writeFile,mkdir} from 'node:fs/promises';
const pages={'index':'index','login':'login','convite':'convite','redefinir-senha':'redefinir-senha','privacidade':'privacidade','admin/index':'dashboard','admin/clientes':'clientes','admin/cliente':'cliente','admin/alimentos':'alimentos','admin/modelos':'modelos','admin/comunidade':'comunidade-admin','app/hoje':'hoje','app/plano':'plano','app/registrar':'registrar','app/evolucao':'evolucao','app/ficha':'ficha','app/comunidade':'comunidade','app/perfil':'perfil'};
for(const [path,page] of Object.entries(pages)){
 const module=path.startsWith('admin/')?'admin':path.startsWith('app/')?'client':'auth';
 const wrapper=`assets/js/${path.replace('/','-')}.js`;
 await mkdir('assets/js',{recursive:true});
 // Public auth route names collide with no shared module names.
 const script=module==='auth'?'/assets/js/auth.js':`/${wrapper}`;
 if(module!=='auth')await writeFile(wrapper,`import { boot } from './${module}.js';\nboot('${page}');\n`);
 await writeFile(`${path}.html`,`<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#008060"><meta name="description" content="Acompanhamento nutricional com Emanuel. Ficha, plano alimentar e evolução em um só lugar."><title>Emanuel · Nutrição</title><link rel="icon" href="/assets/img/icon.svg" type="image/svg+xml"><link rel="manifest" href="/manifest.json"><script src="/assets/js/theme.js"></script><link rel="stylesheet" href="/assets/css/app.css"></head><body data-page="${page}"><main class="loading" role="status">Só um segundo…</main><noscript>Ativa o JavaScript pra usar o app.</noscript><script type="module" src="${script}"></script><script src="/assets/js/pwa.js" defer></script></body></html>\n`);
}
