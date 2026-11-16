// Rowan Row's full-body warm-up, as listed in the original YouTube description.
// A reusable pre-session guide, never counted towards working sets or plan history.
export const WARMUP_VIDEO_ID='VecbXgWY0DI';
export const WARMUP_VIDEO_URL='https://www.youtube.com/watch?v='+WARMUP_VIDEO_ID;
export const WARMUP_STEPS=Object.freeze([
 'Neck circles',
 'Shoulder rotations',
 'Arm circles',
 'Arm circles in opposite directions',
 'Elbow circles',
 'Wrist rotations',
 'Hip rotations',
 'Body circles',
 'Inner thigh and oblique mobility',
 'Lower back and hamstring mobility',
 'Lunge taps',
 'Side static lunges',
 'Front static lunges',
 'Squat with crossed arms',
 'Standing crunches',
 'Butterflies',
 'Jumping jacks'
]);
export function warmupState(session){return session?.warmupStatus==='done'?'done':session?.warmupStatus==='skipped'?'skipped':'pending';}
export function warmupView(session){
 const status=warmupState(session);
 if(status!=='pending')return `<section class="recomp-warmup compact ${status}" aria-label="Warm-up ${status==='done'?'completed':'skipped'}"><span class="recomp-warmup-compact-mark" aria-hidden="true">${status==='done'?'✓':'↷'}</span><span class="recomp-warmup-compact-text">${status==='done'?'Warm-up done':'Warm-up skipped'}</span><button type="button" class="btn ghost" data-action="warmup-reset">View routine</button></section>`;
 const complete=status==='done',skipped=status==='skipped';
 const badge=complete?'Completed':skipped?'Skipped':'Before your working sets';
 const summary=complete?'Warm-up completed for this session.':skipped?'Warm-up skipped for this session.':'Follow the routine, or open the movement list if the video is unavailable.';
 // Pending: one compact card. Video, full list and advice sit behind one tap.
 return `<section class="recomp-warmup pending" aria-labelledby="recomp-warmup-heading">
 <div class="recomp-warmup-row"><div><span class="recomp-warmup-kicker"><span class="status-dot" aria-hidden="true"></span> FIRST UP</span><h2 id="recomp-warmup-heading">Full-body warm-up</h2><p class="recomp-warmup-sub">17 movements · Rowan Row</p></div></div>
 <div class="recomp-warmup-actions"><button type="button" class="btn primary recomp-warmup-play" data-action="warmup-show-video" aria-controls="recomp-warmup-player" aria-expanded="false">▶ Play</button><button type="button" class="btn" data-action="warmup-finish">✓ Done</button><button type="button" class="btn ghost" data-action="warmup-skip">Skip</button></div>
 <div id="recomp-warmup-player" class="recomp-warmup-player" hidden></div>
 <details class="recomp-warmup-moves"><summary>View all 17 movements</summary><ol>${WARMUP_STEPS.map(step=>`<li>${step}</li>`).join('')}</ol><p class="recomp-warmup-advice">Move gently within a comfortable range. Skip any movement that causes pain. For heavier lifts, add lighter practice sets before your working weight.</p><a class="recomp-warmup-source" href="${WARMUP_VIDEO_URL}" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></details>
 </section>`;
}
