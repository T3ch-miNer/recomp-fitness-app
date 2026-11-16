import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('recomp-motion.js');
const bridge=read('motion-bridge.js');
const app=read('app.js');
const worker=read('sw.js');
const welcome=read('first-run.js');
const prep=read('scripts/prepare-android-web.mjs');
const html=read('index.html');

test('Anime.js ships as a local file shared by the website and the APK, with no CDN or build step',()=>{
 const anime=read('anime.esm.min.js');
 assert.match(anime,/@version v4\.2\.2/);
 assert.match(anime,/@license MIT/);
 assert.match(source,/from '\.\/anime\.esm\.min\.js'/);
 assert.doesNotMatch(prep,/esbuild|bundle:true/,'Android copies the same files the website serves');
 assert.match(bridge,/import\('\.\/recomp-motion\.js'\)/);
 assert.match(html,/motion-effects\.css/);
 for(const filename of ['motion-bridge.js','motion-effects.css','recomp-motion.js','anime.esm.min.js'])assert.ok(worker.includes("'./"+filename+"'"));
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
 assert.match(source,/frameRate:2/,'twice a second, like the website');
 assert.doesNotMatch(source,/frameRate:(?:[3-9]|\d\d)/);
 assert.match(source,/onUpdate:\(\)=>onTick\(\)/);
 assert.doesNotMatch(source,/onLoop:\(\)=>onTick\(\)/,'no double tick per loop');
 assert.match(app,/const leftMs=r\.paused\?r\.remainingMs:Math\.max\(0,r\.endsAt-Date\.now\(\)\)/);
 assert.match(app,/if\(action==='timer-pause'\)/);
 assert.match(app,/refreshMotionClock\(Boolean\(state\.session\),timerTick\)/);
 assert.match(app,/if\(ready\)refreshMotionClock/);
 assert.match(app,/else setInterval\(timerTick,500\)/);
});
