import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seriesFor,toDisplay,toStored,measurementsPanel,measureWizard,measurementFromWizard,photoDays,compareRows,photosPanel,MEASURES} from '../body-progress.js';
import {moodSeries,workoutWeeks,weekStreak,screenWeek,weeklyInsight,weekStart} from '../you-insights.js';
import {nextBackStep} from '../back-navigation.js';

const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
const app=read('app.js');
const measurements=[
 {id:'m1',date:'2026-10-06',belly:36.2,chest:39.8},
 {id:'m2',date:'2026-10-20',belly:35.4,chest:''},
 {id:'m3',date:'2026-10-20',belly:35.0,chest:39.2}
];
const weights=[{id:'w1',date:'2026-10-06',kg:76.2},{id:'w2',date:'2026-10-20',kg:74.9}];

test('measurements stay stored in inches and show in either unit',()=>{
 assert.equal(toDisplay(35,'cm'),88.9);
 assert.equal(toDisplay(35,'in'),35);
 assert.equal(toStored(88.9,'cm'),35);
 assert.equal(toDisplay(toStored(86,'cm'),'cm'),86,'cm survives the round trip');
});

test('trend series keeps one value per date, latest entry wins, blanks skipped',()=>{
 assert.deepEqual(seriesFor('belly',{measurements},'in').map(p=>[p.date,p.value]),[['2026-10-06',36.2],['2026-10-20',35]]);
 assert.deepEqual(seriesFor('chest',{measurements},'cm').map(p=>p.value),[101.1,99.6]);
 assert.deepEqual(seriesFor('weight',{weights}).map(p=>p.value),[76.2,74.9]);
});

test('measurement panel draws the graph, the change and one chip per part',()=>{
 const html=measurementsPanel({part:'belly',weights,measurements,unit:'cm'});
 assert.match(html,/Track what the scale misses/);
 assert.match(html,/<svg class="trend-svg"/);
 assert.match(html,/−3\.0 cm|−3 cm/);
 assert.equal((html.match(/data-action="body-part"/g)||[]).length,MEASURES.length+1,'weight plus every measurement');
 assert.match(html,/data-part="weight"/);
 assert.match(html,/data-action="clear-measure-value"/);
 assert.match(measurementsPanel({part:'weight',weights,measurements}),/data-action="delete-weight"/);
});

test('wizard shows one step at a time with a tape line, tabs and the last value',()=>{
 const html=measureWizard({i:1,values:{chest:'100'},unit:'cm',date:'2026-11-04',last:measurements[2]});
 assert.match(html,/STEP 2 OF 12/);
 assert.match(html,/<ellipse class="tape"/);
 assert.match(html,/Belly button in cm/);
 assert.match(html,/Last time: 88\.9 cm/);
 assert.match(html,/✓ Chest/,'filled steps are ticked');
 assert.match(html,/data-action="mw-go" data-step="11"/);
 assert.match(measureWizard({i:11,values:{},unit:'in',date:'2026-11-04'}),/data-action="mw-save" data-dir="1">Save measurements/);
});

test('wizard entry converts to inches, ignores blanks and silly numbers',()=>{
 const e=measurementFromWizard({chest:'101.6',belly:'',neck:'-3',wrist:'999'},'cm',{id:'x',date:'2026-11-04'});
 assert.equal(e.chest,40);
 assert.equal(e.belly,'');assert.equal(e.neck,'');assert.equal(e.wrist,'');
 assert.equal(measurementFromWizard({},'cm',{id:'y',date:'2026-11-04'}),null);
});

test('photo dates group by day; comparing lists weight and shared measurements',()=>{
 const photos=[{id:'a',date:'2026-10-06',view:'Back'},{id:'b',date:'2026-10-06',view:'Front'},{id:'c',date:'2026-10-20',view:'Front'}];
 const days=photoDays(photos);
 assert.deepEqual(days.map(d=>d.date),['2026-10-20','2026-10-06']);
 assert.deepEqual(days[1].photos.map(p=>p.view),['Front','Back']);
 const rows=compareRows('2026-10-20','2026-10-06',{weights,measurements},'in');
 assert.deepEqual(rows.map(r=>r.label),['Weight','Chest','Belly button']);
 assert.equal(rows[0].change,'−1.3 kg');
 const list=photosPanel({photos,weights,measurements,picked:['2026-10-06','2026-10-20']});
 assert.match(list,/data-action="photo-compare">Compare 6 Oct and 20 Oct/);
 const cmp=photosPanel({photos,weights,measurements,picked:['2026-10-06','2026-10-20'],comparing:true,showMeasures:true,urlFor:id=>'blob:'+id});
 assert.match(cmp,/<img src="blob:b"/);assert.match(cmp,/<img src="blob:c"/);
 assert.match(cmp,/Hide measurements/);
 assert.match(cmp,/class="cmp-change">−1\.3 kg/);
 assert.match(cmp,/data-action="delete-photo"/);
});

test('You insights: weeks start Monday, streak ignores an empty current week',()=>{
 assert.equal(weekStart('2026-11-04'),'2026-11-02');
 const history=[{date:'2026-10-20'},{date:'2026-10-27'},{date:'2026-10-29'}];
 assert.equal(weekStreak(history,'2026-11-04'),2);
 assert.deepEqual(workoutWeeks(history,'2026-11-04',3).map(w=>w.count),[1,2,0]);
 assert.equal(moodSeries({'2026-11-03':{mood:'good'}},'2026-11-04',2)[0].mood,'good');
 assert.equal(screenWeek({'2026-11-04':{screenMinutes:120}},'2026-11-04').at(-1).minutes,120);
});

test('weekly insight compares screen time on training and rest days, else stays honest',()=>{
 const device={'2026-11-01':{screenMinutes:300},'2026-11-02':{screenMinutes:180},'2026-11-03':{screenMinutes:320},'2026-10-31':{screenMinutes:170}};
 const history=[{date:'2026-11-02'},{date:'2026-10-31'}];
 assert.match(weeklyInsight({history,device,today:'2026-11-04'}),/screen time was 2h 15m lower/);
 assert.match(weeklyInsight({history:[],device:{},today:'2026-11-04'}),/insight appears here/);
});

test('Back closes the fan menu, photo compare and an open day before leaving the page',()=>{
 assert.equal(nextBackStep({tab:'body',fanOpen:true}),'close-fan');
 assert.equal(nextBackStep({tab:'body',photoComparing:true,previousPage:'home'}),'close-photo-compare');
 assert.equal(nextBackStep({tab:'you',dayOpen:true,previousPage:'home'}),'close-day');
});

test('app wiring: Body tabs, You layout, reminders prompt and caching',()=>{
 assert.doesNotMatch(app,/Weight history<\/button>/);
 assert.match(app,/if\(youDayOpen\)return renderDayDetail\(overview,\{[^}]*closable:true[^}]*\}\)/);
 assert.match(app,/function maybeShowReminderPrompt\(\)/);
 assert.match(app,/if\(!force&&maybeShowReminderPrompt\(\)\)return false;/);
 assert.match(app,/if\(id==='form-reminder-prompt'\)/);
 assert.match(app,/state\.reminderPromptSeen=true/);
 const sw=read('sw.js');
 for(const f of ['you-insights.js','body-progress.js','body-progress.css'])assert.ok(sw.includes("'./"+f+"'"),f);
 assert.match(read('index.html'),/body-progress\.css\?v=3\.6/);
});
