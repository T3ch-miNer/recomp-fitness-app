// v3.2.1 journey feedback: multi-select answers, "Other" boxes, required
// starting point, activity examples, tape intro, injuries, staying in place
// on tap, returning to the review after an edit, and Import AI plan in Settings.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {draftFromSaved,readJourneyDraft,validateJourneyStep,makeJourneyResult,applyJourneyChoice,nextJourneyStep,choiceList,JOURNEY_DRAFT_KEY,JOURNEY_MULTI_CHOICE} from '../personal-journey.js';
import {validateFitnessProfile,buildPersonalPlanningPrompt} from '../personal-plan.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const journey=source('personal-journey.js'),app=source('app.js');

function completeDraft(){
 const d=draftFromSaved();
 Object.assign(d.fields,{age:'30',heightCm:'170',weightKg:'70',sexForEstimate:'female'});
 return d;
}

test('extra goals, training style and diet are multi-select',()=>{
 assert.deepEqual(JOURNEY_MULTI_CHOICE,['secondaryGoal','trainingStyle','diet']);
 const d=completeDraft();
 applyJourneyChoice(d,'diet','vegetarian');
 applyJourneyChoice(d,'diet','pescatarian');
 assert.deepEqual(d.fields.diet,['vegetarian','pescatarian'],'picking vegetarian unticks the default Mixed diet');
 applyJourneyChoice(d,'diet','halal');
 assert.deepEqual(d.fields.diet,['vegetarian','pescatarian','halal'],'halal combines with anything');
 applyJourneyChoice(d,'diet','pescatarian');
 assert.deepEqual(d.fields.diet,['vegetarian','halal'],'tapping a selected option removes it');
 applyJourneyChoice(d,'diet','omnivore');
 assert.deepEqual(d.fields.diet,['halal','omnivore'],'Mixed diet unticks vegetarian, vegan and pescatarian');
 Object.assign(d.fields,{diet:['vegetarian','pescatarian']});
 applyJourneyChoice(d,'secondaryGoal','strength');
 applyJourneyChoice(d,'secondaryGoal','endurance');
 applyJourneyChoice(d,'trainingStyle','cardio');
 const profile=validateFitnessProfile(makeJourneyResult(d).profile);
 assert.deepEqual(profile.diet,['vegetarian','pescatarian']);
 assert.deepEqual(profile.secondaryGoal,['strength','endurance']);
 assert.deepEqual(profile.trainingStyle,['balanced','cardio']);
 // Single-choice questions still replace the answer.
 applyJourneyChoice(d,'cuisine','global');applyJourneyChoice(d,'cuisine','indian');
 assert.equal(d.fields.cuisine,'indian');
});

test('profiles saved before multi-select still load and validate',()=>{
 const d=draftFromSaved({goal:'lose-fat',diet:'vegan',secondaryGoal:'none',trainingStyle:'strength',days:3,minutes:45});
 assert.deepEqual(d.fields.diet,['vegan']);
 assert.deepEqual(d.fields.secondaryGoal,[]);
 assert.deepEqual(d.fields.trainingStyle,['strength']);
 const legacy=validateFitnessProfile({goal:'lose-fat',diet:'halal',secondaryGoal:'mobility',trainingStyle:'balanced'});
 assert.deepEqual(legacy.diet,['halal']);
 assert.deepEqual(legacy.secondaryGoal,['mobility']);
 assert.deepEqual(validateFitnessProfile({goal:'maintain',secondaryGoal:'none'}).secondaryGoal,[]);
 assert.throws(()=>validateFitnessProfile({goal:'maintain',diet:['vegetarian','keto']}),/dietary preference/);
 assert.deepEqual(choiceList('strength,unknown,endurance','secondaryGoal'),['strength','endurance']);
});

test('at least one diet and one training style are needed',()=>{
 const d=completeDraft();
 d.fields.diet=[];
 assert.throws(()=>validateJourneyStep(d,4),/at least one way you like to eat/);
 d.fields.diet=['vegan'];d.fields.trainingStyle=[];
 assert.throws(()=>validateJourneyStep(d,3),/at least one training style/);
});

