import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const guidesSource=read('exercise-guides.js');
const guideUri='data:text/javascript;base64,'+Buffer.from(guidesSource).toString('base64');
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
 assert.match(app,/renderExerciseDemonstration\(state\.session\?\.exercises\?\.\[modal\.index\]/);
 assert.match(app,/case 'load-exercise-video':/);
 assert.match(css,/exercise-demo-frame/);
 assert.match(css,/aspect-ratio:16\/9/);
 for(const file of ['exercise-guides.js','exercise-demonstration.js','exercise-demonstration.css']){
  assert.ok(sw.includes("'./"+file+"'"),'not in offline shell: '+file);
 }
 assert.match(html,/exercise-demonstration\.css/);
 assert.match(html,/2\.5\.6-giant-set-rounds/);
});
