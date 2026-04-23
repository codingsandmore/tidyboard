# Tidyboard AI — Bring Your Own Key (BYOK)

## Policy

**Tidyboard never pays for AI.** All AI features use keys that users provide themselves. Keys are stored client-side in `localStorage` and are never sent to Tidyboard's servers.

## How keys are stored

Keys are saved in `localStorage` under the key `tb-ai-keys` as a JSON object:

```json
{
  "openai": "sk-...",
  "anthropic": "sk-ant-...",
  "google": "AIza..."
}
```

An AI-enabled flag is stored under `tb-ai-enabled` (`"true"` / `"false"`).

Both values are written and read exclusively in the browser. The Tidyboard Go backend never sees them.

## Why client-side only?

- **Privacy**: your API key is never transmitted to any server except the AI provider you choose.
- **Cost control**: you pay your own AI provider at your own usage rate; Tidyboard incurs no AI cost.
- **Simplicity**: no server-side secrets management required.

## Supported providers

| Provider  | Model (default)          | Key format   | Get a key |
|-----------|--------------------------|--------------|-----------|
| OpenAI    | `gpt-4o-mini`            | `sk-...`     | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic | `claude-haiku-20240307`  | `sk-ant-...` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| Google    | `gemini-1.5-flash`       | `AIza...`    | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |

## Configuring keys in the app

1. Open **Settings** (gear icon or `/settings`).
2. Find the **AI & Automations** card.
3. Toggle AI features **Enabled**.
4. Paste your API key(s) into the password-masked inputs.
5. Click **Test** to verify connectivity — a tiny "Hello" message is sent to the provider.
6. Click **Clear** to remove a key.

## Features that use AI

### Meal plan suggestions

The **"AI suggest"** button on the Meal Plan screen calls your configured AI provider with a prompt listing your saved recipes and asks for 7 dinner suggestions for the week. The response is applied to empty dinner slots on the plan.

- Located: `src/components/screens/recipes.tsx` → `MealPlan`
- Provider: whichever provider has a key configured (OpenAI preferred, then Anthropic, then Google)
- Prompt: asks for JSON `[{day, recipe_id, reason}]`

## Security notes

- **Scope your keys**: create API keys scoped to specific permissions (e.g., chat completions only) where the provider allows it. Avoid using "full access" keys.
- **Keys are not encrypted** in `localStorage` — anyone with physical access to your browser can read them. Use a private browser session on shared devices.
- **Rotate keys** periodically, especially if you share a device.
- **Rate-limit** keys at your provider dashboard to control unexpected costs.
- Never paste keys into untrusted third-party browser extensions.

## Code locations

| File | Purpose |
|------|---------|
| `src/lib/ai/ai-keys.ts` | `useAIKeys()` hook + localStorage helpers |
| `src/lib/ai/client.ts` | `callOpenAI`, `callAnthropic`, `callGoogle`, `callAI` dispatcher |
| `src/lib/ai/index.ts` | Barrel re-export |
| `src/app/settings/ai-section.tsx` | Settings UI card |
| `src/components/screens/recipes.tsx` | MealPlan AI suggest integration |

## Tests

```
src/lib/ai/ai-keys.test.ts       — key store, setKey/clearKey/clearAll, fallback
src/lib/ai/client.test.ts        — fetch mocks, request shape, typed AIError
src/app/settings/ai-section.test.tsx — render, enter key, Test button, clear
```
