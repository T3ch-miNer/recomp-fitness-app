// Native Health Connect bridge for an optional trusted Android Capacitor wrapper.
// An ordinary web PWA cannot access Android Health Connect or Samsung Health directly.
// The bridge is opt-in and never uploads health data.
export const nativeHealthAvailable = () => {
  try{return Boolean(globalThis.Capacitor?.isNativePlatform?.() &&
    typeof globalThis.Capacitor?.Plugins?.RecompHealth?.readDailyActivity === 'function');}
  catch{return false;}
};
export function validateDailyActivity(payload,requestedDate) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)||Number.isNaN(Date.parse(requestedDate+'T12:00:00')))throw new Error('Invalid activity date.');
  if(!payload||payload.date!==requestedDate)throw new Error('Health Connect returned an unexpected date.');
  const combinedSteps=Number(payload.steps),combinedCalories=Number(payload.activeCalories);
  if(!Number.isInteger(combinedSteps)||combinedSteps<0||combinedSteps>250000)throw new Error('Invalid step count from Health Connect.');
  if(!Number.isFinite(combinedCalories)||combinedCalories<0||combinedCalories>30000)throw new Error('Invalid active calories from Health Connect.');
  const round=x=>Math.round(x*10)/10;
  const sources=cleanSources(payload.sources);
  const result={date:requestedDate,steps:combinedSteps,activeCalories:round(combinedCalories),source:'Health Connect'};
  if(!sources.length)return result;
  // Two apps counting the same day (for example Samsung Health and Google Fit)
  // are two measurements of the same steps, not steps to add up. Health
  // Connect's combined total only removes duplicates where records overlap in
  // time, so it can come out near the sum. With several sources, use the
  // largest single app's total for each metric instead.
  const stepSources=sources.filter(s=>s.steps>0),calorieSources=sources.filter(s=>s.activeCalories>0);
  if(stepSources.length>1){
   const best=stepSources.reduce((a,b)=>b.steps>a.steps?b:a);
   result.steps=best.steps;result.stepsFrom=best.name;
  }
  if(calorieSources.length>1)result.activeCalories=round(calorieSources.reduce((a,b)=>b.activeCalories>a.activeCalories?b:a).activeCalories);
  result.sources=sources;result.combinedSteps=combinedSteps;
  return result;
}
const APP_NAMES={'com.sec.android.app.shealth':'Samsung Health','com.google.android.apps.fitness':'Google Fit','com.fitbit.FitbitMobile':'Fitbit','com.garmin.android.apps.connectmobile':'Garmin Connect','android':'This phone'};
export function healthSourceName(app) {
  const id=String(app||'');
  if(APP_NAMES[id])return APP_NAMES[id];
  if(id.startsWith('com.android.healthconnect.phone'))return 'This phone';
  return id.slice(0,80)||'Unknown app';
}
// Per-app totals from the native plugin. Entries that are not well formed are
// dropped: older app builds send no list at all.
function cleanSources(list) {
  if(!Array.isArray(list))return [];
  const out=[];
  for(const item of list.slice(0,20)){
   const steps=Number(item?.steps),activeCalories=Number(item?.activeCalories);
   if(typeof item?.app!=='string'||!item.app||!Number.isInteger(steps)||steps<0||steps>250000)continue;
   if(!Number.isFinite(activeCalories)||activeCalories<0||activeCalories>30000)continue;
   out.push({app:item.app.slice(0,120),name:healthSourceName(item.app),steps,activeCalories:Math.round(activeCalories*10)/10});
  }
  return out;
}
// Short note for the sync message when more than one app reported steps.
export function describeHealthSources(activity) {
  const counted=(activity?.sources||[]).filter(s=>s.steps>0);
  if(counted.length<2)return '';
  return ' Using '+activity.stepsFrom+'. '+counted.filter(s=>s.name!==activity.stepsFrom).map(s=>s.name+' counted '+s.steps.toLocaleString('en-GB')).join(', ')+'.';
}
export async function readHealthConnectDay(date) {
  if(!nativeHealthAvailable())throw new Error('Health Connect requires the native Recomp Android app. It is not accessible directly from this PWA.');
  const plugin=globalThis.Capacitor.Plugins.RecompHealth;
  // The native plugin requests READ_STEPS and READ_ACTIVE_CALORIES_BURNED on demand,
  // after the user taps Sync. No write or background permission is requested.
  const data=await plugin.readDailyActivity({date});
  return validateDailyActivity(data,date);
}
export function mergeDailyActivity(existing,incoming) {
  // Replace a daily aggregate by date, never add overlapping device counts.
  // Preserve any other fields on that day's record and all previous days.
  const data=validateDailyActivity(incoming,incoming?.date);
  const current=Array.isArray(existing)?existing:[];
  const previous=current.find(x=>x?.date===data.date);
  // Drop source details from an earlier sync so they cannot outlive it.
  const kept={...(previous||{})};
  for(const key of ['sources','stepsFrom','combinedSteps'])delete kept[key];
  return [...current.filter(x=>x?.date!==data.date),{...kept,...data}];
}
