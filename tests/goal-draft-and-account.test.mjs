import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const goals=await import('data:text/javascript;base64,'+Buffer.from(read('goal-draft.js')).toString('base64'));
const clerk=await import('data:text/javascript;base64,'+Buffer.from(read('clerk-auth.js')).toString('base64'));
const app=read('app.js');

test('incomplete goal inputs remain drafts and cannot replace saved targets',()=>{
 const values={calories:'',protein:'150',carbs:'250',fat:'65',fibre:'30',water:'2500',steps:'8000'};
 const form={elements:{namedItem:key=>({value:values[key]})}};
 assert.equal(goals.readGoalDraft(form).calories,'');
 assert.throws(()=>goals.validateGoalDraft(goals.readGoalDraft(form)),/No target was changed/);
 values.calories='2100';
 assert.deepEqual(goals.validateGoalDraft(goals.readGoalDraft(form)),{
  calories:2100,protein:150,carbs:250,fat:65,fibre:30,water:2500,steps:8000
 });
 assert.match(app,/goalDraft\?\.\[k\] \?\? state\.goals\[k\]/);
 assert.match(app,/goalDraft=readGoalDraft\(event\.target\.form\)/);
 assert.match(app,/validateGoalDraft\(readGoalDraft\(form\)\)/);
});
test('blank, negative and invalid numeric targets are not silently coerced to zero',()=>{
 const values={calories:'2200',protein:'150',carbs:'250',fat:'65',fibre:'30',water:'2500',steps:'8000'};
 for(const bad of ['', '-1','1.5','oops','999999999'])assert.throws(()=>goals.validateGoalDraft({...values,calories:bad}));
});
test('Clerk account display uses Google name without changing guest behaviour',()=>{
 const previous=globalThis.window;
 try{
  globalThis.window={Clerk:{user:null}};
  assert.equal(clerk.getClerkAccount(),null);
  globalThis.window={Clerk:{user:{
   id:'user_123',firstName:'Alex',lastName:'Taylor',fullName:'Alex Taylor',
   primaryEmailAddress:{emailAddress:'alex@example.com'}
  }}};
  assert.deepEqual(clerk.getClerkAccount(),{
   id:'user_123',email:'alex@example.com',firstName:'Alex',lastName:'Taylor',name:'Alex Taylor'
  });
  assert.match(app,/Signed in as /);
  assert.match(app,/viewerName=account\?\.firstName/);
 }finally{
  if(previous===undefined)delete globalThis.window;
  else globalThis.window=previous;
 }
});
