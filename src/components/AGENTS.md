<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# components

## Purpose
All React UI components. The top-level files are feature components assembled into the app shell by `App.tsx`. The `ui/` subdirectory contains low-level, generic Shadcn/ui primitives that the feature components compose.

## Key Files

| File | Description |
|------|-------------|
| `DataOrchestrator.tsx` | Headless component (renders `null`) that orchestrates all data fetching hooks and normalises raw API events into `ActivityEvent[]` for both the map (`setEvents`) and Gantt view (`setGanttEvents`). Also exports `useDataStatus()` for loading/error/count state. |
| `MapView.tsx` | Leaflet map with AIS track polyline (colour-coded by nav status), direction arrows, event markers (custom SVG DivIcons per category), AIS gap dashed lines, and a legend. Supports street/satellite tile toggle. Cross-links with `highlightedEventId`. |
| `GanttTimeline.tsx` | Custom canvas-div Gantt chart (no external library). Renders paired arrival→departure spans as coloured bars and point events as tick marks. Rows are split by port event sub-type (Port Area / Port / Berth). Cross-links with `highlightedEventId`. |
| `EventsTimelineSidepanel.tsx` | Right-side collapsible panel with a text-search input, category filter chips, and a chronological event list grouped by UTC date. Each `EventCard` shows metadata and clicking cross-links via `highlightedEventId`. |
| `VesselSearch.tsx` | Combobox-style vessel search input; queries `useVesselSearch` with debouncing; shows dropdown results with vessel name, IMO, flag, and type. |
| `VesselCard.tsx` | Displays characteristics of the selected vessel (name, IMO, MMSI, flag, type, gross tonnage, etc.) using `useVesselCharacteristics`. |
| `DateRangePicker.tsx` | Date range picker for the `from`/`to` window used in all data fetches, plus a "Fetch" button that calls `triggerFetch()`. |
| `ErrorBoundary.tsx` | React class `ErrorBoundary` that catches render errors in child subtrees and shows a labelled fallback instead of a blank screen. |
| `Toaster.tsx` | Toast notification system — `useToast()` hook returns a `toast(message, type)` function; `<Toaster>` renders the active toasts. |
| `theme-provider.tsx` | `ThemeProvider` context that applies `"light"` / `"dark"` / `"system"` class to `<html>` and exposes `useTheme()`. |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `ui/` | Shadcn/ui primitive components (see `ui/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `DataOrchestrator` must remain a headless component placed **outside** the main layout tree (placed before the outer `div` in `App.tsx`) so its `useEffect` runs regardless of layout re-renders
- The `fetchKey` pattern: `DataOrchestrator` waits until `fetchKey > 0` before processing any data; map and Gantt check `fetchKey === 0` to show empty states instead of "no data" messages
- `highlightedEventId` is the cross-linking mechanism — clicking a map marker, a Gantt bar, or an event card all call `setHighlightedEventId(id)` (or `null` to deselect); all three views read this to apply visual emphasis
- Do not add new API calls directly in components — add a hook to `src/lib/hooks.ts` and call it from `DataOrchestrator` or its own component

### Testing Requirements
- After changes to `DataOrchestrator`, verify event counts in the sidebar data-status bar match expectations
- After map changes, verify markers appear, click-to-highlight works, and the legend reflects active filters
- After Gantt changes, verify bars and tick marks render at correct positions and highlight correctly

### Common Patterns
- All three main views read from `useAppStore` — prefer selectors over full-store subscriptions
- `fmtUtc(iso)` utility (defined locally in `MapView`, `GanttTimeline`) formats ISO strings as `"YYYY-MM-DD HH:mm UTC"` — consider extracting to `src/lib/utils.ts` if needed in more places
- `ErrorBoundary` wraps both `MapView` and `GanttTimeline` in `App.tsx` to prevent one failing view from crashing the whole app

## Dependencies

### Internal
- `src/store/useAppStore.ts` — all shared state
- `src/lib/hooks.ts` — TanStack Query data hooks
- `src/lib/api.ts` — `getApiKey`
- `src/config/constants.ts` — `EVENT_COLOURS`
- `src/types/index.ts` — `ActivityEvent`, `EventCategory`, etc.
- `src/components/ui/` — all primitives

### External
- `react-leaflet` / `leaflet` — map rendering
- `date-fns` — date formatting in sidepanel
- `lucide-react` — icons throughout

<!-- MANUAL: -->
