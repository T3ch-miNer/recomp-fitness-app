import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../fts-workouts-16-41.js',import.meta.url),'utf8');
const {FTS_WORKOUTS_16_TO_41,mergeFtsFinalWorkouts}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('workouts 16–41 have sequential IDs, 26 plans, 190 confirmed movement entries and one review-only slot',()=>{
 assert.equal(FTS_WORKOUTS_16_TO_41.length,26);
 assert.deepEqual(FTS_WORKOUTS_16_TO_41.map(p=>p.id),Array.from({length:26},(_,i)=>'fts-workout-'+(i+16)));
 assert.equal(FTS_WORKOUTS_16_TO_41.reduce((sum,p)=>sum+p.items.length,0),190);
 assert.equal(FTS_WORKOUTS_16_TO_41.find(p=>p.id==='fts-workout-40').items.length,0,'Workout 40 must not duplicate unverified sets');
 const entries=FTS_WORKOUTS_16_TO_41.flatMap(p=>p.items);
 assert.equal(new Set(entries.map(e=>e[0])).size,entries.length,'all exercise IDs must be unique');
 for(const plan of FTS_WORKOUTS_16_TO_41){
  assert.ok(plan.notes.length>100);
  for(const item of plan.items){
   assert.equal(item.length,13,plan.name+' '+item[1]);
   assert.ok(item[8]&&item[9]&&item[11]&&item[12]);
   assert.ok(Number.isInteger(item[2])&&item[2]>0&&item[2]<=12);
   assert.ok(Number.isInteger(item[3])&&item[3]>=0&&item[3]<=2000);
   assert.ok(['reps','seconds','minutes'].includes(item[10]));
  }
 }
});

test('recovery, prescription ladders, circuits and ambiguous details retained',()=>{
 const find=n=>FTS_WORKOUTS_16_TO_41[n-16];
 assert.equal(find(41).items[0][10],'minutes');
 assert.match(find(16).notes,/40–60/);
 assert.match(find(17).notes,/review missing movement/i);
 assert.match(find(21).notes,/75 kg/);
 assert.match(find(24).notes,/Confirm exercise title/i);
 assert.match(find(29).notes,/incomplete/i);
 assert.match(find(32).notes,/1 kg/);
 assert.match(find(40).notes,/Please send Workout 40 screenshots/);
 const squats=find(17).items.find(i=>i[1]==='Goblet Squat');
 assert.deepEqual(squats[7].map(s=>s.reps),[30,20,10]);
 const arms=find(18).items.find(i=>i[1]==='Dumbbell Bicep Curl');
 assert.deepEqual(arms[7].map(s=>s.reps),[20,10]);
 const timed=find(25).items.find(i=>i[1]==='Hollow Body Hold');
 assert.equal(timed[10],'seconds');
 assert.equal(timed[3],30);
});

test('saved FTS weights do not create completed training history',()=>{
 const items=FTS_WORKOUTS_16_TO_41.flatMap(p=>p.items);
 for(const item of items){
  assert.ok(item[7]===undefined||item[7].every(s=>!('done' in s)));
  assert.ok(item[7]===undefined||item[7].every(s=>s.kg===null||Number.isFinite(s.kg)));
 }
 assert.ok(!source.includes('workoutHistory.push'));
});

test('existing plans survive with their exact edited objects and custom plans',()=>{
 const existing=[
  {id:'custom-1',name:'Personal',items:[]},
  {id:'fts-workout-1',name:'My Leg Day',items:[]},
  {id:'fts-workout-15',name:'My Chest Day',items:[]},
  {id:'fts-workout-17',name:'Edited Plan 17',items:[]},
  {id:'custom-2',name:'Other',items:[]}
 ];
 const migrated=mergeFtsFinalWorkouts(existing);
 assert.deepEqual(migrated.slice(0,2),existing.slice(1,3));
 assert.equal(migrated[3],existing[3],'do not replace previously edited Workout 17');
 assert.deepEqual(migrated.slice(-2),[existing[0],existing[4]]);
 assert.equal(migrated.length,30);
 assert.deepEqual(mergeFtsFinalWorkouts(migrated),migrated,'migration must be idempotent');
 migrated[2].name='changed on device';
 assert.equal(FTS_WORKOUTS_16_TO_41[0].name,'Workout 16 · Cardio + Abs');
});

test('Recomp imports new FTS plans on fresh and existing installs, caching them offline',()=>{
 assert.match(app,/FTS_WORKOUTS_16_TO_41/);
 assert.match(app,/ftsWorkoutImportVersion:3/);
 assert.match(app,/mergeFtsFinalWorkouts\(state.templates\)/);
 assert.match(app,/Number\(state.ftsWorkoutImportVersion\|\|0\)<3/);
 assert.match(app,/await put\('state',state\)/);
 assert.match(sw,/recomp-shell-v2\.8\.2-fts-final/);
 assert.ok(sw.includes("'./fts-workouts-16-41.js'"));
 assert.ok(page.includes('app.js?v=2.8.2-fts-final'));
});
