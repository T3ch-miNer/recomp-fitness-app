import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const foodSource=await readFile(new URL('../food-db.js',import.meta.url),'utf8');
const foodUrl='data:text/javascript;base64,'+Buffer.from(foodSource).toString('base64');
const foodDb=await import(foodUrl);
const plannerSource=await readFile(new URL('../meal-planner.js',import.meta.url),'utf8');
const confirmSource=await readFile(new URL('../confirmation-dialog.js',import.meta.url),'utf8');
const confirmUrl='data:text/javascript;base64,'+Buffer.from(confirmSource).toString('base64');
const estimatesSource=await readFile(new URL('../recipe-estimates.js',import.meta.url),'utf8');
const estimatesUrl='data:text/javascript;base64,'+Buffer.from(estimatesSource.replace("from './food-db.js'","from '"+foodUrl+"'")).toString('base64');
const plannerUrl='data:text/javascript;base64,'+Buffer.from(plannerSource.replace("from './food-db.js'","from '"+foodUrl+"'").replace("from './recipe-estimates.js'","from '"+estimatesUrl+"'").replace("from './confirmation-dialog.js'","from '"+confirmUrl+"'")).toString('base64');
const {catalogueRecipeFromFood,groceryItems,parseIngredients}=await import(plannerUrl);
const keys=['calories','protein','carbs','fat','fibre'];

test('all 290 Indian foods can become separate editable four-serving recipes',()=>{
 assert.equal(foodDb.FOOD_COUNT,290);
 const converted=foodDb.FOOD_ITEMS.map(catalogueRecipeFromFood);
 assert.equal(new Set(converted.map(r=>r.id)).size,290);
 for(const recipe of converted){
  assert.ok(recipe.sourceFoodId,recipe.id);
  assert.ok(recipe.batchGrams>0&&recipe.batchGrams<=5000,recipe.id);
  assert.ok(recipe.ingredients.length>0,recipe.id);
  assert.ok(recipe.ingredients.every(x=>x.unit==='g'&&x.amount>0&&x.name),recipe.id);
  assert.ok(recipe.steps.includes('not a verified cooking method'),recipe.id);
  assert.ok(recipe.kcal>=0 && recipe.protein>=0,recipe.id);
 }
});

test('catalogue estimated macros scale by cooked-weight batch size',()=>{
 for(const id of ['roti','rajma','dal-tadka','chicken-curry','mooli-paratha','fish-tikka','paneer-methi']){
  const food=foodDb.findFood(id),recipe=catalogueRecipeFromFood(food);
  const macros=foodDb.nutrientsForGrams(food,food.defaultGrams*4);
  assert.equal(recipe.batchGrams,food.defaultGrams*4,id);
  for(const [k,v] of Object.entries(macros))assert.equal(recipe[k==='calories'?'kcal':k],v,id+' '+k);
 }
});

test('shopping quantities aggregate existing starter and imported recipes',()=>{
 const imported=catalogueRecipeFromFood(foodDb.findFood('roti'));
 const custom={id:'custom',ingredients:parseIngredients('200 g whole-wheat flour (atta)\n4 pcs eggs')};
 const plan={recipes:[custom,imported],weeks:{'2026-10-19':[custom.id,imported.id,'','','','','']}};
 const grocery=groceryItems(plan,'2026-10-19');
 const flour=grocery.find(x=>x.name==='whole-wheat flour (atta)'&&x.unit==='g');
 assert.ok(flour&&flour.amount>200);
 assert.ok(grocery.some(x=>x.name==='eggs'&&x.amount===4));
});

test('data model keeps imported recipes separate from immutable food catalogue',()=>{
 const original=foodDb.findFood('roti');
 const imported=catalogueRecipeFromFood(original);
 imported.name='Edited household flatbread';
 imported.ingredients[0].amount+=10;
 assert.equal(foodDb.findFood('roti').name,'Roti / Chapati');
 assert.equal(foodDb.findFood('roti').ingredients[0].grams,70);
 assert.notEqual(imported.name,foodDb.findFood('roti').name);
});

test('existing planner state uses opt-in imports, without automatic replacement',()=>{
 assert.ok(plannerSource.includes('if(!state.recipePlanner'));
 assert.ok(plannerSource.includes('p.recipes.push(recipe)'));
 assert.ok(plannerSource.includes("if(p.recipes.some(r=>r.sourceFoodId===food.id))"));
 assert.ok(!plannerSource.includes('p.recipes=FOOD_ITEMS'));
});
