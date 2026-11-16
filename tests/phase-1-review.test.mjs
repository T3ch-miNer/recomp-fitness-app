import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('app.js'),welcome=read('first-run.js'),mode=read('fitness-mode.js'),welcomeCss=read('first-run.css');

test('Body shows a friendly empty state for any part with no entries yet',async()=>{
 const {measurementsPanel}=await import('../body-progress.js');
 const empty=measurementsPanel({part:'belly',weights:[],measurements:[]});
 assert.match(empty,/No belly button measurements yet/);
 assert.match(empty,/data-action="add-measurement">Add measurements/);
 assert.match(measurementsPanel({part:'weight'}),/data-action="add-weight">Log weight/);
});

test('welcome puts the guest route first and drops developer wording',()=>{
 assert.ok(welcome.indexOf('data-first-run="guest"')<welcome.indexOf('data-first-run="google"'));
 const markup=welcome.slice(welcome.indexOf('overlay.innerHTML='),welcome.indexOf('</section>'));
 assert.doesNotMatch(markup,/Clerk|Cloud backup is a separate feature|Development mode/);
 assert.match(welcome,/const first=guest,last=google\.disabled\?guest:google;/);
 assert.doesNotMatch(mode,/GPT service|Copy a GPT prompt/);
 assert.doesNotMatch(welcomeCss,/#bea5fc|#a58ae9|#d6c0ff/,'welcome uses the mint brand palette');
});
