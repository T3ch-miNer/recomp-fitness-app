import { searchFoods, findFood, nutrientsForGrams } from './food-db.js';

// Recomp hybrid nutrition: free offline recipe search, optional local photo hints,
// and Open Food Facts barcode lookups. Nothing is logged without confirmation.
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keys = ['calories','protein','carbs','fat','fibre'];
const opts = ['Breakfast','Lunch','Dinner','Snack'];
let recognitionWorker=null,recognitionCounter=0;
async function foodImageRegions(file){
 let bitmap;
 try {
  bitmap=await createImageBitmap(file);
  const w=bitmap.width,h=bitmap.height;
  if(w<10||h<10)throw Error('Choose a clearer meal photograph.');
  const regions=[[0,0,w,h]];
  if(w>=380)regions.push([0,0,Math.round(w*.62),h],[Math.round(w*.38),0,Math.round(w*.62),h]);
  else if(h>=380)regions.push([0,0,w,Math.round(h*.62)],[0,Math.round(h*.38),w,Math.round(h*.62)]);
  return regions.slice(0,3).map(([x,y,rw,rh])=>{
   const scale=Math.min(448/rw,448/rh,1),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(rw*scale));
   canvas.height=Math.max(1,Math.round(rh*scale));
   canvas.getContext('2d',{alpha:false}).drawImage(bitmap,x,y,rw,rh,0,0,canvas.width,canvas.height);
   return canvas.toDataURL('image/jpeg',.79);
  });
 } finally {bitmap?.close?.();}
}
async function recogniseFoodLocally(file,onStatus){
 if(typeof Worker==='undefined')throw Error('This browser does not support on-device recognition.');
 const id=++recognitionCounter;
 if(!recognitionWorker)recognitionWorker=new Worker(new URL('./food-recognition-worker.js',import.meta.url),{type:'module'});
 const regions=await foodImageRegions(file);
 const labels=searchFoods('',100).map(food=>({id:food.id,label:food.name}));
 return new Promise((resolve,reject)=>{
  const finish=()=>{recognitionWorker.removeEventListener('message',onMessage);recognitionWorker.removeEventListener('error',onError);};
  const onMessage=e=>{
   if(e.data?.id!==id)return;
   if(e.data.type==='status'){onStatus(String(e.data.message||'Recognising foods…'));return;}
   finish();
   if(e.data.type==='result')resolve(e.data.suggestions||[]);
   else reject(Error(e.data.message||'Local recognition failed'));
  };
  const onError=()=>{finish();recognitionWorker?.terminate();recognitionWorker=null;reject(Error('The model could not load. Use search instead.'));};
  recognitionWorker.addEventListener('message',onMessage);
  recognitionWorker.addEventListener('error',onError);
  recognitionWorker.postMessage({type:'recognise',id,regions,labels});
 });
}


