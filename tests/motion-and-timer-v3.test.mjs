import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('motion-effects.source.js');
const bridge=read('motion-bridge.js');
const app=read('app.js');
const worker=read('sw.js');
const welcome=read('first-run.js');
const prep=read('scripts/prepare-android-web.mjs');
const html=read('index.html');

test('animejs is bundled as a local offline asset with no CDN dependency',()=>{
 const packageJSON=JSON.parse(read('package.json'));
 assert.ok(packageJSON.dependencies.animejs);
 assert.ok(packageJSON.devDependencies.esbuild);
 assert.match(prep,/motion-effects\.source\.js/);
 assert.match(prep,/recomp-motion\.js/);
 assert.match(prep,/bundle:true/);
 assert.match(bridge,/import\('\.\/recomp-motion\.js'\)/);
 assert.match(html,/motion-effects\.css/);
 for(const filename of ['motion-bridge.js','motion-effects.css'])assert.ok(worker.includes("'./"+filename+"'"));
 assert.doesNotMatch(source,/https:\/\/(cdn|unpkg|esm\.sh|jsdelivr)/);
});
test('welcome animation runs once, does not block account or guest flow, respects reduced motion',()=>{
 assert.match(source,/splitText\(title,\{words:false,chars:true\}\)/);
 assert.match(source,/delay:stagger\(42\)/);
 assert.match(source,/loop:false/);
 assert.match(source,/prefers-reduced-motion: reduce/);
 assert.match(welcome,/runMotion\('playWelcomeHeading',overlay\)/);
 assert.match(source,/dataset\.motionPlayed/);
});
test('completion and streak effects are event-driven rather than repeated in render',()=>{
 assert.match(app,/runMotion\('playWorkoutSuccess',document\.getElementById\('recomp-workout-win'\)\)/);
 assert.match(app,/recomp-win-tick/);
 assert.match(app,/currentStreak>previousStreak/);
 assert.match(app,/\[7,14,30,60,100,365\]/);
 assert.match(app,/runMotion\('playStreakMilestone',document\.getElementById\('app'\)\)/);
 assert.doesNotMatch(source,/loop:true[\s\S]{0,80}playWelcomeHeading/);
});
test('workout timer keeps existing absolute time and pause/resume controls',()=>{
 assert.match(source,/createTimer\(\{/);
 assert.match(source,/duration:1000/);
 assert.match(source,/loop:true/);
 assert.match(source,/frameRate:30/);
 assert.match(source,/onUpdate:\(\)=>onTick\(\)/);
 assert.match(source,/onLoop:\(\)=>onTick\(\)/);
 assert.match(app,/const leftMs=r\.paused\?r\.remainingMs:Math\.max\(0,r\.endsAt-Date\.now\(\)\)/);
 assert.match(app,/if\(action==='timer-pause'\)/);
 assert.match(app,/refreshMotionClock\(Boolean\(state\.session\),timerTick\)/);
 assert.match(app,/if\(ready\)refreshMotionClock/);
 assert.match(app,/else setInterval\(timerTick,500\)/);
});
