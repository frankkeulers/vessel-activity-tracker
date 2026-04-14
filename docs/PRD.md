# Vessel Activity Tracker — PRD

A standalone React SPA that lets analysts enter an API key, search for a vessel, set a time range, and visualise all activity events on an interactive map and a hierarchical Gantt-style timeline, with all Pole Star API calls proxied through a Node/Express service hosted on Render.

---

## 1. Overview

| Item               | Detail                                                       |
| ------------------ | ------------------------------------------------------------ |
| Platform           | React SPA (Vite + TypeScript)                                |
| Audience           | Internal prototype / analysts                                |
| Auth               | API key only (stored in `localStorage`, forwarded via proxy) |
| Pole Star Base URL | `https://api.polestar-production.com`                        |
| Proxy              | Node/Express on Render (free web service tier)               |
| Design system      | Extracted from `meridia-port-berth-analytics-design`         |

---

## 2. Design System (from meridia project)

| Token           | Value                                                     |
| --------------- | --------------------------------------------------------- |
| Fonts           | `Inter Variable` (body), `Unbounded Variable` (display)   |
| Primary palette | PSG Green scale (`#EAFAF9` → `#041417`)                   |
| Accent palette  | PSG Orange scale (`#FFFDFA` → `#72210A`)                  |
| Radius          | `0.625rem` base, scaled variants (sm → 4xl)               |
| Themes          | Light + Dark modes; green/orange accent toggle            |
| Component style | shadcn/ui `radix-nova`, `mist` base colour, CSS variables |
| Tailwind        | v4 (`@tailwindcss/vite`), `tw-animate-css`                |

Copy verbatim from meridia:

- `src/index.css` (full design token file)
- `components.json` (shadcn config, `radix-nova` style)
- `src/components/theme-provider.tsx` (light/dark + accent toggle)
- All `src/components/ui/*.tsx` shadcn components
- `src/lib/utils.ts`

---

## 3. API Endpoints Used

| Group            | Endpoint                                                     | Purpose                                |
| ---------------- | ------------------------------------------------------------ | -------------------------------------- |
| Vessel Insights  | `GET /vessel-insights/v1/vessel-search`                      | Search by name / IMO / MMSI / callsign |
| Vessel Insights  | `GET /vessel-insights/v1/vessel-characteristics/:imo`        | Vessel detail card                     |
| Vessel Positions | `POST /unified-position/v1/positions`                        | AIS track points over time range       |
| Voyage Insights  | `GET /voyage-insights/v1/vessel-port-calls/:imo`             | Port call events                       |
| Voyage Insights  | `GET /voyage-insights/v1/vessel-zone-and-port-events/:imo`   | Zone entry/exit events                 |
| Voyage Insights  | `GET /voyage-insights/v1/vessel-ais-reporting-gaps/:imo`     | AIS gap events                         |
| Voyage Insights  | `GET /voyage-insights/v1/vessel-sts-pairings/:imo`           | Ship-to-ship pairing events            |
| Voyage Insights  | `GET /voyage-insights/v1/vessel-positional-discrepancy/:imo` | Positional discrepancy events          |
| Voyage Insights  | `GET /voyage-insights/v1/vessel-port-state-control/:imo`     | Port State Control inspections         |

---

## 4. Render/Express Proxy

A lightweight **Node/Express** server lives in the `proxy/` subdirectory and is deployed as a **Render free web service**.

- Single route that receives requests from the React app with `?path=/voyage-insights/v1/...`
- Reads `api-key` from request header and forwards it upstream
- Forwards the full request (method, body, remaining query params) to `https://api.polestar-production.com`
- Returns the upstream response
- CORS headers set to allow the SPA origin
- Deployed via `render.yaml` at the project root (no auth — internal prototype)

React app sends requests to:

```
${VITE_API_BASE_URL}/proxy?path=<upstream-path>&<query-params>
```

The Render service URL is stored as a `.env` variable (`VITE_API_BASE_URL`). The user's Pole Star API key is stored in `localStorage` and forwarded in the `api-key` header.

---

## 5. App Pages & Layout

### 5.1 Top Bar (persistent)

- App name / logo
- API key input (password field) — saved to `localStorage`, inline validation (test call)
- Theme toggle (light/dark) — same pattern as meridia `ThemeProvider`

### 5.2 Left Sidebar

- **Vessel search**: text input → autocomplete dropdown (name / IMO / MMSI / callsign)
- **Selected vessel card**: name, type, flag, IMO, MMSI
- **Date range picker**: start + end datetime UTC, default last 30 days
- **Fetch button** with loading state
- **Filter chips**: toggle visibility of each event category on map + Gantt

