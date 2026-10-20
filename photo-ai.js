// Recomp optional photo-vision client. Never send an OpenAI API key from a browser.
// The owner deploys a separate Worker with OPENAI_API_KEY in encrypted secrets.
// The public endpoint URL can be remembered; access passphrase is memory-only.
const URL_KEY='recomp-photo-ai-endpoint-v1';
export function getPhotoAiEndpoint(){try{return localStorage.getItem(URL_KEY)||'';}catch{return '';}}
export function savePhotoAiEndpoint(value){
 const input=String(value||'').trim();
 const url=new URL(input);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!url.hostname||/\s/.test(input))throw Error('Enter a secure HTTPS scan endpoint without credentials or query parameters.');
 const clean=url.origin+url.pathname;
 try{localStorage.setItem(URL_KEY,clean);}catch{}
 return clean;
}
export function normalisePhotoItems(body){
 if(!body||!Array.isArray(body.items))throw Error('The scanner did not return a valid food list.');
 return body.items.slice(0,12).flatMap(item=>{
  const name=String(item?.name||'').trim().slice(0,90);
  if(name.length<2)return [];
  return [{name,visualEvidence:String(item?.visualEvidence||'').trim().slice(0,140),
   portionHint:String(item?.portionHint||'').trim().slice(0,100),
   uncertain:Boolean(item?.uncertain)}];
 });
}
export async function scanPhotoWithWorker({endpoint,accessToken,imageDataUrl,signal,fetchImpl=fetch}){
 const safeEndpoint=savePhotoAiEndpoint(endpoint);
 if(!accessToken||typeof accessToken!=='string'||accessToken.length<12||accessToken.length>256)throw Error('Enter the private scan access token from your Worker.');
 if(/^sk[-_]/i.test(accessToken))throw Error('Do not paste an OpenAI API key into Recomp. Use a separate Worker access token.');
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(imageDataUrl))||imageDataUrl.length>2_800_000)throw Error('Invalid or oversized photo. Try a smaller image.');
 let response;
 try{response=await fetchImpl(safeEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+accessToken},body:JSON.stringify({image:imageDataUrl}),signal,cache:'no-store',credentials:'omit'});}
 catch(error){if(error?.name==='AbortError')throw error;throw Error('Secure scanner unavailable. Check the Worker URL and internet connection.');}
 let data;
 try{data=await response.json();}catch{throw Error('The scanner returned an unreadable response.');}
 if(!response.ok)throw Error(String(data?.error||'AI scan failed ('+response.status+').').slice(0,200));
 return normalisePhotoItems(data);
}
