import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const curatedSource=read('exercise-videos.js');
const curatedUri='data:text/javascript;base64,'+Buffer.from(curatedSource).toString('base64');
const guidesSource=read('exercise-guides.js');
const guideUri='data:text/javascript;base64,'+Buffer.from(guidesSource.replace("from './exercise-videos.js'","from '"+curatedUri+"'")).toString('base64');
const guides=await import(guideUri);
const renderSource=read('exercise-demonstration.js');
const renderUri='data:text/javascript;base64,'+Buffer.from(renderSource.replace("'./exercise-guides.js'","'"+guideUri+"'")).toString('base64');
const {renderExerciseDemonstration}=await import(renderUri);
const app=read('app.js');
const css=read('exercise-demonstration.css');
const sw=read('sw.js');
const html=read('index.html');

test('verified exact movement names load the corresponding safe optional video',()=>{
 const videos=[
  ['Leg Press','sEM_zo9w2ss'],['Leg Extension','0fl1RRgJ83I'],
  ['Lat Pull Down','iKrKgWR9wbY'],['Bench Press','tuwHzzPdaGc']
 ];
 for(const [name,id] of videos){
  assert.equal(guides.getExerciseVideoUrl(name),'https://www.youtube-nocookie.com/embed/'+id+'?rel=0');
  assert.ok(guides.getExerciseGuide(name).source.startsWith('https://www.muscleandstrength.com/'));
  assert.ok(guides.getExerciseGuide(name).steps.length>=3);
 }
 assert.equal(guides.getExerciseVideoUrl('Incline Bench Press'),null,'do not show the wrong exercise video');
 assert.equal(guides.getExerciseVideoUrl('My custom gym move'),null,'no fabricated video IDs');
});

test('FTS moves and standard plans have reliable offline cues without touching data',()=>{
 for(const name of ['Wall Sit','Russian Twists','Dumbbell Romanian Deadlift','Strict Press','Skips / Jump Rope',
   'Seated Cable Row','Plank','Goblet Squat','Dumbbell Lateral Raise','Cable Triceps Pushdown']){
  const guide=guides.getExerciseGuide(name);
  assert.ok(guide?.steps.length>=3,'missing offline guide for '+name);
  assert.ok(guide.tip);
 }
 assert.ok(!/indexedDB|deleteDatabase|fetch\(|localStorage|\.put\(|\.clear\(/.test(guidesSource+renderSource));
});

test('no external video iframe loads before user chooses Play',()=>{
 const exercise={name:'Leg Press',notes:'FTS group A. Use comfortable load.',sets:[{kg:100,reps:10}]};
 const before=JSON.stringify(exercise);
 const preview=renderExerciseDemonstration(exercise);
 assert.match(preview,/data-action="load-exercise-video"/);
 assert.doesNotMatch(preview,/<iframe/);
 assert.match(preview,/How to do it/);
 assert.match(preview,/FTS group A/);
 assert.match(preview,/rel="noopener noreferrer"/);
 const play=renderExerciseDemonstration(exercise,{playing:true});
 assert.match(play,/<iframe/);
 assert.match(play,/www.youtube-nocookie.com\/embed\/sEM_zo9w2ss/);
 assert.equal(JSON.stringify(exercise),before,'render does not change the recorded session');
});

test('unknown custom exercises retain safe video search fallback and escape user text',()=>{
 const markup=renderExerciseDemonstration({name:'Unknown <img src=x onerror=alert(1)>',notes:'<script>unsafe</script>'});
 assert.match(markup,/No verified technique guide/);
 assert.match(markup,/Find a technique video/);
 assert.match(markup,/&lt;img/);
 assert.match(markup,/&lt;script&gt;/);
 assert.doesNotMatch(markup,/<iframe/);
 assert.doesNotMatch(markup,/<script>unsafe/);
 const url=guides.getExerciseSearchUrl('Russian Twists');
 assert.match(url,/^https:\/\/www\.youtube\.com\/results\?search_query=/);
 assert.doesNotMatch(url,/\s/);
});

test('responsive exercise demo connected to modal with safe PWA caching',()=>{
 assert.match(app,/renderExerciseDemonstration\(exercise,\{playing:modal\.playing\}\)/);
 assert.match(app,/case 'browse-template-videos':/);
 assert.match(app,/case 'preview-template-exercise':/);
 assert.match(app,/data-action="browse-template-videos"/);
 assert.match(app,/case 'load-exercise-video':/);
 assert.match(css,/exercise-demo-frame/);
 assert.match(css,/aspect-ratio:16\/9/);
 for(const file of ['exercise-videos.js','exercise-guides.js','exercise-demonstration.js','exercise-demonstration.css']){
  assert.ok(sw.includes("'./"+file+"'"),'not in offline shell: '+file);
 }
 assert.match(html,/exercise-demonstration\.css/);
 assert.match(html,/2\.7-worker-access-compat/);
});

test('workout cards show only Start and Edit, keeping exercise videos inside the plan editor',()=>{
 const workoutView=app.slice(app.indexOf('function workoutView(){'),app.indexOf('function elapsed('));
 const editorView=app.slice(app.indexOf('function templateEditorView(t){'),app.indexOf('function pendingPlanSwitch('));
 assert.match(workoutView,/data-action="begin-template"/);
 assert.match(workoutView,/data-action="edit-template"/);
 assert.doesNotMatch(workoutView,/data-action="browse-template-videos"/,
  'the workout cards must not contain a Videos button');
 assert.match(editorView,/data-action="browse-template-videos"/,
  'videos should remain accessible after opening Edit');
 assert.match(editorView,/data-action="preview-template-exercise"/,
  'each exercise still has a demonstration button');
 assert.match(app,/case 'exercise-video':/,'active workouts retain demonstrations');
 assert.match(app,/case 'preview-template-exercise':/,'saved plans retain demonstrations');
});

test('verified newer videos show the real creator instead of generic M&S attribution',()=>{
 const preview=renderExerciseDemonstration({name:'Dumbbell Snatch',notes:'Five reps per side'});
 assert.match(preview,/The Dumbbell Snatch/);
 assert.match(preview,/CrossFit/);
 assert.doesNotMatch(preview,/Video from Muscle &amp; Strength/);
 assert.doesNotMatch(preview,/<iframe/);
 const playing=renderExerciseDemonstration({name:'Dumbbell Snatch'},{playing:true});
 assert.match(playing,/embed\/R0mhHuVrLHA/);
 assert.match(playing,/www.youtube.com\/watch\?v=R0mhHuVrLHA/);
});
