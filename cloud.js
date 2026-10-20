// Demo preview only. Authentication, account sessions, remote backups and
// network photo upload/download are explicitly disabled on the preview CDN.
// Never merge this stub into the release branch.
const blocked=()=>{throw new Error('Cloud features are disabled in this temporary demo. Use the live Recomp Settings after configuring your private Supabase project.');};
export const getConfig=()=>null;
export const getSession=()=>null;
export const saveConfig=blocked;
export const startGoogleLogin=blocked;
export const finishGoogleLogin=blocked;
export const signOut=()=>{};
export const usableSession=async()=>null;
export const uploadSnapshot=blocked;
export const downloadSnapshot=blocked;
export const uploadPhoto=blocked;
export const downloadPhoto=blocked;