### 5.3 Map Panel (upper main area)

- **Library**: Leaflet + `react-leaflet` + OpenStreetMap tiles (free, no key)
- **AIS Track**: polyline colour-coded by navigational status or speed
- **Event markers**: distinct icon + colour per category
- Clicking a marker highlights the corresponding Gantt bar + shows popup detail
- Legend overlay

### 5.4 Gantt / Timeline Panel (lower main area)

- Library: `react-calendar-timeline` (MIT)
- Time axis = selected date range, zoomable + pannable

**Lane hierarchy** (collapsible):

```
▼ Port Events
    ▼ [Port Name]  ████████████████████   ← PORT_AREA_ARRIVAL → PORT_AREA_DEPARTURE
          ▼        ██████████             ← PORT_ARRIVAL → PORT_DEPARTURE
                      ████               ← BERTH_ARRIVAL → BERTH_DEPARTURE

▼ Zone Events
    │ [Zone Name]  ████████████           ← ZONE_ENTRY → ZONE_EXIT

▼ AIS Reporting Gaps
    │              ██████████             ← gap stopped → resumed

▼ STS Pairings
    │ [Paired vessel]  ███████            ← started → stopped

▼ Positional Discrepancies
    │ [Type]  ████████                   ← started → ended

▼ Port State Control
    │ [Port]  ▪                          ← point event at inspection_date
```

Interactivity:

- Hover tooltip: type, location, timestamps, duration
- Click bar → fly-to on map + highlight marker
- Collapse / expand lanes
- Time-axis zoom & pan

---

### 5.5 Events Timeline Sidepanel (right-hand side)

A vertical timeline component displaying all non-position events in chronological order.

**Layout & Position:**

- Fixed-width sidepanel on the right edge of the viewport
- Collapsible/expandable (default: expanded)
- Scrollable container with sticky date section headers

**Event Display:**

- **Order**: Descending by event timestamp (newest first)
- **Grouping**: Events grouped by date (collapsible date sections)
- **Event Card Content**:
  - Event type badge (colored by category: port, zone, ais_gap, sts, discrepancy, psc)
  - Timestamp (ISO 8601 UTC, formatted for readability)
  - Event label (port name, zone name, paired vessel, etc.)
  - Duration for span events (start → end)
  - Location coordinates when available (lat/lon)
  - Event-specific metadata:
    - Port events: port name, berth info, operation type
    - Zone events: zone name, entry/exit type
    - AIS gaps: gap reason if available
    - STS pairings: paired vessel name, role
    - Discrepancies: discrepancy type, severity
    - PSC inspections: inspection type, port, deficiency count

**Duration Between Events:**

- Display elapsed time between each consecutive event pair
- Format: human-readable duration (e.g., "2h 15m", "3d 4h")
- Visual indicator showing gap size (thin line with time label)
- Color-coded by gap magnitude:
  - < 1 hour: subtle/gray
  - 1-24 hours: neutral
  - > 24 hours: highlighted (suggesting potential missing activity)

**Interactivity:**

- Click event card → highlight corresponding Gantt bar + fly-to on map
- Click event card → scroll Gantt timeline to show event
- Hover event card → show full tooltip with raw event details
- Filter chips affect visibility (same as map + Gantt filters)
- Search/filter within sidepanel by event type or label

**Excluded Data:**

- AIS position updates (positional data only, no events)
- Raw track points from `/unified-position/v1/positions`

---

### 5.6 Vessel Replay

A playback mode that lets the user scrub through the selected date range and progressively reveal the vessel track and events as time advances. The scrubber drives the map, Gantt timeline, and Events Timeline simultaneously, giving a unified time-travel view of vessel activity.

**Replay Bar Layout:**

- Persistent horizontal bar docked between the map panel and the Gantt panel
- Contains: **Play/Pause** button, **scrubber slider**, **current replay timestamp** (UTC), **speed selector** (0.5×, 1×, 2×, 5×, 10×), and a **Reset** button
- Timestamp label updates continuously as the scrubber moves
- Disabled / hidden when no vessel data has been loaded

**Scrubber Behaviour:**

- Range spans exactly the user-selected start → end datetime
- Dragging or clicking the slider sets the replay cursor to that point in time
- During playback, the cursor advances automatically at the selected speed multiplier (1× = real-time compressed to the viewport; actual wall-clock rate is configurable via speed selector)
- Playback stops automatically when the cursor reaches the end of the range

**Map Integration:**

