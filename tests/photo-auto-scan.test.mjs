import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const photoSource=read('photo-ai.js');
const client=await import('data:text/javascript;base64,'+Buffer.from(photoSource).toString('base64'));
const ui=read('nutrition-v2.js');
const worker=read('photo-scan-worker/worker.js');

test('private Worker access stays memory-only unless the owner opts in',()=>{
 const store=new Map();
 const oldStorage=globalThis.localStorage;
 globalThis.localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,val)=>{store.set(key,String(val));},
  removeItem:key=>{store.delete(key);}
 };
 try{
  const token='private-worker-scan-code-test-only-1234';
  client.rememberPhotoAiSessionToken('');
  assert.equal(client.getPhotoAiSessionToken(),'');
  client.rememberPhotoAiSessionToken(token);
  assert.equal(client.getPhotoAiSessionToken(),token);
  assert.equal(client.getPhotoAiSavedAccessToken(),'');
  assert.equal(store.size,0,'token was not saved without explicit opt in');
  assert.throws(()=>client.savePhotoAiDeviceToken('hf_NOT_A_BROWSER_TOKEN'),/provider API key/);
  assert.throws(()=>client.savePhotoAiDeviceToken('sk-secret-key-here'),/provider API key/);
  assert.equal(client.savePhotoAiDeviceToken(token),true);
  assert.equal(client.getPhotoAiSavedAccessToken(),token);
  client.rememberPhotoAiSessionToken('');
  assert.equal(client.getPhotoAiSessionToken(),token,'next app session recovers remembered Worker code');
  client.forgetPhotoAiDeviceToken();
  assert.equal(client.getPhotoAiSavedAccessToken(),'');
  assert.equal(client.getPhotoAiSessionToken(),'');
  assert.equal(store.size,0);
 }finally{
  client.rememberPhotoAiSessionToken('');
  if(oldStorage===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=oldStorage;
 }
});

