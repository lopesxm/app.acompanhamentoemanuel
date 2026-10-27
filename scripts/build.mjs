import {cp,mkdir,copyFile,readdir} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const name of ['admin','app','assets'])await cp(name,`dist/${name}`,{recursive:true});
for(const name of await readdir('.'))if(name.endsWith('.html')||['manifest.json','sw.js','_headers'].includes(name))await copyFile(name,`dist/${name}`);
console.log('Site estático pronto em dist/. Nenhum SQL, teste ou dependência foi incluído.');
