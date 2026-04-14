# Migration Plan: Replace Node.js Proxy with Supabase Edge Function

## Context

The current architecture uses a Node/Express proxy deployed on Render to work around CORS restrictions when calling `https://api.polestar-production.com` from the browser. This creates an operational dependency (a separate Render service) and leaves the Pole Star API key in the browser (localStorage).

**Goal:** Replace the proxy with a Supabase Edge Function deployed to the existing "PS Labs - Prototypes (free tier)" Supabase project. Move the Pole Star API key to a server-side Supabase secret, eliminating it from the browser entirely. Convert Render's role from proxy host to static site host. Delete the `proxy/` folder.

**Decisions:**
- API key strategy: **server secret** (one key in Supabase, never in browser)
- Frontend hosting: **render.com** (static site)
- Existing proxy: **delete entirely**
- Supabase CLI: already installed

---

## Trade-offs & Risks

| Topic | Trade-off |
|---|---|
| Server secret (shared key) | Simpler UX, but one leaked/exhausted key affects everyone. No per-user quota isolation. |
| Edge function cold starts | Supabase edge functions may add ~100–200 ms on first request in a region. Render free tier also cold-starts, so this is a wash in practice. |
| Deno runtime | Minor API differences vs Node (e.g., `Deno.env.get` instead of `process.env`). The proxy logic is simple enough that this is negligible. |
| JWT verification disabled | `--no-verify-jwt` flag required at deploy time since there is no Supabase Auth in use. This means anyone who knows the function URL can call it. Acceptable for a prototype but worth noting. |
| CORS origin | We don't know the final render.com URL before deploying. Plan uses an `ALLOWED_ORIGINS` env variable so it can be set after the site is live. During dev, `localhost:5173` is always allowed. |
| Multi-prototype isolation | Function name `vessel-tracker-proxy` is prototype-scoped. Future prototypes add their own functions to the same Supabase project. Secret name `POLESTAR_API_KEY` is currently shared — if future prototypes use different Pole Star keys, they'd need namespaced secrets (e.g., `VESSEL_TRACKER_POLESTAR_API_KEY`). |

---

## Implementation Steps

### 1. Initialise Supabase in the repo

```bash
supabase init           # creates supabase/ directory at repo root
supabase link           # links to "PS Labs - Prototypes" project (interactive)
```

Creates: `supabase/config.toml`

---

### 2. Store the API key as a Supabase secret

```bash
supabase secrets set POLESTAR_API_KEY=<your-key>
```

Set CORS origins after the render.com URL is known:

```bash
supabase secrets set ALLOWED_ORIGINS=https://vessel-activity-tracker.onrender.com
```

---

### 3. Scaffold and implement the edge function

```bash
supabase functions new vessel-tracker-proxy
```

Creates: `supabase/functions/vessel-tracker-proxy/index.ts`

**Full implementation:**

```typescript
const POLESTAR_BASE = "https://api.polestar-production.com";

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const isDev =
    origin?.startsWith("http://localhost") ||
    origin?.startsWith("http://127.0.0.1");
  const isAllowed =
    isDev || (origin !== null && allowedOrigins.includes(origin));
  const allowOrigin =
    isAllowed && origin ? origin : (allowedOrigins[0] ?? "*");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type, authorization, x-client-info, apikey",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const apiKey = Deno.env.get("POLESTAR_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Proxy misconfigured: missing API key secret" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const url = new URL(req.url);
  const upstreamPath = url.searchParams.get("path");
  if (!upstreamPath) {
    return new Response(
      JSON.stringify({ error: "Missing required query param: path" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const forwardedParams = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "path") forwardedParams.append(key, value);
  }

  const paramStr = forwardedParams.toString();
  const upstreamUrl = `${POLESTAR_BASE}${upstreamPath}${paramStr ? `?${paramStr}` : ""}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: ["POST", "PUT", "PATCH"].includes(req.method) ? req.body : undefined,
    });

    const contentType =
      upstreamRes.headers.get("content-type") ?? "application/json";
    const body = await upstreamRes.text();

    return new Response(body, {
      status: upstreamRes.status,
      headers: { ...corsHeaders, "Content-Type": contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Bad gateway", detail: message }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

---

### 4. Deploy the edge function

```bash
supabase functions deploy vessel-tracker-proxy --no-verify-jwt
```

The `--no-verify-jwt` flag is required since there is no Supabase Auth.

Deployed URL: `https://<project-ref>.supabase.co/functions/v1/vessel-tracker-proxy`

---

### 5. Update `src/lib/api.ts`

- Remove `API_KEY_STORAGE_KEY`, `getApiKey()`, `setApiKey()` exports
- Remove the API key guard (`if (!apiKey) throw new ApiError(401, ...)`)
- Remove the `"api-key"` header from the fetch call
- Change the fetch URL from `${BASE_URL}/proxy` → `${BASE_URL}/functions/v1/vessel-tracker-proxy`
- Update `.env.example`: `VITE_API_BASE_URL=https://<project-ref>.supabase.co`

---

### 6. Remove the API key UI

Since the key is now a server secret, the API key input in the top bar is obsolete.

- Find and remove the API key input component (search for `psg-api-key` or `setApiKey` in `src/components/`)
- Remove any related Zustand store state in `src/store/useAppStore.ts`
- Remove conditional rendering gated on "API key is set"
- Remove the `ApiError` case for "No API key set"

---

### 7. Replace `render.yaml`

Switch from the Node proxy service to a static site:

```yaml
services:
  - type: web
    name: vessel-activity-tracker
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_BASE_URL
        value: https://<project-ref>.supabase.co
```

---

### 8. Delete `proxy/`

Remove the entire `proxy/` directory from the repo. Also delete the Render "polestar-proxy" web service from the Render dashboard (manual step).

---

### 9. Update documentation

- `AGENTS.md` (root): remove proxy references, add Supabase/edge function notes
- `docs/PRD.md`: update the proxy/deployment section

---

## Critical Files

| File | Change |
|---|---|
| `supabase/functions/vessel-tracker-proxy/index.ts` | **New** — edge function implementation |
| `supabase/config.toml` | **New** — created by `supabase init` |
| `src/lib/api.ts` | **Update** — remove API key handling, update proxy URL |
| `src/components/` (top bar) | **Update** — remove API key input UI |
| `src/store/useAppStore.ts` | **Update** — remove API key state if present |
| `render.yaml` | **Replace** — switch from Node proxy service to static site |
| `.env.example` | **Update** — new `VITE_API_BASE_URL` value |
| `proxy/` (entire folder) | **Delete** |

---

## Verification

1. **Local dev against deployed edge function:**
   - Set `VITE_API_BASE_URL=https://<project-ref>.supabase.co` in `.env`
   - Run `npm run dev`, search for a vessel — should work without any API key UI
   - Check DevTools Network tab: requests go to `supabase.co`, no `api-key` header visible from browser

2. **Direct function test (curl):**
   ```bash
   curl "https://<project-ref>.supabase.co/functions/v1/vessel-tracker-proxy?path=/vessel-insights/v1/vessel-search&q=test"
   ```

3. **CORS validation:**
   - Deploy static site to render.com
   - Set `ALLOWED_ORIGINS` secret to the render.com URL
   - Confirm no CORS errors in the browser console

4. **Proxy removal confirmed:** No references to `localhost:3000` or `/proxy` remain in the source.
