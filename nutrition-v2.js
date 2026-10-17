import {searchFoods,findFood,nutrientsForGrams,FOOD_ITEMS} from './food-db.js';

// One focused food-logging flow for Recomp. Local-only photos, free offline recipes,
// optional browser-side recognition, community barcode lookups. Save is always explicit.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nutrients=['calories','protein','carbs','fat','fibre'];
const meals=['Breakfast','Lunch','Dinner','Snack'];
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function mealForHour(hour=new Date().getHours()) {return hour>=5&&hour<11?'Breakfast':hour>=11&&hour<16?'Lunch':hour>=16&&hour<22?'Dinner':'Snack';}
const glyphs={
 search:'<circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 5 5"/>',
 photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8" r="1.5"/><path d="m4 18 5-5 4 3 3-4 5 6"/>',
 barcode:'<path d="M3 5v14M6 5v14M9 5v14M13 5v14M16 5v14M21 5v14"/>',
 camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>'
};
const ico=name=>`<svg class="nf-svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${glyphs[name]||''}</svg>`;
const amount=(food,grams)=>nutrientsForGrams(food,Number(grams));
const fmt=(value)=>Math.round(Number(value)||0).toLocaleString('en-GB');
const mealOptions=current=>meals.map(m=>`<option ${current===m?'selected':''} value="${m}">${m}</option>`).join('');

