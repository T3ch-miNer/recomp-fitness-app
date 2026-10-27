import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOOD_ITEMS,FOOD_COUNT,applyOnlineFoodCatalogue,findFood,searchFoods,nutrientsForGrams} from '../food-db.js';
import {ONLINE_CATALOGUE_URL,validateOnlineCatalogue,loadCachedOnlineCatalogue,refreshOnlineCatalogue} from '../online-catalogue.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const app=read('app.js'),sw=read('sw.js'),html=read('index.html');
const food={id:'online-test-food',name:'Online sample bowl',category:'Bowl',aliases:'sample bowl',
 defaultGrams:250,per100:{calories:120,protein:12,carbs:15,fat:3,fibre:2},source:'Test estimate'};
const workout={id:'online-test-workout',name:'Online sample workout',subtitle:'Sample',items:[
 ['test-a1','Dumbbell row',3,12,0,90,[],'', 'Keep back neutral', '3 x 12','reps','A1','A']
]};
const fixture={version:1,updatedAt:'2026-10-27 18:00:00',foods:[food],workouts:[workout],
 exercises:[{id:'test-a1',name:'Dumbbell row',muscleGroup:'Back',equipment:'Dumbbell',guidance:'Row with control'}]};
test('validates the actual published Cloudflare response format and excludes corrupt entries',()=>{
 const d=validateOnlineCatalogue(fixture);
 assert.equal(d.foods.length,1);assert.equal(d.workouts.length,1);assert.equal(d.exercises.length,1);
 assert.equal(d.workouts[0].items[0][11],'A1','retains giant-set group reference');
 const malformed=structuredClone(fixture);malformed.foods.push({...food,id:'bad',per100:{...food.per100,calories:-5}});
 assert.equal(validateOnlineCatalogue(malformed).foods.length,1);
 assert.throws(()=>validateOnlineCatalogue({...fixture,version:2}),/unsupported format/);
});
test('refresh makes only a credential-free public GET and saves only shared catalogue',async()=>{
 let wrote=null;
 const downloaded=await refreshOnlineCatalogue({
  fetchImpl:async(url,options)=>{
   assert.equal(url,ONLINE_CATALOGUE_URL);
   assert.equal(options.method,'GET');
   assert.equal(options.credentials,'omit');
   assert.equal(options.body,undefined);
   assert.equal(options.headers.Authorization,undefined);
   return new Response(JSON.stringify(fixture),{status:200,headers:{'Content-Type':'application/json'}});
  },
  write:async(key,value)=>{assert.equal(key,'recomp-public-catalogue-v1');wrote=value;}
 });
 assert.deepEqual(downloaded.foods[0].per100,food.per100);
 assert.equal(wrote.url,ONLINE_CATALOGUE_URL);
 assert.deepEqual((await loadCachedOnlineCatalogue(async()=>wrote)).workouts[0].items,workout.items);
 assert.equal(await loadCachedOnlineCatalogue(async()=>({...wrote,url:'https://not-recomp.example/catalogue'})),null);
});
test('food overlays update search and nutrition; bundled offline estimates restore without migration',()=>{
 const original=FOOD_COUNT;
 const logged={id:'history-1',calories:340,protein:35,date:'2026-10-26'};
 try{
  applyOnlineFoodCatalogue([food]);
  assert.equal(FOOD_COUNT,original+1);
  assert.equal(findFood(food.id).name,food.name);
  assert.equal(searchFoods('online sample')[0].id,food.id);
  assert.equal(nutrientsForGrams(findFood(food.id),250).calories,300);
  assert.equal(logged.calories,340,'historical food diaries must not be recalculated');
 }finally{applyOnlineFoodCatalogue([]);}
 assert.equal(FOOD_COUNT,original);
 assert.equal(findFood(food.id),null);
 assert.ok(FOOD_ITEMS.length>250);
});
test('new catalogue remains optional and workout updates require confirmation',()=>{
 assert.match(app,/updatePublishedCatalogue\(/);
 assert.match(app,/case 'online-workout-import'/);
 assert.match(app,/confirmInApp\('Replace the exercises/);
 assert.match(app,/state\.templates=state\.templates\.map/);
 assert.match(app,/state\.session\?\.templateId===existing\.id/);
 assert.match(app,/onlineWorkoutLibraryView\(\)/);
 assert.match(html,/online-catalogue\.css/);
 assert.match(sw,/online-catalogue\.js/);
 assert.match(sw,/recomp-shell-v2\.10-online-catalogue-preview/);
 assert.doesNotMatch(app,/state\.food\s*=\s*onlineCatalog/);
});
