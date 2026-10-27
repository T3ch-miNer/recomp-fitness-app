import test from 'node:test';
import assert from 'node:assert/strict';
import {FOOD_ITEMS,FOOD_COUNT,searchFoods,nutrientsForGrams,applyOnlineFoodCatalogue} from '../food-db.js';
import {INGREDIENT_REFERENCE} from '../food-db.js';
import {makeRecipeVariations} from '../recipe-variations.js';
const extra=FOOD_ITEMS.filter(x=>x.id.startsWith('meal-v3-'));
const main=FOOD_ITEMS.filter(x=>!x.id.startsWith('meal-v3-'));
test('the offline catalogue contains 1,000 genuinely ingredient-composed meal variations',()=>{
 assert.equal(extra.length,1000);
 assert.ok(FOOD_COUNT>=1000);
 assert.equal(new Set(FOOD_ITEMS.map(x=>x.id)).size,FOOD_ITEMS.length);
 assert.equal(new Set(FOOD_ITEMS.map(x=>x.name.toLowerCase())).size,FOOD_ITEMS.length);
 assert.ok(extra.every(x=>x.ingredients.length>=2));
 assert.ok(extra.every(x=>x.source.includes('approximate')));
 assert.ok(extra.every(x=>x.defaultGrams>0 && x.defaultGrams<=1500));
 assert.ok(extra.some(x=>/Dal Tadka with/i.test(x.name)));
 assert.ok(extra.some(x=>/Paneer/i.test(x.name)));
});
test('nutrition for meal variations follows weighted ingredient and recipe maths',()=>{
 for(const f of extra){
  assert.ok(Number.isFinite(f.yieldGrams)&&f.yieldGrams>0);
  for(const key of ['calories','protein','carbs','fat','fibre'])
   assert.ok(Number.isFinite(f.per100[key])&&f.per100[key]>=0&&f.per100[key]<1000,f.name+' '+key);
  const grams=f.ingredients.reduce((sum,i)=>sum+i.grams,0);
  assert.ok(grams>0);
  const totals=[0,0,0,0,0];
  for(const ing of f.ingredients){
   const entry=INGREDIENT_REFERENCE[ing.name];assert.ok(entry,ing.name);
   entry.forEach((v,i)=>totals[i]+=v*ing.grams/100);
  }
  // Existing base per-100 macros are rounded before the extra side is combined.
  assert.ok(Math.abs(totals[0]/f.yieldGrams*100-f.per100.calories)<2,f.name);
 }
});
test('generated recipes are searchable offline and do not alter historical entries',()=>{
 const f=extra[0];
 assert.equal(searchFoods(f.name).at(0)?.id,f.id);
 assert.ok(nutrientsForGrams(f,f.defaultGrams).calories>0);
 const oldCount=FOOD_COUNT,oldMacro=f.per100.calories;
 applyOnlineFoodCatalogue([{...f,per100:{...f.per100,calories:oldMacro+5}}]);
 try{assert.equal(FOOD_COUNT,oldCount);assert.equal(searchFoods(f.name)[0].per100.calories,oldMacro+5);}
 finally{applyOnlineFoodCatalogue([]);}
 assert.equal(FOOD_COUNT,oldCount);
});
test('generator rejects malformed requests',()=>{
 assert.throws(()=>makeRecipeVariations(main,INGREDIENT_REFERENCE,0),/Invalid recipe expansion/);
});
