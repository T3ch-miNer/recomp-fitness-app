import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBasicProfile,generateBasicProgramme,BASIC_GOALS} from '../basic-programmes.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sample={age:29,gender:'prefer-not-to-say',heightCm:174,weightKg:72,goal:'recomposition',
 equipment:'gym',experience:'beginner',focus:'balanced',days:3,minutes:45};
test('Basic asks about age, gender, height, weight and goal before creating a programme',()=>{
 const p=validateBasicProfile(sample);
 assert.equal(p.age,29);assert.equal(p.heightCm,174);assert.equal(p.weightKg,72);
 assert.throws(()=>validateBasicProfile({...sample,age:10}),/Age/);
 assert.throws(()=>validateBasicProfile({...sample,heightCm:0}),/Height/);
 assert.throws(()=>validateBasicProfile({...sample,weightKg:500}),/Weight/);
 const ui=read('basic-onboarding.js');
 for(const value of ['age','gender','heightCm','weightKg','goal','equipment','experience','focus','days','minutes'])assert.match(ui,new RegExp(value));
 assert.match(read('app.js'),/maybeShowBasicOnboarding\(\)/);
});
test('Every preset programme provides 2–4 real trackable workout days across all goals and equipment',()=>{
 for(const [goal] of BASIC_GOALS)for(const equipment of ['gym','home','bodyweight'])for(const days of [2,3,4]){
  const plan=generateBasicProgramme({...sample,goal,equipment,days});
  assert.equal(plan.weeks,4);
  assert.equal(plan.daysOfWeek.length,days);
  assert.equal(plan.workouts.length,days);
  for(const w of plan.workouts){
   assert.ok(w.basicGenerated);
   assert.ok(w.items.length>=4);
   assert.ok(w.items.every(x=>x.length>=7&&x[1]&&x[2]>=2&&x[3]>0&&x[4]===0));
   assert.equal(new Set(w.items.map(x=>x[0])).size,w.items.length);
  }
 }
});
test('Routine options change by goal and training focus, not assumptions about gender',()=>{
 const a=generateBasicProgramme({...sample,gender:'male'});
 const b=generateBasicProgramme({...sample,gender:'female'});
 assert.deepEqual(a.workouts,b.workouts);
 const muscle=generateBasicProgramme({...sample,goal:'build-muscle',focus:'upper'});
 const fat=generateBasicProgramme({...sample,goal:'lose-fat',focus:'lower'});
 assert.notDeepEqual(muscle.workouts,fat.workouts);
 const noEquipment=generateBasicProgramme({...sample,equipment:'bodyweight'});
 assert.ok(noEquipment.workouts.some(w=>w.items.some(e=>/Bodyweight|Glute|Wall|Incline|Plank|Prone|Dead Bug/i.test(e[1]))));
});
test('Basic templates can be started, while existing history remains untouched',()=>{
 const app=read('app.js'),sw=read('sw.js'),html=read('index.html');
 assert.match(app,/template\.basicGenerated/);
 assert.match(app,/state\.templates\.filter\(t=>!t\.basicGenerated\)/);
 assert.match(app,/state\.workoutHistory/);
 assert.match(app,/case 'basic-profile'/);
 for(const p of ['basic-onboarding.js','basic-programmes.js','basic-onboarding.css'])assert.ok(sw.includes("'./"+p+"'"));
 assert.match(html,/basic-onboarding\.css/);
});
test('Android beta login relies on Clerk unique package callback, not the original APK shared URI',()=>{
 const integration=read('scripts/integrate-android-native.py');
 const main=read('android-src/MainActivity.java');
 assert.doesNotMatch(integration,/<data android:scheme="clerk"/);
 assert.doesNotMatch(main,/RecompAuthCallback\.handle/);
 assert.match(integration,/applicationIdSuffix "\.beta"/);
});
