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
 assert.doesNotMatch(ui,/saveEntries\(\[entry\]\).*setImage\(/s);
});

test('provider key remains server-side, and private Worker still demands a separate bearer token',()=>{
 assert.match(worker,/env\.HF_TOKEN/);
 assert.match(worker,/env\.SCAN_ACCESS_TOKEN/);
 assert.match(worker,/request\.headers\.get\('Authorization'\)!=='Bearer '\+env\.SCAN_ACCESS_TOKEN/);
 assert.doesNotMatch(photoSource,/HF_TOKEN\s*=/);
 assert.doesNotMatch(ui,/HF_TOKEN\s*=/);
});
