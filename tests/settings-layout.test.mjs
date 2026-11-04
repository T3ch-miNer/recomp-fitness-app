import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CACHE,APP_SCRIPT} from './release.mjs';
import {reminderSummary,renderReminderSettings} from '../reminders.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('app.js'),css=read('settings-layout.css'),htmlPage=read('index.html'),sw=read('sw.js');
const begin=app.indexOf('function settingsSectionHeading('),end=app.indexOf('const REST_CIRC=',begin);
assert.ok(begin>=0&&end>begin,'Settings component exists');
const getView=new Function(
 'state','heading','svg','cloud','getClerkAccount','isClerkLoginAvailable',
 'isClerkDevelopmentMode','getClerkKey','escapeHtml','themeChoice',
 'nativeHealthAvailable','localStorage','dateDisplay','goalDraft','settingsCloudOpen','onlineStatus','onlineCatalog','onlineError','onlineBusy','clerkSignInError','clerkSignInBusy',
 'reminderSummary','renderReminderSettings','nativeRemindersAvailable','exactAlarm','num',
 app.slice(begin,end)+'\nreturn {settingsView,setPage:p=>{settingsPage=p;},pages:SETTINGS_PAGES};'
);
function build({signedIn=true,draft=null,advanced=false}={}){
 const goals={calories:2200,protein:150,carbs:250,fat:65,fibre:30,water:2500,steps:8000};
 const state={goals,tasks:[{id:'walk',label:'Walk today',auto:'steps'}],preferences:{},lastSync:null};
 const client=getView(
 state,()=>'<header>Settings</header>',()=>'<svg></svg>',
 {getConfig:()=>null,getSession:()=>null},
 ()=>signedIn?{name:'Alex Taylor',email:'alex@example.com'}:null,
 ()=>true,()=>false,()=>true,
 s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 ()=>'system',()=>false,{getItem:()=>null},()=>'',draft,advanced,'Connected',{foods:[],workouts:[],exercises:[]},'',false,'',false,
 reminderSummary,renderReminderSettings,()=>false,'granted',x=>Math.round(Number(x)||0).toLocaleString('en-GB')
 );
 return client;
}
// The menu, or one page of it.
function view(opts={},page=null){const c=build(opts);c.setPage(page);return c.settingsView();}
// Every page together, to check nothing was lost in the split.
function allPages(opts={}){const c=build(opts);return c.pages.map(p=>{c.setPage(p.id);return c.settingsView();}).join('');}
test('settings opens as a menu that links to one page per group',()=>{
 const menu=view();
 const ids=['account','targets','reminders','routine','appearance','data'];
 let last=-1;
 for(const id of ids){
  const at=menu.indexOf('data-page="'+id+'"');
  assert.ok(at>last,id+' row in order');last=at;
 }
 assert.match(menu,/2,200 kcal · 150 g protein · 8,000 steps/);
 assert.match(menu,/No reminders on/);
 assert.match(menu,/Alex Taylor/);
 assert.doesNotMatch(menu,/id="settings-goals"/,'forms live on their own pages');
 const targets=view({},'targets');
 assert.match(targets,/data-action="settings-menu"/);
 assert.match(targets,/id="settings-goals"/);
 assert.doesNotMatch(targets,/id="settings-data"/);
});
test('cloud backup stays folded away on the Data & backup page',()=>{
 const data=view({},'data');
 assert.match(data,/Advanced cloud backup/);
 assert.match(data,/id="settings-cloud-details"/);
 assert.doesNotMatch(data,/<details[^>]*id="settings-cloud-details" open/);
 assert.match(view({advanced:true},'data'),/id="settings-cloud-details" open/);
});
test('all important existing settings and actions are retained',()=>{
 const body=allPages({signedIn:true});
 for(const id of ['settings-goals','goal-calories','goal-protein','goal-water','appearance-mode','enable-haptics','enable-water-sound','enable-app-sounds','import-file']){
  assert.ok(body.includes('id="'+id+'"'),id);
 }
 for(const action of ['clerk-signout','add-task','edit-task','delete-task','activity','configure-cloud','export-backup','import-backup','notification-permission','test-water-sound']){
  assert.ok(body.includes('data-action="'+action+'"'),action);
 }
 assert.match(body,/Alex Taylor/);
 assert.match(body,/alex@example.com/);
 assert.match(view({signedIn:false},'account'),/Guest mode/);
 const draftView=view({draft:{calories:'',protein:'165'}},'targets');
 assert.match(draftView,/id="goal-calories"[^>]*value=""/);
 assert.match(draftView,/id="goal-protein"[^>]*value="165"/);
});
test('responsive stylesheet is loaded and cached with the same release',()=>{
 assert.match(css,/\.settings-targets-card \.field-row/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.settings-advanced-summary:focus-visible/);
 assert.match(htmlPage,/settings-layout\.css\?v=3\.6/);
 assert.match(css,/\.settings-menu-row\{/);
 assert.match(sw,/settings-layout\.css/);
 assert.ok(sw.includes(CACHE));
});
