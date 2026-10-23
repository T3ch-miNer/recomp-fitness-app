import test from 'node:test';
import assert from 'node:assert/strict';
import * as food from '../food-db.js';
import * as catalog from '../online-catalog.js';

const oldStorage=globalThis.localStorage;
const mem=new Map();
const mock={getItem:key=>mem.has(key)?mem.get(key):null,setItem:(key,value)=>mem.set(key,String(value)),removeItem:key=>mem.delete(key)};
const reset=()=>{mem.clear();food.applyOnlineFoods([]);};
const data={version:3,foods:[{
 id:'korean-rice-bowl',name:'Korean rice bowl',category:'Rice meals',
 aliases:['Bibimbap'],per100:{calories:142,protein:10,carbs:18,fat:3.4,fibre:2.1},defaultGrams:450
}],workouts:[{id:'remote-full-body',name:'Full body plan',subtitle:'Strength',
 notes:'Rest 90 seconds',items:[['squat','Goblet Squat',3,10,12,90,[]]]}]};
test('public content endpoint is HTTPS only, has no credential support, can be cleared',()=>{
 globalThis.localStorage=mock;reset();
 assert.throws(()=>catalog.saveOnlineCatalogUrl('http://insecure.test/v1/catalog'),/secure HTTPS/);
 assert.throws(()=>catalog.saveOnlineCatalogUrl('https://user:password@host.test/v1/catalog'),/secure HTTPS/);
 assert.throws(()=>catalog.saveOnlineCatalogUrl('https://host.test/v1/catalog?key=secret'),/secure HTTPS/);
 assert.throws(()=>catalog.saveOnlineCatalogUrl('https://host.test/v1/wrong'),/secure HTTPS/);
 assert.equal(catalog.saveOnlineCatalogUrl('https://catalogue.example.workers.dev/v1/catalog'),'https://catalogue.example.workers.dev/v1/catalog');
 assert.equal(catalog.getOnlineCatalogUrl(),'https://catalogue.example.workers.dev/v1/catalog');
 assert.equal(catalog.saveOnlineCatalogUrl(''),'');
 assert.equal(catalog.getOnlineCatalogUrl(),'');
});
test('public catalogue overrides future reference nutrition while keeping offline recipes',async()=>{
 globalThis.localStorage=mock;reset();
 const count=food.FOOD_COUNT;
 catalog.saveOnlineCatalogUrl('https://catalogue.example.workers.dev/v1/catalog');
 const store=new Map();
 const result=await catalog.refreshOnlineCatalog({
  fetchImpl:async(url,opt)=>{
   assert.equal(url,'https://catalogue.example.workers.dev/v1/catalog');
   assert.equal(opt.method,'GET');
   assert.equal(opt.credentials,'omit');
   assert.equal(opt.body,undefined,'no personal diary in request');
   return new Response(JSON.stringify(data),{status:200});
  },
  write:async(key,value)=>store.set(key,value)
 });
 assert.equal(result.status,'ready');
 assert.equal(result.version,3);
 assert.equal(food.FOOD_COUNT,count+1);
 const resultFood=food.findFood('korean-rice-bowl');
 assert.equal(resultFood.name,'Korean rice bowl');
 assert.equal(food.nutrientsForGrams(resultFood,200).calories,284);
 assert.ok(food.findFood('dal-tadka')||food.FOOD_ITEMS.some(x=>x.source==='Recomp sample recipe estimate'));
 assert.equal(catalog.getOnlineWorkouts()[0].name,'Full body plan');
 assert.equal(store.size,1,'reference catalogue is cached without user records');
 assert.ok(!JSON.stringify([...store.values()]).includes('workoutHistory'));
});
test('offline cache restores food references and workouts without a network',async()=>{
 globalThis.localStorage=mock;
 catalog.saveOnlineCatalogUrl('https://catalogue.example.workers.dev/v1/catalog');
 const read=async()=>({url:catalog.getOnlineCatalogUrl(),data,savedAt:'2026-10-23T10:00:00Z'});
 const result=await catalog.loadCachedOnlineCatalog(catalog.getOnlineCatalogUrl(),read);
 assert.equal(result.status,'ready');
 assert.equal(food.findFood('korean-rice-bowl')?.per100.protein,10);
 assert.equal(catalog.getOnlineWorkouts().length,1);
 const error=await catalog.refreshOnlineCatalog({
  fetchImpl:async()=>{throw Error('offline');},write:async()=>{}
 });
 assert.equal(error.status,'offline','offline status must not be replaced by cached ready status');
 assert.equal(food.findFood('korean-rice-bowl')?.name,'Korean rice bowl');
});
test('bad records never delete the bundled offline food catalogue',()=>{
 const base=food.FOOD_COUNT;
 assert.throws(()=>food.applyOnlineFoods([{id:'bad',name:'Broken'}]),/Invalid online food catalogue/);
 assert.equal(food.FOOD_COUNT,base);
 assert.throws(()=>catalog.validatePublicCatalog({version:3,foods:[],workouts:[{id:'plan',name:'Broken',items:[]}]}),/invalid plan/);
 assert.equal(food.FOOD_COUNT,base);
});
test('server payload includes no private fitness data and client leaves existing diary untouched',()=>{
 assert.equal(Object.hasOwn(data,'diary'),false);
 assert.equal(Object.hasOwn(data,'foodDiary'),false);
 assert.equal(Object.hasOwn(data,'workoutHistory'),false);
 assert.equal(Object.hasOwn(data,'photos'),false);
 const workout=catalog.getOnlineWorkouts()[0];
 workout.name='changed by caller';
 assert.equal(catalog.getOnlineWorkouts()[0].name,'Full body plan','remote reference plans returned as defensive clones');
});
globalThis.localStorage=oldStorage;
