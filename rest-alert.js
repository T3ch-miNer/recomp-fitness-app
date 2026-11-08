// Rest timer alert for when the phone is locked or Recomp is in the background.
// While Recomp is on screen it beeps by itself, so the notification is only
// scheduled as the app goes into the background and cancelled when it comes back.

export const REST_ALERT_ID=44001; // Outside the reminder range (41000-43999).
export const REST_CHANNEL='recomp-rest';
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:0;};
const trim=v=>String(+num(v).toFixed(2));

const plugin=()=>globalThis.Capacitor?.isNativePlatform?.()?globalThis.Capacitor?.Plugins?.LocalNotifications:null;

// What to say and when. Null when nothing should fire.
export function restAlertPlan(session,now=Date.now()){
 const r=session?.rest;
 if(!r||r.paused)return null;
 const at=num(r.endsAt);
 if(at<=now+1000)return null;
 const ex=session.exercises?.[r.exerciseIndex];
 let next=null;
 const setIndex=ex?.sets?.findIndex(s=>!s.done)??-1;
 if(ex&&setIndex>=0)next={name:ex.name,set:setIndex+1,of:ex.sets.length,kg:ex.sets[setIndex].kg,reps:ex.sets[setIndex].reps};
 else{
  const nx=session.exercises?.find((e,i)=>i>r.exerciseIndex&&e.sets?.some(s=>!s.done))||session.exercises?.find(e=>e.sets?.some(s=>!s.done));
  const k=nx?.sets?.findIndex(s=>!s.done)??-1;
  if(nx&&k>=0)next={name:nx.name,set:k+1,of:nx.sets.length,kg:nx.sets[k].kg,reps:nx.sets[k].reps};
 }
 const load=next?[num(next.kg)>0?`${trim(next.kg)} kg`:'',num(next.reps)>0?`× ${trim(next.reps)}`:''].filter(Boolean).join(' '):'';
 const body=next?`Next: ${next.name} · set ${next.set} of ${next.of}${load?' · '+load:''}`:'Time for your next set.';
 return {id:REST_ALERT_ID,at:new Date(at),title:"Rest's over",body};
}

let channelReady=false;
async function ensureChannel(ln){
 if(channelReady||typeof ln.createChannel!=='function')return;
 try{await ln.createChannel({id:REST_CHANNEL,name:'Rest timer',description:'Buzzes when your rest between sets ends',importance:5,visibility:1,vibration:true});}catch{}
 channelReady=true;
}

// Ask once, the first time a rest starts in the APK, so the prompt never appears mid-lock.
export async function prepareRestAlerts(){
 const ln=plugin();if(!ln)return false;
 try{
  let perm=await ln.checkPermissions();
  if(perm.display==='prompt'||perm.display==='prompt-with-rationale')perm=await ln.requestPermissions();
  await ensureChannel(ln);
  return perm.display==='granted';
 }catch{return false;}
}

export async function cancelRestAlert(){
 const ln=plugin();if(!ln)return;
 try{await ln.cancel({notifications:[{id:REST_ALERT_ID}]});}catch{}
}

export async function scheduleRestAlert(session){
 const ln=plugin();if(!ln)return false;
 const plan=restAlertPlan(session);
 await cancelRestAlert();
 if(!plan)return false;
 try{
  const perm=await ln.checkPermissions();
  if(perm.display!=='granted')return false;
  await ensureChannel(ln);
  await ln.schedule({notifications:[{id:plan.id,title:plan.title,body:plan.body,channelId:REST_CHANNEL,
   schedule:{at:plan.at,allowWhileIdle:true},extra:{recompReminder:'workout'}}]});
  return true;
 }catch{return false;}
}
