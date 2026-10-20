// Disposable demo preview: deliberately no Clerk accounts, external scripts or sessions.
export const CLERK_PUBLISHABLE_KEY='';
export const getClerkKey=()=> '';
export const saveClerkKey=()=>{throw new Error('Clerk configuration is disabled in the demo preview.');};
export const clerkDomain=()=>null;
export const loadClerk=async()=>null;
export const getClerkAccount=()=>null;
export const openClerkSignIn=async()=>{throw new Error('Google sign-in is disabled in the demo. Continue without signing in.');};
export const clerkSignOut=async()=>{};
