<!-- Generated: 2026-04-11 | Updated: 2026-04-11 -->

# vessel-activity-tracker

## Purpose
A React + TypeScript single-page application for tracking vessel maritime activity. Users search for a vessel by IMO/MMSI/name, set a date range, and fetch data from the Pole Star Global Insights API via a local proxy. The app displays the vessel's AIS track on a map, events on a Gantt timeline, and a chronological events sidepanel — all cross-linked through a shared highlighted-event state.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Project dependencies and npm scripts (`dev`, `build`, `typecheck`) |
| `tsconfig.json` | Root TypeScript project references config |
| `tsconfig.app.json` | App-specific TypeScript config (strict, path aliases) |
| `tsconfig.node.json` | Node/Vite tool TypeScript config |
| `vite.config.ts` | Vite bundler config with React and Tailwind plugins |
| `components.json` | Shadcn/ui component installation config |
| `index.html` | HTML entry point, mounts `#root` |
| `render.yaml` | Render.com deployment configuration |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Main React application source code (see `src/AGENTS.md`) |
| `proxy/` | Node.js reverse proxy for Pole Star API CORS workaround (see `proxy/AGENTS.md`) |
| `docs/` | Design specs, PRD, and API reference (see `docs/AGENTS.md`) |
| `sample_data/` | Static JSON fixtures for offline dev/testing (see `sample_data/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Run `npm run dev` (from project root) to start the Vite dev server on port 5173
- The proxy server must also be running: `cd proxy && node index.js` (port 3000)
- `VITE_API_BASE_URL` env var overrides the default proxy URL (`http://localhost:3000`)
- Always run `npm run typecheck` before claiming a change is complete

### Testing Requirements
- No automated test suite exists yet — verify changes by running the dev server and exercising the UI
- TypeScript strict mode is enabled; fix all type errors

### Common Patterns
- Path alias `@/` maps to `src/` (configured in `tsconfig.app.json` and `vite.config.ts`)
- All components use Tailwind CSS v4 utility classes
- Theme is controlled via CSS variables — avoid hardcoded colours except via `EVENT_COLOURS` constant
- Event category colours are defined once in `src/config/constants.ts` and imported everywhere

## Dependencies

### External
- `react` 19.x — UI framework
- `vite` 7.x — Build tool and dev server
- `typescript` 5.9 — Strict type checking
- `tailwindcss` 4.x — Utility-first CSS
- `zustand` 5.x — Global state management
- `@tanstack/react-query` 5.x — Server-state fetching and caching
- `react-leaflet` / `leaflet` — Interactive map
- `date-fns` — Date manipulation and formatting
- `lucide-react` — Icon set
- `radix-ui` / `shadcn` — Accessible UI primitives

<!-- MANUAL: -->
