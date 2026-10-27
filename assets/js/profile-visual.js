import {rpc,upload,deleteFile,signedUrl,isDemo,profile,list} from './supabase.js';
import {escapeHTML as e} from './domain.js';
import {$,field,on,modal,toast} from './ui.js';

export async function readVisual(args={}) {
 return rpc('visual_perfil',args);
}
function picture(path,cls,alt){return path?`<img class="${cls}" data-visual-photo="${e(path)}" alt="${alt}">`:'';}
async function photos(root){await Promise.all([...root.querySelectorAll('[data-visual-photo]')].map(async img=>{try{img.src=await signedUrl(img.dataset.visualPhoto);}catch{img.remove();}}));}
export async function visualCard(root,args={},editable=false){
 if(!root)return;
 let data;
 try{data=await readVisual(args);}catch{root.innerHTML=editable?'<div class="notice">A personalização do perfil precisa da atualização do banco. Seus dados atuais continuam disponíveis.</div>':'';return;}

 if(!data){root.innerHTML='';return;}
 const initials=data.nome.split(' ').map(s=>s[0]).slice(0,2).join('');
 root.innerHTML=`<section class="card visual-profile"><div class="visual-profile-body"><div class="profile-head">${data.avatar?picture(data.avatar,'avatar big','Foto de perfil'):`<span class="avatar big">${e(initials)}</span>`}<div><h2>${e(data.nome)}</h2><p class="profile-bio">${e(data.bio||'')}</p></div></div>${editable&&data.meu?'<button class="button secondary" data-edit-visual>Editar foto e perfil</button>':''}</div></section>`;
 await photos(root);
 on($('[data-edit-visual]',root),'click',()=>edit(data,()=>visualCard(root,args,editable)));
}
async function edit(data,done){
 const d=modal('Personalizar perfil',`<form id="visual-form">${field('nome','Nome de exibição',data.nome,'text',{required:true})}${field('bio','Apresentação',data.bio,'textarea')}<p class="muted">Nome: até 40 caracteres. Apresentação: até 240. O perfil do paciente é visível ao nutricionista e aos seguidores aceitos quando a comunidade está ativa.</p>${['avatar'].map((key,i)=>`<div class="field"><label for="visual-${key}">${i?'Capa':'Foto de perfil'} (JPG, PNG ou WebP, até 10 MB)</label><input id="visual-${key}" type="file" name="${key}" accept="image/jpeg,image/png,image/webp"><img class="upload-preview" data-preview="${key}" alt="Prévia da imagem" hidden>${data[key]?`<label><input type="checkbox" name="remove-${key}"> Remover imagem atual</label>`:''}</div>`).join('')}<p class="muted">Escolha imagens que deseja mostrar no perfil. Fotos clínicas não são usadas automaticamente.</p><button class="button" type="submit">Salvar perfil</button></form>`);
 $('[name=nome]',d).maxLength=40;$('[name=bio]',d).maxLength=240;
 const urls=[];
 for(const key of ['avatar'])on($(`[name=${key}]`,d),'change',()=>{const file=$(`[name=${key}]`,d).files[0],img=$(`[data-preview=${key}]`,d);img.hidden=!file;if(file){validateImage(file);const url=URL.createObjectURL(file);urls.push(url);img.src=url;}});
 d.addEventListener('close',()=>urls.forEach(url=>URL.revokeObjectURL(url)),{once:true});
 on($('#visual-form',d),'submit',async()=>{
 const f=new FormData($('#visual-form',d)),p=await profile(),paths={},created=[];
 for(const key of ['avatar']){const file=f.get(key);if(file?.size)validateImage(file);}
 try{
 for(const key of ['avatar']){paths[key]=f.get('remove-'+key)?null:data[key];const file=f.get(key);if(file?.size){paths[key]=await upload('perfis/'+p.id,file);created.push(paths[key]);}}
 await rpc('salvar_visual',{p_nome:f.get('nome'),p_bio:f.get('bio'),p_avatar:paths.avatar,p_capa:null});
 }catch(err){await Promise.allSettled(created.map(deleteFile));throw err;}
 const old=['avatar','capa'].map(k=>data[k]).filter(path=>path&&!Object.values(paths).includes(path));
 const cleanup=await Promise.allSettled([...new Set(old)].map(deleteFile));
 d.close();toast(cleanup.some(x=>x.status==='rejected')?'Perfil salvo. Uma imagem antiga não pôde ser removida do armazenamento.':'Perfil atualizado.');await done();
 });
}
export function validateImage(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Escolha uma imagem JPG, PNG ou WebP.');if(file.size>10*1024*1024)throw Error('A imagem deve ter até 10 MB.');}
export async function authorPhotos(root,posts){
 const cache=new Map();
 await Promise.all(posts.map(async post=>{const a=post.autor;if(!a)return;const key=a.cliente_id||'emanuel';if(!cache.has(key))cache.set(key,readVisual(a.cliente_id?{cid:a.cliente_id}:{emanuel:true}).catch(()=>null));const v=await cache.get(key);if(!v)return;const card=[...root.querySelectorAll('[data-post]')].find(el=>el.dataset.post===post.id);if(!card)return;const name=card.querySelector('.post-author strong');if(name)name.textContent=v.nome;const av=card.querySelector('.post-author .avatar');if(av&&v.avatar){const img=document.createElement('img');img.className='avatar';img.alt='Foto de '+v.nome;img.dataset.visualPhoto=v.avatar;av.replaceWith(img);}}));await photos(root);
}
