import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const data=readFileSync(new URL('../fts-workouts.js',import.meta.url),'utf8');
const {FTS_WORKOUTS,mergeFtsWorkouts}=await import('data:text/javascript;base64,'+Buffer.from(data).toString('base64'));
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('four FTS programmes are ordered Workout 1 to Workout 4 and include 35 exercises',()=>{
 assert.deepEqual(FTS_WORKOUTS.map(t=>t.id),['fts-workout-1','fts-workout-2','fts-workout-3','fts-workout-4']);
 assert.deepEqual(FTS_WORKOUTS.map(t=>t.items.length),[10,8,12,5]);
 assert.equal(FTS_WORKOUTS.reduce((sum,t)=>sum+t.items.length,0),35);
 assert.ok(FTS_WORKOUTS.every(t=>t.notes.length>100));
 assert.ok(FTS_WORKOUTS.every(t=>t.items.every(e=>e[8]&&e[9]&&e[11]&&e[12])));
});

test('group notes, timed tracking and the descending abs ladder are preserved',()=>{
 const [legs,chest,arms,cardio]=FTS_WORKOUTS;
 assert.match(legs.notes,/giant sets/i);
 assert.match(chest.items.find(e=>e[1]==='Push Ups')[8],/15 full push-ups and 7 kneeling/);
 assert.match(arms.notes,/250 jumping jacks/);
 const wall=legs.items.find(e=>e[1]==='Wall Sit');
 assert.equal(wall[10],'seconds');
 const cardioMachine=cardio.items[0];
 assert.equal(cardioMachine[10],'minutes');
 assert.equal(cardioMachine[3],45);
 assert.equal(cardioMachine[9],'45 minutes');
 const crunch=cardio.items.find(e=>e[1]==='Crunches');
 assert.deepEqual(crunch[7].map(set=>set.reps),[20,15,10,5,20,15,10,5]);
 const shrugs=arms.items.find(e=>e[1]==='Dumbbell Shrugs');
 assert.equal(shrugs[7][0].kg,15);
 assert.equal(shrugs[7][0].reps,null,'never invent a missing rep count');
});

test('recorded weights are next-session defaults, not fabricated completed history',()=>{
 const press=FTS_WORKOUTS[0].items.find(e=>e[1]==='Leg Press');
 assert.deepEqual(press[7].map(set=>[set.kg,set.reps]),[[100,15],[100,15],[100,15]]);
 assert.equal(JSON.stringify(FTS_WORKOUTS).includes('"done":true'),false);
 assert.match(app,/templates:structuredClone\(\[\.\.\.FTS_WORKOUTS,\.\.\.FTS_WORKOUTS_5_TO_15,\.\.\.FTS_WORKOUTS_16_TO_41\]\)/);
 assert.match(app,/notes:item\[8\]/);
 assert.match(app,/instructions:template.notes/);
});

test('one-time migration preserves existing templates including personal edits',()=>{
 const userEdited={id:'fts-workout-2',name:'My chest programme',items:[]};
 const custom={id:'my-own-programme',name:'Custom',items:[['x','Squat',3,8,20,60,[]]]};
 const previous=[custom,userEdited,{id:'A',name:'Full Body A',items:[]}];
 const imported=mergeFtsWorkouts(previous);
 assert.deepEqual(imported.slice(0,4).map(t=>t.id),FTS_WORKOUTS.map(t=>t.id));
 assert.equal(imported[1],userEdited,'an already edited FTS plan must survive');
 assert.equal(imported[4],custom);
 assert.equal(imported[5],previous[2]);
 imported[0].name='Changed on device';
 assert.equal(FTS_WORKOUTS[0].name,'Workout 1 · Leg Day','the source template must not be mutated');
 assert.match(app,/ftsWorkoutImportVersion\|\|0\)<5/);
 assert.match(app,/await put\('state',state\)/);
 assert.match(app,/state=hadSavedState\?saved:INITIAL\(\)/);
});

test('updated PWA caches plans offline and forces latest app script',()=>{
 assert.ok(worker.includes("'./fts-workouts.js'"));
 assert.ok(worker.includes('recomp-shell-v2.9-recomp-pulse'));
 assert.ok(index.includes('app.js?v=2.9-recomp-pulse'));
});
