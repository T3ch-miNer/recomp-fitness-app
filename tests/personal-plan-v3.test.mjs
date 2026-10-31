import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {validateFitnessProfile,buildPersonalPlanningPrompt,parsePersonalPlan,previewPersonalPlan,PERSONAL_PLAN_FORMAT} from '../personal-plan.js';
import {FITNESS_MODES,requiresModeSelection} from '../fitness-mode.js';
import {SUPPLEMENTAL_RECIPE_ESTIMATES} from '../popular-foods.js';
import {FOOD_ITEMS} from '../food-db.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const app=read('app.js'),html=read('index.html'),sw=read('sw.js');
const profile={goal:'body-recomposition',diet:'vegetarian',equipment:'gym',age:'29',
 heightCm:'170',weightKg:'72',waistCm:'86',days:'3',minutes:'45',activity:'moderate',notes:'Prefer Indian meals'};
const sample={format:PERSONAL_PLAN_FORMAT,title:'Sample routine for testing',
 goals:{calories:2200,protein:140,carbs:245,fat:70,fibre:30,water:2500,steps:8000},
 workouts:[{name:'Full Body Sample',subtitle:'Mon Wed Fri',exercises:[
  {name:'Goblet squat',sets:3,reps:10,restSeconds:90,notes:'Use a manageable weight'},
  {name:'Dumbbell row',sets:3,reps:12,restSeconds:60}
 ]}],
 meals:[{name:'Dal and rice',meal:'Lunch',grams:350,calories:450,protein:19,carbs:66,fat:11,fibre:8,notes:'Estimated recipe'}]};
test('basic vs advanced onboarding applies only to new users',()=>{
 assert.deepEqual(FITNESS_MODES,['basic','advanced']);
 assert.equal(requiresModeSelection(),true);
 assert.equal(requiresModeSelection({hasSavedState:true}),false);
 assert.equal(requiresModeSelection({mode:'basic'}),false);
 assert.match(app,/state\.fitnessMode='advanced'/);
 assert.match(app,/if\(mode==='basic'&&firstChoice\)state\.templates=basicWorkoutTemplates\(\)/);
 assert.match(app,/state\.fitnessMode==='basic'\?state\.templates\.filter/);
 assert.match(app,/if\(state\.fitnessMode==='basic'&&\!\['A','B'\]\.includes\(id\)\)return/);
 assert.match(app,/maybeShowFitnessMode\(\);maybeShowInitialDailyTargets\(\)/);
});
test('private profile produces copyable self-directed GPT request rather than sending any health records',()=>{
 const p=validateFitnessProfile(profile);
 assert.equal(p.age,29);
 assert.equal(p.waistCm,86);
 assert.equal(p.goal,'body-recomposition');
 const prompt=buildPersonalPlanningPrompt(profile,{measurements:{chest:39,belly:34,neck:15,wrist:6.5,unknown:42}});
 assert.match(prompt,/recomp-personal-plan-v1/);
 assert.match(prompt,/"chest":39/);
 assert.match(prompt,/"belly":34/);
 assert.doesNotMatch(prompt,/unknown/,'unrecognised profile data must not be copied');
 assert.match(prompt,/Indian\/global meals/);
 assert.match(prompt,/vegetarian/);
 assert.match(prompt,/Review/);
 assert.match(prompt,/1–120 characters/);
 assert.match(prompt,/under 80/);
 assert.match(prompt,/title\.length is at most 120/);
 assert.match(prompt,/downloadable UTF-8 file named recomp-plan\.json/);
 assert.match(prompt,/workout subtitles or supporting notes, never in the plan title/);
 assert.doesNotMatch(prompt,/in the plan title\/subtitle/);
 assert.throws(()=>validateFitnessProfile({...profile,age:'13'}),/age/);
 assert.doesNotMatch(app,/fetch\([^)]*fitnessProfile/);
});
test('versioned plan JSON converts into safe Recomp workout tuples and optional meal suggestions',()=>{
 const plan=parsePersonalPlan(JSON.stringify(sample));
 assert.equal(plan.workouts.length,1);
 assert.equal(plan.workouts[0].items[0][2],3);
 assert.equal(plan.workouts[0].items[0][5],90);
 assert.equal(plan.meals.length,1);
 assert.deepEqual(previewPersonalPlan(plan),{title:sample.title,workoutCount:1,exerciseCount:2,suggestedMeals:1,calories:2200,protein:140});
 assert.throws(()=>parsePersonalPlan('{}'),/Unsupported plan format/);
 assert.equal(parsePersonalPlan({...sample,title:'X'.repeat(120)}).title.length,120);
 assert.throws(()=>parsePersonalPlan({...sample,title:'X'.repeat(121)}),/Plan title is 121 characters long\. The maximum is 120 characters/);
 assert.throws(()=>parsePersonalPlan({...sample,title:'  '}),/Plan title is missing/);
 assert.throws(()=>parsePersonalPlan('{broken'),/JSON file/);
 assert.throws(()=>parsePersonalPlan({...sample,goals:{...sample.goals,calories:600}}),/calorie target/i);
 assert.throws(()=>parsePersonalPlan({...sample,workouts:[{name:'X',exercises:[{name:'X',sets:300,reps:100,restSeconds:0}]}]}),/sets/);
 assert.throws(()=>parsePersonalPlan({...sample,meals:[{...sample.meals[0],meal:'Lunch<script>'}]}),/meal needs/);
 assert.match(app,/case 'personal-plan-apply'/);
 assert.match(app,/confirmInApp\('Import '/);
 assert.match(app,/state\.templates\.filter\(t=>!t\.personalImported\)/);
 assert.match(app,/state\.personalMeals=structuredClone\(p\.meals\)/);
 assert.match(app,/case 'log-personal-meal'/);
});
test('more Indian and global recipe estimates have distinct IDs and are ingredient-derived',()=>{
 assert.equal(SUPPLEMENTAL_RECIPE_ESTIMATES.length,30);
 assert.equal(new Set(SUPPLEMENTAL_RECIPE_ESTIMATES.map(e=>e.id)).size,30);
 assert.ok(SUPPLEMENTAL_RECIPE_ESTIMATES.every(e=>!FOOD_ITEMS.some(f=>f.id===e.id)));
 assert.ok(SUPPLEMENTAL_RECIPE_ESTIMATES.every(e=>e.source.includes('not lab verified')));
 assert.ok(SUPPLEMENTAL_RECIPE_ESTIMATES.every(e=>e.defaultGrams>0&&Object.values(e.per100).every(v=>Number.isFinite(v)&&v>=0)));
 const job=spawnSync(process.execPath,['catalogue-worker/scripts/build-popular-food-seed.mjs'],{encoding:'utf8',cwd:new URL('..',import.meta.url).pathname});
 assert.equal(job.status,0,job.stderr);
 assert.equal((job.stdout.match(/^INSERT OR IGNORE INTO foods/gm)||[]).length,30);
 assert.doesNotMatch(job.stdout,/^(DELETE|UPDATE|DROP|REPLACE|BEGIN|COMMIT)\b/gm);
});
test('new modules are precached and existing user state is never cleared',()=>{
 for(const file of ['fitness-mode.js','personal-plan.js','personalisation.css'])assert.ok(sw.includes("'./"+file+"'"));
 assert.match(html,/personalisation\.css/);
 assert.doesNotMatch(app,/indexedDB\.deleteDatabase|localStorage\.clear\(/);
});