export function openNutrition({meal='Breakfast', save, manual, notify}) {
 let mode='menu', chosen=[], query='', selectedMeal=opts.includes(meal)?meal:'Breakfast';
 let photoFile=null, photoURL='', suggestions=[], finding=false, msg='';
 let barcode='', product=null, loading=false, scanner=null, stream=null, scanTimer=null;
 const root=document.createElement('div');
 root.className='nv-backdrop';
 root.setAttribute('role','presentation');
 document.body.append(root);
 function stopCamera(){
  if(scanTimer)clearInterval(scanTimer);scanTimer=null;
  if(stream)stream.getTracks().forEach(x=>x.stop());stream=null;
  const v=root.querySelector('video');if(v)v.srcObject=null;
 }
 function close(){
  stopCamera();
  if(photoURL)URL.revokeObjectURL(photoURL);
  root.remove();document.removeEventListener('keydown',escapeKey);
 }
 function escapeKey(e){if(e.key==='Escape')close();}
 document.addEventListener('keydown',escapeKey);
 const option = (v,label) => '<option value="'+esc(v)+'"'+(selectedMeal===v?' selected':'')+'>'+esc(label)+'</option>';
 function findMatches(){
  return searchFoods(query,18).map(f=>'<button type="button" class="nv-result" data-nv="add" data-id="'+esc(f.id)+'"><b>'+esc(f.name)+'</b><small>'+esc(f.category)+' · '+f.per100.calories+' kcal / 100 g · estimate</small><span>+</span></button>').join('') || '<p class="nv-help">No matching dishes. Try another name or use manual entry.</p>';
 }
 function selectedView(){
  if(!chosen.length)return '<p class="nv-help">Select a food to enter its cooked weight and review nutrition.</p>';
  let totals=Object.fromEntries(keys.map(k=>[k,0]));
  const lines=chosen.map((x,i)=>{
   let amounts;
   try{amounts=nutrientsForGrams(x.food,x.grams);}catch{amounts=Object.fromEntries(keys.map(k=>[k,0]));}
   keys.forEach(k=>totals[k]+=amounts[k]);
   return '<div class="nv-item"><div><b>'+esc(x.food.name)+'</b><small>'+Math.round(amounts.calories)+' kcal · P '+amounts.protein+' g · C '+amounts.carbs+' g · F '+amounts.fat+' g</small></div><label><span>g</span><input class="nv-qty" type="number" inputmode="decimal" min="1" max="5000" step="1" data-index="'+i+'" value="'+esc(x.grams)+'" aria-label="Cooked grams for '+esc(x.food.name)+'"></label><button type="button" data-nv="remove" data-index="'+i+'" aria-label="Remove '+esc(x.food.name)+'">×</button></div>';
  }).join('');
  return '<div class="nv-selected"><b>Meal review</b>'+lines+'<p class="nv-total">Estimated total: '+Math.round(totals.calories)+' kcal · P '+Math.round(totals.protein)+' g · C '+Math.round(totals.carbs)+' g · F '+Math.round(totals.fat)+' g</p><p class="nv-help">Recipe values are estimates. Cooking oil, ghee and ingredients can change them.</p><button type="button" class="nv-primary" data-nv="save">Add '+chosen.length+' item'+(chosen.length===1?'':'s')+' to diary</button></div>';
 }
 function searchPanel(){
  return '<label class="nv-label">Search Indian home food<input id="nv-search" class="nv-input" type="search" value="'+esc(query)+'" placeholder="Try roti, dal, poha, paneer…" autocomplete="off"></label><div class="nv-results" id="nv-results">'+findMatches()+'</div>';
 }
 function photoPanel(){
  return '<label class="nv-label">Take or upload a meal photograph<input id="nv-photo" class="nv-input" type="file" accept="image/*" capture="environment"></label>'+
  (photoURL?'<img class="nv-preview" src="'+esc(photoURL)+'" alt="Selected meal photograph">':'')+
  '<p class="nv-help">For a mixed Indian thali, add each food and its cooked weight below. The image stays on your device.</p>'+
  (photoFile?'<button type="button" data-nv="recognise" class="nv-button" '+(finding?'disabled':'')+'>'+(finding?'Recognising on your device…':'Recognise Indian foods free')+'</button>':'')+
  '<p class="nv-help">First use downloads a free local model (roughly 55 MB). It compares photos with Indian dish names; it may miss items on a mixed plate. No image upload or API key.</p>'+
  (suggestions.length?'<div class="nv-suggestions"><b>Possible foods · tap to add</b>'+suggestions.map(f=>'<button type="button" class="nv-result" data-nv="add-suggested" data-id="'+esc(f.id)+'"><b>'+esc(f.name)+'</b><small>Unverified photo suggestion · confirm identity and cooked weight</small><span>+</span></button>').join('')+'</div>':'')+searchPanel();
 }
 function barcodePanel(){
  const details=product ? '<div class="nv-product"><b>'+esc(product.name)+'</b><p class="nv-help">Open Food Facts · '+Math.round(product.per100.calories)+' kcal per 100 g. Check the label before saving.</p><button type="button" class="nv-button" data-nv="add-product">Add product to meal</button></div>':'';
  return '<label class="nv-label">Enter product barcode<input class="nv-input" id="nv-barcode" type="text" inputmode="numeric" pattern="[0-9]*" value="'+esc(barcode)+'" placeholder="EAN / UPC barcode"></label>'+
  '<button type="button" class="nv-button" data-nv="lookup" '+(loading?'disabled':'')+'>'+(loading?'Looking up product…':'Find packaged food')+'</button> '+
  '<button type="button" class="nv-button" data-nv="camera">Scan with camera</button>'+
  '<div id="nv-camera"></div>'+details+
  '<p class="nv-help">Barcode data: Open Food Facts (ODbL). An internet connection is needed for new lookups. Not all Indian brands are listed.</p>';
 }
 function render(){
  root.innerHTML='<div class="nv-sheet" role="dialog" aria-modal="true" aria-label="Log food"><div class="nv-head"><div><b>+ Food</b><small>Recomp Smart Nutrition</small></div><button type="button" class="nv-close" data-nv="close" aria-label="Close">×</button></div>'+
   (mode==='menu'?'<p class="nv-help">Choose how to log your meal</p><div class="nv-options"><button data-nv="mode" data-mode="search">⌕ <b>Search food</b><small>Indian home dishes · offline</small></button><button data-nv="mode" data-mode="photo">▣ <b>Photo meal</b><small>Photo + optional local suggestions</small></button><button data-nv="mode" data-mode="barcode">▥ <b>Scan barcode</b><small>Open Food Facts · free</small></button></div>':'<div class="nv-toolbar"><button type="button" class="nv-link" data-nv="back">← All methods</button><label>Meal <select id="nv-meal">'+opts.map(m=>option(m,m)).join('')+'</select></label></div>'+
   '<h3 class="nv-section-title">'+({'search':'Indian food search','photo':'Photo meal','barcode':'Barcode lookup'}[mode]||'Food')+'</h3>'+
   (mode==='search'?searchPanel():mode==='photo'?photoPanel():barcodePanel())+
   (msg?'<p class="nv-message" role="status">'+esc(msg)+'</p>':'')+selectedView()+
   '<button type="button" class="nv-link nv-manual" data-nv="manual">Enter nutrition manually instead</button>')+'</div>';
 }
 async function lookup(){
  barcode=barcode.trim();
  if(!/^\d{8,14}$/.test(barcode)){msg='Enter an 8 to 14 digit barcode.';render();return;}
  stopCamera();loading=true;msg='';render();
  try{
   const url='https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(barcode)+'.json?fields=code,product_name,brands,nutriments';
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
   let response;try{response=await fetch(url,{signal:controller.signal});}finally{clearTimeout(timer);}
   if(!response.ok)throw Error('Product lookup unavailable right now');
   const data=await response.json(),p=data.product||{},nut=p.nutriments||{};
   if(data.status!==1)throw Error('Barcode not found in Open Food Facts');
   const c=Number(nut['energy-kcal_100g'] ?? Number(nut.energy_100g)/4.184);
   const per100={calories:c,protein:Number(nut.proteins_100g),carbs:Number(nut.carbohydrates_100g),fat:Number(nut.fat_100g),fibre:Number(nut.fiber_100g||0)};
   if(!Number.isFinite(c)||c<0||!['protein','carbs','fat'].every(k=>Number.isFinite(per100[k])&&per100[k]>=0))throw Error('The product has incomplete nutrition data. Enter values manually.');
   product={name:(p.product_name||p.brands||'Packaged food').slice(0,100),per100};
   msg='Product found. Review the name and nutrition.';
  }catch(e){product=null;msg=e.message||'Lookup failed. Please try manual entry.';}
  loading=false;render();
 }
 async function camera(){
  if(!navigator.mediaDevices?.getUserMedia||!('BarcodeDetector' in window)){msg='Automatic camera scanning is not supported here. Enter the barcode digits instead.';render();return;}
  try{
   stopCamera();
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
   msg='Point the camera at the barcode.';render();
   const video=document.createElement('video');video.setAttribute('playsinline','');video.muted=true;video.autoplay=true;video.srcObject=stream;
   root.querySelector('#nv-camera').replaceChildren(video);
   await video.play();const detector=new BarcodeDetector({formats:['ean_8','ean_13','upc_a','upc_e','code_128']});
   let busy=false;
   scanTimer=setInterval(async()=>{
    if(busy||video.readyState<2)return;busy=true;
    try{const codes=await detector.detect(video);if(codes.length){barcode=String(codes[0].rawValue).replace(/\D/g,'');await lookup();}}catch{}finally{busy=false;}
   },500);
  }catch(e){stopCamera();msg='Camera unavailable. Check permission or type the barcode manually.';render();}
 }
 async function recognise(){
  if(!photoFile||finding)return;
  finding=true;msg='Loading local recognition model. First download may take several minutes.';render();
  try{
   const result=await recogniseFoodLocally(photoFile,status=>{
    msg=status;const text=root.querySelector('.nv-message');if(text)text.textContent=status;
   });
   suggestions=result.map(s=>{const f=findFood(s.id);return f?{...f,score:s.score}:null;}).filter(Boolean);
   msg=suggestions.length?'Review suggestions, then enter the cooked weight of every food. Add any missing foods manually.':'No reliable food match. Please search the dishes manually.';
  }catch(e){msg='Local recognition unavailable: '+String(e.message||e).slice(0,160)+'. Search foods manually instead.';}
  finding=false;if(root.isConnected)render();
 }
 async function act(e){
  const btn=e.target.closest('[data-nv]');if(!btn)return;
  e.preventDefault();const a=btn.dataset.nv;
  if(a==='close'){close();return;}
  if(a==='back'){stopCamera();mode='menu';msg='';render();return;}
  if(a==='mode'){mode=btn.dataset.mode;query='';msg='';render();return;}
  if(a==='manual'){close();manual(selectedMeal);return;}
  if(a==='add-suggested'){const food=findFood(btn.dataset.id);if(food&&!chosen.some(x=>x.food.id===food.id)){chosen.push({food,grams:''});msg='Suggested food added. Enter its cooked weight before saving.';render();}return;}\n  if(a==='add'){const food=findFood(btn.dataset.id);if(food){chosen.push({food,grams:food.defaultGrams});msg='Added. Check the cooked weight below.';render();}return;}
  if(a==='remove'){chosen.splice(Number(btn.dataset.index),1);render();return;}
  if(a==='lookup'){await lookup();return;}
  if(a==='camera'){await camera();return;}
  if(a==='recognise'){await recognise();return;}
  if(a==='add-product'){if(product){chosen.push({food:{...product,id:barcode},grams:100});msg='Product added. Check the grams.';render();}return;}
  if(a==='save'){
   if(!chosen.length)return;
   if(chosen.some(x=>!(Number(x.grams)>0&&Number(x.grams)<=5000))){msg='Enter 1 to 5,000 g for each item.';render();return;}
   try{
    btn.disabled=true;
    const entries=chosen.map(x=>({...nutrientsForGrams(x.food,x.grams),name:x.food.name,grams:Number(x.grams),meal:selectedMeal,source:x.food.source||'Open Food Facts'}));
    await save(entries);close();
   }catch(err){msg=err.message||'Could not save this meal';render();}
  }
 }
 root.addEventListener('click', e=>{if(e.target===root){close();return;}act(e).catch(e=>{msg=e.message||'Something went wrong';render();});});
 root.addEventListener('input',e=>{
  if(e.target.id==='nv-search'){query=e.target.value;const results=root.querySelector('#nv-results');if(results)results.innerHTML=findMatches();}
  if(e.target.id==='nv-barcode')barcode=e.target.value.replace(/[^\d]/g,'');
 });
 root.addEventListener('change',e=>{
  if(e.target.id==='nv-meal')selectedMeal=e.target.value;
  if(e.target.classList.contains('nv-qty')){const i=Number(e.target.dataset.index);if(chosen[i])chosen[i].grams=Number(e.target.value);render();}
  if(e.target.id==='nv-photo'){
   const file=e.target.files?.[0];if(!file)return;
   if(!file.type.startsWith('image/')||file.size>25*1024*1024){msg='Choose a supported image below 25 MB';render();return;}
   if(photoURL)URL.revokeObjectURL(photoURL);
   photoFile=file;photoURL=URL.createObjectURL(file);suggestions=[];msg='Photo selected. Confirm the foods and weights below.';render();
  }
 });
 render();
}
