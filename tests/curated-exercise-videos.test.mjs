import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const toData=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const videosSource=read('exercise-videos.js');
const videosUri=toData(videosSource);
const {CURATED_VIDEO_COUNT,getCuratedExerciseVideo}=await import(videosUri);
const guideUri=toData(read('exercise-guides.js').replace("from './exercise-videos.js'","from '"+videosUri+"'"));
const {getExerciseVideoUrl,getExerciseVideoDetails,getExerciseSearchUrl}=await import(guideUri);
const oldUri=toData(read('fts-workouts.js'));
const {FTS_WORKOUTS}=await import(oldUri);
const moreUri=toData(read('fts-workouts-5-15.js').replace("from './fts-workouts.js'","from '"+oldUri+"'"));
const {FTS_WORKOUTS_5_TO_15}=await import(moreUri);
const all=[...FTS_WORKOUTS,...FTS_WORKOUTS_5_TO_15];
const names=[...new Set(all.flatMap(plan=>plan.items.map(item=>item[1])))];

test('all fifteen FTS workout plans and their unique exercises have a video discovery route',()=>{
 assert.equal(all.length,15);
 assert.equal(all.reduce((total,plan)=>total+plan.items.length,0),128);
 assert.equal(names.length,70);
 for(const name of names){
  const video=getExerciseVideoUrl(name);
  if(video){
   assert.match(video,/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?rel=0$/,name);
   assert.ok(getExerciseVideoDetails(name)?.creator,name);
  }else{
   const url=getExerciseSearchUrl(name);
   assert.ok(url.startsWith('https://www.youtube.com/results?search_query='),name);
   assert.ok(decodeURIComponent(url).includes(name),name);
  }
 }
});

test('twenty curated exact matches include NASM, CrossFit and specialist movements',()=>{
 assert.equal(CURATED_VIDEO_COUNT,20);
 assert.equal(getCuratedExerciseVideo('Dumbbell Romanian Deadlift')?.id,'aa57T45iFSE');
 assert.equal(getCuratedExerciseVideo('Push Ups')?.id,'WDIpL0pjun0');
 assert.equal(getCuratedExerciseVideo('Front Squat')?.creator,'CrossFit');
 assert.equal(getCuratedExerciseVideo('Cable Rows')?.id,'xQNrFHEMhI4');
 assert.equal(getCuratedExerciseVideo('Plank Hold')?.id,'xhk1JkbF2lg');
 assert.equal(getCuratedExerciseVideo('Dumbbell Snatch')?.id,'R0mhHuVrLHA');
 assert.equal(getCuratedExerciseVideo('Cossack Squat')?.id,'shYSWbqBJPM');
 assert.equal(getCuratedExerciseVideo('Sumo Deadlift')?.id,'YMmy-PgCPVc');
});

test('never silently substitute a wrong variation or invent a YouTube ID',()=>{
 for(const name of ['Shoulder Press Alternate Arm With Hold On Top','Bench Press Alternate Arm With Hold On Top','Alternating Isometric Dumbbell Curl','Unknown custom exercise','Front Raise x Lateral Raise']){
  assert.equal(getCuratedExerciseVideo(name),null,'not an exact match: '+name);
  assert.equal(getExerciseVideoUrl(name),null,'no misleading video: '+name);
  assert.match(getExerciseSearchUrl(name),/^https:\/\/www\.youtube\.com\/results\?search_query=/);
 }
 assert.equal(getExerciseVideoUrl('Leg Press'),'https://www.youtube-nocookie.com/embed/sEM_zo9w2ss?rel=0','retain earlier verified video');
 assert.doesNotMatch(videosSource,/fetch\(|localStorage|indexedDB|\.put\(|clear\(/);
});

test('all verified videos carry a real 11-character YouTube ID and named creator',()=>{
 for(const name of names){
  const video=getCuratedExerciseVideo(name);
  if(!video)continue;
  assert.match(video.id,/^[A-Za-z0-9_-]{11}$/);
  assert.ok(video.creator.length>4);
  assert.ok(video.title.length>5);
 }
});
