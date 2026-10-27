import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reopenCompletedWorkout,saveSessionDetails} from '../workout-recovery.js';
import {workoutHistoryHtml,orderedWorkoutPlans} from '../history-view.js';

test('Undo Finish restores exact exercises and completed sets without modifying history',()=>{
 const stored={id:'session-one',templateId:'leg-day',name:'Leg Day',startedAt:1000,endedAt:65000,
 durationMin:1,exercises:[{id:'leg-press',name:'Leg Press',sets:[{id:'set1',done:true,kg:70,reps:12},{id:'set2',done:false,kg:70,reps:12}]}],
 sessionDetails:{giantView:'detailed',warmupStatus:'done',groupSettings:{A:{rounds:3}},instructions:'Trainer note',activeIndex:0}};
 const original=JSON.stringify(stored);
 const restored=reopenCompletedWorkout(stored,{id:'leg-day'},1000000);
 assert.deepEqual(restored.exercises,stored.exercises);
 assert.equal(restored.startedAt,936000);
 assert.equal(restored.warmupStatus,'done');
 assert.equal(restored.giantView,'detailed');
 assert.equal(restored.instructions,'Trainer note');
 assert.equal(restored.groupSettings.A.rounds,3);
 restored.exercises[0].sets[0].done=false;
 assert.equal(stored.exercises[0].sets[0].done,true,'never mutate saved record');
 assert.equal(JSON.stringify(stored),original);
});

test('legacy completed session can be reopened, but invalid records are rejected',()=>{
 const plan={id:'p',name:'Original Plan',notes:'Coach',groupSettings:{B:{rounds:2}}};
 const old={id:'legacy',name:'Original Plan',durationMin:15,exercises:[{name:'Squat',sets:[{done:true}]}]};
 const restored=reopenCompletedWorkout(old,plan,1000000);
 assert.equal(restored.startedAt,100000);
 assert.equal(restored.instructions,'Coach');
 assert.equal(restored.groupSettings.B.rounds,2);
 assert.equal(reopenCompletedWorkout({name:'No exercises',exercises:[]},plan),null);
});

test('history exposes reversible reopen and confirmed delete controls',()=>{
 const history=[{id:'saved',name:'Leg Day',date:'2026-10-26',sets:1,durationMin:40,exercises:[{name:'Leg Press',sets:[{done:true,kg:70,reps:10}]}]}];
 const html=workoutHistoryHtml(history);
 assert.match(html,/data-action="reopen-workout-history" data-id="saved"/);
 assert.match(html,/data-action="delete-workout-history" data-id="saved"/);
 assert.deepEqual(orderedWorkoutPlans([{id:'p',name:'Leg Day'}],history).map(p=>p.name),['Leg Day']);
});
test('session metadata saves a copy and never alters the live session',()=>{
 const original={instructions:'Test',groupSettings:{A:{rounds:3}},giantView:'rounds',warmupStatus:'skipped',activeIndex:1};
 const details=saveSessionDetails(original);
 details.groupSettings.A.rounds=20;
 assert.equal(original.groupSettings.A.rounds,3);
 assert.equal(details.warmupStatus,'skipped');
});

test('site settings include double-confirmed local wipe and separate optional cloud deletion',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/data-action="reset-all-local-data"/);
 assert.match(app,/case 'reset-all-local-data'/);
 assert.match(app,/Review final warning/);
 assert.match(app,/Yes, delete local data/);
 assert.match(app,/case 'delete-cloud-backup'/);
 assert.match(app,/cloud\.deleteRemoteBackup\(\)/);
 assert.match(app,/localStorage\.removeItem\('recomp-auto-sync'\)/);
 assert.match(app,/case 'undo-finish-workout'/);
 assert.match(app,/case 'delete-workout-history'/);
 assert.match(app,/historyId,duration:minutes/);
 assert.match(app,/sessionDetails:saveSessionDetails\(s\)/);
 assert.match(app,/state\.workoutHistory\.filter\(item=>item!==record\)/);
});
test('IndexedDB reset clears records and photos, leaving optional cloud backup intact',()=>{
 const db=readFileSync(new URL('../db.js',import.meta.url),'utf8');
 const cloud=readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(db,/function clearAllLocalRecords/);
 assert.match(db,/db\.transaction\(STORES,'readwrite'\)/);
 assert.match(db,/tx\.oncomplete/);
 assert.match(db,/tx\.objectStore\(store\)\.clear\(\)/);
 assert.match(app,/await clearAllLocalRecords\(\)/);
 assert.match(app,/state=INITIAL\(\)/);
 assert.match(cloud,/function deleteRemoteBackup/);
 assert.match(cloud,/method:'DELETE'/);
 assert.match(cloud,/storage\/v1\/object\/progress-photos/);
});
test('release and offline shell include recovery and reset assets',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(html,/app\.js\?v=3-android-you/);
 assert.match(html,/data-controls\.css\?v=2\.9\.6-data-control/);
 assert.match(sw,/recomp-shell-v3-you-1000-recipes/);
 assert.ok(sw.includes("'./workout-recovery.js'"));
 assert.ok(sw.includes("'./data-controls.css'"));
});
