# Recomp v2.7 — private AI photo scanner (optional)

Recomp stays on GitHub Pages, with a free on-device food search/recognition fallback.
This feature is **not live until the owner deploys and configures the Worker**.
No OpenAI key is required to use other app features.

## Why a Worker?

The **OpenAI API secret must never be entered into a public GitHub Pages app**, checked into GitHub, embedded in browser JavaScript, or saved in localStorage. Use a Cloudflare Worker to keep it encrypted server-side. The free Workers tier can host the gateway, but OpenAI image analysis is **paid per usage**. Put a usage / project budget limit on your OpenAI account. A ChatGPT Plus subscription does **not** include API credits.

**For the current private beta:** one app-owner OpenAI key is stored in a Worker secret. To prevent the public worker URL being abused, a separate unpredictable `SCAN_ACCESS_TOKEN` controls its use. It should **not** equal your OpenAI key or an ordinary password. Do not share either token. This is a single-owner test flow, not a general multi-user BYOK vault. If you later invite friends, move to real per-user authentication, limits and provider-key storage rather than sharing the Worker token.

## One-time setup on your accounts

1. Create a Cloudflare account, open **Workers & Pages**, and deploy `photo-scan-worker/worker.js` (either using Wrangler from this folder or by pasting code into a new Worker).
2. Using Cloudflare Worker Settings → **Variables and Secrets**, add both as **Secret** (not plain variables):
   - `OPENAI_API_KEY`: your own OpenAI Platform API key, created on <https://platform.openai.com/api-keys>. Enter it **in Cloudflare only**, never in Recomp or ChatGPT.
   - `SCAN_ACCESS_TOKEN`: a separate random 32+ character secret passphrase, generated locally. Don't save it in this GitHub repository.
3. Worker should respond at `https://YOUR-WORKER.workers.dev/scan` (you may paste the public Worker root URL in Recomp; it appends `/scan`). The code only allows `https://t3ch-miner.github.io` as the browser origin. For another host, review and explicitly change `ALLOWED_ORIGIN` in `worker.js`.
4. In the Recomp **Nutrition → Photo meal** screen, choose a picture, enter the public Worker URL and your **separate Worker access token** and tap **AI Scan this photo**. Only then is a resized JPEG sent to your Worker and OpenAI.
5. Choose the right catalogue food for each suggested item, review cooked weights, then save. Unknown dishes are **not** assigned invented nutrition numbers.
6. If available, use an OpenAI usage budget / alert, protect and rotate your token, and consider Cloudflare rate limits as usage grows.

To deploy using Wrangler:

```sh
cd photo-scan-worker
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put SCAN_ACCESS_TOKEN
npx wrangler deploy
```

Wrangler prompts for secret values locally. **Never paste credentials into this chat, GitHub, an issue, or a public command line.**

## Privacy and reliability

- Recomp remembers **only the public Worker URL**, not the Worker access token or OpenAI secret. The access token remains in RAM until the Recomp page reloads or closes. It is never persisted to localStorage, IndexedDB or a file.
- Photos are neither automatically uploaded nor added to the diary. Manual and MobileCLIP on-device options still work without an OpenAI account or network.
- OpenAI only sees a compressed copy **after** you tap AI Scan. The request uses `store:false`; normal API operational data policies may still apply. Avoid photos containing people, addresses or private documents.
- The model identifies **possibly visible items**, not weighed portions or laboratory macro values. The image might not reveal oil, ghee, cooking methods or ingredients in curry. Ask the user to confirm every suggestion.
- The Worker is deliberately narrow: one POST `/scan` route, one allowed origin, private token required, request-size cap, no persistent photos, bounded output and uninformative upstream error messages.
- CORS origin restrictions do not authenticate callers. The **private token is required** and should be treated as sensitive.
- An actual end-to-end OpenAI call still requires your Worker deployment and API billing; GitHub Actions unit tests do **not** verify paid provider requests.

Provider docs: <https://developers.openai.com/api/docs/guides/images-vision>, <https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety>, <https://developers.cloudflare.com/workers/configuration/secrets/>.
