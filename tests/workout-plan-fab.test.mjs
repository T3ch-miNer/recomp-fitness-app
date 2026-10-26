import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {orderedWorkoutPlans,workoutHistoryHtml} from '../history-view.js';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('app.js');
const styles=read('styles.css');
const dock=read('nav-capsule.css');
const index=read('index.html');
const worker=read('sw.js');

const start=app.indexOf('function workoutView(){');
const end=app.indexOf('function elapsed(',start);
assert.ok(start>=0&&end>start,'workout plan view present');
const viewBuilder=new Function('state','heading','svg','escapeHtml','planActionsId',
 'elapsed','dateDisplay','activeWorkoutView','historyPanel','workoutHistoryHtml','orderedWorkoutPlans',
 app.slice(start,end)+'\nreturn workoutView;');
const htmlEscape=x=>String(x??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const workoutView=viewBuilder(
 {session:null,workoutHistory:[],templates:[
  {id:'fts-workout-1',name:'Workout 1 · Leg Day',subtitle:'FTS',items:[['a','Leg Press',3,10,100,90,[]]]}
 ]},
 ()=>'<header>Workouts</header>',()=>'<svg></svg>',
 htmlEscape,null,()=>'',()=>'',()=>'',null,workoutHistoryHtml,orderedWorkoutPlans)();

const beginFab=app.indexOf("${!active&&(tab==='nutrition'||tab==='body'||tab==='workouts')?");
const endFab=app.indexOf('${state.session&&!active?',beginFab);
assert.ok(beginFab>=0&&endFab>beginFab,'the floating quick-add markup is in render');
const fabExpr=app.slice(beginFab+2,endFab-1);
const renderQuickFab=new Function('active','tab','state','svg','historyPanel','return ('+fabExpr+');');
const fab=(tab,{active=false,session=null}={})=>renderQuickFab(active,tab,{session},()=>'<svg></svg>',null);

test('New plan is removed from Workouts heading but plan cards stay intact',()=>{
 assert.match(workoutView,/Your workout plans/);
 assert.doesNotMatch(workoutView,/New plan/);
 assert.doesNotMatch(workoutView,/data-action="create-template"/);
 assert.match(workoutView,/Workout 1/);
 assert.match(workoutView,/data-action="begin-template"/);
 assert.match(workoutView,/data-action="edit-template"/);
});

test('Workouts gets the same compact floating plus action as Food and Weight',()=>{
 const plan=fab('workouts');
 assert.match(plan,/class="quick-fab"/);
 assert.match(plan,/data-action="toggle-history"/);
 assert.match(plan,/data-action="create-template"/);
 assert.match(plan,/aria-label="Create workout plan"/);
 assert.match(plan,/<span class="quick-fab-label">Plan<\/span>/);
 assert.match(plan,/<svg>/);
 assert.ok(!plan.includes('New plan'));
 assert.match(fab('nutrition'),/data-action="toggle-food-menu"/);
 assert.match(fab('nutrition'),/data-action="toggle-history"/);
 assert.match(fab('nutrition'),/quick-fab-label">Food/);
 assert.match(fab('body'),/data-action="add-weight"/);
 assert.match(fab('body'),/quick-fab-label">Weight/);
 assert.equal(fab('home'),'');
 assert.equal(fab('settings'),'');
});

test('floating Plan button avoids overlapping a minimised session and hides in focus mode',()=>{
 const minimized={minimized:true};
 assert.match(fab('workouts',{session:minimized}),/plan-fab-cluster history-action-cluster above-workout/);
 assert.equal(fab('workouts',{active:true,session:{minimized:false}}),'');
 assert.match(styles,/\.quick-fab\.above-workout/);
 assert.match(dock,/\.quick-fab\.above-workout/);
 assert.match(styles,/\.quick-fab:focus-visible/);
 assert.match(app,/case 'create-template':modal=\{type:'new-template'\}/);
 assert.match(app,/id==='form-new-template'/);
});

test('updated offline shell installs the Plan FAB code',()=>{
 assert.match(index,/app\.js\?v=2\.9\.8-daily-tasks/);
 assert.match(worker,/recomp-shell-v2\.9\.8-daily-tasks/);
 assert.ok(worker.includes("'./app.js'"));
});
