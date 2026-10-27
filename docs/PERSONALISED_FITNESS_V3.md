# Recomp v3: personalised fitness plans (preview)

**Status:** This is an unpublished draft. Existing public Recomp users and their logged data remain on the current release.

## Who sees what

- **First new use:** existing guest/Google welcome, followed by Basic vs Advanced mode.
- **Basic:** only the existing **Full Body A** and **Full Body B** workout templates appear. Their exercises can be logged as before. People can switch mode from Settings without deleting their records.
- **Advanced:** existing body measurements, optional self-entered age/height/weight/waist, goals, equipment, diet preference, schedule and considerations. Build a human-readable prompt from those fields; review the full prompt including any measurements saved in the Body tab; explicitly copy it to a third-party GPT of the user's choice.
- The external GPT generates a structured JSON document. Recomp checks the schema and value ranges, shows workouts and nutrition for review, and imports only after a second confirmation. It updates local daily targets and stores suggested meals, but never inserts meals into the diary automatically.
- Existing Recomp installations retain their earlier settings and complete workout library; the new-user onboarding does not interrupt them.

## How to use Advanced mode

1. Select Advanced, fill in the voluntary profile in Settings → Daily targets.
2. Choose **Copy GPT planning prompt**. Read the text before copying because it contains your entered profile and, if recorded, the latest body measurements.
3. Paste that prompt into a GPT conversation on your own account. This is an **external service**, subject to its own data-handling policies. Recomp does not send the prompt or your records to GPT automatically.
4. Ask it to return **only valid JSON**, save the full response as `recomp-plan.json` (UTF-8). Do not include code fences or text outside the JSON object.
5. In Recomp choose **Import GPT JSON plan**, upload your file, review targets and exercise names, and approve. Example: [examples/recomp-personal-plan-example.json](../examples/recomp-personal-plan-example.json) — fictional sample for UI testing, not advice.

## Supported plan format

`format: "recomp-personal-plan-v1"`, `title`, `goals` (daily calories, protein, carbs, fat, fibre, water, steps), `workouts` (1–7 workouts, each with `name`, `subtitle` and `exercises` containing `name, sets, reps, restSeconds, notes`), and optional `meals` (name, Breakfast/Lunch/Dinner/Snack, estimated grams, calories and macros). Validation rejects very low calorie goals, missing fields and excessive exercise counts. It never evaluates imported code.

**Excel, PDF, arbitrary uploads and CSV are not supported yet.** They should first be converted into this validated JSON schema, with a user-review step. Direct parsing of unstructured PDFs is error-prone and unsafe for prescribing workouts/nutrition.

## Additional popular and Indian food reference entries

The preview bundles **30 extra recipe examples** on top of the existing 290 food references. Nutrient amounts are computed from recipe ingredient gram weights using Recomp's existing approximate ingredient-reference table. These are *estimates per 100 g*, not lab-certified nutrition information. They must remain adjustable.

Once the owner has reviewed the new recipes, they can add them to the existing owner-managed Cloudflare D1 database **without redeploying the public Worker or changing app source**. From repository root in GitHub Codespaces:

```bash
git fetch origin
git switch feature/v3-personal-fitness-modes-import-20261027
node catalogue-worker/scripts/build-popular-food-seed.mjs > catalogue-worker/seed-popular-foods.sql
npx wrangler d1 execute recomp-catalogue --remote --file=catalogue-worker/seed-popular-foods.sql
```

The generated SQL uses `INSERT OR IGNORE` and does not overwrite existing foods or user-edited rows. Do not commit the temporary SQL output. After import, the shared database should contain 30 additional unique food IDs alongside the existing 290, subject to any other rows already added.

The published API remains public and read-only. It must never contain users' names, weight logs, profiles or personal meal diaries.

## Production multi-user prerequisites

This first v3 preview is **device-local personalisation**, not production-grade cross-device identity or cloud sync. Before advertising personal accounts across phones, build and independently test:

- An account-owned private profile and routine store separate from public D1. Authorised access via a supported identity provider; per-user row-level permission checks on every request.
- Cloud backup/restore and secure separation between multiple signed-in users on a shared device. Existing optional backup is not automatically account-based.
- Profile export, data deletion and correction; minimum necessary collection and consent for sensitive measurement data, GDPR/privacy review in the EU.
- Versioned routine schema, rollback/undo and safe migrations; optional expert review for medical exercise or nutrition concerns.
- A conversion service or client-side converter for CSV/XLSX/PDF, which **only produces proposed JSON** to be checked by the user, never unreviewed automatic prescriptions.

## Nutrition data sources for future expansion

Use verified composition data where licensed and available. USDA FoodData Central publishes structured download data: https://fdc.nal.usda.gov/download-datasets/ . Indian Food Composition Tables 2017 are linked by FAO: https://www.fao.org/food-composition/tables-and-databases/detail/%28country--date%29-title-9/en . Open Food Facts is useful for German supermarkets, but contributed products can have inaccuracies and its ODbL attribution/share-alike requirements must be followed: https://openfoodfacts.github.io/openfoodfacts-server/api/ .
