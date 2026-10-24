import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WARMUP_STEPS,WARMUP_VIDEO_ID,WARMUP_VIDEO_URL,warmupState,warmupView} from '../warmup.js';

test('warm-up follows the original Rowan Row 17-movement sequence',()=>{
 assert.equal(WARMUP_VIDEO_ID,'VecbXgWY0DI');
 assert.match(WARMUP_VIDEO_URL,/youtube\.com\/watch\?v=VecbXgWY0DI/);
 assert.equal(WARMUP_STEPS.length,17);
 assert.equal(WARMUP_STEPS[0],'Neck circles');
 assert.equal(WARMUP_STEPS[16],'Jumping jacks');
 assert.ok(WARMUP_STEPS.includes('Hamstring Curl')===false);
});
test('every session starts with pending warm-up, including sessions saved before this update',()=>{
 assert.equal(warmupState({}), 'pending');
 assert.equal(warmupState({warmupStatus:'done'}),'done');
 assert.equal(warmupState({warmupStatus:'skipped'}),'skipped');
 assert.equal(warmupState({warmupStatus:'invalid'}),'pending');
});
test('warm-up markup offers video, full sequence, completion and skip without mutating sets',()=>{
 const session={id:'demo',exercises:[{name:'Leg Press',sets:[{kg:100,reps:15,done:false}]}]};
 const before=JSON.stringify(session);
 const html=warmupView(session);
 assert.equal(JSON.stringify(session),before);
 assert.match(html,/data-action="warmup-show-video"/);
 assert.match(html,/data-action="warmup-finish"/);
 assert.match(html,/data-action="warmup-skip"/);
 assert.match(html,/View all 17 movements/);
 assert.match(html,/Jumping jacks/);
 const finished=warmupView({...session,warmupStatus:'done'});
 assert.match(finished,/Warm-up completed/);
 assert.match(finished,/data-action="warmup-reset"/);
 assert.doesNotMatch(finished,/data-action="warmup-show-video"/);
});
test('warm-up sits before workout mode controls, exercises and giant-set rounds',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const begin=app.indexOf('function activeWorkoutView()');
 const end=app.indexOf('function settingsSectionHeading(',begin);
 const view=app.slice(begin,end);
 assert.ok(view.includes('${warmupView(s)}'));
 assert.ok(view.indexOf('${warmupView(s)}')<view.indexOf('giant-view-toggle'));
 assert.ok(view.indexOf('${warmupView(s)}')<view.indexOf('renderGiantSetView(s)'));
 assert.ok(view.indexOf('${warmupView(s)}')<view.indexOf('s.exercises.map('));
 assert.match(app,/warmupStatus:'pending'/);
 assert.match(app,/case 'warmup-finish'/);
 assert.match(app,/case 'warmup-skip'/);
});
test('offline cache contains warm-up and page loads its stylesheet',()=>{
 const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(worker,/recomp-shell-v2\.9\.5-red-muscle-scroll/);
 assert.ok(worker.includes("'./warmup.js'"));
 assert.ok(worker.includes("'./warmup.css'"));
 assert.ok(page.includes('./warmup.css?v=2.9.3-universal-warmup'));
});
