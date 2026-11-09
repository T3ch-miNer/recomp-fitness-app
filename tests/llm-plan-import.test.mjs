// Tests for parsePersonalPlan: importing a plan that an LLM generated.
// LLM output is untrusted, so every sample response lives in
// tests/fixtures/llm-responses and no model or network is ever called.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {parsePersonalPlan,previewPersonalPlan} from '../personal-plan.js';
import {blockNetwork} from './helpers/no-network.mjs';

blockNetwork();

const dir=new URL('./fixtures/llm-responses/',import.meta.url);
const raw=path=>readFileSync(new URL(path,dir),'utf8');
const list=sub=>readdirSync(new URL(sub+'/',dir)).sort();

// Every bad fixture must be listed here with the error the user will see.
// A new fixture without an expectation fails the "covers every fixture" test.
const rejections={
 'markdown-fenced.txt':/wrapped in Markdown code fences/,
 'prose-before-json.txt':/not a valid JSON file.*extra text/,
 'truncated.txt':/not a valid JSON file.*cut off/,
 'wrong-format-version.json':/Unsupported plan format.*recomp-personal-plan-v1/,
 'missing-format.json':/Unsupported plan format/,
 'top-level-array.json':/Unsupported plan format/,
 'missing-goals.json':/Daily nutrition and activity targets are required/,
 'missing-goal-field.json':/Check the daily protein target\. It must be a number from 0 to 650/,
 'missing-workouts.json':/must include 1–7 workouts/,
 'too-many-workouts.json':/must include 1–7 workouts/,
 'workout-without-exercises.json':/needs 1–20 exercises\. Check workout 1/,
 'missing-exercise-name.json':/Check the name of workout 1, exercise 2\. It must be text of 1–120 characters/,
 'title-is-a-disclaimer.json':/Plan title is \d+ characters long\. The maximum is 120/,
 'string-instead-of-number.json':/Check sets in workout 1, exercise 1\. It must be a number from 1 to 12/,
 'goal-with-units.json':/Check the daily calories target/,
 'sets-out-of-range.json':/Check sets in workout 1, exercise 2\. It must be a number from 1 to 12/,
 'negative-rest.json':/Check rest time in workout 1, exercise 1\. It must be a number from 0 to 600/,
 'crash-diet-calories.json':/calorie target needs review.*very low-calorie/,
 'invalid-meal-category.json':/Breakfast, Lunch, Dinner or Snack\. Check meal 2/,
 'null-meal-calories.json':/Check calories in meal 1/,
 'null-meal-entry.json':/Check meal 5\. Each meal suggestion must be an object/,
};

test('every good fixture imports, from text and from an already-parsed object',()=>{
 const good=list('good');
 assert.ok(good.length>=4);
 for(const file of good){
  const text=raw('good/'+file);
  const fromText=parsePersonalPlan(text);
  assert.ok(fromText.title,file);
  assert.ok(fromText.workouts.length>=1,file);
  assert.deepEqual(parsePersonalPlan(JSON.parse(text)),fromText,file+': string and object input must give the same result');
 }
});

test('a realistic plan becomes Recomp workouts, goals and meal suggestions',()=>{
 const source=JSON.parse(raw('good/full-plan.json'));
 const plan=parsePersonalPlan(raw('good/full-plan.json'));
 assert.equal(plan.title,source.title);
 assert.deepEqual(plan.goals,source.goals);
 assert.deepEqual(plan.workouts.map(w=>w.id),['personal-1','personal-2','personal-3']);
 assert.deepEqual(plan.workouts.map(w=>w.name),source.workouts.map(w=>w.name));
 assert.ok(plan.workouts.every(w=>w.source==='User-reviewed imported plan'));

 // Exercises become the app's internal tuple format.
 const [id,name,sets,reps,load,rest,,,notes,label]=plan.workouts[0].items[0];
 assert.equal(id,'personal-1-exercise-1');
 assert.equal(name,'Goblet squat');
 assert.equal(sets,3);
 assert.equal(reps,10);
 assert.equal(load,0,'the importer never prescribes a starting load');
 assert.equal(rest,90);
 assert.equal(notes,'Pick a load that leaves 2 reps in reserve');
 assert.equal(label,'3 × 10');

 assert.equal(plan.meals.length,4);
 assert.ok(plan.meals.every(m=>m.source==='Estimated · imported plan'),'meals are labelled as estimates');
 assert.deepEqual(previewPersonalPlan(plan),{title:source.title,workoutCount:3,exerciseCount:10,suggestedMeals:4,calories:2250,protein:135});
});

test('meals are optional',()=>{
 assert.deepEqual(parsePersonalPlan(raw('good/minimal-plan-no-meals.json')).meals,[]);
});

test('values exactly on every limit are accepted',()=>{
 const plan=parsePersonalPlan(raw('good/boundary-limits.json'));
 assert.equal(plan.title.length,120);
 assert.equal(plan.workouts.length,7);
 assert.equal(plan.workouts[0].items.length,20);
 assert.equal(plan.meals.length,21);
 assert.equal(plan.goals.calories,1000);
});

