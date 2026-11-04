// Curated, offline starter programmes for healthy adults. No AI service or user sex
// assumptions. The user chooses goal, training experience, equipment and focus.
export const BASIC_GOALS=Object.freeze([
 ['lose-fat','Lose body fat'],['build-muscle','Build muscle'],['recomposition','Lose fat & build muscle'],
 ['improve-fitness','Improve fitness'],['maintain','Stay active & maintain']
]);
const GOAL_NAMES=Object.fromEntries(BASIC_GOALS);
const ALLOWED=new Set(['gym','home','bodyweight']);
const FOCI=new Set(['balanced','lower','upper']);
const GENDERS=new Set(['male','female','non-binary','prefer-not-to-say']);
const MOVES={
 squat:{gym:['Leg Press','Goblet Squat'],home:['Goblet Squat','Bodyweight Squat'],bodyweight:['Bodyweight Squat','Sit-to-Stand']},
 hinge:{gym:['Dumbbell Romanian Deadlift','Hip Thrust'],home:['Dumbbell Romanian Deadlift','Glute Bridge'],bodyweight:['Glute Bridge','Bodyweight Good Morning']},
 push:{gym:['Machine Chest Press','Incline Push-up'],home:['Dumbbell Floor Press','Incline Push-up'],bodyweight:['Incline Push-up','Wall Push-up']},
 pull:{gym:['Seated Cable Row','Lat Pulldown'],home:['One-arm Dumbbell Row','Resistance Band Row'],bodyweight:['Prone W Raise','Reverse Snow Angel']},
 vertical:{gym:['Machine Shoulder Press','Dumbbell Shoulder Press'],home:['Dumbbell Shoulder Press','Pike Press'],bodyweight:['Wall Push-up','Incline Push-up']},
 single:{gym:['Reverse Lunge','Step-up'],home:['Reverse Lunge','Step-up'],bodyweight:['Supported Split Squat','Step-up']},
 glutes:{gym:['Hip Thrust','Glute Bridge'],home:['Glute Bridge','Dumbbell Romanian Deadlift'],bodyweight:['Glute Bridge','Single-leg Glute Bridge']},
 core:{gym:['Dead Bug','Plank'],home:['Dead Bug','Plank'],bodyweight:['Dead Bug','Plank']},
 calf:{gym:['Standing Calf Raise','Seated Calf Raise'],home:['Calf Raise','Standing Calf Raise'],bodyweight:['Standing Calf Raise','Single-leg Calf Raise']}
};
const ROTATION=[
 ['squat','push','pull','hinge','core','calf'],
 ['single','hinge','vertical','pull','glutes','core'],
 ['squat','push','pull','single','core','glutes'],
 ['hinge','single','push','pull','core','calf']
];
const WEEKDAYS={2:['Monday','Thursday'],3:['Monday','Wednesday','Friday'],4:['Monday','Tuesday','Thursday','Saturday']};
function numberWithin(value,min,max,label){
 const valueNumber=Number(value);
 if(!Number.isFinite(valueNumber)||valueNumber<min||valueNumber>max)throw Error(label+' must be between '+min+' and '+max+'.');
 return valueNumber;
}
export function validateBasicProfile(input){
 if(!input||typeof input!=='object')throw Error('Complete your basic profile.');
 const age=Math.round(numberWithin(input.age,18,100,'Age'));
 const heightCm=numberWithin(input.heightCm,100,230,'Height');
 const weightKg=numberWithin(input.weightKg,30,350,'Weight');
 const gender=String(input.gender||'prefer-not-to-say');
 if(!GENDERS.has(gender))throw Error('Select a gender option.');
 const goal=String(input.goal||'recomposition');
 if(!GOAL_NAMES[goal])throw Error('Select a fitness goal.');
 const equipment=String(input.equipment||'gym');
 if(!ALLOWED.has(equipment))throw Error('Select your available equipment.');
 const experience=String(input.experience||'beginner');
 if(!['beginner','regular'].includes(experience))throw Error('Select your experience level.');
 const focus=String(input.focus||'balanced');
 if(!FOCI.has(focus))throw Error('Select a focus area.');
 const days=numberWithin(input.days,2,4,'Training days');
 if(!Number.isInteger(days))throw Error('Training days must be a whole number.');
 const minutes=numberWithin(input.minutes,25,75,'Workout duration');
 return {age,gender,heightCm,weightKg,goal,equipment,experience,focus,days,minutes};
}
function sessionMoves(index,profile){
 const types=[...ROTATION[index]];
 if(profile.focus==='lower')types[4]=index%2?'glutes':'single';
 if(profile.focus==='upper')types[5]=index%2?'pull':'push';
 if(profile.goal==='build-muscle'){
  types.splice(5,1,profile.focus==='lower'?'glutes':index%2?'vertical':'pull');
 }else if(profile.goal==='improve-fitness'){
  types.splice(5,1,index%2?'calf':'single');
 }else if(profile.goal==='lose-fat'){
  types.splice(5,1,index%2?'core':'single');
 }
 return types.slice(0,profile.minutes<35?4:profile.minutes<45?5:6);
}
export function generateBasicProgramme(input){
 const profile=validateBasicProfile(input);
 const title=GOAL_NAMES[profile.goal],reps=profile.goal==='build-muscle'?10:12;
 const sets=profile.experience==='beginner'?2:3;
 const labels=['Foundation A','Foundation B','Foundation C','Foundation D'];
 const workouts=Array.from({length:profile.days},(_,index)=>({
  id:'basic-v1-'+(index+1),
  name:labels[index]+' · '+title,
  subtitle:profile.minutes+' min · '+(profile.equipment==='bodyweight'?'No equipment':profile.equipment==='home'?'Home training':'Gym')+' · '+sets+' sets',
  basicGenerated:true,
  notes:'Warm up for 5 minutes. Choose a comfortable effort and leave 2–3 repetitions in reserve. Rest 60–120 seconds between sets. No starting weight is prescribed. Adapt exercises for pain or mobility concerns. Progress gradually.',
  items:sessionMoves(index,profile).map((type,j)=>{
   const names=MOVES[type][profile.equipment];
   const name=names[(index+j)%names.length];
   const core=type==='core',count=core?10:reps;
   return ['basic-v1-'+(index+1)+'-'+type+'-'+j,name,sets,count,0,core?60:90,
    [names.find(n=>n!==name)].filter(Boolean)];
  })
 }));
 const days=WEEKDAYS[profile.days];
 return {
  id:'basic-v1',title,goal:profile.goal,focus:profile.focus,days:profile.days,
  weeks:4,daysOfWeek:days,workouts,
  description: profile.goal==='lose-fat'?'Strength training plus optional brisk walking on non-lifting days. Nutrition determines the energy deficit.':
   profile.goal==='build-muscle'?'Progressive resistance training with sufficient recovery and food.':
   profile.goal==='improve-fitness'?'Full-body strength, sustainable activity and comfortable conditioning.':
   profile.goal==='maintain'?'A sustainable routine that keeps major muscle groups active.':
   'Consistent full-body lifting and sustainable nutrition habits.',
  progression:[
   'Week 1: learn each movement, start light and leave 2–3 reps in reserve.',
   'Week 2: repeat the exercises, aiming for smoother technique and extra reps.',
   'Week 3: if all reps feel controlled, add a little resistance or difficulty.',
   'Week 4: consolidate your routine, then review progress and adjust.'
  ]
 };
}
