import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JOURNEY_DRAFT_KEY,JOURNEY_STAGES,JOURNEY_MEASUREMENTS,draftFromSaved,readJourneyDraft,validateJourneyStep,makeJourneyResult,toInches,fromInches,showPersonalJourney} from '../personal-journey.js';
import {validateFitnessProfile,buildPersonalPlanningPrompt} from '../personal-plan.js';
const files=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const memory=new Map();
const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
test('six sequential, labelled stages are available and integration uses the new journey',()=>{
 assert.equal(JOURNEY_STAGES.length,6);
 assert.equal(new Set(JOURNEY_STAGES.map(x=>x.name)).size,6);
 for(const stage of JOURNEY_STAGES){assert.ok(stage.title.length>8);assert.ok(stage.sub.length>25);}
 const app=files('app.js'),html=files('index.html'),sw=files('sw.js');
 assert.match(app,/import \{showPersonalJourney,JOURNEY_MEASUREMENTS\}/);
 assert.match(app,/case 'fitness-profile':launchPersonalJourney\(\);break;/);
 assert.match(app,/setTimeout\(\(\)=>launchPersonalJourney\(\),0\)/);
 assert.match(app,/state\.measurements=\[\.\.\.state\.measurements/);
 assert.match(html,/personal-journey\.css/);
 for(const f of ['personal-journey.js','personal-journey.css'])assert.match(sw,new RegExp(f.replace('.','\\.')));
 assert.doesNotMatch(app,/case 'fitness-profile':modal=\{type:'fitness-profile'\}/);
 assert.ok(files('personal-journey.css').includes('prefers-reduced-motion'));
});
test('21 body points include original measurements and extended bilateral fields',()=>{
 const keys=JOURNEY_MEASUREMENTS.map(x=>x[0]);
 assert.equal(keys.length,21);
 assert.equal(new Set(keys).size,keys.length);
 for(const key of ['chest','belly','below','shoulders','neck','rightBicep','leftBicep','rightThigh','leftThigh','rightCalf','leftCalf','wrist','hips','naturalWaist','rightForearm','leftForearm','rightAnkle','leftAnkle'])
  assert.ok(keys.includes(key),key);
 assert.ok(JOURNEY_MEASUREMENTS.every(x=>['upper','core','lower'].includes(x[2])));
});
test('centimetre-inch conversions are consistent and unknown measurements remain absent',()=>{
 assert.equal(toInches(100,'cm'),39.4);
 assert.equal(fromInches(39.4,'cm'),100.1);
 assert.equal(toInches(42,'in'),42);
 assert.equal(fromInches(undefined,'in'),'');
 const draft=draftFromSaved({goal:'lose-fat',age:26,days:3,minutes:45},
  {chest:39.5,belly:34,unknown:11});
 assert.equal(draft.fields.goal,'lose-fat');
 assert.equal(draft.fields.age,'26');
 assert.deepEqual(Object.keys(draft.measurements).sort(),['belly','chest']);
});
test('local draft survives resume, avoids unknown keys, and recovers invalid storage',()=>{
 memory.clear();
 const base=draftFromSaved();
 base.step=3;base.zone='lower';base.unit='in';base.fields.goal='build-muscle';
 base.fields.allergies='peanuts';base.measurements.rightCalf=15.6;
 storage.setItem(JOURNEY_DRAFT_KEY,JSON.stringify(base));
 const r=readJourneyDraft(storage,{},null);
 assert.equal(r.step,3);assert.equal(r.zone,'lower');assert.equal(r.unit,'in');
 assert.equal(r.fields.goal,'build-muscle');
 assert.equal(r.measurements.rightCalf,15.6);
 storage.setItem(JOURNEY_DRAFT_KEY,'not-json');
 assert.equal(readJourneyDraft(storage,{goal:'lose-fat'},null).fields.goal,'lose-fat');
});
test('all stages validate optional and required ranges without collecting unknown facts',()=>{
 const d=draftFromSaved();
 for(let i=0;i<5;i++)assert.equal(validateJourneyStep(d,i),true);
 d.fields.age='17';
 assert.throws(()=>validateJourneyStep(d,1),/Age/);
 d.fields.age='29';d.fields.heightCm='250';
 assert.throws(()=>validateJourneyStep(d,1),/Height/);
 d.fields.heightCm='180';
 d.fields.days='0';assert.throws(()=>validateJourneyStep(d,3),/Training days/);
 d.fields.days='3';d.fields.minutes='200';
 assert.throws(()=>validateJourneyStep(d,3),/Workout duration/);
 d.fields.minutes='45';d.fields.sleepHours='17';
 assert.throws(()=>validateJourneyStep(d,4),/Sleep hours/);
});
test('expanded data validates into an AI prompt with preferred cuisine and privacy safeguards',()=>{
 const d=draftFromSaved();
 Object.assign(d.fields,{goal:'body-recomposition',diet:'vegetarian',equipment:'home',
  age:'30',heightCm:'173',weightKg:'73',days:'4',minutes:'50',targetWeeks:'12',
  allergies:'peanuts',avoidFoods:'mushrooms',exerciseLimits:'avoid deep knee flexion',
  cuisine:'indian',experience:'beginner',foodNotes:'dal and rice',sleepHours:'7.5'});
 d.measurements.naturalWaist=32.5;d.measurements.hips=39.5;
 const res=makeJourneyResult(d);
 assert.equal(res.profile.waistCm,'82.6');
 const validated=validateFitnessProfile(res.profile);
 assert.equal(validated.experience,'beginner');
 assert.equal(validated.cuisine,'indian');
 assert.equal(validated.sleepHours,7.5);
 assert.equal(validated.allergies,'peanuts');
 const prompt=buildPersonalPlanningPrompt(validated,{measurements:res.measurements});
 assert.match(prompt,/"naturalWaist":32.5/);
 assert.match(prompt,/"hips":39.5/);
 assert.match(prompt,/peanuts/);
 assert.match(prompt,/dal and rice/);
 assert.match(prompt,/1–120 characters/);
 assert.match(prompt,/downloadable UTF-8 file/);
 assert.doesNotMatch(prompt,/unknown measurement/i);
});
test('journey cannot launch without DOM or a saving callback',()=>{
 assert.throws(()=>showPersonalJourney({onSave:()=>{}}),/document/);
});
