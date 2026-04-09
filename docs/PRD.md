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