- AIS track polyline is clipped to positions with a timestamp ≤ replay cursor; the "future" portion of the track is hidden or rendered as a faint ghost line
- A **vessel position marker** (distinct from event markers) shows the interpolated position on the track at the exact cursor time
- Event markers appear on the map only when the replay cursor has passed their `startTime`; markers for span events disappear again after their `endTime`

**Gantt Timeline Integration:**

- A **vertical playhead line** is drawn across all Gantt lanes at the position corresponding to the replay cursor
- The Gantt time axis auto-scrolls to keep the playhead visible when it would otherwise leave the viewport
- Gantt bars for events that have not yet started remain visually dimmed; bars for events that have fully ended return to normal opacity

**Events Timeline Integration:**

- Events with a `startTime` > replay cursor are hidden or visually suppressed (e.g., reduced opacity, italic text)
- The sidepanel auto-scrolls to keep the most recently revealed event in view during playback
- Active span events (started but not yet ended) are highlighted with a pulsing indicator

**State & Interactions:**

- Replay mode is toggled on/off; when off, all views revert to their normal full-range display
- All existing cross-links (click Gantt bar → fly-to map, click event card → Gantt scroll) remain active during replay
- Filter chips continue to affect which event categories are visible during replay
- Replay cursor state is stored in the global Zustand store (`replayAt: Date | null`) so all panels subscribe to a single source of truth

---

## 6. Internal Event Data Model

```ts
interface ActivityEvent {
  id: string;
  category: "port" | "zone" | "ais_gap" | "sts" | "discrepancy" | "psc";
  subType: string;
  startTime: string; // ISO UTC
  endTime: string | null; // null = point event
  latitude: number | null;
  longitude: number | null;
  label: string; // port name, zone name, paired vessel, etc.
  raw: unknown;
  children?: ActivityEvent[]; // nested: berth ⊂ port ⊂ port_area
}
```

Port events grouped by visit: PORT_AREA span → PORT span → BERTH span.

---

## 7. Full Tech Stack

| Concern       | Choice                                                          |
| ------------- | --------------------------------------------------------------- |
| Framework     | React 18 + Vite + TypeScript                                    |
| Styling       | TailwindCSS v4 (`@tailwindcss/vite`) + shadcn/ui (`radix-nova`) |
| Fonts         | Inter Variable + Unbounded Variable (`@fontsource-variable`)    |
| Map           | `react-leaflet` + OpenStreetMap                                 |
| Gantt         | `react-calendar-timeline`                                       |
| State         | Zustand                                                         |
| Data fetching | `@tanstack/react-query`                                         |
| Date handling | `date-fns`                                                      |
| Icons         | Lucide React                                                    |
| Proxy         | Node/Express on Render (free tier)                              |

---

## 8. Non-Functional Requirements

- All API calls have loading skeletons and error toasts
- API key stored only in `localStorage`; never logged
- Pagination handled automatically (offset loop, API max 500)
- Target viewport: 1440px desktop

---

## 9. Implementation Phases

### Phase 1 — Project scaffold + proxy

1. Create Render Express proxy service (`proxy/` + `render.yaml`)
2. Vite + React + TS + Tailwind v4 + shadcn setup
3. Copy design system from meridia (CSS, theme-provider, ui components)
4. API key input + validation

### Phase 2 — Search & vessel selection

5. Vessel search autocomplete
6. Date range picker
7. Vessel characteristics card
8. React Query hooks for all endpoints

### Phase 3 — Map

9. Leaflet map integration
10. AIS track polyline
11. Event marker layer + popups + legend

### Phase 4 — Gantt Timeline

12. `react-calendar-timeline` setup
13. Port event nesting logic (area → port → berth)
14. All other event lanes
15. Gantt ↔ map cross-linking

### Phase 5 — Polish

16. Filter chips per category
17. Loading states, error boundaries, empty states
18. Responsive panel layout (resizable split panes)
19. Final colour/icon assignment per event type
20. **Events Timeline Sidepanel** (right-hand):
    - Vertical timeline component with event cards
    - Descending chronological order with date grouping
    - Duration indicators between consecutive events
    - Cross-linking with map and Gantt (click to highlight/fly-to)
    - In-panel search/filter capability

### Phase 6 — Vessel Replay

21. Replay bar component (Play/Pause, scrubber slider, timestamp label, speed selector, Reset)
22. `replayAt: Date | null` added to Zustand store; all panels subscribe
23. Map: clip AIS track polyline to cursor time, interpolated position marker, event marker visibility gating
24. Gantt: vertical playhead line, auto-scroll to keep playhead in view, dim future/past bars
25. Events Timeline: suppress future events, auto-scroll to latest revealed event, highlight active spans
