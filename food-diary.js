// Small, pure food-diary helpers. No migrations, network or automatic writes.
export const FOOD_DIARY_MEALS=['Breakfast','Lunch','Dinner','Snack'];
export const FOOD_DIARY_MACROS=['calories','protein','carbs','fat','fibre'];
const LIMITS={calories:10000,protein:2500,carbs:2500,fat:2500,fibre:1000};
const round=v=>Math.round(v*10)/10;
export function validDiaryDate(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const d=new Date(date+'T12:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;
}
export function shiftDiaryDate(date,days){
 if(!validDiaryDate(date)||!Number.isInteger(days)||Math.abs(days)>366)
  throw Error('Choose a valid food diary date.');
 const d=new Date(date+'T12:00:00Z');
 d.setUTCDate(d.getUTCDate()+days);
 return d.toISOString().slice(0,10);
}
export function diaryTotals(entries,date){
 const sum=Object.fromEntries(FOOD_DIARY_MACROS.map(key=>[key,0]));
 if(!validDiaryDate(date))return sum;
 for(const e of entries||[]){
  if(e?.date!==date)continue;
  for(const key of FOOD_DIARY_MACROS)sum[key]+=Number.isFinite(Number(e[key]))?Number(e[key]):0;
 }
 for(const key of FOOD_DIARY_MACROS)sum[key]=round(sum[key]);
 return sum;
}
export function scaledDiaryMacros(original,newGrams){
 const before=Number(original?.grams),after=Number(newGrams);
 if(!Number.isFinite(before)||before<=0||!Number.isFinite(after)||after<=0||after>5000)
  throw Error('Enter a portion between 1 and 5,000 g.');
 const ratio=after/before;
 return Object.fromEntries(FOOD_DIARY_MACROS.map(key=>{
  const value=Number(original[key]);
  if(!Number.isFinite(value)||value<0)throw Error('Original nutrition estimate is invalid.');
  return [key,round(value*ratio)];
 }));
}
export function updateDiaryEntry(original,form){
 if(!original?.id)throw Error('This food entry is no longer available.');
 const name=String(form?.name??'').trim().slice(0,100);
 if(!name)throw Error('Enter a food name.');
 const date=String(form?.date??'');
 if(!validDiaryDate(date))throw Error('Choose a valid diary date.');
 const meal=String(form?.meal??'');
 if(!FOOD_DIARY_MEALS.includes(meal))throw Error('Choose a meal type.');
 const gramsText=String(form?.grams??'').trim();
 let grams=original.grams;
 if(gramsText){
  grams=Number(gramsText);
  if(!Number.isFinite(grams)||grams<1||grams>5000)throw Error('Enter a portion between 1 and 5,000 g.');
 }else if(original.grams!=null&&original.grams!==''){
  throw Error('Enter the portion size in grams.');
 }else grams=undefined;
 const macros={};
 for(const key of FOOD_DIARY_MACROS){
  const raw=String(form?.[key]??'').trim();
  if(!raw)throw Error('Enter '+key+' before saving.');
  const value=Number(raw);
  if(!Number.isFinite(value)||value<0||value>LIMITS[key])
   throw Error('Check the '+key+' amount.');
  macros[key]=round(value);
 }
 const changedNutrition=FOOD_DIARY_MACROS.some(k=>Number(original[k]||0)!==macros[k]);
 const changedPortion=grams!==original.grams;
 const updated={...original,name,date,meal,...macros};
 if(grams!==undefined)updated.grams=grams;
 else delete updated.grams;
 if(changedPortion||changedNutrition){
  // Original AI confidence bounds no longer describe manually altered values.
  if(original.aiEstimate)updated.aiCalorieRange=null;
  updated.nutritionEdited=true;
 }
 return updated;
}
export function repeatDiaryEntry(original,{id,date,meal}){
 if(!original||!String(id||'').trim())throw Error('Food entry is unavailable.');
 if(!validDiaryDate(date)||!FOOD_DIARY_MEALS.includes(meal))throw Error('Choose a valid date and meal.');
 const duplicate={...original,id,date,meal};
 delete duplicate.photoBatch;
 return duplicate;
}
