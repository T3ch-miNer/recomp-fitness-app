# Import all 41 Recomp FTS workouts into the existing Cloudflare D1 database

This setup branch starts from the **current production `main`** and includes all
three FTS workout collections (plans 1–4, 5–15 and 16–41). It does not
change the live Recomp app or the working Hugging Face photo scanner.

**Prerequisite:** Your existing catalogue Worker already returns
`{"ok":true,"database":true}` at `/health` and
`{"version":1,"foods":[],"workouts":[],"exercises":[]}` at `/v1/catalogue`.
These responses confirm the D1 binding and tables work.

## GitHub Codespaces — from repository root

```bash
git fetch origin
git switch setup/cloudflare-d1-all-41-workouts-20261027
node catalogue-worker/scripts/build-seed.mjs > catalogue-worker/seed-catalogue.sql
npx wrangler whoami
npx wrangler d1 execute recomp-catalogue --remote --file=catalogue-worker/seed-catalogue.sql
```

The generator prints the total number of foods, **41** FTS workouts and
exercise entries to the terminal. The seed SQL contains no personal records.
If Wrangler has not been authorised in this Codespace, run
`npx wrangler@latest login --device --browser=false` and follow the terminal
verification URL. Never share an OAuth callback code, access token or secret.

Verify after import:

```bash
npx wrangler d1 execute recomp-catalogue --remote --command "SELECT 'foods' AS type, COUNT(*) AS total FROM foods UNION ALL SELECT 'workouts', COUNT(*) FROM workout_plans UNION ALL SELECT 'exercises', COUNT(*) FROM exercises;"
```

Or open your existing public Worker at
https://recomp-catalogue.rahul-dbz95.workers.dev/v1/catalogue
and check the three lists are populated. Note that the Worker caps
catalogue results, so the SQL count is the reliable full count.

The seed uses `INSERT OR IGNORE`, so rerunning it will not overwrite
rows you've already edited in D1. Historical logged meals and workouts
are unaffected. The generated `seed-catalogue.sql` file is temporary;
do **not commit** it to GitHub. In Codespaces, keep it untracked.

This branch is only the D1 import helper. The main app's online
catalogue interface is still in a **separate, unpublished** draft PR.
