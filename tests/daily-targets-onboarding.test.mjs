import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GOAL_FIELDS,validateGoalDraft} from '../goal-draft.js';
import {dailyTargetsSetupHtml,shouldShowDailyTargetsSetup,DAILY_TARGETS_SETUP_NOTE} from '../daily-targets-onboarding.js';

const sample={calories:2200,protein:150,carbs:250,fat:65,fibre:30,water:2500,steps:8000};
const file=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');

test('first-use questionnaire contains the existing seven daily target fields',()=>{
 const markup=dailyTargetsSetupHtml(sample);
 for(const key of GOAL_FIELDS){
  assert.match(markup,new RegExp('name="'+key+'"'),'Target '+key+' missing');
  assert.ok(markup.includes('value="'+sample[key]+'"'));
 }
 assert.match(markup,/Food & nutrition/);
 assert.match(markup,/Water & movement/);
 assert.match(markup,/Save targets & start tracking/);
 assert.match(markup,/role="dialog"/);
 assert.match(markup,/aria-modal="true"/);
 assert.match(markup,/type="number"/);
 assert.equal((markup.match(/type="number"/g)||[]).length,7);
});

test('onboarding warns the current questionnaire is temporary and more questions will follow',()=>{
 const markup=dailyTargetsSetupHtml(sample);
 assert.ok(DAILY_TARGETS_SETUP_NOTE.includes('temporary'));
 assert.ok(DAILY_TARGETS_SETUP_NOTE.includes('More questions'));
 assert.ok(markup.includes(DAILY_TARGETS_SETUP_NOTE));
 assert.match(markup,/starting placeholders, not personalized/);
});

test('new users are prompted, existing saved users are exempt, pending setup resumes',()=>{
 assert.equal(shouldShowDailyTargetsSetup({completed:false,welcomeOpen:false}),true);
 assert.equal(shouldShowDailyTargetsSetup({completed:true,welcomeOpen:false}),false);
 assert.equal(shouldShowDailyTargetsSetup({completed:false,welcomeOpen:true}),false);
 const app=file('../app.js');
 assert.match(app,/dailyTargetsOnboarded:false/);
 assert.match(app,/if\(hadSavedState&&typeof state\.dailyTargetsOnboarded!=='boolean'\)state\.dailyTargetsOnboarded=true/);
 assert.match(app,/function maybeShowInitialDailyTargets\(\)/);
 assert.match(app,/onGuest:.*queueMicrotask\(maybeShowInitialDailyTargets\)/);
 assert.match(app,/queueMicrotask\(maybeShowInitialDailyTargets\)/);
 assert.match(app,/await persist\(\);render\(\)/);
 assert.match(app,/maybeShowInitialDailyTargets\(\);/);
 assert.match(app,/setTimeout\(\(\)=>maybeShowDailyTaskPrompt\(\),0\)/);
});

test('goals are validated with existing settings input limits',()=>{
 assert.deepEqual(validateGoalDraft(Object.fromEntries(GOAL_FIELDS.map(k=>[k,String(sample[k])]))),sample);
 assert.throws(()=>validateGoalDraft({...Object.fromEntries(GOAL_FIELDS.map(k=>[k,String(sample[k])])),calories:'-12'}));
});

test('new offline assets and cache version are wired into the HTML',()=>{
 const page=file('../index.html'),sw=file('../sw.js');
 assert.ok(page.includes('daily-targets-onboarding.css?v=2.9.7-initial-targets'));
 assert.ok(page.includes('app.js?v=2.10-online-catalogue-preview'));
 assert.match(sw,/recomp-shell-v3\.0-personal-plan-preview/);
 assert.ok(sw.includes("'./daily-targets-onboarding.js'"));
 assert.ok(sw.includes("'./daily-targets-onboarding.css'"));
});

test('questionnaire form handles errors without marking completion and traps focus',()=>{
 const src=file('../daily-targets-onboarding.js');
 assert.match(src,/const values=validateGoalDraft\(readGoalDraft\(form\)\)/);
 assert.match(src,/await onSave\(values\)/);
 assert.match(src,/error\.textContent=err\?\.message/);
 assert.match(src,/event\.key==='Escape'/);
 assert.match(src,/event\.key!=='Tab'/);
});
