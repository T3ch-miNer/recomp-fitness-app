// Backups you keep yourself: one JSON file with everything (photos included),
// plus spreadsheet-friendly CSVs. In the APK, files go through Android's share
// sheet (Drive, Files, email…) because the web view ignores browser downloads.

export const BACKUP_FORMAT='recomp-backup-v2';
const FORMATS=new Set(['recomp-backup-v1',BACKUP_FORMAT]);
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:0;};
const arr=v=>Array.isArray(v)?v:[];

export function buildBackup(state,{photos=[],youLocal=null,now=new Date()}={}){
 const safe=structuredClone(state);
 delete safe.dirty;
 return {format:BACKUP_FORMAT,exportedAt:now.toISOString(),app:'Recomp',state:safe,photos,youLocal};
}

// Friendly checks, so a wrong file gets a clear message instead of a crash.
export function readBackup(text){
 let data;
 try{data=JSON.parse(text);}catch{throw Error("That file isn't a Recomp backup. Choose the .json file Recomp exported.");}
 if(!FORMATS.has(data?.format))throw Error("That file isn't a Recomp backup. Choose the .json file Recomp exported.");
 const s=data.state;
 if(!s||typeof s!=='object'||!s.goals||!Array.isArray(s.food)||!Array.isArray(s.templates))throw Error('This backup looks damaged, so nothing was changed.');
 if(!Array.isArray(data.photos))data.photos=[];
 data.photos=data.photos.filter(p=>p&&typeof p.id==='string'&&typeof p.data==='string'&&p.data.startsWith('data:image/'));
 return data;
}

export function summariseBackup(data){
 const s=data.state||{};
 const measures=arr(s.measurements).length;
 return {
  exportedAt:data.exportedAt||null,
  workouts:arr(s.workoutHistory).length,
  food:arr(s.food).length,
  weights:arr(s.weights).length,
  measurements:measures,
  photos:arr(data.photos).length,
  notes:Object.keys(s.dayNotes||{}).length,
  habits:arr(data.youLocal?.habits).length
 };
}
const plural=(n,word)=>`${n.toLocaleString('en-GB')} ${word}${n===1?'':'s'}`;
export function describeBackup(sum){
 const when=sum.exportedAt?new Date(sum.exportedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'an unknown date';
 const parts=[plural(sum.workouts,'workout'),plural(sum.food,'food entry').replace('entrys','entries'),plural(sum.weights,'weigh-in'),plural(sum.photos,'photo')];
 if(sum.notes)parts.push(plural(sum.notes,'day note'));
 if(sum.habits)parts.push(plural(sum.habits,'habit'));
 return `Backup from ${when}: ${parts.join(', ')}.`;
}

// ---------- CSV ----------
const cell=v=>{const t=String(v??'');return /[",\n\r]/.test(t)||/^[=+\-@]/.test(t)?`"${(/^[=+\-@]/.test(t)?"'":'')+t.replace(/"/g,'""')}"`:t;};
export const toCsv=(head,rows)=>[head,...rows].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
export function workoutsCsv(history=[]){
 const rows=[];
 for(const w of history)for(const ex of arr(w.exercises)){
  arr(ex.sets).forEach((s,i)=>{if(s?.done)rows.push([w.date,w.name,s.exerciseName||ex.name,i+1,num(s.kg)||'',num(s.reps)||'',w.durationMin??'']);});
 }
 return toCsv(['Date','Workout','Exercise','Set','kg','Reps','Session minutes'],rows);
}
export function foodCsv(food=[]){
 return toCsv(['Date','Meal','Food','Amount','Calories','Protein g','Carbs g','Fat g'],
  food.map(f=>[f.date,f.meal||'',f.name||'',f.amount??f.grams??'',Math.round(num(f.calories)),+num(f.protein).toFixed(1),+num(f.carbs).toFixed(1),+num(f.fat).toFixed(1)]));
}
export function weightsCsv(weights=[]){
 return toCsv(['Date','kg'],[...weights].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(w=>[w.date,num(w.kg)]));
}

// ---------- Saving a file ----------
const plugins=()=>globalThis.Capacitor?.isNativePlatform?.()?globalThis.Capacitor?.Plugins:null;
export const nativeFileSharing=()=>{const p=plugins();return Boolean(p?.Filesystem?.writeFile&&p?.Share?.share);};

// files: [{name,text,mime}]. Returns 'shared', 'downloaded' or 'cancelled'.
export async function saveTextFiles(files,{title='Recomp backup'}={}){
 const p=plugins();
 if(p?.Filesystem?.writeFile&&p?.Share?.share){
  const uris=[];
  for(const f of files)uris.push((await p.Filesystem.writeFile({path:f.name,data:f.text,directory:'CACHE',encoding:'utf8',recursive:true})).uri);
  try{await p.Share.share({title,dialogTitle:'Save or send your backup',files:uris});}
  catch(error){if(/cancel/i.test(String(error?.message||error)))return 'cancelled';throw error;}
  return 'shared';
 }
 for(const f of files){
  const blob=new Blob([f.text],{type:f.mime||'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=f.name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
 }
 return 'downloaded';
}

// "12 days ago" style text, and whether it's time for a nudge.
export function backupAge(lastAt,now=Date.now()){
 if(!lastAt)return {text:'Never backed up',due:true};
 const days=Math.floor((now-new Date(lastAt).getTime())/86400000);
 const text=days<=0?'Backed up today':days===1?'Backed up yesterday':`Backed up ${days} days ago`;
 return {text,due:days>=14};
}
