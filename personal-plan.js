// Recomp v3 personal routines: strict data import, no AI or health data uploaded.
// Data from external models is untrusted; always preview and confirm before saving.
export const PERSONAL_PLAN_FORMAT='recomp-personal-plan-v1';
const G=['calories','protein','carbs','fat','fibre','water','steps'];
const max={calories:10000,protein:650,carbs:1400,fat:400,fibre:160,water:12000,steps:100000};
const goodText=(s,n=120)=>typeof s==='string'&&s.trim()&&s.length<=n;
function str(s,n=120){if(!goodText(s,n))throw Error('Invalid text in imported plan.');return s.trim();}
function number(value,low,high,label){
 if(typeof value!=='number'||!Number.isFinite(value)||value<low||value>high)
  throw Error('Check '+label+' in the imported plan.');
 return value;
}
function dateField(value){
 if(value==null||value==='')return '';
 if(typeof value!=='string'||value.length>20)throw Error('Check the date in your plan.');
 return value;
}
export function validateFitnessProfile(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Enter a fitness profile.');
 const options=['build-muscle','lose-fat','maintain','improve-fitness','body-recomposition'];
 const goal=String(p.goal||'');
 if(!options.includes(goal))throw Error('Choose a fitness goal.');
 const diet=String(p.diet||'omnivore');
 if(!['omnivore','vegetarian','vegan','pescatarian','halal','other'].includes(diet))throw Error('Choose a dietary preference.');
 const equipment=String(p.equipment||'gym');
 if(!['gym','home','bodyweight'].includes(equipment))throw Error('Choose your workout equipment.');
 const age=p.age==null||p.age===''?null:number(Number(p.age),18,100,'age');
 const heightCm=p.heightCm==null||p.heightCm===''?null:number(Number(p.heightCm),100,230,'height');
 const weightKg=p.weightKg==null||p.weightKg===''?null:number(Number(p.weightKg),30,350,'weight');
 const days=number(Number(p.days??3),1,7,'training days');
 const minutes=number(Number(p.minutes??45),10,180,'workout duration');
 const waistCm=p.waistCm==null||p.waistCm===''?null:number(Number(p.waistCm),30,250,'waist');
 const notes=String(p.notes||'').trim().slice(0,650);
 const activity=String(p.activity||'moderate');
 if(!['sedentary','light','moderate','active'].includes(activity))throw Error('Choose an activity level.');
 return {goal,diet,equipment,age,heightCm,weightKg,waistCm,days,minutes,activity,notes};
}
export function buildPersonalPlanningPrompt(profile){
 const p=validateFitnessProfile(profile);
 return [
 'You are a fitness programming and meal planning assistant. Create a realistic, editable training and nutrition plan for an adult using only the information below.',
 'Do not assert exact calorie needs from incomplete data. Explain assumptions and uncertainty in the plan title/subtitle or supporting notes. Avoid crash diets, extreme calorie deficits or unsafe exercise prescriptions.',
 'Review the proposed plan for sensible daily energy goals, progressive training and food portions before emitting the final JSON.',
 'If there are injuries, medical conditions, pregnancy, eating-disorder concerns or medications in notes, suggest qualified professional guidance rather than prescribing treatment.',
 'Profile (provided voluntarily): '+JSON.stringify(p),
 'Respect dietary preferences, equipment, schedule and culturally familiar Indian/global meals. State cooked vs dry food weights. Do not invent lab-verified nutrition values; provide estimates only.',
 'Return ONLY a UTF-8 JSON object (no Markdown fences or commentary). The user will save it as recomp-plan.json and import it into their own Recomp app.',
 'Use EXACT schema:',
 JSON.stringify({
  format:PERSONAL_PLAN_FORMAT,
  title:'My training and meals',
  goals:{calories:2200,protein:140,carbs:245,fat:70,fibre:30,water:2500,steps:8000},
  workouts:[
   {name:'Full Body A',subtitle:'Monday',exercises:[
    {name:'Goblet squat',sets:3,reps:10,restSeconds:90,notes:'Choose a comfortable load'}
   ]}
  ],
  meals:[
   {name:'Dal rice bowl',meal:'Lunch',grams:350,calories:470,protein:19,carbs:71,fat:11,fibre:10,notes:'Approximate recipe estimate'}
  ]
 },null,2),
 'Constraints: 1–7 workouts; 1–20 exercises each; 1–12 sets; 1–100 repetitions; 0–600 restSeconds; no prescribed starting load; 0–21 optional suggested meals.',
 'All goal values must be ordinary finite numbers. Nutrition goals are daily totals. Meals are suggestions, not automatically logged in the food diary.',
 'Use an age-appropriate approach for adults. If the information is insufficient, ask for missing essentials in a separate conversation before generating JSON.'
 ].join('\n\n');
}
export function parsePersonalPlan(value){
 let p=value;
 if(typeof value==='string'){
  if(value.length>300000)throw Error('Plan file exceeds 300 KB.');
  try{p=JSON.parse(value);}catch{throw Error('Please upload a valid Recomp JSON file, not a PDF or spreadsheet.');}
 }
 if(!p||typeof p!=='object'||Array.isArray(p)||p.format!==PERSONAL_PLAN_FORMAT)
  throw Error('Unsupported plan format. Ask the GPT for recomp-personal-plan-v1 JSON.');
 if(!Array.isArray(p.workouts)||p.workouts.length<1||p.workouts.length>7)
  throw Error('The plan must include 1–7 workouts.');
 if(!p.goals||typeof p.goals!=='object')throw Error('Daily nutrition and activity targets are required.');
 const goals=Object.fromEntries(G.map(k=>[k,number(p.goals[k],0,max[k],k)]));
 if(goals.calories<1000)throw Error('The calorie target needs review. Recomp does not accept very low-calorie plans.');
 const workouts=p.workouts.map((w,i)=>{
  if(!w||!Array.isArray(w.exercises)||!w.exercises.length||w.exercises.length>20)
   throw Error('Each workout needs 1–20 exercises.');
  return {
   id:'personal-'+(i+1),name:str(w.name,80),subtitle:goodText(w.subtitle||'Personal plan',160)?(w.subtitle||'Personal plan'):'Personal plan',
   source:'User-reviewed imported plan',
   items:w.exercises.map((e,j)=>{
    const name=str(e?.name,120),sets=number(e.sets,1,12,'sets'),reps=number(e.reps,1,100,'reps');
    const restSeconds=number(e.restSeconds,0,600,'rest time');
    return ['personal-'+(i+1)+'-exercise-'+(j+1),name,sets,reps,0,restSeconds,[],[],String(e.notes||'').slice(0,400),sets+' × '+reps,'reps','',''];
   })
  };
 });
 const meals=Array.isArray(p.meals)?p.meals:[];
 if(meals.length>21)throw Error('A plan can include at most 21 meal suggestions.');
 const recommendedMeals=meals.map(m=>{
  const meal=str(m.meal,30);
  if(!['Breakfast','Lunch','Dinner','Snack'].includes(meal))throw Error('Each meal needs Breakfast, Lunch, Dinner or Snack.');
  const metrics=Object.fromEntries(['calories','protein','carbs','fat','fibre'].map(k=>[k,number(m[k],0,k==='calories'?3500:550,'meal '+k)]));
  return {name:str(m.name,110),meal,grams:number(m.grams,1,2500,'serving grams'),...metrics,
   notes:String(m.notes||'').slice(0,300),source:'Estimated · imported plan'};
 });
 return {title:str(p.title,120),goals,workouts,meals:recommendedMeals};
}
export function previewPersonalPlan(plan){
 return {title:plan.title,workoutCount:plan.workouts.length,exerciseCount:plan.workouts.reduce((sum,w)=>sum+w.items.length,0),
  suggestedMeals:plan.meals.length,calories:plan.goals.calories,protein:plan.goals.protein};
}
