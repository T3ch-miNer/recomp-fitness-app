import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scannerFetch,scanPhotoWithWorker,checkPhotoAiConnection,SCANNER_APP_ORIGIN} from '../photo-ai.js';

const meal={name:'Dal rice bowl',servingDescription:'1 large bowl',estimatedGrams:350,calories:470,protein:19,carbs:70,fat:11,fibre:9,calorieLow:400,calorieHigh:560,uncertain:true,assumptions:'Ghee unknown'};
const image='data:image/jpeg;base64,AAAA';
function withNative(handler,fn){
 const calls=[];
 globalThis.Capacitor={isNativePlatform:()=>true,Plugins:{CapacitorHttp:{request:async o=>{calls.push(o);return handler(o);}}}};
 return fn(calls).finally(()=>{delete globalThis.Capacitor;});
}

test('APK scans go through Android networking with an origin the Worker accepts',()=>withNative(()=>({status:200,data:{meal,model:'qwen'}}),async calls=>{
 const out=await scanPhotoWithWorker({endpoint:'https://recomp-food-ai.rahul-dbz95.workers.dev/scan',accessToken:'code-123',imageDataUrl:image});
 assert.equal(out.meal.name,'Dal rice bowl');
 assert.equal(calls.length,1);
 const c=calls[0];
 assert.equal(c.method,'POST');
 assert.equal(c.headers.Origin,SCANNER_APP_ORIGIN);
 assert.equal(c.headers.Authorization,'Bearer code-123');
 assert.equal(c.headers['Content-Type'],'application/json');
 assert.deepEqual(c.data,{image});
 assert.ok(c.readTimeout>=60000,'long enough for the vision model');
}));

test('APK keeps the Worker error messages, including a wrong access code',()=>withNative(()=>({status:401,data:{error:'Incorrect private scanner access token.'}}),async()=>{
 await assert.rejects(checkPhotoAiConnection({endpoint:'https://w.example.workers.dev/scan',accessToken:'nope'}),e=>e.httpStatus===401&&/Incorrect private scanner/.test(e.message));
}));

test('text responses are parsed too',()=>withNative(()=>({status:200,data:JSON.stringify({selected:'qwen',models:[]})}),async()=>{
 assert.deepEqual(await checkPhotoAiConnection({endpoint:'https://w.example.workers.dev/scan',accessToken:'ok'}),{model:'qwen'});
}));

test('Cancel still stops waiting on the APK',()=>withNative(()=>new Promise(()=>{}),async()=>{
 const controller=new AbortController();
 const pending=scannerFetch('https://w.example.workers.dev/scan',{method:'POST',body:'{}',signal:controller.signal});
 controller.abort();
 await assert.rejects(pending,e=>e.name==='AbortError');
}));

test('the website keeps using normal fetch',async()=>{
 const original=globalThis.fetch;let used=false;
 globalThis.fetch=async()=>{used=true;return new Response('{}');};
 try{await scannerFetch('https://w.example.workers.dev/models');assert.ok(used);}
 finally{globalThis.fetch=original;}
});

test('the Worker accepts the APK origins once redeployed',()=>{
 const worker=readFileSync(new URL('../photo-scan-worker/worker.js',import.meta.url),'utf8');
 assert.match(worker,/'https:\/\/localhost'/);
 assert.match(worker,/'capacitor:\/\/localhost'/);
 assert.match(worker,/const isAllowedOrigin=origin=>APP_ORIGINS\.has\(origin\);/);
});
