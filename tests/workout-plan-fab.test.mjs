import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {orderedWorkoutPlans,workoutHistoryHtml} from '../history-view.js';
import {CACHE,APP_SCRIPT} from './release.mjs';

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
 'elapsed','dateDisplay','activeWorkoutView','historyPanel','workoutHistoryHtml','orderedWorkoutPlans','onlineWorkoutLibraryView','historyHeaderButton','planSubtitle',
 app.slice(start,end)+'\nreturn workoutView;');
const planSubtitle=new Function(app.match(/function planSubtitle[^\n]*/)[0]+'\nreturn planSubtitle;')();
const htmlEscape=x=>String(x??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const workoutView=viewBuilder(
 {session:null,workoutHistory:[],templates:[
  {id:'fts-workout-1',name:'Workout 1 · Leg Day',subtitle:'FTS · 1 exercise',items:[['a','Leg Press',3,10,100,90,[]]]}
 ]},
 ()=>'<header>Workouts</header>',()=>'<svg></svg>',
 htmlEscape,null,()=>'',()=>'',()=>'',null,workoutHistoryHtml,orderedWorkoutPlans,()=>'',kind=>`<button data-action="toggle-history" data-kind="${kind}"></button>`,planSubtitle)();

const beginFab=app.indexOf("${!active&&(tab==='nutrition'||(tab==='body'&&!photoComparing)||tab==='workouts')?");
const endFab=app.indexOf('${state.session&&!active?',beginFab);
assert.ok(beginFab>=0&&endFab>beginFab,'the floating quick-add markup is in render');
// The floating quick-add is built by quickAddOptions() + quickAddHtml().
const qStart=app.indexOf('function quickAddOptions(){'),qEnd=app.indexOf('function measureUnit(){',qStart);
assert.ok(qStart>0&&qEnd>qStart,'quick-add helpers present');
const makeQuickAdd=new Function('tab','state','svg','escapeHtml','fanOpen','foodMeal',app.slice(qStart,qEnd)+'\nreturn quickAddHtml();');
const fabExprOk=app.slice(beginFab,endFab).includes('quickAddHtml()');
const fab=(tab,{active=false,session=null,open=false}={})=>(!active&&['nutrition','body','workouts'].includes(tab))?makeQuickAdd(tab,{session},()=>'<svg></svg>',x=>String(x),open,'Lunch'):'';

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
 assert.doesNotMatch(plan,/data-action="toggle-history"/,'History lives in the page header, not over content');
 assert.ok(fabExprOk,'render uses quickAddHtml()');
 assert.match(plan,/data-action="create-template"/);
 assert.match(plan,/aria-label="Add a workout"/);
 assert.match(plan,/<span class="quick-fab-label">Workout<\/span>/);
 assert.match(plan,/<svg>/);
 assert.ok(!plan.includes('New plan'));
 assert.match(fab('nutrition'),/data-action="fan-toggle"/);
 assert.doesNotMatch(fab('nutrition'),/data-action="toggle-history"/);
 assert.match(fab('nutrition'),/quick-fab-label">Food/);
 const food=fab('nutrition',{open:true});
 for(const mode of ['search','barcode','photo'])assert.match(food,new RegExp('data-action="quick-food" data-mode="'+mode+'"'));
 assert.match(food,/data-action="quick-recent"/);
 assert.match(food,/Adding to Lunch · change/);
 assert.match(fab('body'),/quick-fab-label">Add/);
 const body=fab('body',{open:true});
 for(const action of ['add-weight','add-measurement','add-photo'])assert.match(body,new RegExp('data-action="'+action+'"'));
 assert.doesNotMatch(fab('body'),/data-action="add-weight"/,'menu items only appear once opened');
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
 assert.match(app,/case 'create-template':modal=\{type:'new-template'\}/,'Basic mode can add workouts too');
 assert.match(app,/function isCustomPlan\(t\)/);
 assert.match(app,/id==='form-new-template'/);
});

test('updated offline shell installs the Plan FAB code',()=>{
 assert.ok(index.includes(APP_SCRIPT));
 assert.ok(worker.includes(CACHE));
 assert.ok(worker.includes("'./app.js'"));
});

test('Phase 1: History sits in the page header and plan cards show the exercise count once',()=>{
 assert.match(app,/heading\('Lift something\.','Heavy things, repeated, on purpose\.',historyHeaderButton\('workouts'\)\)/);
 assert.match(app,/heading\('Fuel up\.','Logging beats guessing\. Every single time\.',historyHeaderButton\('food'\)\)/);
 assert.match(workoutView,/1 exercise · FTS</);
 assert.doesNotMatch(workoutView,/exercise · FTS · 1 exercise/);
 assert.equal(planSubtitle('Foundation · 6 exercises'),'Foundation');
 assert.equal(planSubtitle('Custom plan'),'Custom plan');
 assert.equal(planSubtitle(''),'');
});
