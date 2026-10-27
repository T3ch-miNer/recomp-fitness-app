// One-time import for the existing public Recomp Cloudflare D1 catalogue.
// Run from the repository root:
//   node catalogue-worker/scripts/build-seed.mjs > catalogue-worker/seed-catalogue.sql
//   npx wrangler d1 execute recomp-catalogue --remote --file=catalogue-worker/seed-catalogue.sql
// This reads only the bundled public reference catalogues, never personal logs.
// INSERT OR IGNORE preserves existing D1 rows and any subsequent manual edits.
import {FOOD_ITEMS} from '../../food-db.js';
import {FTS_WORKOUTS} from '../../fts-workouts.js';
import {FTS_WORKOUTS_5_TO_15} from '../../fts-workouts-5-15.js';
import {FTS_WORKOUTS_16_TO_41} from '../../fts-workouts-16-41.js';

const workouts=[...FTS_WORKOUTS,...FTS_WORKOUTS_5_TO_15,...FTS_WORKOUTS_16_TO_41];
const ids=new Set(workouts.map(plan=>plan.id));
if(workouts.length!==41 || ids.size!==41 ||
   Array.from({length:41},(_,i)=>'fts-workout-'+(i+1)).some(id=>!ids.has(id))){
 throw Error('The bundled workout library is incomplete. Refusing to export a partial seed.');
}
const quote=value=>"'"+String(value??'').replaceAll("'","''")+"'";
const number=(value,max=1000)=>{
 const n=Number(value);
 if(!Number.isFinite(n)||n<0||n>max)throw Error('Invalid catalogue nutrition value: '+value);
 return n;
};
const sql=[
 '-- Recomp shared/public catalogue: all currently bundled foods and FTS workouts 1–41.',
 '-- Nutrition values are home-recipe estimates, not laboratory-tested.',
 '-- INSERT OR IGNORE will not replace existing Cloudflare D1 records.',
 '-- Do not import personal food logs, exercise history, health data or credentials.'
];
for(const food of FOOD_ITEMS){
 const p=food.per100;
 if(!food.id||!food.name||!p)throw Error('Invalid food in bundled catalogue');
 sql.push('INSERT OR IGNORE INTO foods (id,name,category,aliases,default_grams,calories,protein,carbs,fat,fibre,source) VALUES ('+
  [quote(food.id),quote(food.name),quote(food.category),quote(food.aliases),
  number(food.defaultGrams,5000),number(p.calories),number(p.protein),number(p.carbs),
  number(p.fat),number(p.fibre),quote(food.source)].join(',')+');');
}
const exercises=new Map();
for(const [index,plan] of workouts.entries()){
 if(!plan.id||!plan.name||!Array.isArray(plan.items))throw Error('Invalid workout plan');
 sql.push('INSERT OR IGNORE INTO workout_plans (id,name,subtitle,items_json,sort_order) VALUES ('+
  [quote(plan.id),quote(plan.name),quote(plan.subtitle||''),
  quote(JSON.stringify(plan.items)),index+1].join(',')+');');
 for(const item of plan.items){
  if(!Array.isArray(item)||!item[0]||!item[1])continue;
  const id=String(item[0]);
  if(!exercises.has(id))exercises.set(id,{
   name:String(item[1]),
   guidance:typeof item[8]==='string'?item[8]:'',
  });
 }
}
for(const [id,exercise] of exercises){
 sql.push('INSERT OR IGNORE INTO exercises (id,name,muscle_group,equipment,guidance) VALUES ('+
  [quote(id),quote(exercise.name),quote(''),quote(''),quote(exercise.guidance)].join(',')+');');
}
process.stdout.write(sql.join('\n')+'\n');
process.stderr.write(
 'Generated seed: '+FOOD_ITEMS.length+' foods, '+workouts.length+
 ' workout plans (1–41), '+exercises.size+' exercise entries.\n'
);
