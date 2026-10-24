// Scroll direction controller for the mobile app chrome.
// Pure decision logic: ignores noisy one-pixel movements and keeps navigation
// visible at the top, during form input and inside active workout mode.
export function nextScrollChromeState(previous={},rawY=0,{locked=false}={}){
 const y=Number.isFinite(Number(rawY))?Math.max(0,Number(rawY)):0;
 const lastY=Number.isFinite(Number(previous.lastY))?Math.max(0,Number(previous.lastY)):y;
 const hidden=Boolean(previous.hidden);
 const down=Math.max(0,Number(previous.down)||0);
 if(locked||y<=64)return {lastY:y,hidden:false,down:0};
 const delta=y-lastY;
 // Even a small intentional upward gesture makes controls accessible again.
 if(delta<=-3)return {lastY:y,hidden:false,down:0};
 if(delta>0){
  const nextDown=Math.min(40,down+delta);
  return {lastY:y,hidden:hidden||nextDown>=16,down:nextDown};
 }
 return {lastY:y,hidden,down};
}
