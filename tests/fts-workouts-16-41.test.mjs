import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../fts-workouts-16-41.js',import.meta.url),'utf8');
const {FTS_WORKOUTS_16_TO_41,mergeFtsFinalWorkouts,mergeFtsReviewedWorkouts}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('workouts 16–41 have sequential IDs, 26 plans, 206 movement entries including corrected Groups 17, 24 and 29',()=>{
 assert.equal(FTS_WORKOUTS_16_TO_41.length,26);
 assert.deepEqual(FTS_WORKOUTS_16_TO_41.map(p=>p.id),Array.from({length:26},(_,i)=>'fts-workout-'+(i+16)));
 assert.equal(FTS_WORKOUTS_16_TO_41.reduce((sum,p)=>sum+p.items.length,0),206);
 const strength=FTS_WORKOUTS_16_TO_41.find(p=>p.id==='fts-workout-40');
 assert.equal(strength.items.length,12,'Workout 40 has 3 strength movements, 3 skipping intervals and 6 core entries');
 assert.equal(strength.name,'Workout 40 · Strength');
 assert.deepEqual(strength.items.slice(0,6).map(x=>x[1]),['Back Squat','Skips / Jump Rope','Bench Press','Skips / Jump Rope','Dumbbell Strict Press','Skips / Jump Rope']);
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
 assert.match(find(17).notes,/2 supersets/i);
 assert.match(find(21).notes,/75 kg/);
 assert.equal(find(24).name,'Workout 24 · Chest & Back');
 assert.match(find(29).notes,/3 giant sets/i);
 assert.match(find(32).notes,/1 kg/);
 assert.match(find(40).notes,/Back Squat/);
 assert.equal(find(40).items.find(x=>x[1]==='Crunches')[10],'seconds');
 assert.deepEqual(find(40).items.find(x=>x[1]==='Bench Press')[7].map(s=>s.kg),[10,10,12.5]);
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
 assert.match(app,/ftsWorkoutImportVersion:5/);
 assert.match(app,/previousVersion>=3/);
 assert.match(app,/empty\?\.name==='Workout 40 · Details needed \(video unclear\)'/);
 assert.match(app,/mergeFtsFinalWorkouts\(state.templates\)/);
 assert.match(app,/Number\(state.ftsWorkoutImportVersion\|\|0\)<5/);
 assert.match(app,/await put\('state',state\)/);
 assert.match(sw,/recomp-shell-v2\.9\.3-universal-warmup/);
 assert.ok(sw.includes("'./fts-workouts-16-41.js'"));
 assert.ok(page.includes('app.js?v=2.9.3-universal-warmup'));
});

test('Workout 17 C group is two back-to-back supersets with weights left unspecified',()=>{
 const plan=FTS_WORKOUTS_16_TO_41.find(t=>t.id==='fts-workout-17');
 const c=plan.items.filter(e=>e[12]==='C');
 assert.deepEqual(c.map(e=>e[1]),['Standing Calf Raises','Glute Bridge']);
 assert.deepEqual(c.map(e=>[e[2],e[3]]),[[2,15],[2,15]]);
 assert.deepEqual(c.map(e=>e[11]),['C1','C2']);
 assert.ok(c.every(e=>e[4]===0&&!e[7]),'missing recorded weights must not be invented');
 assert.match(plan.notes,/rest between supersets/);
 assert.match(c[1][8],/bench/);
});

test('Workout 24 preserves two giant biceps sets and the conflicting FTS zero-rep target',()=>{
 const plan=FTS_WORKOUTS_16_TO_41.find(t=>t.id==='fts-workout-24');
 assert.equal(plan.name,'Workout 24 · Chest & Back');
 assert.deepEqual(plan.items.filter(e=>e[12]==='C').map(e=>e[1]),[
  'Dumbbell Bicep Curl','Alternating Isometric Dumbbell Curl','Hammer Curl'
 ]);
 const c2=plan.items.find(e=>e[11]==='C2');
 assert.equal(c2[2],2);
 assert.equal(c2[3],0,'FTS displayed 2 × 0 as the target');
 assert.deepEqual(c2[7],[{kg:5,reps:10},{kg:5,reps:10}],'logged values remain 10');
 assert.match(c2[9],/2 × 0.*10 reps logged/);
 const c3=plan.items.find(e=>e[11]==='C3');
 assert.deepEqual(c3[7],[{kg:5,reps:10},{kg:5,reps:10}]);
 assert.equal(plan.items.find(e=>e[11]==='D1')[3],20);
 assert.deepEqual(plan.items.find(e=>e[11]==='E1')[6],['Skips / Jump Rope','Jumping Jacks']);
 assert.match(plan.notes,/OR 100 skips/);
});

