import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const nutrition=readFileSync(new URL('../nutrition-v2.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../food-recognition-worker.js',import.meta.url),'utf8');
const db=readFileSync(new URL('../db.js',import.meta.url),'utf8');

// Exercise the repository's real pure lookup functions with a mocked API and store.
function extract(name,next){
 const start=app.indexOf((name==='lookupBarcode'?'async function ':'function ')+name+'(');
 const end=app.indexOf('\n'+next,start);
 assert.ok(start>=0 && end>start,'Cannot extract '+name);
 return app.slice(start,end).trim();
}
const normaliseSource=extract('normaliseBarcode','function validateOpenFoodProduct');
const validateSource=extract('validateOpenFoodProduct','async function lookupBarcode');
const lookupSource=extract('lookupBarcode','async function resolveBarcode');
const context=vm.createContext({Date,Number,String,Error,Math,encodeURIComponent,AbortSignal,console});
const normaliseBarcode=vm.runInContext('('+normaliseSource+')',context);
const validateOpenFoodProduct=vm.runInContext('('+validateSource+')',context);
const product={
 product_name_de:'Bio Vollmilch',product_name:'Whole Milk',brands:'REWE Bio',
 stores:'REWE, Kaufland',quantity:'1 l',
 nutriments:{'energy-kcal_100g':65,'proteins_100g':3.4,'carbohydrates_100g':4.8,'fat_100g':3.6}
};
test('German packaged foods preserve real listed shop names',()=>{
 const item=validateOpenFoodProduct({status:1,product},'4001234567890');
 assert.equal(item.name,'Bio Vollmilch');
 assert.equal(item.brand,'REWE Bio');
 assert.equal(item.stores,'REWE, Kaufland');
 assert.equal(item.per100.calories,65);
 assert.equal(item.missing.length,1);
 assert.equal(item.missing[0],'fibre');
});

test('store names are not invented from product brand or barcode prefix',()=>{
 const item=validateOpenFoodProduct({status:1,product:{...product,stores:''}},'4001234567890');
 assert.equal(item.stores,'');
});

test('invalid barcode strings and unusable community records are rejected',()=>{
 for(const code of ['','1234567','abc1234567890'])assert.throws(()=>normaliseBarcode(code));
 assert.equal(normaliseBarcode('4001234567890'),'4001234567890');
 assert.throws(()=>validateOpenFoodProduct({status:0},'4001234567890'));
 assert.throws(()=>validateOpenFoodProduct({status:1,product:{product_name_de:'Test',nutriments:{}}},'4001234567890'));
});

function makeLookup({online=true,cached=null,response={ok:true,status:200,json:async()=>({status:1,product})}}={}){
 const calls=[],writes=[];
 const context=vm.createContext({
  Date,Number,String,Error,Math,encodeURIComponent,
  navigator:{onLine:online},
  normaliseBarcode,validateOpenFoodProduct,
  get:async key=>{calls.push(['get',key]);return cached;},
  put:async(key,value)=>{writes.push([key,value]);},
  fetch:async(url,opts)=>{calls.push(['fetch',url,opts]);return response;},
  AbortSignal:{timeout:()=>undefined}
 });
 return {lookup:vm.runInContext('('+lookupSource+')',context),calls,writes};
}
test('German localisation and stores field are included in the real Open Food Facts request',async()=>{
 const req=makeLookup();
 const item=await req.lookup('4001234567890');
 assert.equal(item.name,'Bio Vollmilch');
 assert.equal(item.stores,'REWE, Kaufland');
 assert.ok(req.calls.some(c=>c[0]==='fetch' && c[1].includes('stores&lc=de&cc=de')));
 assert.equal(req.writes[0][0],'barcode-cache-4001234567890');
});

test('cached barcode data still works offline without a network request',async()=>{
 const original=validateOpenFoodProduct({status:1,product},'4001234567890');
 const req=makeLookup({online:false,cached:{savedAt:Date.now(),product:original}});
 const item=await req.lookup('4001234567890');
 assert.equal(item.cached,true);
 assert.equal(req.calls.filter(x=>x[0]==='fetch').length,0);
});

test('new barcode requests offer a retry, and native scanning can switch to ZXing',()=>{
 assert.ok(nutrition.includes("if(looking)return;"));
 assert.ok(nutrition.includes("finally{looking=false;if(!disposed&&page==='barcode')render();}"));
 assert.ok(nutrition.includes('Date.now()-started>9000'));
 assert.ok(nutrition.includes('startZxing(video,token)'));
 assert.ok(nutrition.includes('Shops listed:'));
});

test('expanded photo recognition accepts the larger catalogue',()=>{
 assert.ok(worker.includes('labels.length>400'));
});

test('fitness data storage keeps its existing IndexedDB name and object stores',()=>{
 assert.ok(db.includes("const NAME = 'recomp-fitness-v1'"));
 assert.ok(db.includes("const STORES = ['records','photos']"));
 assert.ok(db.includes('indexedDB.open(NAME, 1)'));
 assert.ok(!/deleteDatabase\(|objectStore\([^)]*\)\.clear\(/.test(app));
});
