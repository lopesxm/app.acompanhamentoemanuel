import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
async function walk(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]))).flat();}
// Um import sem versão criaria uma segunda cópia do módulo, guardada sem prazo no aparelho: as duas coisas quebram o app em silêncio.
test('build junta os estilos e versiona todo o código',async()=>{
 const output=execFileSync(process.execPath,['scripts/build.mjs'],{encoding:'utf8'});
 const version=output.match(/versão ([0-9a-f]{10})/)[1];
 const all=await walk('dist');
 assert.deepEqual(await readdir('dist/assets/css'),['app.css']);
 const css=await readFile('dist/assets/css/app.css','utf8');
 assert.deepEqual([...css.matchAll(/@import url\(['"]?([^'")]+)/g)].map(m=>m[1].split('?')[0]),['https://fonts.googleapis.com/css2'],'só a fonte externa continua como @import');
 assert.ok(css.startsWith('@import'),'o @import fica antes das regras');
 assert.ok(css.includes('--gs-gold:#C2AD88'),'o último arquivo importado entrou');
 assert.ok(css.indexOf('--gs-gold:#C2AD88')>css.indexOf('@keyframes page-in'),'a ordem dos arquivos é mantida');
 for(const f of all.filter(f=>f.endsWith('.js')&&!f.endsWith('taco-data.js'))){
  const text=await readFile(f,'utf8');
  for(const m of text.matchAll(/\b(?:from|import)\s*\(?\s*['"]((?:\.{1,2}|\/)[^'"]*\.js[^'"]*)['"]/g))assert.ok(m[1].endsWith('?v='+version),`${f}: ${m[1]}`);
 }
 for(const f of all.filter(f=>f.endsWith('.html'))){
  const text=await readFile(f,'utf8');
  for(const m of text.matchAll(/(?:src|href)="(\/assets\/(?:js|css)\/[^"]+)"/g))assert.ok(m[1].endsWith('?v='+version),`${f}: ${m[1]}`);
 }
 assert.equal((await readFile('dist/sw.js','utf8')).includes('?v='),false);
 const vercel=JSON.parse(await readFile('vercel.json','utf8'));
 const cache=source=>vercel.headers.find(h=>h.source===source).headers.find(h=>h.key==='Cache-Control').value;
 assert.equal(cache('/(.*)'),'no-cache','a página sempre confere se há versão nova');
 assert.match(cache('/assets/js/(.*)'),/immutable/);
 assert.match(cache('/assets/css/(.*)'),/immutable/);
 assert.ok(vercel.headers[0].headers.some(h=>h.key==='Content-Security-Policy'),'as regras de segurança continuam');
});
