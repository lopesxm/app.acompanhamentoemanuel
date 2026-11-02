import {cp,mkdir,copyFile,readdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const name of ['admin','app','assets'])await cp(name,`dist/${name}`,{recursive:true});
for(const name of await readdir('.'))if(name.endsWith('.html')||['manifest.json','sw.js','_headers'].includes(name))await copyFile(name,`dist/${name}`);
async function walk(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]))).flat();}
// Estilos num arquivo só: os @import em cascata viravam 13 pedidos em fila antes da tela aparecer.
const remote=new Set();
async function inline(file){
 const css=await readFile(file,'utf8');
 const parts=[];let last=0;
 for(const m of css.matchAll(/@import url\((['"])(.+?)\1\);?/g)){
  parts.push(css.slice(last,m.index));last=m.index+m[0].length;
  if(/^https?:/.test(m[2]))remote.add(m[0]);else parts.push(await inline(path.join(path.dirname(file),m[2])));
 }
 parts.push(css.slice(last));
 return parts.join('');
}
const bundle=await inline('dist/assets/css/app.css');
for(const f of await readdir('dist/assets/css'))await rm(path.join('dist/assets/css',f));
await writeFile('dist/assets/css/app.css',[...remote].join('\n')+'\n'+bundle);
// Cada deploy ganha uma versão nos endereços. Assim o aparelho guarda os arquivos sem prazo e nunca mistura código novo com antigo.
const files=(await walk('dist')).filter(f=>/\.(js|css|html)$/.test(f)).sort();
const hash=createHash('sha256');
for(const f of files)hash.update(f.replaceAll('\\','/')).update(await readFile(f));
const version=hash.digest('hex').slice(0,10);
for(const f of files){
 if(f==='dist'+path.sep+'sw.js')continue;
 const text=await readFile(f,'utf8');let out=text;
 if(f.endsWith('.js'))out=text.replace(/(\b(?:from|import)\s*\(?\s*['"])(\.{1,2}\/[^'"]+?\.js)(['"])/g,`$1$2?v=${version}$3`);
 if(f.endsWith('.html'))out=text.replace(/((?:src|href)=")(\/assets\/(?:js|css)\/[^"?#]+)(")/g,`$1$2?v=${version}$3`);
 if(out!==text)await writeFile(f,out);
}
console.log(`Site estático pronto em dist/ (versão ${version}). Nenhum SQL, teste ou dependência foi incluído.`);
