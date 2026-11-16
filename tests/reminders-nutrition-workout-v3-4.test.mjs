import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanReminders,waterTimes,buildSchedule,reminderSummary,dueNow,renderReminderSettings,MANAGED_ID_MIN,MANAGED_ID_MAX} from '../reminders.js';
import {warmupView} from '../warmup.js';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('app.js');

test('reminder settings are cleaned: bad times, intervals and days fall back safely',()=>{
 const r=cleanReminders({water:{enabled:'yes',every:7,from:'25:00',to:'21:00'},workout:{enabled:1,days:['Mon','Funday','Fri'],time:'7pm'}});
 assert.equal(r.water.enabled,true);
 assert.equal(r.water.every,120);
 assert.equal(r.water.from,'09:00');
 assert.deepEqual(r.workout.days,['Mon','Fri']);
 assert.equal(r.workout.time,'18:00');
 assert.equal(cleanReminders(null).meals.enabled,false);
});

test('water reminders run from start to end at the chosen interval, capped at 16',()=>{
 assert.deepEqual(waterTimes({every:120,from:'09:00',to:'21:00'}),['09:00','11:00','13:00','15:00','17:00','19:00','21:00']);
 assert.deepEqual(waterTimes({every:90,from:'08:00',to:'10:00'}),['08:00','09:30']);
 assert.deepEqual(waterTimes({every:60,from:'21:00',to:'09:00'}),[],'end before start schedules nothing');
 assert.equal(waterTimes({every:60,from:'00:00',to:'23:59'}).length,16);
});

test('schedule uses separate ID ranges and Capacitor weekday numbers (Sunday is 1)',()=>{
 const list=buildSchedule({water:{enabled:true,every:180,from:'09:00',to:'15:00'},meals:{enabled:true},workout:{enabled:true,time:'18:30',days:['Mon','Sun']}});
 const kinds=list.map(n=>n.kind);
 assert.deepEqual(kinds,['water','water','water','meal','meal','meal','workout','workout']);
 assert.ok(list.every(n=>n.id>=MANAGED_ID_MIN&&n.id<=MANAGED_ID_MAX));
 assert.equal(new Set(list.map(n=>n.id)).size,list.length,'IDs are unique');
 const workout=list.filter(n=>n.kind==='workout');
 assert.deepEqual(workout.map(n=>n.on),[{weekday:2,hour:18,minute:30},{weekday:1,hour:18,minute:30}]);
 assert.deepEqual(list.find(n=>n.kind==='meal').on,{hour:9,minute:30});
 assert.deepEqual(buildSchedule({}),[],'all off by default');
});

test('summary and website check match what is switched on',()=>{
 assert.equal(reminderSummary({}),'No reminders on');
 assert.equal(reminderSummary({water:{enabled:true,every:120,from:'09:00',to:'13:00'},workout:{enabled:true,time:'07:00',days:['Tue']}}),'Water 3× a day · Workout Tue at 07:00');
 const settings={workout:{enabled:true,time:'07:00',days:['Tue']},water:{enabled:true,every:60,from:'07:00',to:'08:00'}};
 const tuesday=new Date(2026,10,3,7,0);
 assert.deepEqual(dueNow(settings,tuesday).map(n=>n.kind).sort(),['water','workout']);
 assert.deepEqual(dueNow(settings,new Date(2026,10,4,7,0)).map(n=>n.kind),['water'],'workout only on its days');
});

test('reminder form explains where reminders work and offers on-time alarms on Android',()=>{
 const web=renderReminderSettings({});
 assert.match(web,/id="form-reminders"/);
 assert.match(web,/only appear while Recomp is open/);
 const phone=renderReminderSettings({workout:{enabled:true}},{native:true,exact:'denied'});
 assert.match(phone,/arrive even when Recomp is closed/);
 assert.match(phone,/data-action="reminders-exact"/);
 assert.doesNotMatch(renderReminderSettings({workout:{enabled:true}},{native:true,exact:'granted'}),/reminders-exact/);
});

test('Android build adds the notification plugin, exact-alarm permission and a status-bar icon',()=>{
 assert.ok(JSON.parse(read('package.json')).dependencies['@capacitor/local-notifications']);
 const cfg=JSON.parse(read('capacitor.config.json'));
 assert.equal(cfg.plugins.LocalNotifications.smallIcon,'ic_stat_recomp');
 const script=read('scripts/integrate-android-native.py');
 assert.match(script,/android\.permission\.SCHEDULE_EXACT_ALARM/);
 assert.match(script,/ic_stat_recomp\.xml/);
 assert.match(app,/if\(id==='form-reminders'\)/);
 assert.match(app,/reminders:cleanReminders\(\)/);
 assert.match(app,/onReminderTap\(/);
 assert.ok(read('sw.js').includes("'./reminders.js'"));
});

test('Nutrition leads with today\'s intake; the everyday plate opens as a pop-up',()=>{
 const start=app.indexOf('function nutritionView(){'),body=app.slice(start,app.indexOf('\nconst PHOTO_VIEWS',start));
 const intake=body.indexOf('nutrition-intake-card'),planner=body.indexOf('mp-launch'),guide=body.indexOf('data-action="open-meal-guide"');
 assert.ok(intake>0&&planner>intake,'intake before planner');
 assert.ok(guide>intake&&guide<planner,'plate button lives in the intake card');
 assert.doesNotMatch(body,/\$\{mealGuideView\(\)\}/,'guide no longer inline on the page');
 assert.match(app,/if\(modal\.type==='meal-guide'\)return modalShell\('Your everyday plate'/);
 assert.match(app,/returnTo:modal\?\.type==='meal-guide'\?'meal-guide':null/);
});

test('workout screen: short title, last-time sets, one-row actions, compact warm-up',()=>{
 assert.match(app,/function workoutNameParts\(name=''\)/);
 assert.match(app,/<span class="last-time">Last time: /);
 assert.match(app,/<div class="exercise-actions compact">/);
 assert.match(app,/aria-label="Remove \$\{escapeHtml\(e\.name\)\} from this workout"/);
 const pending=warmupView({});
 assert.match(pending,/recomp-warmup pending/);
 assert.match(pending,/data-action="warmup-show-video"[^>]*>▶ Play</);
 assert.match(pending,/<details class="recomp-warmup-moves">[\s\S]*recomp-warmup-advice/,'advice tucked away');
});

test('workout motion is one-shot after a tick and uses transform or opacity only',()=>{
 const motion=read('recomp-motion.js');
 for(const name of ['playSetTick','playExerciseAdvance','playProgressFill','playExerciseOpen'])assert.match(motion,new RegExp('export function '+name));
 assert.match(app,/workoutMotion=\{ex:exI,set:setI,done:set\.done,from:s\.activeIndex\}/);
 assert.match(app,/const m=workoutMotion;workoutMotion=null;/);
 assert.match(read('motion-bridge.js'),/export function runMotion\(name,element,\.\.\.args\)/);
 assert.match(read('android-safe-area.css'),/html\.recomp-native \.ring-bar\{filter:none!important\}/);
});