test('photo selection automatically runs Hugging Face if private access exists',()=>{
 assert.match(ui,/if\(aiAccessToken\)void scanWithAi\(\)/);
 assert.match(ui,/if\(!aiAccessToken\)/);
 assert.match(ui,/getPhotoAiSessionToken\(\)/);
 assert.match(ui,/scanPhotoWithWorker\(/);
 assert.match(ui,/savePhotoAiDeviceToken\(aiAccessToken\)/);
 assert.match(ui,/getPhotoAiSavedAccessToken\(\)/);
 assert.match(ui,/data-nf="forget-ai-access"/);
 assert.match(ui,/id="nf-ai-remember"/);
 assert.match(ui,/Remember scanner access on this device/);
 assert.match(ui,/Automatically analysing your dish with Hugging Face/);
 assert.match(ui,/data-nf="save-ai-meal"/);
 assert.match(ui,/await saveEntries\(\[entry\]\)/);
 const scanFunction=ui.slice(ui.indexOf('async function scanWithAi()'),ui.indexOf('async function recognise()'));
 assert.ok(!scanFunction.includes('saveEntries('),'recognition cannot write to diary without approval');
});

test('provider key remains server-side, and private Worker still demands a separate bearer token',()=>{
 assert.match(worker,/env\.HF_TOKEN/);
 assert.match(worker,/env\.SCAN_ACCESS_TOKEN/);
 assert.match(worker,/request\.headers\.get\('Authorization'\)!=='Bearer '\+env\.SCAN_ACCESS_TOKEN/);
 assert.doesNotMatch(photoSource,/HF_TOKEN\s*=/);
 assert.doesNotMatch(ui,/HF_TOKEN\s*=/);
});

test('scanner errors are classified into recoverable messages without exposing any private token',()=>{
 const token='private-worker-scan-code-test-only-1234';
 const badCode=client.explainPhotoAiFailure(Error('Incorrect private scanner access token.'));
 assert.equal(badCode.issue,'access');
 assert.match(badCode.message,/Change scanner access code/i);
 const network=client.explainPhotoAiFailure(Error('Secure scanner unavailable. Check the Worker URL and internet connection.'));
 assert.equal(network.issue,'connection');
 assert.match(network.message,/Worker URL/);
 const credits=client.explainPhotoAiFailure(Error('Hugging Face credits are exhausted.'));
 assert.equal(credits.issue,'provider');
 assert.match(credits.message,/credits/);
 const config=client.explainPhotoAiFailure(Error('Scanner is not configured.'));
 assert.equal(config.issue,'configuration');
 assert.match(config.message,/Cloudflare/);
 assert.ok(!client.explainPhotoAiFailure(Error('Scanner unavailable.')).message.includes(token));
});

test('failed photo scans show status next to scan button with a way to change stale credentials',()=>{
 const photoPanel=ui.slice(ui.indexOf('function photoReview(){'),ui.indexOf('function photo(){'));
 const scanButton=photoPanel.indexOf('data-nf="${aiScanning');
 const status=photoPanel.indexOf('id="nf-ai-scan-status"');
 const catalogue=photoPanel.indexOf('class="nf-catalogue-mode"');
 assert.ok(scanButton>=0&&status>scanButton&&catalogue>status,'error appears directly after scan, before catalogue');
 assert.match(photoPanel,/nf-ai-scan-status-error|nf-ai-scan-status-\$\{aiStatus\}/);
 assert.match(photoPanel,/data-nf="change-ai-access"/);
 assert.match(photoPanel,/data-nf="reset-ai-endpoint"/);
 assert.match(photoPanel,/Log foods manually instead/);
 assert.match(photoPanel,/photoSeparateMode\?\x60<div class="nf-catalogue-mode">/);
 assert.match(ui,/if\(!photoSeparateMode\)return ''/);
 assert.match(ui,/const failure=explainPhotoAiFailure\(error\)/);
 assert.match(ui,/fallback\.decode\(\)/);
 const css=read('nutrition-v2.css');
 assert.match(css,/\.nf-ai-scan-status-error/);
 assert.match(css,/\.nf-ai-scan-status-working/);
});

test('retry and result updates preserve the Android photo modal scroll position',()=>{
 const start=ui.indexOf('function render(){');
 const end=ui.indexOf('function go(mode)',start);
 assert.ok(start>=0&&end>start,'render function located');
 const renderFunction=ui.slice(start,end);
 assert.match(renderFunction,/previousContent\.scrollTop/);
 assert.match(renderFunction,/lastRenderedPage===page/);
 assert.match(renderFunction,/lastRenderedPhotoStep===photoStep/);
 assert.match(renderFunction,/content\.scrollTop=previousScroll/);
 assert.match(renderFunction,/advancedWasOpen/);
 assert.match(renderFunction,/settings\.open=true/);
 const scanFunction=ui.slice(ui.indexOf('async function scanWithAi()'),ui.indexOf('async function recognise()'));
 assert.match(scanFunction,/aiStatus='working'/);
 assert.match(scanFunction,/aiStatus=aiMeal\?'success':'error'/);
 assert.match(scanFunction,/finally\{if\(token===aiRequestId\)/);
 assert.ok(!scanFunction.includes('saveEntries('),'retry must not automatically save a meal');
});

test('short codes that the Worker accepts are sent rather than wrongly rejected in Recomp',async()=>{
 const oldStorage=globalThis.localStorage;
 const saved=new Map();
 globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,String(value)),removeItem:key=>saved.delete(key)};
 try{
  client.rememberPhotoAiSessionToken('');
  const validWorkerCode='ab123';
  assert.equal(client.rememberPhotoAiSessionToken(validWorkerCode),true);
  assert.equal(client.getPhotoAiSessionToken(),validWorkerCode);
  const dish={name:'Rice and lentil bowl',servingDescription:'One lunch bowl',estimatedGrams:480,
    calories:650,protein:24,carbs:91,fat:18,fibre:13,calorieLow:500,calorieHigh:800,uncertain:true};
  const food=await client.scanPhotoWithWorker({
   endpoint:client.DEFAULT_PHOTO_AI_ENDPOINT,
   accessToken:validWorkerCode,
   imageDataUrl:'data:image/jpeg;base64,'+'a'.repeat(128),
   fetchImpl:async(url,request)=>{
    assert.equal(url,client.DEFAULT_PHOTO_AI_ENDPOINT);
    assert.equal(request.headers.Authorization,'Bearer '+validWorkerCode);
    return new Response(JSON.stringify({meal:dish,model:'vision-test'}),{status:200});
   }
  });
  assert.equal(food.meal.name,dish.name);
  assert.equal(client.savePhotoAiDeviceToken(validWorkerCode),true);
  client.rememberPhotoAiSessionToken('');
  assert.equal(client.getPhotoAiSessionToken(),validWorkerCode,'a previously valid short code should survive app restart');
  client.forgetPhotoAiDeviceToken();
  assert.equal(client.getPhotoAiSessionToken(),'');
 }finally{
  client.rememberPhotoAiSessionToken('');
  if(oldStorage===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=oldStorage;
 }
});

test('Worker authentication can be checked without sending photos or incurring image inference',async()=>{
 const code='ab123';
 const result=await client.checkPhotoAiConnection({
  endpoint:client.DEFAULT_PHOTO_AI_ENDPOINT,
  accessToken:code,
  fetchImpl:async(url,options)=>{
   assert.equal(url,'https://recomp-food-ai.rahul-dbz95.workers.dev/models');
   assert.equal(options.method,'GET');
   assert.equal(options.headers.Authorization,'Bearer '+code);
   assert.ok(!options.body,'do not send a photo when checking access');
   return new Response(JSON.stringify({selected:'Qwen vision'}),{status:200});
  }
 });
 assert.equal(result.model,'Qwen vision');
 let error;
 try{
  await client.checkPhotoAiConnection({
   endpoint:client.DEFAULT_PHOTO_AI_ENDPOINT,accessToken:code,
   fetchImpl:async()=>new Response(JSON.stringify({error:'Incorrect private scanner access token.'}),{status:401})
  });
 }catch(e){error=e;}
 assert.ok(error);
 assert.equal(error.httpStatus,401);
 const outcome=client.explainPhotoAiFailure(error);
 assert.equal(outcome.issue,'access');
 assert.match(outcome.message,/HTTP 401/);
 assert.match(outcome.message,/Worker URL/);
 assert.ok(!outcome.message.includes(code),'never echo private code in error messages');
 assert.match(ui,/data-nf="ai-check-connection"/);
 assert.match(ui,/checkScannerConnection\(\)/);
 assert.match(ui,/checkPhotoAiConnection\(/);
});
