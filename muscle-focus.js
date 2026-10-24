// A lightweight, offline-only map of likely muscles targeted by named exercises.
// It describes exercise emphasis, not measured activation or recovery.
const MUSCLES={
 quads:'Quadriceps',glutes:'Glutes',hamstrings:'Hamstrings',calves:'Calves',
 chest:'Chest',shoulders:'Shoulders',rearDelts:'Rear shoulders',triceps:'Triceps',
 biceps:'Biceps',lats:'Lats',upperBack:'Upper back',traps:'Traps',core:'Core'
};
// More specific movements must appear before general exercise families.
const RULES=[
 [/leg extension/,['quads'],[]],
 [/(leg curl|hamstring curl|nordic curl)/,['hamstrings'],['calves']],
 [/(calf raise|toe raise)/,['calves'],[]],
 [/(romanian deadlift|stiff leg deadlift|rdl|good morning)/,['hamstrings','glutes'],['upperBack']],
 [/(hip thrust|glute bridge|hip abduction|kickback)/,['glutes'],['hamstrings']],
 [/(leg press|hack squat|squat|wall sit|split squat|lunge|step up)/,['quads','glutes'],['hamstrings']],
 [/(deadlift|kettlebell swing)/,['glutes','hamstrings'],['quads','upperBack']],
 [/(reverse fly|rear delt|face pull)/,['rearDelts','upperBack'],['traps']],
 [/(lateral raise|side raise|upright row)/,['shoulders'],['traps']],
 [/(front raise|shoulder press|overhead press|arnold press|military press|strict press|landmine press)/,['shoulders'],['triceps']],
 [/(shrug|trap raise)/,['traps'],['upperBack']],
 [/(triceps|tricep|skull crusher|dip\b|pushdown)/,['triceps'],['chest']],
 [/(biceps|bicep|hammer curl|preacher curl|ez bar curl|concentration curl)/,['biceps'],[]],
 [/(lat pull|pulldown|pull up|pullup|chin up)/,['lats'],['biceps','upperBack']],
 [/(seated row|cable row|chest supported row|dumbbell row|barbell row|one arm row|t bar row|bent over row)/,['upperBack','lats'],['biceps']],
 [/(chest fly|cable fly|cable flie|pec deck|pec fly)/,['chest'],['shoulders']],
 [/(bench press|chest press|incline press|decline press|push up|pushup)/,['chest'],['triceps','shoulders']],
 [/(russian twist|woodchop|side plank|pallof)/,['core'],[]],
 [/(crunch|leg raise|knee raise|plank|ab wheel|sit up|dead bug|hollow hold|mountain climber|flutter kick|bicycle crunch)/,['core'],[]],
 [/(pull over|pullover)/,['lats'],['chest']],
 [/(rowing machine|skipping|jump rope|jumping jack|treadmill|elliptical|cycling|walking|running)/,[],[]]
];
export function muscleTargets(name){
 const normal=String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const rule=RULES.find(([pattern])=>pattern.test(normal));
 return rule?{primary:rule[1],secondary:rule[2]}:null;
}
export function getWorkoutMuscles(exercises=[]){
 const totals=new Map(),unknown=[];
 for(const exercise of exercises||[]){
  const sets=Array.isArray(exercise?.sets)?exercise.sets.length:0;
  if(!sets)continue;
  const muscles=muscleTargets(exercise.name);
  if(!muscles){unknown.push(String(exercise?.name||'Unnamed exercise'));continue;}
  for(const [kind,list] of [['primary',muscles.primary],['secondary',muscles.secondary]]){
   for(const muscle of list){
    const entry=totals.get(muscle)||{id:muscle,label:MUSCLES[muscle],primary:0,secondary:0};
    entry[kind]+=sets;totals.set(muscle,entry);
   }
  }
 }
 return {muscles:[...totals.values()].map(entry=>({...entry,
  emphasis:entry.primary>0?'primary':'secondary',
  score:entry.primary+entry.secondary*.45
 })).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label)),unknown};
}
const BASE_BODY=`
<g class="muscle-body-outline" stroke-linejoin="round">
 <ellipse cx="55" cy="16" rx="11" ry="13"/>
 <path d="M49 28h12l3 9-9 8-9-8z"/>
 <path d="M43 36Q32 36 27 44L34 67 38 94 43 111 67 111 72 94 76 67 83 44Q78 36 67 36L55 43z"/>
 <path d="M28 42Q19 44 18 57L11 91 14 105 20 104 28 70 34 53z"/>
 <path d="M82 42Q91 44 92 57L99 91 96 105 90 104 82 70 76 53z"/>
 <path d="M38 98Q31 108 35 127L31 164Q30 178 39 182L48 178 51 128 55 111z"/>
 <path d="M72 98Q79 108 75 127L79 164Q80 178 71 182L62 178 59 128 55 111z"/>
 <path d="M38 180 34 217 30 231Q33 237 45 233L46 219 49 181z"/>
 <path d="M72 180 76 217 80 231Q77 237 65 233L64 219 61 181z"/>
</g>`;
const SHAPES={
 front:{
  chest:'M39 49Q46 42 54 48V69Q42 74 38 62z M71 49Q64 42 56 48V69Q68 74 72 62z',
  shoulders:'M31 42Q36 37 43 38L39 56 32 65 26 56z M79 42Q74 37 67 38L71 56 78 65 84 56z',
  biceps:'M24 59 29 67 21 89 15 88z M86 59 81 67 89 89 95 88z',
  core:'M42 72 54 73 54 103 43 104 39 90z M68 72 56 73 56 103 67 104 71 90z',
  quads:'M38 111Q45 108 52 116L48 157Q43 173 35 164L37 129z M72 111Q65 108 58 116L62 157Q67 173 75 164L73 129z',
  glutes:'M37 101Q44 98 53 106L51 118 38 125z M73 101Q66 98 57 106L59 118 72 125z',
  hamstrings:'M33 147 38 152 42 169 36 174z M77 147 72 152 68 169 74 174z',
  calves:'M38 184Q45 181 47 190L43 214 37 219 35 211z M72 184Q65 181 63 190L67 214 73 219 75 211z'
 },
 back:{
  shoulders:'M31 43 43 38 40 58 32 63 27 54z M79 43 67 38 70 58 78 63 83 54z',
  rearDelts:'M31 45Q36 38 43 39L41 60 32 65z M79 45Q74 38 67 39L69 60 78 65z',
  triceps:'M23 60 29 66 21 92 16 90z M87 60 81 66 89 92 94 90z',
  traps:'M48 31 55 39 62 31 75 42 67 53 55 47 43 53 35 42z',
  lats:'M38 59 53 68 51 97 42 104 37 77z M72 59 57 68 59 97 68 104 73 77z',
  upperBack:'M40 49 54 51 54 73 41 78 35 58z M70 49 56 51 56 73 69 78 75 58z',
  core:'M43 89 54 93 54 106 43 108z M67 89 56 93 56 106 67 108z',
  glutes:'M37 100Q47 95 54 104L53 121Q45 131 35 121z M73 100Q63 95 56 104L57 121Q65 131 75 121z',
  hamstrings:'M36 126Q43 130 51 125L47 168Q43 180 34 169z M74 126Q67 130 59 125L63 168Q67 180 76 169z',
  quads:'M32 155 37 158 41 173 35 176z M78 155 73 158 69 173 75 176z',
  calves:'M37 183Q45 178 48 189L43 216Q39 223 35 214z M73 183Q65 178 62 189L67 216Q71 223 75 214z'
 }
};
function figure(view,muscles){
 const parts=Object.entries(SHAPES[view]).map(([key,d])=>{
  const muscle=muscles.find(item=>item.id===key);
  return muscle?`<path class="muscle-highlight ${muscle.emphasis}" d="${d}"/>`:'';
 }).join('');
 return `<div class="muscle-map-figure"><svg viewBox="0 0 110 240" aria-label="${view==='front'?'Front':'Back'} body muscle map" role="img">${BASE_BODY}<g class="muscle-anatomy-lines" fill="none"><path d="M55 44v56M38 71l17 6 17-6M38 93l17 5 17-5M39 126l9 5M71 126l-9 5"/></g>${parts}</svg><span>${view.toUpperCase()}</span></div>`;
}
export function renderMuscleFocus(exercises=[]){
 const {muscles,unknown}=getWorkoutMuscles(exercises);
 const list=muscles.slice(0,6).map(m=>`<div class="muscle-focus-row"><span>${m.label}</span><b class="${m.emphasis}">${m.emphasis==='primary'?'Main':'Supporting'}</b></div>`).join('');
 const empty='<p class="muscle-focus-empty">No recognised strength exercises yet. Add exercises to see their muscle focus here.</p>';
 return `<section class="muscle-focus-card" aria-labelledby="muscle-focus-title">
 <div class="muscle-focus-eyebrow"><span class="status-dot"></span> MUSCLE FOCUS <span class="muscle-focus-aside">DETAILED VIEW</span></div>
 <h2 id="muscle-focus-title">Know what you're training.</h2>
 <p class="muscle-focus-subtitle">Muscles targeted by your current workout exercises</p>
 ${muscles.length?`<div class="muscle-map-figures">${figure('front',muscles)}${figure('back',muscles)}</div>
 <div class="muscle-focus-legend"><span><i class="muscle-key-primary"></i> Main focus</span><span><i class="muscle-key-secondary"></i> Supporting</span></div>
 <div class="muscle-focus-list">${list}</div>`:empty}
 <p class="muscle-focus-hint">Estimated emphasis from exercise names and planned sets, not measured muscle activation.${unknown.length?' Some exercises could not be matched.':''}</p>
 </section>`;
}
