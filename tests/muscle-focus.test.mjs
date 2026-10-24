import test from 'node:test';
import assert from 'node:assert/strict';
import {muscleTargets,getWorkoutMuscles,renderMuscleFocus} from '../muscle-focus.js';
import {FTS_WORKOUTS} from '../fts-workouts.js';

test('maps compound leg and upper-body exercises to appropriate muscle groups',()=>{
 assert.deepEqual(muscleTargets('Leg Press')?.primary,['quads','glutes']);
 assert.deepEqual(muscleTargets('Dumbbell Romanian Deadlift')?.primary,['hamstrings','glutes']);
 assert.deepEqual(muscleTargets('Bench Press')?.primary,['chest']);
 assert.deepEqual(muscleTargets('Lat Pull Down')?.primary,['lats']);
 assert.equal(muscleTargets('Unknown invented exercise'),null);
});

test('maps live FTS Leg Day template into quadriceps, hamstrings, glutes, calves and core',()=>{
 const workout=FTS_WORKOUTS.find(w=>w.id==='fts-workout-1');
 assert.ok(workout);
 const exercises=workout.items.map(item=>({name:item[1],sets:Array.from({length:item[2]},()=>({}))}));
 const {muscles,unknown}=getWorkoutMuscles(exercises);
 const ids=new Set(muscles.map(m=>m.id));
 for(const id of ['quads','hamstrings','glutes','calves','core'])assert.ok(ids.has(id),id+' absent');
 assert.deepEqual(unknown,[]);
 const html=renderMuscleFocus(exercises);
 assert.match(html,/MUSCLE FOCUS/);
 assert.match(html,/Quadriceps/);
 assert.match(html,/Hamstrings/);
 assert.match(html,/aria-label="Front body muscle map"/);
 assert.match(html,/aria-label="Back body muscle map"/);
});

test('empty and unknown plans do not invent mapped muscles',()=>{
 assert.deepEqual(getWorkoutMuscles([]).muscles,[]);
 const content=renderMuscleFocus([{name:'Totally unknown workout',sets:[{}]}]);
 assert.match(content,/No recognised strength exercises yet/);
 assert.match(content,/Some exercises could not be matched/);
 assert.doesNotMatch(content,/Totally unknown workout/);
});
