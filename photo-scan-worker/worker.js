// Recomp personal, opt-in image scanner. GitHub Pages never receives HF_TOKEN.
// Set HF_TOKEN and SCAN_ACCESS_TOKEN as Cloudflare Worker secrets, not plaintext.
// Hugging Face routes Qwen3-VL to an available Inference Provider (at writing
// the 4B Instruct model has Featherless AI inference support).
const ALLOWED_ORIGIN='https://t3ch-miner.github.io';
const MAX_BYTES=2_900_000;
const MODEL='Qwen/Qwen3-VL-4B-Instruct';
const json=(body,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 ...(origin===ALLOWED_ORIGIN?{'Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Vary':'Origin'}:{})
}});
const INSTRUCTIONS=`Analyse ONE photograph for a PERSONAL food diary. Identify up to TWELVE separate foods or visible edible components, including individual Indian dishes such as cooked rice, dal, roti, paneer curry, sabji, yoghurt and chutney. Only name foods visually supported by this photo. Do not invent ingredients, cooking methods, weights, nutritional information, or foods outside the frame. Treat visually similar curries as uncertain. If there is no recognisable food, return items: [].

Reply with ONLY one valid JSON object of this shape, no prose or markdown:
{"items":[{"name":"Dal","visualEvidence":"Yellow food in bowl","portionHint":"Small bowl","uncertain":true}]}
Each field must be included. The evidence must say what is visible, not imply invisible ingredients. Use everyday food names and plain-language estimated serving descriptions, not grams. The user must personally review everything.`;
export function buildHfRequest(image){
 return {model:MODEL,max_tokens:950,temperature:0.1,stream:false,messages:[{
  role:'user',content:[
   {type:'text',text:INSTRUCTIONS},
   {type:'image_url',image_url:{url:image}}
  ]
 }]};
}
function parseFoodList(text){
 if(typeof text!=='string'||text.length>20000)throw Error('Invalid model output');
 // Some vision providers return fenced JSON even when asked not to.
 const trimmed=text.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'');
 const parsed=JSON.parse(trimmed);
 if(!parsed||!Array.isArray(parsed.items))throw Error('No food list');
 return parsed.items.slice(0,12).flatMap(x=>{
  const name=String(x?.name||'').trim().slice(0,90);
  return name.length<2?[]:[{name,visualEvidence:String(x.visualEvidence||'').slice(0,140),
   portionHint:String(x.portionHint||'').slice(0,100),uncertain:Boolean(x.uncertain)}];
 });
}
export async function handleScan(request,env,fetchImpl=fetch){
 const origin=request.headers.get('Origin')||'';
 const path=new URL(request.url).pathname;
 if(request.method==='OPTIONS'){
  if(origin!==ALLOWED_ORIGIN)return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ALLOWED_ORIGIN,
   'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type',
   'Access-Control-Max-Age':'600','Vary':'Origin'}});
 }
 if(path!=='/scan'||request.method!=='POST')return json({error:'Not found'},404,origin);
 if(origin!==ALLOWED_ORIGIN)return json({error:'Origin is not allowed.'},403);
 if(!env?.HF_TOKEN||!env?.SCAN_ACCESS_TOKEN)return json({error:'Scanner is not configured. Add Hugging Face and access-token Worker secrets.'},503,origin);
 if(request.headers.get('Authorization')!=='Bearer '+env.SCAN_ACCESS_TOKEN)return json({error:'Incorrect private scanner access token.'},401,origin);
 if(!/application\/json/i.test(request.headers.get('Content-Type')||''))return json({error:'Expected JSON.'},415,origin);
 const declared=Number(request.headers.get('Content-Length')||0);
 if(declared>MAX_BYTES)return json({error:'Photo is too large.'},413,origin);
 const raw=await request.text();
 if(raw.length>MAX_BYTES)return json({error:'Photo is too large.'},413,origin);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid photo request.'},400,origin);}
 const image=body?.image;
 if(typeof image!=='string'||image.length>2_800_000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image))
  return json({error:'Expected a compressed JPEG photo.'},400,origin);
 let response;
 try{response=await fetchImpl('https://router.huggingface.co/v1/chat/completions',{method:'POST',headers:{
   'Authorization':'Bearer '+env.HF_TOKEN,'Content-Type':'application/json'
  },body:JSON.stringify(buildHfRequest(image)),signal:AbortSignal.timeout(40000)});}
 catch{return json({error:'Hugging Face image recognition service is temporarily unreachable.'},502,origin);}
 if(!response.ok){
  const status=response.status;
  return json({error:status===402?'Hugging Face credits are exhausted. Add credits to continue.':
   status===429?'Hugging Face requests are rate-limited. Try again later.':
   status===401||status===403?'Hugging Face access token needs updating or lacks Inference Providers access.':
   status===404||status===400?'The selected vision model is not available through your Hugging Face provider.':
   'Hugging Face could not analyse this photo.'},status===402?402:502,origin);
 }
 let output;try{output=await response.json();}catch{return json({error:'Unreadable response from image recognition.'},502,origin);}
 let items;
 try{items=parseFoodList(output?.choices?.[0]?.message?.content);}catch{
  return json({error:'The vision model did not return a usable food list. Try a clearer photo or search foods manually.'},502,origin);
 }
 return json({items},200,origin);
}
export default {async fetch(request,env){return handleScan(request,env);}};
