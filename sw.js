const CACHE = 'recomp-shell-v1.2';
const FILES = ['./','./index.html','./styles.css','./app.js','./db.js','./cloud.js','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', event => {
 if(event.request.method!=='GET'||!event.request.url.startsWith(self.location.origin))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(event.request,cp));}return r;}).catch(()=>caches.match(event.request).then(x=>x||caches.match('./index.html'))));return;
 }
 event.respondWith(fetch(event.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(event.request,cp));}return r;}).catch(()=>caches.match(event.request).then(x=>x||caches.match(new URL(event.request.url).pathname.split('/').pop()))));
});
