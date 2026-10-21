import {getExerciseGuide,getExerciseVideoDetails,getExerciseVideoUrl,getExerciseSearchUrl} from './exercise-guides.js';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Read-only view for an in-progress exercise: do not mutate sets, notes or workout state.
export function renderExerciseDemonstration(exercise,{playing=false}={}){
 if(!exercise)return '<p class="hint">Exercise no longer available. Close this panel to return to your workout.</p>';
 const name=String(exercise.name||'Exercise');
 const safeName=escapeHtml(name);
 const guide=getExerciseGuide(name),details=getExerciseVideoDetails(name),video=getExerciseVideoUrl(name);
 const search=getExerciseSearchUrl(name);
 const videoLink=video?video.replace('www.youtube-nocookie.com/embed/','www.youtube.com/watch?v=').replace('?rel=0',''):null;
 const source=guide?.source||'';
 const steps=guide?.steps||[];
 return `<section class="exercise-demo" aria-label="Technique guide for ${safeName}">
   <div class="exercise-demo-heading">
     <span class="eyebrow">EXERCISE TECHNIQUE</span>
     <h3>${safeName}</h3>
     ${guide?.muscles?`<div class="small muted">Works: ${escapeHtml(guide.muscles)}</div>`:''}
   </div>
   ${video?`<div class="exercise-demo-media">
      ${playing?`<iframe class="exercise-demo-frame" loading="lazy" src="${video}" title="${safeName} demonstration by ${escapeHtml(details?.creator||'video creator')}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`:
       `<button class="exercise-demo-play" type="button" data-action="load-exercise-video" aria-label="Play demonstration for ${safeName}">▶ <span>Play demonstration</span></button>`}
     </div>
     <p class="hint">${escapeHtml(details?.title||name)} · ${escapeHtml(details?.creator||'Video creator')}. Requires internet. If playback is blocked, open the YouTube link.</p>
   `:''}
   ${steps.length?`<div class="exercise-demo-steps">
      <h4>How to do it</h4>
      <ol>${steps.map(step=>`<li>${escapeHtml(step)}</li>`).join('')}</ol>
      <div class="exercise-demo-tip"><b>Form reminder</b><span>${escapeHtml(guide.tip)}</span></div>
     </div>`:
     (video?'<div class="outline-banner">A matching video is available. Detailed written instructions have not yet been reviewed for this movement.</div>':'<div class="outline-banner">No verified technique guide for this exact exercise yet. Use the video search below and check the equipment matches your exercise.</div>')}
   ${exercise.notes?`<details class="exercise-demo-notes"><summary>Notes from your workout plan</summary><p>${escapeHtml(exercise.notes)}</p></details>`:''}
   <div class="exercise-demo-actions">
      ${source?`<a class="btn" href="${source}" target="_blank" rel="noopener noreferrer">Read original exercise guide ↗</a>`:''}
      ${videoLink?`<a class="btn" href="${videoLink}" target="_blank" rel="noopener noreferrer">Open video on YouTube ↗</a>`:
      `<a class="btn primary" href="${search}" target="_blank" rel="noopener noreferrer">Find a technique video ↗</a>`}
   </div>
   <p class="hint">General technique guidance only. Start with a manageable load and stop if a movement causes pain. Your workout data stays on your device.</p>
 </section>`;
}
