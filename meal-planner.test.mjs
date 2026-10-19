// Run with: node --test meal-planner.test.mjs
// The data URL keeps this test compatible with an app that uses browser ES modules
// without adding a Node package.json to the production PWA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./meal-planner.js',import.meta.url),'utf8');
const foodSource=await readFile(new URL('./food-db.js',import.meta.url),'utf8');
const foodUrl='data:text/javascript;base64,'+Buffer.from(foodSource).toString('base64');
const estimatesSource=await readFile(new URL('./recipe-estimates.js',import.meta.url),'utf8');
const estimatesUrl='data:text/javascript;base64,'+Buffer.from(estimatesSource.replace("from './food-db.js'","from '"+foodUrl+"'")).toString('base64');
const moduleSource=source.replace("from './food-db.js'","from '"+foodUrl+"'").replace("from './recipe-estimates.js'","from '"+estimatesUrl+"'");
const {monday,addDays,parseIngredients,avoidedIngredients,groceryItems}=
  await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));

test('weeks start on Monday in local time',()=>{
 assert.equal(monday('2026-10-21'),'2026-10-19');
 assert.equal(addDays('2026-10-25',1),'2026-10-26');
 assert.equal(monday('2026-10-25'),'2026-10-19');
});
test('recipe ingredients have amounts, units and names',()=>{
 assert.deepEqual(parseIngredients('0.5 kg carrots\n8 pcs eggs'),[
  {name:'carrots',amount:0.5,unit:'kg'},
  {name:'eggs',amount:8,unit:'pcs'}
 ]);
 assert.throws(()=>parseIngredients('a handful of carrots'),/line 1/);
 assert.throws(()=>parseIngredients('0 g lentils'),/Check ingredient/);
});
test('ingredient filters recognise citrus, tomato and soya',()=>{
 const ingredients=[{name:'lemon juice'},{name:'tomatoes'},{name:'tofu cubes'},{name:'spinach'}];
 assert.deepEqual(avoidedIngredients({ingredients},'tomato, citrus, soya'),['lemon juice','tomatoes','tofu cubes']);
 assert.deepEqual(avoidedIngredients({ingredients:[{name:'spinach'}]},'tomato'),[]);
});
test('grocery shopping merges batches once, converting kg to grams',()=>{
 const planner={
  recipes:[
   {id:'r1',ingredients:parseIngredients('0.7 kg chicken breast\n260 g dry rice\n2 pcs eggs')},
   {id:'r2',ingredients:parseIngredients('700 g chicken breast\n220 g dry rice\n2 pcs eggs')}
  ],
  weeks:{'2026-10-19':['r1','r2','','','','','']}
 };
 const list=groceryItems(planner,'2026-10-19');
 const amount=(name,unit)=>list.find(x=>x.name===name&&x.unit===unit)?.amount;
 assert.equal(amount('chicken breast','g'),1400);
 assert.equal(amount('dry rice','g'),480);
 assert.equal(amount('eggs','pcs'),4);
 assert.equal(list.length,3);
});
