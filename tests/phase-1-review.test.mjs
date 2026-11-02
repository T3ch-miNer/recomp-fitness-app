import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('app.js'),welcome=read('first-run.js'),mode=read('fitness-mode.js'),welcomeCss=read('first-run.css');

test('Body shows one friendly empty state until the first measurements are saved',()=>{
 assert.match(app,/bodyPanel==='measurements'\?\(!baseline\?`<div class="card body-empty-state">/);
 assert.match(app,/Add first measurements<\/button>/);
 assert.match(app,/data-action="add-measurement">\$\{svg\('plus','tiny-icon'\)\} Add first measurements/);
 assert.match(app,/Not recorded/,'saved measurements keep the full table');
});

test('welcome puts the guest route first and drops developer wording',()=>{
 assert.ok(welcome.indexOf('data-first-run="guest"')<welcome.indexOf('data-first-run="google"'));
 const markup=welcome.slice(welcome.indexOf('overlay.innerHTML='),welcome.indexOf('</section>'));
 assert.doesNotMatch(markup,/Clerk|Cloud backup is a separate feature|Development mode/);
 assert.match(welcome,/const first=guest,last=google\.disabled\?guest:google;/);
 assert.doesNotMatch(mode,/GPT service|Copy a GPT prompt/);
 assert.doesNotMatch(welcomeCss,/#bea5fc|#a58ae9|#d6c0ff/,'welcome uses the mint brand palette');
});
