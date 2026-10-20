const CACHE='recomp-shell-v2.5.1-guest-first';
const CORE=['./','./index.html','./styles.css','./app.js','./food-db.js','./nutrition-v2.js','./nutrition-v2.css','./meal-planner.js','./meal-planner.css','./nav-capsule.css','./recipe-estimates.js','./health-connect.js','./first-run.js','./first-run.css','./premium.css','./db.js','./cloud.js'];
const FONT_CACHE='recomp-fonts-v1';
const OPTIONAL=['./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest','./food-recognition-worker.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(CORE);
 await Promise.allSettled(OPTIONAL.map(x=>cache.add(x)));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const names=await caches.keys();
 await Promise.all(names.filter(name=>name.startsWith('recomp-shell-')&&name!==CACHE).map(name=>caches.delete(name)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 // Google Fonts: cache after first load so the type stays premium offline.
 if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
  event.respondWith((async()=>{
   const cache=await caches.open(FONT_CACHE);
   const hit=await cache.match(request);
   const network=fetch(request).then(r=>{if(r.ok||r.type==='opaque')cache.put(request,r.clone()).catch(()=>{});return r;}).catch(()=>null);
   return hit||(await network)||Response.error();
  })());return;
 }
 if(url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone()).catch(()=>{});}return response;}
   catch{return (await caches.match(request))||(await caches.match('./index.html'))||Response.error();}
  })());return;
 }
 event.respondWith((async()=>{
  const exact=await caches.match(request);
  if(exact)return exact;
  try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{});}return response;}
  catch{return (await caches.match(request,{ignoreSearch:true}))||Response.error();}
 })());
});