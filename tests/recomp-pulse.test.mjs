import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),css=read('recomp-boot.css'),script=read('recomp-boot.js');
const app=read('app.js'),worker=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
const icon=read('icon.svg');
const {revealRecompApp}=await import('data:text/javascript;base64,'+Buffer.from(script).toString('base64'));

test('approved Recomp Pulse appears at initial paint with the actual app logo',()=>{
 assert.match(html,/id="recomp-splash" class="recomp-boot"/);
 assert.match(html,/role="status" aria-live="polite" aria-label="Loading Recomp"/);
 assert.match(html,/id="app" aria-busy="true"/);
 assert.match(html,/class="rb-orbit"/);
 assert.match(html,/class="rb-wave"/);
 assert.match(html,/d="M42 104h24l16-38 24 60 18-42 14 20h22"/);
 assert.match(html,/TRAIN[\s\S]*FUEL[\s\S]*EVOLVE/);
 assert.match(html,/GETTING YOUR SPACE READY/);
 assert.match(html,/Small wins stack\. One day at a time/);
 assert.doesNotMatch(html,/class="boot-mark"/,'retire the old unbranded loading screen');
 assert.match(html,/recomp-boot\.css\?v=2\.8\.10-recomp-pulse/);
});

test('boot uses offline styles with animated pulse, orbit, and light/reduced-motion variants',()=>{
 for(const item of ['rb-orbit-turn','rb-draw','rb-float','rb-progress','rb-rise','rb-drift','rb-dot-flash']){
  assert.ok(css.includes('@keyframes '+item),'missing animation '+item);
 }
 assert.match(css,/--rb-bg:#050709/);
 assert.match(css,/@media\(prefers-color-scheme:light\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.recomp-boot\.rb-exit/);
 assert.match(css,/z-index:110/);
 assert.doesNotMatch(css,/https?:\/\/|@import/i,'no external assets should delay or break offline loading');
});

function fakeScreen(){
 const callbacks=[],events=[];
 const splash={
  isConnected:true,removed:false,
  classList:{values:[],add(name){this.values.push(name);}},
  addEventListener(name,fn,options){events.push({name,fn,options});},
  remove(){this.removed=true;this.isConnected=false;}
 };
 const app={attributes:['aria-busy'],removeAttribute(name){this.attributes=this.attributes.filter(x=>x!==name);}};
 const context={
  documentRoot:{getElementById:id=>id==='recomp-splash'?splash:id==='app'?app:null},
  scheduleAfter:(cb,ms)=>callbacks.push({cb,ms})
 };
 return {splash,app,callbacks,events,context};
}

test('fast loading shows a short pulse then fades, without blocking main app data',()=>{
 const f=fakeScreen();
 assert.equal(revealRecompApp({...f.context,clock:()=>300,reducedMotion:()=>false}),true);
 assert.deepEqual(f.app.attributes,[],'the rendered app becomes accessible immediately');
 assert.equal(f.callbacks.length,1);
 assert.equal(f.callbacks[0].ms,900,'remaining time measured from navigation start');
 assert.equal(f.splash.removed,false);
 f.callbacks[0].cb();
 assert.deepEqual(f.splash.classList.values,['rb-exit']);
 assert.equal(f.events[0].name,'transitionend');
 assert.equal(f.events[0].options.once,true);
 assert.equal(f.callbacks[1].ms,460,'fallback removes overlay if transition events fail');
 f.events[0].fn();
 assert.equal(f.splash.removed,true);
 f.callbacks[1].cb();
 assert.equal(f.splash.removed,true,'second removal is harmless');
});

test('slow loading adds no extra delay; reduced motion dismisses immediately',()=>{
 const slow=fakeScreen();
 revealRecompApp({...slow.context,clock:()=>2400,reducedMotion:()=>false});
 assert.equal(slow.callbacks[0].ms,0);
 const reduced=fakeScreen();
 revealRecompApp({...reduced.context,clock:()=>10,reducedMotion:()=>true});
 assert.equal(reduced.callbacks[0].ms,0);
 reduced.callbacks[0].cb();
 assert.equal(reduced.splash.removed,true);
 assert.deepEqual(reduced.splash.classList.values,[]);
 assert.equal(reduced.callbacks.length,1);
 assert.equal(revealRecompApp({documentRoot:{getElementById:()=>null}}),false);
});

test('startup handoff runs after first render; existing session and history are untouched',()=>{
 assert.match(app,/import \{revealRecompApp\} from '\.\/recomp-boot\.js'/);
 assert.match(app,/render\(\);\n \/\/ The boot overlay fades only when Recomp's actual app has rendered\.\n revealRecompApp\(\);/);
 assert.doesNotMatch(script,/indexedDB|localStorage|workoutHistory|navigator\.serviceWorker|fetch\(/);
 assert.match(worker,/recomp-shell-v2\.8\.10-recomp-pulse/);
 for(const file of ['recomp-boot.css','recomp-boot.js','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest']){
  assert.ok(worker.includes("'./"+file+"'"),'startup asset should be offline-ready: '+file);
 }
});

test('launcher icon, manifest and system splash share the same charcoal and mint colours',()=>{
 assert.equal(manifest.background_color,'#050709');
 assert.equal(manifest.theme_color,'#050709');
 assert.equal(manifest.icons[0].src,'./icon.svg');
 assert.ok(manifest.icons.some(x=>x.sizes==='192x192'));
 assert.ok(manifest.icons.some(x=>x.sizes==='512x512'));
 assert.match(icon,/viewBox="0 0 512 512"/);
 assert.match(icon,/stroke="url\(#pulse\)"/);
 assert.match(icon,/#6ef5c8/);
 assert.match(icon,/#bff56a/);
 for(const size of [192,512]){
  const png=readFileSync(new URL('../icon-'+size+'.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),size);
  assert.equal(png.readUInt32BE(20),size);
  assert.equal(png[25],2,'truecolour PNG');
  assert.equal(png.toString('ascii',37,41),'IDAT');
  const count=png.readUInt32BE(33);
  const pixels=inflateSync(png.subarray(41,41+count));
  assert.equal(pixels.length,size*(size*3+1));
  assert.equal(pixels[0],0,'first row uses PNG none filter');
 }
});
