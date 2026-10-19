# Recomp: Google sign-in, activity and Android Health Connect

## What works in the GitHub Pages PWA

- All fitness data stays in the existing local IndexedDB stores unless the user explicitly opts in to private backup.
- **Continue with Google** is already implemented using Supabase OAuth with PKCE. To activate it, create your own Supabase project and enable Google OAuth. Sign-in is an identity / private cloud backup feature, **not** permission to read Google Fit, Health Connect or Samsung Health.
- Manual steps and active-calorie editing remains available. The web-only app does **not** claim to sync Samsung Health or Google Fit, because a website cannot read their protected Android app data.
- The floating navigation dock is visually inspired by the user-provided phone screenshot and keeps Home, Workouts, Nutrition and Body.

## Activate Google login (no secrets in GitHub)

1. Set up a Supabase project and Google Cloud OAuth web client.
2. In Google Cloud, add the callback **https://YOUR-PROJECT.supabase.co/auth/v1/callback** to Google's **Authorised redirect URIs**.
3. In Supabase → Authentication → Providers → Google, configure your Google OAuth client ID and **client secret in the Supabase dashboard only**. Never commit it or put it in the PWA.
4. In Supabase → Authentication → URL Configuration, allow the full GitHub Pages URL: **https://t3ch-miner.github.io/recomp-fitness-app/**.
5. In Recomp → Settings → Cloud backup, choose **Configure** and enter only the HTTPS project URL and **public publishable/anon key**. Then choose **Continue with Google**.
6. Apply Supabase row-level security policies protecting the user data and private photos, and test the callback on the hosted PWA. Google account identity is never proof of consent to access activity metrics.
7. Existing Recomp records are NOT automatically restored or overwritten on sign-in. Back up/restore remains a separate explicit user action.

Official setup: https://supabase.com/docs/guides/auth/social-login/auth-google

## How Android step and active calorie syncing works

Google Fit's legacy APIs are being deprecated; use **Health Connect** for a future native Android build. Samsung Health can share relevant data with Health Connect when configured and permitted by the device and app. Alternatively Samsung supplies a native Data SDK. Neither has a browser JavaScript API for direct PWA access.

Included in this repository:

- `health-connect.js`: strict, read-only web-side bridge, available **only** when an Android Capacitor build installs and registers a `RecompHealth` plugin.
- `android-health-connect/RecompHealthPlugin.kt`: Android-only Kotlin implementation of the **requested day**, using Health Connect's aggregated `StepsRecord.COUNT_TOTAL` and `ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL`.
- The native plugin **asks for both permissions on an explicit user action** and returns date, steps, activeCalories. It does not request write permissions or upload sensor data.
- The UI only shows **Sync from Health Connect** when the native bridge is present. Existing manual entries are preserved unless the user confirms replacing that specific date. No other dates are touched, and syncing does not add totals on top of already-synced steps.

### Native wrapper integration work remaining

This repository is currently a browser PWA, **not** a complete buildable Capacitor Android app. Before any promise of Android automatic activity sync, a developer must:

1. Create/configure a real Capacitor Android project with an appropriate HTTPS origin and working app package.
2. Add `androidx.health.connect:connect-client` and Kotlin coroutines to Gradle, using compatible versions.
3. Register `RecompHealthPlugin` in the Android `BridgeActivity`. Copy the Kotlin file into the correct application package.
4. Declare **android.permission.health.READ_STEPS** and **android.permission.health.READ_ACTIVE_CALORIES_BURNED** in the Android manifest, plus the required Health Connect permissions-rationale and privacy policy flow for the targeted Android/Play version. Do not declare write permissions.
5. Confirm the device's Health Connect installation/setup, Samsung Health sharing settings and app permission grants.
6. Test on a *physical* compatible Android phone: denial, approval, revocation, time zone boundaries, overlapping data sources, no data, data not yet synced, backgrounding and sign-in independence.
7. Add verified Android OAuth deep-link support before presenting Google sign-in as usable in a native wrapper. The hosted PWA OAuth flow is already separate.

**Kotlin source has not been compiled or exercised on Android hardware** here, so it is a starting point requiring native integration, not a shipped connection.

Official docs:
- https://developer.android.com/health-and-fitness/health-connect/get-started
- https://developer.android.com/health-and-fitness/health-connect/aggregate-data
- https://developer.samsung.com/health/data/overview.html
- https://developers.google.com/fit/rest

## Nutrition estimator

Inside **Recipes → Edit recipe**, **Estimate macros from ingredients** recognises a limited set of food names, grams/kilograms, certain liquids and explicitly known piece weights. It only fills the form when **every ingredient** is recognised; otherwise it lists missing names without inventing zero macro values. You must review the numbers and choose Save yourself. Cooked yields, household recipes, preparation oil, branded items and seasoning can change results. No external AI endpoint is used.
