<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# proxy

## Purpose
A minimal Node.js/Express reverse proxy that forwards requests from the Vite dev server to the Pole Star Global production API (`https://api.polestar-production.com`). It exists solely to solve the browser CORS restriction — the API does not set permissive CORS headers, so all requests must be routed through this server-side proxy.

## Key Files

| File | Description |
|------|-------------|
| `index.js` | Express server with a single `/proxy` catch-all route and a `/health` endpoint |
| `package.json` | Dependencies: `express`, `cors`, `node-fetch` |
| `package-lock.json` | Locked dependency tree for reproducible installs |

## For AI Agents

### Working In This Directory
- Start with `node index.js` (or `npm start` if a start script is added) — listens on port 3000 by default
- The `PORT` env var overrides the default port
- The frontend calls `GET /proxy?path=/some/api/endpoint&param1=value` — all query params except `path` are forwarded upstream
- The `api-key` header is passed through from the browser request to the upstream API
- This is a dev/demo tool — it has no auth, rate limiting, or logging beyond `console.error`

### Common Patterns
- All upstream paths are prefixed with `https://api.polestar-production.com`
- `node-fetch` v2 (CommonJS) is used — do not upgrade to v3+ (ESM only) without also converting to `"type": "module"`

## Dependencies

### External
- `express` — HTTP server framework
- `cors` — CORS middleware (allows all origins)
- `node-fetch` — HTTP client for upstream requests

<!-- MANUAL: -->
