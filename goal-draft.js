// Keep incomplete daily targets separate from saved state until Save goals.
export const GOAL_FIELDS=['calories','protein','carbs','fat','fibre','water','steps'];
const LIMITS={calories:15000,protein:1000,carbs:2000,fat:1000,fibre:500,water:30000,steps:200000};
export function readGoalDraft(form){
 if(!form?.elements?.namedItem)throw Error('Daily target form is unavailable.');
 const draft={};
 for(const key of GOAL_FIELDS){
  const input=form.elements.namedItem(key);
  if(!input)throw Error('Daily target field is missing: '+key);
  draft[key]=String(input.value);
 }
 return draft;
}
export function validateGoalDraft(draft){
 const goals={};
 for(const key of GOAL_FIELDS){
  const raw=String(draft?.[key]??'').trim();
  if(!/^\d+$/.test(raw))throw Error('Enter a whole number for '+key+'. No target was changed.');
  const value=Number(raw);
  if(!Number.isSafeInteger(value)||value>LIMITS[key])
   throw Error('Check your '+key+' target. No target was changed.');
  goals[key]=value;
 }
 return goals;
}
