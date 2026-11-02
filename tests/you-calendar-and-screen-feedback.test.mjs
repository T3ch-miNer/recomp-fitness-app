import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthGrid,shiftMonth,dayOverview,dayMarks,cleanNote,renderCalendar,renderDayDetail,NOTE_LIMIT} from '../you-calendar.js';

globalThis.localStorage??={getItem:()=>null,setItem(){}};
const {screenTimeFeedback,recentScreenMinutes}=await import('../you-page.js');
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('month grid starts on Monday and pads to whole weeks',()=>{
 const weeks=monthGrid('2026-11');
 assert.equal(weeks[0].length,7);
 assert.equal(weeks[0].indexOf('2026-11-01'),6,'1 November 2026 is a Sunday');
 assert.ok(weeks.flat().includes('2026-11-30'));
 assert.equal(weeks.flat().filter(Boolean).length,30);
 assert.equal(shiftMonth('2026-01',-1),'2025-12');
 assert.equal(shiftMonth('2026-12',1),'2027-01');
});

const records={
 workoutHistory:[{date:'2026-11-02',name:'Foundation A',durationMin:44,sets:12}],
 food:[{date:'2026-11-02',calories:600.4,protein:40},{date:'2026-11-02',calories:900,protein:55.6},{date:'2026-11-01',calories:300,protein:10}],
 activity:[{date:'2026-11-02',steps:8450}],
 weights:[{date:'2026-11-02',kg:72.8},{date:'2026-11-02',kg:72.4}],
 photos:[{id:'p1',date:'2026-11-02',view:'front'}],
 dayNotes:{'2026-11-02':{text:'Slept well, strong session.',mood:'great'}},
 device:{'2026-11-02':{screenMinutes:205,unlocks:64}},
 habits:[{id:'a'},{id:'b'}],checks:{'2026-11-02':{a:true}}
};

test('day overview pulls every record for that date and nothing else',()=>{
 const o=dayOverview('2026-11-02',records);
 assert.deepEqual(o.workouts,[{name:'Foundation A',durationMin:44,sets:12}]);
 assert.equal(o.kcal,1500);assert.equal(o.protein,96);assert.equal(o.meals,2);
 assert.equal(o.steps,8450);
 assert.equal(o.weight,72.4,'latest weigh-in that day');
 assert.equal(o.photos.length,1);
 assert.deepEqual(o.note,{text:'Slept well, strong session.',mood:'great'});
 assert.equal(o.screenMinutes,205);assert.equal(o.unlocks,64);
 assert.equal(o.habitsDone,1);assert.equal(o.habitsTotal,2);
 assert.deepEqual(dayMarks(o),{workout:true,weight:true,photo:true,note:true});
 assert.deepEqual(dayMarks(dayOverview('2026-10-15',records)),{workout:false,weight:false,photo:false,note:false});
});

test('notes are trimmed, capped and only accept known moods',()=>{
 assert.deepEqual(cleanNote({text:'  hi  ',mood:'great'}),{text:'hi',mood:'great'});
 assert.equal(cleanNote({text:'x'.repeat(NOTE_LIMIT+50)}).text.length,NOTE_LIMIT);
 assert.equal(cleanNote({text:'ok',mood:'ecstatic'}).mood,null);
});

test('calendar marks days, disables the future and the next month from today',()=>{
 const html=renderCalendar({month:'2026-11',selected:'2026-11-02',today:'2026-11-02',marksFor:d=>dayMarks(dayOverview(d,records))});
 assert.match(html,/data-date="2026-11-02"[^>]*aria-pressed="true"/);
 assert.match(html,/data-date="2026-11-03" disabled/);
 assert.match(html,/data-action="you-cal-next" aria-label="Next month" disabled/);
 assert.match(html,/you-cal-dot workout/);
 assert.match(html,/Monday 2 November: Workout, Weight, Photo, Note/);
});

test('day overview shows the note form, moods, photo and quick actions for today',()=>{
 const o=dayOverview('2026-11-02',records);
 const html=renderDayDetail(o,{today:'2026-11-02',photoUrlFor:()=>'blob:photo'});
 assert.match(html,/Foundation A · 44 min · 12 sets/);
 assert.match(html,/1,500 kcal · 96 g protein/);
 assert.match(html,/3h 25m · 64 unlocks/);
 assert.match(html,/72\.4 kg/);
 assert.match(html,/<img src="blob:photo"/);
 assert.match(html,/id="you-day-note-form" class="you-day-note" data-date="2026-11-02"/);
 assert.match(html,/value="great" checked/);
 assert.match(html,/Update note/);
 const empty=renderDayDetail(dayOverview('2026-11-03',records),{today:'2026-11-03'});
 assert.match(empty,/Rest day/);assert.match(empty,/data-action="add-weight"/);assert.match(empty,/data-action="add-photo"/);
 assert.doesNotMatch(renderDayDetail(dayOverview('2026-10-15',records),{today:'2026-11-02'}),/data-action="add-weight"/,'no quick logging for past days');
});

test('screen-time feedback moves from balanced to heavy and compares with the recent average',()=>{
 assert.equal(screenTimeFeedback({minutes:90}).level,'good');
 assert.equal(screenTimeFeedback({minutes:200}).level,'okay');
 assert.equal(screenTimeFeedback({minutes:300}).level,'high');
 assert.equal(screenTimeFeedback({minutes:420}).level,'heavy');
 assert.match(screenTimeFeedback({minutes:90,partial:true}).message,/so far/);
 assert.equal(screenTimeFeedback({minutes:300,recent:[200,210,190],partial:true}).trend,'','no average comparison mid-day');
 assert.match(screenTimeFeedback({minutes:300,recent:[200,210,190]}).trend,/more than your recent average/);
 assert.match(screenTimeFeedback({minutes:120,recent:[200,210,190]}).trend,/less than your recent average.*Nice work/);
 assert.match(screenTimeFeedback({minutes:200,unlocks:140}).checks,/140 times/);
 assert.equal(screenTimeFeedback({minutes:NaN}),null);
 assert.deepEqual(recentScreenMinutes({'2026-11-01':{screenMinutes:100},'2026-10-30':{screenMinutes:50},'2026-11-02':{screenMinutes:999}},'2026-11-02'),[100,50]);
});

test('app saves notes in fitness records and keeps old saves working',()=>{
 const app=read('app.js');
 assert.match(app,/dayNotes:\{\},session:null/);
 assert.match(app,/if\(!state\.dayNotes\|\|typeof state\.dayNotes!=='object'\|\|Array\.isArray\(state\.dayNotes\)\)state\.dayNotes=\{\}/);
 assert.match(app,/if\(id==='you-day-note-form'\)/);
 assert.match(app,/case 'you-cal-day'/);
 assert.match(app,/refreshWellbeingQuietly/);
 assert.ok(read('sw.js').includes("'./you-calendar.js'"));
});

test('Workouts shows a minimised session once, and Android paints the status bar band',()=>{
 const app=read('app.js'),native=read('android-safe-area.css');
 assert.match(app,/\$\{state\.session&&!active&&!\(tab==='workouts'&&!historyPanel\)\?`<div class="floating-workout"/);
 assert.doesNotMatch(app,/Another plan requires your choice/);
 assert.match(app,/'Continue workout':'Start workout'/);
 assert.match(native,/html\.recomp-native body::before\{/);
 assert.match(native,/html\.recomp-native #recomp-bottom-dock\.bottom-nav\.premium-dock\{\s*-webkit-backdrop-filter:none!important/);
});
