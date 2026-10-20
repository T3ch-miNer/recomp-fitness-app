// Recomp optional photo-vision client. Never send a Hugging Face provider token from a browser.
// The owner deploys a separate Worker with HF_TOKEN in encrypted secrets.
// Keep provider keys off the browser. Owners can explicitly remember a separate
// Worker-only access token on a trusted device so photos can scan automatically.
const URL_KEY='recomp-photo-ai-endpoint-v1';
const PRIVATE_DEVICE_KEY='recomp-photo-ai-device-worker-access-v1';
// Public Worker address supplied by the Recomp owner. No credentials live here.
export const DEFAULT_PHOTO_AI_ENDPOINT='https://recomp-food-ai.rahul-dbz95.workers.dev/scan';
let sessionAccessToken='';
export function getPhotoAiSavedAccessToken(){
 try{
  const value=String(localStorage.getItem(PRIVATE_DEVICE_KEY)||'');
  return value.length>0&&value.length<=256&&!/^(?:sk[-_]|hf_)/i.test(value)?value:'';
 }catch{return '';}
}
export function getPhotoAiSessionToken(){return sessionAccessToken||getPhotoAiSavedAccessToken();}
export function savePhotoAiDeviceToken(value){
 rememberPhotoAiSessionToken(value);
 if(!sessionAccessToken)throw Error('Enter a private Worker access token first.');
 try{localStorage.setItem(PRIVATE_DEVICE_KEY,sessionAccessToken);}
 catch{throw Error('Could not remember access on this device. Browser storage may be disabled.');}
 return true;
}
export function forgetPhotoAiDeviceToken(){
 try{localStorage.removeItem(PRIVATE_DEVICE_KEY);}catch{}
 sessionAccessToken='';
}

export function rememberPhotoAiSessionToken(value){
 const token=String(value||'');
 // Cloudflare checks exact equality and does NOT impose a 12-character minimum.
 // Rejecting shorter valid codes here falsely reported authentication failure.
 if(token && (token.length>256||/^(?:sk[-_]|hf_)/i.test(token)))
  throw Error('Use the separate Worker access code (up to 256 characters), not a Hugging Face API key.');
 sessionAccessToken=token;
 return Boolean(token);
}
export function getPhotoAiEndpoint(){try{return localStorage.getItem(URL_KEY)||DEFAULT_PHOTO_AI_ENDPOINT;}catch{return DEFAULT_PHOTO_AI_ENDPOINT;}}
export function savePhotoAiEndpoint(value){
 const input=String(value||'').trim();
 const url=new URL(input);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.hostname||/\s/.test(input))throw Error('Enter a secure HTTPS scan endpoint without credentials or query parameters.');
 const clean=url.origin+(url.pathname==='/'?'/scan':url.pathname);
 try{localStorage.setItem(URL_KEY,clean);}catch{}
 return clean;
}
// Treat all model/provider output as untrusted. Never treat AI numbers as measured.
export function normalisePhotoMeal(body){
 if(!body||!Object.hasOwn(body,'meal'))
  throw Error('The Worker is running an older ingredient-only scanner. Deploy the latest Recomp Worker code.');
 if(body.meal===null)return {meal:null,model:String(body.model||'').slice(0,100)};
 const m=body.meal;
 if(!m||typeof m!=='object'||Array.isArray(m))
  throw Error('The scanner did not return a valid meal.');
 const name=String(m.name||'').trim().slice(0,100);
 const servingDescription=String(m.servingDescription||'').trim().slice(0,110);
 if(name.length<3||servingDescription.length<3)throw Error('Unrecognisable dish or serving.');
 const validate=(key,min,max)=>{
  if(typeof m[key]!=='number'||!Number.isFinite(m[key])||m[key]<min||m[key]>max)
   throw Error('Invalid AI nutrition estimate for '+key+'.');
  return Math.round(m[key]);
 };
 const meal={name,servingDescription,estimatedGrams:validate('estimatedGrams',50,3000),
  calories:validate('calories',1,4500),
  protein:validate('protein',0,350),carbs:validate('carbs',0,700),
  fat:validate('fat',0,350),fibre:validate('fibre',0,130),
  calorieLow:validate('calorieLow',1,4500),calorieHigh:validate('calorieHigh',1,4500),
  uncertain:m.uncertain!==false,
  assumptions:String(m.assumptions||'').trim().slice(0,340)};
 if(meal.calorieLow>meal.calories||meal.calorieHigh<meal.calories)
  throw Error('Invalid nutrition uncertainty range.');
 return {meal,model:String(body.model||'').slice(0,100)};
}
// Pure diary builder: one reviewed whole-dish estimate becomes ONE entry.
// No image, provider key, or unreviewed ingredient list is stored.
export function buildAiDishDiaryEntry({meal,date,mealType,model}){
 if(!meal||typeof meal!=='object')throw Error('Scan and review a dish first.');
 const name=String(meal.name||'').trim(),serving=String(meal.servingDescription||'').trim();
 if(name.length<3||name.length>100||serving.length<3||serving.length>110)
  throw Error('Review the dish name and serving.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date))||
   Number.isNaN(Date.parse(String(date)+'T12:00:00')))throw Error('Choose a valid date.');
 if(!['Breakfast','Lunch','Dinner','Snack'].includes(mealType))throw Error('Choose a meal.');
 const max={estimatedGrams:3000,calories:4500,protein:350,carbs:700,fat:350,fibre:130};
 const values={};
 for(const [key,limit] of Object.entries(max)){
  const v=meal[key],min=key==='calories'?1:key==='estimatedGrams'?50:0;
  if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>limit)
   throw Error('Check the '+key+' estimate.');
  values[key]=Math.round(v);
 }
 const low=Number(meal.calorieLow),high=Number(meal.calorieHigh);
 const validRange=Number.isFinite(low)&&Number.isFinite(high)&&low>=1&&
  high<=4500&&low<=values.calories&&values.calories<=high;
 const range=validRange?{low:Math.round(low),high:Math.round(high)}:null;
 return {date,meal:mealType,name,grams:values.estimatedGrams,
  calories:values.calories,protein:values.protein,carbs:values.carbs,
  fat:values.fat,fibre:values.fibre,
  source:'AI photo estimate (Hugging Face; user reviewed)',aiEstimate:true,
  aiModel:String(model||'').slice(0,100),servingDescription:serving,
  aiCalorieRange:range,aiAssumptions:String(meal.assumptions||'').slice(0,340),
  aiUncertain:meal.uncertain!==false};
}

