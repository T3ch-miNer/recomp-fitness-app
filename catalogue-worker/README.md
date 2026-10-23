# Recomp online catalogues (v2.8 preview)

**Purpose:** Update shared food nutrition estimates, exercises and workout programmes without building or releasing a new app. This is **not** cloud backup for individual users. Food diaries, photographs, workout sessions and custom plans remain in local IndexedDB.

**Status:** Code is in the preview PR. The Cloudflare D1 database and this separate Worker have **not** been created or connected in your Cloudflare account. The live Recomp v2.7 app does not have this feature yet.

## Architecture

- Cloudflare **D1** stores three public catalogue tables: `foods`, `exercises`, `workout_plans`.
- A dedicated **read-only** Cloudflare Worker (`catalogue-worker/worker.js`) returns them through `GET /v1/catalogue`. No browser can add/edit/delete server records through this API.
- In Settings → Data & privacy → **Online food & workout catalogue**, connect its public HTTPS `/v1/catalogue` URL once. Never insert any secret in the URL.
- Recomp fetches the catalogue when opened and when you press **Check for updates**. It stores the public response in local IndexedDB for offline use; builtin food recipes and FTS plans remain available even with no connection.
- Online food rows overlay builtin food entries **by stable ID**. Saved meals retain their own calorie/macro snapshots, so server changes do not rewrite history.
- Online workout programmes appear as **importable plans**. Import creates a private copy; later online changes are opt-in through **Update my copy**, which asks before replacing an imported plan's exercises. Existing completed sessions are never overwritten.
- Online exercise entries are delivered by the API and cached; integrating their guidance into exercise search/demonstrations is a follow-up feature.

## One-time Cloudflare setup

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/), open **Storage & databases → D1** and create a database named `recomp-catalogue`. This creates the database only; it has nothing to do with the existing working Hugging Face Worker.
2. In D1 → `recomp-catalogue` → **Console**, execute the SQL in [migrations/0001_catalogues.sql](migrations/0001_catalogues.sql) to create the 3 tables. Alternatively, copy `wrangler.toml.example` to `wrangler.toml`, fill in the genuine D1 UUID, and run `npx wrangler d1 migrations apply recomp-catalogue --remote` from the `catalogue-worker` directory after checking the target database.
3. Create a **new** Worker named `recomp-catalogue`, deploy the contents of [worker.js](worker.js) through the code editor or Wrangler, and attach the D1 database under **Settings → Bindings → D1 database**. Set the binding variable name to exactly `CATALOGUE_DB`.
4. Visit your Worker's `https://YOUR-CATALOGUE-WORKER.YOUR-SUBDOMAIN.workers.dev/health`; `database:true` means the binding is visible. Then open `/v1/catalogue`. Initially, the response has empty `foods`, `workouts` and `exercises` arrays.
5. **Import Recomp's existing foods and workouts** so the new online database is not empty. In the repository checkout, run:

   ```bash
   node catalogue-worker/scripts/build-seed.mjs > catalogue-worker/seed-catalogue.sql
   npx wrangler d1 execute recomp-catalogue --remote --file=catalogue-worker/seed-catalogue.sql
   ```

   The generated seed contains the existing recipe estimates, FTS workout plans and their exercise entries. The `INSERT OR IGNORE` statements will not overwrite later edits made in D1. If your Cloudflare account is not configured for Wrangler, you can instead copy small batches of the SQL into the D1 Console. **Never paste account tokens into the app or repository.**
6. After v2.8 is published, connect the public `https://YOUR-CATALOGUE-WORKER.YOUR-SUBDOMAIN.workers.dev/v1/catalogue` address under **Recomp → Settings → Data & privacy**. Tap **Check for updates** after editing rows in Cloudflare.

Do not replace or redeploy the working `recomp-food-ai` meal scanner to do this. The online catalogue is a separate service.

## Adding/editing food without publishing an app update

In D1 → **Console**, this sample SQL adds a **test** meal (values are placeholders, not verified food nutrition):

```sql
INSERT INTO foods (id,name,category,aliases,default_grams,calories,protein,carbs,fat,fibre,source)
VALUES ('test-example-rice','Example rice bowl (TEST ONLY)','Rice & bowls','example bowl',300,150,4,29,2,1,'TEST nutritional values — replace before logging');
```

Now update that meal's values from Cloudflare when you have checked them:

```sql
UPDATE foods
SET name='Example rice bowl', calories=160, protein=5, carbs=29, fat=3,
    source='Personal recipe estimate', updated_at=CURRENT_TIMESTAMP
WHERE id='test-example-rice';
```

Hide it from future searches via `UPDATE foods SET active=0 WHERE id='test-example-rice';`. Historical logs remain untouched. Nutrition fields represent **values per 100 g**, not per serving.

## Adding a workout plan

Each plan's `items_json` is a JSON array of exercise definitions in the format `[exerciseId, name, sets, reps, kg, restSeconds, alternatives]`. Additional optional FTS metadata can be added later. Keep exercise IDs stable to preserve personal progression history.

```sql
INSERT INTO workout_plans(id,name,subtitle,items_json,sort_order)
VALUES(
 'starter-push-v1',
 'Starter upper body',
 'Example · 3 movements',
 '[["example-chest","Chest press",3,10,0,90,["Push-ups"]],["example-row","Seated row",3,12,0,90,["One-arm row"]],["example-press","Shoulder press",2,10,0,90,[]]]',
 10
);
```

For a later programme update, use `UPDATE workout_plans SET items_json='[...]',updated_at=CURRENT_TIMESTAMP WHERE id='starter-push-v1';`. Recomp sees the new version on refresh, and individual users explicitly decide whether to update imported plans.

For an exercise entry:

```sql
INSERT INTO exercises(id,name,muscle_group,equipment,guidance)
VALUES('example-row','Seated row','Back','Cable machine','Pull towards your torso with control.');
```

## Security / privacy

- **Do not** put tokens, Hugging Face credits, user measurements, diary entries, or personal photos in these public catalogue tables. Anyone can read the API; only authorised Cloudflare D1 administrators can edit the database.
- No secrets are needed in the Recomp browser for *reading* this catalogue. Never expose a D1 database API credential or Cloudflare account token to the app.
- The Worker is GET-only. It uses the official GitHub Pages origin for browser CORS. **CORS alone does not secure data**; all rows in this API must be non-sensitive and intentionally public.
- Keep stable IDs. Offline fallback uses the last successfully fetched catalogue, or the builtin recipes if the remote service has never connected.
- Manage content in D1 dashboard or with audited SQL migrations. An owner-only graphical content editor with authenticated writes can be a later phase.

## References

Cloudflare D1 docs:
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/d1/reference/migrations/
- https://developers.cloudflare.com/d1/platform/pricing/
