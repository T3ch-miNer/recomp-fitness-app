// This worker runs food recognition on-device. No photographs are uploaded.
// External network downloads are limited to the model and Transformers.js runtime.
const MODEL='Xenova/mobileclip_s0';
let modelPromise=null;
async function getModel(id){
 if(!modelPromise){
  modelPromise=(async()=>{
   const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm');
   env.useBrowserCache=true;
   env.allowLocalModels=false;
   const clf=await pipeline('zero-shot-image-classification',MODEL,{
    device:'wasm',dtype:'q8',progress_callback:p=>{
     if(p.status==='progress'&&p.total&&Number.isFinite(p.loaded)){
      self.postMessage({type:'status',id,message:'Downloading model files… '+Math.min(99,Math.round(100*p.loaded/p.total))+'%'});
     }
    }
   });
   return clf;
  })().catch(err=>{modelPromise=null;throw err;});
 }
 return modelPromise;
}
self.onmessage=async event=>{
 const {type,id,regions,labels}=event.data||{};
 if(type!=='recognise')return;
 try{
  if(!Array.isArray(regions)||!regions.length||regions.length>3||!Array.isArray(labels)||labels.length>250)throw Error('Invalid photograph or food list.');
  self.postMessage({type:'status',id,message:'Loading local model (one-time download may take a while)…'});
  const classifier=await getModel(id);
  const labelMap=new Map(labels.map(item=>['Indian food '+item.label,item.id]));
  const phrases=[...labelMap.keys()];
  const found=[];
  for(let i=0;i<regions.length;i++){
   self.postMessage({type:'status',id,message:`Analysing ${i===0?'full plate':'plate section '+i} on your phone…`});
   const result=await classifier(regions[i],phrases,{hypothesis_template:'A photograph of {} served on a plate.'});
   for(const item of result.slice(0,3)){
    const foodId=labelMap.get(item.label),score=Number(item.score)||0;
    // With 176 possible dishes the model's scores are spread across more labels.
    // Suggestions are unverified relative matches; users must confirm before logging.
    if(foodId&&score>=.015)found.push({id:foodId,score,region:i});
   }
  }
  const best=new Map();
  found.forEach(item=>{const prev=best.get(item.id);if(!prev||item.score>prev.score)best.set(item.id,item);});
  // Confidence from zero-shot comparisons is relative to the candidate list, never calibrated.
  const suggestions=[...best.values()].sort((a,b)=>b.score-a.score).slice(0,5);
  self.postMessage({type:'result',id,suggestions});
 }catch(err){self.postMessage({type:'error',id,message:'Recognition unavailable: '+String(err?.message||err).slice(0,180)+'. You can still search foods manually.'});}
};
