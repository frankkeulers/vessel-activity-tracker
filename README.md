# Vessel Activity Tracker

A React SPA for maritime analysts to visualize vessel activities on an interactive map and hierarchical Gantt timeline. Track port calls, zone entries, AIS gaps, ship-to-ship pairings, positional discrepancies, and port state control inspections — all synchronized across three linked views.

## Features

- **Vessel Search** — Autocomplete search by name, IMO, MMSI, or callsign with vessel characteristics (type, flag, tonnage, dimensions)
- **Interactive Map** — AIS track polyline colored by navigational status with event markers; click markers to highlight corresponding Gantt bars
- **Gantt Timeline** — Collapsible category lanes with nested event bars; zoom and pan the time axis
- **Events Sidepanel** — Chronological event list grouped by date with duration gaps and color-coded category badges
- **Replay Mode** — Scrub through the date range to progressively reveal vessel track and events over time
- **Date Range Picker** — UTC datetime selector (defaults to last 30 days)
- **Event Filtering** — Toggle visibility per category across map, Gantt, and sidepanel
- **Theme Switching** — Dark/light mode (`⌘D`) and green/orange accent toggle (`⌘K`)
- **API Key Management** — Runtime API key entry stored in localStorage, forwarded via Supabase Edge Function proxy

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 19, TypeScript 5.9, Vite 7 |
| State | Zustand 5 (client), TanStack React Query 5 (server) |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI), class-variance-authority |
| Map | Leaflet |
| Timeline | react-calendar-timeline |
| Layout | react-resizable-panels |
| Icons | Lucide React |
| Fonts | Inter Variable, Unbounded Variable |
| Backend | Supabase Edge Functions (Pole Star API proxy) |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the `vessel-tracker-proxy` Edge Function deployed (see [docs/supabase-edge-function-migration.md](docs/supabase-edge-function-migration.md))
- A Pole Star Global API key (entered at runtime)

### Installation

```bash
npm install
```

### Environment

Copy `.env.example` to `.env` and set your Supabase project URL:

```bash
cp .env.example .env
```

```env
VITE_API_BASE_URL=https://<your-project-ref>.supabase.co
```

No build-time API secrets are required — the Pole Star API key is entered by the user in the app at runtime.

### Development

```bash
npm run dev          # Start Vite dev server at http://localhost:5173
npm run typecheck    # Run TypeScript type checking
```

### Production

```bash
npm run build        # TypeScript compile + Vite bundle → dist/
npm run preview      # Local preview of the production build
```

## Project Structure

```
vessel-activity-tracker/
├── src/
│   ├── components/
│   │   ├── ui/                        # shadcn/ui base components
│   │   ├── MapView.tsx                # Leaflet map with AIS track & event markers
│   │   ├── GanttTimeline.tsx          # Hierarchical event timeline
│   │   ├── EventsTimelineSidepanel.tsx # Chronological event list
│   │   ├── VesselSearch.tsx           # Autocomplete vessel search
│   │   ├── VesselCard.tsx             # Vessel characteristics display
│   │   ├── DateRangePicker.tsx        # UTC date/time range selector
│   │   ├── DataOrchestrator.tsx       # Coordinates all API fetches
│   │   ├── ReplayBar.tsx              # Time-scrubber for replay mode
│   │   └── theme-provider.tsx         # Light/dark + accent theme toggle
│   ├── store/
│   │   └── useAppStore.ts             # Zustand global store
│   ├── lib/
│   │   ├── api.ts                     # apiFetch utility for Supabase proxy
│   │   ├── replay.ts                  # Replay/scrubbing logic
│   │   └── utils.ts                   # Shared utilities
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces for all data models
│   ├── config/
│   │   └── constants.ts               # App-wide constants
│   └── App.tsx                        # Root layout and orchestration
├── docs/
│   ├── PRD.md                         # Product requirements & API endpoint details
│   ├── DESIGN_SPEC.md                 # Design tokens, color palette, component specs
│   ├── ux-ui-backlog.md               # Future UI/UX enhancements
│   └── supabase-edge-function-migration.md # Proxy setup and deployment
├── .env.example                       # Environment variable template
├── vite.config.ts
└── tsconfig.json
```

## API Integration

All Pole Star API calls are proxied through a Supabase Edge Function to keep secrets server-side:

```
{VITE_API_BASE_URL}/functions/v1/vessel-tracker-proxy
```

Endpoints proxied: `vessel-search`, `vessel-characteristics`, `positions`, `port-calls`, `zone-events`, `ais-gaps`, `sts-pairings`, `discrepancies`, `port-state-control`.

## Design System

Built on the PSG (Pole Star Global) design system:

- **Primary palette** — PSG Green (`#0A3438` → `#EAFAF9`)
- **Accent palette** — PSG Orange (`#EC6436` → `#FFFDFA`)
- **Typography** — Inter Variable (body), Unbounded Variable (display/headings)
- **Components** — shadcn/ui with PSG design tokens via Tailwind CSS variables

See [docs/DESIGN_SPEC.md](docs/DESIGN_SPEC.md) for the full specification.

## Documentation

| File | Purpose |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements, feature specs, API endpoint details |
| [docs/DESIGN_SPEC.md](docs/DESIGN_SPEC.md) | Design tokens, color palette, typography, component specs |
| [docs/ux-ui-backlog.md](docs/ux-ui-backlog.md) | Future UI/UX enhancements backlog |
| [docs/supabase-edge-function-migration.md](docs/supabase-edge-function-migration.md) | Supabase Edge Function setup and deployment |
