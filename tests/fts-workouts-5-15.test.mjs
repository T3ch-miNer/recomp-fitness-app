import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const legacySource=readFileSync(new URL('../fts-workouts.js',import.meta.url),'utf8');
const legacyUrl='data:text/javascript;base64,'+Buffer.from(legacySource).toString('base64');
const {FTS_WORKOUTS}=await import(legacyUrl);
const expansionSource=readFileSync(new URL('../fts-workouts-5-15.js',import.meta.url),'utf8');
const expansionUrl='data:text/javascript;base64,'+Buffer.from(expansionSource.replace("from './fts-workouts.js'","from '"+legacyUrl+"'")).toString('base64');
const {FTS_WORKOUTS_5_TO_15,mergeFtsWorkoutExpansion}=await import(expansionUrl);
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

const find=(number,ref)=>FTS_WORKOUTS_5_TO_15.find(p=>p.id==='fts-workout-'+number)?.items.find(e=>e[11]===ref);

test('all 11 new workouts are ordered 5–15, with 93 entries and complete group metadata',()=>{
 assert.deepEqual(FTS_WORKOUTS_5_TO_15.map(t=>t.id),Array.from({length:11},(_,i)=>'fts-workout-'+(i+5)));
 assert.equal(FTS_WORKOUTS_5_TO_15.reduce((n,t)=>n+t.items.length,0),93);
 assert.equal(FTS_WORKOUTS.length+FTS_WORKOUTS_5_TO_15.length,15);
 const ids=FTS_WORKOUTS_5_TO_15.flatMap(p=>p.items.map(item=>item[0]));
 assert.equal(new Set(ids).size,93);
 for(const plan of FTS_WORKOUTS_5_TO_15){
  assert.ok(plan.name.startsWith('Workout '));
  assert.ok(plan.notes.length>100,plan.name);
  for(const e of plan.items){
   assert.ok(e[8]&&e[9]&&e[11]&&e[12],plan.name+' '+e[1]);
   assert.ok(e[2]>=1&&e[2]<=12);
   assert.ok(e[3]>=0&&e[3]<=2000);
   assert.ok(e[8].length<=1200);
   assert.ok(!e[7]||e[7].length<=e[2]);
  }
 }
});

test('screenshot prescriptions and exceptional readings are not silently adjusted',()=>{
 assert.equal(find(5,'B3')[3],15);
 assert.deepEqual(find(5,'B3')[7].map(x=>x.reps),[10,10,10]);
 assert.deepEqual(find(6,'D1')[7].map(x=>x.reps),[20,15,10,5,20,15,10,5]);
 assert.match(find(6,'D1')[9],/Descending/);
 assert.deepEqual(find(7,'D1')[7].map(x=>x.kg),[75,7.5]);
 assert.deepEqual(find(8,'C1')[7].map(x=>x.kg),[30,35,40]);
 assert.deepEqual(find(9,'C3')[7].map(x=>x.reps),[5,10,10]);
 assert.equal(find(11,'C1')[7][0].reps,50);
 assert.equal(find(12,'A2')[2],5);
 assert.equal(find(13,'A1')[2],4);
 assert.deepEqual(find(13,'A1')[7].map(x=>x.reps),[12,12,10,10]);
 assert.equal(find(14,'A1')[7][0].kg,4);
 assert.match(find(14,'A1')[8],/verify|verification/i);
 assert.equal(find(15,'A6')[7][3].kg,null);
});

test('time-based and recovery choices stay correctly labelled',()=>{
 assert.equal(find(7,'F1')[10],'seconds');
 assert.equal(find(7,'F3')[2],2);
 assert.equal(find(10,'A1')[10],'minutes');
 assert.equal(find(10,'A1')[3],40);
 assert.match(FTS_WORKOUTS_5_TO_15[5].notes,/rest|optional/i);
 assert.equal(find(13,'A4')[10],'seconds');
 assert.equal(find(13,'C1')[10],'minutes');
 assert.match(find(14,'D1')[8],/ten.minute cap/i);
});

test('missing weights and reps remain unrecorded, and no workout history is fabricated',()=>{
 const missing=find(14,'B1');
 assert.deepEqual(missing[7].map(s=>s.reps),[null,null,null]);
 assert.equal(find(11,'C1')[7][1].kg,null);
 const all=JSON.stringify(FTS_WORKOUTS_5_TO_15);
 assert.ok(!all.includes('"done":true'));
 assert.ok(!all.includes('"workoutHistory"'));
 assert.ok(!all.includes('"completedAt"'));
});

test('one-time migration retains every pre-existing FTS edit and custom plan',()=>{
 const custom={id:'custom-run',name:'My running day',items:[]};
 const editedOld={id:'fts-workout-2',name:'Edited old plan',items:[]};
 const editedNew={id:'fts-workout-8',name:'Edited Chest + Back',items:[['my-row','My Row',3,10,20,60,[]]]};
 const originals=[custom,editedNew,editedOld];
 const merged=mergeFtsWorkoutExpansion(originals);
 assert.deepEqual(merged.slice(0,15).map(t=>t.id),Array.from({length:15},(_,i)=>'fts-workout-'+(i+1)));
 assert.equal(merged[1],editedOld);
 assert.equal(merged[7],editedNew);
 assert.equal(merged[15],custom);
 assert.equal(mergeFtsWorkoutExpansion(merged).length,merged.length,'no duplicates on second import');
 merged[4].name='Modified on device';
 assert.equal(FTS_WORKOUTS_5_TO_15[0].name,'Workout 5 · Posterior');
 assert.match(app,/state=hadSavedState\?saved:INITIAL\(\)/);
 assert.match(app,/ftsWorkoutImportVersion\|\|0\)<5/);
 assert.match(app,/mergeFtsWorkoutExpansion\(state.templates\)/);
 assert.match(app,/await put\('state',state\)/);
 assert.match(app,/instructions:desired.notes/);
});

test('new and existing installs can load all fifteen plans offline',()=>{
 assert.match(app,/templates:structuredClone\(\[\.\.\.FTS_WORKOUTS,\.\.\.FTS_WORKOUTS_5_TO_15,\.\.\.FTS_WORKOUTS_16_TO_41\]\)/);
 assert.ok(worker.includes("'./fts-workouts-5-15.js'"));
 assert.ok(worker.includes("recomp-shell-v2.9.6-data-control"));
 assert.ok(index.includes("app.js?v=2.9.6-data-control"));
});