test('Workout 29 includes the missing 40-second raised-toe wall sit and correct circuits',()=>{
 const plan=FTS_WORKOUTS_16_TO_41.find(t=>t.id==='fts-workout-29');
 assert.deepEqual(plan.items.filter(e=>e[12]==='C').map(e=>e[1]),[
  'Goblet Cossack Squat','Air Squat','Wall Sit'
 ]);
 const wall=plan.items.find(e=>e[11]==='C3');
 assert.equal(wall[2],3);
 assert.equal(wall[3],40);
 assert.equal(wall[10],'seconds');
 assert.equal(wall[7],undefined);
 assert.match(wall[8],/toes elevated/);
 assert.deepEqual(plan.items.filter(e=>e[12]==='D').map(e=>[e[1],e[2],e[3]]),[
  ['Skips / Jump Rope',3,50],['Calf Raises',3,20]
 ]);
 assert.deepEqual(plan.items.filter(e=>e[12]==='E').map(e=>e[3]),[15,15,15]);
 assert.match(plan.items.find(e=>e[11]==='E2')[8],/EACH side/);
});

test('v5 migration patches just the originally unclear groups, preserving modified sets',()=>{
 const get=n=>structuredClone(FTS_WORKOUTS_16_TO_41.find(t=>t.id==='fts-workout-'+n));
 const w17=get(17),w24=get(24),w29=get(29);
 w17.notes=w17.notes.replace(/C: 2 supersets.*?(?= D:)/,'Group C scrolled too quickly, review missing movement(s).');
 w17.items=w17.items.filter(e=>e[12]!=='C');
 w17.items[0][4]=45; // user-modified working weight must not be overwritten
 w24.name='Workout 24 · Upper Body Mixed';
 w24.notes=w24.notes+' Confirm exercise title and group C from FTS if available.';
 w24.items=w24.items.filter(e=>e[11]!=='C3');
 const c2=w24.items.find(e=>e[11]==='C2');c2[3]=10;c2[4]=0;c2[7]=undefined;
 w29.notes=w29.notes+' Some fast-scrolled circuits are incomplete; review C and E before relying on exact counts.';
 w29.items=w29.items.filter(e=>e[11]!=='C3');
 const custom={id:'personal-plan',name:'User-made plan',items:[['x','Personal exercise',2,8,12.5,60,[]]]};
 const original=[custom,w17,w24,w29];
 const revised=mergeFtsReviewedWorkouts(original);
 assert.equal(revised[0],custom);
 assert.equal(revised[1].items[0],w17.items[0],'old working sets are not replaced');
 assert.equal(revised[1].items[0][4],45,'user-updated weight remains 45 kg');
 assert.deepEqual(revised[1].items.filter(e=>e[12]==='C').map(e=>e[1]),['Standing Calf Raises','Glute Bridge']);
 assert.equal(revised[2].name,'Workout 24 · Chest & Back');
 assert.equal(revised[2].items.find(e=>e[11]==='C2')[7][0].reps,10);
 assert.ok(revised[2].items.some(e=>e[11]==='C3'));
 assert.ok(revised[3].items.some(e=>e[11]==='C3'));
 assert.equal(w17.items.some(e=>e[12]==='C'),false,'migration must not mutate original state');
 assert.deepEqual(mergeFtsReviewedWorkouts(revised),revised,'repair must not duplicate exercises');
 const personallyChanged={...w29,notes:'My own coach notes',items:w29.items};
 assert.equal(mergeFtsReviewedWorkouts([personallyChanged])[0],personallyChanged,'replace no user-owned notes');
 assert.match(app,/mergeFtsReviewedWorkouts\(state.templates\)/);
});