/** Turn a failed Worker/provider request into a useful, non-secret browser message. */
export function explainPhotoAiFailure(error){
 const raw=String(error?.message||'The image scan failed.').slice(0,230);
 const lower=raw.toLowerCase();
 if(error?.name==='AbortError')return {issue:'cancelled',message:'Recognition cancelled. No meal was saved.'};
 if(error?.httpStatus===401||/incorrect private scanner access token/.test(lower))
  return {issue:'access',message:'The Cloudflare Worker returned HTTP 401. Check that Recomp is using the same Worker URL as the /test page and that its SCAN_ACCESS_TOKEN secret still matches. You can also use Change scanner access code. Do not share the code.'};
 if(/enter the private scan access token|enter a private worker access token/.test(lower))
  return {issue:'access',message:'No Worker access code has been entered, so the request was not sent to Cloudflare.'};
 if(/use the separate worker access code|do not paste a hugging face/.test(lower))
  return {issue:'access',message:'Enter your separate Worker access code, not the Hugging Face API token. This check was performed locally.'};
 if(/secure scanner unavailable|failed to fetch|networkerror|load failed|internet|connection/.test(lower))
  return {issue:'connection',message:'Could not contact the photo scanner. Check your connection and Worker URL, then retry.'};
 if(/image|jpeg|decode|bitmap|oversized photo/.test(lower)&&!/model|hugging face/.test(lower))
  return {issue:'photo',message:raw+'. Try a JPEG or PNG photo if the image cannot be processed.'};
 if(/credits|billing|payment|quota|rate.limit|429|402/.test(lower))
  return {issue:'provider',message:raw+'. Hugging Face availability and credits need checking.'};
 if(/origin is not allowed|scanner is not configured|worker.*older/.test(lower))
  return {issue:'configuration',message:raw+' The Cloudflare Worker configuration or deployment needs checking.'};
 return {issue:'provider',message:raw};
}
/** Auth-only model check. Does not upload a photo or consume image inference credits. */
export async function checkPhotoAiConnection({endpoint,accessToken,signal,fetchImpl=fetch}){
 const safeEndpoint=savePhotoAiEndpoint(endpoint);
 if(typeof accessToken!=='string'||!accessToken||accessToken.length>256)
  throw Error('Enter the private scan access token from your Worker.');
 if(/^(?:sk[-_]|hf_)/i.test(accessToken))
  throw Error('Do not paste a Hugging Face or OpenAI API token into Recomp. Use a separate Worker access token.');
 const modelURL=new URL('/models',safeEndpoint).toString();
 let response;
 try{response=await fetchImpl(modelURL,{
  method:'GET',headers:{'Authorization':'Bearer '+accessToken},
  cache:'no-store',credentials:'omit',signal
 });}
 catch(error){if(error?.name==='AbortError')throw error;throw Error('Secure scanner unavailable. Check the Worker URL and internet connection.');}
 let data;
 try{data=await response.json();}catch{throw Error('The scanner returned an unreadable response.');}
 if(!response.ok){
  const error=new Error(String(data?.error||'Scanner connection check failed ('+response.status+').').slice(0,200));
  error.httpStatus=response.status;
  throw error;
 }
 return {model:String(data?.selected||'Hugging Face vision').slice(0,100)};
}
export async function scanPhotoWithWorker({endpoint,accessToken,imageDataUrl,signal,fetchImpl=fetch}){
 const safeEndpoint=savePhotoAiEndpoint(endpoint);
 if(!accessToken||typeof accessToken!=='string'||accessToken.length>256)throw Error('Enter the private scan access token from your Worker.');
 if(/^(?:sk[-_]|hf_)/i.test(accessToken))throw Error('Do not paste a Hugging Face or OpenAI API token into Recomp. Use a separate Worker access token.');
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(imageDataUrl))||imageDataUrl.length>2_800_000)throw Error('Invalid or oversized photo. Try a smaller image.');
 let response;
 try{response=await fetchImpl(safeEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+accessToken},body:JSON.stringify({image:imageDataUrl}),signal,cache:'no-store',credentials:'omit'});}
 catch(error){if(error?.name==='AbortError')throw error;throw Error('Secure scanner unavailable. Check the Worker URL and internet connection.');}
 let data;
 try{data=await response.json();}catch{throw Error('The scanner returned an unreadable response.');}
 if(!response.ok){
  const error=new Error(String(data?.error||'AI scan failed ('+response.status+').').slice(0,200));
  error.httpStatus=response.status;
  throw error;
 }
 return normalisePhotoMeal(data);
}
