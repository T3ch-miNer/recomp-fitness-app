// Recomp personal, opt-in image scanner. GitHub Pages never receives HF_TOKEN.
// Set HF_TOKEN and SCAN_ACCESS_TOKEN as Cloudflare Worker secrets, not plaintext.
// Hugging Face routes Qwen3-VL to an available Inference Provider (at writing
// the 4B Instruct model has Featherless AI inference support).
const ALLOWED_ORIGIN='https://t3ch-miner.github.io';
const TEST_ORIGIN='https://recomp-food-ai.rahul-dbz95.workers.dev';
const isAllowedOrigin=origin=>origin===ALLOWED_ORIGIN||origin===TEST_ORIGIN;
const MAX_BYTES=2_900_000;
// Models listed on the Hub are not necessarily live at an Inference Provider.
// Consult the Hugging Face router's active image-capable catalogue on each scan.
const CATALOG_URL='https://router.huggingface.co/v1/models';
const MODEL_PREFERENCES=[
 'Qwen/Qwen2.5-VL-3B-Instruct',
 'Qwen/Qwen3-VL-8B-Instruct',
 'Qwen/Qwen3-VL-30B-A3B-Instruct',
 'Qwen/Qwen3.5-4B',
 'meta-llama/Llama-3.2-11B-Vision-Instruct',
 'zai-org/GLM-4.5V'
];
export function pickVisionModels(body){
 const data=Array.isArray(body?.data)?body.data:[];
 const vision=data.filter(item=>
  typeof item?.id==='string'&&
  item.architecture?.input_modalities?.includes('image')&&
  Array.isArray(item.providers)&&item.providers.some(p=>p.status==='live'));
 const viable=vision.map(item=>{
  const live=item.providers.filter(p=>p.status==='live');
  const affordable=live.some(p=>p.is_free===true||(
   p.pricing!=null&&Number.isFinite(Number(p.pricing.input))&&
   Number.isFinite(Number(p.pricing.output))&&
   Number(p.pricing.input)<=1&&Number(p.pricing.output)<=2));
  return {id:item.id,priority:MODEL_PREFERENCES.indexOf(item.id),affordable,
   providers:live.map(p=>p.provider)};
 }).filter(x=>x.priority>=0||x.affordable);
 viable.sort((a,b)=>{
  const score=x=>x.priority>=0?x.priority:100;
  return score(a)-score(b)||a.id.localeCompare(b.id);
 });
 return viable.slice(0,6).map(({id,providers})=>({id,providers}));
}
export async function getVisionModels(env,fetchImpl=fetch){
 let res;
 try{res=await fetchImpl(CATALOG_URL,{method:'GET',
   headers:{Authorization:'Bearer '+env.HF_TOKEN},
   cache:'no-store',signal:AbortSignal.timeout(15000)});}
 catch{throw Error('Could not reach the Hugging Face model catalogue. Try again.');}
 if(!res.ok){
  if(res.status===401||res.status===403)
   throw Error('Hugging Face token is invalid or missing Inference Providers permission (HTTP '+res.status+').');
  throw Error('Hugging Face model list is unavailable (HTTP '+res.status+').');
 }
 let body;try{body=await res.json();}catch{throw Error('Hugging Face returned invalid model catalogue data.');}
 const models=pickVisionModels(body);
 if(!models.length)throw Error('No live image-capable model was found within the scanner price limits. Provider availability may be limited.');
 return models;
}
const json=(body,status=200,origin='')=>new Response(JSON.stringify(body),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 ...(isAllowedOrigin(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})
}});
const INSTRUCTIONS=`You are a food-diary assistant examining ONE photo of ONE MEAL. Your PRIMARY job is to NAME THE COMPLETE DISH or MEAL, not enumerate its visible ingredients. Examples: a beef bibimbap / Korean beef rice bowl (not separate beef, corn, egg, rice); ramen bowl (not separate noodles, egg, broth); masala dosa with potato sabzi and chutney (one combined meal); pizza, pasta carbonara, thali, dal chawal. Prefer a specific recognizable cuisine/dish when reasonably supported by the image; if uncertain use a descriptive name like "Korean-style beef rice bowl", and mark uncertain. Do NOT force unrelated food into a Korean or Indian cuisine. Include sides/sauces visibly served as part of the single meal in the dish name or notes. If two clearly independent plated MEALS, choose one complete shared dish label such as "Two-course meal" and mention components; never double count.

Also provide a CAUTIOUS nutritional estimate for the ENTIRE photographed serving (not per ingredient or per 100 g) based on typical cooked recipes/restaurant servings and visible approximate volume. Estimated total kcal, protein/carbs/fat/fibre in grams, and a plausibly broad lower/upper kcal range reflecting uncertainty in oil, sauces, hidden ingredients, bowl depth and actual portion size. These values are only guesses and NEVER measured or verified; do not imply false precision. Use whole-number rounded estimates. Do not pretend to see under toppings or inside food. Do not invent dietary restrictions or specific ingredients. If the photo isn't identifiable as food, set meal to null. Provide estimatedGrams as a rough visual guess (100 to 2000) and servingDescription such as "one medium restaurant bowl" or "one large masala dosa with sides". Distinguish label from assumptions and uncertainty. For mixed dishes use ONE combined estimate, not ingredient-by-ingredient totals.

Return ONLY this JSON object with exactly these keys, no code fences, no commentary:
{"meal":{"name":"Korean-style beef rice bowl","servingDescription":"One medium restaurant bowl","estimatedGrams":500,"calories":720,"protein":32,"carbs":85,"fat":28,"fibre":7,"calorieLow":500,"calorieHigh":1000,"uncertain":true,"assumptions":"Rice may be beneath toppings. Sauce, oil and serving weight are unknown."}}
Numbers above are examples only, NOT expected values for any given photo. Every key is required. Use "meal":null only when there is no recognisable meal.`;
export function buildHfRequest(image,model=MODEL_PREFERENCES[0]){
 return {model,max_tokens:950,temperature:0.1,stream:false,messages:[{
  role:'user',content:[
   {type:'text',text:INSTRUCTIONS},
   {type:'image_url',image_url:{url:image}}
  ]
 }]};
}
const MAX_NUTRIENTS={calories:4500,protein:350,carbs:700,fat:350,fibre:130};
const numeric=(value,min,max)=>{
 if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)return null;
 return Math.round(value);
};
export function parseDishEstimate(text){
 if(typeof text!=='string'||text.length>24000)throw Error('Invalid model output');
 const trimmed=text.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'');
 const data=JSON.parse(trimmed);
 if(!data||!Object.hasOwn(data,'meal'))throw Error('Missing meal');
 if(data.meal===null)return null;
 const meal=data.meal;
 if(!meal||typeof meal!=='object'||Array.isArray(meal))throw Error('Invalid meal');
 const name=typeof meal.name==='string'?meal.name.trim().slice(0,100):'';
 const servingDescription=typeof meal.servingDescription==='string'?meal.servingDescription.trim().slice(0,110):'';
 if(name.length<3||servingDescription.length<3)throw Error('Dish name or serving missing');
 const n={};
 for(const [key,max] of Object.entries(MAX_NUTRIENTS)){
  n[key]=numeric(meal[key],key==='calories'?1:0,max);
  if(n[key]===null)throw Error('Invalid nutrition estimate');
 }
 const calorieLow=numeric(meal.calorieLow,1,4500);
 const calorieHigh=numeric(meal.calorieHigh,1,4500);
 if(calorieLow===null||calorieHigh===null||calorieLow>n.calories||calorieHigh<n.calories)
  throw Error('Invalid calorie uncertainty range');
 const estimatedGrams=numeric(meal.estimatedGrams,50,3000);
 if(estimatedGrams===null)throw Error('Invalid serving weight estimate');
 return {name,servingDescription,estimatedGrams,...n,calorieLow,calorieHigh,
  uncertain:meal.uncertain!==false,
  assumptions:typeof meal.assumptions==='string'?meal.assumptions.trim().slice(0,340):''};
}

