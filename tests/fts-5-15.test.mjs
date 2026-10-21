import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../fts-workouts-5-15.js',import.meta.url),'utf8');
const {FTS_ADDITIONAL_WORKOUTS,mergeAdditionalFtsWorkouts}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('FTS 5–15 cover eleven sequential workout slots and 93 exercises',()=>{
 const actual=FTS_ADDITIONAL_WORKOUTS.map(t=>t.id);
 assert.deepEqual(actual,Array.from({length:11},(_,i)=>'fts-workout-'+(i+5)));
 assert.deepEqual(FTS_ADDITIONAL_WORKOUTS.map(t=>t.items.length),[8,10,11,8,11,1,8,10,10,10,6]);
 assert.equal(FTS_ADDITIONAL_WORKOUTS.reduce((total,t)=>total+t.items.length,0),93);
 assert.ok(FTS_ADDITIONAL_WORKOUTS.every(t=>t.notes.length>120));
 assert.ok(FTS_ADDITIONAL_WORKOUTS.every(t=>t.items.every(e=>e[8]&&e[9]&&e[11]&&e[12])));
 assert.equal(new Set(FTS_ADDITIONAL_WORKOUTS.flatMap(t=>t.items.map(e=>e[0]))).size,93);
});

test('preserve note-rich circuits, recovery day, and units',()=>{
 const byId=id=>FTS_ADDITIONAL_WORKOUTS.find(t=>t.id==='fts-workout-'+id);
 assert.match(byId(5).notes,/dumbbells throughout/i);
 assert.match(byId(6).notes,/every minute/i);
 assert.equal(byId(7).items.find(e=>e[1]==='Plank Hold')[10],'seconds');
 assert.deepEqual(byId(8).items.find(e=>e[1]==='Jumping Jacks')[7].map(x=>x.reps),[30,20,10]);
 assert.match(byId(9).notes,/snatches each side/);
 assert.equal(byId(10).items.length,1);
 assert.equal(byId(10).items[0][10],'minutes');
 assert.match(byId(10).notes,/not a compulsory workout/);
 assert.equal(byId(12).items.find(e=>e[1]==='Burpee')[2],5);
 assert.equal(byId(13).items.find(e=>e[1]==='Box Squat')[2],4);
 assert.match(byId(14).notes,/drop to a lighter weight/);
 assert.equal(byId(15).items.find(e=>e[1]==='Wide Grip Barbell Shrug')[2],4);
});

test('unknown data stays absent and suspicious recorded weights are marked for checking',()=>{
 const w14=FTS_ADDITIONAL_WORKOUTS.find(t=>t.id==='fts-workout-14');
 const curls=w14.items.find(e=>e[1]==='Hammer Curl');
 assert.deepEqual(curls[7].map(x=>x.reps),[null,null,null]);
 const lat=w14.items.find(e=>e[1]==='Seated Lat Pull Down Machine');
 assert.deepEqual(lat[7].map(x=>x.kg),[4,40,35]);
 assert.match(lat[8],/verify/i);
 const glute=FTS_ADDITIONAL_WORKOUTS.find(t=>t.id==='fts-workout-7').items.find(e=>e[1]==='Barbell Glute Bridge Thrusts');
 assert.match(glute[8],/verify/i);
 assert.ok(!source.includes('"done":true'),'old FTS ticks must not count as Recomp history');
});

test('migration is idempotent and preserves previously edited plans and unrelated records',()=>{
 const prior=[
  {id:'fts-workout-1',name:'Leg Day (edited)',items:[]},
  {id:'fts-workout-2',name:'Chest (edited)',items:[]},
  {id:'fts-workout-5',name:'Posterior (edited)',items:[]},
  {id:'custom-plan',name:'Mine',items:[]},
  {id:'B',name:'Legacy',items:[]}
 ];
 const result=mergeAdditionalFtsWorkouts(prior);
 assert.equal(result.length,14);
 assert.deepEqual(result.slice(0,2),prior.slice(0,2));
 assert.equal(result[2],prior[2],'edited workout 5 is retained');
 assert.equal(result[13],prior[4]);
 assert.equal(result[12],prior[3]);
 assert.deepEqual(result.map(t=>t.id).slice(0,13),['fts-workout-1','fts-workout-2',...FTS_ADDITIONAL_WORKOUTS.map(t=>t.id)]);
 const again=mergeAdditionalFtsWorkouts(result);
 assert.deepEqual(again,result);
 assert.notEqual(result[3],FTS_ADDITIONAL_WORKOUTS[1], 'new imported templates must be cloned');
 assert.match(app,/ftsWorkoutImportVersion:2/);
 assert.match(app,/mergeAdditionalFtsWorkouts\(state.templates\)/);
 assert.match(app,/await put\('state',state\)/);
});

test('the offline shell includes all workout modules',()=>{
 assert.ok(sw.includes("'./fts-workouts-5-15.js'"));
 assert.ok(sw.includes("recomp-shell-v2.7.1-fts-05-15"));
 assert.ok(index.includes("app.js?v=2.7.1-fts-05-15"));
});
