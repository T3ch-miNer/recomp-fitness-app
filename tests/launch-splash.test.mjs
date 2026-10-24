import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const page=read('index.html');
const style=read('launch.css');
const premium=read('premium.css');
const sw=read('sw.js');
const manifest=JSON.parse(read('manifest.webmanifest'));
const icon=read('icon.svg');

test('Recomp Pulse matches the approved visual branding on first paint',()=>{
 assert.match(page,/class="boot" role="status" aria-label="Loading Recomp"/);
 assert.match(page,/RECOMP \/ PERSONAL FITNESS/);
 assert.match(page,/recomp<span>\.<\/span>/);
 assert.match(page,/TRAIN<\/strong> · FUEL · EVOLVE/);
 for(const word of ['MOVE','GROW','REPEAT','GETTING YOUR SPACE READY','Small wins stack'])assert.ok(page.includes(word));
 assert.match(page,/class="boot-wave"/);
 assert.match(page,/id="boot-mint-gradient"/);
 assert.match(page,/class="boot-orbit"/);
 assert.match(page,/class="boot-track"/);
 assert.doesNotMatch(page,/class="boot"[^>]*style="[^"]*visibility:\s*hidden/);
 assert.ok(page.indexOf('./launch.css')<page.indexOf('id="app"'),
 'styles load before the app paints');
});

test('animation is CSS/SVG only and supports light, dark and reduced motion',()=>{
 for(const animation of ['recomp-launch-pulse','recomp-launch-spin','recomp-launch-float','recomp-launch-drift','recomp-launch-load']){
  assert.ok(style.includes('@keyframes '+animation),animation);
 }
 assert.match(style,/@media\(prefers-color-scheme:light\)/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(style,/\.boot-wave\{stroke-dashoffset:0;opacity:1\}/);
 assert.match(style,/safe-area-inset-top/);
 assert.match(style,/safe-area-inset-bottom/);
 assert.match(style,/min-height:100dvh/);
 assert.match(style,/--launch-bg:#050709/);
 assert.match(style,/#6ef5c8/);
 assert.match(style,/#bff56a/);
 assert.doesNotMatch(style,/https?:\/\/|@import|fetch\(/i);
 assert.match(premium,/\.boot-mark/,'legacy styling still exists but the new CSS overrides it');
 assert.ok(page.indexOf('premium.css')<page.indexOf('launch.css'),'boot overrides should load after legacy styles');
});

test('all visual assets are cached and splash never changes workout data',()=>{
 assert.match(sw,/recomp-shell-v2\.9\.0-recomp-pulse/);
 assert.ok(sw.includes("'./launch.css'"),'new launch CSS available offline');
 assert.ok(sw.includes("'./icon.svg'"),'vector icon cached');
 assert.ok(sw.includes("'./manifest.webmanifest'"),'manifest cached');
 assert.equal(manifest.background_color,'#050709');
 assert.equal(manifest.theme_color,'#050709');
 assert.ok(manifest.icons.some(x=>x.src==='./icon.svg'&&x.sizes==='any'));
 assert.match(icon,/viewBox="0 0 512 512"/);
 assert.match(icon,/fill="#050709"/);
 assert.match(icon,/#6ef5c8/);
 assert.match(icon,/#bff56a/);
 assert.ok(page.includes('<div id="app">'),'existing application root preserved');
 for(const action of ['workoutHistory','state.templates','localStorage','IndexedDB','setTimeout','requestAnimationFrame'])
  assert.ok(!style.includes(action),'launch style must not touch data or run timers');
});

test('new animated launch has no external scripts, unnecessary delay or focus trap',()=>{
 const boot=page.slice(page.indexOf('<div id="app">'),page.indexOf('<div id="toast"'));
 assert.ok(!boot.includes('<script'));
 assert.ok(!boot.includes('autofocus'));
 assert.ok(!boot.includes('<iframe'));
 assert.ok(!boot.includes('<video'));
 assert.match(page,/src="\.\/app\.js\?v=/);
 assert.match(page,/<noscript>/);
});
