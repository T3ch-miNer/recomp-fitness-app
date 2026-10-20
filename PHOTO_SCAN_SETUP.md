# Recomp v2.7 — optional Hugging Face meal-photo scanner

Recomp remains on **free GitHub Pages**. AI detection is entirely optional; manual search and the existing offline/wasm photo model still work without this setup.

**Status:** Implemented in a development pull request, but **not yet published or tested against a real Hugging Face account**. You must deploy and privately configure the Worker before we can complete a real food-photo test.

## Why Hugging Face + a Cloudflare Worker?

For a personal beta, Hugging Face Inference Providers lets you experiment with a hosted multimodal model without an OpenAI API subscription. Its current free allowance is **$0.10 per month** in inference credits (subject to change). Extra usage may require payment. The Cloudflare free Worker tier is suitable for a small personal proxy.

We start with **Qwen/Qwen3-VL-4B-Instruct**, listed with Featherless AI as an inference provider. Provider/model availability and speed can change; a real test is required before assuming this combination works for your meal photos. This is NOT an unlimited free service.

Your **Hugging Face access token belongs only in a Cloudflare Worker encrypted secret**. Never paste it into the public Recomp app or GitHub. The Recomp browser only uses a separate personal Worker access token held **in RAM**, with the public Worker endpoint saved for convenience. Don't share either private token.

## Setup

1. Create free accounts if needed at <https://huggingface.co> and <https://dash.cloudflare.com/>.
2. In Hugging Face, open **Settings → Access Tokens → New token** and create a fine-grained token with the **Inference Providers** permission. Save the token privately.
3. In Cloudflare **Workers & Pages**, create a Worker named `recomp-photo-scan`. Replace its default JavaScript with this repository's `photo-scan-worker/worker.js`, then deploy. Or use Wrangler.
4. In the Worker's **Settings → Variables and Secrets**, create two **Secret** entries:
   - `HF_TOKEN`: the Hugging Face fine-grained inference token, created at <https://huggingface.co/settings/tokens>.
   - `SCAN_ACCESS_TOKEN`: a **different** randomly generated private token of 32 or more characters. Do not use the Hugging Face token as this token. Do not check either token into GitHub.
5. Your public Worker address will look like `https://recomp-photo-scan.YOUR-SUBDOMAIN.workers.dev`. The Recomp UI accepts the root address and appends `/scan` automatically.
6. After the scanner has been reviewed and published, open **Recomp → Nutrition → Photo meal**, choose a photo, provide the **public Worker URL** and the **separate Worker access token**, and tap **AI Scan this photo**.
7. Review the food items suggested by the model. Tap **Find food** to select a corresponding food from Recomp's existing catalogue, **correct the cooked weight**, and save only after review.

A CLI alternative, if you already use Wrangler:

```sh
cd photo-scan-worker
npx wrangler login
npx wrangler secret put HF_TOKEN
npx wrangler secret put SCAN_ACCESS_TOKEN
npx wrangler deploy
```

Wrangler prompts for secrets privately. **Do not paste secret values into this chat, GitHub, screenshots, or shell commands.** The public Worker URL (without any token) is safe to share.

## Privacy, costs and limitations

- A photo is uploaded to your Cloudflare Worker and forwarded to the selected Hugging Face Inference Provider **only after** tapping AI Scan. A resized JPEG is used. A photo is not stored in your Recomp diary by default.
- The app only persists the public Worker URL. It does **not** persist `HF_TOKEN` or `SCAN_ACCESS_TOKEN`; the separate access token stays in RAM for the current app session.
- Browsers send the separate Worker access token for authentication; it is distinct from the HF token and should still be kept private. The Worker permits only the official GitHub Pages origin for browser requests, but **CORS is not authentication**.
- The Hugging Face provider may log or retain request data according to its policies. Avoid faces, documents, addresses or other sensitive content in meal photos; review your provider's terms.
- Vision-language models may confuse curries and hidden ingredients. They cannot accurately weigh food or infer added oil/ghee. Each model output is clearly a *suggestion*. Nutrition is calculated locally from **foods and gram amounts you confirm**.
- The model can return invalid JSON, lack available provider capacity or exhaust your monthly credits. In those situations the app should display an error and still allow manual/offline logging.
- The Worker does not write meal history, fitness records, photos or backups. No IndexedDB migration or reset is part of this feature.
- GitHub Actions tests validate the API request shape and error handling with mocks. They **cannot** verify a real Hugging Face scan until the account and secrets are configured.

Docs: <https://huggingface.co/docs/inference-providers/en/pricing> · <https://huggingface.co/docs/inference-providers/tasks/image-text-to-text> · <https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct> · <https://developers.cloudflare.com/workers/configuration/secrets/>.
