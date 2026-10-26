// Cloud sync is opt-in. No keys are hard-coded into this repository.
// The browser version uses Supabase OAuth PKCE; native OAuth redirect handling
// must be tested separately before being described as production-ready.
const SESSION_KEY = 'recomp-cloud-session';
const VERIFIER_KEY = 'recomp-pkce-verifier';
const AUTH_CONFIG_KEY = 'recomp-cloud-config';
function base64url(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }
function config() { try { return JSON.parse(localStorage.getItem(AUTH_CONFIG_KEY) || 'null'); } catch { return null; } }
export function getConfig() { return config(); }
export function saveConfig(url, key) {
  const apiUrl = new URL(url.trim());
  if (apiUrl.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS');
  if (!/^https:\/\/[-a-z0-9]+\.supabase\.co\/?$/.test(apiUrl.origin + '/')) throw new Error('Enter your project URL from Supabase');
  if (!key.trim()) throw new Error('Provide your public Supabase publishable/anon key');
  localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify({url:apiUrl.origin,key:key.trim()}));
}
export function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); } catch { return null; } }
function storeSession(session) { if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now()/1000) + session.expires_in; localStorage.setItem(SESSION_KEY,JSON.stringify(session)); }
export function signOut() { localStorage.removeItem(SESSION_KEY); }
export async function startGoogleLogin() {
  const cfg = config(); if (!cfg) throw new Error('Configure Supabase first');
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const challenge = base64url(new Uint8Array(digest));
  sessionStorage.setItem(VERIFIER_KEY,verifier);
  const redirect = location.origin + location.pathname;
  const url = cfg.url+'/auth/v1/authorize?provider=google&code_challenge='+encodeURIComponent(challenge)+'&code_challenge_method=s256&redirect_to='+encodeURIComponent(redirect);
  location.assign(url);
}
export async function finishGoogleLogin() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code) return null;
  const cfg = config(); const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!cfg || !verifier) throw new Error('Google sign-in was started in a different browser session');
  const resp = await fetch(cfg.url+'/auth/v1/token?grant_type=pkce',{
    method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.key},
    body:JSON.stringify({auth_code:code,code_verifier:verifier})
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.msg || data.error_description || 'Authentication failed');
  storeSession(data); sessionStorage.removeItem(VERIFIER_KEY);
  history.replaceState({},'',location.pathname+location.hash);
  return data;
}
export async function usableSession() {
  const cfg=config(); let ses=getSession();
  if(!cfg || !ses) return null;
  if(Date.now() < ((ses.expires_at || 0)-90)*1000) return ses;
  if(!ses.refresh_token) return null;
  const resp=await fetch(cfg.url+'/auth/v1/token?grant_type=refresh_token',{
    method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.key},
    body:JSON.stringify({refresh_token:ses.refresh_token})
  });
  if(!resp.ok) { signOut(); throw new Error('Cloud session expired. Sign in again.'); }
  ses=await resp.json();storeSession(ses);return ses;
}
async function authenticated(path,options={}) {
  const cfg=config(),ses=await usableSession();
  if(!ses) throw new Error('Sign in to sync');
  const response=await fetch(cfg.url+path,{...options,headers:{apikey:cfg.key,Authorization:'Bearer '+ses.access_token,...options.headers}});
  if(!response.ok) throw new Error('Cloud request failed: '+response.status+' '+(await response.text()).slice(0,180));
  return response;
}
export async function uploadSnapshot(state) {
  const ses=await usableSession(); if(!ses) throw new Error('Not signed in');
  const userId=ses.user.id;
  await authenticated('/rest/v1/user_data?on_conflict=user_id',{
    method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},
    body:JSON.stringify({user_id:userId,payload:state,updated_at:new Date().toISOString()})
  });
}
export async function downloadSnapshot() {
  const ses=await usableSession(); if(!ses) throw new Error('Not signed in');
  const r=await authenticated('/rest/v1/user_data?user_id=eq.'+encodeURIComponent(ses.user.id)+'&select=payload,updated_at&limit=1');
  const rows=await r.json();return rows[0] || null;
}
export async function uploadPhoto(id,blob) {
  const ses=await usableSession();if(!ses)throw new Error('Not signed in');
  const path=ses.user.id+'/'+id+'.jpg';
  await authenticated('/storage/v1/object/progress-photos/'+path,{
    method:'POST',headers:{'Content-Type':'image/jpeg','x-upsert':'true'},body:blob
  });
  return path;
}
export async function downloadPhoto(path) {
  const r=await authenticated('/storage/v1/object/authenticated/progress-photos/'+path);
  return r.blob();
}

// Explicit user-requested deletion of their own optional Supabase backup.
// Remove stored photo objects via the Storage API, then the scoped user row.
// This never deletes the user's Recomp local records or identity account.
export async function deleteRemoteBackup(){
 const ses=await usableSession();
 if(!ses)throw new Error('Sign in to your configured cloud backup first');
 const existing=await downloadSnapshot();
 if(!existing)return {deleted:false,photos:0};
 const paths=[...new Set((Array.isArray(existing.payload?.photos)?existing.payload.photos:[])
  .map(p=>String(p?.cloudPath||''))
  .filter(path=>path.startsWith(ses.user.id+'/')&&!path.includes('..')))];
 for(const path of paths){
  await authenticated('/storage/v1/object/progress-photos/'+path.split('/').map(encodeURIComponent).join('/'),{method:'DELETE'});
 }
 const id=encodeURIComponent(ses.user.id);
 await authenticated('/rest/v1/user_data?user_id=eq.'+id,{method:'DELETE'});
 if(await downloadSnapshot())throw new Error('Cloud backup is still present. Check Supabase deletion permissions.');
 return {deleted:true,photos:paths.length};
}
