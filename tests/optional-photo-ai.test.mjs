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
const env={OPENAI_API_KEY:'sk-MOCK-NOT-REAL',SCAN_ACCESS_TOKEN:accessToken};
const mockAi=()=>new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({items:[
  {name:'Dal',visualEvidence:'Yellow curry in a bowl',portionHint:'Small bowl',uncertain:true},
  {name:'Rice',visualEvidence:'White grains',portionHint:'One scoop',uncertain:false}
 ]})}]}]}),{status:200});

test('photo scan client accepts one trusted HTTPS endpoint and rejects API secrets',async()=>{
 assert.throws(()=>client.savePhotoAiEndpoint('http://unsafe.example.com/scan'),/HTTPS/);
 assert.throws(()=>client.savePhotoAiEndpoint('https://user:secret@unsafe.example.com/scan'),/HTTPS/);
 const stored={};
 globalThis.localStorage={getItem:k=>stored[k],setItem:(k,v)=>stored[k]=v};
 let requests=0;
 await assert.rejects(client.scanPhotoWithWorker({endpoint:'https://my-worker.workers.dev/scan',accessToken:'sk-secret-dont-ever-send',imageDataUrl:image,fetchImpl:()=>{requests++;}}),/Do not paste an OpenAI/);
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

test('Worker calls only the OpenAI Responses vision API after consent and uses structured output',async()=>{
 let calls=0;
 const reply=await worker.handleScan(request(),env,async(url,options)=>{
  calls++;
  assert.equal(url,'https://api.openai.com/v1/responses');
  assert.equal(options.headers.Authorization,'Bearer '+env.OPENAI_API_KEY);
  const requestBody=JSON.parse(options.body);
  assert.equal(requestBody.store,false);
  assert.equal(requestBody.input[0].content[1].type,'input_image');
  assert.equal(requestBody.input[0].content[1].image_url,image);
  assert.equal(requestBody.text.format.type,'json_schema');
  return mockAi();
 });
 assert.equal(calls,1);
 assert.equal(reply.status,200);
 const body=await reply.json();
 assert.equal(body.items.length,2);
 assert.equal(body.items[0].name,'Dal');
 assert.equal(body.items[0].uncertain,true);
 assert.equal(body.items[1].name,'Rice');
 assert.ok(!JSON.stringify(body).includes('sk-MOCK'));
});

test('food-photo review never autosaves suggestions and retains free manual path',()=>{
 assert.match(nutrition,/data-nf="ai-scan"/);
 assert.match(nutrition,/scanPhotoWithWorker\(/);
 assert.match(nutrition,/data-nf="ai-find-food"/);
 assert.match(nutrition,/photoQuery=item\.name/);
 assert.match(nutrition,/data-nf="recognise"/);
 assert.match(nutrition,/saveEntries\(entries\)/);
 assert.match(nutrition,/AI may misidentify food/);
 assert.ok(!/OPENAI_API_KEY|sk-[A-Za-z0-9]{20,}/.test(nutrition+clientSource),'no provider API key in browser');
 assert.match(styles,/nf-vision-result/);
 assert.match(sw,/'\.\/photo-ai\.js'/);
 assert.match(html,/2\.7-ai-photos/);
 assert.match(gitignore,/photo-scan-worker\/\.dev\.vars/);
});
