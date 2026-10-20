// Optional Clerk identity for the static Recomp PWA.
// This signs in users only; it never uploads or reads fitness records.
// The publishable key is deliberately user-configured. No secret keys belong in the PWA.
// Set this *public* key once before publishing to enable sign-in for everyone.
// Do NOT paste a Clerk secret key in this file. Until configured, guest mode works.
export const CLERK_PUBLISHABLE_KEY='pk_test_Z2l2aW5nLXRvbWNhdC04Njc0LmNsZXJrLmFjY291bnRzLmRldiQ';
const KEY='recomp-clerk-publishable-key-v1';
let loading=null;

export function getClerkKey(){
 if(CLERK_PUBLISHABLE_KEY)return CLERK_PUBLISHABLE_KEY;
 try{return localStorage.getItem(KEY)||'';}catch{return '';}
}
export function saveClerkKey(key){
 const value=String(key||'').trim();
 if(!/^pk_(test|live)_[A-Za-z0-9_-]{15,}$/.test(value))throw new Error('Paste the Clerk publishable key beginning pk_test_ or pk_live_.');
 const domain=clerkDomain(value);
 if(!domain)throw new Error('Invalid Clerk publishable key. Copy it from Clerk → API keys.');
 localStorage.setItem(KEY,value);
 loading=null;
 return domain;
}
export function clerkDomain(value){
 try{
  if(!/^pk_(test|live)_[A-Za-z0-9_-]{15,}$/.test(value))return null;
  const suffix=value.split('_').slice(2).join('_');
  const raw=atob(suffix.replace(/-/g,'+').replace(/_/g,'/'));
  const host=raw.endsWith('$')?raw.slice(0,-1):raw;
  if(!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(host)||host.length>200)return null;
  return host;
 }catch{return null;}
}
function loadScript(url,key){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=url;script.async=true;script.crossOrigin='anonymous';
  if(key)script.setAttribute('data-clerk-publishable-key',key);
  script.onload=resolve;
  script.onerror=()=>reject(new Error('Could not load Clerk. Check your connection and configured domain.'));
  document.head.appendChild(script);
 });
}
export async function loadClerk(){
 if(loading)return loading;
 const key=getClerkKey(),domain=clerkDomain(key);
 if(!domain)throw new Error('Clerk is not configured yet. Add your publishable key in Settings.');
 loading=(async()=>{
  if(!window.Clerk){
   await loadScript('https://'+domain+'/npm/@clerk/ui@1/dist/ui.browser.js');
   await loadScript('https://'+domain+'/npm/@clerk/clerk-js@6/dist/clerk.browser.js',key);
  }
  if(!window.Clerk)throw new Error('Clerk did not initialise.');
  const target=location.origin+location.pathname;
  await window.Clerk.load({
   ui:{ClerkUI:window.__internal_ClerkUICtor},
   signInForceRedirectUrl:target,signUpForceRedirectUrl:target,
  });
  return window.Clerk;
 })().catch(err=>{loading=null;throw err;});
 return loading;
}
export function getClerkAccount(){
 const client=typeof window!=='undefined'?window.Clerk:null;
 const user=client?.user;
 return user?{id:String(user.id),email:String(user.primaryEmailAddress?.emailAddress||''),firstName:String(user.firstName||'')}:null;
}
export async function openClerkSignIn(){
 const client=await loadClerk();
 if(client.user)return client.user;
 client.openSignIn({signInForceRedirectUrl:location.origin+location.pathname,signUpForceRedirectUrl:location.origin+location.pathname});
 return null;
}
export async function clerkSignOut(){
 const client=await loadClerk();
 await client.signOut();
}
