import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const clientSource=read('photo-ai.js'),workerSource=read('photo-scan-worker/worker.js'),nutrition=read('nutrition-v2.js'),sw=read('sw.js'),html=read('index.html'),styles=read('nutrition-v2.css'),gitignore=read('.gitignore');
const client=await import('data:text/javascript;base64,'+Buffer.from(clientSource).toString('base64'));
const worker=await import('data:text/javascript;base64,'+Buffer.from(workerSource).toString('base64'));
const image='data:image/jpeg;base64,'+'a'.repeat(128);
const accessToken='random-long-photo-scan-passphrase-123';
const request=(opt={})=>new Request('https://my-worker.workers.dev/scan',{method:'POST',headers:{'Origin':'https://t3ch-miner.github.io','Content-Type':'application/json','Authorization':'Bearer '+accessToken,...opt.headers},body:JSON.stringify({image,...opt.body})});
const env={HF_TOKEN:'hf_FAKE_TEST_ONLY',SCAN_ACCESS_TOKEN:accessToken};
const mockAi=()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({items:[
  {name:'Dal',visualEvidence:'Yellow curry in a bowl',portionHint:'Small bowl',uncertain:true},
  {name:'Rice',visualEvidence:'White grains',portionHint:'One scoop',uncertain:false}
 ]})}}]}),{status:200});

test('photo scan client accepts one trusted HTTPS endpoint and rejects API secrets',async()=>{
 assert.throws(()=>client.savePhotoAiEndpoint('http://unsafe.example.com/scan'),/HTTPS/);
 assert.throws(()=>client.savePhotoAiEndpoint('https://user:secret@unsafe.example.com/scan'),/HTTPS/);
 const stored={};
 globalThis.localStorage={getItem:k=>stored[k],setItem:(k,v)=>stored[k]=v};
 assert.equal(client.getPhotoAiEndpoint(),'https://recomp-photo-scan.rahul-dbz95.workers.dev/scan','public Worker preconfigured without storing a key');
 assert.equal(client.getPhotoAiSessionToken(),'');
 assert.throws(()=>client.rememberPhotoAiSessionToken('sk-prohibited'),/provider API key/);
 assert.equal(client.rememberPhotoAiSessionToken(accessToken),true);
 assert.equal(client.getPhotoAiSessionToken(),accessToken);
 assert.ok(!JSON.stringify(stored).includes(accessToken),'RAM-only scan token is not written to browser storage');
 assert.equal(client.savePhotoAiEndpoint('https://my-worker.workers.dev'),'https://my-worker.workers.dev/scan');
 let requests=0;
 await assert.rejects(client.scanPhotoWithWorker({endpoint:'https://my-worker.workers.dev/scan',accessToken:'sk-secret-dont-ever-send',imageDataUrl:image,fetchImpl:()=>{requests++;}}),/Do not paste a Hugging Face or OpenAI/);
 assert.equal(requests,0);
 const out=await client.scanPhotoWithWorker({endpoint:'https://my-worker.workers.dev/scan',accessToken,imageDataUrl:image,fetchImpl:async(url,options)=>{
  requests++;
  assert.equal(url,'https://my-worker.workers.dev/scan');
  assert.equal(options.headers.Authorization,'Bearer '+accessToken);
  assert.equal(options.credentials,'omit');
  assert.deepEqual(JSON.parse(options.body),{image});
  return new Response(JSON.stringify({items:[{name:'Rice',visualEvidence:'Visible grains',portionHint:'One spoon',uncertain:false}]}));
 }});
 assert.equal(out.length,1);
 assert.equal(out[0].name,'Rice');
 assert.equal(stored['recomp-photo-ai-endpoint-v1'],'https://my-worker.workers.dev/scan');
 assert.ok(!JSON.stringify(stored).includes(accessToken),'the access token must not be stored');
 delete globalThis.localStorage;
});

