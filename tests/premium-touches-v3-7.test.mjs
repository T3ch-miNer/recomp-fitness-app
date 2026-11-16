import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {personalBests,streakMilestone,personalBestBadge,streakBadge} from '../rewards.js';
import {holdMs,wasHeld,HOLD_DEFAULT_MS,FADE_VERTICAL,FADE_SIDEWAYS} from '../premium-touches.js';
import {renderDayDetail,dayOverview} from '../you-calendar.js';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('personal bests only count a heavier set than every earlier session',()=>{
 const history=[
  {exercises:[{name:'Squat',sets:[{done:true,kg:60,reps:5},{done:false,kg:90,reps:5}]},{name:'Row',sets:[{done:true,kg:40,reps:8}]}]},
  {exercises:[{name:'Squat',sets:[{done:true,kg:70,reps:3}]}]}
 ];
 const now=[
  {name:'Squat',sets:[{done:true,kg:72.5,reps:3},{done:true,kg:65,reps:5}]},
  {name:'Row',sets:[{done:true,kg:40,reps:10}]},
  {name:'Curl',sets:[{done:true,kg:12,reps:10}]}
 ];
 assert.deepEqual(personalBests(history,now),[{name:'Squat',kg:72.5,prev:70}]);
 assert.deepEqual(personalBests([],now),[]);
 assert.deepEqual(personalBests(history,[{name:'Squat',sets:[{done:false,kg:200}]}]),[]);
});

test('giant-set rows keep their own exercise name for personal bests',()=>{
 const history=[{exercises:[{name:'Giant set A',sets:[{done:true,kg:20,exerciseName:'Lunge'}]}]}];
 const now=[{name:'Giant set A',sets:[{done:true,kg:24,exerciseName:'Lunge'}]}];
 assert.deepEqual(personalBests(history,now),[{name:'Lunge',kg:24,prev:20}]);
});

test('streak milestones start at 7 days and use the highest reached',()=>{
 assert.equal(streakMilestone(6),null);
 assert.equal(streakMilestone(7),7);
 assert.equal(streakMilestone(45),30);
 assert.equal(streakMilestone(400),365);
 assert.equal(streakBadge(3),'');
 assert.match(streakBadge(31),/data-foil/);
 assert.match(streakBadge(31),/30-day milestone/);
});

test('personal best badge is foil and escapes exercise names',()=>{
 assert.equal(personalBestBadge([]),'');
 const html=personalBestBadge([{name:'<b>Press</b>',kg:42.5,prev:40},{name:'Row',kg:50,prev:48}]);
 assert.match(html,/data-foil/);
 assert.match(html,/42\.5 kg/);
 assert.match(html,/Personal bests/);
 assert.ok(!html.includes('<b>Press'));
});

test('hold durations fall back to a safe default',()=>{
 assert.equal(holdMs({dataset:{hold:'3000'}}),3000);
 assert.equal(holdMs({dataset:{hold:''}}),HOLD_DEFAULT_MS);
 assert.equal(holdMs({dataset:{hold:'50'}}),HOLD_DEFAULT_MS);
 assert.equal(wasHeld({dataset:{held:'1'}}),true);
 assert.equal(wasHeld({dataset:{}}),false);
});

test('day note button shows Saved after saving',()=>{
 const o=dayOverview('2026-11-03',{dayNotes:{'2026-11-03':{text:'Good day',mood:'good'}}});
 const saved=renderDayDetail(o,{today:'2026-11-05',saved:true});
 assert.match(saved,/data-dyn="day-note"/);
 assert.match(saved,/is-saved/);
 assert.match(saved,/Saved<\/button>/);
 assert.match(renderDayDetail(o,{today:'2026-11-05'}),/>Update note<\/button>/);
});

test('destructive actions need a hold and skip the old pop-up once held',()=>{
 const app=read('app.js');
 assert.match(app,/data-action="stop-discard" data-hold="1500"/);
 assert.match(app,/data-action="reset-all-local-data" data-hold="3000"/);
 assert.match(app,/function sureInApp\(el,message,options\)\{return wasHeld\(el\)/);
 assert.match(app,/case 'delete-food':if\(await sureInApp\(el,/);
 assert.match(app,/case 'delete-photo':if\(await sureInApp\(el,/);
 assert.match(app,/if\(!wasHeld\(el\)&&!await confirmInApp\('Erase ALL/);
 assert.match(app,/initPremiumTouches\(\{hint:notify\}\)/);
 assert.match(read('history-view.js'),/data-action="delete-workout-history" data-id="[^"]*" data-hold="1500"/);
 assert.match(read('body-progress.js'),/data-action="delete-weight"[^>]*data-hold="1200"/);
 assert.match(read('you-page.js'),/data-action="you-remove-habit"[^>]*data-hold="1200"/);
});

test('rewards get foil, big surfaces get only the faint tint',()=>{
 const app=read('app.js');
 assert.match(app,/<div class="banked-card" data-foil>/);
 assert.match(app,/personalBestBadge\(modal\.pbs\|\|\[\]\)/);
 assert.match(app,/summary-hero hero-rings foil-tint/);
 assert.match(app,/premium-dock foil-tint/);
 assert.match(read('you-calendar.js'),/you-calendar foil-tint/);
 assert.match(read('you-page.js'),/\$\{streakBadge\(streak\)\}/);
 const css=read('premium-touches.css');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.ok(!/body\s*\{[^}]*foil/.test(css),'no foil on the page background');
});

test('scroll fades cover the food results and sideways chips',()=>{
 assert.match(FADE_VERTICAL,/\.nf-food-results/);
 assert.match(FADE_SIDEWAYS,/\.part-chips/);
 assert.match(FADE_SIDEWAYS,/\.mw-tabs/);
});

test('v3.7 files are cached offline and linked',()=>{
 const sw=read('sw.js'),index=read('index.html');
 for(const f of ['premium-touches.js','premium-touches.css','rewards.js'])assert.ok(sw.includes("'./"+f+"'"),f);
 assert.match(index,/premium-touches\.css\?v=3\.7/);
});
