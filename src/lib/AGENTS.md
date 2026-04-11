<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# lib

## Purpose
The data layer: API client, TanStack Query hooks for every Pole Star API endpoint, and shared utilities. This is the only place that calls `apiFetch` — components never call the API directly.

## Key Files

| File | Description |
|------|-------------|
| `api.ts` | `apiFetch<T>()` — base fetch wrapper; reads the API key from `localStorage`, routes all requests through the local proxy at `/proxy?path=…`, throws `ApiError` on non-2xx. Also exports `getApiKey`/`setApiKey` helpers. |
| `hooks.ts` | All TanStack Query `useQuery` hooks: `useVesselSearch`, `useVesselCharacteristics`, `useAISPositions`, `usePortCalls`, `useZoneEvents`, `useAISGaps`, `useSTSPairings`, `useDiscrepancies`, `usePSC`. Each hook handles pagination via `fetchAllPages`. |
| `utils.ts` | Shadcn `cn()` helper — merges Tailwind class names with `clsx` + `tailwind-merge` |

## For AI Agents

### Working In This Directory
- `fetchAllPages` handles multi-page responses automatically (page size 500); for positions the page size is 100 — do not change these without checking API limits
- All event-data hooks accept `(imo, from, to, fetchKey)` — `fetchKey` must be `> 0` for the query to run (`enabled: imo !== null && fetchKey > 0`)
- `staleTime: 0` on all event queries means data is always re-fetched when `fetchKey` increments; `useVesselSearch` uses `staleTime: 60_000` to avoid excessive search requests
- `ApiError` carries an HTTP `.status` — use it to distinguish 401 (no key) from 404/5xx in UI error handling

### Common Patterns
```ts
// All event hooks follow the same signature
const { data, isFetching, isError, error } = usePortCalls(imo, from, to, fetchKey)
// data is PortCallEvent[] | undefined
```

### Testing Requirements
- Changes to `hooks.ts` should be verified against `sample_data/` fixtures to confirm the response-shape parsing is correct

## Dependencies

### Internal
- `src/types/index.ts` — all response/event types
- `src/lib/api.ts` — base fetch

### External
- `@tanstack/react-query` — query management
- `date-fns` — ISO date formatting helpers (`toUtcIso`)

<!-- MANUAL: -->
