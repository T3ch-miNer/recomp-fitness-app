import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const toData=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const {getGiantGroups,availableItemsForStage,firstIncompleteStep,
 nextIncompleteStep,isRoundDone,ungroupedExerciseIndices}=await import(toData(read('giant-sets.js')));
const aUri=toData(read('fts-workouts.js'));
const {FTS_WORKOUTS}=await import(aUri);
const bUri=toData(read('fts-workouts-5-15.js').replace("from './fts-workouts.js'","from '"+aUri+"'"));
const {FTS_WORKOUTS_5_TO_15}=await import(bUri);
const {FTS_WORKOUTS_16_TO_41}=await import(toData(read('fts-workouts-16-41.js')));
const plans=[...FTS_WORKOUTS,...FTS_WORKOUTS_5_TO_15,...FTS_WORKOUTS_16_TO_41];
function sessionFromPlan(plan){
 return {name:plan.name,exercises:plan.items.map(item=>({
  id:item[0],name:item[1],ref:item[11],group:item[12],targetLabel:item[9],notes:item[8],
  sets:Array.from({length:item[2]},(_,i)=>({kg:item[7]?.[i]?.kg??item[4],reps:item[7]?.[i]?.reps??item[3],done:false}))
 }))};
}

test('audit every group in all 41 imported workouts: no lettered blocks missing',()=>{
 assert.equal(plans.length,41);
 assert.deepEqual(plans.map(p=>p.id),Array.from({length:41},(_,i)=>'fts-workout-'+(i+1)));
 assert.equal(plans.reduce((s,p)=>s+p.items.length,0),334);
 let expectedGroups=0,displayedGroups=0,exercises=0,missing=0;
 const visibility=[];
 for(const plan of plans){
  const session=sessionFromPlan(plan);
  const before=structuredClone(session);
  const expected=[...new Set(session.exercises.map(e=>e.group).filter(x=>/^[A-Z]$/.test(x)))];
  const actual=getGiantGroups(session);
  expectedGroups+=expected.length;displayedGroups+=actual.length;
  const skipped=expected.filter(id=>!actual.some(g=>g.id===id));
  missing+=skipped.length;
  visibility.push({plan:plan.name,hidden:skipped});
  assert.deepEqual(actual.map(g=>g.id),expected,plan.name+' must show groups in exercise order');
  assert.equal(ungroupedExerciseIndices(session,actual).length,0,plan.name+' must not hide exercises');
  exercises+=actual.flatMap(g=>g.items).length;
  assert.equal(new Set(actual.flatMap(g=>g.items.map(it=>it.index))).size,session.exercises.length);
  assert.deepEqual(session,before,'audit must not modify workout or logged values');
 }
 assert.equal(expectedGroups,144,'all FTS lettered groups counted');
 assert.equal(displayedGroups,144,'all groups must be available in navigator');
 assert.equal(missing,0,JSON.stringify(visibility.filter(v=>v.hidden.length)));
 assert.equal(exercises,334);
});

test('single exercises, rep ladders and mixed-set groups get correct navigation',()=>{
 const w=(n)=>getGiantGroups(sessionFromPlan(plans[n-1]));
 const solo=w(9).find(g=>g.id==='A');
 assert.equal(solo.kind,'single');
 assert.equal(solo.rounds,3);
 const ladder=w(4).find(g=>g.id==='B');
 assert.equal(ladder.kind,'sequence');
 assert.equal(ladder.rounds,8);
 assert.deepEqual(Array.from({length:8},(_,i)=>ladder.items[0].exercise.sets[i].reps),
  [20,15,10,5,20,15,10,5]);
 const mixed=w(38).find(g=>g.id==='A');
 assert.equal(mixed.kind,'mixed');
 assert.equal(mixed.rounds,4);
 assert.equal(availableItemsForStage(mixed,0).length,7);
 assert.equal(availableItemsForStage(mixed,1).length,6,'one-set squat-jump alternative is not replicated');
 assert.equal(availableItemsForStage(mixed,3).length,6);
 assert.equal(isRoundDone(mixed,0),false);
 const step=firstIncompleteStep([mixed]);
 assert.deepEqual(step,{group:'A',round:0,index:0});
 mixed.items.forEach(({exercise})=>{exercise.sets[0].done=true;});
 assert.equal(isRoundDone(mixed,0),true);
 const current={group:'A',round:0,index:mixed.items.at(-1).index};
 assert.deepEqual(nextIncompleteStep([mixed],current),{group:'A',round:1,index:0});
});

test('Workout 38 treats one-set Squat Jumps as an alternative to Tuck Jumps',()=>{
 const session=sessionFromPlan(plans[37]);
 const group=getGiantGroups(session).find(g=>g.id==='A');
 const tuck=group.items.find(item=>item.exercise.name==='Tuck Jumps');
 const squat=group.items.find(item=>item.exercise.name==='Squat Jumps');
 assert.ok(tuck&&squat,'both original movements remain recorded');
 assert.equal(group.alternativeOf.get(squat.index),tuck.index);
 const stage0=availableItemsForStage(group,0);
 assert.equal(stage0.length,7,'both exercise choices remain visible');
 stage0.filter(item=>![tuck.index,squat.index].includes(item.index)).forEach(item=>{
  item.exercise.sets[0].done=true;
 });
 assert.equal(isRoundDone(group,0),false,'one of the two variants is still needed');
 squat.exercise.sets[0].done=true;
 assert.equal(tuck.exercise.sets[0].done,false);
 assert.equal(isRoundDone(group,0),true,'performing Squat Jumps completes the choice');
 assert.equal(group.items.every(item=>!item.exercise.sets[1]||item.exercise.sets[1].done===false),true);
 const next=nextIncompleteStep([group],{group:'A',round:0,index:squat.index});
 assert.deepEqual(next,{group:'A',round:1,index:group.items[0].index});
 assert.equal(availableItemsForStage(group,3).includes(squat),false,'no extra squat-jump sets generated');
});

test('no accidental completed sets or duplicate workout refs are introduced',()=>{
 for(const plan of plans){
  const s=sessionFromPlan(plan),groups=getGiantGroups(s);
  for(const g of groups){
   for(let stage=0;stage<g.rounds;stage++){
    const visible=availableItemsForStage(g,stage);
    assert.ok(visible.length>0);
    assert.ok(visible.every(({exercise})=>exercise.sets[stage]&&!exercise.sets[stage].done));
   }
  }
  assert.deepEqual(s.exercises.map(e=>e.ref),plan.items.map(e=>e[11]));
 }
});