const TEST_HTML="<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<meta name=\"robots\" content=\"noindex,nofollow\">\n<title>Recomp | Private AI Photo Test</title>\n<style>\n:root{color-scheme:dark;font-family:system-ui,-apple-system,Arial,sans-serif;background:#080d0e;color:#eaf5f1}\n*{box-sizing:border-box}body{margin:0;padding:20px 12px;min-height:100vh}\nmain{max-width:570px;margin:auto}.eyebrow{color:#8fd6b8;letter-spacing:.14em;font-size:11px;font-weight:750}\nh1{margin:10px 0;font-size:27px;letter-spacing:-.035em}p{color:#a8bcb6;font-size:14px;line-height:1.6}\n.card{background:#11191b;border:1px solid #283c37;border-radius:19px;padding:19px;margin:16px 0;display:grid;gap:13px}\nlabel{display:grid;gap:7px;font-size:13px;font-weight:680}\ninput{width:100%;border:1px solid #3a5950;border-radius:12px;background:#081011;color:white;padding:13px;font:inherit;font-size:16px}\nbutton{min-height:47px;border:0;border-radius:12px;padding:11px 14px;background:#89dfb7;color:#10231b;font:inherit;font-weight:750;cursor:pointer}\nbutton:disabled{opacity:.58;cursor:wait}\n.small{font-size:12px}.status{color:#a9dbbd;margin:0;overflow-wrap:anywhere}\n.result{padding:13px;border:1px solid #3b6352;border-radius:13px;background:#182922}\n.result b{display:block;margin-bottom:5px}.result p{margin:0}.warning{color:#ffde9a}\n.hidden{display:none}footer{font-size:12px;color:#a8bcb6;line-height:1.5}\n</style>\n</head>\n<body><main>\n<div class=\"eyebrow\">RECOMP · PRIVATE TEST</div>\n<h1>AI Meal Scanner</h1>\n<p>Test the Cloudflare Worker and Hugging Face model before publishing Recomp v2.7. This page is hosted by your own Worker; it doesn't change your food diary or any saved workouts.</p>\n<section class=\"card\">\n<form id=\"scan-form\" style=\"display:grid;gap:15px\" autocomplete=\"off\">\n<label>1. Private Worker scan access token <input id=\"token\" type=\"password\" autocomplete=\"off\" spellcheck=\"false\" required placeholder=\"SCAN_ACCESS_TOKEN value\"></label>\n<label>2. Food photo <input id=\"photo\" type=\"file\" accept=\"image/*\" required></label>\n<button id=\"scan\" type=\"submit\">Test food recognition</button>\n<button id=\"check-models\" type=\"button\" style=\"background:#243e35;color:#daf6e7;border:1px solid #497461\">Check Hugging Face vision connection (free)</button>\n</form>\n<p class=\"small\">Do NOT enter your Hugging Face HF_TOKEN here. Use only your separate SCAN_ACCESS_TOKEN. Nothing is sent until you press Test. Hugging Face may charge inference credits for this request.</p>\n<p id=\"status\" class=\"status\" role=\"status\" aria-live=\"polite\">Ready when you are.</p>\n</section>\n<section class=\"card hidden\" id=\"results\"><div class=\"eyebrow\">SUGGESTED FOODS · REVIEW ONLY</div><div id=\"foods\" style=\"display:grid;gap:9px\"></div><p class=\"small\">AI cannot accurately determine hidden ingredients, cooking oil or exact gram weights. These are suggestions only and will NOT be saved in Recomp.</p></section>\n<footer>Photo is resized in your browser, sent directly to this Worker, and forwarded to the configured Hugging Face inference provider. The page keeps no saved token, photo or diary data. Don't test images with people or private documents.</footer>\n</main>\n<script>\n(function(){\n var form=document.getElementById('scan-form');\n var button=document.getElementById('scan');\n var status=document.getElementById('status');\n var box=document.getElementById('results');\n var list=document.getElementById('foods');\n document.getElementById('check-models').addEventListener('click',async function(){\n  var token=document.getElementById('token').value;\n  if(!token){status.textContent='Enter your separate Worker access token first.';return;}\n  status.textContent='Checking live Hugging Face vision models without sending a photo…';\n  try{\n   var response=await fetch('/models',{headers:{'Authorization':'Bearer '+token},cache:'no-store'});\n   var data=await response.json();\n   if(!response.ok)throw Error(data.error||'Connection test failed.');\n   status.textContent='Connection ready: '+data.selected+' ('+data.models.length+' image models available). Now try a photo.';\n  }catch(error){status.textContent='Connection failed: '+error.message;}\n });\n form.addEventListener('submit',async function(event){\n  event.preventDefault();\n  var token=document.getElementById('token').value;\n  var photo=document.getElementById('photo').files[0];\n  if(!token||!photo)return;\n  if(photo.size>18*1024*1024){status.textContent='Choose a photograph smaller than 18 MB.';return;}\n  button.disabled=true;box.classList.add('hidden');list.replaceChildren();\n  status.textContent='Preparing a smaller photo in this browser…';\n  var bitmap=null;\n  try{\n   if(!photo.type.startsWith('image/'))throw Error('Choose an image file.');\n   bitmap=await createImageBitmap(photo);\n   var scale=Math.min(1,1120/Math.max(bitmap.width,bitmap.height));\n   var canvas=document.createElement('canvas');\n   canvas.width=Math.max(1,Math.round(bitmap.width*scale));\n   canvas.height=Math.max(1,Math.round(bitmap.height*scale));\n   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);\n   bitmap.close();bitmap=null;\n   var image=canvas.toDataURL('image/jpeg',0.72);\n   canvas.width=0;canvas.height=0;\n   if(image.length>2800000)throw Error('Compressed photo is too large. Try a smaller image.');\n   status.textContent='Asking Hugging Face to identify the visible foods…';\n   var response=await fetch('/scan',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({image:image}),cache:'no-store',credentials:'same-origin'});\n   image=null;\n   var data=await response.json();\n   if(!response.ok)throw Error(data.error||'Scan failed ('+response.status+').');\n   if(!Array.isArray(data.items))throw Error('Scanner returned an invalid food list.');\n   box.classList.remove('hidden');\n   if(!data.items.length){status.textContent='The model could not identify clear food items.';return;}\n   for(var i=0;i<data.items.length;i++){\n    var item=data.items[i],card=document.createElement('article');card.className='result';\n    var heading=document.createElement('b');heading.textContent=item.name+(item.uncertain?' · uncertain':'');\n    var notes=document.createElement('p');notes.textContent=(item.visualEvidence||'')+(item.portionHint?' · Looks like '+item.portionHint:'');\n    card.append(heading,notes);list.appendChild(card);\n   }\n   status.textContent='Success with '+(data.model||'Hugging Face vision')+'! Found '+data.items.length+' possible food item(s). Check accuracy before logging.';\n  }catch(err){status.textContent='Scan failed: '+(err&&err.message?err.message:'Please try again.');}\n  finally{if(bitmap)bitmap.close();button.disabled=false;}\n });\n}());\n</script>\n</body></html>";
export async function handleScan(request,env,fetchImpl=fetch){
 const origin=request.headers.get('Origin')||'';
 const path=new URL(request.url).pathname;
 if(path==='/test'&&request.method==='GET')return new Response(TEST_HTML,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',"Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src data: blob:; base-uri 'none'; form-action 'none'"}});
 if(request.method==='OPTIONS'){
  if(!isAllowedOrigin(origin))return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,
   'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type',
   'Access-Control-Max-Age':'600','Vary':'Origin'}});
 }
 if(!['/scan','/models'].includes(path))return json({error:'Not found'},404,origin);
 if((path==='/scan'&&request.method!=='POST')||(path==='/models'&&request.method!=='GET'))
  return json({error:'Method not allowed'},405,origin);
 // Same-origin GET requests omit Origin in some browsers. Token is still required.
 if(!isAllowedOrigin(origin)&&!(path==='/models'&&!origin&&new URL(request.url).origin===TEST_ORIGIN))return json({error:'Origin is not allowed.'},403);
 if(!env?.HF_TOKEN||!env?.SCAN_ACCESS_TOKEN)return json({error:'Scanner is not configured. Add Hugging Face and access-token Worker secrets.'},503,origin);
 if(request.headers.get('Authorization')!=='Bearer '+env.SCAN_ACCESS_TOKEN)return json({error:'Incorrect private scanner access token.'},401,origin);
 // Check model availability without a billed photo inference call.
 if(path==='/models'){
  try{const models=await getVisionModels(env,fetchImpl);
   return json({selected:models[0].id,models},200,origin);}
  catch(e){return json({error:String(e.message).slice(0,230)},503,origin);}
 }
 if(!/application\/json/i.test(request.headers.get('Content-Type')||''))return json({error:'Expected JSON.'},415,origin);
 const declared=Number(request.headers.get('Content-Length')||0);
 if(declared>MAX_BYTES)return json({error:'Photo is too large.'},413,origin);
 const raw=await request.text();
 if(raw.length>MAX_BYTES)return json({error:'Photo is too large.'},413,origin);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid photo request.'},400,origin);}
 const image=body?.image;
 if(typeof image!=='string'||image.length>2_800_000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image))
  return json({error:'Expected a compressed JPEG photo.'},400,origin);
 let models;
 try{models=await getVisionModels(env,fetchImpl);}
 catch(e){return json({error:String(e.message).slice(0,230)},503,origin);}
 let response=null,selected=null,failedModel=null;
 // The alternate model is attempted only if a provider rejects the selected
 // model or request (400/404), never for auth, quota or billing problems.
 for(const candidate of models.slice(0,2)){
  selected=candidate.id;
  try{response=await fetchImpl('https://router.huggingface.co/v1/chat/completions',{method:'POST',headers:{
     'Authorization':'Bearer '+env.HF_TOKEN,'Content-Type':'application/json'
    },body:JSON.stringify(buildHfRequest(image,selected)),signal:AbortSignal.timeout(40000)});}
  catch{return json({error:'Hugging Face image recognition is temporarily unreachable.'},502,origin);}
  if(response.ok)break;
  if(response.status===400||response.status===404){failedModel=selected;continue;}
  break;
 }
 if(!response.ok){
  const status=response.status,routeError=status===400||status===404;
  return json({error:status===402?'Hugging Face credits are exhausted. Add credits to continue.':
   status===429?'Hugging Face requests are rate-limited. Try again later.':
   status===401||status===403?'Hugging Face access token needs updating or lacks Inference Providers access.':
   routeError?'Hugging Face rejected '+failedModel+' (HTTP '+status+'). This provider may not support the image request.':
   'Hugging Face could not analyse the photo (HTTP '+status+').'},status===402?402:502,origin);
 }
 let output;try{output=await response.json();}catch{return json({error:'Unreadable response from image recognition.'},502,origin);}
 let meal;
 try{meal=parseDishEstimate(output?.choices?.[0]?.message?.content);}catch{
  return json({error:'The vision model did not return a valid dish and nutrition estimate. Try again or enter the meal manually.'},502,origin);
 }
 return json({meal,model:selected,estimateSource:'AI photo estimate — not measured'},200,origin);
}
export default {async fetch(request,env){return handleScan(request,env);}};
