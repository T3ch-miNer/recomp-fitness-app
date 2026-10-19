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
  const steps=Number(payload.steps),activeCalories=Number(payload.activeCalories);
  if(!Number.isInteger(steps)||steps<0||steps>250000)throw new Error('Invalid step count from Health Connect.');
  if(!Number.isFinite(activeCalories)||activeCalories<0||activeCalories>30000)throw new Error('Invalid active calories from Health Connect.');
  return {date:requestedDate,steps,activeCalories:Math.round(activeCalories*10)/10,source:'Health Connect'};
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
  return [...current.filter(x=>x?.date!==data.date),{...(previous||{}),...data}];
}
