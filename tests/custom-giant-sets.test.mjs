import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const toData=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const {nextAvailableGroup,listCustomGiantSets,saveCustomGiantSet,removeCustomGiantSet}=await import(toData(read('custom-giant-sets.js')));
const {getGiantGroups,isRoundDone,nextIncompleteStep}=await import(toData(read('giant-sets.js')));
const app=read('app.js'),worker=read('sw.js'),css=read('giant-sets.css');
const make=()=>{
 const item=(id,name,reps=10)=>[id,name,3,reps,12.5,45,[],[{kg:12.5,reps}],name+' coaching note',`3 × ${reps} reps`,'reps','',''];
 return {id:'custom-user-plan',name:'My Workout',items:[item('a','Squat'),item('b','Press'),item('c','Rows'),item('d','Curls')]};
};
const sessionFor=plan=>({
 groupSettings:structuredClone(plan.groupSettings||{}),
 exercises:plan.items.map(item=>({
  id:item[0],name:item[1],group:item[12],ref:item[11],notes:item[8],targetLabel:item[9],restSeconds:item[5],
  sets:Array.from({length:item[2]},(_,i)=>({kg:item[7]?.[i]?.kg??item[4],reps:item[7]?.[i]?.reps??item[3],done:false}))
 }))
});

test('a user can create a two-to-four exercise giant set with chosen rounds and rest',()=>{
 const before=make(),snapshot=structuredClone(before);
 assert.equal(nextAvailableGroup(before),'A');
 const next=saveCustomGiantSet(before,{indices:[0,2,1],rounds:4,restSeconds:90,notes:'No break until all three are finished'});
 assert.deepEqual(before,snapshot,'original plan remains untouched');
 assert.equal(next.items[3],before.items[3],'ungrouped exercises are not changed');
 assert.deepEqual(next.items.map(e=>e[12]),['A','A','A','']);
 assert.deepEqual(next.items.slice(0,3).map(e=>e[11]),['A1','A2','A3'],'plan order wins over selection order');
 assert.ok(next.items.slice(0,3).every(e=>e[2]===4));
 assert.equal(next.items[0][7],before.items[0][7],'logged starting weights stay intact');
 assert.equal(next.items[0][8],before.items[0][8],'coach notes stay intact');
 assert.equal(next.groupSettings.A.kind,'giant');
 assert.equal(next.groupSettings.A.restSeconds,90);
 assert.equal(listCustomGiantSets(next)[0].items.length,3);
 const groups=getGiantGroups(sessionFor(next));
 assert.deepEqual(groups.map(g=>[g.id,g.rounds,g.custom,g.restSeconds]),[['A',4,true,90]]);
 assert.equal(nextAvailableGroup(next),'B');
});

test('editing and removing a group never deletes exercises or weights',()=>{
 const original=make();
 const created=saveCustomGiantSet(original,{indices:[0,1,2],rounds:3,restSeconds:90});
 const changed=saveCustomGiantSet(created,{groupId:'A',indices:[0,2,3],rounds:2,restSeconds:120,notes:'Giant set revision'});
 assert.deepEqual(changed.items.map(x=>x[12]),['A','','A','A']);
 assert.equal(changed.items[1][2],3,'removed member keeps its original set count');
 assert.equal(changed.items[1][7],original.items[1][7],'saved data never overwritten');
 assert.equal(changed.items[0][2],2);
 assert.equal(changed.groupSettings.A.restSeconds,120);
 assert.equal(changed.groupSettings.A.notes,'Giant set revision');
 const removed=removeCustomGiantSet(changed,'A');
 assert.equal(removed.items.length,4);
 assert.ok(removed.items.every(item=>!item[12]&&!item[11]));
 assert.deepEqual(removed.items.map(x=>x[7]),original.items.map(x=>x[7]));
 assert.equal(listCustomGiantSets(removed).length,0);
 assert.equal(nextAvailableGroup(removed),'A');
 assert.equal(created.items[1][12],'A','past edited copy stays unchanged');
});

test('two independent giant sets are available in the same personal plan',()=>{
 const first=saveCustomGiantSet(make(),{indices:[0,1],rounds:3,restSeconds:45});
 const second=saveCustomGiantSet(first,{indices:[2,3],rounds:2,restSeconds:0});
 assert.deepEqual(listCustomGiantSets(second).map(x=>x.id),['A','B']);
 const groups=getGiantGroups(sessionFor(second));
 assert.deepEqual(groups.map(x=>[x.id,x.items.length,x.rounds,x.restSeconds]),
  [['A',2,3,45],['B',2,2,0]]);
 const firstRound=groups[0];
 firstRound.items.forEach(({exercise})=>exercise.sets[0].done=true);
 assert.equal(isRoundDone(firstRound,0),true);
 const cursor=nextIncompleteStep(groups,{group:'A',round:0,index:1});
 assert.deepEqual(cursor,{group:'A',round:1,index:0});
 assert.equal(second.items[2][7][0].kg,12.5);
});

test('invalid or conflicting group operations are rejected without state mutation',()=>{
 const p=make(),before=JSON.stringify(p);
 for(const args of [
  {indices:[0],rounds:3},
  {indices:[0,0],rounds:3},
  {indices:[0,9],rounds:3},
  {indices:[0,1],rounds:0},
  {indices:[0,1],rounds:13},
  {indices:[0,1],rounds:3,restSeconds:901},
  {indices:[0,1],rounds:3,notes:'x'.repeat(351)}
 ])assert.throws(()=>saveCustomGiantSet(p,args));
 assert.equal(JSON.stringify(p),before);
 const a=saveCustomGiantSet(p,{indices:[0,1],rounds:3});
 assert.throws(()=>saveCustomGiantSet(a,{indices:[1,2],rounds:2}),/ungrouped/);
 assert.throws(()=>removeCustomGiantSet(a,'Z'));
 assert.throws(()=>saveCustomGiantSet(a,{groupId:'Z',indices:[2,3],rounds:2}));
 assert.equal(a.items[0][12],'A');
});

test('giant-set editing is exposed in the Recomp mobile app and cached offline',()=>{
 for(const action of ['add-custom-giant-set','edit-custom-giant-set','remove-custom-giant-set'])
  assert.ok(app.includes("case '"+action+"'"),action);
 assert.match(app,/form-custom-giant-set/);
 assert.match(app,/data\.getAll\('member'\)/);
 assert.match(app,/groupSettings:structuredClone\(template.groupSettings\|\|\{\}\)/);
 assert.match(app,/groupSettings:structuredClone\(desired.groupSettings\|\|\{\}\)/);
 assert.match(app,/group\.custom\?/);
 assert.match(app,/totalSeconds:seconds/);
 assert.match(css,/custom-group-members/);
 assert.ok(worker.includes("'./custom-giant-sets.js'"));
 assert.doesNotMatch(read('custom-giant-sets.js'),/indexedDB|localStorage|\.put\(|workoutHistory\.push/);
});
