// Recomp optional photo-vision client. Never send a Hugging Face provider token from a browser.
// The owner deploys a separate Worker with HF_TOKEN in encrypted secrets.
// The public endpoint URL can be remembered; access passphrase is memory-only.
const URL_KEY='recomp-photo-ai-endpoint-v1';
// Public Worker address supplied by the Recomp owner. No credentials live here.
export const DEFAULT_PHOTO_AI_ENDPOINT='https://recomp-food-ai.rahul-dbz95.workers.dev/scan';
let sessionAccessToken='';
export function getPhotoAiSessionToken(){return sessionAccessToken;}
export function rememberPhotoAiSessionToken(value){
 const token=String(value||'');
 if(token && (token.length<12||token.length>256||/^(?:sk[-_]|hf_)/i.test(token)))throw Error('Use a private Worker access token, not a provider API key.');
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
export async function scanPhotoWithWorker({endpoint,accessToken,imageDataUrl,signal,fetchImpl=fetch}){
 const safeEndpoint=savePhotoAiEndpoint(endpoint);
 if(!accessToken||typeof accessToken!=='string'||accessToken.length<12||accessToken.length>256)throw Error('Enter the private scan access token from your Worker.');
 if(/^(?:sk[-_]|hf_)/i.test(accessToken))throw Error('Do not paste a Hugging Face or OpenAI API token into Recomp. Use a separate Worker access token.');
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(imageDataUrl))||imageDataUrl.length>2_800_000)throw Error('Invalid or oversized photo. Try a smaller image.');
 let response;
 try{response=await fetchImpl(safeEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+accessToken},body:JSON.stringify({image:imageDataUrl}),signal,cache:'no-store',credentials:'omit'});}
 catch(error){if(error?.name==='AbortError')throw error;throw Error('Secure scanner unavailable. Check the Worker URL and internet connection.');}
 let data;
 try{data=await response.json();}catch{throw Error('The scanner returned an unreadable response.');}
 if(!response.ok)throw Error(String(data?.error||'AI scan failed ('+response.status+').').slice(0,200));
 return normalisePhotoMeal(data);
}
