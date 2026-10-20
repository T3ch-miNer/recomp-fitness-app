import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const logicSource=file('giant-sets.js');
const logicUrl='data:text/javascript;base64,'+Buffer.from(logicSource).toString('base64');
const logic=await import(logicUrl);
const displaySource=file('giant-set-view.js');
const displayUrl='data:text/javascript;base64,'+Buffer.from(displaySource.replace("'./giant-sets.js'","'"+logicUrl+"'")).toString('base64');
const {renderGiantSetView}=await import(displayUrl);
const {FTS_WORKOUTS}=await import('data:text/javascript;base64,'+Buffer.from(file('fts-workouts.js')).toString('base64');
const app=file('app.js'),css=file('giant-sets.css'),worker=file('sw.js'),index=file('index.html');

function sessionFromPlan(plan){
 return {name:plan.name,exercises:plan.items.map(item=>({
  id:item[0],name:item[1],group:item[12],ref:item[11],
  notes:item[8],targetLabel:item[9],unit:item[10],
  sets:Array.from({length:item[2]},(_,i)=>({
   kg:item[7]?.[i]?.kg??item[4],reps:item[7]?.[i]?.reps??item[3],done:false
  }))
 }))};
}

test('normal giant sets still group and advance by genuine FTS rounds',()=>{
 const day1=sessionFromPlan(FTS_WORKOUTS[0]);
 const before=structuredClone(day1);
 const groups=logic.getGiantGroups(day1);
 assert.deepEqual(groups.map(g=>[g.id,g.items.length,g.rounds]),[['A',3,3],['B',3,3],['C',4,2]]);
 const cursor=logic.firstIncompleteStep(groups);
 assert.deepEqual(cursor,{group:'A',round:0,index:0});
 groups[0].items[0].exercise.sets[0].done=true;
 assert.deepEqual(logic.nextIncompleteStep(groups,cursor),{group:'A',round:0,index:1});
 assert.equal(groups[0].items[0].exercise.sets[1].done,false);
 assert.deepEqual(day1.exercises[0].sets.slice(1),before.exercises[0].sets.slice(1));
});

test('FTS Workout 4 descending 20-15-10-5 sets are not renamed eight rounds',()=>{
 const day4=sessionFromPlan(FTS_WORKOUTS[3]),saved=structuredClone(day4);
 assert.match(day4.exercises.map(e=>e.targetLabel).join(' '),/20[–—-]15[–—-]10[–—-]5/);
 assert.equal(logic.getGiantGroups(day4).length,0);
 assert.equal(day4.exercises.filter(e=>e.group==='B').length,4);
 assert.equal(day4.exercises.find(e=>e.group==='B').sets.length,8);
 assert.deepEqual(day4,saved,'selectors must not edit actual saved weights or reps');
});

test('special workout notes keep Detail View even when their prior sets are edited',()=>{
 const day4=sessionFromPlan(FTS_WORKOUTS[3]);
 for(const exercise of day4.exercises){
  if(exercise.group!=='B')continue;
  exercise.sets.forEach((set,i)=>{set.reps=12+i;});
 }
 assert.equal(logic.getGiantGroups(day4).length,0,
  'editing historical reps must not silently turn a descending ladder into 8 rounds');
});

test('FTS workout 3 has safe shortcut for extra solo skipping exercise',()=>{
 const day3=sessionFromPlan(FTS_WORKOUTS[2]);
 const groups=logic.getGiantGroups(day3);
 assert.ok(groups.length>=2);
 const leftover=logic.ungroupedExerciseIndices(day3,groups);
 assert.ok(leftover.some(i=>day3.exercises[i].name.toLowerCase().includes('skip')));
 const original=structuredClone(day3);
 const html=renderGiantSetView(day3);
 assert.match(html,/still needs? attention/);
 assert.match(html,/Open Detailed View/);
 assert.match(html,/data-action="giant-view" data-mode="detailed"/);
 assert.match(html,/Skips/);
 assert.deepEqual(day3,original);
 const solo=leftover.find(i=>day3.exercises[i].name.toLowerCase().includes('skip'));
 day3.exercises[solo].sets.forEach(set=>{set.done=true});
 const later=renderGiantSetView(day3);
 assert.doesNotMatch(later,/Skips.*Open Detailed View/s,'completed solo steps need no warning');
});

test('existing plans and app stay device-first with clear special-sequence guidance',()=>{
 assert.match(app,/specialSequence=!giantGroups.length/);
 assert.match(app,/Special FTS sequence/);
 assert.match(app,/Detailed View preserves the exact repetitions/);
 assert.match(app,/s.giantView==='detailed'/);
 assert.match(app,/nextIncompleteStep\(groups,current\)/);
 assert.match(app,/suggested:true,giantGroup/);
 assert.match(app,/Version 2\.6 · Premium/);
 assert.match(css,/giant-special-notice/);
 assert.match(css,/giant-other-note/);
 assert.match(displaySource,/data-action="giant-view" data-mode="detailed"/);
 assert.doesNotMatch(logicSource+displaySource,/indexedDB|deleteDatabase|localStorage|\.clear\(/);
 assert.match(worker,/recomp-shell-v2\.6-giant-set-rounds/);
 assert.match(index,/app\.js\?v=2\.6-giant-set-rounds/);
});
