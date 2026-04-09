# Vessel Activity Tracker — PRD

A standalone React SPA that lets analysts enter an API key, search for a vessel, set a time range, and visualise all activity events on an interactive map and a hierarchical Gantt-style timeline, with all Pole Star API calls proxied through Supabase Edge Functions.

---

## 1. Overview

| Item | Detail |
|------|--------|
| Platform | React SPA (Vite + TypeScript) |
| Audience | Internal prototype / analysts |
| Auth | API key only (stored in `localStorage`, forwarded via proxy) |
| Pole Star Base URL | `https://api.polestar-production.com` |
| Proxy | Supabase Edge Functions (new project, `eu-central-2` region) |
| Design system | Extracted from `meridia-port-berth-analytics-design` |

---

## 2. Design System (from meridia project)

| Token | Value |
|-------|-------|
| Fonts | `Inter Variable` (body), `Unbounded Variable` (display) |
| Primary palette | PSG Green scale (`#EAFAF9` → `#041417`) |
| Accent palette | PSG Orange scale (`#FFFDFA` → `#72210A`) |
| Radius | `0.625rem` base, scaled variants (sm → 4xl) |
| Themes | Light + Dark modes; green/orange accent toggle |
| Component style | shadcn/ui `radix-nova`, `mist` base colour, CSS variables |
| Tailwind | v4 (`@tailwindcss/vite`), `tw-animate-css` |

Copy verbatim from meridia:
- `src/index.css` (full design token file)
- `components.json` (shadcn config, `radix-nova` style)
- `src/components/theme-provider.tsx` (light/dark + accent toggle)
- All `src/components/ui/*.tsx` shadcn components
- `src/lib/utils.ts`

---

## 3. API Endpoints Used

| Group | Endpoint | Purpose |
|-------|----------|---------|
| Vessel Insights | `GET /vessel-insights/v1/vessel-search` | Search by name / IMO / MMSI / callsign |
| Vessel Insights | `GET /vessel-insights/v1/vessel-characteristics/:imo` | Vessel detail card |
| Vessel Positions | `POST /unified-position/v1/positions` | AIS track points over time range |
| Voyage Insights | `GET /voyage-insights/v1/vessel-port-calls/:imo` | Port call events |
| Voyage Insights | `GET /voyage-insights/v1/vessel-zone-and-port-events/:imo` | Zone entry/exit events |
| Voyage Insights | `GET /voyage-insights/v1/vessel-ais-reporting-gaps/:imo` | AIS gap events |
| Voyage Insights | `GET /voyage-insights/v1/vessel-sts-pairings/:imo` | Ship-to-ship pairing events |
| Voyage Insights | `GET /voyage-insights/v1/vessel-positional-discrepancy/:imo` | Positional discrepancy events |
| Voyage Insights | `GET /voyage-insights/v1/vessel-port-state-control/:imo` | Port State Control inspections |

---

## 4. Supabase Edge Functions Proxy

**New Supabase project** (organisation: `xoevyfptawkhmomwuzjk`, region: `eu-central-2`).

One Edge Function: `polestar-proxy`

- Receives requests from the React app with `?path=/voyage-insights/v1/...`
- Reads `api-key` from request header
- Forwards the full request (method, body, query params) to `https://api.polestar-production.com`
- Returns the upstream response
- No JWT verification (internal prototype — verify_jwt: false)
- CORS headers set to allow the SPA origin

React app sends requests to:
```
https://<project-ref>.supabase.co/functions/v1/polestar-proxy?path=<upstream-path>
```

The Supabase project URL and anon key are stored as `.env` variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). The user's Pole Star API key is stored in `localStorage` and forwarded in the `api-key` header.

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
  category: 'port' | 'zone' | 'ais_gap' | 'sts' | 'discrepancy' | 'psc';
  subType: string;
  startTime: string;           // ISO UTC
  endTime: string | null;      // null = point event
  latitude: number | null;
  longitude: number | null;
  label: string;               // port name, zone name, paired vessel, etc.
  raw: unknown;
  children?: ActivityEvent[];  // nested: berth ⊂ port ⊂ port_area
}
```

Port events grouped by visit: PORT_AREA span → PORT span → BERTH span.

---

## 7. Full Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | React 18 + Vite + TypeScript |
| Styling | TailwindCSS v4 (`@tailwindcss/vite`) + shadcn/ui (`radix-nova`) |
| Fonts | Inter Variable + Unbounded Variable (`@fontsource-variable`) |
| Map | `react-leaflet` + OpenStreetMap |
| Gantt | `react-calendar-timeline` |
| State | Zustand |
| Data fetching | `@tanstack/react-query` |
| Date handling | `date-fns` |
| Icons | Lucide React |
| Proxy | Supabase Edge Functions (Deno) |

---

## 8. Non-Functional Requirements

- All API calls have loading skeletons and error toasts
- API key stored only in `localStorage`; never logged
- Pagination handled automatically (offset loop, API max 500)
- Target viewport: 1440px desktop

---

## 9. Implementation Phases

### Phase 1 — Project scaffold + proxy
1. Create new Supabase project
2. Deploy `polestar-proxy` Edge Function
3. Vite + React + TS + Tailwind v4 + shadcn setup
4. Copy design system from meridia (CSS, theme-provider, ui components)
5. API key input + validation

### Phase 2 — Search & vessel selection
6. Vessel search autocomplete
7. Date range picker
8. Vessel characteristics card
9. React Query hooks for all endpoints

### Phase 3 — Map
10. Leaflet map integration
11. AIS track polyline
12. Event marker layer + popups + legend

### Phase 4 — Gantt Timeline
13. `react-calendar-timeline` setup
14. Port event nesting logic (area → port → berth)
15. All other event lanes
16. Gantt ↔ map cross-linking

### Phase 5 — Polish
17. Filter chips per category
18. Loading states, error boundaries, empty states
19. Responsive panel layout (resizable split panes)
20. Final colour/icon assignment per event type
