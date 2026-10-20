import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const diary=await import('data:text/javascript;base64,'+Buffer.from(read('food-diary.js')).toString('base64'));
const app=read('app.js'),nutrition=read('nutrition-v2.js'),css=read('food-diary.css');
const ai={id:'ai-1',date:'2026-10-17',meal:'Dinner',name:'Chicken rice bowl',grams:480,
 calories:720,protein:42,carbs:78,fat:24,fibre:7,aiEstimate:true,
 aiModel:'test-image-model',aiCalorieRange:{low:580,high:950},source:'AI photo estimate',foodSource:'recomp-estimate-v1'};
const barcode={id:'barcode-1',date:'2026-10-18',meal:'Lunch',name:'German yoghurt',grams:200,
 calories:180,protein:20,carbs:16,fat:4,fibre:0,barcode:'1234567890123',foodSource:'openfoodfacts'};
const meal={id:'manual-1',date:'2026-10-18',meal:'Breakfast',name:'Overnight oats',
 calories:380,protein:19,carbs:51,fat:11,fibre:8,source:'manual'};

test('historical totals and date navigation never rewrite original diary records',()=>{
 const records=[ai,barcode,meal];const before=structuredClone(records);
 assert.deepEqual(diary.diaryTotals(records,'2026-10-18'),{calories:560,protein:39,carbs:67,fat:15,fibre:8});
 assert.equal(diary.diaryTotals(records,'2026-10-16').calories,0);
 assert.equal(diary.shiftDiaryDate('2026-10-20',-1),'2026-10-19');
 assert.equal(diary.shiftDiaryDate('2026-10-01',-1),'2026-09-30');
 assert.equal(diary.shiftDiaryDate('2026-12-31',1),'2027-01-01');
 assert.equal(diary.validDiaryDate('2026-02-30'),false);
 assert.equal(diary.validDiaryDate('2026-02-28'),true);
 assert.deepEqual(records,before);
});
test('edited portion recalculates macros but retains AI source and entry identity',()=>{
 const original=structuredClone(ai);
 const scaled=diary.scaledDiaryMacros(ai,240);
 assert.deepEqual(scaled,{calories:360,protein:21,carbs:39,fat:12,fibre:3.5});
 const edited=diary.updateDiaryEntry(ai,{name:'Chicken rice bowl',date:'2026-10-17',
   meal:'Lunch',grams:'240',...Object.fromEntries(Object.entries(scaled).map(([k,v])=>[k,String(v)]))});
 assert.equal(edited.id,ai.id);
 assert.equal(edited.aiEstimate,true);
 assert.equal(edited.aiModel,ai.aiModel);
 assert.equal(edited.aiCalorieRange,null);
 assert.equal(edited.nutritionEdited,true);
 assert.equal(edited.meal,'Lunch');
 assert.deepEqual(ai,original,'editing must not mutate any saved object in place');
});
test('manual and barcode values can be edited without inventing a serving weight',()=>{
 const b=diary.updateDiaryEntry(barcode,{name:'German yoghurt',date:'2026-10-18',meal:'Snack',
  grams:'200',calories:'180',protein:'20',carbs:'16',fat:'4',fibre:'0'});
 assert.equal(b.barcode,barcode.barcode);
 assert.equal(b.nutritionEdited,undefined);
 const m=diary.updateDiaryEntry(meal,{name:'Overnight oats',date:'2026-10-18',meal:'Breakfast',
  grams:'',calories:'400',protein:'19',carbs:'55',fat:'11',fibre:'8'});
 assert.ok(!Object.hasOwn(m,'grams'));
 assert.equal(m.source,'manual');
 assert.equal(m.nutritionEdited,true);
 assert.throws(()=>diary.scaledDiaryMacros(meal,180),/portion/);
});
test('bad dates, blank numbers and extreme portions never overwrite records',()=>{
 const normal={name:ai.name,date:ai.date,meal:ai.meal,grams:'240',
  calories:'360',protein:'21',carbs:'39',fat:'12',fibre:'3.5'};
 for(const changes of [{date:'2026-02-30'},{meal:'Brunch'},{calories:''},{protein:'-5'},{grams:'99999'}]){
  assert.throws(()=>diary.updateDiaryEntry(ai,{...normal,...changes}));
 }
 assert.throws(()=>diary.scaledDiaryMacros(ai,0),/portion/);
 assert.throws(()=>diary.shiftDiaryDate('bad',1));
});
test('quick repeat adds a new unique record without changing earlier entries',()=>{
 const original=structuredClone(ai);
 const duplicate=diary.repeatDiaryEntry(ai,{id:'unique-new-id',date:'2026-10-20',meal:'Dinner'});
 assert.equal(duplicate.id,'unique-new-id');
 assert.equal(duplicate.date,'2026-10-20');
 assert.equal(duplicate.aiEstimate,true);
 assert.equal(duplicate.calories,ai.calories);
 assert.deepEqual(ai,original);
 assert.throws(()=>diary.repeatDiaryEntry(ai,{id:'',date:'2026-10-20',meal:'Dinner'}));
});
test('v2.8 UI exposes date history, editing, repeat and safe portion confirmation',()=>{
 for(const token of ['id="food-diary-date"',"case 'diary-previous'","case 'diary-next'","case 'diary-today'",
  "case 'edit-food'","case 'repeat-food'","case 'recalculate-food'",
  "id==='form-edit-food'","nutritionPanel==='diary'?diaryDate:today()",
  'updateDiaryEntry(original,fields)','repeatDiaryEntry(x,','scaledDiaryMacros(original,grams)']){
  assert.ok(app.includes(token),token);
 }
 assert.match(nutrition,/date:requestedDate/);
 assert.match(css,/\.diary-date-controls/);
 assert.match(css,/@media\(max-width:520px\)/);
});
