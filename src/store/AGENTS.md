<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# store

## Purpose
Global client state managed by a single Zustand store. Acts as the single source of truth for everything that must be shared across the three main views (sidebar, map, Gantt timeline, events sidepanel): selected vessel, date range, fetch trigger, event category filters, the resolved event lists, and the cross-component highlighted-event ID.

## Key Files

| File | Description |
|------|-------------|
| `useAppStore.ts` | Zustand store definition — `AppState` interface, initial values, and all actions |

## For AI Agents

### Working In This Directory
- Import and use `useAppStore` with a selector to avoid unnecessary re-renders:
  ```ts
  const selectedVessel = useAppStore((s) => s.selectedVessel)
  ```
- `fetchKey` is a monotonically incrementing counter — calling `triggerFetch()` bumps it, which re-enables all TanStack Query hooks and forces a data refresh
- `highlightedEventId` drives the cross-linking between map markers, Gantt bars, and the events sidepanel — clicking any one of the three sets/clears this value
- `events` = flat list of individual map markers (one per raw API event); `ganttEvents` = paired arrival→departure spans for the Gantt view — both are set by `DataOrchestrator` after all fetches complete
- `filters` is a `Record<EventCategory, boolean>` — toggling a category immediately hides/shows it in all three views without re-fetching

### Common Patterns
- `DEFAULT_FILTERS` enables all six categories on first load
- `DEFAULT_VESSEL_STATUS_FILTER` = `"In Service/Commission"` — can be toggled off to search all vessel statuses
- The API key is persisted to `localStorage` via `saveApiKey` / `getApiKey` in `src/lib/api.ts`; the store reads the initial value from there on mount

## Dependencies

### Internal
- `src/types/index.ts` — `VesselSearchResult`, `FilterState`, `EventCategory`, `ActivityEvent`
- `src/lib/api.ts` — `getApiKey`, `setApiKey`

### External
- `zustand` 5.x
- `date-fns` — `subDays`, `startOfDay` for default date range

<!-- MANUAL: -->
