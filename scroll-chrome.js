// Scroll direction controller for the mobile app chrome.
// Pure decision logic: ignores noisy one-pixel movements and keeps navigation
// visible at the top, during form input and inside active workout mode.
export function nextScrollChromeState(previous={},rawY=0,{locked=false}={}){
 const y=Number.isFinite(Number(rawY))?Math.max(0,Number(rawY)):0;
 const lastY=Number.isFinite(Number(previous.lastY))?Math.max(0,Number(previous.lastY)):y;
 const hidden=Boolean(previous.hidden);
 const down=Math.max(0,Number(previous.down)||0);
 const up=Math.max(0,Number(previous.up)||0);
 if(locked||y<=80)return {lastY:y,hidden:false,down:0,up:0};
 const delta=y-lastY;
 // Aggregate slow upward gestures too; reveal within four pixels.
 if(delta<0){
  const nextUp=up-delta;
  return {lastY:y,hidden:nextUp<4&&hidden,down:0,up:nextUp>=4?0:nextUp};
 }
 if(delta>0){
  const nextDown=Math.min(40,down+delta);
  return {lastY:y,hidden:hidden||nextDown>=16,down:nextDown,up:0};
 }
 return {lastY:y,hidden,down,up};
}
