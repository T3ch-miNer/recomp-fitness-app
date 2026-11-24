import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewWeekEnd,shouldShowCheckin,checkinKey,weeklyCheckin,suggestionFor,renderCheckin} from '../weekly-checkin.js';

// 2026-11-22 is a Sunday, 2026-11-23 a Monday.
const SUN='2026-11-22',MON='2026-11-23',WED='2026-11-25';

test('the reviewed week ends on the latest Sunday',()=>{
 assert.equal(reviewWeekEnd(SUN),SUN);
 assert.equal(reviewWeekEnd(MON),SUN);
 assert.equal(reviewWeekEnd(WED),SUN);
 assert.equal(checkinKey(MON),checkinKey(SUN));
});

test('Today shows it on Sunday and Monday until dismissed',()=>{
 assert.equal(shouldShowCheckin(SUN,null),true);
 assert.equal(shouldShowCheckin(MON,null),true);
 assert.equal(shouldShowCheckin(WED,null),false);
 assert.equal(shouldShowCheckin(MON,checkinKey(SUN)),false,'dismissed on Sunday stays dismissed on Monday');
 assert.equal(shouldShowCheckin('2026-11-29',checkinKey(SUN)),true,'next week shows again');
});

const data={
 today:SUN,goal:'lose-fat',target:3,goals:{protein:150},
 weights:[{date:'2026-11-10',kg:80},{date:'2026-11-13',kg:79.6},{date:'2026-11-17',kg:79.2},{date:'2026-11-21',kg:79}],
 history:[{date:'2026-11-16'},{date:'2026-11-18'},{date:'2026-11-20'},{date:'2026-11-11'}],
 food:[{date:'2026-11-16',protein:100},{date:'2026-11-16',protein:50},{date:'2026-11-17',protein:140},{date:'2026-11-18',protein:90},{date:'2026-11-19',protein:160},{date:'2026-11-22',protein:155},{date:'2026-11-09',protein:200}],
 device:{'2026-11-16':{screenMinutes:200},'2026-11-17':{screenMinutes:220},'2026-11-10':{screenMinutes:150},'2026-11-11':{screenMinutes:170}}
};

test('figures cover Monday to Sunday against the week before',()=>{
 const c=weeklyCheckin(data);
 assert.equal(c.start,'2026-11-16');assert.equal(c.end,SUN);
 assert.deepEqual(c.weight,{now:79.1,prev:79.8,delta:-0.7,count:2});
 assert.deepEqual(c.workouts,{done:3,target:3,prev:1});
 assert.equal(c.protein.logged,5);
 assert.equal(c.protein.hit,4,'150, 140 (within 10%), 160 and 155 count; 90 does not');
 assert.deepEqual([c.screen.avg,c.screen.prev,c.screen.change],[210,160,31]);
});

test('suggestions follow training, logging, protein, weight, screen time',()=>{
 const base={weight:{delta:null},workouts:{done:3,target:3},protein:{logged:6,hit:5,goal:150},screen:{change:null,avg:null},goal:'lose-fat'};
 assert.equal(suggestionFor({...base,workouts:{done:1,target:3}}).kind,'training');
 assert.equal(suggestionFor({...base,protein:{logged:2,hit:2,goal:150}}).kind,'logging');
 assert.equal(suggestionFor({...base,protein:{logged:6,hit:2,goal:150}}).kind,'protein');
 assert.equal(suggestionFor({...base,weight:{delta:0.5}}).kind,'weight');
 assert.equal(suggestionFor({...base,weight:{delta:-0.5}}).kind,'keep','losing weight is fine for fat loss');
 assert.equal(suggestionFor({...base,goal:'build-muscle',weight:{delta:-0.5}}).kind,'weight');
 assert.equal(suggestionFor({...base,screen:{change:30,avg:200}}).kind,'screen');
 assert.equal(suggestionFor(base).kind,'keep');
});

test('a quiet week still renders without errors',()=>{
 const c=weeklyCheckin({today:MON});
 assert.equal(c.workouts.target,3,'defaults to three sessions');
 const html=renderCheckin(c);
 assert.match(html,/No weigh-ins/);assert.match(html,/Nothing logged/);assert.match(html,/No sessions this week/);
 assert.ok(!html.includes('data-action="dismiss-checkin"'),'the You page copy is not dismissible');
 assert.match(renderCheckin(c,{dismissible:true}),/data-action="dismiss-checkin"/);
});

test('weight change is coloured by goal',()=>{
 const c=weeklyCheckin(data);
 assert.match(renderCheckin(c,{goal:'lose-fat'}),/wc-good">↓ 0\.7 kg/);
 assert.match(renderCheckin(c,{goal:'build-muscle'}),/wc-warn">↓ 0\.7 kg/);
});

test('the app shows it on Today and the You page and can dismiss it',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/\$\{homeCheckinHtml\(\)\}\n<section class="summary-hero/);
 assert.match(app,/checkin:renderCheckin\(checkinData\(\),\{goal:userGoal\(\)\}\)/);
 assert.match(app,/case 'dismiss-checkin':state\.weeklyCheckinSeen=checkinKey\(today\(\)\)/);
 assert.match(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/'\.\/weekly-checkin\.js'/);
});
