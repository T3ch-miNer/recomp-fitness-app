import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {orderedWorkoutPlans,workoutHistoryHtml,foodHistoryHtml} from '../history-view.js';

test('uncompleted plans stay on top and most recently completed plan moves to the bottom',()=>{
 const plans=[{id:'a',name:'Workout A'},{id:'b',name:'Workout B'},{id:'c',name:'Workout C'},{id:'d',name:'Workout D'}];
 const completed=[{templateId:'a',name:'Workout A',endedAt:1000},{templateId:'c',name:'Workout C',endedAt:2000}];
 assert.deepEqual(orderedWorkoutPlans(plans,completed).map(p=>p.id),['b','d','a','c']);
 completed.push({templateId:'a',name:'Workout A',endedAt:3000});
 assert.deepEqual(orderedWorkoutPlans(plans,completed).map(p=>p.id),['b','d','c','a']);
 assert.deepEqual(plans.map(p=>p.id),['a','b','c','d'],'saved plan order must remain untouched');
});
test('legacy workout history without plan id is matched only for uniquely named plans',()=>{
 const plans=[{id:'a',name:'Alpha'},{id:'b',name:'Beta'},{id:'c',name:'Beta'}];
 const history=[{name:'Alpha',endedAt:1000},{name:'Beta',endedAt:2000}];
 assert.deepEqual(orderedWorkoutPlans(plans,history).map(p=>p.id),['b','c','a']);
});
test('workout history shows all records, newest first, and expanded completed sets',()=>{
 const history=[
 {id:'a',name:'Older leg day',date:'2026-10-21',endedAt:10,sets:1,durationMin:42,volume:1500,exercises:[{name:'Leg Press',sets:[{kg:100,reps:15,done:true},{kg:100,reps:15,done:false}]}]},
 {id:'b',name:'Newer push day',date:'2026-10-24',endedAt:20,sets:2,durationMin:51,volume:1700,exercises:[{name:'Bench Press',sets:[{kg:30,reps:10,done:true}]}]}
 ];
 const original=JSON.stringify(history);
 const html=workoutHistoryHtml(history);
 assert.ok(html.indexOf('Newer push day')<html.indexOf('Older leg day'));
 assert.match(html,/100 kg · 15 reps/);
 assert.doesNotMatch(html,/100 kg · 15 reps.*100 kg · 15 reps/);
 assert.match(html,/Back to workout plans/);
 assert.equal(JSON.stringify(history),original,'never mutate stored history');
});
test('food history groups all days in descending order and preserves meal entries',()=>{
 const foods=[{date:'2026-10-23',meal:'Dinner',name:'Tofu',calories:330,protein:30},{date:'2026-10-24',meal:'Breakfast',name:'Oats',calories:500,protein:21},{date:'2026-10-23',meal:'Lunch',name:'Rice',calories:270,protein:5}];
 const html=foodHistoryHtml(foods);
 assert.ok(html.indexOf('24 Oct 2026')<html.indexOf('23 Oct 2026'));
 assert.match(html,/600 kcal/);
 assert.match(html,/35 g/);
 assert.match(html,/Back to food diary/);
 assert.match(html,/Breakfast/);
 assert.match(html,/Dinner/);
 assert.equal(foodHistoryHtml([]).includes('No food entries yet'),true);
});
test('history shortcut sits beside both Plan and Food and completed sessions retain template ID',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.ok(app.includes('food-fab-cluster history-action-cluster'));
 assert.ok(app.includes('plan-fab-cluster history-action-cluster'));
 assert.match(app,/case 'toggle-history'/);
 assert.match(app,/case 'view-workout-history'/);
 assert.ok(app.includes('orderedWorkoutPlans(state.templates,state.workoutHistory).map('));
 assert.ok(app.includes('templateId:s.templateId'));
 assert.ok(app.includes('templateId:prior.templateId'));
 assert.match(html,/history-shortcuts\.css\?v=2\.9\.4-history-shortcuts/);
 assert.match(sw,/recomp-shell-v3\.0-personal-plan-preview/);
 assert.match(sw,/history-view\.js/);
});
