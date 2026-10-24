import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../fts-workouts-16-41.js',import.meta.url),'utf8');
const {FTS_WORKOUTS_16_TO_41,mergeFtsFinalWorkouts,mergeFtsWorkoutForty}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('workouts 16–41 have sequential IDs, 26 plans, 202 movement entries including verified Strength Workout 40',()=>{
 assert.equal(FTS_WORKOUTS_16_TO_41.length,26);
 assert.deepEqual(FTS_WORKOUTS_16_TO_41.map(p=>p.id),Array.from({length:26},(_,i)=>'fts-workout-'+(i+16)));
 assert.equal(FTS_WORKOUTS_16_TO_41.reduce((sum,p)=>sum+p.items.length,0),202);
 assert.equal(FTS_WORKOUTS_16_TO_41.find(p=>p.id==='fts-workout-40').items.length,12,'Strength Workout 40 contains twelve actual FTS movements');
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
 assert.match(find(40).notes,/Back Squat/);
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
 assert.match(app,/ftsWorkoutImportVersion:4/);
 assert.match(app,/mergeFtsFinalWorkouts\(state.templates\)/);
 assert.match(app,/Number\(state.ftsWorkoutImportVersion\|\|0\)<4/);
 assert.match(app,/await put\('state',state\)/);
 assert.match(sw,/recomp-shell-v2\.8\.3-fts-strength40/);
 assert.ok(sw.includes("'./fts-workouts-16-41.js'"));
 assert.ok(page.includes('app.js?v=2.8.3-fts-strength40'));
});


test('Workout 40 video confirms Strength rather than a duplicate of Workout 39',()=>{
 const strength=FTS_WORKOUTS_16_TO_41.find(p=>p.id==='fts-workout-40');
 const upperBody=FTS_WORKOUTS_16_TO_41.find(p=>p.id==='fts-workout-39');
 assert.equal(strength.name,'Workout 40 · Strength');
 assert.notEqual(strength.name,upperBody.name);
 assert.equal(strength.items.length,12);
 assert.deepEqual(strength.items.map(x=>x[11]),['A1','B1','C1','D1','E1','F1','G1','G2','G3','G4','G5','G6']);
 assert.deepEqual(strength.items.filter(i=>['A1','C1','E1'].includes(i[11])).map(i=>i[1]),['Back Squat','Bench Press','Dumbbell Strict Press']);
 assert.deepEqual(strength.items.find(i=>i[11]==='A1')[7].map(s=>s.kg),[5,7.5,10]);
 assert.deepEqual(strength.items.find(i=>i[11]==='C1')[7].map(s=>s.kg),[10,10,12.5]);
 assert.deepEqual(strength.items.find(i=>i[11]==='E1')[7].map(s=>s.kg),[10,12.5,12.5]);
 for(const ref of ['A1','C1','E1'])assert.equal(strength.items.find(x=>x[11]===ref)[5],120,'2-minute rest preserved');
 for(const ref of ['B1','D1','F1'])assert.match(strength.items.find(x=>x[11]===ref)[8],/50 jumping jacks/);
 const running=strength.items.find(x=>x[11]==='G1');
 assert.equal(running[2],3);
 assert.match(running[8],/calories, not repetitions/);
 for(const ref of ['G2','G3','G4','G5','G6']){
  const exercise=strength.items.find(x=>x[11]===ref);
  assert.equal(exercise[2],3);
  assert.equal(exercise[3],30);
  assert.equal(exercise[5],30);
  assert.equal(exercise[10],'seconds');
 }
 assert.match(strength.notes,/Cooldown.*15 seconds/);
});

test('Workout 40 repair only updates the original untouched placeholder',()=>{
 const old={id:'fts-workout-40',name:'Workout 40 · Details needed (video unclear)',notes:'Old placeholder',items:[]};
 const custom={id:'custom-workout',name:'My personal workout',items:[]};
 const before=[{id:'fts-workout-39',name:'Upper Body',items:[]},old,{id:'fts-workout-41',name:'Recovery',items:[]},custom];
 const repaired=mergeFtsWorkoutForty(before);
 assert.equal(repaired[1].name,'Workout 40 · Strength');
 assert.equal(repaired[1].items.length,12);
 assert.equal(before[1],old,'input state is never mutated');
 assert.equal(repaired[0],before[0]);
 assert.equal(repaired[2],before[2]);
 assert.equal(repaired[3],custom);
 assert.deepEqual(mergeFtsWorkoutForty(repaired),repaired,'repair must be idempotent');
 const changed={...old,name:'My edited strength day'};
 assert.equal(mergeFtsWorkoutForty([changed])[0],changed,'renamed plan must not be overwritten');
 const customSets={...old,items:[['set','My exercise']]};
 assert.equal(mergeFtsWorkoutForty([customSets])[0],customSets,'edited exercises must not be overwritten');
 const missing=mergeFtsWorkoutForty([{id:'fts-workout-41',name:'Recovery',items:[]}]);
 assert.equal(missing[0].id,'fts-workout-40','missing plan is inserted in the correct order');
 assert.equal(missing[1].id,'fts-workout-41');
 assert.match(app,/mergeFtsWorkoutForty\(state.templates\)/);
});
