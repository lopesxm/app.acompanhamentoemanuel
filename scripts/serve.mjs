import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+path.sep)||pathname.split('/').some(x=>x.startsWith('.'))||!['.html','.js','.css','.json','.svg','.png'].includes(path.extname(file))) {res.writeHead(403);res.end();return;}
 const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(body);
}catch{res.writeHead(404);res.end('Página não encontrada');}});// HOST=0.0.0.0 abre para outros aparelhos da mesma rede Wi-Fi (prévia no celular).
const port=Number(process.env.PORT)||4173,host=process.env.HOST||'127.0.0.1';server.listen(port,host,()=>console.log(`Sistema disponível em http://localhost:${port}`));
