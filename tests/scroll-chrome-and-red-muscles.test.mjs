import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextScrollChromeState} from '../scroll-chrome.js';

test('navigation is visible at top, hides after downward scroll, and reveals on upward gesture',()=>{
 let s={lastY:0,hidden:false,down:0};
 s=nextScrollChromeState(s,40);
 assert.equal(s.hidden,false);
 s=nextScrollChromeState(s,70);
 assert.equal(s.hidden,false,'do not vanish immediately at page top');
 s=nextScrollChromeState(s,90);
 assert.equal(s.hidden,true);
 s=nextScrollChromeState(s,89);
 assert.equal(s.hidden,true);
 s=nextScrollChromeState(s,88);
 s=nextScrollChromeState(s,87);
 s=nextScrollChromeState(s,86);
 assert.equal(s.hidden,false,'slow upward gestures must restore navigation');
 s=nextScrollChromeState(s,250);
 assert.equal(s.hidden,true);
 s=nextScrollChromeState(s,0);
 assert.equal(s.hidden,false,'always visible at top');
});
test('focused workout, edit fields and dialog states can lock visible navigation',()=>{
 const hidden={lastY:300,hidden:true,down:30};
 assert.equal(nextScrollChromeState(hidden,370,{locked:true}).hidden,false);
});
test('CSS hides only mobile navigation and page actions and respects reduced motion',()=>{
 const css=readFileSync(new URL('../scroll-chrome.css',import.meta.url),'utf8');
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/scroll-chrome-hidden #recomp-bottom-dock/);
 assert.match(css,/scroll-chrome-hidden \.plan-fab-cluster/);
 assert.match(css,/scroll-chrome-hidden \.food-fab-cluster/);
 assert.match(css,/scroll-chrome-hidden #app>\.quick-fab/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('runtime locks focused sessions, and routes all main pages through same dock',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/const focused=Boolean\(state\.session&&!state\.session\.minimized&&tab==='workouts'\)/);
 assert.match(app,/scroll-chrome-hidden/);
 assert.match(app,/window\.addEventListener\('scroll',scheduleScrollChrome/);
 assert.match(app,/if\(active\)resetScrollChrome\(\)/);
 assert.match(app,/function setTab\(dest,swipeDirection=null\)\{toggleFoodMenu\(false\);resetScrollChrome\(\)/);
 for(const name of ['home','workouts','nutrition','body','settings'])assert.ok(app.includes(name));
});
test('muscle diagram uses red emphasis for focused muscles and distinct secondary tone',()=>{
 const css=readFileSync(new URL('../workout-focus-flow.css',import.meta.url),'utf8');
 assert.match(css,/\.muscle-highlight\.primary\{fill:#ef4255/);
 assert.match(css,/\.muscle-highlight\.secondary\{fill:#bb6670/);
 assert.match(css,/\.muscle-key-primary\{background:#ef4255/);
 assert.doesNotMatch(css,/\.muscle-highlight\.primary\{fill:var\(--accent\)/);
});
test('new nav script and CSS precached and versioned',()=>{
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(sw,/recomp-shell-v2\.9\.6-data-control/);
 assert.ok(sw.includes("'./scroll-chrome.js'"));
 assert.ok(sw.includes("'./scroll-chrome.css'"));
 assert.ok(html.includes('scroll-chrome.css?v=2.9.5-red-muscle-scroll'));
 assert.ok(html.includes('workout-focus-flow.css?v=2.9.5-red-muscle-scroll'));
});
