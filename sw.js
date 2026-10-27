// Não armazenar fichas, respostas do Supabase ou arquivos de saúde em cache offline.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
