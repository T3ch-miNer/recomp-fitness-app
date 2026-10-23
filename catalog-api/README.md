# Recomp v2.9 — public online foods and workout templates

**Status: code preview, not deployed.** This is a new, independent Cloudflare Worker + D1 database. It does **not** modify the already working paid Hugging Face photo scanner, and it does not move personal meal logs, workout history, photos or goals into the public database.

## What you get after one initial Recomp app update

- Owner-only editor at `https://YOUR-CONTENT-WORKER.workers.dev/admin`.
- Add/edit/unpublish food items with names, aliases, serving sizes and kcal/protein/carbs/fat/fibre **per 100 g**.
- Add/edit/unpublish workout templates using Recomp's compatible exercise-array format.
- Public, versioned `GET /v1/catalog`, with `ETag` and five-minute response caching.
- Recomp checks the endpoint on startup, merges online foods with the built-in offline food reference, caches the catalogue offline, and offers published workouts as optional imports/updates.
- Applying a published revision to a personalised workout requires confirmation. Historical sessions, existing logged meals and active workouts are preserved.

**Important limitation:** The meal planner's built-in weekly recipe examples are separate from the food-reference catalogue. The public foods appear in food search and portion calculation, but existing logged meals are never retroactively recalculated. This is intentional to protect accurate history.

## 1. Create an EU D1 database (once)

Sign in to the Cloudflare account that owns your food scanner, then use Cloudflare's D1 dashboard or Wrangler CLI. To create an EU-jurisdiction database with Wrangler:

```bash
npx wrangler login
npx wrangler d1 create recomp-content --jurisdiction eu
```

Cloudflare returns a database UUID. The EU jurisdiction is a storage-location option, not a guarantee that all external processing is EU-only. Only public food and workout reference data are stored in this database.

Copy `wrangler.toml.example` to `wrangler.toml`, and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with the UUID. An ID is not a secret, but don't put actual credentials or access tokens in this config.

## 2. Apply schema and optionally seed sample library

From the `catalog-api` folder:

```bash
npx wrangler d1 migrations apply recomp-content --remote
```

From the repo root, to export only the public bundled reference foods and FTS template examples:

```bash
node catalog-api/create-seed.mjs
npx wrangler d1 execute recomp-content --remote --file=catalog-api/seed.generated.sql
```

The generated SQL is not required for new content: existing foods already ship with Recomp as an offline fallback, and new foods can be entered using the admin page. Seeding helps move the original catalogue into D1 so its existing nutrition can also be edited centrally. **Do not export or import personal diary data into this public database.**

The seed generator never connects to your phone, personal browser storage, workout log or photos.

## 3. Set a separate strong admin secret

From `catalog-api`:

```bash
npx wrangler secret put CATALOG_ADMIN_TOKEN
```

Enter a **random 32+ character value privately** when prompted. This must differ from both `HF_TOKEN` and `SCAN_ACCESS_TOKEN`. Never place it in GitHub, in the public Recomp app, a file committed to the repo, or this chat. The Worker requires at least 24 characters.

## 4. Deploy *only* the content Worker

From `catalog-api`:

```bash
npx wrangler deploy
```

Confirm that `https://YOUR-CONTENT-WORKER.workers.dev/health` reports `ready:true`. Check that `/v1/catalog` returns `version`, `foods` and `workouts`; the database may be empty initially. Visit `/admin` to manage entries. Admin access is password-protected for changes and the token is retained only in that browser tab's password input.

The admin page is publicly reachable but every write request requires the separate secret. There is no cross-origin permission for admin writes. Only public catalogue reads permit Recomp's GitHub Pages origin.

## 5. Connect Recomp after reviewing the preview

In the v2.9 Recomp build, open **Settings → Data & privacy → Online food & workout library → Configure library**.

Paste **only the public content endpoint**, for example:

`https://YOUR-CONTENT-WORKER.workers.dev/v1/catalog`

This is not the Hugging Face Worker URL and it does not include any secret.

Tap **Check for updates**. Recomp then refreshes the library when it opens, with a cached offline fallback. Newly published foods appear in food search without another app deployment. New workouts appear as published plans in Workouts; tap **Add plan** to install, or **Apply update** to replace a customised template *with confirmation*. That template update does not erase workout history or an active session.

## Security and operational notes

- D1 stores **reference content only**, not per-user health information.
- Published foods and workouts are **public**. Don't put personal notes, names, email addresses or medical details into public catalogue records.
- Workouts and foods have stable IDs; keep IDs unchanged when revising an item. Unpublishing a remote-only item removes it from the public catalogue on the next refresh but doesn't delete historical logs.
- The bundled reference data is always available offline. Unpublishing a bundled ID does not delete the offline fallback from Recomp.
- All nutrition figures are estimates; verify product label data, allergens and official sourcing yourself.
- If the network or D1 quota fails, existing offline reference foods and cached online content remain accessible. No automatic changes to stored workouts.
- The existing photo-recognition Worker remains independent so an editorial database issue cannot stop paid AI scans.
- A database backup/export and staging test are recommended before mass edits.

Cloudflare documentation: [D1 quickstart](https://developers.cloudflare.com/d1/get-started/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 EU jurisdiction](https://developers.cloudflare.com/d1/wrangler-commands/).

The coding and mock tests can be completed without Cloudflare credentials. **Actual D1 creation, binding, admin secret creation and deployment must be authorised in your Cloudflare account**, and have not happened yet.
