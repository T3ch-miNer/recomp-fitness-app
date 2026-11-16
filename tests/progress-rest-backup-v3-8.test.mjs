import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suggestNext,setsToChange,weightStep} from '../progression.js';
import {restAlertPlan,REST_ALERT_ID} from '../rest-alert.js';
import {buildBackup,readBackup,summariseBackup,describeBackup,workoutsCsv,foodCsv,weightsCsv,toCsv,backupAge} from '../backup.js';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const sets=(kg,...reps)=>reps.map(r=>({done:true,kg,reps:r}));

test('every set hit the target, so add a small jump',()=>{
 const s=suggestNext(sets(40,8,8,8),{target:8});
 assert.equal(s.kind,'add');assert.equal(s.kg,42.5);assert.equal(s.text,'Try 42.5 kg × 8');
 assert.match(s.why,/8 reps on every set at 40 kg/);
});

test('light weights move in small steps',()=>{
 assert.equal(weightStep(6),0.5);assert.equal(weightStep(14),1);assert.equal(weightStep(60),2.5);
 assert.equal(suggestNext(sets(6,12,12),{target:12}).kg,6.5);
 assert.equal(suggestNext(sets(16,10,10,10),{target:10}).kg,17);
});

test('a missed set means stay and beat the reps',()=>{
 const s=suggestNext(sets(40,8,7,6),{target:8});
 assert.equal(s.kind,'stay');assert.equal(s.kg,40);assert.match(s.why,/2 sets you missed/);
 assert.match(suggestNext(sets(40,8,8,7),{target:8}).why,/the set you missed/);
});

test('only the heaviest sets count, and timed or empty work gets no suggestion',()=>{
 const warm=[{done:true,kg:20,reps:5},...sets(50,6,6)];
 assert.equal(suggestNext(warm,{target:6}).kg,52.5);
 assert.equal(suggestNext(sets(0,30,30),{target:30}),null);
 assert.equal(suggestNext(sets(20,30),{target:30,unit:'seconds'}),null);
 assert.equal(suggestNext([],{target:8}),null);
 assert.equal(suggestNext(sets(40,10,10),{}).kind,'add');
});

test('Use only touches undone sets at a different weight',()=>{
 const ex={sets:[{done:true,kg:40},{done:false,kg:40},{done:false,kg:42.5}]};
 assert.deepEqual(setsToChange(ex,{kg:42.5}),[1]);
 assert.deepEqual(setsToChange(ex,null),[]);
});

test('rest alert names the next set and skips paused or finished rests',()=>{
 const now=Date.parse('2026-11-08T12:00:00Z');
 const session={exercises:[{name:'Squat',sets:[{done:true,kg:60,reps:8},{done:false,kg:60,reps:8},{done:false,kg:60,reps:8}]},{name:'Row',sets:[{done:false,kg:40,reps:10}]}],
  rest:{exerciseIndex:0,endsAt:now+90000,paused:false}};
 const plan=restAlertPlan(session,now);
 assert.equal(plan.id,REST_ALERT_ID);assert.equal(plan.title,"Rest's over");
 assert.equal(plan.body,'Next: Squat · set 2 of 3 · 60 kg × 8');
 assert.equal(plan.at.getTime(),now+90000);
 session.exercises[0].sets.forEach(s=>s.done=true);
 assert.equal(restAlertPlan(session,now).body,'Next: Row · set 1 of 1 · 40 kg × 10');
 assert.equal(restAlertPlan({...session,rest:{...session.rest,paused:true}},now),null);
 assert.equal(restAlertPlan({...session,rest:{...session.rest,endsAt:now+500}},now),null);
 assert.equal(restAlertPlan({exercises:[]},now),null);
 assert.ok(REST_ALERT_ID<41000||REST_ALERT_ID>43999,'outside the reminder ids');
});

