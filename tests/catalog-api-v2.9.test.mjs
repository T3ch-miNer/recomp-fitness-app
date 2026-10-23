import test from 'node:test';
import assert from 'node:assert/strict';
import {handleCatalog} from '../catalog-api/worker.js';

class MockD1{
 constructor(){this.version=1;this.foods=new Map();this.workouts=new Map();}
 prepare(sql){
  const db=this;
  return {sql,args:[],
   bind(...params){this.args=params;return this;},
   async first(){if(sql.includes("FROM catalog_meta"))return {value:db.version};throw Error('Unexpected first '+sql);},
   async all(){
    if(sql.includes('FROM catalog_foods'))return {results:[...db.foods.values()].filter(r=>r.active).map(r=>({payload_json:r.data}))};
    if(sql.includes('FROM catalog_workouts'))return {results:[...db.workouts.values()].filter(r=>r.active).map(r=>({payload_json:r.data}))};
    throw Error('Unexpected all '+sql);
   },
   async run(){
    const map=sql.includes('catalog_foods')?db.foods:sql.includes('catalog_workouts')?db.workouts:null;
    if(sql.startsWith('INSERT INTO ')){
     map.set(this.args[0],{data:this.args[1],active:true});return {meta:{changes:1}};
    }
    if(sql.startsWith('UPDATE catalog_meta')){db.version++;return {meta:{changes:1}};}
    if(sql.startsWith('UPDATE catalog_')){
     const item=map.get(this.args[0]);if(item){item.active=false;return {meta:{changes:1}};}
     return {meta:{changes:0}};
    }
    throw Error('Unexpected run '+sql);
   }
  };
 }
 async batch(commands){const result=[];for(const command of commands)result.push(await command.run());return result;}
}
const secret='catalogue-admin-private-code-at-least-32-characters';
const worker='https://recomp-content-api.example.workers.dev';
const env=()=>({DB:new MockD1(),CATALOG_ADMIN_TOKEN:secret});
const get=(path,opt={})=>handleCatalog(new Request(worker+path,opt),opt.env||context);
let context;

test('D1 library returns public, versioned, CORS-protected catalogue without personal records',async()=>{
 context=env();
 const response=await get('/v1/catalog',{headers:{Origin:'https://t3ch-miner.github.io'}});
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://t3ch-miner.github.io');
 assert.match(response.headers.get('ETag'),/recomp-catalog-1/);
 const data=await response.json();
 assert.deepEqual(data.foods,[]);
 assert.deepEqual(data.workouts,[]);
 assert.equal(data.version,1);
 assert.ok(!JSON.stringify(data).includes(secret));
 const unchanged=await get('/v1/catalog',{headers:{'If-None-Match':response.headers.get('ETag')}});
 assert.equal(unchanged.status,304);
});

test('private food editor inserts and updates per-100g nutrition without an app update',async()=>{
 context=env();
 const item={id:'ramen-01',name:'Ramen bowl',category:'Noodles',defaultGrams:450,
  aliases:['Ramen'],per100:{calories:120,protein:7,carbs:14,fat:4,fibre:2}};
 const path='/v1/admin/foods/ramen-01';
 let result=await get(path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});
 assert.equal(result.status,401,'admin endpoint requires a valid secret');
 result=await get(path,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},body:JSON.stringify(item)});
 assert.equal(result.status,200);
 let data=await (await get('/v1/catalog')).json();
 assert.equal(data.version,2);
 assert.equal(data.foods[0].name,'Ramen bowl');
 assert.equal(data.foods[0].per100.protein,7);
 item.per100.protein=9;
 result=await get(path,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},body:JSON.stringify(item)});
 assert.equal(result.status,200);
 data=await (await get('/v1/catalog')).json();
 assert.equal(data.version,3);
 assert.equal(data.foods.length,1);
 assert.equal(data.foods[0].per100.protein,9);
 assert.ok(!JSON.stringify(data).includes(secret));
 result=await get(path,{method:'DELETE',headers:{Authorization:'Bearer '+secret}});
 assert.equal(result.status,200);
 data=await (await get('/v1/catalog')).json();
 assert.equal(data.version,4);
 assert.equal(data.foods.length,0);
});

test('workout templates support published revisions without storing workout logs',async()=>{
 context=env();
 const item={id:'strength-day',name:'Full body strength',subtitle:'Six moves',
  notes:'Rest between rounds',items:[['squat','Goblet Squat',3,10,12,90,[]]]};
 const r=await get('/v1/admin/workouts/strength-day',{
  method:'PUT',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},
  body:JSON.stringify(item)
 });
 assert.equal(r.status,200);
 const catalog=await (await get('/v1/catalog')).json();
 assert.deepEqual(catalog.workouts[0].items,item.items);
 assert.ok(!Object.hasOwn(catalog,'diary'));
 assert.ok(!Object.hasOwn(catalog,'workoutHistory'));
});

test('admin blocks remote-browser cross-origin writes, malformed meals and mismatched IDs',async()=>{
 context=env();
 const base={id:'dal',name:'Daal',category:'Main',defaultGrams:200,
  per100:{calories:90,protein:7,carbs:12,fat:2,fibre:5}};
 let r=await get('/v1/admin/foods/dal',{
  method:'PUT',
  headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json',Origin:'https://attacker.example'},
  body:JSON.stringify(base)
 });
 assert.equal(r.status,403);
 r=await get('/v1/admin/foods/wrong-id',{
  method:'PUT',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(base)
 });
 assert.equal(r.status,400);
 base.per100.calories=-2;
 r=await get('/v1/admin/foods/dal',{
  method:'PUT',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(base)
 });
 assert.equal(r.status,400);
 assert.deepEqual((await (await get('/v1/catalog')).json()).foods,[]);
});

test('admin page does not include the secret, authenticated read/write endpoints or user history',async()=>{
 context=env();
 const r=await get('/admin');
 assert.equal(r.status,200);
 assert.match(r.headers.get('Content-Security-Policy'),/connect-src 'self'/);
 const html=await r.text();
 assert.match(html,/Content Library Admin/);
 assert.match(html,/Private content-admin token/);
 assert.ok(!html.includes(secret));
 assert.ok(!html.includes('localStorage'));
 const cors=await get('/v1/catalog',{method:'OPTIONS',headers:{Origin:'https://t3ch-miner.github.io'}});
 assert.equal(cors.status,204);
 assert.equal(cors.headers.get('Access-Control-Allow-Methods'),'GET, OPTIONS');
});