export function openNutrition({mode='home',meal,save,manual,notify,lookupProduct}={}) {
 let page=['home','search','photo','barcode'].includes(mode)?mode:'home';
 let selectedMeal=meals.includes(meal)?meal:mealForHour();
 let date=localDate(),query='',selected=null,grams=100,priorPage='search';
 let imageFile=null,imageURL='',photoStep='choose',photoQuery='',photoSearchVisible=false,photoFoods=[],suggestions=[],recognising=false;
 let barcode='',barcodeStatus='',looking=false,cameraStream=null,scanInterval=null,scannerControls=null,scannerToken=0,saving=false,notice='';
 let disposed=false,requestNumber=0,recognitionWorker=null,recognitionTimeout=null;
 const host=document.createElement('div');host.className='nf-overlay';host.setAttribute('role','presentation');
 document.body.appendChild(host);
 const focusWas=document.activeElement;
 document.body.classList.add('nf-open');
 function stopCamera(){scannerToken++;if(scanInterval)clearInterval(scanInterval);scanInterval=null;try{scannerControls?.stop();}catch{}scannerControls=null;if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}}
 function stopRecognition(){
  requestNumber++;
  if(recognitionTimeout)clearTimeout(recognitionTimeout);
  recognitionTimeout=null;
  if(recognitionWorker){recognitionWorker.terminate();recognitionWorker=null;}
  recognising=false;
 }
 function close(){if(disposed)return;disposed=true;stopRecognition();stopCamera();if(imageURL)URL.revokeObjectURL(imageURL);host.remove();document.body.classList.remove('nf-open');document.removeEventListener('keydown',escapeKey);if(focusWas?.isConnected)focusWas.focus({preventScroll:true});}
 function escapeKey(e){if(e.key==='Escape'){e.preventDefault();close();}}
 document.addEventListener('keydown',escapeKey);
 function title(){return ({home:'Add food',search:'Search foods',portion:'Review food',photo:'Photo meal',barcode:'Scan barcode'})[page]||'Add food';}
 function field(label,id,type='text',value='',attrs=''){return `<label class="nf-field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(value)}" ${attrs}></label>`;}
 function mealDateFields(){return `<div class="nf-detail-fields">${field('Date','nf-date','date',date,'required')}<label class="nf-field"><span>Meal</span><select id="nf-meal">${mealOptions(selectedMeal)}</select></label></div>`;}
 function macros(food,qty){
  if(!food||!(Number(qty)>0))return '';
  let v;try{v=amount(food,qty);}catch{return '';}
  const value=k=>food?.per100?.[k]==null?'—':fmt(v[k])+'g';
  const missing=food.source==='Open Food Facts'?nutrients.filter(k=>food.per100?.[k]==null):[];
  return `<div class="nf-macros"><div class="nf-kcal"><span>${food.source==='Open Food Facts'?'Packaged nutrition':'Estimated nutrition'}</span><strong>${fmt(v.calories)} <small>kcal</small></strong></div><div class="nf-macro-grid"><span><b>${value('protein')}</b><small>Protein</small></span><span><b>${value('carbs')}</b><small>Carbs</small></span><span><b>${value('fat')}</b><small>Fat</small></span><span><b>${value('fibre')}</b><small>Fibre</small></span></div>${missing.length?`<p class="nf-missing-note">Not listed: ${missing.map(esc).join(', ')}. You can fill in these values from the packet. Unfilled values are logged as 0 and labelled incomplete.</p>`:''}</div>`;
 }
 function results(q,limit=12){return searchFoods(q,limit).map(food=>`<button class="nf-food-result" type="button" data-nf="pick" data-id="${esc(food.id)}"><span><b>${esc(food.name)}</b><small>${esc(food.category)} · ≈${fmt(food.per100.calories)} kcal/100g</small></span><span class="nf-result-arrow" aria-hidden="true">+</span></button>`).join('')||'<p class="nf-empty">No matching food. Try another name or enter it manually.</p>';}
 function home(){return `<p class="nf-intro">How would you like to log your food?</p><div class="nf-choice-list">
 <button class="nf-choice" data-nf="go" data-mode="search"><span class="nf-choice-icon">${ico('search')}</span><span><b>Search food</b><small>Indian meals and ingredients · works offline</small></span><span class="nf-chevron">›</span></button>
 <button class="nf-choice" data-nf="go" data-mode="photo"><span class="nf-choice-icon">${ico('photo')}</span><span><b>Photo meal</b><small>Take a photo or choose from your gallery</small></span><span class="nf-chevron">›</span></button>
 <button class="nf-choice" data-nf="go" data-mode="barcode"><span class="nf-choice-icon">${ico('barcode')}</span><span><b>Scan barcode</b><small>Look up packaged foods</small></span><span class="nf-chevron">›</span></button></div><button class="nf-text-action nf-home-manual" data-nf="manual">Enter nutrition manually</button>`;}
 function search(){return `<p class="nf-subtle">Find a dish, then confirm its portion.</p><label class="nf-field nf-search-field"><span class="nf-sr">Find a food</span><input id="nf-search" type="search" value="${esc(query)}" placeholder="Search roti, dal, paneer…" autocomplete="off" spellcheck="false"></label><div id="nf-results" class="nf-food-results">${results(query)}</div><button class="nf-text-action" data-nf="manual">Can't find it? Enter manually</button>`;}
 function portion(){
  const packaged=selected?.source==='Open Food Facts';
  const edit=packaged?`<div class="nf-product-edit"><h4>Nutrition per 100 g / 100 ml</h4><p>Confirm the German package label or correct incomplete community data.</p><div class="nf-product-fields">${nutrients.map(k=>`<label class="nf-field"><span>${esc({calories:'Energy (kcal)',protein:'Protein (g)',carbs:'Carbohydrates (g)',fat:'Fat (g)',fibre:'Fibre (g)'}[k])}</span><input type="number" min="0" max="100000" step="0.1" inputmode="decimal" data-nf-per100="${k}" value="${selected.per100?.[k]==null?'':esc(selected.per100[k])}" placeholder="Not listed"></label>`).join('')}</div></div>`:'';
  return `<div class="nf-picked"><span class="nf-overline">${packaged?'PACKAGED FOOD · GERMAN LABEL':'INDIAN HOME-FOOD ESTIMATE'}</span><h3>${esc(selected?.name)}</h3><p>${packaged?`Open Food Facts · ${esc(selected?.brand||'Community product')} ${selected?.cached?'· Cached':''}. Always check the packet.`:'Ingredients and cooking oil change the values.'}</p></div>
  ${mealDateFields()}<label class="nf-field nf-portion"><span>Portion eaten <em>(grams / ml)</em></span><div class="nf-quantity"><input id="nf-grams" type="number" inputmode="decimal" min="1" max="5000" step="1" value="${esc(grams)}" required><span>g / ml</span></div></label>${edit}<div id="nf-macros">${macros(selected,grams)}</div>${notice?`<p class="nf-status" role="status">${esc(notice)}</p>`:''}`;
 }
 function photoChoose(){return `<div class="nf-photo-lead"><span class="nf-photo-illustration" aria-hidden="true">${ico('photo')}</span><h3>Log a meal from a photo</h3><p>Start with a picture. We'll help you identify the foods, then you can review the portions.</p></div>
 <div class="nf-photo-pickers"><button type="button" class="nf-photo-pick" data-nf="gallery"><span>${ico('photo')}</span><b>Choose from gallery</b></button><button type="button" class="nf-photo-pick" data-nf="take"><span>${ico('camera')}</span><b>Take photo</b></button></div>
 <p class="nf-muted-note">Your image stays on this device. Packaged food? Barcode scanning is usually more reliable.</p>`;}
 function photoTotals(){let t=Object.fromEntries(nutrients.map(k=>[k,0]));for(const entry of photoFoods){const food=findFood(entry.id);if(!food||!(Number(entry.grams)>0))continue;try{const a=amount(food,entry.grams);nutrients.forEach(k=>t[k]+=a[k]);}catch{}}return `<div class="nf-macros"><div class="nf-kcal"><span>Estimated meal total</span><strong>${fmt(t.calories)} <small>kcal</small></strong></div><div class="nf-macro-grid"><span><b>${fmt(t.protein)}g</b><small>Protein</small></span><span><b>${fmt(t.carbs)}g</b><small>Carbs</small></span><span><b>${fmt(t.fat)}g</b><small>Fat</small></span><span><b>${fmt(t.fibre)}g</b><small>Fibre</small></span></div></div>`;}
 function photoReview(){return `<div class="nf-photo-head"><img class="nf-photo-thumb" src="${esc(imageURL)}" alt="Selected food photograph"><div class="nf-photo-summary"><b>Photo added</b><span>Check and log the foods below</span><button class="nf-inline-link" data-nf="change-photo">Change photo</button></div></div>
 <div class="nf-ai-action"><div><b>Recognise foods</b><small>Optional · local, first use downloads a model</small></div><button class="nf-outlined" data-nf="${recognising?'cancel-recognition':'recognise'}">${recognising?'Cancel':'Identify'}</button></div>
 ${recognising?`<p class="nf-status" role="status">${esc(notice||'Analysing locally. You can cancel without losing the photo.')}</p>`:''}
 ${suggestions.length?`<div class="nf-suggestions"><span class="nf-section-label">Possible matches · tap to add</span>${suggestions.map(item=>`<button class="nf-suggestion" data-nf="add-photo" data-id="${esc(item.id)}">+ ${esc(item.name)}</button>`).join('')}</div>`:''}
 ${notice?`<p class="nf-status" role="status">${esc(notice)}</p>`:''}
 <div class="nf-section-head"><h3>Foods in your meal</h3><button class="nf-inline-link" data-nf="toggle-photo-search">+ Add food</button></div>
 ${photoFoods.length?photoFoods.map((item,i)=>{const food=findFood(item.id);return `<div class="nf-meal-line"><div><b>${esc(food?.name||'Food')}</b><small>Cooked weight</small></div><div class="nf-inline-quantity"><input data-nf-grams="${i}" type="number" min="1" max="5000" inputmode="decimal" step="1" value="${esc(item.grams)}" aria-label="Grams of ${esc(food?.name||'food')}"><span>g</span></div><button class="nf-remove" data-nf="remove-photo" data-index="${i}" aria-label="Remove ${esc(food?.name||'food')}">×</button></div>`;}).join(''):'<p class="nf-empty nf-help-compact">No foods selected yet. Add the foods you can see in the photo.</p>'}
 ${photoSearchVisible?`<div class="nf-photo-search"><label class="nf-field"><span>Find a food</span><input id="nf-photo-search" type="search" value="${esc(photoQuery)}" placeholder="Roti, rice, curry…" autocomplete="off"></label><div class="nf-food-results nf-small-results" id="nf-photo-results">${results(photoQuery,7)}</div></div>`:''}
 ${mealDateFields()}<div id="nf-photo-total">${photoTotals()}</div><p class="nf-muted-note nf-final-note">Nutrition is estimated from the foods and weights you confirm, not measured from the photo.</p>`;}
 function photo(){return photoStep==='choose'?photoChoose():photoReview();}
 function barcodeView(){return `<div class="nf-barcode-visual" aria-hidden="true">${ico('barcode')}</div><p class="nf-subtle">Scan EAN / UPC barcodes from Lidl, Aldi, REWE, EDEKA, Penny, Kaufland and other German supermarkets.</p>
  <button class="nf-secondary-block" data-nf="scan">Start camera scanner</button><p class="nf-status" role="status">${esc(barcodeStatus||'On unsupported Android browsers, a free ZXing scanner will be loaded on first use.')}</p><div id="nf-camera" class="nf-camera"></div><button class="nf-text-action" data-nf="barcode-image">Or select a barcode photograph</button>
  <label class="nf-field"><span>EAN / GTIN barcode number</span><input id="nf-barcode" inputmode="numeric" type="text" pattern="[0-9]*" value="${esc(barcode)}" maxlength="14" placeholder="8–14 digits"></label><button class="nf-primary nf-barcode-submit" data-nf="lookup" ${looking?'disabled':''}>${looking?'Searching…':'Find German supermarket product'}</button>
  <button class="nf-text-action" data-nf="manual">Not found? Enter nutrition manually</button><p class="nf-muted-note">Open Food Facts is a community database and does not contain every supermarket own-brand product. German names are preferred. Data may be incomplete; check the package. Photos are decoded on your device.</p>`;}
 function footer(){if(page==='portion')return `<button type="button" class="nf-primary" data-nf="save-portion" ${saving?'disabled':''}>${saving?'Saving…':'Add to food diary'}</button>`;
 if(page==='photo'&&photoStep==='review')return `<button type="button" class="nf-primary" data-nf="save-photo" ${saving||photoFoods.length===0?'disabled':''}>${saving?'Saving…':`Add ${photoFoods.length} ${photoFoods.length===1?'food':'foods'} to diary`}</button>`;
 return '';
 }
 function render(){if(disposed)return;
  host.innerHTML=`<div class="nf-sheet" role="dialog" aria-modal="true" aria-label="${title()}" tabindex="-1"><header class="nf-header"><div class="nf-header-side">${page!=='home'?'<button class="nf-icon-button" data-nf="back" aria-label="Go back">‹</button>':'<span class="nf-header-spacer"></span>'}</div><h2>${title()}</h2><button class="nf-icon-button nf-close" data-nf="close" aria-label="Close">×</button></header><div class="nf-content" id="nf-content">${page==='home'?home():page==='search'?search():page==='portion'?portion():page==='photo'?photo():barcodeView()}</div>${footer()?`<footer class="nf-footer">${footer()}</footer>`:''}<input class="nf-sr" id="nf-gallery-input" type="file" accept="image/*" aria-label="Choose a meal photo from gallery"><input class="nf-sr" id="nf-camera-input" type="file" accept="image/*" capture="environment" aria-label="Take meal photo"><input class="nf-sr" id="nf-barcode-image" type="file" accept="image/*" aria-label="Select a barcode photograph"></div>`;
 }
 function go(mode){stopCamera();page=mode;notice='';render();}
 function back(){if(recognising)stopRecognition();if(page==='home'){close();return;}if(page==='portion'){page=priorPage;}else if(page==='photo'&&photoStep==='review'){photoStep='choose';}else page='home';stopCamera();render();}
 function selectFood(item,origin='search'){selected=item;grams=item.defaultGrams||100;priorPage=origin;page='portion';render();}
 function addPhotoFood(id){const food=findFood(id);if(!food)return;if(photoFoods.length>=14){notice='Maximum 14 foods per meal.';render();return;}photoFoods.push({id,grams:food.defaultGrams||100});photoSearchVisible=false;photoQuery='';suggestions=suggestions.filter(f=>f.id!==id);render();}
 function setImage(file){if(recognising)stopRecognition();if(!file)return;if(!file.type.startsWith('image/')){notice='Please choose a photograph.';render();return;}if(file.size>18*1024*1024){notice='Please choose a photo smaller than 18 MB.';render();return;}
  if(imageURL)URL.revokeObjectURL(imageURL);imageFile=file;imageURL=URL.createObjectURL(file);photoStep='review';photoFoods=[];suggestions=[];notice='';render();}
 async function recognise(){
  if(!imageFile||recognising||disposed)return;
  if(!('Worker' in window)||!('createImageBitmap' in window)){
   notice='On-device recognition is unavailable in this browser. Add foods using search below.';render();return;
  }
  stopRecognition();const token=requestNumber;
  recognising=true;notice='Preparing the photograph on this phone…';render();
  try{
   // Keep model inference out of the main browser thread, and send one resized frame.
   const bitmap=await createImageBitmap(imageFile);
   if(disposed||token!==requestNumber){bitmap.close();return;}
   const scale=Math.min(1,384/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const frame=canvas.toDataURL('image/jpeg',.68);
   if(disposed||token!==requestNumber)return;
   const worker=new Worker('./food-recognition-worker.js',{type:'module'});
   recognitionWorker=worker;
   const matched=await new Promise((resolve,reject)=>{
    recognitionTimeout=setTimeout(()=>reject(Error('Recognition took too long on this phone. Choose your foods manually.')),90000);
    worker.onmessage=event=>{
     if(disposed||token!==requestNumber)return;
     const data=event.data||{};
     if(data.id!==token)return;
     if(data.type==='status'){
      notice=String(data.message||'Analysing locally…').slice(0,180);
      const status=host.querySelector('.nf-status');if(status)status.textContent=notice;
     }else if(data.type==='result')resolve(data.suggestions||[]);
     else if(data.type==='error')reject(Error(data.message||'Recognition is unavailable.'));
    };
    worker.onerror=()=>reject(Error('Recognition could not run on this phone.'));
    worker.postMessage({type:'recognise',id:token,regions:[frame],labels:FOOD_ITEMS.map(f=>({id:f.id,label:f.name}))});
   });
   if(disposed||token!==requestNumber)return;
   suggestions=matched.map(x=>findFood(x.id)).filter(Boolean).filter(x=>!photoFoods.some(p=>p.id===x.id));
   notice=suggestions.length?'Choose only foods that really appear in your photo.':'No confident match. Search and add the foods yourself.';
  }catch(err){
   if(!disposed&&token===requestNumber)notice='Recognition is unavailable or too demanding on this phone. Search and add foods below.';
  }finally{
   if(token===requestNumber){
    if(recognitionTimeout)clearTimeout(recognitionTimeout);recognitionTimeout=null;
    recognitionWorker?.terminate();recognitionWorker=null;
    recognising=false;
    if(!disposed)render();
   }
  }
 }

 async function lookup(){
  barcode=barcode.trim();
  if(!/^\d{8,14}$/.test(barcode)){barcodeStatus='Enter an 8–14 digit EAN or UPC barcode.';render();return;}
  stopCamera();looking=true;barcodeStatus='Searching German product names in Open Food Facts…';render();
  try{
   if(typeof lookupProduct!=='function')throw Error('Barcode lookup is unavailable. Try manual entry.');
   const product=await lookupProduct(barcode);
   if(disposed)return;
   if(!product?.per100||!Number.isFinite(product.per100.calories))throw Error('No usable calorie data for this product. Enter nutrition manually from the label.');
   selectFood({id:barcode,name:product.name,brand:product.brand,quantity:product.quantity,defaultGrams:100,per100:{...product.per100},source:'Open Food Facts',cached:product.cached},'barcode');
  }catch(err){barcodeStatus=String(err?.message||'Could not look up the product.').slice(0,240);if(!disposed)render();}
  finally{looking=false;}
 }
 // ZXing is a free MIT-licensed decoder downloaded on demand. Frames stay on the phone.
 async function loadZxing(){return import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');}
 function foundBarcode(value){
  const code=String(value||'').trim();
  if(!/^\d{8,14}$/.test(code)||looking||disposed||page!=='barcode')return;
  barcode=code;stopCamera();lookup().catch(err=>{barcodeStatus=String(err.message);render();});
 }
 async function scan(){
  if(!navigator.mediaDevices?.getUserMedia){barcodeStatus='Camera is not available. Enter the EAN digits or choose a photograph.';render();return;}
  stopCamera();barcodeStatus='Opening rear camera…';render();
  const token=scannerToken,video=document.createElement('video');
  video.autoplay=true;video.muted=true;video.playsInline=true;
  host.querySelector('#nf-camera')?.appendChild(video);
  try{
   cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
   if(disposed||page!=='barcode'||token!==scannerToken){stopCamera();return;}
   video.srcObject=cameraStream;await video.play();
   barcodeStatus='Hold the barcode steady inside the camera view.';
   const status=host.querySelector('.nf-status');if(status)status.textContent=barcodeStatus;
   if('BarcodeDetector' in window){
    try{
     const detector=new BarcodeDetector({formats:['ean_8','ean_13','upc_a','upc_e','code_128']});
     let busy=false;
     scanInterval=setInterval(async()=>{
      if(busy||video.readyState<2||disposed)return;
      busy=true;
      try{const found=await detector.detect(video);for(const x of found){if(/^\d{8,14}$/.test(String(x.rawValue))){foundBarcode(x.rawValue);break;}}}
      catch{ /* Native detector may fail on difficult frames. */ }
      finally{busy=false;}
     },480);
     return;
    }catch{ /* Native barcode API may exist but not support these formats. */ }
   }
   barcodeStatus='Loading free ZXing barcode scanner…';
   if(status)status.textContent=barcodeStatus;
   const {BrowserMultiFormatOneDReader}=await loadZxing();
   if(disposed||token!==scannerToken){stopCamera();return;}
   const reader=new BrowserMultiFormatOneDReader();
   scannerControls=await reader.decodeFromVideoElement(video,result=>{
    const code=result?.getText?.()||result?.text;
    if(code)foundBarcode(code);
   });
   if(disposed||token!==scannerToken)stopCamera();
   else if(status)status.textContent='ZXing ready. Centre the barcode in the camera view.';
  }catch(err){
   stopCamera();
   barcodeStatus=err?.name==='NotAllowedError'?'Camera permission denied. Enable camera access in your Android browser, or type the barcode.':'Scanner unavailable. You can enter digits or use a barcode photograph.';
   if(!disposed)render();
  }
 }
 async function scanBarcodeImage(file){
  if(!file)return;
  if(!file.type.startsWith('image/')||file.size>12*1024*1024){barcodeStatus='Choose a barcode photograph under 12 MB.';render();return;}
  stopCamera();barcodeStatus='Reading barcode from image on this device…';render();
  const url=URL.createObjectURL(file);
  try{
   const {BrowserMultiFormatOneDReader}=await loadZxing();
   if(disposed)return;
   const img=document.createElement('img');img.src=url;await img.decode();
   const result=await new BrowserMultiFormatOneDReader().decodeFromImageElement(img);
   const code=String(result?.getText?.()||result?.text||'').trim();
   if(!/^\d{8,14}$/.test(code))throw Error('Could not recognise EAN / UPC barcode.');
   barcode=code;await lookup();
  }catch{barcodeStatus='Could not read that photograph. Try a sharper image, the live camera, or enter the numbers.';if(!disposed)render();}
  finally{URL.revokeObjectURL(url);}
 }
 function validate(){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00')))throw Error('Choose a valid date.');if(!meals.includes(selectedMeal))throw Error('Choose a meal.');}
 async function saveEntries(entries){if(saving||!entries.length)return;saving=true;render();try{await save(entries);close();}catch(err){saving=false;notice=err?.message||'Could not save your food.';render();}}
 async function action(e){const target=e.target.closest('[data-nf]');if(!target)return;const a=target.dataset.nf;e.preventDefault();
  if(a==='close'){close();return;}if(a==='back'){back();return;}if(a==='go'){go(target.dataset.mode);return;}if(a==='gallery'||a==='take'){host.querySelector(a==='gallery'?'#nf-gallery-input':'#nf-camera-input').click();return;}
  if(a==='manual'){close();manual(selectedMeal);return;}if(a==='barcode-image'){host.querySelector('#nf-barcode-image')?.click();return;}
  if(a==='pick'){const food=findFood(target.dataset.id);if(!food)return;if(page==='photo'){addPhotoFood(food.id);return;}selectFood(food,'search');return;}
  if(a==='save-portion'){
    validate();
    if(!Number.isFinite(Number(grams))||Number(grams)<1||Number(grams)>5000){notice='Enter a portion between 1 and 5,000 g.';render();return;}
    const missing=selected.source==='Open Food Facts'?nutrients.filter(k=>selected.per100?.[k]==null):[];
    await saveEntries([{...amount(selected,grams),date,meal:selectedMeal,name:selected.name,grams:Number(grams),source:selected.source||'Recomp sample recipe estimate',foodId:selected.id,missingNutrition:missing}]);return;
   }
  if(a==='change-photo'){photoStep='choose';render();return;}if(a==='toggle-photo-search'){photoSearchVisible=!photoSearchVisible;render();if(photoSearchVisible)host.querySelector('#nf-photo-search')?.focus();return;}
  if(a==='remove-photo'){photoFoods.splice(Number(target.dataset.index),1);render();return;}if(a==='add-photo'){addPhotoFood(target.dataset.id);return;}
  if(a==='recognise'){await recognise();return;}if(a==='cancel-recognition'){stopRecognition();notice='Recognition stopped. Add foods manually below.';render();return;}if(a==='save-photo'){
   validate();const entries=photoFoods.map(item=>{const food=findFood(item.id);if(!food)throw Error('Food no longer available.');if(!(Number(item.grams)>0&&Number(item.grams)<=5000))throw Error('Check the grams for '+food.name+'.');return {...amount(food,item.grams),date,meal:selectedMeal,name:food.name,grams:Number(item.grams),source:'Recomp sample recipe estimate',foodId:food.id};});await saveEntries(entries);return;
  }if(a==='scan'){await scan();return;}if(a==='lookup'){await lookup();return;}
 }
 host.addEventListener('click',e=>{if(e.target===host){close();return;}action(e).catch(err=>{notice=err.message||'Please try again.';render();});});
 host.addEventListener('input',e=>{const el=e.target;if(el.id==='nf-search'){query=el.value;const container=host.querySelector('#nf-results');if(container)container.innerHTML=results(query);}
  if(el.id==='nf-photo-search'){photoQuery=el.value;const container=host.querySelector('#nf-photo-results');if(container)container.innerHTML=results(photoQuery,7);}
  if(el.id==='nf-grams'){grams=Number(el.value);const c=host.querySelector('#nf-macros');if(c)c.innerHTML=macros(selected,grams);}
   if(el.hasAttribute('data-nf-per100')&&selected?.source==='Open Food Facts'){
    const key=el.dataset.nfPer100,value=el.value.trim(),number=Number(value);
    if(nutrients.includes(key))selected.per100[key]=value!==''&&Number.isFinite(number)&&number>=0&&number<=100000?number:null;
    const target=host.querySelector('#nf-macros');if(target)target.innerHTML=macros(selected,grams);
   }
  if(el.id==='nf-barcode')barcode=el.value.replace(/\D/g,'');
  if(el.hasAttribute('data-nf-grams')){const index=Number(el.dataset.nfGrams);if(photoFoods[index])photoFoods[index].grams=Number(el.value);const c=host.querySelector('#nf-photo-total');if(c)c.innerHTML=photoTotals();}
 });
 host.addEventListener('change',e=>{const el=e.target;if(el.id==='nf-date')date=el.value;if(el.id==='nf-meal')selectedMeal=el.value;if(el.id==='nf-gallery-input'||el.id==='nf-camera-input')setImage(el.files?.[0]);if(el.id==='nf-barcode-image')scanBarcodeImage(el.files?.[0]);});
 render();
 return {close};
}
