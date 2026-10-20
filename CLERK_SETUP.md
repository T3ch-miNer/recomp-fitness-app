# Recomp: optional Google login with Clerk

## Existing application selected for this integration

The application chosen in the Clerk Dashboard is **`app_3KwMF7gpbqELTmo8Ny94dZ4tRbv`**. Recomp is an existing plain JavaScript PWA, not a new Next.js project. Its Clerk browser integration already exists, so **do not run `clerk init`** and do not provision an accountless or replacement Clerk project.

The owner has provided a **development publishable key** (`pk_test_`), now configured in `clerk-auth.js` on the draft branch. It resolves to the Clerk development frontend domain `giving-tomcat-8674.clerk.accounts.dev`. This is a **public** key only, not a secret. It is appropriate for development checks, **not production deployment**. The browser SDK cannot obtain a production publishable key from the application ID alone.

If you prefer the Clerk CLI from **your own authenticated development machine**, run `npx -y clerk@latest auth login` first. Link the existing repository to this exact app with `npx -y clerk@latest link --app app_3KwMF7gpbqELTmo8Ny94dZ4tRbv`, then retrieve missing development configuration with `npx -y clerk@latest env pull`. For production configuration only, use `env pull --instance prod`. **Do not replace working keys** or commit generated local environment files. A link and development environment variables alone don't automatically configure Recomp's static `clerk-auth.js` frontend: the approved publishable key must be set there separately.

## Optional development login on GitHub Pages (v2.5.3 testing)

The app owner specifically requested a **test-only** Google sign-in option on the current public GitHub Pages URL while keeping the free address. The JavaScript PWA now allows the existing `pk_test_` instance to open Clerk's development sign-in UI. A clear **Development mode · test sign-in** notice appears at the first-launch welcome and in **Settings → Account**, and Clerk's own development UI may also show its warnings.

**Security and limitations:** Clerk documents that development instances are **not suitable for production workloads**. Their authentication sessions have weaker cross-site characteristics, may display a Clerk `accounts.dev` domain, are limited in scale, and **do not have a production user migration path**. Test with non-sensitive accounts only; treat the login as experimental. Users can always **Continue without signing in**, and signed-in identities do not upload, sync, reset or grant access to local workouts, nutrition data, body measurements or photos. Backups remain entirely separate and opt-in.

Actual social login completion on Android Chrome must be checked manually with the selected Clerk instance and its enabled Google connection. GitHub Actions syntax and unit tests are **not** an end-to-end OAuth success test. Proper production authentication still requires a production Clerk instance, an owner-controlled domain/DNS and the matching production credentials.

**Production release gate:** Create a Clerk **production** instance in the existing application, complete its domain/DNS and Google OAuth setup, supply the **production public** publishable key (`pk_live_`), configure the actual deployed origin, confirm Android/browser sign-in and sign-out plus guest and existing-data regression tests. Clerk documents that production deployment requires a **domain you own with DNS control**; the current `t3ch-miner.github.io` GitHub Pages hostname is not a domain the app owner can edit at its DNS root. Plan for a custom domain or another Clerk-supported production arrangement before release. Automated source tests are necessary but not sufficient.


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
