import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('app.js'),css=read('settings-layout.css'),htmlPage=read('index.html'),sw=read('sw.js');
const begin=app.indexOf('function settingsSectionHeading('),end=app.indexOf('const REST_CIRC=',begin);
assert.ok(begin>=0&&end>begin,'Settings component exists');
const getView=new Function(
 'state','heading','svg','cloud','getClerkAccount','isClerkLoginAvailable',
 'isClerkDevelopmentMode','getClerkKey','escapeHtml','themeChoice',
 'nativeHealthAvailable','localStorage','dateDisplay','goalDraft','settingsCloudOpen',
 app.slice(begin,end)+'\nreturn settingsView;'
);
function view({signedIn=true,draft=null,advanced=false}={}){
 const goals={calories:2200,protein:150,carbs:250,fat:65,fibre:30,water:2500,steps:8000};
 const state={goals,tasks:[{id:'walk',label:'Walk today',auto:'steps'}],preferences:{},lastSync:null};
 const client=getView(
 state,()=>'<header>Settings</header>',()=>'<svg></svg>',
 {getConfig:()=>null,getSession:()=>null},
 ()=>signedIn?{name:'Alex Taylor',email:'alex@example.com'}:null,
 ()=>true,()=>false,()=>true,
 s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 ()=>'system',()=>false,{getItem:()=>null},()=>'',draft,advanced
 );
 return client();
}
test('settings groups have clear hierarchy and matching jump navigation',()=>{
 const body=view();
 const ids=['account','targets','routine','appearance','data'];
 let last=-1;
 for(const id of ids){
  const needle='id="settings-'+id+'"';
  const index=body.indexOf(needle);
  assert.ok(index>last,needle+' is in the expected order');
  assert.equal(body.split(needle).length-1,1,'unique section '+id);
  assert.ok(body.includes('href="#settings-'+id+'"'),'shortcut navigates to '+id);
  last=index;
 }
 assert.match(body,/Advanced cloud backup/);
 assert.match(body,/id="settings-cloud-details"/);
 assert.doesNotMatch(body,/<details[^>]*id="settings-cloud-details" open/);
 assert.match(view({advanced:true}),/id="settings-cloud-details" open/);
});
test('all important existing settings and actions are retained',()=>{
 const body=view({signedIn:true});
 for(const id of ['settings-goals','goal-calories','goal-protein','goal-water','appearance-mode','enable-haptics','enable-water-sound','enable-app-sounds','import-file']){
  assert.ok(body.includes('id="'+id+'"'),id);
 }
 for(const action of ['clerk-signout','add-task','edit-task','delete-task','activity','configure-cloud','export-backup','import-backup','notification-permission','test-water-sound']){
  assert.ok(body.includes('data-action="'+action+'"'),action);
 }
 assert.match(body,/Alex Taylor/);
 assert.match(body,/alex@example.com/);
 assert.match(view({signedIn:false}),/Guest mode/);
 const draftView=view({draft:{calories:'',protein:'165'}});
 assert.match(draftView,/id="goal-calories"[^>]*value=""/);
 assert.match(draftView,/id="goal-protein"[^>]*value="165"/);
});
test('responsive stylesheet is loaded and cached with the same release',()=>{
 assert.match(css,/\.settings-targets-card \.field-row/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.settings-advanced-summary:focus-visible/);
 assert.match(htmlPage,/settings-layout\.css\?v=2\.7-settings-hub/);
 assert.match(sw,/settings-layout\.css/);
 assert.match(sw,/recomp-shell-v2\.8\.9-add-plan-fab/);
});
