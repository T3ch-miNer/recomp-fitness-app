import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const source=read('giant-sets.js');
const logicUrl='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const logic=await import(logicUrl);
const viewSource=read('giant-set-view.js');
const viewUrl='data:text/javascript;base64,'+Buffer.from(viewSource.replace("'./giant-sets.js'","'"+logicUrl+"'")).toString('base64');
const {renderGiantSetView}=await import(viewUrl);
const {FTS_WORKOUTS}=await import('data:text/javascript;base64,'+Buffer.from(read('fts-workouts.js')).toString('base64'));
const app=read('app.js'),sw=read('sw.js'),css=read('giant-sets.css'),index=read('index.html');
function sessionFromPlan(plan){
 return {name:plan.name,exercises:plan.items.map(item=>({
  id:item[0],name:item[1],restSeconds:item[5],alts:item[6],
  notes:item[8],targetLabel:item[9],unit:item[10],ref:item[11],group:item[12],
  sets:Array.from({length:item[2]},(_,i)=>({kg:item[7]?.[i]?.kg??item[4],reps:item[7]?.[i]?.reps??item[3],done:false}))
 }))};
}
test('real FTS leg day yields A1 A2 A3 rounds, B and C without mutating user data',()=>{
 const session=sessionFromPlan(FTS_WORKOUTS[0]),before=structuredClone(session);
 const groups=logic.getGiantGroups(session);
 assert.deepEqual(groups.map(g=>[g.id,g.items.length,g.rounds]),[['A',3,3],['B',3,3],['C',4,2]]);
 assert.deepEqual(groups[0].items.map(x=>x.exercise.ref),['A1','A2','A3']);
 assert.deepEqual(logic.firstIncompleteStep(groups),{group:'A',round:0,index:0});
 assert.deepEqual(session,before);
});
test('completing A1 R1 advances to A2 R1, A3 R1, then A1 R2',()=>{
 const session=sessionFromPlan(FTS_WORKOUTS[0]),groups=logic.getGiantGroups(session),a=groups[0];
 let cursor=logic.firstIncompleteStep(groups);
 assert.equal(cursor.index,0);
 a.items[0].exercise.sets[0].done=true;
 cursor=logic.nextIncompleteStep(groups,cursor);
 assert.deepEqual(cursor,{group:'A',round:0,index:1});
 a.items[1].exercise.sets[0].done=true;
 cursor=logic.nextIncompleteStep(groups,cursor);
 assert.deepEqual(cursor,{group:'A',round:0,index:2});
 a.items[2].exercise.sets[0].done=true;
 assert.equal(logic.isRoundDone(a,0),true);
 cursor=logic.nextIncompleteStep(groups,cursor);
 assert.deepEqual(cursor,{group:'A',round:1,index:0});
 assert.equal(a.items[0].exercise.sets[1].done,false,'round 2 is never marked automatically');
 assert.equal(a.items[0].exercise.sets[0].done,true);
});
test('an existing manually selected completed set remains reachable for Undo',()=>{
 const session=sessionFromPlan(FTS_WORKOUTS[0]);
 session.exercises[0].sets[0].done=true;
 session.giantCursor={group:'A',round:0,index:0};
 const groups=logic.getGiantGroups(session);
 assert.deepEqual(logic.pickGiantCursor(session,groups),session.giantCursor);
 assert.equal(logic.nextIncompleteStep(groups,session.giantCursor).index,1);
});
test('irregular or single-exercise groups are left in Detailed View, not falsely assigned rounds',()=>{
 const session=sessionFromPlan(FTS_WORKOUTS[3]),groups=logic.getGiantGroups(session);
 for(const group of groups)assert.ok(group.items.every(item=>item.exercise.sets.length===group.rounds));
 const ungrouped=logic.ungroupedExerciseIndices(session,groups);
 assert.equal(ungrouped.length+groups.flatMap(g=>g.items).length,session.exercises.length);
 assert.equal(groups.some(g=>g.id==='B'),false,
  'Workout 4 descending 20–15–10–5 twice is not eight simple giant-set rounds');
 assert.ok(ungrouped.some(i=>session.exercises[i].group==='B'),
  'All pyramid set values remain accessible in Detailed View');
 const custom={exercises:[{name:'Only movement',group:'A',sets:[{done:false}]}]};
 assert.equal(logic.getGiantGroups(custom).length,0);
});
test('phone round UI shows one editable set from original plan with manual navigation',()=>{
 const session=sessionFromPlan(FTS_WORKOUTS[0]);
 const before=JSON.stringify(session);
 let markup=renderGiantSetView(session);
 assert.match(markup,/Group A/);
 assert.match(markup,/Round 1/);
 assert.match(markup,/Leg Press/);
 assert.match(markup,/Dumbbell Romanian Deadlift/);
 assert.match(markup,/Wall Sit/);
 assert.match(markup,/data-action="giant-group"/);
 assert.match(markup,/data-action="giant-round"/);
 assert.match(markup,/data-action="giant-exercise"/);
 assert.match(markup,/data-setfield="kg" data-ex="0" data-set="0"/);
 assert.match(markup,/data-setfield="reps" data-ex="0" data-set="0"/);
 assert.match(markup,/data-action="tick-set" data-ex="0" data-set="0"/);
 assert.match(markup,/Complete &amp; next exercise|Complete & next exercise/);
 session.giantCursor={group:'C',round:1,index:6};
 markup=renderGiantSetView(session);
 assert.match(markup,/Round 2/);
 assert.match(markup,/Crunches/);
 assert.equal(JSON.stringify(session),JSON.stringify({...JSON.parse(before),giantCursor:{group:'C',round:1,index:6}}));
});
test('custom exercise names and coach notes are escaped',()=>{
 const session=sessionFromPlan(FTS_WORKOUTS[0]);
 session.exercises[0].name='<script>alert(1)</script>';
 session.exercises[0].notes='<img onerror=alert(1)>';
 const html=renderGiantSetView(session);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('&lt;img'));
 assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('<img onerror'));
});
test('app uses same set completion and detailed view, skippable suggested rest, no data reset',()=>{
 assert.match(app,/getGiantGroups\(s\)/);
 assert.match(app,/renderGiantSetView\(s\)/);
 assert.match(app,/case 'giant-view'/);
 assert.match(app,/case 'giant-round'/);
 assert.match(app,/case 'giant-group'/);
 assert.match(app,/case 'giant-exercise'/);
 assert.match(app,/nextIncompleteStep\(groups,current\)/);
 assert.match(app,/suggested:true,giantGroup/);
 assert.match(app,/const seconds=60/);
 assert.match(app,/s\.giantView==='detailed'/);
 assert.match(app,/class="input set-input"/);
 assert.match(viewSource,/data-setfield="kg"/);
 assert.match(viewSource,/data-setfield="reps"/);
 for(const k of ['deleteDatabase','recomp-fitness-v2'])assert.ok(!source.includes(k));
 assert.match(app,/await confirmInApp\('Discard this unfinished workout/);
});
test('PWA caches new round tracker and keeps existing premium colours',()=>{
 for(const name of ['giant-sets.js','giant-set-view.js','giant-sets.css'])assert.ok(sw.includes("'./"+name+"'"));
 assert.match(sw,/recomp-shell-v2\.9-online-content-preview/);
 assert.match(index,/giant-sets\.css\?v=2\.6/);
 assert.match(index,/app\.js\?v=2\.9-online-content-preview/);
 assert.match(css,/var\(--accent\)/);
 assert.match(css,/var\(--panel\)/);
});
