import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html'),css=read('recomp-boot.css'),app=read('app.js');
const sw=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
const logo=read('icon.svg');

test('approved Recomp Pulse loader appears before the app is ready',()=>{
 assert.match(html,/<div id="app"><\/div>/);
 assert.match(html,/<div id="recomp-pulse" role="status" aria-label="Opening Recomp">/);
 for(const name of ['rb-orbit','rb-orbit-light','rb-squircle','rb-wave','rb-wordmark','rb-traindots','rb-progress','rb-top'])
  assert.match(html,new RegExp('class="'+name+'"'));
 assert.match(html,/TRAIN<\/span> · FUEL · EVOLVE/);
 assert.match(html,/GETTING YOUR SPACE READY/);
 assert.match(html,/Small wins stack/);
 assert.match(html,/recomp-boot\.css\?v=2\.9-recomp-pulse/);
 assert.ok(html.indexOf('recomp-boot.css')<html.indexOf('styles.css'),'load boot styles before main app');
 assert.ok(!/<iframe|<video|<img[^>]+src="https?:\/\//i.test(html),'do not add remote boot assets');
});

test('animated launch keeps mint pulse and supports light/reduced-motion users',()=>{
 for(const key of ['rb-drift','rb-orbit-turn','rb-intro','rb-rise','rb-float','rb-draw','rb-dot-flash','rb-progress'])
  assert.match(css,new RegExp('@keyframes '+key));
 assert.match(css,/#050709/);
 assert.match(css,/#6ef5c8/);
 assert.match(css,/#bff56a/);
 assert.match(css,/@media\(prefers-color-scheme:light\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/#recomp-pulse\.rb-leaving\{opacity:0\}/);
 assert.match(css,/pointer-events:none/);
 assert.match(css, /@media\(max-height:540px\)/);
});

test('splash dismisses only after initial app render, and never edits records',()=>{
 const startup=app.slice(app.indexOf('async function init(){'),app.indexOf('init();',app.indexOf('async function init(){')));
 const first=startup.indexOf('\n render();');
 const splash=startup.indexOf("document.getElementById('recomp-pulse')");
 assert.ok(first>=0&&splash>first,'app must render before dismissing the overlay');
 assert.match(startup,/const hold=still\?0:Math\.max\(0,2500-elapsed\)/);
 assert.match(startup,/pulse\.classList\.add\('rb-leaving'\)/);
 assert.match(startup,/pulse\.remove\(\)/);
 assert.doesNotMatch(css,/indexedDB|localStorage|deleteDatabase|fetch\(/);
});

test('both launcher PNGs are regenerated from the matching heartbeat mark',()=>{
 assert.equal(manifest.background_color,'#050709');
 assert.equal(manifest.theme_color,'#050709');
 assert.equal(manifest.icons[0].src,'./icon.svg');
 assert.ok(logo.includes('M42 104h24l16-38 24 60 18-42 14 20h22'));
 assert.ok(logo.includes('#050709'));
 for(const size of [192,512]){
  const data=readFileSync(new URL('../icon-'+size+'.png',import.meta.url));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(data.readUInt32BE(16),size);
  assert.equal(data.readUInt32BE(20),size);
  assert.ok(data.length>2000,'icon has real image content');
  assert.ok(manifest.icons.some(x=>x.src==='./icon-'+size+'.png'));
 }
});

test('offline startup caches the animated stylesheet and new assets',()=>{
 assert.match(sw,/const CACHE='recomp-shell-v3\.0-personal-plan-preview'/);
 assert.ok(sw.includes("'./recomp-boot.css'"));
 for(const path of ['icon.svg','icon-192.png','icon-512.png','manifest.webmanifest'])
  assert.ok(sw.includes("'./"+path+"'"),path+' should be cached for PWA use');
 assert.ok(html.includes('app.js?v=3.0-personal-plan-preview'));
});
