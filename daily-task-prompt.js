// A calendar-day task planner. One-time tasks never change the user's
// recurring routine; snooze can be reopened later, including offline.
export const DAILY_TASK_SNOOZE_MS=60*60*1000;
export const DAILY_TASK_MAX=8;
export function shouldAskForDailyTasks(record,date,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return false;
 if(!record||record.date!==date)return true;
 if(record.status==='planned'||record.status==='skipped')return false;
 if(record.status==='snoozed')return now>=Number(record.snoozedUntil||0);
 return true;
}
export function dailyTaskRecord(date,status,now=Date.now()){
 if(status!=='planned'&&status!=='snoozed'&&status!=='skipped')throw Error('Invalid task planning status');
 return {date,status,snoozedUntil:status==='snoozed'?now+DAILY_TASK_SNOOZE_MS:null};
}
export function makeTodaysTasks(labels,date,makeId){
 if(typeof makeId!=='function')throw Error('A task ID generator is required');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))throw Error('Invalid task date');
 if(!Array.isArray(labels))throw Error('Please enter your tasks');
 const clean=labels.map(x=>String(x||'').trim()).filter(Boolean);
 if(clean.length>DAILY_TASK_MAX)throw Error('You can add up to '+DAILY_TASK_MAX+' tasks at once');
 if(clean.some(t=>t.length>100))throw Error('Keep each task under 100 characters');
 return clean.map(label=>({id:makeId(),date,label,auto:null}));
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dailyTaskPromptHtml(date){
 const niceDate=new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
 return `<div id="recomp-daily-tasks-prompt" class="daily-plan-overlay">
 <section class="daily-plan-card" role="dialog" aria-modal="true" aria-labelledby="daily-plan-title" aria-describedby="daily-plan-description">
 <div class="daily-plan-top"><span class="daily-plan-eyebrow">TODAY'S PLAN</span><span class="daily-plan-date">${escape(niceDate)}</span></div>
 <h1 id="daily-plan-title">What's on your list today?</h1>
 <p id="daily-plan-description">Add a few tasks for today. Your regular daily routine is already there, and these extras will only show up today.</p>
 <form id="recomp-daily-task-form" novalidate>
 <div class="daily-plan-inputs" id="daily-plan-inputs">
 <label class="daily-plan-field"><span>Task 1</span><input type="text" name="task" autocomplete="off" maxlength="100" placeholder="e.g. Take a 20-minute walk"/></label>
 <label class="daily-plan-field"><span>Task 2</span><input type="text" name="task" autocomplete="off" maxlength="100" placeholder="e.g. Stretch for 10 minutes"/></label>
 <label class="daily-plan-field"><span>Task 3</span><input type="text" name="task" autocomplete="off" maxlength="100" placeholder="e.g. Prepare meals"/></label>
 </div>
 <button type="button" class="daily-plan-add" data-daily-task="add">+ Add another task</button>
 <p class="daily-plan-error" role="alert" hidden></p>
 <button type="submit" class="daily-plan-primary">Save today's tasks <span aria-hidden="true">→</span></button>
 </form>
 <div class="daily-plan-secondary"><button type="button" data-daily-task="snooze">Snooze 1 hour</button><button type="button" data-daily-task="skip">No extras today</button></div>
 <p class="daily-plan-hint">Snoozed? You can open this anytime using <b>Plan today</b> on Home.</p>
 </section></div>`;
}
export function showDailyTaskPrompt({date,onSave,onSnooze,onSkip}){
 if(document.getElementById('recomp-daily-tasks-prompt'))return false;
 const host=document.createElement('div');
 host.innerHTML=dailyTaskPromptHtml(date);
 const root=host.firstElementChild;
 const form=root.querySelector('form'),list=root.querySelector('#daily-plan-inputs');
 const feedback=root.querySelector('.daily-plan-error');
 let busy=false;
 document.body.appendChild(root);
 const field=()=>list.querySelectorAll('input[name="task"]');
 field()[0]?.focus({preventScroll:true});
 function error(message){feedback.hidden=false;feedback.textContent=String(message||'Try again');}
 async function execute(kind){
  if(busy)return;
  busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);
  feedback.hidden=true;
  try{
   if(kind==='save'){
    const labels=[...field()].map(input=>input.value);
    if(!labels.some(v=>v.trim())){error('Add a task, or choose No extras today.');return;}
    await onSave(labels);
   }else if(kind==='snooze')await onSnooze();
   else await onSkip();
   root.remove();
  }catch(e){error(e?.message||'Could not save. Try again.');}
  finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 form.addEventListener('submit',event=>{event.preventDefault();execute('save');});
 root.addEventListener('click',event=>{
  const button=event.target.closest('[data-daily-task]');
  if(!button||busy)return;
  if(button.dataset.dailyTask==='add'){
   const count=field().length;
   if(count>=DAILY_TASK_MAX){error('Up to '+DAILY_TASK_MAX+' tasks at a time.');return;}
   const label=document.createElement('label');label.className='daily-plan-field';
   label.innerHTML='<span>Task '+(count+1)+'</span><input type="text" name="task" autocomplete="off" maxlength="100" placeholder="One more thing to do"/>';
   list.appendChild(label);label.querySelector('input').focus({preventScroll:true});
  }else execute(button.dataset.dailyTask);
 });
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();return;}
  if(event.key!=='Tab')return;
  const els=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
  if(!els.length)return;
  if(event.shiftKey&&document.activeElement===els[0]){event.preventDefault();els.at(-1).focus();}
  else if(!event.shiftKey&&document.activeElement===els.at(-1)){event.preventDefault();els[0].focus();}
 });
 return true;
}
