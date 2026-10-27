import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldAskForDailyTasks,dailyTaskRecord,makeTodaysTasks,dailyTaskPromptHtml,DAILY_TASK_MAX,DAILY_TASK_SNOOZE_MS} from '../daily-task-prompt.js';
const file=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('only first open each local day prompts, and next date prompts again',()=>{
 const date='2026-10-26',tomorrow='2026-10-27';
 assert.equal(shouldAskForDailyTasks(null,date,100),true);
 assert.equal(shouldAskForDailyTasks(dailyTaskRecord(date,'planned',100),date,200),false);
 assert.equal(shouldAskForDailyTasks(dailyTaskRecord(date,'skipped',100),date,200),false);
 assert.equal(shouldAskForDailyTasks(dailyTaskRecord(date,'planned',100),tomorrow,200),true);
 assert.equal(shouldAskForDailyTasks(dailyTaskRecord(date,'skipped',100),tomorrow,200),true);
});
test('snooze persists one hour and manual reopen remains available',()=>{
 const now=1234567890,record=dailyTaskRecord('2026-10-26','snoozed',now);
 assert.equal(record.snoozedUntil,now+60*60*1000);
 assert.equal(DAILY_TASK_SNOOZE_MS,3600000);
 assert.equal(shouldAskForDailyTasks(record,'2026-10-26',now+3599999),false);
 assert.equal(shouldAskForDailyTasks(record,'2026-10-26',now+3600000),true);
 assert.equal(shouldAskForDailyTasks(record,'2026-10-27',now+50),true);
});
test('today-only task records do not enter recurring routine or another date',()=>{
 let seq=0;
 const inputs=['  Walk 20 minutes  ','',' Stretch ','Lunch prep'];
 const out=makeTodaysTasks(inputs,'2026-10-26',()=>String(++seq));
 assert.deepEqual(out.map(t=>t.label),['Walk 20 minutes','Stretch','Lunch prep']);
 assert.ok(out.every(t=>t.date==='2026-10-26'&&t.auto===null&&t.id));
 assert.deepEqual(inputs,['  Walk 20 minutes  ','',' Stretch ','Lunch prep']);
 assert.throws(()=>makeTodaysTasks(Array(DAILY_TASK_MAX+1).fill('a'),'2026-10-26',()=>''),/up to/);
 assert.throws(()=>makeTodaysTasks(['X'.repeat(101)],'2026-10-26',()=>''),/100/);
});
test('planner has task inputs, snooze, skip and accessible form',()=>{
 const html=dailyTaskPromptHtml('2026-10-26');
 assert.match(html,/What's on your list today\?/);
 assert.match(html,/data-daily-task="snooze"/);
 assert.match(html,/Snooze 1 hour/);
 assert.match(html,/data-daily-task="skip"/);
 assert.match(html,/Plan today/);
 assert.match(html,/id="recomp-daily-task-form"/);
 assert.match(html,/aria-modal="true"/);
 assert.match(html,/type="submit"/);
 assert.match(html,/date|Monday/i);
});
test('dashboard merges today-only tasks with recurring routine, allows edit & delete',()=>{
 const app=file('../app.js');
 assert.match(app,/function todaysTasks\(\)\{return \[\.\.\.state\.tasks,\.\.\.\(state\.dailyTasks\|\|\[\]\)\.filter\(t=>t\.date===today\(\)\)\];\}/);
 assert.match(app,/return tasks\.map\(t=>\{/);
 assert.match(app,/state\.dailyTasks=state\.dailyTasks\.filter\(x=>x\.id!==t\.id\)/);
 assert.match(app,/case 'plan-today':maybeShowDailyTaskPrompt\(true\)/);
 assert.match(app,/data-action="plan-today"/);
 assert.match(app,/dailyTasks:\[\],dailyTaskPlanning:null/);
 assert.match(app,/if\(!Array\.isArray\(state\.dailyTasks\)\)state\.dailyTasks=\[\]/);
 assert.match(app,/document\.addEventListener\('visibilitychange'/);
});
test('first-run questionnaire takes precedence, snooze and tasks persist',()=>{
 const app=file('../app.js');
 assert.match(app,/document\.getElementById\('recomp-targets-setup'\)/);
 assert.match(app,/state\?\.dailyTargetsOnboarded!==true/);
 assert.match(app,/state\.dailyTaskPlanning=dailyTaskRecord\(date,'snoozed'\)/);
 assert.match(app,/state\.dailyTaskPlanning=dailyTaskRecord\(date,'planned'\)/);
 assert.match(app,/state\.dailyTasks\.push\(\.\.\.added\)/);
 assert.match(app,/await persist\(\);render\(\)/);
 assert.match(app,/setTimeout\(\(\)=>maybeShowDailyTaskPrompt\(\),0\)/);
});
test('offline release includes date-specific daily planner module and stylesheet',()=>{
 const html=file('../index.html'),sw=file('../sw.js');
 assert.ok(html.includes('daily-task-prompt.css?v=2.9.8-daily-tasks'));
 assert.ok(html.includes('app.js?v=2.10-online-catalogue-preview'));
 assert.match(sw,/recomp-shell-v3\.0-personal-plan-preview/);
 assert.ok(sw.includes("'./daily-task-prompt.js'"));
 assert.ok(sw.includes("'./daily-task-prompt.css'"));
});
