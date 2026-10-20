// Recomp personal AI meal scan endpoint for Cloudflare Workers.
// DO NOT put your OpenAI key here. Add OPENAI_API_KEY and SCAN_ACCESS_TOKEN
// through Cloudflare Workers > Settings > Variables and Secrets (Secret).
const ALLOWED_ORIGIN='https://t3ch-miner.github.io';
const MAX_BYTES=2_900_000;
const json=(body,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 ...(origin===ALLOWED_ORIGIN?{'Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Vary':'Origin'}:{})
}});
const SCHEMA={type:'object',additionalProperties:false,required:['items'],properties:{
 items:{type:'array',maxItems:12,items:{type:'object',additionalProperties:false,
  required:['name','visualEvidence','portionHint','uncertain'],properties:{
   name:{type:'string'},visualEvidence:{type:'string'},
   portionHint:{type:'string'},uncertain:{type:'boolean'}
  }}}
}};
export function buildOpenAiRequest(image){
 return {model:'gpt-4.1-mini',store:false,max_output_tokens:900,
  input:[{role:'user',content:[
   {type:'input_text',text:`You analyse ONE photograph for a personal food diary. Identify up to 12 separate VISIBLE foods or edible components (e.g. cooked rice, dal, roti, paneer curry, sabji, pickle, yoghurt, sauce). Prefer specific everyday Indian dish names when visibly supported, otherwise neutral names. Do not hallucinate unseen ingredients, side dishes or exact weights. Do not calculate calories or macros. For each food return a concise name, visualEvidence (what you can actually see), portionHint (visually approximate amount such as 'small bowl' or '2 pieces', NOT grams), and uncertain=true whenever it could be a different dish. If image isn't food or food cannot be identified, return an empty list. No text outside the JSON schema.`},
   {type:'input_image',image_url:image,detail:'high'}
  ]}],text:{format:{type:'json_schema',name:'recomp_visible_foods',strict:true,schema:SCHEMA}}};
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
 if(!env?.OPENAI_API_KEY||!env?.SCAN_ACCESS_TOKEN)return json({error:'Scanner is not configured. Ask the app owner to set up Worker secrets.'},503,origin);
 if(request.headers.get('Authorization')!=='Bearer '+env.SCAN_ACCESS_TOKEN)return json({error:'Incorrect private scanner access token.'},401,origin);
 if(!/application\/json/i.test(request.headers.get('Content-Type')||''))return json({error:'Expected JSON.'},415,origin);
 const declared=Number(request.headers.get('Content-Length')||0);
 if(declared>MAX_BYTES)return json({error:'Photo is too large.'},413,origin);
 const raw=await request.text();
 if(raw.length>MAX_BYTES)return json({error:'Photo is too large.'},413,origin);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid photo request.'},400,origin);}
 const image=body?.image;
 if(typeof image!=='string'||image.length>2_800_000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image))return json({error:'Expected a compressed JPEG photo.'},400,origin);
 let response;
 try{response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{
   'Authorization':'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'
  },body:JSON.stringify(buildOpenAiRequest(image)),signal:AbortSignal.timeout(40000)});}
 catch{return json({error:'Image analysis service is temporarily unavailable.'},502,origin);}
 if(!response.ok)return json({error:response.status===429?'Image analysis is busy or your API quota was reached.':response.status===401?'The Worker OpenAI key needs updating.':'Image analysis could not complete.'},502,origin);
 let output;try{output=await response.json();}catch{return json({error:'Invalid response from image analysis.'},502,origin);}
 const resultText=(output.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
 let decoded;try{decoded=JSON.parse(resultText);}catch{return json({error:'The scanner could not produce a food list. Please try again.'},502,origin);}
 const items=Array.isArray(decoded?.items)?decoded.items.slice(0,12).flatMap(x=>{
  const name=String(x?.name||'').trim().slice(0,90);
  return name.length<2?[]:[{name,visualEvidence:String(x.visualEvidence||'').slice(0,140),
   portionHint:String(x.portionHint||'').slice(0,100),uncertain:Boolean(x.uncertain)}];
 }):[];
 return json({items},200,origin);
}
export default {async fetch(request,env){return handleScan(request,env);}};