const baseState=()=>({goals:{calories:2000},food:[{date:'2026-11-01',meal:'Lunch',name:'Dal, tadka',calories:230.4,protein:12,carbs:30,fat:7}],templates:[],
 workoutHistory:[{date:'2026-11-02',name:'Foundation A',durationMin:45,exercises:[{name:'Squat',sets:[{done:true,kg:60,reps:8},{done:false,kg:60,reps:8}]}]}],
 weights:[{date:'2026-11-03',kg:77.4},{date:'2026-11-01',kg:78}],photos:[],measurements:[],dayNotes:{'2026-11-02':{text:'Good'}},dirty:true});

test('backup round trip keeps habits and drops the sync flag',()=>{
 const b=buildBackup(baseState(),{photos:[{id:'p1',data:'data:image/jpeg;base64,AAA'},{id:'bad',data:'javascript:alert(1)'}],youLocal:{habits:[{id:'h',label:'Walk'}]},now:new Date('2026-11-08T10:00:00Z')});
 assert.equal(b.format,'recomp-backup-v2');assert.equal('dirty' in b.state,false);
 const back=readBackup(JSON.stringify(b));
 assert.equal(back.photos.length,1,'only image data is restored');
 const sum=summariseBackup(back);
 assert.deepEqual([sum.workouts,sum.food,sum.weights,sum.photos,sum.notes,sum.habits],[1,1,2,1,1,1]);
 assert.equal(describeBackup(sum),'Backup from 8 November 2026: 1 workout, 1 food entry, 2 weigh-ins, 1 photo, 1 day note, 1 habit.');
});

test('old v1 backups still restore, wrong files get a clear message',()=>{
 assert.ok(readBackup(JSON.stringify({format:'recomp-backup-v1',state:baseState(),photos:[]})));
 assert.throws(()=>readBackup('not json'),/isn't a Recomp backup/);
 assert.throws(()=>readBackup('{"format":"other"}'),/isn't a Recomp backup/);
 assert.throws(()=>readBackup(JSON.stringify({format:'recomp-backup-v2',state:{food:[]}})),/damaged/);
});

test('CSV exports are spreadsheet safe',()=>{
 const w=workoutsCsv(baseState().workoutHistory).split('\r\n');
 assert.equal(w[0],'Date,Workout,Exercise,Set,kg,Reps,Session minutes');
 assert.equal(w[1],'2026-11-02,Foundation A,Squat,1,60,8,45');
 assert.equal(w.length,3,'only completed sets');
 assert.match(foodCsv(baseState().food),/"Dal, tadka",,230,12,30,7/);
 assert.equal(weightsCsv(baseState().weights).split('\r\n')[1],'2026-11-01,78');
 assert.equal(toCsv(['a'],[['=SUM(A1)']]),'a\r\n"\'=SUM(A1)"\r\n','formulas are neutralised');
});

test('backup age nudges after two weeks',()=>{
 const now=Date.parse('2026-11-20T12:00:00Z');
 assert.deepEqual(backupAge(null,now),{text:'Never backed up',due:true});
 assert.deepEqual(backupAge('2026-11-20T08:00:00Z',now),{text:'Backed up today',due:false});
 assert.deepEqual(backupAge('2026-11-19T08:00:00Z',now),{text:'Backed up yesterday',due:false});
 assert.equal(backupAge('2026-11-01T08:00:00Z',now).due,true);
});

test('app wiring for v3.8',()=>{
 const app=read('app.js'),sw=read('sw.js'),pkg=JSON.parse(read('package.json'));
 assert.match(app,/\$\{nextWeightCard\(e,i\)\}/);
 assert.match(app,/case 'apply-next-weight':/);
 assert.match(app,/targetReps:n\(reps\)/);
 assert.match(app,/if\(document\.hidden\)void scheduleRestAlert\(state\?\.session\);else void cancelRestAlert\(\);/);
 assert.match(app,/case 'export-csv':await exportCsv\(\);/);
 assert.match(app,/accept="\.json,application\/json"/);
 assert.match(app,/replaceYouData\(backup\.youLocal\)/);
 for(const f of ['progression.js','rest-alert.js','backup.js'])assert.ok(sw.includes("'./"+f+"'"),f);
 assert.ok(pkg.dependencies['@capacitor/filesystem']);assert.ok(pkg.dependencies['@capacitor/share']);
});
