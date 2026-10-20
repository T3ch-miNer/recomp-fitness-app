# Recomp v2.7 — optional Hugging Face meal-photo scanner

Recomp remains on **free GitHub Pages**. AI detection is entirely optional; manual search and the existing offline/wasm photo model still work without this setup.

**Status:** Implemented in a development pull request, but **not yet published or tested against a real Hugging Face account**. You must deploy and privately configure the Worker before we can complete a real food-photo test.

## Why Hugging Face + a Cloudflare Worker?

For a personal beta, Hugging Face Inference Providers lets you experiment with a hosted multimodal model without an OpenAI API subscription. Its current free allowance is **$0.10 per month** in inference credits (subject to change). Extra usage may require payment. The Cloudflare free Worker tier is suitable for a small personal proxy.

**Update after the first real photo test:** Qwen3-VL-4B-Instruct returned a provider/model rejection for two valid meal photos. Recomp now checks the **live Hugging Face vision-model catalogue** before each AI scan, prefers compatible affordable models such as Qwen2.5-VL-3B-Instruct when available, and can try one alternative on a model-routing rejection. The actual model used is shown in test results. Provider availability is not guaranteed and the free allowance is NOT unlimited.

Your **Hugging Face access token belongs only in a Cloudflare Worker encrypted secret**. Never paste it into the public Recomp app or GitHub. The Recomp browser only uses a separate personal Worker access token held **in RAM**, with the public Worker endpoint saved for convenience. Don't share either private token.

## Setup

1. Create free accounts if needed at <https://huggingface.co> and <https://dash.cloudflare.com/>.
2. In Hugging Face, open **Settings → Access Tokens → New token** and create a fine-grained token with the **Inference Providers** permission. Save the token privately.
3. In Cloudflare **Workers & Pages**, create a Worker named `recomp-photo-scan`. Replace its default JavaScript with this repository's `photo-scan-worker/worker.js`, then deploy. Or use Wrangler.
4. In the Worker's **Settings → Variables and Secrets**, create two **Secret** entries:
   - `HF_TOKEN`: the Hugging Face fine-grained inference token, created at <https://huggingface.co/settings/tokens>.
   - `SCAN_ACCESS_TOKEN`: a **different** randomly generated private token of 32 or more characters. Do not use the Hugging Face token as this token. Do not check either token into GitHub.
5. Recomp's public Worker address is already preconfigured as `https://recomp-food-ai.rahul-dbz95.workers.dev/scan` (provided by the app owner). This address is public, and you can still change it in the app if you later redeploy.
6. After the scanner has been reviewed and published, open **Recomp → Nutrition → Photo meal**, choose a photo, confirm the prefilled Worker URL, enter **only your separate Worker access token** (not the Hugging Face token), and tap **AI Scan this photo**.
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

## Test before publishing Recomp v2.7

The owner has deployed `recomp-food-ai` and confirmed that both Worker secrets exist. To test the actual Hugging Face model **without touching the live Recomp app**:

1. In Cloudflare, select **Workers & Pages → recomp-food-ai → Edit code**.
2. Replace the editor contents with the **latest** [photo-scan-worker/worker.js](./photo-scan-worker/worker.js) from the v2.7 draft and click **Deploy**. The latest code includes a self-contained `/test` page; older deployments will return `Not found` for `/test`.
3. Open **<https://recomp-food-ai.rahul-dbz95.workers.dev/test>** in a normal browser tab. The root path `/` may still say `{"error":"Not found"}` — that is expected.
4. Enter only your separate `SCAN_ACCESS_TOKEN` value in the password box. **Never enter `HF_TOKEN` in a browser or share it in chat.** Click **Check Hugging Face vision connection (free)** first. The test page then lists the chosen currently available image-capable model, or reports a token/provider error without sending a photograph.
5. Once the connection check succeeds, choose a non-sensitive meal photo (preferably rice, dal and/or roti), then click **Test food recognition**. You authorise sending a resized copy to your Worker and Hugging Face by pressing that button.
6. You should see a list of proposed foods, visible evidence and uncertainty markers. A response such as `credits exhausted`, `token needs updating` or `model not available` is useful troubleshooting information—do not send credentials to anybody.
7. The owner's two reference photos include a Korean rice bowl (beef, egg, corn, edamame, sprouts and greens) and masala dosa with potato sabzi and green chutney. Report whether the suggestions match these visible items, or share only the displayed error text (hide credentials and personal information).

The `/test` page performs no writes to Recomp's storage or diaries and stores no credentials. Delete or disable the test page after verification if you prefer a smaller public footprint. It requires the separate private access token for actual inference.

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