test('covers every bad fixture with an expected error',()=>{
 assert.deepEqual(list('bad'),Object.keys(rejections).sort());
});

for(const [file,expected] of Object.entries(rejections)){
 test('rejects '+file+' with a clear error',()=>{
  assert.throws(()=>parsePersonalPlan(raw('bad/'+file)),err=>{
   // A plain Error with a readable message, never a TypeError from bad data.
   assert.equal(err.constructor,Error,file+' threw '+err.constructor.name+': '+err.message);
   assert.match(err.message,expected);
   return true;
  });
 });
}

test('rejects wrong types for each required field',()=>{
 const plan=JSON.parse(raw('good/full-plan.json'));
 const cases=[
  [{...plan,title:42},/Plan title is missing/],
  [{...plan,goals:'2000 kcal'},/targets are required/],
  [{...plan,workouts:{name:'Full Body A'}},/1–7 workouts/],
  [{...plan,workouts:[{...plan.workouts[0],name:['Full Body A']}]},/name of workout 1/],
  [{...plan,workouts:[{...plan.workouts[0],exercises:'squats'}]},/1–20 exercises/],
  [{...plan,workouts:[{...plan.workouts[0],exercises:[['Goblet squat',3,10,90]]}]},/workout 1, exercise 1\. Each exercise must be an object/],
  [{...plan,workouts:[{...plan.workouts[0],exercises:[{...plan.workouts[0].exercises[0],reps:true}]}]},/reps in workout 1, exercise 1/],
  [{...plan,meals:[{...plan.meals[0],grams:'300g'}]},/serving grams in meal 1/],
  [{...plan,meals:[{...plan.meals[0],name:''}]},/name of meal 1/],
 ];
 for(const [input,expected] of cases)assert.throws(()=>parsePersonalPlan(input),expected);
});

test('rejects out-of-range nutrition values',()=>{
 const plan=JSON.parse(raw('good/full-plan.json'));
 const goal=(k,v)=>({...plan,goals:{...plan.goals,[k]:v}});
 assert.throws(()=>parsePersonalPlan(goal('calories',10001)),/daily calories target\. It must be a number from 0 to 10000/);
 assert.throws(()=>parsePersonalPlan(goal('protein',-1)),/daily protein target/);
 assert.throws(()=>parsePersonalPlan(goal('steps',100001)),/daily steps target/);
 assert.throws(()=>parsePersonalPlan(goal('water',12001)),/daily water target/);
 assert.throws(()=>parsePersonalPlan(goal('calories',999)),/calorie target needs review/);
 const meal=patch=>({...plan,meals:[{...plan.meals[0],...patch}]});
 assert.throws(()=>parsePersonalPlan(meal({calories:3501})),/calories in meal 1/);
 assert.throws(()=>parsePersonalPlan(meal({protein:551})),/protein in meal 1/);
 assert.throws(()=>parsePersonalPlan(meal({grams:0})),/serving grams in meal 1/);
 assert.throws(()=>parsePersonalPlan({...plan,meals:Array(22).fill(plan.meals[0])}),/at most 21 meal suggestions/);
});

test('rejects oversized files before parsing them',()=>{
 assert.throws(()=>parsePersonalPlan(' '.repeat(300001)),/exceeds 300 KB/);
});

test('drops unknown fields and cannot pollute object prototypes',()=>{
 const text=raw('good/minimal-plan-no-meals.json').replace('"goals": {','"__proto__": {"polluted": true}, "goals": {"__proto__": {"admin": true}, "extra": 1,');
 assert.match(text,/"__proto__": \{"admin": true\}/,'fixture edit must have applied');
 const plan=parsePersonalPlan(text);
 assert.deepEqual(Object.keys(plan),['title','goals','workouts','meals']);
 assert.deepEqual(Object.keys(plan.goals),['calories','protein','carbs','fat','fibre','water','steps']);
 assert.equal({}.polluted,undefined);
 assert.equal({}.admin,undefined);
 assert.equal(plan.goals.admin,undefined);
});

test('trims text, truncates long notes and replaces an invalid subtitle',()=>{
 const plan=JSON.parse(raw('good/full-plan.json'));
 plan.title='  Padded title  ';
 plan.workouts[0].subtitle='S'.repeat(161);
 plan.workouts[0].exercises[0].notes='n'.repeat(1000);
 plan.meals[0].notes='m'.repeat(1000);
 const out=parsePersonalPlan(plan);
 assert.equal(out.title,'Padded title');
 assert.equal(out.workouts[0].subtitle,'Personal plan');
 assert.equal(out.workouts[0].items[0][8].length,400);
 assert.equal(out.meals[0].notes.length,300);
});

// Known gaps, recorded so they're visible in test output. Fixing them would
// start rejecting plans that import today, so they need a product decision.
test.todo('reject fractional sets and reps such as 2.5 sets (currently accepted)');
test.todo('reject a non-array "meals" value instead of silently ignoring it');
test.todo('reject non-string notes instead of storing "[object Object]"');
