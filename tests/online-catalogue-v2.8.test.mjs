import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as client from '../catalogue-client.js';
import * as foods from '../food-db.js';
import {handleCatalogue} from '../catalogue-worker/worker.js';
const root=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const endpoint='https://recomp-catalogue.example.workers.dev/v1/catalogue';
const sampleFood={id:'online-korean-bowl',name:'Korean rice bowl',category:'Rice dishes',aliases:'bibimbap',
 defaultGrams:420,per100:{calories:165,protein:9,carbs:21,fat:5,fibre:2},source:'Testing only'};
const sampleWorkout={id:'korean-test-workout',name:'Starter upper body',subtitle:'2 exercises',
 items:[['bench','Chest press',3,10,0,90,['Push-ups']],['row','Seated row',3,12,0,90,[]]]};
const response={version:1,updatedAt:'2026-10-23 10:00:00',foods:[sampleFood],workouts:[sampleWorkout],
 exercises:[{id:'row',name:'Seated row',muscleGroup:'Back',equipment:'Cable',guidance:'Pull evenly.'}]};
const storage=new Map();
function mockStorage(){
 const previous=globalThis.localStorage;
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 return ()=>{storage.clear();if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;};
}
test('online catalogue accepts public HTTPS URL only, no secrets or arbitrary paths',()=>{
 const reset=mockStorage();
 try{
  assert.equal(client.saveCatalogueUrl(endpoint),endpoint);
  assert.equal(client.getCatalogueUrl(),endpoint);
  for(const url of ['http://example.org/v1/catalogue','https://user:pass@example.org/v1/catalogue',
  'https://example.org/v1/catalogue?token=sensitive','https://example.org/admin'])
   assert.throws(()=>client.saveCatalogueUrl(url));
  client.saveCatalogueUrl('');
  assert.equal(client.getCatalogueUrl(),'');
 }finally{reset();}
});
test('catalogue validation excludes invalid and oversized foods while keeping valid data',()=>{
 const result=client.normaliseCatalogue({...response,foods:[sampleFood,{...sampleFood,id:'bad-macro',per100:{...sampleFood.per100,calories:-1}}]});
 assert.equal(result.foods.length,1);assert.equal(result.workouts.length,1);assert.equal(result.exercises.length,1);
 assert.throws(()=>client.normaliseCatalogue({foods:[],workouts:[],exercises:[]}),/version 1/);
 assert.equal(client.normaliseCatalogue({...response,workouts:[{...sampleWorkout,items:[['untrusted','Bad',-1,0,0,0,[]]]}]}).workouts.length,0);
});
test('remote catalogue fetch is GET-only and cached for offline re-use',async()=>{
 let cacheKey,cache;
 const getData=()=>cache;
 const data=await client.fetchCatalogue(endpoint,{
  fetchImpl:async(url,req)=>{
   assert.equal(url,endpoint);
   assert.equal(req.method,'GET');
   assert.ok(!req.body);
   assert.equal(req.credentials,'omit');
   return new Response(JSON.stringify(response),{status:200});
  },
  write:async(key,value)=>{cacheKey=key;cache=value;}
 });
 assert.equal(data.foods.length,1);
 assert.match(cacheKey,/catalogue-cache/);
 assert.equal((await client.cachedCatalogue(endpoint,async()=>getData())).workouts[0].name,sampleWorkout.name);
 assert.equal(await client.cachedCatalogue('https://another.example.com/v1/catalogue',async()=>getData()),null);
});
test('online foods overlay bundled catalogue but never delete offline favourites or diary snapshots',()=>{
 const original=foods.FOOD_COUNT;
 try{
  foods.applyOnlineFoods([sampleFood]);
  assert.equal(foods.findFood(sampleFood.id)?.name,'Korean rice bowl');
  assert.equal(foods.FOOD_COUNT,original+1);
  assert.ok(foods.searchFoods('bibimbap',20).some(x=>x.id===sampleFood.id));
  assert.ok(foods.findFood('masala-dosa')||foods.FOOD_COUNT>original);
 }finally{
  foods.applyOnlineFoods([]);
 }
 assert.equal(foods.FOOD_COUNT,original);
 assert.equal(foods.findFood(sampleFood.id),null);
});
test('Worker public catalogue endpoint requires bound D1, exposes no writes or diary',async()=>{
 const origin='https://t3ch-miner.github.io';
 const db={prepare:sql=>({all:async()=>{
  if(sql.includes('FROM foods'))return {results:[{id:sampleFood.id,name:sampleFood.name,category:sampleFood.category,aliases:'bibimbap',
    default_grams:420,calories:165,protein:9,carbs:21,fat:5,fibre:2,source:'Testing only',updated_at:'2026-10-23'}]};
  if(sql.includes('FROM workout_plans'))return {results:[{id:sampleWorkout.id,name:sampleWorkout.name,subtitle:sampleWorkout.subtitle,
    items_json:JSON.stringify(sampleWorkout.items),updated_at:'2026-10-23'}]};
  return {results:[{id:'row',name:'Seated row',muscle_group:'Back',equipment:'Cable',guidance:'Pull evenly.',updated_at:'2026-10-23'}]};
 }})};
 const get=()=>new Request(endpoint,{headers:{Origin:origin}});
 const ok=await handleCatalogue(get(),{CATALOGUE_DB:db});
 assert.equal(ok.status,200);
 assert.equal(ok.headers.get('Access-Control-Allow-Origin'),origin);
 const data=await ok.json();
 assert.equal(data.foods.length,1);
 assert.equal(client.normaliseCatalogue(data).workouts.length,1);
 assert.ok(!JSON.stringify(data).includes('workoutHistory'));
 assert.equal((await handleCatalogue(get(),{})).status,503);
 const post=await handleCatalogue(new Request(endpoint,{method:'POST',headers:{Origin:origin},body:'{}'}),{CATALOGUE_DB:db});
 assert.equal(post.status,405);
 assert.equal((await handleCatalogue(new Request(endpoint,{headers:{Origin:'https://attacker.invalid'}}),{CATALOGUE_DB:db})).status,403);
});
test('client preserves privacy and allows catalogued plans to be imported with explicit action',()=>{
 const app=root('app.js'),sw=root('sw.js'),html=root('index.html');
 assert.match(app,/onlineWorkoutsView\(\)/);
 assert.match(app,/case 'import-online-workout'/);
 assert.match(app,/case 'update-online-workout'/);
 assert.match(app,/confirmInApp\('Replace the exercises/);
 assert.match(app,/hydrateOnlineCatalogue\(\)/);
 assert.match(app,/case 'configure-catalogue'/);
 assert.match(app,/form-catalogue-settings/);
 assert.match(html,/online-catalogue\.css/);
 assert.match(sw,/catalogue-client\.js/);
 assert.match(sw,/online-catalogue\.css/);
 assert.ok(!root('catalogue-worker/worker.js').includes('SCAN_ACCESS_TOKEN'));
});

test('bundled foods, FTS plans and exercise entries can be seeded into D1 without overwriting later edits',()=>{
 const generator=new URL('../catalogue-worker/scripts/build-seed.mjs',import.meta.url);
 const sql=execFileSync(process.execPath,[generator.pathname],{encoding:'utf8'});
 assert.match(sql,/^-- Recomp public catalogue seed/);
 assert.doesNotMatch(sql,/^\s*BEGIN(?:\s+TRANSACTION)?\s*;/m,'D1 import must not contain explicit transactions');
 assert.doesNotMatch(sql,/^\s*COMMIT\s*;/m,'D1 import must not contain explicit COMMIT');
 const foodRows=(sql.match(/INSERT OR IGNORE INTO foods /g)||[]).length;
 const workouts=(sql.match(/INSERT OR IGNORE INTO workout_plans /g)||[]).length;
 const exercises=(sql.match(/INSERT OR IGNORE INTO exercises /g)||[]).length;
 assert.ok(foodRows>=250,'bulk seed covers the existing recipe catalogue');
 assert.ok(workouts>=1,'FTS workouts are included');
 assert.ok(exercises>=10,'existing FTS exercise names are included');
 assert.ok(!sql.includes('access_token'),'seed never embeds private tokens');
});
