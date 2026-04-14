const POLESTAR_BASE = "https://api.polestar-production.com"

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)

  const isDev =
    origin?.startsWith("http://localhost") ||
    origin?.startsWith("http://127.0.0.1")
  const isAllowed =
    isDev || (origin !== null && allowedOrigins.includes(origin))
  const allowOrigin =
    isAllowed && origin ? origin : (allowedOrigins[0] ?? "*")

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type, authorization, x-client-info, apikey",
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const apiKey = Deno.env.get("POLESTAR_API_KEY")
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Proxy misconfigured: missing API key secret" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const url = new URL(req.url)
  const upstreamPath = url.searchParams.get("path")
  if (!upstreamPath) {
    return new Response(
      JSON.stringify({ error: "Missing required query param: path" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const forwardedParams = new URLSearchParams()
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "path") forwardedParams.append(key, value)
  }

  const paramStr = forwardedParams.toString()
  const upstreamUrl = `${POLESTAR_BASE}${upstreamPath}${paramStr ? `?${paramStr}` : ""}`

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: ["POST", "PUT", "PATCH"].includes(req.method) ? req.body : undefined,
    })

    const contentType =
      upstreamRes.headers.get("content-type") ?? "application/json"
    const body = await upstreamRes.text()

    return new Response(body, {
      status: upstreamRes.status,
      headers: { ...corsHeaders, "Content-Type": contentType },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: "Bad gateway", detail: message }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})
