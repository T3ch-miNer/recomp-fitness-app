import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recipeCollection,filterCollection,recipeFromCollection,COLLECTION_TAGS} from '../recipe-collection.js';
import {estimateBatchNutrition} from '../recipe-estimates.js';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const list=recipeCollection();

test('the collection has 40+ recipes with unique ids and names',()=>{
 assert.ok(list.length>=40,'got '+list.length);
 assert.equal(new Set(list.map(r=>r.id)).size,list.length);
 assert.equal(new Set(list.map(r=>r.name.toLowerCase())).size,list.length);
 for(const r of list)assert.match(r.id,/^collection-[a-z0-9-]+$/);
});

test('every recipe has complete nutrition and a sensible per-serving size',()=>{
 for(const r of list){
  const kcal=r.kcal/4,protein=r.protein/4;
  assert.ok(kcal>=350&&kcal<=800,r.name+' kcal '+kcal);
  assert.ok(protein>=18,r.name+' protein '+protein);
  assert.ok([r.carbs,r.fat,r.fibre].every(v=>Number.isFinite(v)&&v>=0),r.name);
  // Protein and fat calories can't exceed the total, give or take rounding in the reference values.
  assert.ok(r.protein*4+r.fat*9<=r.kcal*1.08,r.name+' macros add up');
 }
});

test('recipes avoid the planner default exclusions',()=>{
 const banned=/\b(tomato|tomatoes|lemon|lime|orange|citrus|coffee|tofu|soya|soy)\b/i;
 for(const r of list){
  for(const i of r.ingredients)assert.ok(!banned.test(i.name),r.name+': '+i.name);
 }
});

test('every recipe has a numbered method and parseable ingredients',()=>{
 for(const r of list){
  const steps=r.steps.split('\n');
  assert.ok(steps.length>=3,r.name);
  steps.forEach((s,i)=>assert.ok(s.startsWith((i+1)+'. '),r.name+' step '+(i+1)));
  assert.ok(['Rice','Chapati','Pasta','Other'].includes(r.base),r.name);
  assert.ok(r.mins>=10&&r.mins<=60,r.name);
  for(const i of r.ingredients)assert.ok(i.amount>0&&['g','ml','pcs'].includes(i.unit),r.name+' '+i.name);
 }
});

test('filters cover every tag and search looks at ingredients too',()=>{
 for(const [tag] of COLLECTION_TAGS)assert.ok(filterCollection(list,{tag}).length>=4,'tag '+tag);
 assert.equal(filterCollection(list,{tag:'all'}).length,list.length);
 assert.ok(filterCollection(list,{tag:'vegan'}).every(r=>r.tags.includes('vegetarian')));
 assert.ok(filterCollection(list,{tag:'beef-turkey'}).every(r=>!r.tags.includes('chicken')));
 assert.ok(filterCollection(list,{tag:'quick'}).every(r=>r.mins<=30));
 const salmon=filterCollection(list,{query:'salmon'});
 assert.ok(salmon.length>=2&&salmon.every(r=>/salmon/i.test(r.name+r.ingredients.map(i=>i.name).join(' '))));
 assert.deepEqual(filterCollection(list,{tag:'fish',query:'paneer'}),[]);
});

test('adding a recipe makes an independent, editable copy',()=>{
 const src=list[0],copy=recipeFromCollection(src);
 assert.equal(copy.sourceCollectionId,src.id);
 copy.ingredients[0].amount=1;
 assert.notEqual(src.ingredients[0].amount,1,'collection is not changed');
 assert.ok(Object.isFrozen(src));
});

test('new estimator ingredients are recognised',()=>{
 const out=estimateBatchNutrition([{name:'salmon',amount:100,unit:'g'},{name:'chicken thigh',amount:100,unit:'g'},{name:'fat free greek yoghurt',amount:100,unit:'g'},{name:'red onion',amount:100,unit:'g'},{name:'mushrooms',amount:100,unit:'g'}]);
 assert.equal(out.complete,true,out.missing.join(', '));
 assert.equal(out.totals.protein,Math.round((20.4+19.7+10.3+1.1+3.1)*10)/10);
});

test('planner shows the collection and can add recipes',()=>{
 const planner=read('meal-planner.js');
 assert.match(planner,/button\('open-collection','Browse '\+recipeCollection\(\)\.length\+' Recomp recipes'/);
 assert.match(planner,/view==='collection'\?collectionView\(\)/);
 assert.match(planner,/kind==='add-collection'\|\|kind==='add-collection-all'/);
 assert.match(read('sw.js'),/'\.\/recipe-collection\.js'/);
});

test('Android Back steps through the Advanced journey before anything else',()=>{
 const app=read('app.js');
 const i=app.indexOf('async function handleAndroidBack(){');
 const body=app.slice(i,i+1200);
 assert.ok(body.indexOf("getElementById('recomp-personal-journey')")<body.indexOf('.nf-overlay,.mp-overlay'),'journey is checked first');
 assert.match(body,/\[data-journey-back\]:not\(\[disabled\]\)'\)\|\|journey\.querySelector\('\[data-journey-close\]'\)/);
});

test('Android build packages are pinned to exact versions',()=>{
 const pkg=JSON.parse(read('package.json'));
 for(const [name,version] of Object.entries({...pkg.dependencies,'@capacitor/cli':pkg.devDependencies['@capacitor/cli']}))
  assert.match(version,/^\d+\.\d+\.\d+$/,name+' is '+version);
});
