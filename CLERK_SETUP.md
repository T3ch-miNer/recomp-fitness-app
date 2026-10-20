# Recomp: optional Google login with Clerk

Clerk is a simpler alternative to setting up your own Google OAuth client just to let a user sign in. Users can **always Continue without signing in**. The fitness diary, workouts and photos continue to use Recomp's local IndexedDB.

> **Clerk login is not cloud backup.** Signing in alone neither uploads local records nor restores them on a second phone. Private backup remains an advanced, separately configured option; it is not required to use Clerk.

## Owner setup, once for everyone

1. Open **https://dashboard.clerk.com/** and create a Clerk application called Recomp.
2. In the Clerk Dashboard, enable **Google** as a sign-in option in **User & Authentication → Social connections**. Clerk's managed development credentials can help you test the flow. Review Clerk's production Google setup when promoting the app.
3. Under **API Keys**, copy the **Publishable key**, beginning with `pk_test_` or `pk_live_`. Do **not** copy or share a secret key.
4. For a quick personal test: in Recomp **Settings → Account → Set up Clerk**, paste that public publishable key. Test with the app hosted on an allowed Clerk domain.
5. To enable Google sign-in for **everyone**, set `CLERK_PUBLISHABLE_KEY` inside `clerk-auth.js` to the same public key, commit and redeploy **only after review**. Public keys are safe to serve in frontend code; never commit a `sk_` Clerk secret.
6. In Clerk, configure the correct app URL and redirect origins for **https://t3ch-miner.github.io/recomp-fitness-app/**. For production, follow Clerk's domain and deployment checks. A third-party raw GitHub demo proxy is not a supported sign-in host.
7. Test Google sign-in, sign-out, guest flow and returning sessions on the actual hosted origin before merging. Recomp never asks for Health Connect permissions just because Google login succeeds.

Official guide: https://clerk.com/docs/js-frontend/getting-started/quickstart

## Legacy cloud backup

The Supabase settings were kept under **Advanced cloud backup** to preserve compatibility with any existing users. It is entirely optional. Clerk is used for account identity, not as a replacement data store. A proper new backup system tied to Clerk identities requires its own server-side access controls and user consent. No guest data should be silently migrated or overwritten.

## Preview testing

The **isolated demo preview** deliberately disables real authentication and uses only disposable in-memory records. Choose **Continue without signing in** there to inspect the updated cloud navigation and meal planner. Do not add your Clerk key or real fitness details in the preview.