test('Worker requires a private token, trusted origin and a limited JPEG payload',async()=>{
 const unauthorized=await worker.handleScan(request({headers:{Authorization:'Bearer incorrect-secret'}}),env,()=>{throw Error('should not call provider');});
 assert.equal(unauthorized.status,401);
 const cross=await worker.handleScan(request({headers:{Origin:'https://malicious.example.com'}}),env,()=>{throw Error('should not call provider');});
 assert.equal(cross.status,403);
 const wrongImage=await worker.handleScan(request({body:{image:'https://example.com/remote-image.jpg'}}),env,()=>{throw Error('should not call provider');});
 assert.equal(wrongImage.status,400);
 const preflight=await worker.handleScan(new Request('https://my-worker.workers.dev/scan',{method:'OPTIONS',headers:{Origin:'https://t3ch-miner.github.io'}}),env);
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://t3ch-miner.github.io');
});

test('Worker calls Hugging Face vision chat API after consent and returns separate foods',async()=>{
 let calls=0;
 const reply=await worker.handleScan(request(),env,async(url,options)=>{
  calls++;
  assert.equal(url,'https://router.huggingface.co/v1/chat/completions');
  assert.equal(options.headers.Authorization,'Bearer '+env.HF_TOKEN);
  const requestBody=JSON.parse(options.body);
  assert.equal(requestBody.model,'Qwen/Qwen3-VL-4B-Instruct');
  assert.equal(requestBody.messages[0].content[1].type,'image_url');
  assert.equal(requestBody.messages[0].content[1].image_url.url,image);
  assert.match(requestBody.messages[0].content[0].text,/separate foods/);
  return mockAi();
 });
 assert.equal(calls,1);
 assert.equal(reply.status,200);
 const body=await reply.json();
 assert.equal(body.items.length,2);
 assert.equal(body.items[0].name,'Dal');
 assert.equal(body.items[0].uncertain,true);
 assert.equal(body.items[1].name,'Rice');
 assert.ok(!JSON.stringify(body).includes('hf_FAKE'));
});

test('Worker rejects unavailable models, billing exhaustion and malformed food JSON without logging',async()=>{
 const unavailable=await worker.handleScan(request(),env,async()=>new Response('{}',{status:404}));
 assert.equal(unavailable.status,502);
 assert.match((await unavailable.json()).error,/not available/);
 const noCredits=await worker.handleScan(request(),env,async()=>new Response('{}',{status:402}));
 assert.equal(noCredits.status,402);
 assert.match((await noCredits.json()).error,/credits/);
 const invalid=await worker.handleScan(request(),env,async()=>new Response(JSON.stringify({choices:[{message:{content:'not JSON'}}]}),{status:200}));
 assert.equal(invalid.status,502);
 assert.match((await invalid.json()).error,/usable food list/);
 const missing=await worker.handleScan(request(),{SCAN_ACCESS_TOKEN:accessToken},async()=>{throw Error('must not send');});
 assert.equal(missing.status,503);
});

test('food-photo review never autosaves suggestions and retains free manual path',()=>{
 assert.match(nutrition,/aiScanning\?'ai-cancel':'ai-scan'/);
 assert.match(nutrition,/scanPhotoWithWorker\(/);
 assert.match(nutrition,/data-nf="ai-find-food"/);
 assert.match(nutrition,/photoQuery=item\.name/);
 assert.match(nutrition,/recognising\?'cancel-recognition':'recognise'/);
 assert.match(nutrition,/saveEntries\(entries\)/);
 assert.match(nutrition,/AI may misidentify food/);
 assert.ok(!/(?:sk[-_]|hf_)[A-Za-z0-9]{20,}/.test(nutrition+clientSource),'no provider key literal in browser');
 assert.throws(()=>client.rememberPhotoAiSessionToken('hf_forbidden'),/provider API key/);
 assert.ok(!/localStorage\.setItem\([^\n]*accessToken/.test(clientSource),'the private token must not be persisted');
 assert.match(styles,/nf-vision-result/);
 assert.match(sw,/'\.\/photo-ai\.js'/);
 assert.match(html,/2\.7-ai-photos/);
 assert.match(gitignore,/photo-scan-worker\/\.dev\.vars/);
});