test('"Other" for diet or cuisine opens a text box that must be filled in',()=>{
 const d=completeDraft();
 applyJourneyChoice(d,'diet','other');
 assert.throws(()=>validateJourneyStep(d,4),/Describe your diet/);
 d.fields.dietOther='Jain, no onion or garlic';
 d.fields.cuisine='other';
 assert.throws(()=>validateJourneyStep(d,4),/food that feels like home/);
 d.fields.cuisineOther='Ethiopian';
 assert.equal(validateJourneyStep(d,4),true);
 const prompt=buildPersonalPlanningPrompt(validateFitnessProfile(makeJourneyResult(d).profile));
 assert.match(prompt,/"dietOther":"Jain, no onion or garlic"/);
 assert.match(prompt,/"cuisineOther":"Ethiopian"/);
 // Text for an option that is no longer picked is dropped.
 applyJourneyChoice(d,'diet','other');d.fields.cuisine='indian';
 const profile=validateFitnessProfile(makeJourneyResult(d).profile);
 assert.equal(profile.dietOther,'');
 assert.equal(profile.cuisineOther,'');
 assert.match(journey,/name="'\+esc\(key\)\+'"/);
 assert.match(journey,/field\('dietOther','Describe your diet'/);
 assert.match(journey,/field\('cuisineOther','Which cuisine\?'/);
});

test('age, height, weight and sex are required',()=>{
 const d=draftFromSaved();
 assert.throws(()=>validateJourneyStep(d,1),/Enter your age/);
 Object.assign(d.fields,{age:'30',heightCm:'170',weightKg:''});
 assert.throws(()=>validateJourneyStep(d,1),/Enter your weight in kg/);
 d.fields.weightKg='70';
 assert.throws(()=>validateJourneyStep(d,1),/Choose an option for sex/);
 d.fields.sexForEstimate='male';
 assert.equal(validateJourneyStep(d,1),true);
 assert.doesNotMatch(journey,/'Sex for calorie estimate \(optional\)'/);
});

test('each activity level has a short everyday example',()=>{
 for(const phrase of ['Desk job or studying','Short walks, errands','Brisk daily walks','A physical job'])
  assert.ok(journey.includes(phrase),phrase);
});

test('measurements start with a "grab your tape" intro and stay optional',()=>{
 const d=completeDraft();
 assert.equal(d.tapeReady,false);
 assert.match(journey,/Grab a measuring tape/);
 assert.match(journey,/every one you add helps your AI coach tailor your workouts/);
 assert.match(journey,/'Skip for now'/);
 assert.equal(validateJourneyStep(d,2),true,'skipping measurements is allowed');
 assert.equal(draftFromSaved({}, {chest:40}).tapeReady,true,'people who already measured skip the intro');
});

test('injuries ask what, when, how it is now, and what to be careful with',()=>{
 const d=completeDraft();
 applyJourneyChoice(d,'hasInjury','yes');
 assert.throws(()=>validateJourneyStep(d,3),/Describe the injury/);
 d.fields.injuryDetails='Left knee ligament strain';
 assert.throws(()=>validateJourneyStep(d,3),/when the injury happened/);
 d.fields.injuryWhen='6-weeks-6-months';
 assert.throws(()=>validateJourneyStep(d,3),/how the injury is now/);
 d.fields.injuryRecovery='recovering';
 d.fields.injuryCare='Avoid deep squats';
 assert.equal(validateJourneyStep(d,3),true);
 const profile=validateFitnessProfile(makeJourneyResult(d).profile);
 assert.equal(profile.hasInjury,'yes');
 assert.equal(profile.injuryRecovery,'recovering');
 const prompt=buildPersonalPlanningPrompt(profile);
 assert.match(prompt,/"injuryDetails":"Left knee ligament strain"/);
 assert.match(prompt,/If hasInjury is "yes".*start movements that load the affected area gently/i);
 assert.match(prompt,/physiotherapist or doctor/);
 assert.match(prompt,/Never diagnose/);
 // Answering "No" clears any earlier injury details.
 applyJourneyChoice(d,'hasInjury','no');
 const cleared=validateFitnessProfile(makeJourneyResult(d).profile);
 assert.deepEqual([cleared.injuryDetails,cleared.injuryWhen,cleared.injuryRecovery,cleared.injuryCare],['','','','']);
 assert.throws(()=>validateFitnessProfile({goal:'maintain',hasInjury:'yes',injuryWhen:'yesterday'}),/injuryWhen/);
});

test('tapping an option keeps the scroll position and focus',()=>{
 assert.match(journey,/function render\(keepPlace=null,direction=''\)/);
 assert.match(journey,/scroller\.scrollTop=scrollTop/);
 assert.match(journey,/focus\(\{preventScroll:true\}\)/);
 assert.match(journey,/render\(same\('data-journey-choice'/);
});

test('editing from the review step returns to the review',()=>{
 const d=completeDraft();
 d.step=5;
 d.step=0;d.editingFromReview=true;
 nextJourneyStep(d);
 assert.equal(d.step,5);
 assert.equal(d.editingFromReview,false);
 nextJourneyStep(Object.assign(d,{step:1}));
 assert.equal(d.step,2,'normal Continue still moves one step');
 assert.match(journey,/'Save & back to review'/);
 const memory=new Map([[JOURNEY_DRAFT_KEY,JSON.stringify({version:1,step:2,editingFromReview:true,fields:{}})]]);
 assert.equal(readJourneyDraft({getItem:k=>memory.get(k)}).editingFromReview,true,'survives closing and reopening');
});

test('Settings always offers Import AI plan, and applying it opens the workouts',()=>{
 assert.match(app,/data-action="personal-plan-upload">Import AI plan/);
 const settingsCard=app.slice(app.indexOf('<div class="card fitness-mode-settings">'),app.indexOf('<div class="card settings-account-card">'));
 assert.match(settingsCard,/personal-plan-upload/,'import is in the Training experience card for both modes');
 assert.match(app,/state\.fitnessMode==='basic'\?' Recomp will also switch you to Advanced mode/);
 assert.match(app,/state\.fitnessMode='advanced';state\.basicOnboardingPending=false;/);

 assert.match(journey,/const clearError=/,'a fixed problem clears its error message');
 assert.match(app,/tab='workouts';state.lastTab='workouts';settingsPage=null;lastMotionPage=null;personalImportReview=null;modal=null;/);
});
