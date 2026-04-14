const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:54321"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", params, body }: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}/functions/v1/vessel-tracker-proxy`)
  url.searchParams.set("path", path)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) {
        url.searchParams.set(k, String(v))
      }
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const err = (await res.json()) as { message?: string; error?: string }
      message = err.message ?? err.error ?? message
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}
