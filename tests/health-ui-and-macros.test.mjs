import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const foodSource=readFileSync(new URL('../food-db.js',import.meta.url),'utf8');
const foodUrl='data:text/javascript;base64,'+Buffer.from(foodSource).toString('base64');
const estimateSource=readFileSync(new URL('../recipe-estimates.js',import.meta.url),'utf8');
const estimateUrl='data:text/javascript;base64,'+Buffer.from(estimateSource.replace("from './food-db.js'","from '"+foodUrl+"'")).toString('base64');
const {estimateBatchNutrition}=await import(estimateUrl);
const healthSource=readFileSync(new URL('../health-connect.js',import.meta.url),'utf8');
const {validateDailyActivity,mergeDailyActivity,nativeHealthAvailable,readHealthConnectDay}=await import('data:text/javascript;base64,'+Buffer.from(healthSource).toString('base64'));

test('ingredient-based batch estimate recognises common dry weights and eggs',()=>{
 const output=estimateBatchNutrition([
  {name:'chicken breast',amount:700,unit:'g'},
  {name:'dry rice',amount:0.26,unit:'kg'},
  {name:'eggs',amount:4,unit:'pcs'}
 ]);
 assert.equal(output.complete,true);
 assert.ok(output.totals.kcal>1000 && output.totals.protein>170);
 assert.ok(output.totals.carbs>190);
});

test('unknown ingredients and unverified volumes do not produce a complete estimate',()=>{
 for(const data of [
  [{name:'mystery house sauce',amount:100,unit:'g'}],
  [{name:'cooking oil',amount:2,unit:'tbsp'}],
  [{name:'eggs',amount:200,unit:'ml'}]
 ]){
  const result=estimateBatchNutrition(data);
  assert.equal(result.complete,false);
  assert.ok(result.missing.length>=1);
 }
});

test('converted catalogue ingredients can be estimated when ingredient labels are recognised',()=>{
 const result=estimateBatchNutrition([
  {name:'whole-wheat flour (atta)',amount:70,unit:'g'},
  {name:'cooking oil',amount:8,unit:'g'},
  {name:'cooked chickpeas',amount:100,unit:'g'}
 ]);
 assert.equal(result.complete,true);
 assert.ok(result.totals.kcal>300);
});

test('Health Connect data validates date, ranges, and preserves historical activity',()=>{
 const today='2026-10-19';
 const clean=validateDailyActivity({date:today,steps:9876,activeCalories:430.67},today);
 assert.equal(clean.steps,9876);
 assert.equal(clean.activeCalories,430.7);
 assert.equal(clean.source,'Health Connect');
 const old=[{date:'2026-10-18',steps:6000,activeCalories:120},{date:today,steps:1000,activeCalories:50,notes:'keep'}];
 const merged=mergeDailyActivity(old,clean);
 assert.equal(merged.length,2);
 assert.equal(merged.find(x=>x.date==='2026-10-18').steps,6000);
 assert.equal(merged.find(x=>x.date===today).steps,9876);
 assert.equal(merged.find(x=>x.date===today).notes,'keep');
 assert.throws(()=>validateDailyActivity({date:today,steps:-5,activeCalories:10},today));
 assert.throws(()=>validateDailyActivity({date:'2026-10-18',steps:5,activeCalories:10},today));
});

test('plain web PWA has no false native health connection',async()=>{
 assert.equal(nativeHealthAvailable(),false);
 await assert.rejects(()=>readHealthConnectDay('2026-10-19'),/native Recomp Android app/);
});

test('navigation remains all four existing tabs with labelled icon buttons',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../nav-capsule.css',import.meta.url),'utf8');
 assert.ok(app.includes("['home','home','Home']"));
 assert.ok(app.includes("['workouts','dumbbell','Workouts']"));
 assert.ok(app.includes("['nutrition','food','Nutrition']"));
 assert.ok(app.includes("['body','chart','Body']"));
 assert.ok(app.includes('aria-label="${label}" title="${label}"'));
 assert.ok(css.includes('.bottom-btn.active'));
 assert.ok(css.includes('prefers-reduced-motion'));
});
