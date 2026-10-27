import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
async function walk(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).filter(x=>!['.git','node_modules'].includes(x.name)).map(async x=>x.isDirectory()?walk(path.join(dir,x.name)):path.join(dir,x.name)))).flat();}
const files=await walk('.');let count=0;
for(const f of files){if(/\.(m?js)$/.test(f)){execFileSync(process.execPath,['--check',f],{stdio:'pipe'});count++;
 // $() devolve um elemento só; laços sobre vários elementos precisam de $$().
 if(f.startsWith(path.join('assets','js'))&&/(^|[^$\w])\$\([^()]*\)\.forEach/.test(await readFile(f,'utf8')))throw Error(`Use $$() em vez de $() antes de .forEach em ${f}`);}if(f.endsWith('.html')){const html=await readFile(f,'utf8');for(const [,ref]of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)){if(!files.includes(path.normalize(ref.slice(1))))throw Error(`Referência ausente em ${f}: ${ref}`);}}}
console.log(`${count} módulos JavaScript válidos; referências locais das páginas verificadas.`);
