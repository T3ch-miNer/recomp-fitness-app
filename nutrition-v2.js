import {searchFoods,findFood,nutrientsForGrams} from './food-db.js';

// One focused food-logging flow for Recomp. Local-only photos, free offline recipes,
// optional browser-side recognition, community barcode lookups. Save is always explicit.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nutrients=['calories','protein','carbs','fat','fibre'];
const meals=['Breakfast','Lunch','Dinner','Snack'];
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function mealForHour(hour=new Date().getHours()) {return hour>=5&&hour<11?'Breakfast':hour>=11&&hour<16?'Lunch':hour>=16&&hour<22?'Dinner':'Snack';}
let localClassifier;
const amount=(food,grams)=>nutrientsForGrams(food,Number(grams));
const fmt=(value)=>Math.round(Number(value)||0).toLocaleString('en-GB');
const mealOptions=current=>meals.map(m=>`<option ${current===m?'selected':''} value="${m}">${m}</option>`).join('');

export function openNutrition({mode='home',meal,save,manual,notify}={}) {
 let page=['home','search','photo','barcode'].includes(mode)?mode:'home';
 let selectedMeal=meals.includes(meal)?meal:mealForHour();
 let date=localDate(),query='',selected=null,grams=100,priorPage='search';
 let imageFile=null,imageURL='',photoStep='choose',photoQuery='',photoSearchVisible=false,photoFoods=[],suggestions=[],recognising=false;
 let barcode='',barcodeStatus='',looking=false,cameraStream=null,scanInterval=null,saving=false,notice='';
 let disposed=false,requestNumber=0;
 const host=document.createElement('div');host.className='nf-overlay';host.setAttribute('role','presentation');
 document.body.appendChild(host);
 const focusWas=document.activeElement;
 document.body.classList.add('nf-open');
 function stopCamera(){if(scanInterval)clearInterval(scanInterval);scanInterval=null;if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}}
 function close(){if(disposed)return;disposed=true;requestNumber++;stopCamera();if(imageURL)URL.revokeObjectURL(imageURL);host.remove();document.body.classList.remove('nf-open');document.removeEventListener('keydown',escapeKey);if(focusWas?.isConnected)focusWas.focus({preventScroll:true});}
 function escapeKey(e){if(e.key==='Escape'){e.preventDefault();close();}}
 document.addEventListener('keydown',escapeKey);
 function title(){return ({home:'Add food',search:'Search foods',portion:'Review food',photo:'Photo meal',barcode:'Scan barcode'})[page]||'Add food';}
 function field(label,id,type='text',value='',attrs=''){return `<label class="nf-field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(value)}" ${attrs}></label>`;}
 function mealDateFields(){return `<div class="nf-detail-fields">${field('Date','nf-date','date',date,'required')}<label class="nf-field"><span>Meal</span><select id="nf-meal">${mealOptions(selectedMeal)}</select></label></div>`;}
 function macros(food,qty){if(!food||!(Number(qty)>0))return '';
  let v;try{v=amount(food,qty);}catch{return '';}
  return `<div class="nf-macros"><div class="nf-kcal"><span>Estimated nutrition</span><strong>${fmt(v.calories)} <small>kcal</small></strong></div><div class="nf-macro-grid"><span><b>${fmt(v.protein)}g</b><small>Protein</small></span><span><b>${fmt(v.carbs)}g</b><small>Carbs</small></span><span><b>${fmt(v.fat)}g</b><small>Fat</small></span><span><b>${fmt(v.fibre)}g</b><small>Fibre</small></span></div></div>`;
 }
 function results(q,limit=12){return searchFoods(q,limit).map(food=>`<button class="nf-food-result" type="button" data-nf="pick" data-id="${esc(food.id)}"><span><b>${esc(food.name)}</b><small>${esc(food.category)} · ≈${fmt(food.per100.calories)} kcal/100g</small></span><span class="nf-result-arrow" aria-hidden="true">+</span></button>`).join('')||'<p class="nf-empty">No matching food. Try another name or enter it manually.</p>';}
 function home(){return `<p class="nf-intro">How would you like to log your food?</p><div class="nf-choice-list">
 <button class="nf-choice" data-nf="go" data-mode="search"><span class="nf-choice-icon">⌕</span><span><b>Search food</b><small>Indian meals and ingredients · works offline</small></span><span class="nf-chevron">›</span></button>
 <button class="nf-choice" data-nf="go" data-mode="photo"><span class="nf-choice-icon">▧</span><span><b>Photo meal</b><small>Take a photo or choose from your gallery</small></span><span class="nf-chevron">›</span></button>
 <button class="nf-choice" data-nf="go" data-mode="barcode"><span class="nf-choice-icon">▥</span><span><b>Scan barcode</b><small>Look up packaged foods</small></span><span class="nf-chevron">›</span></button></div><button class="nf-text-action nf-home-manual" data-nf="manual">Enter nutrition manually</button>`;}
 function search(){return `<p class="nf-subtle">Find a dish, then confirm its portion.</p><label class="nf-field nf-search-field"><span class="nf-sr">Find a food</span><input id="nf-search" type="search" value="${esc(query)}" placeholder="Search roti, dal, paneer…" autocomplete="off" spellcheck="false"></label><div id="nf-results" class="nf-food-results">${results(query)}</div><button class="nf-text-action" data-nf="manual">Can't find it? Enter manually</button>`;}
 function portion(){return `<div class="nf-picked"><span class="nf-overline">${selected?.source==='Open Food Facts'?'PACKAGED FOOD':'INDIAN HOME-FOOD ESTIMATE'}</span><h3>${esc(selected?.name)}</h3><p>${selected?.source==='Open Food Facts'?'Check the label and serving size.':'Values vary with ingredients and cooking oil.'}</p></div>
 ${mealDateFields()}<label class="nf-field nf-portion"><span>Portion eaten <em>(grams)</em></span><div class="nf-quantity"><input id="nf-grams" type="number" inputmode="decimal" min="1" max="5000" step="1" value="${esc(grams)}" required><span>g</span></div></label><div id="nf-macros">${macros(selected,grams)}</div>${notice?`<p class="nf-status" role="status">${esc(notice)}</p>`:''}`;}
 function photoChoose(){return `<div class="nf-photo-lead"><span class="nf-photo-illustration" aria-hidden="true">▧</span><h3>Log a meal from a photo</h3><p>Start with a picture. We'll help you identify the foods, then you can review the portions.</p></div>
 <div class="nf-photo-pickers"><button type="button" class="nf-photo-pick" data-nf="gallery"><span>▤</span><b>Choose from gallery</b></button><button type="button" class="nf-photo-pick" data-nf="take"><span>◎</span><b>Take photo</b></button></div>
 <p class="nf-muted-note">Your image stays on this device. Packaged food? Barcode scanning is usually more reliable.</p>`;}
 function photoTotals(){let t=Object.fromEntries(nutrients.map(k=>[k,0]));for(const entry of photoFoods){const food=findFood(entry.id);if(!food||!(Number(entry.grams)>0))continue;try{const a=amount(food,entry.grams);nutrients.forEach(k=>t[k]+=a[k]);}catch{}}return `<div class="nf-macros"><div class="nf-kcal"><span>Estimated meal total</span><strong>${fmt(t.calories)} <small>kcal</small></strong></div><div class="nf-macro-grid"><span><b>${fmt(t.protein)}g</b><small>Protein</small></span><span><b>${fmt(t.carbs)}g</b><small>Carbs</small></span><span><b>${fmt(t.fat)}g</b><small>Fat</small></span><span><b>${fmt(t.fibre)}g</b><small>Fibre</small></span></div></div>`;}
 function photoReview(){return `<div class="nf-photo-head"><img class="nf-photo-thumb" src="${esc(imageURL)}" alt="Selected food photograph"><div class="nf-photo-summary"><b>Photo added</b><span>Check and log the foods below</span><button class="nf-inline-link" data-nf="change-photo">Change photo</button></div></div>
 <div class="nf-ai-action"><div><b>Recognise foods</b><small>Optional · local, first use downloads a model</small></div><button class="nf-outlined" data-nf="recognise" ${recognising?'disabled':''}>${recognising?'Analysing…':'Identify'}</button></div>
 ${recognising?'<p class="nf-status">Preparing the food model. First use may take a few minutes.</p>':''}
 ${suggestions.length?`<div class="nf-suggestions"><span class="nf-section-label">Possible matches · tap to add</span>${suggestions.map(item=>`<button class="nf-suggestion" data-nf="add-photo" data-id="${esc(item.id)}">+ ${esc(item.name)}</button>`).join('')}</div>`:''}
 ${notice?`<p class="nf-status" role="status">${esc(notice)}</p>`:''}
 <div class="nf-section-head"><h3>Foods in your meal</h3><button class="nf-inline-link" data-nf="toggle-photo-search">+ Add food</button></div>
 ${photoFoods.length?photoFoods.map((item,i)=>{const food=findFood(item.id);return `<div class="nf-meal-line"><div><b>${esc(food?.name||'Food')}</b><small>Cooked weight</small></div><div class="nf-inline-quantity"><input data-nf-grams="${i}" type="number" min="1" max="5000" inputmode="decimal" step="1" value="${esc(item.grams)}" aria-label="Grams of ${esc(food?.name||'food')}"><span>g</span></div><button class="nf-remove" data-nf="remove-photo" data-index="${i}" aria-label="Remove ${esc(food?.name||'food')}">×</button></div>`;}).join(''):'<p class="nf-empty nf-help-compact">No foods selected yet. Add the foods you can see in the photo.</p>'}
 ${photoSearchVisible?`<div class="nf-photo-search"><label class="nf-field"><span>Find a food</span><input id="nf-photo-search" type="search" value="${esc(photoQuery)}" placeholder="Roti, rice, curry…" autocomplete="off"></label><div class="nf-food-results nf-small-results" id="nf-photo-results">${results(photoQuery,7)}</div></div>`:''}
 ${mealDateFields()}<div id="nf-photo-total">${photoTotals()}</div><p class="nf-muted-note nf-final-note">Nutrition is estimated from the foods and weights you confirm, not measured from the photo.</p>`;}
 function photo(){return photoStep==='choose'?photoChoose():photoReview();}
 function barcodeView(){return `<div class="nf-barcode-visual" aria-hidden="true">▥</div><p class="nf-subtle">Scan a packaged-food barcode, or type its digits below.</p>
 <button class="nf-secondary-block" data-nf="scan">Start camera scanner</button><p class="nf-status">${esc(barcodeStatus||'Camera scanning depends on browser support. Manual entry always works.')}</p><div id="nf-camera" class="nf-camera"></div>
 <label class="nf-field"><span>Barcode number</span><input id="nf-barcode" inputmode="numeric" type="text" pattern="[0-9]*" value="${esc(barcode)}" maxlength="14" placeholder="8–14 digits"></label><button class="nf-primary nf-barcode-submit" data-nf="lookup" ${looking?'disabled':''}>${looking?'Searching…':'Find product'}</button><p class="nf-muted-note">Nutrition provided by Open Food Facts · Internet needed for new lookups.</p>`;}
 function footer(){if(page==='portion')return `<button type="button" class="nf-primary" data-nf="save-portion" ${saving?'disabled':''}>${saving?'Saving…':'Add to food diary'}</button>`;
 if(page==='photo'&&photoStep==='review')return `<button type="button" class="nf-primary" data-nf="save-photo" ${saving||photoFoods.length===0?'disabled':''}>${saving?'Saving…':`Add ${photoFoods.length} ${photoFoods.length===1?'food':'foods'} to diary`}</button>`;
 return '';
 }
 function render(){if(disposed)return;
  host.innerHTML=`<div class="nf-sheet" role="dialog" aria-modal="true" aria-label="${title()}" tabindex="-1"><header class="nf-header"><div class="nf-header-side">${page!=='home'?'<button class="nf-icon-button" data-nf="back" aria-label="Go back">‹</button>':'<span class="nf-header-spacer"></span>'}</div><h2>${title()}</h2><button class="nf-icon-button nf-close" data-nf="close" aria-label="Close">×</button></header><div class="nf-content" id="nf-content">${page==='home'?home():page==='search'?search():page==='portion'?portion():page==='photo'?photo():barcodeView()}</div>${footer()?`<footer class="nf-footer">${footer()}</footer>`:''}<input class="nf-sr" id="nf-gallery-input" type="file" accept="image/*" aria-label="Choose a meal photo from gallery"><input class="nf-sr" id="nf-camera-input" type="file" accept="image/*" capture="environment" aria-label="Take meal photo"></div>`;
 }
 function go(mode){stopCamera();page=mode;notice='';render();}
 function back(){if(page==='home'){close();return;}if(page==='portion'){page=priorPage;}else if(page==='photo'&&photoStep==='review'){photoStep='choose';}else page='home';stopCamera();render();}
 function selectFood(item,origin='search'){selected=item;grams=item.defaultGrams||100;priorPage=origin;page='portion';render();}
 function addPhotoFood(id){const food=findFood(id);if(!food)return;if(photoFoods.length>=14){notice='Maximum 14 foods per meal.';render();return;}photoFoods.push({id,grams:food.defaultGrams||100});photoSearchVisible=false;photoQuery='';suggestions=suggestions.filter(f=>f.id!==id);render();}
 function setImage(file){if(!file)return;if(!file.type.startsWith('image/')){notice='Please choose a photograph.';render();return;}if(file.size>18*1024*1024){notice='Please choose a photo smaller than 18 MB.';render();return;}
  if(imageURL)URL.revokeObjectURL(imageURL);imageFile=file;imageURL=URL.createObjectURL(file);photoStep='review';photoFoods=[];suggestions=[];notice='';render();}
 async function recognise(){if(!imageFile||recognising)return;const token=++requestNumber;recognising=true;notice='';render();
  try{if(!localClassifier){localClassifier=import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm').then(m=>m.pipeline('image-classification','onnx-community/swin-finetuned-food101-ONNX',{dtype:'q8'}).then(p=>({m,p}))).catch(err=>{localClassifier=null;throw err;});}
   const {m,p}=await localClassifier;if(disposed||token!==requestNumber)return;
   const raw=await m.RawImage.fromBlob(imageFile),data=await p(raw,{top_k:5});if(disposed||token!==requestNumber)return;
   const mappings={'omelette':'omelette','chicken curry':'chicken-curry','fried rice':'jeera-rice','pancakes':'besan-chilla','bread pudding':'wheatBread','hummus':'chole','samosa':'aloo-paratha'};
   suggestions=[];
   for(const r of data){const label=String(r.label||'').replaceAll('_',' ').toLowerCase();const exact=mappings[label]&&findFood(mappings[label]);const matches=searchFoods(label,3);const candidate=exact||matches.find(f=>f.name.toLowerCase().includes(label)||f.aliases.toLowerCase().includes(label));if(candidate&&Number(r.score)>.12&&!suggestions.some(x=>x.id===candidate.id)&&!photoFoods.some(x=>x.id===candidate.id))suggestions.push(candidate);}
   if(!suggestions.length)notice='No reliable match found. Add the foods you recognise using + Add food.';
  }catch(err){if(!disposed&&token===requestNumber)notice='Automatic recognition is unavailable on this phone or connection. You can still add foods manually.';}
  finally{if(!disposed&&token===requestNumber){recognising=false;render();}}
 }
 async function lookup(){barcode=barcode.trim();if(!/^\d{8,14}$/.test(barcode)){barcodeStatus='Enter an 8–14 digit barcode.';render();return;}
  looking=true;barcodeStatus='Looking up packaged food…';render();
  try{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);let response;try{response=await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,nutriments`,{signal:controller.signal});}finally{clearTimeout(timeout);}
   if(!response.ok)throw Error('Product database unavailable. Try again later.');const data=await response.json();if(data.status!==1)throw Error('Product not found. You can enter it manually.');
   const p=data.product||{},nut=p.nutriments||{};
   let kcal=nut['energy-kcal_100g'];if(kcal==null&&Number.isFinite(Number(nut['energy-kj_100g'])))kcal=Number(nut['energy-kj_100g'])/4.184;
   const per100={calories:Number(kcal),protein:Number(nut.proteins_100g),carbs:Number(nut.carbohydrates_100g),fat:Number(nut.fat_100g),fibre:Number(nut.fiber_100g)};
   if(!Object.values(per100).every(v=>Number.isFinite(v)&&v>=0)){throw Error('This listing has incomplete nutrition. Please enter it manually from the label.');}
   stopCamera();selectFood({id:barcode,name:(p.product_name||p.brands||'Packaged food').slice(0,100),defaultGrams:100,per100,source:'Open Food Facts'},'barcode');
  }catch(err){barcodeStatus=err?.message||'Could not look up the product.';render();}finally{looking=false;}
 }
 async function scan(){if(!('BarcodeDetector' in window)||!navigator.mediaDevices?.getUserMedia){barcodeStatus='Camera barcode scanning is unsupported here. Type the digits instead.';render();return;}
  try{stopCamera();cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(disposed||page!=='barcode'){stopCamera();return;}
   barcodeStatus='Point the camera at a barcode.';render();const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.srcObject=cameraStream;host.querySelector('#nf-camera').append(video);await video.play();const detector=new BarcodeDetector({formats:['ean_8','ean_13','upc_a','upc_e','code_128']});let busy=false;scanInterval=setInterval(async()=>{if(busy||video.readyState<2)return;busy=true;try{const codes=await detector.detect(video);const found=codes.find(c=>/^\d{8,14}$/.test(c.rawValue));if(found){barcode=found.rawValue;stopCamera();await lookup();}}catch{}finally{busy=false;}},700);
  }catch{stopCamera();barcodeStatus='Camera access failed. Type the barcode instead.';render();}
 }
 function validate(){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00')))throw Error('Choose a valid date.');if(!meals.includes(selectedMeal))throw Error('Choose a meal.');}
 async function saveEntries(entries){if(saving||!entries.length)return;saving=true;render();try{await save(entries);close();}catch(err){saving=false;notice=err?.message||'Could not save your food.';render();}}
 async function action(e){const target=e.target.closest('[data-nf]');if(!target)return;const a=target.dataset.nf;e.preventDefault();
  if(a==='close'){close();return;}if(a==='back'){back();return;}if(a==='go'){go(target.dataset.mode);return;}if(a==='gallery'||a==='take'){host.querySelector(a==='gallery'?'#nf-gallery-input':'#nf-camera-input').click();return;}
  if(a==='manual'){close();manual(selectedMeal);return;}
  if(a==='pick'){const food=findFood(target.dataset.id);if(!food)return;if(page==='photo'){addPhotoFood(food.id);return;}selectFood(food,'search');return;}
  if(a==='save-portion'){validate();if(!Number.isFinite(Number(grams))||Number(grams)<1||Number(grams)>5000){notice='Enter a portion between 1 and 5,000 g.';render();return;}await saveEntries([{...amount(selected,grams),date,meal:selectedMeal,name:selected.name,grams:Number(grams),source:selected.source||'Recomp sample recipe estimate',foodId:selected.id}]);return;}
  if(a==='change-photo'){photoStep='choose';render();return;}if(a==='toggle-photo-search'){photoSearchVisible=!photoSearchVisible;render();if(photoSearchVisible)host.querySelector('#nf-photo-search')?.focus();return;}
  if(a==='remove-photo'){photoFoods.splice(Number(target.dataset.index),1);render();return;}if(a==='add-photo'){addPhotoFood(target.dataset.id);return;}
  if(a==='recognise'){await recognise();return;}if(a==='save-photo'){
   validate();const entries=photoFoods.map(item=>{const food=findFood(item.id);if(!food)throw Error('Food no longer available.');if(!(Number(item.grams)>0&&Number(item.grams)<=5000))throw Error('Check the grams for '+food.name+'.');return {...amount(food,item.grams),date,meal:selectedMeal,name:food.name,grams:Number(item.grams),source:'Recomp sample recipe estimate',foodId:food.id};});await saveEntries(entries);return;
  }if(a==='scan'){await scan();return;}if(a==='lookup'){await lookup();return;}
 }
 host.addEventListener('click',e=>{if(e.target===host){close();return;}action(e).catch(err=>{notice=err.message||'Please try again.';render();});});
 host.addEventListener('input',e=>{const el=e.target;if(el.id==='nf-search'){query=el.value;const container=host.querySelector('#nf-results');if(container)container.innerHTML=results(query);}
  if(el.id==='nf-photo-search'){photoQuery=el.value;const container=host.querySelector('#nf-photo-results');if(container)container.innerHTML=results(photoQuery,7);}
  if(el.id==='nf-grams'){grams=Number(el.value);const c=host.querySelector('#nf-macros');if(c)c.innerHTML=macros(selected,grams);}
  if(el.id==='nf-barcode')barcode=el.value.replace(/\D/g,'');
  if(el.hasAttribute('data-nf-grams')){const index=Number(el.dataset.nfGrams);if(photoFoods[index])photoFoods[index].grams=Number(el.value);const c=host.querySelector('#nf-photo-total');if(c)c.innerHTML=photoTotals();}
 });
 host.addEventListener('change',e=>{const el=e.target;if(el.id==='nf-date')date=el.value;if(el.id==='nf-meal')selectedMeal=el.value;if(el.id==='nf-gallery-input'||el.id==='nf-camera-input')setImage(el.files?.[0]);});
 render();
 return {close};
}
